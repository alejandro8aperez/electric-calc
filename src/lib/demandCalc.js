import { profileFor, PROFILE_HOURS } from '@/lib/loadProfiles'

// ─────────────────────────────────────────────────────────────────────────────
// Demanda máxima coincidente a partir de curvas horarias (24 h)
// ─────────────────────────────────────────────────────────────────────────────
const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// circuits: resultados de calcCircuit (con .input) o entradas crudas
export function dailyDemand(circuits = [], opts = {}) {
  const hours = PROFILE_HOURS
  const profiles = opts.profiles ?? {}
  const series = new Array(hours).fill(0)
  const circuitSeries = []
  let installedKw = 0

  circuits.forEach((c) => {
    const ct = c.input ?? c
    const kw = Number(ct.power_kw) || 0
    installedKw += kw
    const prof = Array.isArray(ct.profile) && ct.profile.length === hours
      ? ct.profile
      : profiles[ct.load_type] ?? profileFor(ct.load_type)
    const dem = Number(ct.demand_factor ?? 1)
    const s = prof.map((p) => kw * dem * p)
    circuitSeries.push({ name: ct.name || '', load_type: ct.load_type, series: s, peak: Math.max(...s) })
    s.forEach((v, h) => { series[h] += v })
  })

  const peakKw = Math.max(...series, 0)
  const peakHour = series.indexOf(peakKw)

  // Factor de potencia y kVA en la hora de máxima demanda
  let kwPeak = 0
  let kvarPeak = 0
  circuits.forEach((c, i) => {
    const ct = c.input ?? c
    const pf = Math.min(1, Math.max(0.1, Number(ct.power_factor) || 0.9))
    const p = circuitSeries[i].series[peakHour] || 0
    kwPeak += p
    kvarPeak += p * Math.tan(Math.acos(pf))
  })
  const kvaPeak = Math.sqrt(kwPeak * kwPeak + kvarPeak * kvarPeak)
  const pfPeak = kvaPeak > 0 ? kwPeak / kvaPeak : 0.9

  const sumIndividualPeaks = circuitSeries.reduce((s, c) => s + c.peak, 0)
  const coincidence = sumIndividualPeaks > 0 ? peakKw / sumIndividualPeaks : 1
  const utilization = installedKw > 0 ? peakKw / installedKw : 0

  return {
    hours,
    series: series.map((v) => round(v, 3)),
    circuitSeries,
    installedKw: round(installedKw, 2),
    demandKw: round(peakKw, 2),
    peakKw: round(peakKw, 2),
    peakHour,
    kva: round(kvaPeak, 2),
    powerFactor: round(pfPeak, 3),
    coincidence: round(coincidence, 3),
    utilization: round(utilization, 3),
  }
}

// Flujo de carga simplificado por nivel: agrega series aguas arriba (coincidencia
// entre niveles) y estima corriente y tensión de barra.
export function networkLoadFlow(network) {
  const seriesOf = new Map()

  const visit = (n) => {
    const own = n.panel?.demand?.series ?? new Array(PROFILE_HOURS).fill(0)
    const s = own.map((v) => v || 0)
    n.children.forEach((child) => {
      const cs = visit(child)
      cs.forEach((v, h) => { s[h] += v })
    })
    seriesOf.set(n.id, s)
    return s
  }
  network.roots.forEach(visit)

  return network.nodes.map((n) => {
    const s = seriesOf.get(n.id) ?? []
    const peakKw = Math.max(...s, 0)
    const peakHour = s.indexOf(peakKw)
    const pf = Math.max(0.1, n.panel?.powerFactor ?? 0.9)
    const kva = peakKw / pf
    const current = n.system.phases === 3
      ? (kva * 1000) / (Math.sqrt(3) * n.system.voltage)
      : (kva * 1000) / n.system.voltage
    return {
      id: n.id,
      tag: n.tag,
      name: n.name,
      level: (n.depth ?? 0) + 1,
      parentId: n.parentId,
      peakKw: round(peakKw, 2),
      peakKva: round(kva, 2),
      peakHour,
      powerFactor: round(pf, 3),
      current: round(current, 1),
      accumReg: n.accumReg,
      busVoltage: round(n.system.voltage * (1 - n.accumReg / 100), 1),
      series: s.map((v) => round(v, 3)),
    }
  })
}

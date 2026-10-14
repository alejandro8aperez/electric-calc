import { LOAD_TYPES, getLoadType } from '@/lib/electricalData'

// ─────────────────────────────────────────────────────────────────────────────
// Bilan de potencia — factores de utilización, simultaneidad y foisonnement
// y corrección del factor de potencia (compensación con condensadores).
// Referencias: IEC 60364 / RETIE / guía de compensación de reactiva.
// ─────────────────────────────────────────────────────────────────────────────
const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

const num = (v, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// Factor de coincidencia (foisonnement) según número de cargas
const COINCIDENCE_TABLE = { 1: 1.0, 2: 0.9, 3: 0.85, 4: 0.82, 5: 0.8, 8: 0.75, 10: 0.72, 15: 0.68, 20: 0.65, 30: 0.62, 50: 0.58, 100: 0.55 }

export function coincidenceFactor(count) {
  const keys = Object.keys(COINCIDENCE_TABLE).map(Number).sort((a, b) => a - b)
  if (count <= keys[0]) return COINCIDENCE_TABLE[keys[0]]
  for (const k of keys) if (count <= k) return COINCIDENCE_TABLE[k]
  return COINCIDENCE_TABLE[keys[keys.length - 1]]
}

// Factor de utilización por tipo de carga (ku)
export function utilizationFactor(loadTypeId) {
  return getLoadType(loadTypeId).demand
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilan de potencia del conjunto de circuitos
// circuits: [{ power_kw, power_factor, load_type, phases, demand_factor?, simultaneity? }]
// ─────────────────────────────────────────────────────────────────────────────
export function calcPowerBalance(circuits = [], opts = {}) {
  const coincidence = num(opts.coincidence, coincidenceFactor(circuits.length))

  let installedKw = 0
  let demandKw = 0       // Σ P·ku
  let reactiveKvar = 0
  let continuousKw = 0

  const rows = circuits.map((c) => {
    const p = num(c.power_kw, 0)
    const pf = num(c.power_factor, 0.9)
    const load = getLoadType(c.load_type)
    const ku = num(c.demand_factor, load.demand)
    const ks = num(c.simultaneity, 1)   // simultaneidad del circuito (por defecto 1)

    const pUtil = p * ku
    const pSim = pUtil * ks
    const qSim = pSim * Math.tan(Math.acos(Math.min(Math.max(pf, 0.1), 1)))
    const sSim = Math.hypot(pSim, qSim)

    installedKw += p
    demandKw += pUtil
    reactiveKvar += qSim
    if (load.continuous) continuousKw += pUtil

    return {
      name: c.name ?? '',
      load_type: c.load_type,
      powerKw: round(p, 3),
      utilization: ku,
      simultaneity: ks,
      utilizedKw: round(pUtil, 3),
      simultaneousKw: round(pSim, 3),
      reactiveKvar: round(qSim, 3),
      apparentKva: round(sSim, 3),
      powerFactor: pf,
    }
  })

  const simultaneousKw = demandKw // ks ya aplicado por fila
  const coincidentKw = simultaneousKw * coincidence
  const coincidentKvar = reactiveKvar * coincidence
  const coincidentKva = Math.hypot(coincidentKw, coincidentKvar)
  const globalPf = coincidentKva > 0 ? round(coincidentKw / coincidentKva, 3) : 1

  const voltage = num(opts.voltage, 400)
  const phases = opts.phases === 1 ? 1 : 3
  const current = phases === 3
    ? round((coincidentKva * 1000) / (Math.sqrt(3) * voltage), 1)
    : round((coincidentKva * 1000) / voltage, 1)

  return {
    rows,
    count: circuits.length,
    coincidence: round(coincidence, 3),
    installedKw: round(installedKw, 2),
    demandKw: round(demandKw, 2),
    simultaneousKw: round(simultaneousKw, 2),
    coincidentKw: round(coincidentKw, 2),
    coincidentKvar: round(coincidentKvar, 2),
    coincidentKva: round(coincidentKva, 2),
    continuousKw: round(continuousKw, 2),
    globalPowerFactor: globalPf,
    current,
    voltage,
    phases,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Corrección del factor de potencia (compensación)
// ─────────────────────────────────────────────────────────────────────────────
export const CAPACITOR_STEPS = [2.5, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 500, 600, 750, 1000]

export function correctPowerFactor({ powerKw, pfActual, pfTarget, voltage = 400, phases = 3 } = {}) {
  const p = num(powerKw, 0)
  const pf1 = Math.min(Math.max(num(pfActual, 0.9), 0.1), 1)
  const pf2 = Math.min(Math.max(num(pfTarget, 0.95), pf1), 1)

  const tan1 = Math.tan(Math.acos(pf1))
  const tan2 = Math.tan(Math.acos(pf2))
  const qc = p * (tan1 - tan2)             // kVAr necesarios
  const sBefore = p / pf1
  const sAfter = p / pf2
  const iBefore = phases === 3 ? (sBefore * 1000) / (Math.sqrt(3) * voltage) : (sBefore * 1000) / voltage
  const iAfter = phases === 3 ? (sAfter * 1000) / (Math.sqrt(3) * voltage) : (sAfter * 1000) / voltage

  const recommended = CAPACITOR_STEPS.find((s) => s >= qc) ?? CAPACITOR_STEPS[CAPACITOR_STEPS.length - 1]
  const steps = buildSteps(qc)
  const savingsPct = iBefore > 0 ? round(((iBefore - iAfter) / iBefore) * 100, 1) : 0

  return {
    powerKw: round(p, 2),
    pfActual: round(pf1, 3),
    pfTarget: round(pf2, 3),
    requiredKvar: round(qc, 2),
    recommendedKvar: recommended,
    steps,
    apparentBeforeKva: round(sBefore, 2),
    apparentAfterKva: round(sAfter, 2),
    currentBeforeA: round(iBefore, 1),
    currentAfterA: round(iAfter, 1),
    currentReductionPct: savingsPct,
    lossesNote: 'La reducción de corriente disminuye pérdidas I²R y libera capacidad en transformadores y cables.',
  }
}

// Descomposición de la potencia reactiva en pasos comerciales
function buildSteps(qc) {
  const steps = []
  let remaining = qc
  const ordered = [...CAPACITOR_STEPS].reverse()
  for (const s of ordered) {
    while (remaining >= s - 1e-6) { steps.push(s); remaining -= s }
  }
  return steps.length ? steps : [CAPACITOR_STEPS[0]]
}

export { LOAD_TYPES }

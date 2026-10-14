import { checkSelectivity } from '@/lib/coordinationCalc'
import { nextBreakingCapacity } from '@/lib/electricalData'

// ─────────────────────────────────────────────────────────────────────────────
// Verificaciones normativas de la red multinivel (IEC 60364-4-41 / -4-43,
// IEC 60909, IEC 60947-2) y coordinación entre niveles.
// ─────────────────────────────────────────────────────────────────────────────

const techOf = (rating) => ((rating ?? 0) > 125 ? 'MCCB' : 'MCB')

export function verifyNetwork(network, { voltageDropLimit = 5 } = {}) {
  const findings = []

  // 1. Verificaciones por circuito
  network.nodes.forEach((n) => {
    ;(n.panel?.circuits ?? []).forEach((c, i) => {
      const scope = `${n.tag}·Q${i + 1}`
      const name = c.input?.name ?? `Q${i + 1}`
      const reg = c.cascadeRegulation ?? c.regulationTotal ?? c.regulation ?? 0

      findings.push({
        level: 'circuit',
        scope,
        name,
        check: 'voltageDrop',
        status: reg <= voltageDropLimit ? 'compliant' : 'non_compliant',
        value: `${round(reg)} %`,
        limit: `${voltageDropLimit} %`,
        detail: `Caída de tension fuente -> carga (limite ${voltageDropLimit} %)`,
      })

      const magOk = c.checks?.magnetic
      findings.push({
        level: 'circuit',
        scope,
        name,
        check: 'faultClearing',
        status: magOk === false ? 'non_compliant' : 'compliant',
        value: `${c.shortCircuit?.isccMinA ?? '—'} A`,
        limit: `${c.checks?.magneticDetail ?? 'disparo magnetico'}`,
        detail: c.checks?.magneticDetail ?? 'Disparo instantaneo ante Icc minima',
      })

      const thermalOk = c.shortCircuit?.withstandOk
      findings.push({
        level: 'circuit',
        scope,
        name,
        check: 'thermal',
        status: thermalOk === false ? 'non_compliant' : 'compliant',
        value: `S.min ${c.shortCircuit?.minSection ?? '—'} / ${c.conductor.phase} mm²`,
        limit: 'k²S² >= I²t',
        detail: c.shortCircuit?.withstandDetail ?? 'Verificacion termica',
      })
    })
  })

  // 2. Selectividad entre niveles (alimentador padre vs general hijo)
  const links = []
  network.nodes.forEach((child) => {
    if (!child.parentId) return
    const parent = network.index.get(child.parentId)
    if (!parent) return
    const up = {
      name: `${parent.tag} alimentador`,
      rating: parent.panel?.feeder?.breaker ?? 0,
      technology: techOf(parent.panel?.feeder?.breaker),
    }
    const down = {
      name: `${child.tag} general`,
      rating: child.panel?.mainBreaker ?? 0,
      technology: techOf(child.panel?.mainBreaker),
      curve: 'C',
    }
    const sel = checkSelectivity(up, down, parent.busIcc)
    links.push({ from: parent.tag, to: child.tag, ...sel })
    findings.push({
      level: 'link',
      scope: `${parent.tag} -> ${child.tag}`,
      name: `${up.rating} A / ${down.rating} A`,
      check: 'selectivity',
      status: sel.selective ? 'compliant' : 'review',
      value: `ratio ${sel.ratio}`,
      limit: `>= ${sel.requiredRatio}`,
      detail: sel.selective
        ? 'Selectividad aguas arriba/abajo verificada'
        : 'Verificar tabla de selectividad/filiacion del fabricante',
    })
  })

  // 3. Requerimiento de poder de corte por tablero (informativo)
  const icu = network.nodes.map((n) => ({
    tag: n.tag,
    name: n.name,
    busIcc: round(n.busIcc),
    required: nextBreakingCapacity(n.busIcc),
  }))

  const counts = { compliant: 0, review: 0, non_compliant: 0 }
  findings.forEach((f) => { counts[f.status] = (counts[f.status] ?? 0) + 1 })
  const status = counts.non_compliant ? 'non_compliant' : counts.review ? 'review' : 'compliant'

  return { findings, counts, status, links, icu }
}

function round(v) {
  return Math.round((Number(v) || 0) * 100) / 100
}

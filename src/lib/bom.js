import { buildBuiltinCatalog } from '@/lib/catalogData'
import { toCsv } from '@/lib/csv'

// ─────────────────────────────────────────────────────────────────────────────
// Nomenclatura y presupuesto (BOM) — selección automática de dispositivos
// ─────────────────────────────────────────────────────────────────────────────

const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// Selecciona el dispositivo más económico que cumple los criterios
export function selectDevice(catalog, criteria = {}, { strictCurve = false } = {}) {
  const all = catalog.filter((d) => d.family === criteria.family)
  if (!all.length) return null

  const hard = []
  if (criteria.rating_A != null) hard.push((d) => (d.rating_A ?? 0) >= criteria.rating_A)
  if (criteria.poles != null) hard.push((d) => (d.poles ?? 0) >= criteria.poles)
  if (criteria.capacity_modules != null) hard.push((d) => (d.capacity_modules ?? 0) >= criteria.capacity_modules)
  if (criteria.breaking_capacity_kA != null) hard.push((d) => (d.breaking_capacity_kA ?? 0) >= criteria.breaking_capacity_kA)
  if (criteria.sensitivity_mA != null) hard.push((d) => d.sensitivity_mA === criteria.sensitivity_mA)

  let pool = all.filter((d) => hard.every((f) => f(d)))
  if (!pool.length) {
    // Relajar solo sensibilidad/curva; nunca el calibre ni el poder de corte
    const core = []
    if (criteria.rating_A != null) core.push((d) => (d.rating_A ?? 0) >= criteria.rating_A)
    if (criteria.poles != null) core.push((d) => (d.poles ?? 0) >= criteria.poles)
    if (criteria.breaking_capacity_kA != null) core.push((d) => (d.breaking_capacity_kA ?? 0) >= criteria.breaking_capacity_kA)
    pool = all.filter((d) => core.every((f) => f(d)))
  }
  if (!pool.length) return null

  // Preferir fabricante indicado; si no hay, cualquiera del catálogo
  if (criteria.manufacturer) {
    const byMaker = pool.filter((d) => d.manufacturer === criteria.manufacturer)
    if (byMaker.length) pool = byMaker
  }
  if (criteria.series) {
    const bySeries = pool.filter((d) => d.series === criteria.series)
    if (bySeries.length) pool = bySeries
  }

  // Preferir mismo tipo de diferencial y misma curva
  if (criteria.rcd_type) {
    const typed = pool.filter((d) => d.rcd_type === criteria.rcd_type)
    if (typed.length) pool = typed
  }
  if (criteria.curve && strictCurve) {
    const curved = pool.filter((d) => d.curve === criteria.curve)
    if (curved.length) pool = curved
  }

  const sortKey = (d) => (criteria.family === 'ENCLOSURE' ? (d.capacity_modules ?? 0) : (d.rating_A ?? 0))
  const sorted = [...pool].sort((a, b) => (sortKey(a) - sortKey(b)) || ((a.price ?? 0) - (b.price ?? 0)))
  return sorted[0] ?? null
}

// Tipo de diferencial sugerido por uso
export function rcdRequirement(loadType) {
  if (['sockets', 'evse', 'special'].includes(loadType)) return { sensitivity_mA: 30, rcd_type: 'A' }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción del BOM a partir del resultado de un tablero
// ─────────────────────────────────────────────────────────────────────────────
export function buildBom(panel, opts = {}) {
  const catalog = opts.catalog ?? buildBuiltinCatalog()
  const currency = opts.currency ?? 'COP'
  const reservePct = opts.reservePct ?? 20
  const manufacturer = opts.manufacturer ?? null
  const lines = []

  const push = (device, qty, source, { unitPrice, description } = {}) => {
    if (!device) return
    lines.push({
      id: `${source}`,
      family: device.family,
      reference: device.reference,
      description: description ?? device.description ?? '',
      manufacturer: device.manufacturer,
      unit: device.unit ?? 'u',
      qty,
      unitPrice: unitPrice ?? device.price ?? 0,
      width: device.width_modules ?? 0,
      source,
    })
  }

  const pushGeneric = (partial, qty, source) => {
    lines.push({
      id: `${source}`,
      family: partial.family,
      reference: partial.reference,
      description: partial.description,
      manufacturer: '—',
      unit: 'u',
      qty,
      unitPrice: 0,
      width: partial.width ?? 0,
      source,
      needsReview: true,
    })
  }

  // Familia según calibre y poder de corte requerido
  const protectionFamily = (breaker, breakingKa, kind) =>
    (kind === 'MCCB' || breaker > 125 || (breakingKa ?? 0) > 10) ? 'MCCB' : 'MCB'

  // 1. Circuitos: protección + diferencial + bornes + rotulación
  panel.circuits.forEach((c, i) => {
    const phases = c.input.phases
    const poles = phases === 3 ? 4 : 2
    const breaking = c.shortCircuit.breakingCapacityKa
    const family = protectionFamily(c.breaker, breaking, c.protection_kind)
    const dev = selectDevice(catalog, {
      family, rating_A: c.breaker, poles, curve: c.curve,
      breaking_capacity_kA: breaking, manufacturer,
    }, { strictCurve: true })
    if (dev) push(dev, 1, `Q${i + 1} · ${c.input.name}`)
    else pushGeneric({
      family, width: poles,
      reference: `${family}-${poles}P-${c.curve}-${c.breaker}-?kA`,
      description: `${family} ${poles}P ${c.breaker} A ${c.curve} · revisar Icu (${breaking} kA)`,
    }, 1, `Q${i + 1} · ${c.input.name}`)

    const rcd = rcdRequirement(c.input.load_type)
    if (rcd) {
      const r = selectDevice(catalog, { family: 'RCD', rating_A: c.breaker, poles, ...rcd, manufacturer })
      if (r) push(r, 1, `QD${i + 1} · ${c.input.name}`)
    }

    const term = selectDevice(catalog, { family: 'TERMINAL', rating_A: c.conductor.phase * 4 })
    push(term, (phases === 3 ? 4 : 2) * 2, `Bornes · ${c.input.name}`)

    const label = catalog.find((d) => d.family === 'LABEL')
    push(label, 1, `Rotulación · ${c.input.name}`)
  })

  // 2. Interruptor general
  const sysPhases = panel.system.phases
  const mainPoles = sysPhases === 3 ? 4 : 2
  const mainBreaking = panel.isccBoard?.isccKa
  const mainFamily = protectionFamily(panel.mainBreaker, mainBreaking, 'MCB')
  const mainDev = selectDevice(catalog, {
    family: mainFamily, rating_A: panel.mainBreaker, poles: mainPoles,
    breaking_capacity_kA: mainBreaking, manufacturer,
  })
  if (mainDev) push(mainDev, 1, 'Interruptor general (IG)')
  else pushGeneric({
    family: mainFamily, width: mainPoles,
    reference: `${mainFamily}-${mainPoles}P-${panel.mainBreaker}-?kA`,
    description: `${mainFamily} ${mainPoles}P ${panel.mainBreaker} A · revisar Icu (${mainBreaking} kA)`,
  }, 1, 'Interruptor general (IG)')

  // 3. Peine / barra de distribución
  const busbar = selectDevice(catalog, { family: 'BUSBAR', rating_A: panel.busbar, poles: sysPhases === 3 ? 3 : 1 })
  push(busbar, 1, 'Barra/peine de distribución')

  // 4. Gabinete dimensionado por módulos DIN + reserva
  const usedModules = lines.reduce((s, l) => s + (l.width || 0) * l.qty, 0)
  const requiredModules = Math.ceil(usedModules * (1 + reservePct / 100))
  const enclosure = selectDevice(catalog, { family: 'ENCLOSURE', capacity_modules: requiredModules })
  push(enclosure, 1, 'Gabinete', { description: `Gabinete ≥ ${requiredModules} módulos (${usedModules} usados)` })

  // 5. Agregar líneas con la misma referencia
  const merged = aggregate(lines)
  const totals = bomTotals(merged, opts)
  return {
    lines: merged,
    totals,
    meta: { currency, manufacturer, usedModules, requiredModules, reservePct, generated: new Date().toISOString() },
  }
}

function aggregate(lines) {
  const map = new Map()
  for (const l of lines) {
    const key = l.reference
    if (map.has(key)) {
      const cur = map.get(key)
      cur.qty += l.qty
      cur.sources = [...(cur.sources ?? [cur.source]), l.source]
    } else {
      map.set(key, { ...l, sources: [l.source] })
    }
  }
  return [...map.values()].map((l) => ({ ...l, total: round(l.qty * l.unitPrice, 2) }))
}

export function bomTotals(lines, opts = {}) {
  const discountPct = opts.discountPct ?? 0
  const taxPct = opts.taxPct ?? 0
  const subtotal = round(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), 2)
  const discount = round(subtotal * (discountPct / 100), 2)
  const taxable = round(subtotal - discount, 2)
  const tax = round(taxable * (taxPct / 100), 2)
  const total = round(taxable + tax, 2)
  return { subtotal, discountPct, discount, taxable, taxPct, tax, total, items: lines.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportación CSV del presupuesto
// ─────────────────────────────────────────────────────────────────────────────
export function bomToCsv(lines, totals, { currency = 'COP' } = {}) {
  const rows = lines.map((l) => [
    l.reference, l.description, l.family, l.unit, l.qty, l.unitPrice, l.total,
  ])
  const csv = toCsv(
    [
      ['Referencia', 'Descripción', 'Familia', 'Unidad', 'Cant.', `P. unit (${currency})`, `Total (${currency})`],
      ...rows,
      [],
      ['', '', '', '', '', 'Subtotal', totals.subtotal],
      ['', '', '', '', '', `Descuento (${totals.discountPct}%)`, -totals.discount],
      ['', '', '', '', '', 'Base', totals.taxable],
      ['', '', '', '', '', `Impuesto (${totals.taxPct}%)`, totals.tax],
      ['', '', '', '', '', 'TOTAL', totals.total],
    ],
    null,
    { delimiter: ';', includeHeader: false },
  )
  return csv
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablas de coordinación de fabricante — selectividad (discriminación) y
// filiación/cascada (backup, IEC 60947-2 Anexo A).
//
// En un proyecto real estas tablas se toman de la documentación del fabricante
// (o de los archivos EDIELEC) para cada par de aparatos ensayado. Aquí se
// incluye un conjunto de referencia; si no hay tabla se usa el cálculo
// algorítmico (coordinationCalc) y se indica su origen.
//
// Reglas de selectividad:
//   { type:'total' }                         total hasta `upToKa`
//   { type:'ratio', minRatio, upToKa }       selectivo si Up/Down >= minRatio y Icc <= upToKa
//   { type:'limit', default, limits }        selectivo si Icc <= límite (por calibre de aguas arriba)
// ─────────────────────────────────────────────────────────────────────────────

const total = (upToKa = Infinity) => ({ type: 'total', upToKa })
const ratio = (minRatio, upToKa = Infinity) => ({ type: 'ratio', minRatio, upToKa })
const limit = (def, limits = {}) => ({ type: 'limit', default: def, limits })

// Pares explícitos por serie: 'SerieAguasArriba|SerieAguasAbajo'
export const SELECTIVITY_PAIRS = {
  // MCB aguas arriba → MCB aguas abajo (mismo fabricante)
  'Acti9 iC60H|Acti9 iC60N': ratio(1.6, 15),
  'Acti9 iC60N|Acti9 iC60N': ratio(2.0, 10),
  'System pro M S200P|System pro M S200': ratio(1.6, 25),
  'SENTRON 5SY|SENTRON 5SL6': ratio(1.6, 15),
  'DX3 10000|DX3 6000': ratio(1.6, 10),
  // MCCB aguas arriba → MCB aguas abajo (tabla de discriminación)
  'ComPact NSX100|Acti9 iC60N': limit(25, { 80: 25, 100: 25 }),
  'ComPact NSX160|Acti9 iC60N': limit(36, { 160: 36 }),
  'ComPact NSX250|Acti9 iC60N': limit(50, { 250: 50 }),
  'Tmax XT2|System pro M S200': limit(36, { 160: 36 }),
  'SENTRON 3VA1|SENTRON 5SL6': limit(36, { 160: 36 }),
  'DPX3 160|DX3 6000': limit(36, { 160: 36 }),
  // MCCB → MCCB (mismo fabricante)
  'ComPact NSX250|ComPact NSX100': ratio(1.5, 50),
  'ComPact NSX160|ComPact NSX100': ratio(1.5, 50),
  'Tmax XT2|Tmax XT1': ratio(1.5, 50),
  'SENTRON 3VA2|SENTRON 3VA1': ratio(1.5, 70),
  'DPX3 250|DPX3 160': ratio(1.5, 50),
}

// Filiación/cascada: Icu del aparato aguas abajo cuando lo respalda el de aguas arriba
export const BACKUP_PAIRS = {
  'ComPact NSX100|Acti9 iC60N': { boostedIcu: 25 },
  'ComPact NSX160|Acti9 iC60N': { boostedIcu: 36 },
  'ComPact NSX250|Acti9 iC60N': { boostedIcu: 50 },
  'Tmax XT2|System pro M S200': { boostedIcu: 36 },
  'SENTRON 3VA1|SENTRON 5SL6': { boostedIcu: 36 },
  'DPX3 160|DX3 6000': { boostedIcu: 36 },
}

// Regla por defecto cuando aguas arriba y abajo son del mismo fabricante
const MANUFACTURER_DEFAULT = {
  'MCB|MCB': ratio(1.6, 10),
  'MCCB|MCB': limit(36),
  'MCCB|MCCB': ratio(1.5, 36),
  'FUSE|MCB': limit(36),
  'FUSE|MCCB': limit(36),
}

const keyOf = (a, b) => `${a}|${b}`

// Devuelve la regla de selectividad del fabricante (o null → usar cálculo)
export function lookupSelectivity(up = {}, down = {}) {
  if (up.series && down.series) {
    const rule = SELECTIVITY_PAIRS[keyOf(up.series, down.series)]
    if (rule) return { ...rule, source: 'manufacturer', basis: `${up.series} / ${down.series}` }
  }
  if (up.manufacturer && up.manufacturer === down.manufacturer) {
    const t = `${up.technology ?? 'MCB'}|${down.technology ?? 'MCB'}`
    const rule = MANUFACTURER_DEFAULT[t]
    if (rule) return { ...rule, source: 'manufacturer', basis: `${up.manufacturer} ${t}` }
  }
  return null
}

// Evalúa una regla de fabricante frente a un calibre y una Icc (kA)
export function evaluateSelectivityRule(rule, up = {}, down = {}, iccKa = 0) {
  const upTo = rule.upToKa ?? Infinity
  if (iccKa > upTo) return false
  if (rule.type === 'total') return true
  if (rule.type === 'ratio') {
    const r = (up.rating ?? 0) / (down.rating ?? 1)
    return r >= (rule.minRatio ?? 1.6)
  }
  if (rule.type === 'limit') {
    const l = rule.limits?.[up.rating] ?? rule.default ?? Infinity
    return iccKa <= l
  }
  return false
}

// Filiación/cascada
export function lookupBackup(up = {}, down = {}) {
  if (up.series && down.series) {
    const b = BACKUP_PAIRS[keyOf(up.series, down.series)]
    if (b) return { ...b, source: 'manufacturer', basis: `${up.series} / ${down.series}` }
  }
  if (up.manufacturer && up.manufacturer === down.manufacturer && (up.technology === 'MCCB')) {
    return { source: 'manufacturer', basis: `${up.manufacturer} MCCB→${down.technology ?? 'MCB'}`, boostedIcu: null }
  }
  return null
}

// ¿Existe tabla de fabricante para el par?
export function hasCoordinationTable(up = {}, down = {}) {
  return !!(lookupSelectivity(up, down) || lookupBackup(up, down))
}

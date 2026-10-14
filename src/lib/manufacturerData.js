// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de fabricante — series comerciales reales y sus características.
// Las designaciones de tipo (p. ej. "iC60N 1P C6") son las que usa el ingeniero
// para especificar; los códigos de pedido/EDIELEC de cada fabricante pueden
// cargarse desde Catálogo → importar CSV/JSON y reemplazan estos valores.
// Precios indicativos, editables (moneda configurable).
// ─────────────────────────────────────────────────────────────────────────────

export const MANUFACTURERS = ['Genérico', 'Schneider', 'ABB', 'Siemens', 'Legrand']

const MCB_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63]
const MCB_POLES = [1, 2, 3, 4]
const MCB_CURVES = ['B', 'C', 'D']
const RCD_RATINGS = [25, 40, 63, 80]
const RCD_SENS = [30, 300]
const RCD_TYPES = ['AC', 'A']

// Series comerciales de referencia (nombre real + nivel de poder de corte)
export const MANUFACTURER_SERIES = [
  // MCB
  { manufacturer: 'Schneider', family: 'MCB', series: 'Acti9 iC60N', icu: 10, priceMul: 1.4 },
  { manufacturer: 'Schneider', family: 'MCB', series: 'Acti9 iC60H', icu: 15, priceMul: 1.75 },
  { manufacturer: 'ABB', family: 'MCB', series: 'System pro M S200', icu: 10, priceMul: 1.35 },
  { manufacturer: 'ABB', family: 'MCB', series: 'System pro M S200P', icu: 25, priceMul: 1.9 },
  { manufacturer: 'Siemens', family: 'MCB', series: 'SENTRON 5SL6', icu: 6, priceMul: 1.3 },
  { manufacturer: 'Siemens', family: 'MCB', series: 'SENTRON 5SY', icu: 15, priceMul: 1.7 },
  { manufacturer: 'Legrand', family: 'MCB', series: 'DX3 6000', icu: 6, priceMul: 1.25 },
  { manufacturer: 'Legrand', family: 'MCB', series: 'DX3 10000', icu: 10, priceMul: 1.5 },
  // MCCB (marco → ratings; Icu por serie)
  { manufacturer: 'Schneider', family: 'MCCB', series: 'ComPact NSX100', icu: 36, priceMul: 1.5, ratings: [16, 20, 25, 32, 40, 50, 63, 80, 100] },
  { manufacturer: 'Schneider', family: 'MCCB', series: 'ComPact NSX160', icu: 50, priceMul: 1.8, ratings: [100, 125, 160] },
  { manufacturer: 'Schneider', family: 'MCCB', series: 'ComPact NSX250', icu: 50, priceMul: 2.2, ratings: [160, 200, 250] },
  { manufacturer: 'ABB', family: 'MCCB', series: 'Tmax XT1', icu: 36, priceMul: 1.45, ratings: [16, 20, 25, 32, 40, 50, 63, 80, 100, 125] },
  { manufacturer: 'ABB', family: 'MCCB', series: 'Tmax XT2', icu: 50, priceMul: 1.9, ratings: [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160] },
  { manufacturer: 'Siemens', family: 'MCCB', series: 'SENTRON 3VA1', icu: 36, priceMul: 1.5, ratings: [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160] },
  { manufacturer: 'Siemens', family: 'MCCB', series: 'SENTRON 3VA2', icu: 70, priceMul: 2.3, ratings: [100, 125, 160, 200, 250] },
  { manufacturer: 'Legrand', family: 'MCCB', series: 'DPX3 160', icu: 36, priceMul: 1.4, ratings: [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160] },
  { manufacturer: 'Legrand', family: 'MCCB', series: 'DPX3 250', icu: 50, priceMul: 2.0, ratings: [160, 200, 250] },
  // RCD
  { manufacturer: 'Schneider', family: 'RCD', series: 'Acti9 iID', icu: 6, priceMul: 1.4 },
  { manufacturer: 'ABB', family: 'RCD', series: 'DDA', icu: 6, priceMul: 1.35 },
  { manufacturer: 'Siemens', family: 'RCD', series: 'SENTRON 5SV', icu: 6, priceMul: 1.3 },
  { manufacturer: 'Legrand', family: 'RCD', series: 'DX3 ID', icu: 6, priceMul: 1.25 },
]

let seq = 0
const nid = () => `mfr-${(seq += 1)}`
const round1 = (v) => Math.round(v * 10) / 10
const ics = (icu) => round1(icu * 0.75)
const reference = (series, poles, curve, rating) =>
  `${series} ${poles}P ${curve ? `${curve} ` : ''}${rating} A`

const mcbPrice = (rating) => Math.round((6000 + rating * 900) / 100) * 100
const mccbPrice = (rating) => Math.round((60000 + rating * 900) / 100) * 100
const rcdPrice = (rating, type) => Math.round((30000 + rating * 900 + (type === 'A' ? 12000 : 0)) / 100) * 100

function buildMcb(s) {
  const list = []
  for (const poles of MCB_POLES) {
    for (const curve of MCB_CURVES) {
      for (const rating of MCB_RATINGS) {
        list.push({
          id: nid(), family: 'MCB', manufacturer: s.manufacturer, series: s.series,
          reference: reference(s.series, poles, curve, rating),
          description: `Automático ${poles}P curva ${curve} ${rating} A ${s.icu} kA`,
          rating_A: rating, poles, curve, breaking_capacity_kA: s.icu, ics_kA: ics(s.icu),
          width_modules: poles, unit: 'u',
          price: Math.round(mcbPrice(rating) * s.priceMul / 100) * 100, currency: 'COP',
        })
      }
    }
  }
  return list
}

function buildMccb(s) {
  const list = []
  const polesList = [3, 4]
  for (const poles of polesList) {
    for (const rating of s.ratings) {
      for (const curve of ['C', 'D']) {
        list.push({
          id: nid(), family: 'MCCB', manufacturer: s.manufacturer, series: s.series,
          reference: `${s.series} ${poles}P ${rating} A`,
          description: `Caja moldeada ${poles}P ${rating} A ${s.icu} kA`,
          rating_A: rating, poles, curve, breaking_capacity_kA: s.icu, ics_kA: ics(s.icu),
          width_modules: poles === 3 ? 4.5 : 6, unit: 'u',
          price: Math.round(mccbPrice(rating) * s.priceMul / 100) * 100, currency: 'COP',
        })
      }
    }
  }
  return list
}

function buildRcd(s) {
  const list = []
  for (const poles of [2, 4]) {
    for (const sensitivity of RCD_SENS) {
      for (const type of RCD_TYPES) {
        for (const rating of RCD_RATINGS) {
          list.push({
            id: nid(), family: 'RCD', manufacturer: s.manufacturer, series: s.series,
            reference: `${s.series} ${poles}P ${rating} A ${sensitivity} mA tipo ${type}`,
            description: `Diferencial ${poles}P ${rating} A ${sensitivity} mA tipo ${type}`,
            rating_A: rating, poles, sensitivity_mA: sensitivity, rcd_type: type,
            breaking_capacity_kA: s.icu, ics_kA: s.icu, width_modules: poles, unit: 'u',
            price: Math.round(rcdPrice(rating, type) * s.priceMul / 100) * 100, currency: 'COP',
          })
        }
      }
    }
  }
  return list
}

export function buildManufacturerCatalog() {
  seq = 0
  const list = []
  for (const s of MANUFACTURER_SERIES) {
    if (s.family === 'MCB') list.push(...buildMcb(s))
    else if (s.family === 'MCCB') list.push(...buildMccb(s))
    else if (s.family === 'RCD') list.push(...buildRcd(s))
  }
  return list
}

// Series disponibles (para selectores de la UI)
export function seriesOptions(family, manufacturer) {
  return MANUFACTURER_SERIES
    .filter((s) => s.family === family && (!manufacturer || s.manufacturer === manufacturer))
    .map((s) => ({ manufacturer: s.manufacturer, series: s.series, icu: s.icu }))
}

export function manufacturerList() {
  return MANUFACTURERS.filter((m) => m !== 'Genérico')
}

import { buildManufacturerCatalog } from '@/lib/manufacturerData'

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de dispositivos — datos de referencia editables
// Precios indicativos (editables) en la moneda configurada del proyecto.
// ─────────────────────────────────────────────────────────────────────────────

export const MANUFACTURERS = ['Genérico', 'ABB', 'Schneider', 'Legrand', 'Siemens', 'Chint', 'Challenger']

export const FAMILIES = [
  { id: 'MCB', label: 'Interruptor automático (MCB)' },
  { id: 'MCCB', label: 'Interruptor de caja moldeada (MCCB)' },
  { id: 'RCD', label: 'Diferencial (RCD/RCCB)' },
  { id: 'FUSE', label: 'Fusible' },
  { id: 'CONTACTOR', label: 'Contactor' },
  { id: 'ENCLOSURE', label: 'Tablero / gabinete' },
  { id: 'BUSBAR', label: 'Peine / barra de distribución' },
  { id: 'TERMINAL', label: 'Borne / bornera' },
  { id: 'LABEL', label: 'Rotulación' },
]

// Columnas por familia (para tabla y CSV)
export const FAMILY_COLUMNS = {
  default: ['reference', 'manufacturer', 'series', 'rating_A', 'poles', 'curve', 'breaking_capacity_kA', 'price'],
  MCB: ['reference', 'manufacturer', 'series', 'rating_A', 'poles', 'curve', 'breaking_capacity_kA', 'width_modules', 'price'],
  MCCB: ['reference', 'manufacturer', 'series', 'rating_A', 'poles', 'curve', 'breaking_capacity_kA', 'width_modules', 'price'],
  RCD: ['reference', 'manufacturer', 'series', 'rating_A', 'poles', 'sensitivity_mA', 'rcd_type', 'breaking_capacity_kA', 'width_modules', 'price'],
  FUSE: ['reference', 'manufacturer', 'series', 'rating_A', 'fuse_size', 'curve', 'price'],
  CONTACTOR: ['reference', 'manufacturer', 'series', 'rating_A', 'poles', 'price'],
  ENCLOSURE: ['reference', 'manufacturer', 'series', 'capacity_modules', 'mount', 'width_modules', 'price'],
  BUSBAR: ['reference', 'manufacturer', 'series', 'rating_A', 'poles', 'price'],
  TERMINAL: ['reference', 'manufacturer', 'series', 'rating_A', 'price'],
  LABEL: ['reference', 'manufacturer', 'series', 'price'],
}

// Todas las claves posibles de un dispositivo
export const DEVICE_FIELDS = [
  'id', 'family', 'manufacturer', 'series', 'reference', 'description',
  'rating_A', 'poles', 'curve', 'breaking_capacity_kA', 'ics_kA',
  'sensitivity_mA', 'rcd_type', 'fuse_size', 'capacity_modules', 'mount',
  'width_modules', 'unit', 'price', 'currency',
]

const MANUF = 'Genérico'

let seq = 0
const nid = (prefix) => `${prefix}-${(seq += 1)}`

const mcbPrice = (rating) => Math.round((6000 + rating * 900) / 100) * 100
const mccbPrice = (rating) => Math.round((60000 + rating * 900) / 100) * 100
const rcdPrice = (rating, type) => Math.round((30000 + rating * 900 + (type === 'A' ? 12000 : 0)) / 100) * 100
const fusePrice = (rating) => Math.round((5000 + rating * 350) / 100) * 100

function buildMcb() {
  const list = []
  for (const poles of [1, 2, 3, 4]) {
    for (const curve of ['B', 'C', 'D']) {
      for (const rating of [6, 10, 13, 16, 20, 25, 32, 40, 50, 63]) {
        for (const icu of [6, 10]) {
          list.push({
            id: nid('mcb'), family: 'MCB', manufacturer: MANUF, series: 'S200',
            reference: `MCB-${poles}P-${curve}-${rating}-${icu}kA`,
            description: `Automático ${poles}P curva ${curve} ${rating} A ${icu} kA`,
            rating_A: rating, poles, curve, breaking_capacity_kA: icu, ics_kA: ics(icu),
            width_modules: poles, unit: 'u', price: mcbPrice(rating) + (icu === 10 ? 4000 : 0), currency: 'COP',
          })
        }
      }
    }
  }
  return list
}

function buildMccb() {
  const list = []
  const ratings = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630]
  for (const poles of [3, 4]) {
    for (const curve of ['C', 'D']) {
      for (const rating of ratings) {
        for (const icu of [25, 36, 50]) {
          list.push({
            id: nid('mccb'), family: 'MCCB', manufacturer: MANUF, series: 'NSX',
            reference: `MCCB-${poles}P-${curve}-${rating}-${icu}kA`,
            description: `Caja moldeada ${poles}P ${rating} A ${icu} kA curva ${curve}`,
            rating_A: rating, poles, curve, breaking_capacity_kA: icu, ics_kA: ics(icu),
            width_modules: poles === 3 ? 4.5 : 6, unit: 'u', price: mccbPrice(rating), currency: 'COP',
          })
        }
      }
    }
  }
  return list
}

function buildRcd() {
  const list = []
  for (const poles of [2, 4]) {
    for (const sensitivity of [30, 300]) {
      for (const type of ['AC', 'A']) {
        for (const rating of [25, 40, 63, 80, 100, 125]) {
          list.push({
            id: nid('rcd'), family: 'RCD', manufacturer: MANUF, series: 'ID',
            reference: `ID-${poles}P-${rating}-${sensitivity}mA-${type}`,
            description: `Diferencial ${poles}P ${rating} A ${sensitivity} mA tipo ${type}`,
            rating_A: rating, poles, sensitivity_mA: sensitivity, rcd_type: type,
            breaking_capacity_kA: 6, ics_kA: 6, width_modules: poles, unit: 'u',
            price: rcdPrice(rating, type), currency: 'COP',
          })
        }
      }
    }
  }
  return list
}

function buildFuses() {
  const list = []
  const ratings = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630]
  for (const size of ['NH00', 'NH1', 'NH2']) {
    for (const curve of ['gG', 'aM']) {
      for (const rating of ratings) {
        list.push({
          id: nid('fus'), family: 'FUSE', manufacturer: MANUF, series: 'NH',
          reference: `FUS-${size}-${curve}-${rating}`,
          description: `Fusible ${size} ${curve} ${rating} A`,
          rating_A: rating, fuse_size: size, curve, width_modules: 3, unit: 'u',
          price: fusePrice(rating), currency: 'COP',
        })
      }
    }
  }
  return list
}

function buildContactors() {
  return [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225].map((rating) => ({
    id: nid('ct'), family: 'CONTACTOR', manufacturer: MANUF, series: 'LC1',
    reference: `CT-${rating}`,
    description: `Contactor tripolar 40 °C ${rating} A`, rating_A: rating, poles: 3,
    width_modules: 3, unit: 'u', price: 20000 + rating * 1500, currency: 'COP',
  }))
}

function buildEnclosures() {
  const list = []
  for (const modules of [12, 24, 36, 54, 72, 96, 144]) {
    for (const mount of ['Empotrar', 'Superficie']) {
      list.push({
        id: nid('enc'), family: 'ENCLOSURE', manufacturer: MANUF, series: 'Prisma',
        reference: `TAB-${modules}M-${mount.toLowerCase()}`,
        description: `Gabinete ${mount} ${modules} módulos DIN`,
        capacity_modules: modules, mount, width_modules: modules, unit: 'u',
        price: Math.round((30000 + modules * 2500) / 100) * 100, currency: 'COP',
      })
    }
  }
  return list
}

function buildBusbars() {
  const list = []
  for (const poles of [1, 3]) {
    for (const rating of [63, 100, 125, 160, 250, 400]) {
      list.push({
        id: nid('bar'), family: 'BUSBAR', manufacturer: MANUF, series: 'Peine',
        reference: `BAR-${poles}P-${rating}`,
        description: `Peine de distribución ${poles}P ${rating} A`,
        rating_A: rating, poles, width_modules: 4, unit: 'u',
        price: Math.round((15000 + rating * 120 + poles * 3000) / 100) * 100, currency: 'COP',
      })
    }
  }
  return list
}

function buildTerminals() {
  return [2.5, 6, 10, 16, 25, 35, 50].map((size) => ({
    id: nid('term'), family: 'TERMINAL', manufacturer: MANUF, series: 'UK',
    reference: `BOR-${size}`, description: `Borne paso ${size} mm²`,
    rating_A: size * 4, width_modules: 1, unit: 'u',
    price: Math.round((1200 + size * 90) / 50) * 50, currency: 'COP',
  }))
}

function buildLabels() {
  return [{
    id: nid('lbl'), family: 'LABEL', manufacturer: MANUF, series: 'Vinilo',
    reference: 'ROT-VINIL', description: 'Rotulación de circuitos (juego)', unit: 'u',
    price: 800, currency: 'COP',
  }]
}

function ics(icu) {
  return Math.round(icu * 0.75 * 10) / 10
}

export function buildBuiltinCatalog() {
  seq = 0
  return [
    ...buildMcb(), ...buildMccb(), ...buildRcd(), ...buildFuses(),
    ...buildContactors(), ...buildEnclosures(), ...buildBusbars(),
    ...buildTerminals(), ...buildLabels(),
    ...buildManufacturerCatalog(),
  ]
}

export function familyLabel(id) {
  return FAMILIES.find((f) => f.id === id)?.label ?? id
}

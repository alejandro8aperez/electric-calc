// Motor de datos eléctricos — IEC 60364-5-52 / NEC / RETIE
// Tablas de ampacidad, factores de corrección, catálogos de protecciones y equipos.

// ─────────────────────────────────────────────────────────────────────────────
// Secciones comerciales de conductor (mm²)
// ─────────────────────────────────────────────────────────────────────────────
export const SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300]

// Métodos de instalación IEC 60364-5-52 (referencias de la tabla B.52.4)
export const INSTALLATION_METHODS = [
  { id: 'A1', label: 'A1 · Conductores en tubo embebido en pared térmicamente aislante', factor: 'A1' },
  { id: 'A2', label: 'A2 · Cable multiconductor en tubo embebido en pared aislada', factor: 'A2' },
  { id: 'B1', label: 'B1 · Conductores en tubo sobre pared (3 conductores cargados)', factor: 'B1' },
  { id: 'B2', label: 'B2 · Cable multiconductor en tubo sobre pared', factor: 'B2' },
  { id: 'C', label: 'C · Cable sobre pared (fijación directa)', factor: 'C' },
  { id: 'D', label: 'D · Enterrado (ducto o enterrado directo)', factor: 'D', buried: true },
  { id: 'E', label: 'E · Bandeja perforada / charola', factor: 'E' },
  { id: 'F', label: 'F · Bandeja de escalera, cables separados', factor: 'F' },
]

// Tipos de aislamiento (temperatura máxima del conductor)
export const INSULATIONS = [
  { id: 'PVC', label: 'PVC (70 °C)', maxTemp: 70, name: 'NYA / THW' },
  { id: 'XLPE', label: 'XLPE / EPR (90 °C)', maxTemp: 90, name: 'N2XH / THHN' },
]

// Catálogo de cables (denominación comercial)
export const CABLE_TYPES = [
  { id: 'NYA', label: 'NYA', insulation: 'PVC', cores: 1 },
  { id: 'THHN', label: 'THHN/THWN', insulation: 'PVC', cores: 1 },
  { id: 'N2XH', label: 'N2XH', insulation: 'XLPE', cores: 1 },
  { id: 'RZ1-K', label: 'RZ1-K (AS)', insulation: 'XLPE', cores: 1 },
  { id: 'MULTI_PVC', label: 'Multipolar PVC', insulation: 'PVC', cores: 4 },
  { id: 'MULTI_XLPE', label: 'Multipolar XLPE', insulation: 'XLPE', cores: 4 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Ampacidad base a 30 °C (aire) / 20 °C (terreno), 3 conductores cargados
// Valores IEC 60364-5-52 (tabla B.52.4) para cobre + PVC.
// XLPE = PVC × 1.28 · Aluminio = cobre × 0.78 (factores IEC de material).
// ─────────────────────────────────────────────────────────────────────────────
const IEC_PVC_CU = {
  A1: [14.5, 19.5, 26, 34, 46, 61, 80, 99, 119, 151, 182, 210, 240, 273, 321, 367],
  A2: [13.5, 18, 24, 31, 42, 56, 73, 89, 108, 136, 164, 188, 216, 245, 286, 328],
  B1: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 300, 341, 400, 458],
  B2: [16.5, 23, 30, 38, 52, 69, 90, 111, 133, 168, 201, 232, 258, 294, 344, 394],
  C: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344, 392, 461, 530],
  D: [22, 29, 37, 44, 58, 76, 99, 119, 140, 173, 204, 231, 261, 294, 336, 382],
  E: [22, 30, 40, 51, 70, 94, 119, 147, 179, 229, 278, 322, 371, 424, 500, 576],
  F: [23, 32, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399, 456, 538, 621],
}

const round1 = (v) => Math.round(v * 10) / 10
const scaleTable = (table, k) => Object.fromEntries(
  Object.entries(table).map(([method, arr]) => [method, arr.map((v) => round1(v * k))])
)

const AMPACITY = {
  copper: { PVC: IEC_PVC_CU, XLPE: scaleTable(IEC_PVC_CU, 1.28) },
  aluminum: { PVC: scaleTable(IEC_PVC_CU, 0.78), XLPE: scaleTable(IEC_PVC_CU, 0.78 * 1.28) },
}

// ─────────────────────────────────────────────────────────────────────────────
// Factores de corrección
// ─────────────────────────────────────────────────────────────────────────────
// Temperatura del aire ambiente (IEC 60364-5-52, tabla B.52.14)
const TEMP_AIR = {
  PVC: { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1.0, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 },
  XLPE: { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1.0, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.5, 80: 0.41 },
}
// Temperatura del terreno (tabla B.52.15)
const TEMP_SOIL = {
  PVC: { 10: 1.1, 15: 1.05, 20: 1.0, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77, 45: 0.71, 50: 0.63, 55: 0.55, 60: 0.45 },
  XLPE: { 10: 1.07, 15: 1.04, 20: 1.0, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85, 45: 0.8, 50: 0.76, 55: 0.71, 60: 0.65, 65: 0.6, 70: 0.53, 75: 0.46, 80: 0.38 },
}
// Agrupamiento de varios circuitos (tabla B.52.17 — agrupados/haz)
const GROUPING = { 1: 1.0, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57, 7: 0.54, 8: 0.52, 9: 0.5, 12: 0.45, 16: 0.41, 20: 0.38 }
// Agrupamiento en bandeja, una capa (tabla B.52.20)
const GROUPING_TRAY = { 1: 1.0, 2: 0.88, 3: 0.82, 4: 0.79, 5: 0.76, 6: 0.73, 7: 0.72, 8: 0.71, 9: 0.7 }

// ─────────────────────────────────────────────────────────────────────────────
// Resistencia (Ω/km) a 20 °C (IEC 60228) y reactancia aproximada
// ─────────────────────────────────────────────────────────────────────────────
const R20 = {
  copper: [12.1, 7.41, 4.61, 3.08, 1.83, 1.15, 0.727, 0.524, 0.387, 0.268, 0.193, 0.153, 0.124, 0.0991, 0.0754, 0.0601],
  aluminum: [20.0, 12.1, 7.41, 4.61, 3.08, 1.91, 1.2, 0.868, 0.641, 0.443, 0.32, 0.253, 0.206, 0.164, 0.125, 0.1],
}
const DEFAULT_REACTANCE = 0.08 // Ω/km

// ─────────────────────────────────────────────────────────────────────────────
// Protecciones — calibres IEC (60898 / 60947-2)
// ─────────────────────────────────────────────────────────────────────────────
export const STANDARD_BREAKERS = [2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250]
export const FUSE_RATINGS = [2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000]

export const BREAKER_CURVE_TYPES = [
  { id: 'B', label: 'Curva B', tripRange: '3–5 × In', magnetic: 4, useCase: 'Resistiva / iluminación' },
  { id: 'C', label: 'Curva C', tripRange: '5–10 × In', magnetic: 7.5, useCase: 'Uso general' },
  { id: 'D', label: 'Curva D', tripRange: '10–20 × In', magnetic: 15, useCase: 'Motores / arranques fuertes' },
  { id: 'K', label: 'Curva K', tripRange: '10–14 × In', magnetic: 12, useCase: 'Motores / transformadores' },
  { id: 'MA', label: 'Curva MA', tripRange: '12 × In (solo magnético)', magnetic: 12, useCase: 'Solo cortocircuito (motor)' },
]

export const BREAKING_CAPACITIES = [4.5, 6, 10, 16, 25, 36, 50, 65, 100]

// Ajuste de disparo térmico relativo a In (I2/I1) para verificación I2 ≤ 1.45·Iz
const THERMAL_TRIP_RATIO = { MCB: 1.45, MCCB: 1.3 }

// ─────────────────────────────────────────────────────────────────────────────
// Límites de regulación / caída de tensión (%)
// ─────────────────────────────────────────────────────────────────────────────
export const REGULATION_LIMITS = {
  iec_lighting: { label: 'IEC · Alumbrado (acometida→último punto)', value: 3 },
  iec_other: { label: 'IEC · Otros usos', value: 5 },
  nec_feeder: { label: 'NEC · Alimentador', value: 3 },
  nec_branch: { label: 'NEC · Circuito ramal', value: 3 },
  nec_total: { label: 'NEC · Total', value: 5 },
  retie: { label: 'RETIE · Instalación', value: 5 },
  ieee141: { label: 'IEEE 141 · Total', value: 5 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Factores de demanda / simultaneidad por tipo de carga (RETIE / NEC 220)
// ─────────────────────────────────────────────────────────────────────────────
export const LOAD_TYPES = [
  { id: 'lighting', label: 'Alumbrado', demand: 1.0, triplen: 20, continuous: true },
  { id: 'sockets', label: 'Tomacorrientes', demand: 0.7, triplen: 10, continuous: false },
  { id: 'general', label: 'Cargas generales', demand: 0.8, triplen: 5, continuous: false },
  { id: 'motor', label: 'Motores', demand: 1.0, triplen: 0, continuous: false },
  { id: 'hvac', label: 'Aire acondicionado / HVAC', demand: 0.9, triplen: 0, continuous: true },
  { id: 'kitchen', label: 'Cocina / cocción', demand: 0.8, triplen: 0, continuous: false },
  { id: 'computer', label: 'Centro de datos / IT', demand: 0.95, triplen: 33, continuous: true },
  { id: 'evse', label: 'Recarga vehículo eléctrico (IRVE)', demand: 1.0, triplen: 0, continuous: true },
  { id: 'dc', label: 'Carga CC (rectificadores)', demand: 1.0, triplen: 10, continuous: true },
  { id: 'special', label: 'Carga especial / crítica', demand: 1.0, triplen: 0, continuous: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// Motores — multiplicadores de corriente de arranque (Iarranque/In)
// ─────────────────────────────────────────────────────────────────────────────
export const STARTING_METHODS = [
  { id: 'DOL', label: 'Directo (DOL)', startMultiple: 7.0, dipFactor: 1.0 },
  { id: 'star_delta', label: 'Estrella-triángulo', startMultiple: 2.5, dipFactor: 0.33 },
  { id: 'soft', label: 'Arrancador suave', startMultiple: 3.0, dipFactor: 0.4 },
  { id: 'vfd', label: 'Variador de frecuencia (VFD)', startMultiple: 1.1, dipFactor: 0.1 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Transformadores trifásicos comerciales (kVA)
// ─────────────────────────────────────────────────────────────────────────────
export const STANDARD_TRANSFORMERS = [15, 25, 37.5, 50, 75, 100, 112.5, 150, 200, 225, 300, 400, 500, 630, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000]
// Pérdidas típicas (W) y %Z por capacidad — valores de referencia
export const TRANSFORMER_SPECS = {
  30: { noLoad: 130, load: 800, z: 3.5 },
  50: { noLoad: 190, load: 1100, z: 3.5 },
  75: { noLoad: 270, load: 1500, z: 3.8 },
  100: { noLoad: 320, load: 1750, z: 4.0 },
  160: { noLoad: 460, load: 2350, z: 4.0 },
  200: { noLoad: 550, load: 2750, z: 4.2 },
  250: { noLoad: 650, load: 3250, z: 4.5 },
  315: { noLoad: 780, load: 3900, z: 4.5 },
  400: { noLoad: 930, load: 4600, z: 4.5 },
  500: { noLoad: 1100, load: 5500, z: 5.0 },
  630: { noLoad: 1300, load: 6500, z: 5.0 },
  800: { noLoad: 1600, load: 8000, z: 5.5 },
  1000: { noLoad: 1900, load: 9500, z: 5.5 },
  1250: { noLoad: 2200, load: 11000, z: 6.0 },
  1600: { noLoad: 2600, load: 13000, z: 6.0 },
  2000: { noLoad: 3100, load: 15500, z: 6.5 },
  2500: { noLoad: 3600, load: 18000, z: 7.0 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Resistividad del terreno y electrodos (Ω·m)
// ─────────────────────────────────────────────────────────────────────────────
export const SOIL_RESISTIVITY = [
  { id: 'organic', label: 'Suelo orgánico / húmedo', value: 30 },
  { id: 'clay', label: 'Arcilla / limo', value: 100 },
  { id: 'sand_clay', label: 'Arena arcillosa', value: 200 },
  { id: 'gravel', label: 'Grava / arena seca', value: 500 },
  { id: 'rock', label: 'Roca', value: 2000 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Funciones de consulta
// ─────────────────────────────────────────────────────────────────────────────

// Tabla completa de ampacidad { material: { insulation: { method: [A...] } } }
export function ampacityTable(material = 'copper', insulation = 'PVC') {
  return AMPACITY[material][insulation]
}

// Ampacidad de una sección (A) a temperatura base
export function ampacityOf(size, method, material = 'copper', insulation = 'PVC') {
  const idx = SIZES.indexOf(size)
  if (idx < 0) return 0
  const col = AMPACITY[material][insulation][method]
  return col ? col[idx] : 0
}

// Factor de corrección por temperatura ambiente / terreno
export function temperatureFactor(insulation, ambient, buried = false) {
  const table = buried ? TEMP_SOIL[insulation] : TEMP_AIR[insulation]
  if (table[ambient] !== undefined) return table[ambient]
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b)
  if (ambient <= keys[0]) return table[keys[0]]
  return table[keys[keys.length - 1]]
}

// Factor de corrección por agrupamiento
export function groupingFactor(count, tray = false) {
  const table = tray ? GROUPING_TRAY : GROUPING
  if (table[count] !== undefined) return table[count]
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b)
  if (count <= keys[0]) return 1
  return table[keys[keys.length - 1]]
}

// Resistencia (Ω/km) a temperatura de operación
export function resistance(size, material = 'copper', tempC = 20) {
  const idx = SIZES.indexOf(size)
  if (idx < 0) return 0
  const r20 = R20[material][idx]
  const alpha = material === 'copper' ? 0.00393 : 0.00403
  return r20 * (1 + alpha * (tempC - 20))
}

export function reactance() {
  return DEFAULT_REACTANCE
}

// Conductor normalizado ≥ valor pedido
export function nextSize(mm2) {
  for (const s of SIZES) if (s >= mm2) return s
  return SIZES[SIZES.length - 1]
}

export function nextBreaker(amp) {
  for (const b of STANDARD_BREAKERS) if (b >= amp) return b
  return STANDARD_BREAKERS[STANDARD_BREAKERS.length - 1]
}

export function nextBreakingCapacity(ka) {
  for (const b of BREAKING_CAPACITIES) if (b >= ka) return b
  return BREAKING_CAPACITIES[BREAKING_CAPACITIES.length - 1]
}

export function nextTransformer(kva) {
  for (const t of STANDARD_TRANSFORMERS) if (t >= kva) return t
  return STANDARD_TRANSFORMERS[STANDARD_TRANSFORMERS.length - 1]
}

export function getLoadType(id) {
  return LOAD_TYPES.find((l) => l.id === id) ?? LOAD_TYPES[2]
}

export function getStartingMethod(id) {
  return STARTING_METHODS.find((s) => s.id === id) ?? STARTING_METHODS[0]
}

export function getMethod(id) {
  return INSTALLATION_METHODS.find((m) => m.id === id) ?? INSTALLATION_METHODS[4]
}

// Presupuesto de disparo térmico (I2) según tecnología de protección
export function thermalTripRatio(kind = 'MCB') {
  return THERMAL_TRIP_RATIO[kind] ?? 1.45
}

// Curvas de disparo (para gráficos tiempo-corriente)
export function tripTime(curveId, multiple) {
  const curve = BREAKER_CURVE_TYPES.find((c) => c.id === curveId) ?? BREAKER_CURVE_TYPES[1]
  if (multiple < 1.13) return null // no dispara (zona térmica no activada)
  if (multiple < curve.magnetic) return 1.5 / Math.pow(multiple, 2) // zona térmica inversa
  return 0.01 // zona magnética instantánea
}

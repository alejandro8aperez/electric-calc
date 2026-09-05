// Datos eléctricos para dimensionamiento (basados en NEC/IEEE/RETIE)

export const INSTALLATION_METHODS = [
  { id: "conduit_3", label: "Tubo · ≤3 conductores (B)" },
  { id: "conduit_4", label: "Tubo · 4-6 conductores (C)" },
  { id: "conduit_7", label: "Tubo · 7-9 conductores (D)" },
  { id: "cable_tray", label: "Charola / bandeja (E)" },
  { id: "buried", label: "Enterrado directo (D)" },
]

// Ampacidad base (A) a 30 °C por sección (mm²) — Cobre y Aluminio
// columnas por método: tubo 3, tubo 6, tubo 9, bandeja, enterrado
const AMPACITY = {
  copper: {
    1.5: [16, 14, 12, 19, 18],
    2.5: [21, 19, 16, 27, 25],
    4: [28, 25, 21, 36, 32],
    6: [36, 32, 27, 47, 41],
    10: [50, 44, 37, 63, 55],
    16: [68, 58, 49, 86, 74],
    25: [89, 75, 64, 112, 96],
    35: [110, 93, 78, 138, 117],
    50: [134, 112, 96, 168, 141],
    70: [171, 141, 121, 213, 179],
    95: [207, 169, 146, 258, 216],
    120: [239, 195, 168, 299, 249],
    150: [275, 224, 192, 344, 285],
    185: [314, 256, 220, 393, 324],
    240: [369, 301, 259, 462, 380],
    300: [424, 345, 297, 530, 434],
  },
  aluminum: {
    2.5: [16, 14, 12, 20, 19],
    4: [21, 19, 16, 28, 24],
    6: [28, 25, 21, 36, 31],
    10: [39, 34, 29, 49, 42],
    16: [53, 45, 39, 67, 57],
    25: [69, 58, 50, 87, 73],
    35: [85, 72, 61, 107, 90],
    50: [104, 87, 75, 131, 108],
    70: [133, 110, 95, 166, 137],
    95: [161, 132, 114, 201, 165],
    120: [186, 153, 132, 232, 191],
    150: [214, 175, 151, 267, 218],
    185: [245, 200, 172, 305, 248],
    240: [288, 235, 203, 360, 292],
    300: [331, 270, 232, 414, 334],
  },
}

// Factores de corrección por temperatura (°C) — Cobre/Aluminio 90°C
export const TEMPERATURE_FACTORS = {
  21: 1.08, 25: 1.04, 30: 1.0, 35: 0.96, 40: 0.91,
  45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58,
}

// Factor de corrección por agrupamiento de conductores en tubo
const GROUPING_FACTOR = { 3: 1.0, 4: 0.8, 5: 0.8, 6: 0.8, 7: 0.7, 8: 0.7, 9: 0.7 }

// Resistencia (Ω/km) y reactancia (Ω/km) por material y sección
const R = {
  copper: { 1.5: 14.7, 2.5: 8.87, 4: 5.52, 6: 3.69, 10: 2.21, 16: 1.38, 25: 0.884, 35: 0.629, 50: 0.441, 70: 0.315, 95: 0.232, 120: 0.184, 150: 0.147, 185: 0.119, 240: 0.0917, 300: 0.0735 },
  aluminum: { 2.5: 16.5, 4: 10.4, 6: 6.9, 10: 4.14, 16: 2.59, 25: 1.66, 35: 1.18, 50: 0.828, 70: 0.591, 95: 0.436, 120: 0.345, 150: 0.276, 185: 0.224, 240: 0.172, 300: 0.138 },
}
const X = 0.17 // reactancia aproximada Ω/km

export const REGULATION_LIMITS = {
  nec_feeders: { label: "NEC · Alimentadores", value: 3 },
  nec_branch: { label: "NEC · Circuitos", value: 3 },
  ieee: { label: "IEEE 141 · Total", value: 5 },
  nec_individual: { label: "NEC · Individual", value: 3 },
  retie: { label: "RETIE · 5%", value: 5 },
}

export const BREAKER_CURVE_TYPES = [
  { id: "B", label: "Curva B", tripRange: "3-5 × In", useCase: "Resistiva / iluminación" },
  { id: "C", label: "Curva C", tripRange: "5-10 × In", useCase: "Motores / general" },
  { id: "D", label: "Curva D", tripRange: "10-20 × In", useCase: "Arranques fuertes" },
]

// Tripping time (s) del breaker según curva y múltiplo de In
const TRIP_TIMES = { B: 0.02, C: 0.04, D: 0.06 }

export function ampacityTable(material) {
  return AMPACITY[material]
}

export function groupingFactor(count) {
  return GROUPING_FACTOR[count] ?? 0.7
}

export function resistance(km2, material) {
  return R[material][km2]
}

export function reactance() {
  return X
}

export function tripTime(curveId, multiple) {
  if (multiple >= 10) return 0.01
  return TRIP_TIMES[curveId] ?? 0.04
}

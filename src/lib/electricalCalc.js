import {
  SIZES, ampacityOf, temperatureFactor, groupingFactor, resistance, reactance,
  nextSize, nextBreaker, nextBreakingCapacity, thermalTripRatio, tripTime,
  BREAKER_CURVE_TYPES, getLoadType, getMethod,
} from '@/lib/electricalData'
import {
  ikAt, seriesZ, zFromIcc, cableZ, C_MAX, C_MIN,
} from '@/lib/shortCircuit60909'

// ─────────────────────────────────────────────────────────────────────────────
// Motor de cálculo de circuitos — IEC 60364 / NEC / RETIE
// ─────────────────────────────────────────────────────────────────────────────

const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// Mapeo de métodos antiguos (compatibilidad con proyectos guardados)
const LEGACY_METHODS = {
  conduit_3: 'B1', conduit_4: 'B2', conduit_7: 'D', cable_tray: 'E', buried: 'D',
}

// Factores k del conductor para verificación térmica k²S² ≥ I²t (IEC 60364-4-43)
const K_FACTOR = {
  copper: { PVC: 115, XLPE: 143 },
  aluminum: { PVC: 76, XLPE: 94 },
}

// Diámetros comerciales de tubería (mm) y equivalencia en pulgadas
const CONDUIT_TRADES = [
  { mm: 16, dia: 16, trade: '1/2"' }, { mm: 20, dia: 20, trade: '3/4"' },
  { mm: 25, dia: 25, trade: '1"' }, { mm: 32, dia: 32, trade: '1 1/4"' },
  { mm: 40, dia: 40, trade: '1 1/2"' }, { mm: 50, dia: 50, trade: '2"' },
  { mm: 63, dia: 63, trade: '2 1/2"' }, { mm: 75, dia: 75, trade: '3"' },
  { mm: 90, dia: 90, trade: '3 1/2"' }, { mm: 110, dia: 110, trade: '4"' },
]

// Conductor de protección (PE) — IEC 60364-5-54 Tabla 54.2
export function protectiveConductor(phase) {
  if (phase <= 16) return phase
  if (phase <= 35) return 16
  return nextSize(phase / 2)
}

// Conductor de electrodo / puesta a tierra del servicio (NEC 250.66)
const GEC_TABLE = {
  1.5: '6 AWG', 2.5: '6 AWG', 4: '6 AWG', 6: '6 AWG', 10: '8 AWG',
  16: '6 AWG', 25: '4 AWG', 35: '2 AWG', 50: '1/0 AWG', 70: '2/0 AWG',
  95: '3/0 AWG', 120: '4/0 AWG', 150: '250 kcmil', 185: '250 kcmil',
  240: '350 kcmil', 300: '400 kcmil',
}

export function groundingElectrodeConductor(phase) {
  return GEC_TABLE[phase] ?? '400 kcmil'
}

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo completo de un circuito
// ─────────────────────────────────────────────────────────────────────────────
export function calcCircuit(rawInput) {
  const input = normalizeInput(rawInput)
  const {
    power_kw, voltage, power_factor, length_m, phases,
    conductor_material, insulation, ambient_temp, method,
    grouping_count, source_icc_ka, fault_duration_s, curve,
    protection_kind, continuous, triplen_percent, demand_factor,
  } = input

  const load = getLoadType(input.load_type)
  const methodDef = getMethod(method)

  // 1. Corriente de diseño (Ib)
  const ibFloat = phases === 3
    ? (power_kw * 1000) / (Math.sqrt(3) * voltage * power_factor)
    : (power_kw * 1000) / (voltage * power_factor)
  const ib = round(ibFloat, 1)

  // Continua → 125 % (NEC 210.19/210.20); demanda aplicada al dimensionamiento de tablero
  const continuousFactor = continuous ? 1.25 : 1.0
  const designCurrent = round(ibFloat * continuousFactor, 2)

  // 2. Factores de corrección
  const kTemp = temperatureFactor(insulation, ambient_temp, methodDef.buried)
  const kGroup = groupingFactor(grouping_count, method === 'E' || method === 'F')
  const kTotal = kTemp * kGroup

  // 2b. Armónicos (triplens) — IEC 60364-5-52 §524 / NF C 15-100
  //     > 33 % → sobredimensionar fase (1.45·Ib) y neutro = fase
  //     15–33 % → neutro = fase
  //     ≤ 15 %  → neutro reducido permitido
  const harmonicFactor = triplen_percent > 33 ? 1.45 : triplen_percent > 15 ? 1.15 : 1.0
  const sizingCurrent = round(designCurrent * harmonicFactor, 2)

  // 3. Selección de conductor por ampacidad corregida: Iz ≥ Ib
  let selected = SIZES[SIZES.length - 1]
  let correctedAmpacity = 0
  for (const s of SIZES) {
    const iz = ampacityOf(s, method, conductor_material, insulation) * kTotal
    if (iz >= sizingCurrent) { selected = s; correctedAmpacity = iz; break }
  }
  if (!correctedAmpacity) correctedAmpacity = ampacityOf(selected, method, conductor_material, insulation) * kTotal

  // 4. Protección térmica: In ≥ Ib, In ≤ Iz, I2 ≤ 1.45·Iz
  const tripRatio = thermalTripRatio(protection_kind)
  let breaker = nextBreaker(designCurrent)
  // Si la protección no cabe en el conductor, se sube el conductor
  if (breaker > correctedAmpacity || tripRatio * breaker > 1.45 * correctedAmpacity) {
    for (const s of SIZES) {
      const iz = ampacityOf(s, method, conductor_material, insulation) * kTotal
      if (iz >= sizingCurrent && breaker <= iz && tripRatio * breaker <= 1.45 * iz) {
        selected = s; correctedAmpacity = iz; break
      }
    }
  }
  correctedAmpacity = round(correctedAmpacity, 1)

  // 5. Caída de tensión y regulación
  const tempOp = insulation === 'XLPE' ? 90 : 70
  const r = resistance(selected, conductor_material, tempOp)
  const x = reactance()
  const k = phases === 3 ? Math.sqrt(3) : 2
  const sinPhi = Math.sin(Math.acos(power_factor))
  const dropPerKm = k * ibFloat * (r * power_factor + x * sinPhi)
  const voltageDrop = round(dropPerKm * (length_m / 1000), 2)
  const regulation = round((voltageDrop / voltage) * 100, 2)
  const voltageAtLoad = round(voltage - voltageDrop, 1)

  // 6. Pérdidas (W)
  const rOhm = (r * length_m) / 1000
  const lost = phases === 3 ? 3 * ibFloat * ibFloat * rOhm : 2 * ibFloat * ibFloat * rOhm
  const powerLoss = round(lost, 1)

  // 7. Neutro y armónicos (triplens) — zonas NFC / IEC
  const neutralCurrent = round(ibFloat * (triplen_percent / 100) * 3, 2)
  const harmonicZone = triplen_percent > 33 ? 'high' : triplen_percent > 15 ? 'medium' : 'low'
  let neutralSize
  if (harmonicZone === 'low') {
    neutralSize = selected <= 16 ? selected : nextSize(selected / 2)
  } else {
    neutralSize = selected
  }

  // 8. Conductor de protección
  const pe = protectiveConductor(selected)

  // 9. Cortocircuito
  const shortCircuit = calcShortCircuit({
    voltage, phases, conductor_material, length_m, insulation,
    source_icc_ka, fault_duration_s, selected, thermalK: K_FACTOR[conductor_material][insulation],
  })

  // 10. Verificación de disparo magnético (Icc mínima del circuito)
  const curveDef = BREAKER_CURVE_TYPES.find((c) => c.id === curve) ?? BREAKER_CURVE_TYPES[1]
  const magneticThreshold = round(curveDef.magnetic * breaker, 0)
  const magneticOk = shortCircuit.isccMinA >= magneticThreshold

  // 11. Tubería
  const conduit = calcConduit({ phase: selected, neutral: neutralSize, pe, conductors: phases === 3 ? 4 : 3, material: conductor_material })

  // 12. Cumplimiento
  const checks = {
    ampacity: correctedAmpacity >= sizingCurrent,
    ampacityDetail: `Iz = ${correctedAmpacity} A ≥ ${harmonicFactor > 1 ? '1.45/1.15·Ib' : 'Ib'} = ${sizingCurrent} A`,
    overload: breaker <= correctedAmpacity && tripRatio * breaker <= 1.45 * correctedAmpacity,
    overloadDetail: `In = ${breaker} A · I2 = ${round(tripRatio * breaker, 1)} A · 1.45·Iz = ${round(1.45 * correctedAmpacity, 1)} A`,
    regulation: regulation <= 5,
    regulationDetail: `ΔU = ${regulation} % (límite 5 %)`,
    harmonics: harmonicFactor === 1.0 || correctedAmpacity >= sizingCurrent,
    harmonicsDetail: `Triplens ${triplen_percent} % · zona ${harmonicZone} · neutro ${neutralSize} mm²`,
    shortCircuit: shortCircuit.withstandOk,
    shortCircuitDetail: shortCircuit.withstandDetail,
    magnetic: magneticOk,
    magneticDetail: `Icc,mín = ${shortCircuit.isccMinA} A ${magneticOk ? '≥' : '<'} ${curveDef.magnetic}·In = ${magneticThreshold} A`,
  }
  const compliance = Object.values(checks).filter((v) => typeof v === 'boolean').every(Boolean) ? 'compliant' : 'review'

  return {
    input,
    ib,
    designCurrent,
    sizingCurrent,
    loadFactor: continuousFactor,
    demandPower: round(power_kw * demand_factor, 3),
    factors: { temp: round(kTemp, 3), grouping: round(kGroup, 3), total: round(kTotal, 3) },
    conductor: {
      phase: selected, neutral: neutralSize, pe,
      material: conductor_material, insulation,
      ampacityBase: ampacityOf(selected, method, conductor_material, insulation),
      correctedAmpacity,
    },
    harmonic: { zone: harmonicZone, factor: harmonicFactor, triplen: triplen_percent, neutralCurrent },
    breaker,
    curve,
    protection_kind,
    voltageDrop,
    regulation,
    voltageAtLoad,
    powerLoss,
    resistance: round(r, 4),
    reactance: x,
    neutralCurrent,
    shortCircuit,
    conduit,
    checks,
    compliance,
  }
}

function normalizeInput(raw = {}) {
  const method = LEGACY_METHODS[raw.installation_method] ?? raw.installation_method ?? 'C'
  const phases = raw.phases === 1 ? 1 : 3
  const load_type = raw.load_type ?? 'general'
  const load = getLoadType(load_type)
  return {
    name: raw.name ?? '',
    load_type,
    power_kw: num(raw.power_kw, 10),
    voltage: num(raw.voltage, 220),
    power_factor: num(raw.power_factor, 0.9),
    length_m: num(raw.length_m, 30),
    phases,
    conductor_material: raw.conductor_material ?? 'copper',
    insulation: raw.insulation ?? 'PVC',
    ambient_temp: num(raw.ambient_temp, 30),
    method,
    grouping_count: num(raw.grouping_count ?? raw.conduit_conductor_count, 3),
    source_icc_ka: num(raw.source_icc_ka ?? raw.fault_current_origin_ka, 10),
    fault_duration_s: num(raw.fault_duration_s, 0.5),
    curve: raw.curve ?? (load_type === 'motor' ? 'D' : 'C'),
    protection_kind: raw.protection_kind ?? 'MCB',
    continuous: raw.continuous ?? load.continuous,
    triplen_percent: raw.triplen_percent == null ? load.triplen : num(raw.triplen_percent, load.triplen),
    demand_factor: raw.demand_factor == null ? load.demand : num(raw.demand_factor, load.demand),
  }
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// Cortocircuito
// ─────────────────────────────────────────────────────────────────────────────
function calcShortCircuit({ voltage, phases, conductor_material, length_m, insulation, source_icc_ka, fault_duration_s, selected, thermalK }) {
  // Impedancia equivalente de la fuente (por Icc conocida, R/X = 0.1)
  const src = zFromIcc({ iccKa: source_icc_ka, voltage, phases })

  // Tramo de cable: falta 3F (loop 1) y falta fase-neutro / tierra (loop 2)
  const c3 = cableZ({ size: selected, material: conductor_material, insulation, lengthM: length_m, loop: 1 })
  const c2 = cableZ({ size: selected, material: conductor_material, insulation, lengthM: length_m, loop: 2 })
  const z3 = seriesZ(src, c3)
  const z2 = seriesZ(src, c2)

  const atSource = ikAt({ voltage, phases, ...src, cmax: C_MAX, cmin: C_MIN })
  const atLoad3 = ikAt({ voltage, phases, z: z3.z, r: z3.r, x: z3.x, cmax: C_MAX, cmin: C_MIN })
  const atLoad1 = ikAt({ voltage, phases: 1, z: z2.z, r: z2.r, x: z2.x, cmax: C_MAX, cmin: C_MIN })

  const isccLoadA = Math.round(atLoad3.ikMaxA)
  const isccMinA = Math.round(atLoad1.ikMinA) // falta mínima en el extremo (fase-neutro, cmin)

  const breakingCapacity = nextBreakingCapacity(Math.max(source_icc_ka, atLoad3.ikMaxKa))

  // Verificación térmica k²S² ≥ I²t (IEC 60364-4-43)
  const iThermal = Math.max(source_icc_ka * 1000, atLoad3.ikMaxA)
  const energy = iThermal * iThermal * fault_duration_s
  const withstand = Math.pow(thermalK * selected, 2)
  const withstandOk = withstand >= energy
  const minSection = Math.sqrt(energy) / thermalK

  return {
    isccSourceKa: round(source_icc_ka, 2),
    isccLoadKa: round(atLoad3.ikMaxA / 1000, 3),
    isccMinKa: round(isccMinA / 1000, 3),
    isccMinA,
    ik3MaxKa: atLoad3.ikMaxKa,
    ik3MinKa: atLoad3.ikMinKa,
    ik1MaxKa: atLoad1.ikMaxKa,
    peakKa: atLoad3.peakKa,
    kappa: atLoad3.kappa,
    ratioRX: atLoad3.ratioRX,
    breakingCapacityKa: breakingCapacity,
    zSource: round(src.z, 5),
    zTotal: round(z3.z, 5),
    energyKtA2s: round(energy / 1e6, 3),
    withstandK: round(withstand / 1e6, 3),
    withstandOk,
    minSection: round(minSection, 2),
    withstandDetail: `k²S² = ${round(withstand / 1e6, 2)} ≥ I²t = ${round(energy / 1e6, 2)} (kA²·s) · S,mín = ${round(minSection, 2)} mm²`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tubería (llenado al 40 %)
// ─────────────────────────────────────────────────────────────────────────────
function calcConduit({ phase, neutral, pe, conductors, material }) {
  const areaOf = (mm2) => Math.PI * Math.pow(Math.sqrt(mm2 / Math.PI) * 1.35, 2) // área con aislamiento
  const totalArea = areaOf(phase) + areaOf(neutral) + areaOf(pe)
  const required = Math.sqrt((4 * totalArea) / (Math.PI * 0.4)) // 40 % de ocupación
  const chosen = CONDUIT_TRADES.find((c) => c.dia >= required) ?? CONDUIT_TRADES[CONDUIT_TRADES.length - 1]
  const conduitArea = Math.PI * Math.pow(chosen.dia / 2, 2)
  const fill = round((totalArea / conduitArea) * 100, 1)
  return {
    selected: { mm: chosen.mm, dia: chosen.dia, trade: chosen.trade, size: phase, conductors },
    requiredMm: round(required, 1),
    totalArea: round(totalArea, 1),
    fill_percent: fill,
    material,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compatibilidad: cálculo legado de un solo circuito (mismo shape anterior)
// ─────────────────────────────────────────────────────────────────────────────
export function runFullCalculation(input) {
  const r = calcCircuit(input)
  return {
    current: r.ib,
    breaker: r.breaker,
    conductor: { size: r.conductor.phase, area_mm2: r.conductor.phase },
    correctedAmpacity: r.conductor.correctedAmpacity,
    tempFactor: r.factors.temp.toFixed(2),
    methodDerating: r.factors.grouping.toFixed(2),
    resistance: r.resistance.toFixed(3),
    reactance: r.reactance.toFixed(3),
    voltageDrop: r.voltageDrop,
    regulation: r.regulation,
    voltageAtLoad: r.voltageAtLoad,
    powerLoss: r.powerLoss,
    conductorDetail: r.conductor,
    shortCircuit: {
      iscc_origin_ka: r.shortCircuit.isccSourceKa,
      iscc_load_ka: r.shortCircuit.isccLoadKa,
      breaking_capacity_required_kA: r.shortCircuit.breakingCapacityKa.toFixed(1),
      min_conductor_ka: r.shortCircuit.withstandDetail,
    },
    conduit: { selected: { trade: r.conduit.selected.trade, size: r.conduit.selected.size, conductors: r.conduit.selected.conductors }, fill_percent: r.conduit.fill_percent },
    grounding: {
      groundingElectrodeConductor: groundingElectrodeConductor(r.conductor.phase),
      minOverheadConductor: r.conductor.phase >= 25 ? '8 AWG' : '10 AWG',
    },
  }
}

export { tripTime }

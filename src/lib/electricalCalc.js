import {
  ampacityTable, groupingFactor, resistance, reactance,
  TEMPERATURE_FACTORS, BREAKER_CURVE_TYPES,
} from '@/lib/electricalData'

// Índice de método de instalación dentro de las columnas de ampacidad
const METHOD_COLUMN = {
  conduit_3: 0, conduit_4: 1, conduit_7: 2, cable_tray: 3, buried: 4,
}

export function runFullCalculation(input) {
  const {
    power_kw, voltage, power_factor, length_m, phases,
    conductor_material, ambient_temp, installation_method,
    fault_current_origin_ka, fault_duration_s, conduit_conductor_count,
  } = input

  // Corriente nominal (A)
  const currentFloat = phases === 3
    ? (power_kw * 1000) / (Math.sqrt(3) * voltage * power_factor)
    : (power_kw * 1000) / (voltage * power_factor)
  const current = Math.round(currentFloat * 10) / 10

  // Protección térmica: siguiente breaker estándar ≥ corriente * 1.25
  const breaker = nextBreaker(currentFloat * 1.25)

  // Factores de corrección
  const tempFactor = TEMPERATURE_FACTORS[ambient_temp] ?? 1
  const methodDerating = groupingFactor(conduit_conductor_count)

  const table = ampacityTable(conductor_material)
  const sizes = Object.keys(table).map(Number).sort((a, b) => a - b)
  const col = METHOD_COLUMN[installation_method] ?? 0

  // Seleccionar conductor con ampacidad corregida >= corriente
  let selected = sizes[sizes.length - 1]
  for (const s of sizes) {
    const corrected = table[s][col] * tempFactor * methodDerating
    if (corrected >= currentFloat) { selected = s; break }
  }

  const correctedAmpacity = Math.round(table[selected][col] * tempFactor * methodDerating)
  const selectedR = resistance(selected, conductor_material)
  const selectedX = reactance()

  // Caída de tensión (monofásico 2 conductores, trifásico √3)
  const k = phases === 3 ? Math.sqrt(3) : 2
  const phaseAngle = Math.acos(power_factor)
  const sinAngle = Math.sin(phaseAngle)
  const voltDropPerKm = Math.round(k * currentFloat * (selectedR * power_factor + selectedX * sinAngle) * 1000) / 1000
  const voltageDrop = parseFloat((voltDropPerKm * (length_m / 1000)).toFixed(2))
  const regulation = parseFloat(((voltageDrop / voltage) * 100).toFixed(2))
  const voltageAtLoad = parseFloat((voltage - voltageDrop).toFixed(1))

  // Pérdidas en el conductor (I²·R)
  const ROhm = (selectedR * length_m) / 1000
  const powerLoss = phases === 3
    ? parseFloat((3 * currentFloat * currentFloat * ROhm).toFixed(1))
    : parseFloat((2 * currentFloat * currentFloat * ROhm).toFixed(1))

  // Cortocircuito
  const shortCircuit = calcShortCircuit({
    voltage, currentFloat, conductor_material, length_m, phases,
    ambient_temp, methodDerating, fault_current_origin_ka, fault_duration_s,
    selected, current,
  })

  // Conduit / tubería (diámetro comercial según sección y nº de conductores)
  const conduit = calcConduit(selected, conduit_conductor_count)

  // Puesta a tierra (conductor de electrodo según NEC 250.66)
  const grounding = calcGrounding(selected)

  return {
    current,
    breaker,
    conductor: { size: selected, area_mm2: selected },
    correctedAmpacity,
    tempFactor: tempFactor.toFixed(2),
    methodDerating: methodDerating.toFixed(2),
    resistance: selectedR.toFixed(3),
    reactance: selectedX.toFixed(3),
    voltageDrop,
    regulation,
    voltageAtLoad,
    powerLoss,
    shortCircuit,
    conduit,
    grounding,
  }
}

function calcShortCircuit({
  voltage, currentFloat, conductor_material, length_m, phases,
  ambient_temp, methodDerating, fault_current_origin_ka, fault_duration_s, selected,
}) {
  // Capacidad de ruptura del breaker: >= Icc en el punto
  const rInOhm = resistance(selected, conductor_material) * (length_m / 1000) * 2
  const xInOhm = reactance() * (length_m / 1000) * 2
  const z = Math.sqrt(rInOhm * rInOhm + xInOhm * xInOhm)
  const isccLoadKa = z > 0 ? parseFloat(((voltage / z) / 1000).toFixed(2)) : fault_current_origin_ka

  return {
    iscc_origin_ka: fault_current_origin_ka,
    iscc_load_ka: isccLoadKa,
    breaking_capacity_required_kA: Math.max(fault_current_origin_ka, isccLoadKa).toFixed(1),
    min_conductor_ka: isccLoadKa <= fault_current_origin_ka
      ? `Cumple (${isccLoadKa} kA ≤ ${fault_current_origin_ka} kA en origen)`
      : `Verificar (${isccLoadKa} kA > ${fault_current_origin_ka} kA)`,
  }
}

function calcConduit(mm2, conductorCount) {
  const tradeBySize = {
    1.5: "1/2\"", 2.5: "1/2\"", 4: "1/2\"", 6: "3/4\"", 10: "3/4\"",
    16: "1\"", 25: "1\"", 35: "1 1/4\"", 50: "1 1/2\"", 70: "2\"",
    95: "2\"", 120: "2 1/2\"", 150: "3\"", 185: "3\"", 240: "3 1/2\"", 300: "4\"",
  }
  const trade = tradeBySize[mm2] ?? "4\""
  return {
    selected: { trade, size: mm2, conductors: conductorCount },
    fill_percent: clamp(30 + conductorCount * 3, 40, 80),
  }
}

function calcGrounding(mm2) {
  // Conductor de electrodo de puesta a tierra (NEC 250.66) en cobre
  const table = {
    1.5: "6 AWG", 2.5: "6 AWG", 4: "6 AWG", 6: "6 AWG", 10: "6 AWG",
    16: "4 AWG", 25: "2 AWG", 35: "1 AWG", 50: "1/0 AWG", 70: "2/0 AWG",
    95: "3/0 AWG", 120: "4/0 AWG", 150: "250 kcmil", 185: "250 kcmil",
    240: "350 kcmil", 300: "400 kcmil",
  }
  return {
    groundingElectrodeConductor: table[mm2] ?? "400 kcmil",
    minOverheadConductor: mm2 >= 25 ? "8 AWG" : "10 AWG",
  }
}

const STANDARD_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630]

function nextBreaker(amp) {
  for (const b of STANDARD_BREAKERS) if (b >= amp) return b
  return STANDARD_BREAKERS[STANDARD_BREAKERS.length - 1]
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

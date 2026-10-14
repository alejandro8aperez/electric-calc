import { getStartingMethod, nextTransformer, nextBreaker } from '@/lib/electricalData'

const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimensionamiento de generador de emergencia
// ─────────────────────────────────────────────────────────────────────────────
export function calcGenerator(input = {}) {
  const runningKw = num(input.running_load_kw, 0)
  const powerFactor = num(input.power_factor, 0.8)
  const largestMotorKw = num(input.largest_motor_kw, 0)
  const motorEff = num(input.motor_efficiency, 0.9)
  const motorPf = num(input.motor_pf, 0.87)
  const starting = getStartingMethod(input.starting_method ?? 'DOL')
  const growth = num(input.future_growth, 10)
  const loadFactor = num(input.load_factor, 1.0)

  // 1. Carga continua (kVA)
  const runningKva = (runningKw * loadFactor) / (powerFactor || 0.8)

  // 2. Aporte de arranque del motor mayor (kVA durante arranque)
  //    SkVA_arranque ≈ (P_motor / η) × k_arranque / pf_arranque
  const motorKvaStart = largestMotorKw > 0
    ? ((largestMotorKw / motorEff) * starting.startMultiple) / (motorPf || 0.87)
    : 0
  // El motor mayor ya está dentro de runningKva; se suma sólo el excedente de arranque
  const motorKvaRunning = largestMotorKw > 0 ? (largestMotorKw / motorEff) / (motorPf || 0.87) : 0
  const startSurplus = Math.max(motorKvaStart - motorKvaRunning, 0)

  // 3. kVA requeridos del generador
  const requiredKva = (runningKva + startSurplus * 0.9) * (1 + growth / 100)
  const ratedKva = nextTransformer(requiredKva) // misma serie comercial
  const ratedKw = round(ratedKva * powerFactor, 1)

  // 4. Carga del generador
  const genLoading = ratedKva > 0 ? round((runningKva / ratedKva) * 100, 1) : 0
  const transientLoading = ratedKva > 0 ? round(((runningKva + startSurplus) / ratedKva) * 100, 1) : 0

  // 5. Protección principal
  const iNominal = round((ratedKva * 1000) / (Math.sqrt(3) * num(input.voltage, 440)), 1)
  const mainBreaker = nextBreaker(iNominal)

  // 6. Consumo de combustible estimado (L/h) — 0.21 L/kWh aprox. diésel
  const fuelLph = round(ratedKw * 0.21 * (genLoading / 100 || 0.25), 2)

  return {
    runningKw, runningKva: round(runningKva, 2),
    motorKvaStart: round(motorKvaStart, 2),
    startSurplus: round(startSurplus, 2),
    requiredKva: round(requiredKva, 2),
    ratedKva, ratedKw,
    genLoading, transientLoading,
    voltage: num(input.voltage, 440),
    iNominal, mainBreaker,
    fuelLph,
    starting: starting.label,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimensionamiento de UPS y banco de baterías
// ─────────────────────────────────────────────────────────────────────────────
export function calcUps(input = {}) {
  const criticalKw = num(input.critical_kw, 10)
  const powerFactor = num(input.power_factor, 0.9)
  const autonomyMin = num(input.autonomy_min, 15)
  const dcBusV = num(input.dc_bus_voltage, 240)
  const inverterEff = num(input.inverter_efficiency, 0.94)
  const batteryEff = num(input.battery_efficiency, 0.9)
  const dod = num(input.depth_of_discharge, 0.8)
  const sizingMargin = num(input.sizing_margin, 0.25)

  // 1. Potencia de la UPS (con margen)
  const criticalKva = criticalKw / (powerFactor || 0.9)
  const requiredKva = criticalKva * (1 + sizingMargin)
  const ratedKva = nextTransformer(requiredKva)

  // 2. Banco de baterías
  //    Energía DC necesaria (Wh) = P(kW)·t(h) / (η_inv · η_bat · DoD)
  const energyWh = (criticalKw * 1000 * (autonomyMin / 60)) / ((inverterEff || 0.94) * (batteryEff || 0.9) * (dod || 0.8))
  const energyKwh = round(energyWh / 1000, 2)

  // 3. Capacidad requerida (Ah) a la tensión del bus DC
  const requiredAh = round(energyWh / dcBusV, 1)
  // Batería comercial (Ah por bloque 12 V) → nº de bloques y strings
  const blockAh = num(input.block_ah, 100)
  const blocksPerString = Math.ceil(dcBusV / 12)
  const strings = Math.max(1, Math.ceil(requiredAh / blockAh))
  const totalBlocks = blocksPerString * strings
  const installedAh = round(blockAh * strings, 0)

  // 4. Corriente de descarga y carga
  const dischargeA = round((criticalKw * 1000) / ((inverterEff || 0.94) * dcBusV), 1)
  const chargeA = round(dischargeA * 1.2, 1) // recarga ≈ 120 % de la descarga

  return {
    criticalKw, criticalKva: round(criticalKva, 2),
    requiredKva: round(requiredKva, 2), ratedKva,
    autonomyMin,
    dcBusV,
    energyKwh,
    requiredAh, installedAh,
    blockAh, blocksPerString, strings, totalBlocks,
    dischargeA, chargeA,
    inverterEff, batteryEff, dod,
  }
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

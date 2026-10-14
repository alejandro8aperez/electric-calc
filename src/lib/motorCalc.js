import { getStartingMethod, nextBreaker } from '@/lib/electricalData'
import { calcCircuit } from '@/lib/electricalCalc'
import { sizeCable } from '@/lib/panelCalc'

const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo de motor y arranque
// ─────────────────────────────────────────────────────────────────────────────
export function calcMotor(input = {}) {
  const powerKw = num(input.power_kw, 15)
  const voltage = num(input.voltage, 440)
  const phases = input.phases === 1 ? 1 : 3
  const powerFactor = num(input.power_factor, 0.87)
  const efficiency = num(input.efficiency, 0.92)
  const starting = getStartingMethod(input.starting_method ?? 'DOL')
  const sourceIccKa = num(input.source_icc_ka, 10)
  const lengthM = num(input.length_m, 30)
  const ambient = num(input.ambient_temp, 30)
  const material = input.conductor_material ?? 'copper'
  const insulation = input.insulation ?? 'XLPE'
  const method = input.installation_method ?? 'C'
  const serviceFactor = num(input.service_factor, 1.0)

  // 1. Corriente a plena carga (FLA) — potencia de eje / rendimiento
  const electricalKw = powerKw / (efficiency || 1)
  const fla = phases === 3
    ? round((electricalKw * 1000) / (Math.sqrt(3) * voltage * powerFactor), 2)
    : round((electricalKw * 1000) / (voltage * powerFactor), 2)

  // 2. Corriente de arranque
  const startMultiple = num(input.start_multiple, starting.startMultiple)
  const startingCurrent = round(fla * startMultiple, 1)

  // 3. Caída de tensión en arranque (dip)
  const isccAtMotorA = sourceIccKa * 1000
  const voltageDip = round((startingCurrent / isccAtMotorA) * 100, 2)

  // 4. Cable del alimentador dimensionado por FLA (continua 125 %)
  const cable = sizeCable({
    current: fla * 1.25 * serviceFactor,
    material, insulation, method, ambient,
    grouping: num(input.grouping_count, 3),
  })

  // 5. Protección
  const curve = input.curve ?? (starting.id === 'DOL' ? 'D' : 'K')
  const breaker = nextBreaker(fla * 1.15)
  const magneticThreshold = round(breaker * (curve === 'D' ? 15 : 12), 0)
  const magneticOk = startingCurrent < magneticThreshold
  const thermalSetting = round(fla * 1.0, 1) // ajuste térmico ≈ In (clase 10/20)

  // 6. Contactor recomendado (AC-3 ≈ In del motor)
  const contactor = nextContactor(fla)

  // 7. Verificación de arranque admisible
  const dipLimit = num(input.dip_limit, 15)
  const startOk = voltageDip <= dipLimit

  const checks = {
    dip: startOk,
    dipDetail: `ΔU arranque = ${voltageDip} % ≤ ${dipLimit} %`,
    magnetic: magneticOk,
    magneticDetail: `Iarranque = ${startingCurrent} A ${magneticOk ? '<' : '≥'} umbral magnético ${magneticThreshold} A`,
    thermal: cable.correctedAmpacity >= fla * 1.25 * serviceFactor,
    thermalDetail: `Iz = ${cable.correctedAmpacity} A ≥ 125 %·FLA = ${round(fla * 1.25 * serviceFactor, 1)} A`,
  }
  const compliance = Object.values(checks).filter((v) => typeof v === 'boolean').every(Boolean) ? 'compliant' : 'review'

  return {
    powerKw, voltage, phases, powerFactor, efficiency,
    fla, startingCurrent, startMultiple, starting,
    voltageDip, dipLimit,
    cable, breaker, curve, magneticThreshold, thermalSetting, contactor,
    serviceFactor,
    checks,
    compliance,
  }
}

function nextContactor(fla) {
  const ratings = [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225, 265, 330, 400, 500, 630]
  for (const r of ratings) if (r >= fla) return r
  return '≥ 630 A (verificar)'
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

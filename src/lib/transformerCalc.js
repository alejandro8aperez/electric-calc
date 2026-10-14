import { nextTransformer, TRANSFORMER_SPECS, nextBreaker } from '@/lib/electricalData'

const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimensionamiento de transformador de distribución
// ─────────────────────────────────────────────────────────────────────────────
export function calcTransformer(input = {}) {
  const loadKva = num(input.load_kva, 0)
  const primaryV = num(input.primary_voltage, 13200)
  const secondaryV = num(input.secondary_voltage, 480)
  const targetLoading = num(input.target_loading, 0.8) // 80 % de carga objetivo
  const futureGrowth = num(input.future_growth, 0) // % de reserva
  const phases = input.phases === 1 ? 1 : 3
  const neutralType = input.neutral_type ?? 'solid' // solid | impedance | isolated

  // 1. Potencia mínima requerida
  const requiredKva = (loadKva / (targetLoading || 0.8)) * (1 + futureGrowth / 100)
  const ratedKva = nextTransformer(requiredKva)

  // 2. %Z y pérdidas estimadas
  const spec = pickSpec(ratedKva)
  const zPercent = num(input.impedance_percent, spec.z)

  // 3. Carga real
  const loading = ratedKva > 0 ? round((loadKva / ratedKva) * 100, 1) : 0
  const loadPercent = loading

  // 4. Corrientes nominales
  const iPrimary = phases === 3
    ? round((ratedKva * 1000) / (Math.sqrt(3) * primaryV), 2)
    : round((ratedKva * 1000) / primaryV, 2)
  const iSecondary = phases === 3
    ? round((ratedKva * 1000) / (Math.sqrt(3) * secondaryV), 2)
    : round((ratedKva * 1000) / secondaryV, 2)

  // 5. Cortocircuito en el secundario
  const isccSecondary = phases === 3
    ? round((ratedKva * 1000) / (Math.sqrt(3) * secondaryV * (zPercent / 100)), 1)
    : round((ratedKva * 1000) / (secondaryV * (zPercent / 100)), 1)

  // 6. Pérdidas y eficiencia
  const specForLoss = pickSpec(ratedKva)
  const noLoadLoss = specForLoss.noLoad
  const loadLoss = specForLoss.load
  const loadRatio = loadKva / ratedKva
  const totalLoss = round(noLoadLoss + loadLoss * Math.pow(loadRatio, 2), 0)
  const outputW = loadKva * 1000 * num(input.power_factor, 0.9)
  const efficiency = outputW > 0 ? round((outputW / (outputW + totalLoss)) * 100, 2) : 0

  // 7. Protecciones recomendadas
  const primaryBreaker = nextBreaker(iPrimary * 1.25)
  // Secundario: In del interruptor general ≥ corriente nominal
  const secondaryBreaker = nextBreaker(iSecondary * 1.1)

  // 8. Regulación interna aproximada a plena carga
  const regulation = round(zPercent * loadRatio * num(input.power_factor, 0.9), 2)

  // 9. Advertencias
  const warnings = []
  if (loading > 90) warnings.push('Carga > 90 %: considere el siguiente calibre.')
  if (zPercent < 3.5) warnings.push('%Z bajo: verifique la capacidad de ruptura aguas abajo.')
  if (futureGrowth === 0) warnings.push('Sin reserva de crecimiento definida.')

  return {
    ratedKva,
    requiredKva: round(requiredKva, 2),
    loading,
    loadPercent,
    primaryV,
    secondaryV,
    phases,
    neutralType,
    zPercent,
    iPrimary,
    iSecondary,
    isccSecondaryKa: round(isccSecondary / 1000, 2),
    isccSecondaryA: isccSecondary,
    primaryBreaker,
    secondaryBreaker,
    noLoadLoss,
    loadLoss,
    totalLoss,
    efficiency,
    regulation,
    warnings,
    spec,
  }
}

function pickSpec(kva) {
  const keys = Object.keys(TRANSFORMER_SPECS).map(Number).sort((a, b) => a - b)
  let chosen = TRANSFORMER_SPECS[keys[keys.length - 1]]
  for (const k of keys) {
    if (kva <= k) { chosen = TRANSFORMER_SPECS[k]; break }
  }
  return chosen ?? { noLoad: 900, load: 4600, z: 4.5 }
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

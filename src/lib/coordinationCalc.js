import { BREAKER_CURVE_TYPES, tripTime } from '@/lib/electricalData'

export function selectInterruptingCapacity(icc) {
  // Capacidad de ruptura comercial >= Icc disponible
  const standard = [6, 10, 16, 25, 36, 50, 65, 100]
  for (const s of standard) if (s >= icc) return s
  return standard[standard.length - 1]
}

export function checkSelectivity(upstream, downstream, icc, curveId = "C") {
  const ratio = upstream / downstream

  // Selectividad basada en ratio >= 1.6 recomendado
  const selective = ratio >= 1.6

  const curve = BREAKER_CURVE_TYPES.find((c) => c.id === curveId) ?? BREAKER_CURVE_TYPES[1]

  // Tiempo de disparo según múltiplo de la corriente nominal (Icc / In)
  const upstreamMultiple = icc / upstream
  const downstreamMultiple = icc / downstream
  const upstreamTrip = upstullTripTime(curve.id, upstreamMultiple)
  const downstreamTrip = upstullTripTime(curve.id, downstreamMultiple)

  return {
    selective,
    ratio,
    upstreamTrip,
    downstreamTrip,
    curve,
  }
}

// Cálculo de tiempo de disparo (para simplificar se usa un modelo simple)
function upstullTripTime(curveId, multiple) {
  if (multiple <= 1) return null
  if (multiple >= 10) return 0.01
  return parseFloat(tripTime(curveId, multiple) + (2 / multiple)).toFixed(2)
}

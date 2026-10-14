import { BREAKER_CURVE_TYPES, tripTime, nextBreakingCapacity } from '@/lib/electricalData'

// ─────────────────────────────────────────────────────────────────────────────
// Coordinación de protecciones — selectividad y capacidad de interrupción
// ─────────────────────────────────────────────────────────────────────────────

// Capacidad de ruptura comercial ≥ Icc disponible (kA)
export function selectInterruptingCapacity(iccKa) {
  return nextBreakingCapacity(iccKa)
}

// Selectividad entre dos protecciones (misma/diferente tecnología)
// upstream: { rating, curve }  downstream: { rating, curve }
export function checkSelectivity(upstream, downstream, iccKa, curveId) {
  const up = normalizeDevice(upstream, curveId)
  const down = normalizeDevice(downstream)

  const ratio = up.rating / down.rating

  // 1. Selectividad de corriente (por calibre)
  const currentSelective = ratio >= 1.6

  // 2. Selectividad temporal / zona magnética:
  //    La selectividad es total si el umbral magnético de aguas arriba está
  //    por encima de la Icc disponible (aguas arriba no dispara instantáneo).
  const upMagneticA = up.rating * curveMagnetic(up.curve)
  const downMagneticA = down.rating * curveMagnetic(down.curve)
  const magneticSelective = upMagneticA > iccKa * 1000

  // 3. Tiempos de disparo para la Icc de falta
  const upTrip = tripTime(up.curve, (iccKa * 1000) / up.rating)
  const downTrip = tripTime(down.curve, (iccKa * 1000) / down.rating)
  const timeSelective = downTrip !== null && (upTrip === null || downTrip <= upTrip)

  // 4. Límite de corriente de selectividad (kA) — por debajo del cual es selectivo
  const selectiveUpToKa = round(Math.min(upMagneticA, iccKa * 1000) / 1000, 2)

  const selective = (currentSelective && timeSelective) || magneticSelective

  return {
    selective,
    ratio: round(ratio, 2),
    currentSelective,
    magneticSelective,
    timeSelective,
    upstreamTrip: upTrip !== null ? round(upTrip, 2) : null,
    downstreamTrip: downTrip !== null ? round(downTrip, 2) : null,
    upMagneticA: round(upMagneticA, 0),
    downMagneticA: round(downMagneticA, 0),
    selectiveUpToKa,
    up,
    down,
    curve: up.curveDef,
  }
}

// Evaluación de una cascada de protecciones (varios niveles)
// levels: [{ name, rating, curve }] de aguas arriba a aguas abajo
export function checkCascade(levels = [], iccKa) {
  const devices = levels.map((l) => normalizeDevice(l))
  const pairs = []
  for (let i = 0; i < devices.length - 1; i++) {
    const r = checkSelectivity(devices[i], devices[i + 1], iccKa)
    pairs.push({
      upstream: devices[i].name,
      downstream: devices[i + 1].name,
      ...r,
    })
  }
  return {
    devices,
    pairs,
    global: pairs.every((p) => p.selective),
    iccKa,
  }
}

function normalizeDevice(d, fallbackCurve) {
  const rating = typeof d === 'number' ? d : num(d?.rating, 100)
  const curve = (typeof d === 'object' && d?.curve) || fallbackCurve || 'C'
  const curveDef = BREAKER_CURVE_TYPES.find((c) => c.id === curve) ?? BREAKER_CURVE_TYPES[2]
  return {
    name: (typeof d === 'object' && d?.name) || `${rating} A`,
    rating,
    curve,
    curveDef,
  }
}

function curveMagnetic(curveId) {
  const c = BREAKER_CURVE_TYPES.find((x) => x.id === curveId)
  return c ? c.magnetic : 7.5
}

function round(v, d = 2) {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

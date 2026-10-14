import { BREAKER_CURVE_TYPES, tripTime, nextBreakingCapacity } from '@/lib/electricalData'

// ─────────────────────────────────────────────────────────────────────────────
// Coordinación de protecciones — selectividad y capacidad de interrupción
// ─────────────────────────────────────────────────────────────────────────────

// Capacidad de ruptura comercial ≥ Icc disponible (kA)
export function selectInterruptingCapacity(iccKa) {
  return nextBreakingCapacity(iccKa)
}

// Selectividad entre dos protecciones (misma/diferente tecnología)
// upstream: { rating, curve, technology }  downstream: { rating, curve, technology }
export function checkSelectivity(upstream, downstream, iccKa, curveId) {
  const up = normalizeDevice(upstream, curveId)
  const down = normalizeDevice(downstream)

  const ratio = up.rating / down.rating

  // 1. Selectividad de corriente (por calibre y tecnología, tabla de referencia)
  const requiredRatio = selectivityRatio(up.technology, down.technology)
  const currentSelective = ratio >= requiredRatio

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
    requiredRatio,
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

// ─────────────────────────────────────────────────────────────────────────────
// Filiación / cascada (backup protection) — IEC 60947-2 Anexo A
// Permite que la protección aguas arriba tenga un poder de corte menor que la Icc,
// porque la de aguas abajo limita la energía. Válido solo con combinaciones ensayadas.
// ─────────────────────────────────────────────────────────────────────────────
export function checkFiliation(upstream, downstream, iccKa) {
  const up = normalizeDevice(upstream)
  const down = normalizeDevice(downstream)
  const ratio = up.rating / down.rating
  const currentBackup = ratio >= 1.2
  const magneticBackup = up.rating * curveMagnetic(up.curve) > down.rating * curveMagnetic(down.curve)
  const allowable = currentBackup && magneticBackup

  return {
    allowable,
    ratio: round(ratio, 2),
    currentBackup,
    magneticBackup,
    iccKa,
    message: allowable
      ? `Filiación admisible: ${down.name} puede respaldar a ${up.name}. Verificar tabla del fabricante.`
      : 'No se garantiza filiación sin ensayo; exigir Pdc ≥ Icc disponible.',
    note: 'La filiación solo es válida con combinaciones ensayadas por el fabricante (IEC 60947-2 Anexo A).',
  }
}

// Relación de calibres requerida para selectividad de corriente según tecnología
export function selectivityRatio(upTech = 'MCB', downTech = 'MCB') {
  const table = {
    MCB: { MCB: 1.6, MCCB: 2.0, FUSE: 2.0 },
    MCCB: { MCB: 2.0, MCCB: 1.5, FUSE: 2.0 },
    FUSE: { MCB: 2.0, MCCB: 2.0, FUSE: 1.6 },
  }
  return table[upTech]?.[downTech] ?? 1.6
}

// Evaluación de una cascada de protecciones (varios niveles)
// levels: [{ name, rating, curve }] de aguas arriba a aguas abajo
export function checkCascade(levels = [], iccKa) {
  const devices = levels.map((l) => normalizeDevice(l))
  const pairs = []
  for (let i = 0; i < devices.length - 1; i++) {
    const r = checkSelectivity(devices[i], devices[i + 1], iccKa)
    const fil = checkFiliation(devices[i], devices[i + 1], iccKa)
    pairs.push({
      upstream: devices[i].name,
      downstream: devices[i + 1].name,
      ...r,
      filiation: fil,
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
  const technology = (typeof d === 'object' && d?.technology) || 'MCB'
  const curveDef = BREAKER_CURVE_TYPES.find((c) => c.id === curve) ?? BREAKER_CURVE_TYPES[2]
  return {
    name: (typeof d === 'object' && d?.name) || `${rating} A`,
    rating,
    curve,
    technology,
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

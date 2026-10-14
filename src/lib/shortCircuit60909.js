import { resistance, reactance } from '@/lib/electricalData'

// ─────────────────────────────────────────────────────────────────────────────
// Cortocircuito IEC 60909 (BT)
// Factores de tensión c, impedancias en serie y cálculo de Ik máx/mín, pico y térmica.
// Referencias normativas: IEC 60909-0 (c), IEC 60364-4-43 (térmica).
// ─────────────────────────────────────────────────────────────────────────────
export const C_MAX = 1.05   // BT, cálculo de Ik máxima
export const C_MIN = 0.95   // BT, cálculo de Ik mínima
export const C_MAX_MV = 1.10
export const C_MIN_MV = 1.00

const round = (v, d = 4) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// Factor κ para la corriente de pico ip = κ·√2·Ik
export function peakFactor(ratioRX) {
  const rx = Number.isFinite(ratioRX) ? Math.max(ratioRX, 0) : 1
  return 1.02 + 0.98 * Math.exp(-3 * rx)
}

// Suma de impedancias en serie
export function seriesZ(a, b) {
  const r = (a.r ?? 0) + (b.r ?? 0)
  const x = (a.x ?? 0) + (b.x ?? 0)
  return { r, x, z: Math.hypot(r, x) }
}

// Impedancia equivalente de una fuente conocida por su Icc (asume R/X = 0.1)
export function zFromIcc({ iccKa, voltage, phases = 3, cmax = C_MAX, ratioRX = 0.1 }) {
  const vd = phases === 3 ? voltage / Math.sqrt(3) : voltage
  const z = (cmax * vd) / (iccKa * 1000)
  const r = z * (ratioRX / Math.hypot(ratioRX, 1))
  const x = Math.sqrt(Math.max(z * z - r * r, 0))
  return { r, x, z }
}

// Impedancia de un tramo de cable (loop = 1 en falta trifásica, 2 en falta fase-neutro)
export function cableZ({ size, material = 'copper', insulation = 'PVC', lengthM, loop = 1 }) {
  const tempOp = insulation === 'XLPE' ? 90 : 70
  const k = (loop * lengthM) / 1000
  return {
    r: resistance(size, material, tempOp) * k,
    x: reactance() * k,
  }
}

// Cálculo de Ik desde una impedancia total
export function ikAt({ voltage, phases = 3, z, r, x, cmax = C_MAX, cmin = C_MIN }) {
  const vd = phases === 3 ? voltage / Math.sqrt(3) : voltage
  const zz = z > 0 ? z : 1e-9
  const ratioRX = x > 0 ? r / x : 1
  const kappa = peakFactor(ratioRX)
  const ikMaxA = (cmax * vd) / zz
  const ikMinA = (cmin * vd) / zz
  return {
    ikMaxA,
    ikMinA,
    ikMaxKa: round(ikMaxA / 1000, 3),
    ikMinKa: round(ikMinA / 1000, 3),
    peakA: kappa * Math.SQRT2 * ikMaxA,
    peakKa: round((kappa * Math.SQRT2 * ikMaxA) / 1000, 3),
    kappa: round(kappa, 3),
    ratioRX: round(ratioRX, 3),
    voltageDriving: round(vd, 2),
    z: round(zz, 6),
    r: round(r, 6),
    x: round(x, 6),
  }
}

// Corriente térmica equivalente de corta duración (aprox. IEC 60909, m+n ≈ 1)
export function thermalCurrent(ikMaxA, durationS, { m = 0.05, n = 1 } = {}) {
  // Ith² · t = Ik² · (m + n) · t  → Ith = Ik·√(m+n)
  return ikMaxA * Math.sqrt(m + n)
}

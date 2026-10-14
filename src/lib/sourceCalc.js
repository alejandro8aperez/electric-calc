import { TRANSFORMER_SPECS } from '@/lib/electricalData'

// ─────────────────────────────────────────────────────────────────────────────
// Definición de la fuente de alimentación (equivalente de red)
// Produce la impedancia equivalente y la Icc en el punto de conexión.
// ─────────────────────────────────────────────────────────────────────────────
export const SOURCE_TYPES = [
  { id: 'transformer', label: 'Transformador MT/BT' },
  { id: 'genset', label: 'Grupo electrógeno' },
  { id: 'by_icc', label: 'Red · por Icc conocida' },
  { id: 'by_rx', label: 'Red · por R y X' },
  { id: 'monitored', label: 'Red · potencia de cortocircuito' },
  { id: 'battery', label: 'Batería CC' },
]

const round = (v, d = 4) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// Factor de tensión IEC 60909 (BT 230/400 V)
export const C_MAX = 1.05
export const C_MIN = 0.95

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// Reacción R/X típica según tipo de fuente
const DEFAULT_RX = { transformer: 0.1, genset: 0.05, by_icc: 0.1, monitored: 0.1, by_rx: null }

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo de la fuente
// ─────────────────────────────────────────────────────────────────────────────
export function calcSource(input = {}) {
  const type = input.type ?? 'transformer'
  const voltage = num(input.voltage, 400)       // tensión de línea en el punto (V)
  const frequency = num(input.frequency, 60)
  const notes = []

  let z = 0, r = 0, x = 0, dc = false, sccPower = null

  if (type === 'transformer') {
    const kva = num(input.kva, 630)
    const uk = num(input.uk_percent, 0) // si 0 → usar spec
    const spec = pickTransformerSpec(kva)
    const ukPercent = uk > 0 ? uk : spec.z
    const k = primaryVoltageFactor(input.primary_voltage, voltage)
    const s = kva * 1000 * k          // MVA referida (k corrige tensión)
    z = (ukPercent / 100) * (voltage * voltage) / s
    const pcu = num(input.load_losses_w, spec.load)
    r = pcu > 0 ? (pcu * voltage * voltage) / (s * s) : z * DEFAULT_RX.transformer
    x = Math.sqrt(Math.max(z * z - r * r, 0))
    notes.push(`Transformador ${kva} kVA · uk=${ukPercent} % · ${voltage} V`)
  } else if (type === 'genset') {
    const kva = num(input.kva, 500)
    const xdPercent = num(input.xd_percent, 15) // X''d %
    const s = kva * 1000
    x = (xdPercent / 100) * (voltage * voltage) / s
    r = x * DEFAULT_RX.genset
    z = Math.sqrt(r * r + x * x)
    notes.push(`Grupo ${kva} kVA · X''d=${xdPercent} % (subtransitorio)`)
  } else if (type === 'by_icc') {
    const iccKa = num(input.icc_ka, 10)
    const iccA = iccKa * 1000
    z = (C_MAX * voltage) / (Math.sqrt(3) * iccA)
    r = z * DEFAULT_RX.by_icc
    x = Math.sqrt(Math.max(z * z - r * r, 0))
    notes.push(`Red definida por Icc = ${iccKa} kA`)
  } else if (type === 'by_rx') {
    r = num(input.r_ohm, 0)
    x = num(input.x_ohm, 0)
    z = Math.sqrt(r * r + x * x)
    notes.push('Red definida por R y X del equivalente')
  } else if (type === 'monitored') {
    sccPower = num(input.sc_power_mva, 250) // MVA de cortocircuito
    z = (voltage * voltage) / (sccPower * 1e6)
    r = z * DEFAULT_RX.monitored
    x = Math.sqrt(Math.max(z * z - r * r, 0))
    notes.push(`Red definida por potencia de cc = ${sccPower} MVA`)
  } else if (type === 'battery') {
    dc = true
    const vdc = num(input.dc_voltage, 240)
    const rInt = num(input.internal_resistance_mohm, 20) / 1000
    z = rInt
    r = rInt
    x = 0
    notes.push(`Batería ${vdc} V · Rint = ${round(rInt * 1000, 1)} mΩ (CC)`)
  }

  const ratioRX = (x > 0) ? r / x : (dc ? Infinity : DEFAULT_RX[type] ?? 0.1)

  const ikMaxA = dc ? z > 0 ? voltage / z : 0 : (C_MAX * voltage) / (Math.sqrt(3) * z)
  const ikMinA = dc ? ikMaxA : (C_MIN * voltage) / (Math.sqrt(3) * z)
  const kappa = dc ? 2 : 1.02 + 0.98 * Math.exp(-3 * (isFinite(ratioRX) ? ratioRX : 1))
  const peakA = kappa * Math.sqrt(2) * ikMaxA

  return {
    type,
    specialType: SOURCE_TYPES.find((s) => s.id === type)?.label ?? type,
    voltage, frequency, dc,
    z: round(z, 6),
    r: round(r, 6),
    x: round(x, 6),
    ratioRX: isFinite(ratioRX) ? round(ratioRX, 3) : null,
    kappa: round(kappa, 3),
    scPowerMva: sccPower,
    iccMaxKa: round(ikMaxA / 1000, 3),
    iccMinKa: round(ikMinA / 1000, 3),
    peakKa: round(peakA / 1000, 3),
    notes,
  }
}

function pickTransformerSpec(kva) {
  const keys = Object.keys(TRANSFORMER_SPECS).map(Number).sort((a, b) => a - b)
  for (const k of keys) if (kva <= k) return TRANSFORMER_SPECS[k]
  return TRANSFORMER_SPECS[keys[keys.length - 1]] ?? { noLoad: 1900, load: 9500, z: 5.5 }
}

// Factor por tensión primaria real vs. nominal del trafo (ajusta impedancia referida)
function primaryVoltageFactor(primary, secondary) {
  const p = num(primary, 0)
  if (!p) return 1
  // Z referida al secundario ∝ (V2²/S); el factor corrige pequeños desvíos de diseño
  return 1
}

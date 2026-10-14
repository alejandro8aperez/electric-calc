import { calcCircuit, protectiveConductor } from '@/lib/electricalCalc'
import {
  SIZES, ampacityOf, temperatureFactor, groupingFactor, resistance, reactance,
  nextSize, nextBreaker, nextBreakingCapacity, getMethod,
} from '@/lib/electricalData'
import { ikAt, seriesZ, zFromIcc, cableZ, C_MAX, C_MIN } from '@/lib/shortCircuit60909'

const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// Fases de un tablero trifásico
export const PHASES = ['L1', 'L2', 'L3']

// ─────────────────────────────────────────────────────────────────────────────
// Dimensiona un cable dada una corriente (para acometidas / alimentadores)
// ─────────────────────────────────────────────────────────────────────────────
export function sizeCable({ current, material = 'copper', insulation = 'PVC', method = 'C', ambient = 30, grouping = 1, buried = false }) {
  const kTemp = temperatureFactor(insulation, ambient, buried)
  const kGroup = groupingFactor(grouping, method === 'E' || method === 'F')
  const kTotal = kTemp * kGroup
  let size = SIZES[SIZES.length - 1]
  let iz = 0
  for (const s of SIZES) {
    const a = ampacityOf(s, method, material, insulation) * kTotal
    if (a >= current) { size = s; iz = a; break }
  }
  if (!iz) iz = ampacityOf(size, method, material, insulation) * kTotal
  return {
    size,
    neutral: size,
    pe: protectiveConductor(size),
    correctedAmpacity: round(iz, 1),
    factors: { temp: round(kTemp, 3), grouping: round(kGroup, 3), total: round(kTotal, 3) },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo completo de un tablero de distribución
// ─────────────────────────────────────────────────────────────────────────────
export function computePanel(system, circuits = []) {
  const sys = {
    voltage: num(system.voltage, 220),
    phases: system.phases === 1 ? 1 : 3,
    frequency: num(system.frequency, 60),
    power_factor: num(system.power_factor, 0.9),
    ambient_temp: num(system.ambient_temp, 30),
    conductor_material: system.conductor_material ?? 'copper',
    insulation: system.insulation ?? 'PVC',
    method: system.method ?? 'C',
    grouping_count: num(system.grouping_count, 3),
    source_icc_ka: num(system.source_icc_ka, 10),
    fault_duration_s: num(system.fault_duration_s, 0.5),
    feeder_length_m: num(system.feeder_length_m, 20),
  }

  // 1. Cálculo circuito por circuito
  const computed = circuits.map((c, i) => {
    const res = calcCircuit({
      ...c,
      voltage: c.voltage ?? sys.voltage,
      power_factor: c.power_factor ?? sys.power_factor,
      ambient_temp: c.ambient_temp ?? sys.ambient_temp,
      conductor_material: c.conductor_material ?? sys.conductor_material,
      insulation: c.insulation ?? sys.insulation,
      installation_method: c.installation_method ?? sys.method,
      grouping_count: c.grouping_count ?? sys.grouping_count,
      source_icc_ka: sys.source_icc_ka,
      fault_duration_s: sys.fault_duration_s,
    })
    const phase = res.input.phases === 1 ? (c.phase ?? PHASES[i % 3]) : null
    return { ...res, index: i, phaseAssignment: phase }
  })

  // 2. Potencia instalada y demanda
  const connectedKw = round(computed.reduce((s, c) => s + c.input.power_kw, 0), 2)
  const demandKw = round(computed.reduce((s, c) => s + c.demandPower, 0), 2)
  const pfAvg = computed.length
    ? computed.reduce((s, c) => s + c.input.power_factor * c.input.power_kw, 0) / Math.max(connectedKw, 0.001)
    : sys.power_factor

  // 3. Corriente de tablero
  const demandKva = demandKw / (pfAvg || 0.9)
  const boardCurrent = sys.phases === 3
    ? round((demandKva * 1000) / (Math.sqrt(3) * sys.voltage), 1)
    : round((demandKva * 1000) / sys.voltage, 1)

  // 4. Balance de fases (corriente por fase)
  const phaseCurrents = { L1: 0, L2: 0, L3: 0 }
  computed.forEach((c) => {
    if (c.input.phases === 3) {
      const perPhase = c.ib / Math.sqrt(3)
      phaseCurrents.L1 += perPhase; phaseCurrents.L2 += perPhase; phaseCurrents.L3 += perPhase
    } else if (c.phaseAssignment) {
      phaseCurrents[c.phaseAssignment] += c.ib
    }
  })
  Object.keys(phaseCurrents).forEach((k) => { phaseCurrents[k] = round(phaseCurrents[k], 1) })
  const phaseVals = Object.values(phaseCurrents)
  const maxPhase = Math.max(...phaseVals)
  const minPhase = Math.min(...phaseVals)
  const avgPhase = phaseVals.reduce((a, b) => a + b, 0) / 3
  const imbalance = avgPhase > 0 ? round(((maxPhase - minPhase) / avgPhase) * 100, 1) : 0

  // 5. Protección principal e interruptor general
  const hasCircuits = computed.length > 0
  const mainBreaker = hasCircuits ? nextBreaker(boardCurrent) : 0
  const busbar = hasCircuits ? nextBreaker(Math.max(mainBreaker, maxPhase)) : 0

  // 6. Alimentador (desde tablero aguas arriba)
  const feeder = sizeCable({
    current: boardCurrent,
    material: sys.conductor_material,
    insulation: sys.insulation,
    method: sys.method,
    ambient: sys.ambient_temp,
    grouping: sys.grouping_count,
    buried: getMethod(sys.method).buried,
  })
  const feederBreaker = nextBreaker(boardCurrent)
  const feederDrop = round(feederFactorDrop(sys, feeder.size, boardCurrent, boardCurrent), 2)
  const feederRegulation = round((feederDrop / sys.voltage) * 100, 2)

  // 7. Neutro del tablero (armónicos triplens)
  const triplenCurrent = round(computed.reduce((s, c) => s + c.neutralCurrent, 0), 1)
  const neutralSize = triplenCurrent > maxPhase * 0.5 ? feeder.size : nextSize(feeder.size / 2)

  // 8. Icc en barras (con impedancia del alimentador)
  const isccBoard = calcBoardIcc(sys, feeder.size)

  // 8b. Regulación amont (alimentador) / aval (circuito) / total
  computed.forEach((c) => {
    c.regulationUpstream = feederRegulation
    c.regulationDownstream = c.regulation
    c.regulationTotal = round(c.regulation + feederRegulation, 2)
  })

  // 9. Desbalance recomendación
  const recommendation = imbalance > 15
    ? 'Rebalancear circuitos monofásicos entre L1/L2/L3 (desbalance > 15 %)'
    : 'Balance de fases aceptable'

  return {
    system: sys,
    circuits: computed,
    connectedKw,
    demandKw,
    demandKva: round(demandKva, 2),
    powerFactor: round(pfAvg, 3),
    boardCurrent,
    mainBreaker,
    busbar,
    feeder: { ...feeder, breaker: feederBreaker, voltageDrop: feederDrop, regulation: feederRegulation },
    neutral: { size: neutralSize, current: triplenCurrent },
    phaseCurrents,
    imbalance,
    maxPhase,
    isccBoard,
    recommendation,
    compliance: computed.every((c) => c.compliance === 'compliant' && c.regulationTotal <= 5) && imbalance <= 15 ? 'compliant' : 'review',
  }
}

function feederFactorDrop(sys, size, current, ib) {
  const tempOp = sys.insulation === 'XLPE' ? 90 : 70
  const r = resistance(size, sys.conductor_material, tempOp)
  const x = reactance()
  const k = sys.phases === 3 ? Math.sqrt(3) : 2
  const sinPhi = 0.436 // aproximación para pf 0.9
  const drop = k * ib * (r * 0.9 + x * sinPhi) * (sys.feeder_length_m / 1000)
  return drop
}

function calcBoardIcc(sys, feederSize) {
  const src = zFromIcc({ iccKa: sys.source_icc_ka, voltage: sys.voltage, phases: sys.phases })
  const c3 = cableZ({ size: feederSize, material: sys.conductor_material, insulation: sys.insulation, lengthM: sys.feeder_length_m, loop: 1 })
  const z3 = seriesZ(src, c3)
  const atBoard = ikAt({ voltage: sys.voltage, phases: sys.phases, z: z3.z, r: z3.r, x: z3.x, cmax: C_MAX, cmin: C_MIN })
  return {
    isccKa: atBoard.ikMaxKa,
    isccMinKa: atBoard.ikMinKa,
    peakKa: atBoard.peakKa,
    kappa: atBoard.kappa,
    breakingCapacityKa: nextBreakingCapacity(atBoard.ikMaxKa),
    sourceKa: sys.source_icc_ka,
  }
}

// Balanceo óptimo: reparte los circuitos monofásicos para minimizar desbalance
export function balancePhases(circuits = []) {
  const mono = circuits.map((c, i) => ({ c, i })).filter(({ c }) => (c.phases ?? 1) === 1 || c.phases !== 3)
  const loads = [0, 0, 0]
  const assignment = {}
  mono.sort((a, b) => (b.c.power_kw ?? 0) - (a.c.power_kw ?? 0))
  mono.forEach(({ c, i }) => {
    const target = loads.indexOf(Math.min(...loads))
    assignment[i] = PHASES[target]
    loads[target] += num(c.power_kw, 0)
  })
  return { assignment, loads: loads.map((l) => round(l, 2)) }
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

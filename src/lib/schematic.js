// ─────────────────────────────────────────────────────────────────────────────
// Geometría del esquema unifilar multinivel + folios y numeración de bornes
// Genera primitivas (líneas, rectángulos, círculos, textos) independientes del
// render: se usan tanto para el SVG como para la exportación DXF.
// ─────────────────────────────────────────────────────────────────────────────

const BRANCH_W = 112
const ROW_H = 250
const TOP = 96
const GAP = 40

export const LAYER_COLOR = {
  BUS: '#dc2626',
  CABLE: '#334155',
  DEVICE: '#0f172a',
  SOURCE: '#f59e0b',
  TEXT: '#0f172a',
  SUBTEXT: '#64748b',
}

const DEVICE_FILL = '#0f172a'
const DEVICE_STROKE = '#0f172a'

const round = (v, d = 1) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout jerárquico (izquierda → derecha, por niveles)
// ─────────────────────────────────────────────────────────────────────────────
export function layoutNetwork(roots) {
  const nodeWidth = (n) => Math.max(240, (n.panel?.circuits?.length ?? 0) * BRANCH_W + 80)

  const measure = (n) => {
    const own = nodeWidth(n)
    if (!n.children.length) { n._w = own; return own }
    let sum = 0
    n.children.forEach((c, i) => { sum += measure(c); if (i) sum += GAP })
    n._w = Math.max(own, sum)
    return n._w
  }

  const place = (n, left, depth) => {
    n.width = nodeWidth(n)
    n.x = left + n._w / 2
    n.y = TOP + depth * ROW_H
    n.depth = depth
    const kidsW = n.children.reduce((s, c) => s + c._w, 0) + GAP * Math.max(0, n.children.length - 1)
    let childLeft = left + (n._w - kidsW) / 2
    n.children.forEach((c) => { place(c, childLeft, depth + 1); childLeft += c._w + GAP })
  }

  let left = 0
  roots.forEach((r, i) => { measure(r); if (i) left += GAP; place(r, left, 0); left += r._w })
  return left
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción del esquema a partir de la red calculada
// ─────────────────────────────────────────────────────────────────────────────
export function buildSchematic(network) {
  const roots = network.roots ?? []
  const totalWidth = layoutNetwork(roots)

  // Etiquetas / folios en orden de lectura
  network.nodes.forEach((n, i) => { n.tag = `T${i + 1}`; n.folio = i + 1 })

  const items = []
  const line = (x1, y1, x2, y2, layer = 'CABLE') => items.push({ type: 'line', x1, y1, x2, y2, layer })
  const rect = (x, y, w, h, { fill = '#ffffff', stroke = '#94a3b8', layer = 'DEVICE' } = {}) =>
    items.push({ type: 'rect', x, y, w, h, fill, stroke, layer })
  const circle = (cx, cy, r, { fill = '#fef3c7', stroke = '#f59e0b', layer = 'SOURCE' } = {}) =>
    items.push({ type: 'circle', cx, cy, r, fill, stroke, layer })
  const text = (x, y, size, str, { anchor = 'start', layer = 'TEXT', color } = {}) =>
    items.push({ type: 'text', x, y, size, text: String(str), anchor, layer, color })

  const drawBoard = (n) => {
    const left = n.x - n.width / 2
    const right = n.x + n.width / 2
    const busY = n.y + 74

    // Título + folio
    text(n.x, n.y, 13, `${n.tag} · ${truncate(n.name, 22)}`, { anchor: 'middle', layer: 'TEXT' })
    text(right, n.y + 2, 10, `#${n.folio}`, { anchor: 'end', layer: 'SUBTEXT' })
    text(n.x, n.y + 58, 10, `${n.system.voltage} V · ${n.system.phases === 3 ? '3F+N+PE' : '1F+N+PE'} · Icc ${n.busIcc} kA`, { anchor: 'middle', layer: 'SUBTEXT' })

    // Interruptor general
    rect(n.x - 42, n.y + 14, 84, 30, { fill: DEVICE_FILL, stroke: DEVICE_STROKE })
    text(n.x, n.y + 33, 11, `${n.panel?.mainBreaker ?? '—'} A`, { anchor: 'middle', layer: 'BUS', color: '#fbbf24' })
    line(n.x, n.y + 44, n.x, busY, 'CABLE')

    // Barraje
    line(left + 8, busY, right - 8, busY, 'BUS')
    text(left + 8, busY - 8, 10, `${n.panel?.busbar ?? '—'} A`, { anchor: 'start', layer: 'SUBTEXT' })

    // Circuitos
    const circuits = n.panel?.circuits ?? []
    circuits.forEach((c, i) => {
      const cx = left + 62 + i * BRANCH_W
      line(cx, busY, cx, n.y + 96, 'CABLE')
      rect(cx - 23, n.y + 96, 46, 24, { fill: '#f1f5f9', stroke: '#94a3b8', layer: 'DEVICE' })
      text(cx, n.y + 112, 10, `${c.breaker} A`, { anchor: 'middle', layer: 'TEXT' })
      line(cx, n.y + 120, cx, n.y + 150, 'CABLE')
      text(cx, n.y + 166, 10, truncate(c.input.name || `Q${i + 1}`, 16), { anchor: 'middle', layer: 'TEXT' })
      const phase = c.input.phases === 3 ? '3F' : (c.phaseAssignment || '1F')
      text(cx, n.y + 180, 9, `${c.conductor.phase}mm² · ${phase} · ${c.input.power_kw}kW · ${c.cascadeRegulation ?? c.regulationUpstream ?? 0}%`, { anchor: 'middle', layer: 'SUBTEXT' })
    })
  }

  const drawFeeder = (parent, child) => {
    const startX = parent.x + parent.width / 2
    const parentBusY = parent.y + 74
    const midY = parent.y + 190
    const childTop = child.y + 14
    line(startX, parentBusY, startX, midY, 'CABLE')
    line(startX, midY, child.x, midY, 'CABLE')
    line(child.x, midY, child.x, childTop, 'CABLE')
    const label = `${parent.panel?.feeder?.breaker ?? '—'} A · ${parent.panel?.feeder?.size ?? '—'} mm² · ${round(parent.feederReg, 2)}%`
    text((startX + child.x) / 2, midY - 4, 9, label, { anchor: 'middle', layer: 'SUBTEXT' })
  }

  const visit = (n) => {
    drawBoard(n)
    n.children.forEach((c) => { drawFeeder(n, c); visit(c) })
  }
  roots.forEach((r) => {
    circle(r.x, r.y - 30, 16, {})
    text(r.x, r.y - 26, 10, 'RED', { anchor: 'middle', layer: 'TEXT' })
    text(r.x, r.y - 52, 10, `Icc ${r.system.source_icc_ka} kA`, { anchor: 'middle', layer: 'SUBTEXT' })
    line(r.x, r.y - 14, r.x, r.y + 14, 'CABLE')
    visit(r)
  })

  const maxDepth = network.maxDepth ?? roots.reduce((m, r) => Math.max(m, maxDepthOf(r)), 0)
  const height = TOP + maxDepth * ROW_H + 210

  return { width: Math.max(totalWidth, 640), height, items, nodes: network.nodes }
}

function maxDepthOf(n) {
  if (!n.children?.length) return n.depth ?? 0
  return n.children.reduce((m, c) => Math.max(m, maxDepthOf(c)), n.depth ?? 0)
}

function truncate(s, n) {
  const str = String(s ?? '')
  return str.length > n ? `${str.slice(0, n - 1)}…` : str
}

// ─────────────────────────────────────────────────────────────────────────────
// Listado de bornes (bornero) por tablero
// ─────────────────────────────────────────────────────────────────────────────
export function buildTerminalSchedule(network) {
  const byId = network.index
  const rows = []
  const wiresOf = (phases) => (phases === 3 ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L', 'N', 'PE'])

  network.nodes.forEach((n) => {
    const inWires = wiresOf(n.system.phases)
    const parent = n.parentId ? byId.get(n.parentId) : null
    rows.push({
      board: n.tag,
      folio: n.folio,
      strip: `${n.tag}-X0`,
      direction: 'IN',
      ref: parent ? `Desde ${parent.tag} (${parent.name})` : 'Acometida',
      terminals: inWires.map((w, i) => `${i + 1}:${w}`),
      cable: n.panel ? `${n.panel.feeder.size} mm²` : '—',
      breaker: n.panel?.feeder?.breaker ?? '—',
    })

    ;(n.panel?.circuits ?? []).forEach((c, i) => {
      const wires = wiresOf(c.input.phases)
      rows.push({
        board: n.tag,
        folio: n.folio,
        strip: `${n.tag}-X${i + 1}`,
        direction: 'OUT',
        ref: `Q${i + 1} ${c.input.name}`,
        terminals: wires.map((w, k) => `${k + 1}:${w}`),
        cable: `${c.conductor.phase} mm²`,
        pe: c.conductor.pe,
        breaker: c.breaker,
      })
    })
  })
  return rows
}

export function scheduleToCsv(rows) {
  const head = ['Tablero', 'Folio', 'Bornera', 'Dir', 'Referencia', 'Bornes', 'Cable', 'PE', 'In (A)']
  const body = rows.map((r) => [
    r.board, r.folio, r.strip, r.direction, r.ref,
    r.terminals.join(' '), r.cable, r.pe ?? '', r.breaker,
  ])
  return [head, ...body]
    .map((row) => row.map((c) => `"${String(c ?? '').replaceAll('"', '""').replaceAll(';', ',')}"`).join(';'))
    .join('\r\n')
}

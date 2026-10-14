import { computePanel } from '@/lib/panelCalc'

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo de red multinivel: tableros enlazados por parent_id
// La Icc en barras del tablero padre alimenta al hijo (cascada).
// ─────────────────────────────────────────────────────────────────────────────
const round = (v, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

export function computeNetwork(projects = [], opts = {}) {
  const byId = new Map(projects.map((p) => [p.id, p]))

  const childrenOf = new Map()
  projects.forEach((p) => {
    const pid = p.parent_id && byId.has(p.parent_id) ? p.parent_id : null
    if (!pid) return
    if (!childrenOf.has(pid)) childrenOf.set(pid, [])
    childrenOf.get(pid).push(p.id)
  })

  const roots = projects.filter((p) => !(p.parent_id && byId.has(p.parent_id) && p.parent_id !== p.id))
  const nodes = []
  const index = new Map()

  const visit = (p, parentNode, depth) => {
    if (!p || index.has(p.id) || depth > 64) return null
    const system = parentNode
      ? { ...p.system, source_icc_ka: parentNode.busIcc }
      : p.system

    let panel = null
    try { panel = computePanel(system, p.circuits ?? [], { useProfiles: opts.useProfiles }) } catch { panel = null }

    const busIcc = panel?.isccBoard?.isccKa ?? Number(system.source_icc_ka) ?? 0
    const feederReg = panel?.feeder?.regulation ?? 0
    const accumReg = round((parentNode?.accumReg ?? 0) + feederReg, 2)

    const node = {
      id: p.id,
      name: p.name || '(sin nombre)',
      parentId: parentNode?.id ?? null,
      project: p,
      system,
      panel,
      busIcc: round(busIcc, 2),
      feederReg: round(feederReg, 2),
      accumReg,
      depth,
      children: [],
    }
    index.set(p.id, node)
    nodes.push(node)

    ;(childrenOf.get(p.id) ?? []).forEach((kid) => {
      const child = visit(byId.get(kid), node, depth + 1)
      if (child) node.children.push(child)
    })
    return node
  }

  roots.forEach((r) => visit(r, null, 0))

  // Regulación acumulada hasta cada carga
  nodes.forEach((n) => {
    ;(n.panel?.circuits ?? []).forEach((c) => {
      c.cascadeRegulation = round(n.accumReg + c.regulation, 2)
    })
  })

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  return { nodes, index, roots: nodes.filter((n) => !n.parentId), maxDepth }
}

// Evita crear un lazo al reasignar el tablero aguas arriba
export function wouldCycle(projects, id, parentId) {
  if (!parentId) return false
  if (id === parentId) return true
  const byId = new Map(projects.map((p) => [p.id, p]))
  let cur = byId.get(parentId)
  const seen = new Set()
  while (cur) {
    if (cur.id === id) return true
    if (seen.has(cur.id)) return false
    seen.add(cur.id)
    cur = cur.parent_id ? byId.get(cur.parent_id) : null
  }
  return false
}

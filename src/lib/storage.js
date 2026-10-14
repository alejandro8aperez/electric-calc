// ─────────────────────────────────────────────────────────────────────────────
// Persistencia de proyectos (localStorage) — modelo v2
// v2: { id, name, description, system, circuits[] }
// v1 (legado): { id, name, power_kw, voltage, ... } → se migra a v2
// ─────────────────────────────────────────────────────────────────────────────
const KEY = 'electric-calc-projects'

export const DEFAULT_SYSTEM = {
  voltage: 220,
  phases: 3,
  frequency: 60,
  power_factor: 0.9,
  ambient_temp: 30,
  conductor_material: 'copper',
  insulation: 'PVC',
  method: 'C',
  grouping_count: 3,
  source_icc_ka: 10,
  fault_duration_s: 0.5,
  feeder_length_m: 20,
}

export function emptyCircuit(overrides = {}) {
  return {
    id: uid(),
    name: 'Circuito nuevo',
    load_type: 'general',
    power_kw: 5,
    voltage: null,
    phases: 1,
    phase: 'L1',
    power_factor: null,
    length_m: 20,
    conductor_material: null,
    insulation: null,
    installation_method: null,
    grouping_count: null,
    continuous: null,
    demand_factor: null,
    ...overrides,
  }
}

export function newProject(overrides = {}) {
  return {
    id: uid(),
    name: '',
    description: '',
    parent_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    system: { ...DEFAULT_SYSTEM },
    circuits: [emptyCircuit({ name: 'Alumbrado', load_type: 'lighting', power_kw: 3, phases: 1 })],
    ...overrides,
  }
}

function uid() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random())
}

export function listProjects() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY)) ?? []
    return raw.map(migrate)
  } catch {
    return []
  }
}

export function saveProject(project) {
  const all = listProjects()
  const now = new Date().toISOString()
  const record = { ...project, updated_at: now }
  if (project.id) {
    const idx = all.findIndex((p) => p.id === project.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...record }
    else all.unshift(record)
  } else {
    record.id = uid()
    record.created_at = now
    all.unshift(record)
  }
  localStorage.setItem(KEY, JSON.stringify(all))
  return record
}

export function getProject(id) {
  return listProjects().find((p) => p.id === id) ?? null
}

export function setProjectParent(id, parentId) {
  const p = getProject(id)
  if (!p) return null
  return saveProject({ ...p, parent_id: parentId || null })
}

export function deleteProject(id) {
  const all = listProjects().filter((p) => p.id !== id)
  localStorage.setItem(KEY, JSON.stringify(all))
  return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Migración v1 → v2
// ─────────────────────────────────────────────────────────────────────────────
function migrate(p) {
  if (p && Array.isArray(p.circuits) && p.system) return p
  // Proyecto v1 (un solo circuito)
  return {
    id: p.id ?? uid(),
    name: p.name ?? 'Proyecto migrado',
    description: p.description ?? '',
    created_at: p.created_at ?? new Date().toISOString(),
    updated_at: p.updated_at ?? new Date().toISOString(),
    system: {
      ...DEFAULT_SYSTEM,
      voltage: p.voltage ?? DEFAULT_SYSTEM.voltage,
      phases: p.phases ?? DEFAULT_SYSTEM.phases,
      power_factor: p.power_factor ?? DEFAULT_SYSTEM.power_factor,
      ambient_temp: p.ambient_temp ?? DEFAULT_SYSTEM.ambient_temp,
      conductor_material: p.conductor_material ?? DEFAULT_SYSTEM.conductor_material,
      installation_method: p.installation_method ?? DEFAULT_SYSTEM.method,
      source_icc_ka: p.fault_current_origin_ka ?? DEFAULT_SYSTEM.source_icc_ka,
      fault_duration_s: p.fault_duration_s ?? DEFAULT_SYSTEM.fault_duration_s,
    },
    circuits: [
      emptyCircuit({
        name: p.name ?? 'Circuito 1',
        power_kw: p.power_kw ?? 10,
        voltage: p.voltage ?? null,
        phases: p.phases ?? 1,
        power_factor: p.power_factor ?? null,
        length_m: p.length_m ?? 30,
        conductor_material: p.conductor_material ?? null,
        installation_method: p.installation_method ?? null,
      }),
    ],
    migrated_from: 'v1',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportar / importar (respaldo JSON)
// ─────────────────────────────────────────────────────────────────────────────
export function exportProjects() {
  return JSON.stringify(listProjects(), null, 2)
}

export function importProjects(json) {
  try {
    const data = JSON.parse(json)
    if (!Array.isArray(data)) return false
    localStorage.setItem(KEY, JSON.stringify(data.map(migrate)))
    return true
  } catch {
    return false
  }
}

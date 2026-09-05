const KEY = 'electric-calc-projects'

export function listProjects() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? []
  } catch {
    return []
  }
}

export function saveProject(project) {
  const all = listProjects()
  if (project.id) {
    const idx = all.findIndex((p) => p.id === project.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...project }
  } else {
    project.id = crypto.randomUUID?.() ?? String(Date.now())
    all.unshift(project)
  }
  localStorage.setItem(KEY, JSON.stringify(all))
  return project
}

export function getProject(id) {
  return listProjects().find((p) => p.id === id) ?? null
}
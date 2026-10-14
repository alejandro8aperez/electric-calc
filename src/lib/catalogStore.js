import { buildBuiltinCatalog, DEVICE_FIELDS } from '@/lib/catalogData'
import { toCsv, fromCsv } from '@/lib/csv'

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo persistente (localStorage) con importación/exportación CSV y JSON
// ─────────────────────────────────────────────────────────────────────────────
const KEY = 'electric-calc-catalog'
const CURRENCY_KEY = 'electric-calc-currency'

const NUMERIC = new Set([
  'rating_A', 'poles', 'breaking_capacity_kA', 'ics_kA', 'sensitivity_mA',
  'capacity_modules', 'width_modules', 'price',
])

let counter = 0
function uid() {
  counter += 1
  return `dev-${Date.now().toString(36)}-${counter}`
}

export function loadCatalog() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const builtin = buildBuiltinCatalog()
      localStorage.setItem(KEY, JSON.stringify(builtin))
      return builtin
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : buildBuiltinCatalog()
  } catch {
    return buildBuiltinCatalog()
  }
}

export function saveCatalog(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* noop */ }
  return list
}

export function resetCatalog() {
  const builtin = buildBuiltinCatalog()
  saveCatalog(builtin)
  return builtin
}

export function upsertDevice(list, device) {
  const withId = { ...coerce(device), id: device.id || uid() }
  const idx = list.findIndex((d) => d.id === withId.id)
  const next = idx >= 0 ? list.map((d, i) => (i === idx ? withId : d)) : [withId, ...list]
  return saveCatalog(next)
}

export function removeDevice(list, id) {
  return saveCatalog(list.filter((d) => d.id !== id))
}

export function getCurrency() {
  try { return localStorage.getItem(CURRENCY_KEY) || 'COP' } catch { return 'COP' }
}

export function setCurrency(code) {
  try { localStorage.setItem(CURRENCY_KEY, code) } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportar / importar
// ─────────────────────────────────────────────────────────────────────────────
export function exportCatalogCsv(list) {
  const columns = DEVICE_FIELDS.filter((c) => c !== 'id')
  return toCsv(list, columns, { delimiter: ';' })
}

export function importCatalogCsv(text, currentList, { merge = true } = {}) {
  const rows = fromCsv(text)
  const parsed = rows.map((r) => coerce(mapAliases(r))).filter((d) => d.family && d.reference)
  const next = (merge ? [...parsed, ...currentList] : parsed).map((d) => ({ ...d, id: d.id || uid() }))
  return saveCatalog(next)
}

export function exportCatalogJson(list) {
  return JSON.stringify(list, null, 2)
}

export function importCatalogJson(text, { merge = true } = {}) {
  try {
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return loadCatalog()
    const parsed = data.map((d) => ({ ...coerce(d), id: d.id || uid() }))
    return saveCatalog(merge ? [...parsed, ...loadCatalog()] : parsed)
  } catch {
    return loadCatalog()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────
// Acepta nombres de columna en español/inglés
const ALIASES = {
  familia: 'family', fabricante: 'manufacturer', serie: 'series', referencia: 'reference',
  descripcion: 'description', corriente: 'rating_A', polos: 'poles', curva: 'curve',
  poder_corte: 'breaking_capacity_kA', sensibilidad: 'sensitivity_mA', tipo: 'rcd_type',
  calibre_fusible: 'fuse_size', modulos: 'capacity_modules', ancho: 'width_modules',
  precio: 'price', unidad: 'unit', moneda: 'currency', montaje: 'mount',
}

function mapAliases(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    const key = ALIASES[k.trim().toLowerCase()] ?? k.trim()
    out[key] = v
  }
  return out
}

function coerce(d) {
  const out = { ...d }
  for (const k of Object.keys(out)) {
    if (NUMERIC.has(k)) {
      const n = Number(String(out[k]).replace(',', '.'))
      out[k] = Number.isFinite(n) ? n : undefined
    }
    if (out[k] === '' || out[k] === undefined) delete out[k]
  }
  return out
}

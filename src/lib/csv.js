// ─────────────────────────────────────────────────────────────────────────────
// CSV — utilidades ligeras (compatible con Excel)
// Exportación con delimitador configurable y BOM UTF-8 para acentos.
// Importación con detección automática de delimitador.
// ─────────────────────────────────────────────────────────────────────────────

const BOM = '\uFEFF'

// Escapa un valor para CSV
function escapeCell(value, delimiter) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// Serializa filas a CSV. rows: array de arrays u objetos con columns.
export function toCsv(rows, columns, { delimiter = ';', includeHeader = true } = {}) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : [])
  const useObjects = rows.length && !Array.isArray(rows[0])
  const head = includeHeader ? [cols.map((c) => escapeCell(c, delimiter)).join(delimiter)] : []
  const body = rows.map((r) => {
    const values = useObjects ? cols.map((c) => r[c]) : r
    return values.map((v) => escapeCell(v, delimiter)).join(delimiter)
  })
  return BOM + [...head, ...body].join('\r\n')
}

// Detecta el delimitador más probable
function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n')
  const candidates = [';', ',', '\t', '|']
  let best = ';'
  let bestCount = -1
  for (const d of candidates) {
    const count = sample.split(d).length - 1
    if (count > bestCount) { bestCount = count; best = d }
  }
  return best
}

// Parsea CSV a array de objetos (usa la primera fila como encabezado)
export function fromCsv(text, { delimiter } = {}) {
  let src = text.replace(/^\uFEFF/, '')
  const delim = delimiter ?? detectDelimiter(src)

  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else { inQuotes = false }
      } else cell += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(cell); cell = ''
    } else if (ch === '\n') {
      row.push(cell); rows.push(row); row = []; cell = ''
    } else if (ch === '\r') {
      // ignorar
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (!nonEmpty.length) return []
  const header = nonEmpty[0].map((h) => h.trim())
  return nonEmpty.slice(1).map((r) => {
    const obj = {}
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
}

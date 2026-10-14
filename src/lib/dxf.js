// ─────────────────────────────────────────────────────────────────────────────
// Exportación DXF (R12 / AC1009, ASCII) de un esquema unifilar
// Entidades soportadas: LINE, TEXT, CIRCLE. Librerías por color ACI.
// ─────────────────────────────────────────────────────────────────────────────
import { LAYER_COLOR } from '@/lib/schematic'

const LAYER_ACI = {
  BUS: 1, CABLE: 8, DEVICE: 7, SOURCE: 2, TEXT: 7, SUBTEXT: 8,
}

function esc(s) {
  return String(s ?? '').replace(/\r?\n/g, ' ').replace(/[^\x20-\x7E]/g, '?')
}

// En DXF el eje Y apunta hacia arriba: invertimos respecto al SVG
const fy = (y) => -y

export function schematicToDxf(schematic, { title = 'Esquema unifilar' } = {}) {
  const out = []
  const add = (...v) => out.push(...v)

  // HEADER
  add('0', 'SECTION', '2', 'HEADER')
  add('9', '$ACADVER', '1', 'AC1009')
  add('9', '$INSUNITS', '70', '4')
  add('9', '$EXTMIN', '10', '0.0', '20', '0.0')
  add('9', '$EXTMAX', '10', String(schematic.width), '20', String(-schematic.height))
  add('0', 'ENDSEC')

  // TABLES → LAYER
  const layers = Object.keys(LAYER_ACI)
  add('0', 'SECTION', '2', 'TABLES')
  add('0', 'TABLE', '2', 'LAYER', '70', String(layers.length + 1))
  add('0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS')
  layers.forEach((name) => {
    add('0', 'LAYER', '2', name, '70', '0', '62', String(LAYER_ACI[name] ?? 7), '6', 'CONTINUOUS')
  })
  add('0', 'ENDTAB', '0', 'ENDSEC')

  // ENTITIES
  add('0', 'SECTION', '2', 'ENTITIES')

  const line = (x1, y1, x2, y2, layer) => {
    add('0', 'LINE', '8', layer, '10', fmt(x1), '20', fmt(fy(y1)), '11', fmt(x2), '21', fmt(fy(y2)))
  }
  const circle = (cx, cy, r, layer) => {
    add('0', 'CIRCLE', '8', layer, '10', fmt(cx), '20', fmt(fy(cy)), '40', fmt(r))
  }
  const textEnt = (x, y, h, str, layer, anchor) => {
    const just = anchor === 'middle' ? '1' : anchor === 'end' ? '2' : '0'
    add('0', 'TEXT', '8', layer, '10', fmt(x), '20', fmt(fy(y)), '30', '0.0',
      '40', fmt(h), '1', esc(str), '72', just)
    if (just !== '0') {
      add('11', fmt(x), '21', fmt(fy(y)), '31', '0.0')
    }
  }

  for (const item of schematic.items) {
    const layer = item.layer ?? 'CABLE'
    if (item.type === 'line') {
      line(item.x1, item.y1, item.x2, item.y2, layer)
    } else if (item.type === 'rect') {
      const { x, y, w, h } = item
      line(x, y, x + w, y, layer)
      line(x + w, y, x + w, y + h, layer)
      line(x + w, y + h, x, y + h, layer)
      line(x, y + h, x, y, layer)
    } else if (item.type === 'circle') {
      circle(item.cx, item.cy, item.r, layer)
    } else if (item.type === 'text') {
      textEnt(item.x, item.y, item.size, item.text, layer, item.anchor)
    }
  }

  // Rótulo del plano
  textEnt(20, 14, 10, title, 'TEXT', 'start')

  add('0', 'ENDSEC', '0', 'EOF')
  return out.join('\r\n')
}

function fmt(v) {
  return Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : '0.0'
}

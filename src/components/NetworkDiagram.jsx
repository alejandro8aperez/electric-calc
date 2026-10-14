import React from 'react'
import { LAYER_COLOR } from '@/lib/schematic'

// Render SVG de las primitivas generadas en schematic.js (compartidas con DXF)
export default function NetworkDiagram({ schematic, svgRef }) {
  if (!schematic) return null
  const { width, height, items } = schematic

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 overflow-x-auto">
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ minWidth: width }}
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
      >
        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
        {items.map((it, i) => renderItem(it, i))}
      </svg>
    </div>
  )
}

function renderItem(it, i) {
  const color = it.color ?? LAYER_COLOR[it.layer] ?? '#0f172a'
  switch (it.type) {
    case 'line':
      return (
        <line key={i} x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2}
          stroke={color} strokeWidth={it.layer === 'BUS' ? 4 : 1.5}
          strokeLinecap={it.layer === 'BUS' ? 'round' : 'butt'} />
      )
    case 'rect':
      return <rect key={i} x={it.x} y={it.y} width={it.w} height={it.h} rx={4} fill={it.fill} stroke={it.stroke} strokeWidth={1} />
    case 'circle':
      return <circle key={i} cx={it.cx} cy={it.cy} r={it.r} fill={it.fill} stroke={it.stroke} strokeWidth={2} />
    case 'text':
      return (
        <text key={i} x={it.x} y={it.y} fontSize={it.size} fill={color} textAnchor={it.anchor === 'middle' ? 'middle' : it.anchor === 'end' ? 'end' : 'start'}>
          {it.text}
        </text>
      )
    default:
      return null
  }
}

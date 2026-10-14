import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Diagrama unifilar (SVG) del tablero: fuente → general → barraje → circuitos
// ─────────────────────────────────────────────────────────────────────────────
export default function OneLineDiagram({ panel, title = 'Diagrama unifilar' }) {
  if (!panel) return null
  const circuits = panel.circuits ?? []
  const rows = circuits.length
  const rowH = 46
  const top = 96
  const height = top + Math.max(rows, 1) * rowH + 20
  const width = 760
  const busX = 260
  const branchStart = busX
  const labelX = branchStart + 24

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
          {/* Fuente */}
          <circle cx="80" cy="40" r="18" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
          <text x="80" y="45" textAnchor="middle" fontSize="11" fill="#92400e">MT</text>
          <text x="80" y="76" textAnchor="middle" fontSize="11" fill="#334155">{panel.system.source_icc_ka} kA</text>

          {/* Línea a interruptor general */}
          <line x1="80" y1="58" x2="80" y2={top - 40} stroke="#334155" strokeWidth="2" />
          <line x1="80" y1={top - 40} x2={busX} y2={top - 40} stroke="#334155" strokeWidth="2" />

          {/* Interruptor general */}
          <rect x={busX - 26} y={top - 56} width="52" height="32" rx="6" fill="#0f172a" />
          <text x={busX} y={top - 36} textAnchor="middle" fontSize="11" fill="#fbbf24">{panel.mainBreaker} A</text>
          <line x1={busX} y1={top - 24} x2={busX} y2={top} stroke="#334155" strokeWidth="2" />

          {/* Barraje */}
          <line x1={busX} y1={top} x2={busX} y2={top + rows * rowH} stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
          <text x={busX - 40} y={top - 8} fontSize="11" fill="#64748b">{panel.busbar} A</text>
          <text x={busX - 40} y={top + 12} fontSize="10" fill="#64748b">{panel.isccBoard?.isccKa} kA</text>

          {/* Circuitos */}
          {circuits.map((c, i) => {
            const y = top + i * rowH
            const label = c.input.name || `C${i + 1}`
            return (
              <g key={i}>
                <line x1={busX} y1={y} x2={branchStart + 10} y2={y} stroke="#334155" strokeWidth="1.5" />
                <rect x={branchStart + 10} y={y - 11} width="44" height="22" rx="4" fill="#f1f5f9" stroke="#94a3b8" />
                <text x={branchStart + 32} y={y + 4} textAnchor="middle" fontSize="10" fill="#0f172a">{c.breaker} A</text>
                <line x1={branchStart + 54} y1={y} x2={labelX} y2={y} stroke="#334155" strokeWidth="1.5" />
                <text x={labelX} y={y - 4} fontSize="11" fill="#0f172a">{truncate(label, 30)}</text>
                <text x={labelX} y={y + 10} fontSize="10" fill="#64748b">
                  {c.conductor.phase} mm² · {c.input.phases === 3 ? '3F' : c.phaseAssignment || '1F'} · {c.input.power_kw} kW · {c.regulation} %
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

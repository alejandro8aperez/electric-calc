import React from 'react'
import { Zap, ShieldAlert } from 'lucide-react'

export default function ShortCircuitResults({ data }) {
  if (!data) return null
  const items = [
    { label: 'Icc en origen', value: `${data.iscc_origin_ka} kA` },
    { label: 'Icc en carga', value: `${data.iscc_load_ka} kA` },
    { label: 'Capacidad de ruptura requerida', value: `${data.breaking_capacity_required_kA} kA` },
  ]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-900">Cortocircuito</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">{it.label}</div>
            <div className="text-base font-semibold text-slate-900 mt-0.5">{it.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
        <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-500" />
        <span>{data.min_conductor_ka}</span>
      </div>
    </div>
  )
}

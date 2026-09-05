import React from 'react'
import { ShieldCheck } from 'lucide-react'

export default function GroundingResults({ data }) {
  if (!data) return null
  const items = [
    { label: 'Conductor de electrodo (NEC 250.66)', value: data.groundingElectrodeConductor },
    { label: 'Conductor mínimo aéreo', value: data.minOverheadConductor },
  ]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <h2 className="text-sm font-semibold text-slate-900">Puesta a tierra</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">{it.label}</div>
            <div className="text-base font-semibold text-slate-900 mt-0.5">{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
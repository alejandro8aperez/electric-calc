import React from 'react'
import { HardHat } from 'lucide-react'

export default function ConduitResults({ data }) {
  if (!data) return null
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <HardHat className="w-4 h-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-slate-900">Tubería / Conduit</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="text-[11px] text-slate-500">Tubería sugerida</div>
          <div className="text-base font-semibold text-slate-900 mt-0.5">{data.selected.trade}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] text-slate-500">Conductor (mm²)</div>
          <div className="text-base font-semibold text-slate-900 mt-0.5">{data.selected.size}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] text-slate-500">Ocupación</div>
          <div className="text-base font-semibold text-slate-900 mt-0.5">{data.fill_percent}%</div>
        </div>
      </div>
    </div>
  )
}
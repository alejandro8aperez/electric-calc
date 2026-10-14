import React from 'react'

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export function SummaryCard({ label, value, sub, accent = 'slate' }) {
  const accents = {
    amber: 'border-amber-200 bg-amber-50',
    slate: 'border-slate-200 bg-slate-50',
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50',
    emerald: 'border-emerald-200 bg-emerald-50',
  }
  return (
    <div className={`rounded-lg border p-3 ${accents[accent] ?? accents.slate}`}>
      <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
      <div className="text-base font-semibold text-slate-900 mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

export function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700 text-right">{value}</span>
    </div>
  )
}

export function StatusPill({ status, labels }) {
  const map = {
    compliant: { label: labels?.compliant ?? 'OK', cls: 'bg-emerald-100 text-emerald-700' },
    review: { label: labels?.review ?? 'Revisar', cls: 'bg-amber-100 text-amber-700' },
    non_compliant: { label: labels?.nonCompliant ?? 'No cumple', cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] ?? map.review
  return <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

export function Panel({ title, children, actions }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export default StatusPill

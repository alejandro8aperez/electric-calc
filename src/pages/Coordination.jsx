import React, { useState, useEffect } from 'react'
import { selectInterruptingCapacity, checkSelectivity } from '@/lib/coordinationCalc'
import { BREAKER_CURVE_TYPES } from '@/lib/electricalData'
import { Shield, CheckCircle2, XCircle } from 'lucide-react'

export default function Coordination() {
  const [upstream, setUpstream] = useState(100)
  const [downstream, setDownstream] = useState(40)
  const [icc, setIcc] = useState(15)
  const [curve, setCurve] = useState('C')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (upstream > 0 && downstream > 0 && icc > 0) {
      setResult({
        icRating: selectInterruptingCapacity(icc),
        selectivity: checkSelectivity(upstream, downstream, icc, curve),
      })
    } else {
      setResult(null)
    }
  }, [upstream, downstream, icc, curve])

  const sel = result?.selectivity

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Coordinación de protecciones</h1>
        <p className="text-sm text-slate-500 mt-1">Selectividad y capacidad de interrupción · NEC 240 / IEC 60947-2</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Datos de entrada</h2>
          <div className="space-y-4">
            <Field label="Protección aguas arriba (A)">
              <input type="number" value={upstream} onChange={(e) => setUpstream(+e.target.value)} className="input" />
            </Field>
            <Field label="Protección aguas abajo (A)">
              <input type="number" value={downstream} onChange={(e) => setDownstream(+e.target.value)} className="input" />
            </Field>
            <Field label="Icc disponible (kA)">
              <input type="number" value={icc} onChange={(e) => setIcc(+e.target.value)} className="input" />
            </Field>
            <Field label="Curva de disparo">
              <select value={curve} onChange={(e) => setCurve(e.target.value)} className="input">
                {BREAKER_CURVE_TYPES.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.tripRange})</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          {result && (
            <>
              <div className={`rounded-xl border p-5 ${sel.selective ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {sel.selective ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                  <span className={`text-xs font-medium ${sel.selective ? 'text-emerald-700' : 'text-red-700'}`}>
                    {sel.selective ? 'Selectividad asegurada' : 'Sin selectividad'}
                  </span>
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  La protección aguas abajo dispara antes que la de aguas arriba
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">Resultados</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Card label="Capacidad de ruptura" value={`${result.icRating} kA`} accent="amber" />
                  <Card label="Ratio de protecciones" value={`${sel.ratio.toFixed(2)}×`} />
                  <Card label="Disparo aguas arriba" value={sel.upstreamTrip ? `${sel.upstreamTrip} s` : 'No dispara'} />
                  <Card label="Disparo aguas abajo" value={sel.downstreamTrip ? `${sel.downstreamTrip} s` : 'No dispara'} />
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  Selectividad recomendada: ratio ≥ 1.6× entre protecciones. Capacidad de ruptura ≥ Icc disponible.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">Curvas de disparo</h2>
                <div className="space-y-2">
                  {BREAKER_CURVE_TYPES.map((c) => (
                    <div key={c.id} className={`rounded-lg px-4 py-2.5 flex items-center gap-3 ${curve === c.id ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
                      <Shield className={`w-4 h-4 ${curve === c.id ? 'text-amber-400' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-medium">{c.label}</div>
                        <div className={`text-xs ${curve === c.id ? 'text-slate-300' : 'text-slate-500'}`}>{c.tripRange} · {c.useCase}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Card({ label, value, accent }) {
  const a = { amber: 'border-amber-200 bg-amber-50', slate: 'border-slate-200 bg-slate-50' }
  return (
    <div className={`rounded-lg border p-3 ${a[accent] ?? a.slate}`}>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  )
}
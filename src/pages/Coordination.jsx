import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { selectInterruptingCapacity, checkSelectivity, checkCascade, checkFiliation, selectivityRatio } from '@/lib/coordinationCalc'
import { BREAKER_CURVE_TYPES } from '@/lib/electricalData'
import { manufacturerList, seriesOptions } from '@/lib/manufacturerData'
import { useI18n } from '@/lib/i18n'
import { Field, SummaryCard, Row, Panel as Card } from '@/components/ui/kit'

export default function Coordination() {
  const { t } = useI18n()
  const [upstream, setUpstream] = useState({ rating: 250, curve: 'C', technology: 'MCCB' })
  const [downstream, setDownstream] = useState({ rating: 100, curve: 'C', technology: 'MCB' })
  const [icc, setIcc] = useState(15)

  const result = useMemo(() => {
    if (upstream.rating <= 0 || downstream.rating <= 0 || icc <= 0) return null
    return {
      icRating: selectInterruptingCapacity(icc),
      selectivity: checkSelectivity(upstream, downstream, icc),
      filiation: checkFiliation(upstream, downstream, icc),
      cascade: checkCascade([
        { name: 'Aguas arriba', ...upstream },
        { name: 'Aguas abajo', ...downstream },
      ], icc),
    }
  }, [upstream, downstream, icc])

  const sel = result?.selectivity
  const fil = result?.filiation

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t('nav.coordination')}</h1>
        <p className="text-sm text-slate-500 mt-1">Selectividad y capacidad de interrupción · NEC 240 / IEC 60947-2</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('common.inputs')}>
          <div className="space-y-4">
            <DeviceInput label="Protección aguas arriba" device={upstream} onChange={setUpstream} t={t} />
            <DeviceInput label="Protección aguas abajo" device={downstream} onChange={setDownstream} t={t} />
            <Field label={`${t('common.icc')} (kA)`}>
              <input type="number" className="input" value={icc} onChange={(e) => setIcc(+e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="space-y-4">
          {result && (
            <>
              <div className={`rounded-xl border p-5 ${sel.selective ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {sel.selective ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                  <span className={`text-sm font-medium ${sel.selective ? 'text-emerald-700' : 'text-red-700'}`}>
                    {sel.selective ? 'Selectividad asegurada' : 'Sin selectividad garantizada'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Ratio de calibres {sel.ratio}× · límite selectivo hasta {sel.selectiveUpToKa} kA
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {sel.source === 'manufacturer' ? `Tabla de fabricante · ${sel.ruleBasis ?? ''} (${sel.rule})` : 'Cálculo algorítmico (sin tabla de fabricante)'}
                </p>
              </div>

              <Card title={t('common.results')}>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label="Capacidad de ruptura" value={`${result.icRating} kA`} accent="amber" />
                  <SummaryCard label="Icc disponible" value={`${icc} kA`} accent="red" />
                  <SummaryCard label="Disparo aguas arriba" value={sel.upstreamTrip ? `${sel.upstreamTrip} s` : 'No dispara'} />
                  <SummaryCard label="Disparo aguas abajo" value={sel.downstreamTrip ? `${sel.downstreamTrip} s` : 'No dispara'} />
                </div>
                <div className="mt-3 text-xs text-slate-600 space-y-1.5">
                  <Row label="Selectividad por corriente" value={sel.currentSelective ? 'Sí' : 'No'} />
                  <Row label="Selectividad magnética" value={sel.magneticSelective ? 'Sí' : 'No'} />
                  <Row label="Selectividad temporal" value={sel.timeSelective ? 'Sí' : 'No'} />
                  <Row label="Umbral magnético aguas arriba" value={`${sel.upMagneticA} A`} />
                  <Row label="Umbral magnético aguas abajo" value={`${sel.downMagneticA} A`} />
                </div>
              </Card>

              <Card title="Curvas tiempo-corriente">
                <TccChart devices={[upstream, downstream]} iccKa={icc} />
              </Card>

              {fil && (
                <Card title="Filiación / cascada (backup)">
                  <div className={`text-xs rounded-lg p-3 ${fil.allowable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                    {fil.message}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{fil.note}</p>
                  {fil.source === 'manufacturer' && (
                    <p className="text-[10px] text-emerald-600 mt-1">Tabla de fabricante · {fil.basis}{fil.boostedIcu ? ` · Icu aguas abajo hasta ${fil.boostedIcu} kA` : ''}</p>
                  )}
                  <div className="mt-3 text-xs text-slate-600 space-y-1.5">
                    <Row label="Ratio de calibres" value={`${fil.ratio}×`} />
                    <Row label="Filiación por corriente" value={fil.currentBackup ? 'Sí' : 'No'} />
                    <Row label="Filiación por umbral magnético" value={fil.magneticBackup ? 'Sí' : 'No'} />
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DeviceInput({ label, device, onChange, t }) {
  const tech = device.technology ?? 'MCB'
  const fam = tech === 'FUSE' ? null : tech
  const series = fam ? seriesOptions(fam, device.manufacturer) : []
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="grid grid-cols-3 gap-3">
        <input type="number" className="input" value={device.rating}
          onChange={(e) => onChange({ ...device, rating: +e.target.value })} />
        <select className="input" value={device.curve}
          onChange={(e) => onChange({ ...device, curve: e.target.value })}>
          {BREAKER_CURVE_TYPES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="input" value={tech}
          onChange={(e) => onChange({ ...device, technology: e.target.value, manufacturer: '', series: '' })}>
          <option value="MCB">MCB</option>
          <option value="MCCB">MCCB</option>
          <option value="FUSE">Fusible</option>
        </select>
      </div>
      {fam && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <select className="input" value={device.manufacturer ?? ''}
            onChange={(e) => onChange({ ...device, manufacturer: e.target.value, series: '' })}>
            <option value="">{t('coordination.anyManufacturer')}</option>
            {manufacturerList().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input" value={device.series ?? ''}
            onChange={(e) => onChange({ ...device, series: e.target.value })}>
            <option value="">{t('coordination.anySeries')}</option>
            {series.map((s) => <option key={s.series} value={s.series}>{s.series} · {s.icu} kA</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// Gráfico log-log simplificado de curvas de disparo
function TccChart({ devices, iccKa }) {
  const W = 460
  const H = 260
  const margin = 40
  const decades = { min: 0.01, max: 100 } // s
  const currentMin = 1
  const currentMax = Math.max(1000, iccKa * 1000 * 1.5)

  const xOf = (i) => margin + (Math.log10(i) - Math.log10(currentMin)) / (Math.log10(currentMax) - Math.log10(currentMin)) * (W - 2 * margin)
  const yOf = (s) => H - margin - (Math.log10(s) - Math.log10(decades.min)) / (Math.log10(decades.max) - Math.log10(decades.min)) * (H - 2 * margin)

  const curvePoints = (device, color) => {
    const magnetic = BREAKER_CURVE_TYPES.find((c) => c.id === device.curve)?.magnetic ?? 7.5
    const pts = []
    for (let i = 1; i <= 30; i++) {
      const mult = magnetic * i / 30
      const current = mult * device.rating
      const tt = mult < 1.13 ? 1.5 / Math.pow(mult, 2) : 0.01
      pts.push([xOf(current), yOf(Math.min(Math.max(tt, decades.min), decades.max))])
    }
    // tramo instantáneo
    pts.push([xOf(magnetic * device.rating * 20), yOf(0.01)])
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  }

  const colors = ['#0f172a', '#e4a11b']

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {/* ejes */}
        <line x1={margin} y1={H - margin} x2={W - margin} y2={H - margin} stroke="#cbd5e1" />
        <line x1={margin} y1={margin / 2} x2={margin} y2={H - margin} stroke="#cbd5e1" />
        {[0.01, 0.1, 1, 10, 100].map((s) => (
          <g key={s}>
            <line x1={margin} y1={yOf(s)} x2={W - margin} y2={yOf(s)} stroke="#f1f5f9" />
            <text x={margin - 6} y={yOf(s) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{s}s</text>
          </g>
        ))}
        {[10, 100, 1000, 10000].map((c) => (
          c <= currentMax && (
            <text key={c} x={xOf(c)} y={H - margin + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">{c} A</text>
          )
        ))}
        {/* Icc */}
        <line x1={xOf(iccKa * 1000)} y1={margin / 2} x2={xOf(iccKa * 1000)} y2={H - margin} stroke="#ef4444" strokeDasharray="4 3" />
        <text x={xOf(iccKa * 1000) + 3} y={margin / 2 + 10} fontSize="9" fill="#ef4444">Icc {iccKa} kA</text>

        {devices.map((d, i) => (
          <path key={i} d={curvePoints(d, colors[i])} fill="none" stroke={colors[i]} strokeWidth="2" />
        ))}
      </svg>
      <div className="flex gap-4 mt-2 text-[11px]">
        {devices.map((d, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ background: colors[i] }} />
            {d.rating} A · curva {d.curve}
          </span>
        ))}
      </div>
    </div>
  )
}

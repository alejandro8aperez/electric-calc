import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'
import { calcTransformer } from '@/lib/transformerCalc'
import { DEMO } from '@/lib/demo'
import { useI18n } from '@/lib/i18n'
import { Field, SummaryCard, Row, Panel as Card } from '@/components/ui/kit'
import { getProject } from '@/lib/storage'

export default function Transformer() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const projectId = params.get('project')
  const [input, setInput] = useState({
    load_kva: 500, primary_voltage: 13200, secondary_voltage: 480,
    impedance_percent: '', target_loading: 0.8, future_growth: 15,
    power_factor: 0.9, phases: 3,
  })

  useEffect(() => {
    if (!projectId) return
    const p = getProject(projectId)
    if (p) {
      const sys = p.system ?? {}
      setInput((s) => ({
        ...s,
        secondary_voltage: sys.voltage ?? s.secondary_voltage,
        power_factor: sys.power_factor ?? s.power_factor,
        phases: sys.phases ?? s.phases,
      }))
    }
  }, [projectId])

  const r = useMemo(() => calcTransformer(input), [input])
  const set = (k, v) => setInput((s) => ({ ...s, [k]: v }))

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t('transformer.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('transformer.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('common.inputs')}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('transformer.loadKva')}>
              <input type="number" className="input" value={input.load_kva} onChange={(e) => set('load_kva', +e.target.value)} />
            </Field>
            <Field label={t('transformer.targetLoading')}>
              <select className="input" value={input.target_loading} onChange={(e) => set('target_loading', +e.target.value)}>
                <option value={0.7}>70 %</option>
                <option value={0.8}>80 %</option>
                <option value={0.9}>90 %</option>
              </select>
            </Field>
            <Field label={t('transformer.primary')}>
              <input type="number" className="input" value={input.primary_voltage} onChange={(e) => set('primary_voltage', +e.target.value)} />
            </Field>
            <Field label={t('transformer.secondary')}>
              <input type="number" className="input" value={input.secondary_voltage} onChange={(e) => set('secondary_voltage', +e.target.value)} />
            </Field>
            <Field label={`${t('transformer.impedance')} (auto)`}>
              <input type="number" className="input" placeholder={String(r.spec.z)} value={input.impedance_percent}
                onChange={(e) => set('impedance_percent', e.target.value)} />
            </Field>
            <Field label="FP">
              <input type="number" step="0.01" className="input" value={input.power_factor} onChange={(e) => set('power_factor', +e.target.value)} />
            </Field>
            <Field label={t('transformer.growth')}>
              <input type="number" className="input" value={input.future_growth} onChange={(e) => set('future_growth', +e.target.value)} />
            </Field>
            <Field label={t('common.phase')}>
              <select className="input" value={input.phases} onChange={(e) => set('phases', +e.target.value)}>
                <option value={3}>Trifásico</option>
                <option value={1}>Monofásico</option>
              </select>
            </Field>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs text-amber-700 font-medium">{t('transformer.rated')}</div>
            <div className="text-3xl font-bold text-slate-900">{r.ratedKva} kVA</div>
            <div className="text-xs text-slate-500 mt-1">Requerido: {r.requiredKva} kVA · %Z = {r.zPercent}</div>
          </div>

          <Card title={t('common.results')}>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label={t('transformer.loading')} value={`${r.loading} %`} accent={r.loading > 90 ? 'red' : 'emerald'} />
              <SummaryCard label={t('transformer.iscc')} value={`${r.isccSecondaryKa} kA`} accent="red" />
              <SummaryCard label={t('transformer.iPrimary')} value={`${r.iPrimary} A`} />
              <SummaryCard label={t('transformer.iSecondary')} value={`${r.iSecondary} A`} />
              <SummaryCard label={t('transformer.losses')} value={`${r.totalLoss} W`} />
              <SummaryCard label={t('transformer.efficiency')} value={`${r.efficiency} %`} accent="emerald" />
            </div>
          </Card>

          <Card title="Protecciones recomendadas">
            <div className="text-xs text-slate-600 space-y-2">
              <Row label={`Primaria (${r.primaryV} V)`} value={`${r.primaryBreaker} A`} />
              <Row label={`Secundaria (${r.secondaryV} V)`} value={`${r.secondaryBreaker} A`} />
              <Row label={t('transformer.regulation')} value={`${r.regulation} %`} />
            </div>
          </Card>

          {r.warnings.length > 0 && (
            <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1 list-disc list-inside">
              {r.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-6 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" /> {DEMO.transformerNote}
      </p>
    </div>
  )
}

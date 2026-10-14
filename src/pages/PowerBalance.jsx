import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Gauge } from 'lucide-react'
import { calcPowerBalance, correctPowerFactor, coincidenceFactor } from '@/lib/powerBalance'
import { LOAD_TYPES } from '@/lib/electricalData'
import { listProjects } from '@/lib/storage'
import { useI18n } from '@/lib/i18n'
import { Field, SummaryCard, Row, Panel as Card } from '@/components/ui/kit'

export default function PowerBalance() {
  const { t } = useI18n()
  const projects = useMemo(() => listProjects(), [])
  const [mode, setMode] = useState(projects.length ? 'project' : 'manual')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [manual, setManual] = useState([
    { name: 'Alumbrado', load_type: 'lighting', power_kw: 10, power_factor: 0.9 },
    { name: 'Motores', load_type: 'motor', power_kw: 30, power_factor: 0.85 },
    { name: 'HVAC', load_type: 'hvac', power_kw: 25, power_factor: 0.88 },
  ])
  const [coincidence, setCoincidence] = useState('')
  const [pfTarget, setPfTarget] = useState(0.95)

  const project = projects.find((p) => p.id === projectId)
  const source = mode === 'project' && project ? project.circuits : manual
  const voltage = mode === 'project' && project ? project.system.voltage : 400
  const phases = mode === 'project' && project ? project.system.phases : 3

  const balance = useMemo(() => {
    const circuits = (source ?? []).map((c) => ({
      name: c.name, load_type: c.load_type, power_kw: c.power_kw, power_factor: c.power_factor,
    }))
    const auto = coincidenceFactor(circuits.length)
    return calcPowerBalance(circuits, {
      voltage, phases,
      coincidence: coincidence === '' ? auto : Number(coincidence),
    })
  }, [source, voltage, phases, coincidence])

  const correction = useMemo(() => correctPowerFactor({
    powerKw: balance.coincidentKw,
    pfActual: balance.globalPowerFactor,
    pfTarget,
    voltage, phases,
  }), [balance, pfTarget, voltage, phases])

  const updateRow = (i, k, v) => setManual((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const addRow = () => setManual((r) => [...r, { name: 'Carga nueva', load_type: 'general', power_kw: 5, power_factor: 0.9 }])
  const removeRow = (i) => setManual((r) => r.filter((_, j) => j !== i))

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t('balance.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('balance.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <Card
            title={t('balance.source')}
            actions={
              <div className="flex items-center gap-2">
                <button onClick={() => setMode('project')} disabled={!projects.length}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${mode === 'project' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'} disabled:opacity-40`}>
                  {t('balance.fromProject')}
                </button>
                <button onClick={() => setMode('manual')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${mode === 'manual' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {t('balance.manual')}
                </button>
              </div>
            }
          >
            {mode === 'project' ? (
              projects.length ? (
                <Field label={t('report.project')}>
                  <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
                  </select>
                </Field>
              ) : <p className="text-sm text-slate-500">{t('balance.noProject')}</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-2 px-2 font-medium">#</th>
                        <th className="py-2 px-2 font-medium">{t('common.circuit')}</th>
                        <th className="py-2 px-2 font-medium">Tipo</th>
                        <th className="py-2 px-2 font-medium">kW</th>
                        <th className="py-2 px-2 font-medium">FP</th>
                        <th className="py-2 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {manual.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-1.5 px-2 text-slate-400">{i + 1}</td>
                          <td className="py-1.5 px-2">
                            <input className="input !py-1 !text-xs" value={r.name} onChange={(e) => updateRow(i, 'name', e.target.value)} />
                          </td>
                          <td className="py-1.5 px-2">
                            <select className="input !py-1 !text-xs" value={r.load_type} onChange={(e) => updateRow(i, 'load_type', e.target.value)}>
                              {LOAD_TYPES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                            </select>
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" className="input !py-1 !text-xs !w-20" value={r.power_kw} onChange={(e) => updateRow(i, 'power_kw', +e.target.value)} />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" step="0.01" className="input !py-1 !text-xs !w-16" value={r.power_factor} onChange={(e) => updateRow(i, 'power_factor', +e.target.value)} />
                          </td>
                          <td className="py-1.5 px-2">
                            <button onClick={() => removeRow(i)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addRow} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
                  <Plus className="w-3.5 h-3.5" /> {t('balance.addRow')}
                </button>
              </div>
            )}

            <div className="mt-4">
              <Field label={t('balance.coincidence')} hint={`${t('balance.fromProject')}: ${coincidenceFactor(source?.length ?? 0)}`}>
                <input type="number" step="0.01" min="0.1" max="1" className="input"
                  value={coincidence} placeholder={String(coincidenceFactor(source?.length ?? 0))}
                  onChange={(e) => setCoincidence(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title={t('balance.correction')}>
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
              <div className="space-y-3">
                <Field label={`${t('balance.pf')} actual`}>
                  <input className="input" value={balance.globalPowerFactor} readOnly />
                </Field>
                <Field label={t('balance.pfTarget')}>
                  <input type="number" step="0.01" min="0.5" max="1" className="input" value={pfTarget}
                    onChange={(e) => setPfTarget(+e.target.value)} />
                </Field>
                <Field label="P (kW)">
                  <input className="input" value={balance.coincidentKw} readOnly />
                </Field>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label={t('balance.requiredKvar')} value={`${correction.requiredKvar} kVAr`} accent="amber" />
                  <SummaryCard label={t('balance.recommended')} value={`${correction.recommendedKvar} kVAr`} accent="emerald" />
                  <SummaryCard label={t('balance.currentBefore')} value={`${correction.currentBeforeA} A`} />
                  <SummaryCard label={t('balance.currentAfter')} value={`${correction.currentAfterA} A`} accent="blue" />
                </div>
                <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                  <Row label={t('balance.reduction')} value={`${correction.currentReductionPct} %`} />
                  <Row label={t('balance.apparentBefore')} value={`${correction.apparentBeforeKva} kVA`} />
                  <Row label={t('balance.apparentAfter')} value={`${correction.apparentAfterKva} kVA`} />
                  <Row label={t('balance.steps')} value={correction.steps.join(' + ')} />
                </div>
                <p className="text-[11px] text-slate-400">{correction.lossesNote}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 h-fit">
          <Card title={t('common.results')}>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label={t('balance.installed')} value={`${balance.installedKw} kW`} />
              <SummaryCard label={t('balance.demand')} value={`${balance.demandKw} kW`} accent="amber" />
              <SummaryCard label={t('balance.simultaneous')} value={`${balance.simultaneousKw} kW`} />
              <SummaryCard label={t('balance.coincident')} value={`${balance.coincidentKw} kW`} accent="blue" />
              <SummaryCard label={t('balance.kvar')} value={`${balance.coincidentKvar} kVAr`} />
              <SummaryCard label={t('balance.kva')} value={`${balance.coincidentKva} kVA`} accent="emerald" />
            </div>
            <div className="mt-3 text-xs text-slate-600 space-y-1.5">
              <Row label={t('balance.pf')} value={balance.globalPowerFactor} />
              <Row label={t('common.current')} value={`${balance.current} A`} />
              <Row label={t('balance.coincidence')} value={balance.coincidence} />
              <Row label="Continuas" value={`${balance.continuousKw} kW`} />
            </div>
          </Card>

          <Card title={t('balance.manual')}>
            <div className="space-y-1.5 text-[11px] text-slate-600 max-h-72 overflow-y-auto pr-1">
              {balance.rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate flex items-center gap-1.5">
                    <Gauge className="w-3 h-3 text-slate-300 shrink-0" />{r.name || `#${i + 1}`}
                  </span>
                  <span className="text-slate-400 shrink-0">ku {r.utilization}</span>
                  <span className="font-medium shrink-0">{r.utilizedKw} kW</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Copy, Trash2, Save, ArrowLeft, FileText, Zap, RefreshCw } from 'lucide-react'
import { computePanel, balancePhases, PHASES } from '@/lib/panelCalc'
import { calcSource, SOURCE_TYPES } from '@/lib/sourceCalc'
import {
  INSTALLATION_METHODS, INSULATIONS, LOAD_TYPES, getMethod,
} from '@/lib/electricalData'
import { newProject, emptyCircuit, getProject, saveProject } from '@/lib/storage'
import { useI18n } from '@/lib/i18n'
import OneLineDiagram from '@/components/OneLineDiagram'
import StatusPill, { SummaryCard, Field } from '@/components/ui/kit'

export default function Panel() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const projectId = params.get('project')
  const { t } = useI18n()

  const [project, setProject] = useState(() => newProject())
  const [loaded, setLoaded] = useState(!projectId)

  useEffect(() => {
    if (!projectId) return
    const p = getProject(projectId)
    if (p) setProject(p)
    setLoaded(true)
  }, [projectId])

  const panel = useMemo(() => {
    try { return computePanel(project.system, project.circuits) }
    catch { return null }
  }, [project])

  const updateSystem = (k, v) => setProject((p) => ({ ...p, system: { ...p.system, [k]: v } }))

  const source = project.system.source ?? { type: 'by_icc', icc_ka: project.system.source_icc_ka }
  const sourceResult = useMemo(() => {
    try { return calcSource({ ...source, voltage: project.system.voltage, frequency: project.system.frequency }) }
    catch { return null }
  }, [source, project.system.voltage, project.system.frequency])
  const updateSource = (patch) => {
    const next = { ...source, ...patch }
    let icc = project.system.source_icc_ka
    try {
      icc = calcSource({ ...next, voltage: project.system.voltage, frequency: project.system.frequency }).iccMaxKa
    } catch { /* keep */ }
    setProject((p) => ({ ...p, system: { ...p.system, source: next, source_icc_ka: icc } }))
  }
  const updateCircuit = (id, k, v) => setProject((p) => ({
    ...p, circuits: p.circuits.map((c) => (c.id === id ? { ...c, [k]: v } : c)),
  }))
  const addCircuit = () => setProject((p) => ({ ...p, circuits: [...p.circuits, emptyCircuit()] }))
  const duplicate = (id) => setProject((p) => {
    const c = p.circuits.find((x) => x.id === id)
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random())
    return { ...p, circuits: [...p.circuits, { ...c, id: newId, name: `${c.name} (copia)` }] }
  })
  const removeCircuit = (id) => setProject((p) => ({ ...p, circuits: p.circuits.filter((c) => c.id !== id) }))
  const autoBalance = () => setProject((p) => {
    const { assignment } = balancePhases(p.circuits)
    return { ...p, circuits: p.circuits.map((c, i) => ({ ...c, phase: assignment[i] ?? c.phase })) }
  })

  const handleSave = () => {
    if (!project.name.trim()) { alert('Ingresa un nombre de proyecto'); return }
    const record = {
      ...project,
      status: panel?.compliance ?? 'review',
      summary: panel ? {
        connectedKw: panel.connectedKw,
        demandKw: panel.demandKw,
        boardCurrent: panel.boardCurrent,
        mainBreaker: panel.mainBreaker,
        busbar: panel.busbar,
        imbalance: panel.imbalance,
        isccKa: panel.isccBoard?.isccKa,
      } : null,
    }
    const saved = saveProject(record)
    setProject(saved)
    navigate(`/report?project=${saved.id}`)
  }

  if (!loaded) return <div className="p-8 text-slate-400 text-sm">{t('common.loading')}</div>

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>
        <div className="flex items-center gap-2">
          {projectId && (
            <Link to={`/report?project=${projectId}`}
              className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              <FileText className="w-4 h-4" /> {t('nav.report')}
            </Link>
          )}
          <button onClick={handleSave}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
            <Save className="w-4 h-4" /> {t('common.save')}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label={t('report.project')}>
          <input value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
            className="input" placeholder="Ej. Subestación edificio Torre Norte" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Descripción (opcional)">
            <input value={project.description} onChange={(e) => setProject((p) => ({ ...p, description: e.target.value }))}
              className="input" placeholder="Alcance, ubicación, normas aplicables…" />
          </Field>
        </div>
      </div>

      {/* KPIs */}
      {panel && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
          <SummaryCard label={t('panel.connectedPower')} value={`${panel.connectedKw} kW`} />
          <SummaryCard label={t('panel.demandPower')} value={`${panel.demandKw} kW`} accent="amber" />
          <SummaryCard label={t('panel.boardCurrent')} value={`${panel.boardCurrent} A`} />
          <SummaryCard label={t('panel.mainBreaker')} value={`${panel.mainBreaker} A`} accent="slate" />
          <SummaryCard label={t('panel.busbar')} value={`${panel.busbar} A`} />
          <SummaryCard label={t('panel.feeder')} value={`${panel.feeder.size} mm²`} sub={`${panel.feeder.breaker} A`} accent="blue" />
          <SummaryCard label={t('panel.boardIcc')} value={`${panel.isccBoard?.isccKa} kA`} accent="red" />
          <SummaryCard label={t('panel.imbalance')} value={`${panel.imbalance} %`} accent={panel.imbalance > 15 ? 'red' : 'emerald'} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* Sistema */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">{t('panel.system')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t('common.voltage')} (V)`}>
              <input type="number" className="input" value={project.system.voltage}
                onChange={(e) => updateSystem('voltage', +e.target.value)} />
            </Field>
            <Field label={t('common.phase')}>
              <select className="input" value={project.system.phases}
                onChange={(e) => updateSystem('phases', +e.target.value)}>
                <option value={3}>Trifásico</option>
                <option value={1}>Monofásico</option>
              </select>
            </Field>
            <Field label="f (Hz)">
              <input type="number" className="input" value={project.system.frequency}
                onChange={(e) => updateSystem('frequency', +e.target.value)} />
            </Field>
            <Field label="FP">
              <input type="number" step="0.01" className="input" value={project.system.power_factor}
                onChange={(e) => updateSystem('power_factor', +e.target.value)} />
            </Field>
            <Field label={t('common.material')}>
              <select className="input" value={project.system.conductor_material}
                onChange={(e) => updateSystem('conductor_material', e.target.value)}>
                <option value="copper">Cobre</option>
                <option value="aluminum">Aluminio</option>
              </select>
            </Field>
            <Field label={t('common.insulation')}>
              <select className="input" value={project.system.insulation}
                onChange={(e) => updateSystem('insulation', e.target.value)}>
                {INSULATIONS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label={t('common.method')}>
                <select className="input" value={project.system.method}
                  onChange={(e) => updateSystem('method', e.target.value)}>
                  {INSTALLATION_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label={`${t('common.ambient')} (°C)`}>
              <input type="number" className="input" value={project.system.ambient_temp}
                onChange={(e) => updateSystem('ambient_temp', +e.target.value)} />
            </Field>
            <Field label={t('common.grouping')}>
              <input type="number" className="input" value={project.system.grouping_count}
                onChange={(e) => updateSystem('grouping_count', +e.target.value)} />
            </Field>
            <Field label={`${t('common.icc')} (kA)`}>
              <input type="number" className="input" value={project.system.source_icc_ka}
                onChange={(e) => updateSystem('source_icc_ka', +e.target.value)} />
            </Field>
            <Field label="t falla (s)">
              <input type="number" step="0.1" className="input" value={project.system.fault_duration_s}
                onChange={(e) => updateSystem('fault_duration_s', +e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label="Longitud alimentador (m)">
                <input type="number" className="input" value={project.system.feeder_length_m}
                  onChange={(e) => updateSystem('feeder_length_m', +e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Fuente · IEC 60909</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Tipo de fuente">
                  <select className="input" value={source.type} onChange={(e) => updateSource({ type: e.target.value })}>
                    {SOURCE_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
              </div>
              <SourceFields source={source} onChange={updateSource} />
            </div>
            {sourceResult && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <SummaryCard label="Icc máx (kA)" value={sourceResult.iccMaxKa} accent="red" />
                <SummaryCard label="Icc mín (kA)" value={sourceResult.iccMinKa} accent="amber" />
                <SummaryCard label="Icc pico (kA)" value={sourceResult.peakKa} />
                <SummaryCard label="R/X" value={sourceResult.ratioRX ?? '—'} />
              </div>
            )}
          </div>

          {panel && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-700 mb-2">{t('panel.phaseBalance')}</h3>
              <PhaseBars currents={panel.phaseCurrents} />
              <p className="text-[11px] text-slate-500 mt-2">{panel.recommendation}</p>
              <button onClick={autoBalance}
                className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                <RefreshCw className="w-3.5 h-3.5" /> {t('panel.balanceAuto')}
              </button>
            </div>
          )}
        </section>

        {/* Circuitos */}
        <section className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">{t('panel.schedule')}</h2>
              <button onClick={addCircuit}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">
                <Plus className="w-3.5 h-3.5" /> {t('panel.addCircuit')}
              </button>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-2 font-medium">#</th>
                    <th className="py-2 px-2 font-medium">{t('common.circuit')}</th>
                    <th className="py-2 px-2 font-medium">Tipo</th>
                    <th className="py-2 px-2 font-medium">kW</th>
                    <th className="py-2 px-2 font-medium">F</th>
                    <th className="py-2 px-2 font-medium">Fase</th>
                    <th className="py-2 px-2 font-medium">m</th>
                    <th className="py-2 px-2 font-medium">{t('common.current')}</th>
                    <th className="py-2 px-2 font-medium">In</th>
                    <th className="py-2 px-2 font-medium">{t('common.conductor')}</th>
                    <th className="py-2 px-2 font-medium">ΔU %</th>
                    <th className="py-2 px-2 font-medium">OK</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {project.circuits.map((c, i) => {
                    const r = panel?.circuits?.[i]
                    return (
                      <tr key={c.id} className="border-b border-slate-100 align-top">
                        <td className="py-1.5 px-2 text-slate-400">{i + 1}</td>
                        <td className="py-1.5 px-2">
                          <input className="input !py-1 !text-xs" value={c.name}
                            onChange={(e) => updateCircuit(c.id, 'name', e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2">
                          <select className="input !py-1 !text-xs" value={c.load_type}
                            onChange={(e) => updateCircuit(c.id, 'load_type', e.target.value)}>
                            {LOAD_TYPES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" className="input !py-1 !text-xs !w-20" value={c.power_kw}
                            onChange={(e) => updateCircuit(c.id, 'power_kw', +e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2">
                          <select className="input !py-1 !text-xs !w-16" value={c.phases}
                            onChange={(e) => updateCircuit(c.id, 'phases', +e.target.value)}>
                            <option value={1}>1F</option>
                            <option value={3}>3F</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          {c.phases === 1 ? (
                            <select className="input !py-1 !text-xs !w-16" value={c.phase || 'L1'}
                              onChange={(e) => updateCircuit(c.id, 'phase', e.target.value)}>
                              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          ) : <span className="text-slate-400">L1-L2-L3</span>}
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" className="input !py-1 !text-xs !w-16" value={c.length_m}
                            onChange={(e) => updateCircuit(c.id, 'length_m', +e.target.value)} />
                        </td>
                        <td className="py-1.5 px-2 text-slate-700">{r ? `${r.ib} A` : '—'}</td>
                        <td className="py-1.5 px-2 text-slate-700">{r ? `${r.breaker} A` : '—'}</td>
                        <td className="py-1.5 px-2 text-slate-700">
                          {r ? `${r.conductor.phase} mm²` : '—'}
                          {r && <span className="text-slate-400"> · PE {r.conductor.pe}</span>}
                        </td>
                        <td className={`py-1.5 px-2 font-medium ${r && r.regulation > 5 ? 'text-red-600' : 'text-slate-700'}`}>
                          {r ? r.regulation : '—'}
                        </td>
                        <td className="py-1.5 px-2">
                          {r && <StatusPill status={r.compliance} />}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <button onClick={() => duplicate(c.id)} title={t('panel.duplicate')}
                            className="text-slate-400 hover:text-slate-700 mr-2"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeCircuit(c.id)} title={t('panel.remove')}
                            className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {panel && <OneLineDiagram panel={panel} title={t('common.graph')} />}
        </section>
      </div>
    </div>
  )
}

function PhaseBars({ currents }) {
  const max = Math.max(...Object.values(currents), 1)
  return (
    <div className="space-y-2">
      {PHASES.map((p) => (
        <div key={p} className="flex items-center gap-2">
          <span className="w-7 text-[11px] font-medium text-slate-500">{p}</span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${(currents[p] / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right text-[11px] text-slate-600">{currents[p]} A</span>
        </div>
      ))}
    </div>
  )
}

function SourceFields({ source, onChange }) {
  const n = (k, label, step = 1) => (
    <Field key={k} label={label}>
      <input type="number" step={step} className="input" value={source[k] ?? ''}
        onChange={(e) => onChange({ [k]: +e.target.value })} />
    </Field>
  )
  switch (source.type) {
    case 'transformer':
      return <>{n('kva', 'Potencia (kVA)', 1)}{n('uk_percent', 'uk (%)', 0.1)}{n('primary_voltage', 'V primaria (V)', 1)}{n('load_losses_w', 'Pérdidas cobre (W)', 10)}</>
    case 'genset':
      return <>{n('kva', 'Potencia (kVA)', 1)}{n('xd_percent', "X''d (%)", 0.1)}</>
    case 'by_icc':
      return n('icc_ka', 'Icc (kA)', 0.1)
    case 'by_rx':
      return <>{n('r_ohm', 'R (Ω)', 0.0001)}{n('x_ohm', 'X (Ω)', 0.0001)}</>
    case 'monitored':
      return n('sc_power_mva', 'Scc (MVA)', 1)
    case 'battery':
      return <>{n('dc_voltage', 'V CC (V)', 1)}{n('internal_resistance_mohm', 'Rint (mΩ)', 0.1)}</>
    default:
      return null
  }
}

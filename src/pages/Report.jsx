import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { computePanel } from '@/lib/panelCalc'
import { calcTransformer } from '@/lib/transformerCalc'
import { getProject } from '@/lib/storage'
import { useI18n } from '@/lib/i18n'
import OneLineDiagram from '@/components/OneLineDiagram'
import StatusPill from '@/components/ui/kit'

export default function Report() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const projectId = params.get('project')
  const [project, setProject] = useState(null)

  useEffect(() => {
    if (projectId) setProject(getProject(projectId))
  }, [projectId])

  const panel = useMemo(() => {
    if (!project) return null
    try { return computePanel(project.system, project.circuits) } catch { return null }
  }, [project])

  const transformer = useMemo(() => {
    if (!panel) return null
    return calcTransformer({
      load_kva: panel.demandKva,
      secondary_voltage: project.system.voltage,
      power_factor: project.system.power_factor,
      phases: project.system.phases,
      target_loading: 0.8,
      future_growth: 15,
    })
  }, [panel, project])

  if (!project) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          {t('report.noData')}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to={`/panel?project=${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
          <Printer className="w-4 h-4" /> {t('common.print')}
        </button>
      </div>

      <article className="bg-white rounded-xl border border-slate-200 p-8 print:border-0 print:rounded-none print:shadow-none space-y-8">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-xl font-semibold text-slate-900">{t('report.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{project.name}{project.description ? ` — ${project.description}` : ''}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {t('report.generated')}: {new Date().toLocaleString()} · IEEE 141 · NEC · RETIE · IEC 60364
          </p>
        </header>

        {/* Resumen */}
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{t('report.summary')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Info label={t('common.circuits')} value={project.circuits.length} />
            <Info label={t('panel.connectedPower')} value={`${panel.connectedKw} kW`} />
            <Info label={t('panel.demandPower')} value={`${panel.demandKw} kW`} />
            <Info label={t('panel.boardCurrent')} value={`${panel.boardCurrent} A`} />
            <Info label={t('panel.mainBreaker')} value={`${panel.mainBreaker} A`} />
            <Info label={t('panel.busbar')} value={`${panel.busbar} A`} />
            <Info label={t('panel.feeder')} value={`${panel.feeder.size} mm² / ${panel.feeder.breaker} A`} />
            <Info label={t('panel.boardIcc')} value={`${panel.isccBoard?.isccKa} kA`} />
            <Info label={t('panel.imbalance')} value={`${panel.imbalance} %`} />
            <Info label={`${t('transformer.rated')}`} value={`${transformer.ratedKva} kVA`} />
            <Info label={t('transformer.iscc')} value={`${transformer.isccSecondaryKa} kA`} />
            <Info label={t('common.compliance')} value={<StatusPill status={panel.compliance} />} />
          </div>
        </section>

        {/* Cuadro de cargas */}
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{t('panel.schedule')}</h2>
          <table className="w-full text-[11px] border border-slate-200">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-left">
                <th className="px-2 py-1.5 border-b border-slate-200">#</th>
                <th className="px-2 py-1.5 border-b border-slate-200">{t('common.circuit')}</th>
                <th className="px-2 py-1.5 border-b border-slate-200">kW</th>
                <th className="px-2 py-1.5 border-b border-slate-200">F</th>
                <th className="px-2 py-1.5 border-b border-slate-200">Ib</th>
                <th className="px-2 py-1.5 border-b border-slate-200">In</th>
                <th className="px-2 py-1.5 border-b border-slate-200">{t('common.conductor')}</th>
                <th className="px-2 py-1.5 border-b border-slate-200">PE</th>
                <th className="px-2 py-1.5 border-b border-slate-200">N</th>
                <th className="px-2 py-1.5 border-b border-slate-200">ΔU%</th>
                <th className="px-2 py-1.5 border-b border-slate-200">OK</th>
              </tr>
            </thead>
            <tbody>
              {panel.circuits.map((c, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50/50">
                  <td className="px-2 py-1.5 border-b border-slate-100 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.input.name} <span className="text-slate-400">({c.input.load_type})</span></td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.input.power_kw}</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.input.phases === 3 ? '3F' : c.phaseAssignment || '1F'}</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.ib} A</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.breaker} A</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.conductor.phase} mm²</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.conductor.pe}</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.conductor.neutral} mm²</td>
                  <td className="px-2 py-1.5 border-b border-slate-100">{c.regulation}</td>
                  <td className="px-2 py-1.5 border-b border-slate-100"><StatusPill status={c.compliance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Diagrama unifilar */}
        <section className="break-before-page">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{t('common.graph')}</h2>
          <OneLineDiagram panel={panel} title={project.name} />
        </section>

        {/* Verificaciones normativas */}
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Verificaciones normativas</h2>
          <ul className="text-[11px] text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {panel.circuits.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <StatusPill status={c.compliance} />
                <span>{c.input.name}: {c.checks.overloadDetail}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          Electric Calc · {t('report.generated')} {new Date().toLocaleDateString()} · Los resultados deben ser verificados por un ingeniero responsable del diseño.
        </footer>
      </article>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  )
}

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Printer, RefreshCw } from 'lucide-react'
import { computePanel } from '@/lib/panelCalc'
import { buildBom, bomTotals, bomToCsv } from '@/lib/bom'
import { loadCatalog, getCurrency } from '@/lib/catalogStore'
import { manufacturerList } from '@/lib/manufacturerData'
import { listProjects } from '@/lib/storage'
import { useI18n } from '@/lib/i18n'
import { Field, SummaryCard, Panel as Card } from '@/components/ui/kit'

export default function Bom() {
  const { t } = useI18n()
  const projects = useMemo(() => listProjects(), [])
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [settings, setSettings] = useState({
    discountPct: 0, taxPct: 19, reservePct: 20, currency: getCurrency(), manufacturer: '',
  })
  const [lines, setLines] = useState([])
  const [panelInfo, setPanelInfo] = useState(null)

  const project = projects.find((p) => p.id === projectId)

  const rebuild = useCallback(() => {
    if (!project) { setLines([]); return }
    const panel = computePanel(project.system, project.circuits)
    const bom = buildBom(panel, { catalog: loadCatalog(), ...settings })
    setLines(bom.lines)
    setPanelInfo(bom.meta)
  }, [project, settings])

  useEffect(() => { rebuild() }, [rebuild])

  const totals = useMemo(() => bomTotals(lines, settings), [lines, settings])

  const updateLine = (id, k, v) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [k]: v, total: (k === 'qty' ? v : l.qty) * (k === 'unitPrice' ? v : l.unitPrice) } : l)))

  const exportCsv = () => {
    const csv = bomToCsv(lines, totals, { currency: settings.currency })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presupuesto-${project?.name || 'proyecto'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const money = (v) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(v || 0))

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 print:hidden">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('bom.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('bom.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button onClick={rebuild} className="btn-ghost"><RefreshCw className="w-4 h-4" /> {t('bom.rebuild')}</button>
          <button onClick={exportCsv} className="btn-ghost"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => window.print()} className="btn-dark"><Printer className="w-4 h-4" /> {t('common.print')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 print:hidden">
        <Field label={t('report.project')}>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.length === 0 && <option value="">{t('bom.noProject')}</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
          </select>
        </Field>
        <Field label={t('bom.manufacturer')}>
          <select className="input" value={settings.manufacturer} onChange={(e) => setSettings({ ...settings, manufacturer: e.target.value })}>
            <option value="">{t('bom.anyManufacturer')}</option>
            {manufacturerList().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label={`${t('bom.discount')} (%)`}>
          <input type="number" className="input" value={settings.discountPct}
            onChange={(e) => setSettings({ ...settings, discountPct: +e.target.value })} />
        </Field>
        <Field label={`${t('bom.tax')} (%)`}>
          <input type="number" className="input" value={settings.taxPct}
            onChange={(e) => setSettings({ ...settings, taxPct: +e.target.value })} />
        </Field>
        <Field label={`${t('bom.reserve')} (%)`}>
          <input type="number" className="input" value={settings.reservePct}
            onChange={(e) => setSettings({ ...settings, reservePct: +e.target.value })} />
        </Field>
      </div>

      {!project ? (
        <Card><p className="text-sm text-slate-500">{t('bom.noProject')}</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <SummaryCard label={t('bom.items')} value={totals.items} />
            <SummaryCard label={t('bom.subtotal')} value={`${money(totals.subtotal)} ${settings.currency}`} />
            <SummaryCard label={t('bom.tax')} value={`${money(totals.tax)} ${settings.currency}`} accent="amber" />
            <SummaryCard label={t('bom.total')} value={`${money(totals.total)} ${settings.currency}`} accent="emerald" />
          </div>

          <Card title={t('bom.materials')}>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-2 font-medium">{t('catalog.reference')}</th>
                    <th className="py-2 px-2 font-medium">{t('bom.description')}</th>
                    <th className="py-2 px-2 font-medium">{t('bom.qty')}</th>
                    <th className="py-2 px-2 font-medium">{t('bom.unitPrice')}</th>
                    <th className="py-2 px-2 font-medium">{t('bom.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 align-top">
                      <td className="py-1.5 px-2 font-medium text-slate-700">{l.reference}</td>
                      <td className="py-1.5 px-2 text-slate-500">
                        {l.description}
                        <div className="text-[10px] text-slate-300">{l.family} · {l.manufacturer} · {l.sources?.slice(0, 4).join(', ')}</div>
                      </td>
                      <td className="py-1.5 px-2">
                        <input type="number" min="0" className="input !py-1 !text-xs !w-16" value={l.qty}
                          onChange={(e) => updateLine(l.id, 'qty', +e.target.value)} />
                      </td>
                      <td className="py-1.5 px-2">
                        <input type="number" min="0" className="input !py-1 !text-xs !w-28" value={l.unitPrice}
                          onChange={(e) => updateLine(l.id, 'unitPrice', +e.target.value)} />
                      </td>
                      <td className="py-1.5 px-2 text-slate-700">{money(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-slate-600">
                    <td colSpan={4} className="py-1.5 px-2 text-right">{t('bom.subtotal')}</td>
                    <td className="py-1.5 px-2 font-medium">{money(totals.subtotal)}</td>
                  </tr>
                  <tr className="text-slate-600">
                    <td colSpan={4} className="py-1.5 px-2 text-right">{t('bom.discount')} ({totals.discountPct} %)</td>
                    <td className="py-1.5 px-2 font-medium">-{money(totals.discount)}</td>
                  </tr>
                  <tr className="text-slate-600">
                    <td colSpan={4} className="py-1.5 px-2 text-right">{t('bom.tax')} ({totals.taxPct} %)</td>
                    <td className="py-1.5 px-2 font-medium">{money(totals.tax)}</td>
                  </tr>
                  <tr className="text-slate-900 font-semibold">
                    <td colSpan={4} className="py-2 px-2 text-right">{t('bom.total')} ({settings.currency})</td>
                    <td className="py-2 px-2">{money(totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {panelInfo && (
              <p className="text-[11px] text-slate-400 mt-3">
                {t('bom.modulesNote', { used: panelInfo.usedModules, required: panelInfo.requiredModules, reserve: panelInfo.reservePct })}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">{t('bom.disclaimer')}</p>
          </Card>
        </>
      )}
    </div>
  )
}

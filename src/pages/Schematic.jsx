import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Printer, FileCode2, Image } from 'lucide-react'
import { listProjects, saveProject, getProject } from '@/lib/storage'
import { computeNetwork, wouldCycle } from '@/lib/networkCalc'
import { buildSchematic, buildTerminalSchedule, scheduleToCsv } from '@/lib/schematic'
import { verifyNetwork } from '@/lib/networkVerify'
import { schematicToDxf } from '@/lib/dxf'
import { useI18n } from '@/lib/i18n'
import NetworkDiagram from '@/components/NetworkDiagram'
import { Panel as Card, SummaryCard, StatusPill } from '@/components/ui/kit'

export default function Schematic() {
  const { t } = useI18n()
  const [projects, setProjects] = useState(() => listProjects())
  const svgRef = useRef(null)

  const network = useMemo(() => computeNetwork(projects), [projects])
  const schematic = useMemo(() => buildSchematic(network), [network])
  const schedule = useMemo(() => buildTerminalSchedule(network), [network])
  const verification = useMemo(() => verifyNetwork(network), [network])

  const refresh = () => setProjects(listProjects())

  const setParent = (id, parentId) => {
    const p = getProject(id)
    if (!p) return
    saveProject({ ...p, parent_id: parentId || null })
    refresh()
  }

  const parentOptions = (p) =>
    projects.filter((o) => o.id !== p.id && !wouldCycle(projects, p.id, o.id))

  const exportDxf = () => {
    const dxf = schematicToDxf(schematic, { title: t('schematic.title') })
    download('esquema-unifilar.dxf', dxf, 'application/dxf')
  }
  const exportCsv = () => {
    download('bornera.csv', '\uFEFF' + scheduleToCsv(schedule), 'text/csv')
  }
  const exportSvg = () => {
    if (!svgRef.current) return
    const svg = svgRef.current.outerHTML
    download('esquema-unifilar.svg', svg, 'image/svg+xml')
  }

  const totalBoards = network.nodes.length
  const maxIcc = network.nodes.reduce((m, n) => Math.max(m, n.busIcc ?? 0), 0)
  const worstReg = network.nodes.reduce((m, n) => {
    const r = (n.panel?.circuits ?? []).reduce((x, c) => Math.max(x, c.cascadeRegulation ?? 0), 0)
    return Math.max(m, r)
  }, 0)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 print:hidden">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('schematic.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('schematic.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button onClick={exportCsv} className="btn-ghost"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={exportSvg} className="btn-ghost"><Image className="w-4 h-4" /> SVG</button>
          <button onClick={exportDxf} className="btn-ghost"><FileCode2 className="w-4 h-4" /> DXF</button>
          <button onClick={() => window.print()} className="btn-dark"><Printer className="w-4 h-4" /> {t('common.print')}</button>
        </div>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-semibold text-slate-900">{t('schematic.title')}</h1>
        <p className="text-xs text-slate-500">{new Date().toLocaleString()}</p>
      </div>

      {projects.length === 0 ? (
        <Card><p className="text-sm text-slate-500">{t('schematic.noProjects')}</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <SummaryCard label={t('schematic.boards')} value={totalBoards} />
            <SummaryCard label={t('schematic.maxIcc')} value={`${round(maxIcc)} kA`} accent="red" />
            <SummaryCard label={t('schematic.worstReg')} value={`${round(worstReg)} %`} accent={worstReg > 5 ? 'red' : 'emerald'} />
            <SummaryCard label={t('schematic.levels')} value={network.maxDepth + 1} />
          </div>

          <div className="mb-6">
            <Card title={t('schematic.tree')}>
              <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-2 font-medium">{t('schematic.board')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.parent')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.folio')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.busIcc')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.cumReg')}</th>
                    <th className="py-2 px-2 font-medium">{t('panel.feeder')}</th>
                  </tr>
                </thead>
                <tbody>
                  {network.nodes.map((n) => (
                    <tr key={n.id} className="border-b border-slate-100">
                      <td className="py-1.5 px-2 font-medium text-slate-700">{n.tag} · {n.name}</td>
                      <td className="py-1.5 px-2">
                        <select className="input !py-1 !text-xs" value={n.parentId ?? ''}
                          onChange={(e) => setParent(n.id, e.target.value)}>
                          <option value="">{t('schematic.none')}</option>
                          {parentOptions(n.project).map((o) => <option key={o.id} value={o.id}>{o.name || o.id}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-slate-500">#{n.folio}</td>
                      <td className="py-1.5 px-2 text-slate-700">{round(n.busIcc)} kA</td>
                      <td className={`py-1.5 px-2 font-medium ${n.accumReg > 5 ? 'text-red-600' : 'text-slate-700'}`}>{round(n.accumReg)} %</td>
                      <td className="py-1.5 px-2 text-slate-500">
                        {n.panel ? `${n.panel.feeder.size} mm² · ${n.panel.feeder.breaker} A` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          </div>

          <div className="mb-6">
            <NetworkDiagram schematic={schematic} svgRef={svgRef} />
          </div>

          <Card title={t('schematic.schedule')}>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[760px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-2 font-medium">{t('schematic.board')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.folio')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.strip')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.direction')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.ref')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.terminals')}</th>
                    <th className="py-2 px-2 font-medium">{t('schematic.cable')}</th>
                    <th className="py-2 px-2 font-medium">In (A)</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1.5 px-2 font-medium text-slate-700">{r.board}</td>
                      <td className="py-1.5 px-2 text-slate-500">#{r.folio}</td>
                      <td className="py-1.5 px-2 text-slate-700">{r.strip}</td>
                      <td className="py-1.5 px-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${r.direction === 'IN' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                          {r.direction}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-500">{r.ref}</td>
                      <td className="py-1.5 px-2 text-slate-600 font-mono">{r.terminals.join(' ')}</td>
                      <td className="py-1.5 px-2 text-slate-500">{r.cable}{r.pe ? ` · PE ${r.pe}` : ''}</td>
                      <td className="py-1.5 px-2 text-slate-700">{r.breaker}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
            <Card title={t('verify.title')}>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 px-2 font-medium">{t('verify.level')}</th>
                      <th className="py-2 px-2 font-medium">{t('verify.scope')}</th>
                      <th className="py-2 px-2 font-medium">{t('verify.check')}</th>
                      <th className="py-2 px-2 font-medium">{t('verify.value')}</th>
                      <th className="py-2 px-2 font-medium">{t('verify.limit')}</th>
                      <th className="py-2 px-2 font-medium">OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verification.findings.map((f, i) => (
                      <tr key={i} className="border-b border-slate-100 align-top">
                        <td className="py-1.5 px-2 text-slate-500">{f.level}</td>
                        <td className="py-1.5 px-2 font-medium text-slate-700">{f.scope}<div className="text-[10px] text-slate-400">{f.name}</div></td>
                        <td className="py-1.5 px-2 text-slate-600">{t(`verify.${f.check}`)}</td>
                        <td className="py-1.5 px-2 text-slate-700">{f.value}</td>
                        <td className="py-1.5 px-2 text-slate-500">{f.limit}</td>
                        <td className="py-1.5 px-2"><StatusPill status={f.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={t('verify.icu')}>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 px-2 font-medium">{t('schematic.board')}</th>
                      <th className="py-2 px-2 font-medium">{t('schematic.busIcc')}</th>
                      <th className="py-2 px-2 font-medium">Icu ≥</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verification.icu.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 font-medium text-slate-700">{r.tag}</td>
                        <td className="py-1.5 px-2 text-slate-700">{r.busIcc} kA</td>
                        <td className="py-1.5 px-2 text-slate-700">{r.required} kA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">{t('verify.global')}</span>
                <StatusPill status={verification.status} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-base font-semibold text-emerald-600">{verification.counts.compliant}</div><div className="text-[10px] text-slate-400">OK</div></div>
                <div><div className="text-base font-semibold text-amber-600">{verification.counts.review}</div><div className="text-[10px] text-slate-400">{t('verify.reviewShort')}</div></div>
                <div><div className="text-base font-semibold text-red-600">{verification.counts.non_compliant}</div><div className="text-[10px] text-slate-400">{t('verify.failShort')}</div></div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function round(v) {
  return Math.round((Number(v) || 0) * 100) / 100
}

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

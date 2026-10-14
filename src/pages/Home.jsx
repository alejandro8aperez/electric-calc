import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Zap, AlertTriangle, CheckCircle2, Clock, Trash2, LayoutGrid } from 'lucide-react'
import { listProjects, deleteProject, newProject, saveProject, exportProjects, importProjects } from '@/lib/storage'
import { useI18n } from '@/lib/i18n'

export default function Home() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => { setProjects(listProjects()); setLoading(false) }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const remove = (id) => setProjects(deleteProject(id))

  const create = () => {
    const p = newProject({ name: 'Proyecto sin título' })
    const saved = saveProject(p)
    navigate(`/panel?project=${saved.id}`)
  }

  const onExport = () => {
    const blob = new Blob([exportProjects()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'electric-calc-proyectos.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (importProjects(String(reader.result))) setProjects(listProjects())
      else alert('Archivo inválido')
    }
    reader.readAsText(file)
  }

  const stats = {
    total: projects.length,
    compliant: projects.filter((p) => p.status === 'compliant').length,
    review: projects.filter((p) => p.status === 'review').length,
    nonCompliant: projects.filter((p) => p.status === 'non_compliant').length,
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('projects.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('projects.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExport}
            className="border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Exportar
          </button>
          <label className="border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
            Importar
            <input type="file" accept="application/json" className="hidden" onChange={onImport} />
          </label>
          <button onClick={create}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
            <Plus className="w-4 h-4" /> {t('common.new')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={LayoutGrid} label={t('projects.total')} value={stats.total} color="bg-slate-100 text-slate-700" />
        <StatCard icon={CheckCircle2} label={t('projects.compliant')} value={stats.compliant} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Clock} label={t('projects.review')} value={stats.review} color="bg-amber-50 text-amber-600" />
        <StatCard icon={AlertTriangle} label={t('projects.nonCompliant')} value={stats.nonCompliant} color="bg-red-50 text-red-600" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">{t('common.loading')}</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-slate-900 font-medium mb-1">{t('projects.empty')}</h3>
          <p className="text-sm text-slate-500 mb-6">{t('projects.emptyCta')}</p>
          <button onClick={create}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800">
            <Plus className="w-4 h-4" /> {t('common.new')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group relative">
              <Link to={`/panel?project=${p.id}`} className="block">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-slate-900">{p.name || 'Proyecto sin título'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.system?.voltage}V · {p.system?.phases} fase · {p.circuits?.length ?? 0} {t('common.circuits')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                  <Metric label={t('common.circuits')} value={p.circuits?.length ?? 0} />
                  <Metric label={t('panel.boardCurrent')} value={`${p.summary?.boardCurrent ?? '—'} A`} />
                  <Metric label={t('panel.mainBreaker')} value={`${p.summary?.mainBreaker ?? '—'} A`} />
                </div>
              </Link>
              <button onClick={() => remove(p.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                title={t('panel.remove')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

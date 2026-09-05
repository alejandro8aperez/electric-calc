import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calculator, Zap, AlertTriangle, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { listProjects } from '@/lib/storage'

export default function Home() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => {
      setProjects(listProjects())
      setLoading(false)
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const remove = (id) => {
    const next = projects.filter((p) => p.id !== id)
    localStorage.setItem('electric-calc-projects', JSON.stringify(next))
    setProjects(next)
  }

  const stats = {
    total: projects.length,
    compliant: projects.filter((p) => p.status === 'compliant').length,
    review: projects.filter((p) => p.status === 'review').length,
    nonCompliant: projects.filter((p) => p.status === 'non_compliant').length,
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proyectos eléctricos</h1>
          <p className="text-sm text-slate-500 mt-1">Instalaciones de uso final conforme a IEEE · NEC · RETIE · IEC</p>
        </div>
        <Link
          to="/calculator"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo cálculo
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calculator} label="Total" value={stats.total} color="bg-slate-100 text-slate-700" />
        <StatCard icon={CheckCircle2} label="Conformes" value={stats.compliant} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Clock} label="En revisión" value={stats.review} color="bg-amber-50 text-amber-600" />
        <StatCard icon={AlertTriangle} label="No conformes" value={stats.nonCompliant} color="bg-red-50 text-red-600" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Cargando proyectos…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-slate-900 font-medium mb-1">Aún no hay proyectos</h3>
          <p className="text-sm text-slate-500 mb-6">Comienza calculando una instalación eléctrica.</p>
          <Link
            to="/calculator"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Calculator className="w-4 h-4" />
            Abrir calculadora
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group relative"
            >
              <Link to={`/calculator?project=${p.id}`} className="block">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{p.voltage}V · {p.phases} fase · {p.power_kw} kW · {p.length_m} m</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                  <Metric label="Corriente" value={`${p.result_current} A`} />
                  <Metric label="Conductor" value={p.result_conductor} />
                  <Metric label="Regulación" value={`${p.result_regulation}%`} highlight={p.result_regulation > 3} />
                </div>
              </Link>
              <button
                onClick={() => remove(p.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                title="Eliminar"
              >
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

function Metric({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className={`text-sm font-medium ${highlight ? 'text-red-600' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    compliant: { label: 'Conforme', cls: 'bg-emerald-50 text-emerald-700' },
    review: { label: 'Revisión', cls: 'bg-amber-50 text-amber-700' },
    non_compliant: { label: 'No conforme', cls: 'bg-red-50 text-red-700' },
  }
  const s = map[status] ?? map.compliant
  return <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}
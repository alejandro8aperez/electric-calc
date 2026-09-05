import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { runFullCalculation } from '@/lib/electricalCalc'
import { INSTALLATION_METHODS, REGULATION_LIMITS } from '@/lib/electricalData'
import { Save, RotateCcw, Zap, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'
import ShortCircuitResults from '@/components/calculator/ShortCircuitResults'
import ConduitResults from '@/components/calculator/ConduitResults'
import GroundingResults from '@/components/calculator/GroundingResults'
import { saveProject, getProject } from '@/lib/storage'

const emptyInput = {
  name: '', description: '',
  power_kw: 10, voltage: 220, power_factor: 0.9, length_m: 30,
  phases: 1, conductor_material: 'copper', ambient_temp: 30, installation_method: 'conduit_3',
  fault_current_origin_ka: 10, fault_duration_s: 1, conduit_conductor_count: 3,
}

export default function Calculator() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const projectId = params.get('project')

  const [input, setInput] = useState(emptyInput)
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingProject, setLoadingProject] = useState(!!projectId)

  useEffect(() => {
    if (!projectId) { setLoadingProject(false); return }
    const p = getProject(projectId)
    if (p) {
      setInput({
        name: p.name, description: p.description || '',
        power_kw: p.power_kw, voltage: p.voltage, power_factor: p.power_factor,
        length_m: p.length_m, phases: p.phases, conductor_material: p.conductor_material,
        ambient_temp: p.ambient_temp, installation_method: p.installation_method,
        fault_current_origin_ka: p.fault_current_origin_ka ?? 10,
        fault_duration_s: p.fault_duration_s ?? 1,
        conduit_conductor_count: p.conduit_conductor_count ?? 3,
      })
    }
    setLoadingProject(false)
  }, [projectId])

  useEffect(() => {
    try {
      setResult(runFullCalculation(input))
      // eslint-disable-next-line no-empty
    } catch { setResult(null) }
  }, [input])

  const update = (k, v) => setInput((s) => ({ ...s, [k]: v }))

  const compliance = result ? evaluateCompliance(result.regulation) : null

  const handleSave = async () => {
    if (!input.name.trim()) { alert('Ingresa un nombre de proyecto'); return }
    setSaving(true)
    const payload = {
      id: projectId || undefined,
      name: input.name, description: input.description,
      power_kw: input.power_kw, voltage: input.voltage, power_factor: input.power_factor,
      length_m: input.length_m, phases: input.phases, conductor_material: input.conductor_material,
      ambient_temp: input.ambient_temp, installation_method: input.installation_method,
      result_current: result.current, result_conductor: result.conductor.size,
      result_voltage_drop: result.voltageDrop, result_regulation: result.regulation,
      result_breaker: result.breaker, status: compliance.status,
      result_short_circuit: result.shortCircuit.iscc_load_ka,
      result_conduit: result.conduit.selected.trade,
      result_grounding_conductor: result.grounding.groundingElectrodeConductor,
    }
    saveProject(payload)
    setSaving(false)
    navigate('/')
  }

  const reset = () => { setInput({ ...emptyInput, name: '', description: '' }); navigate('/calculator') }

  if (loadingProject) return <div className="p-8 text-slate-400 text-sm">Cargando proyecto…</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver a proyectos
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Calculadora de instalaciones</h1>
        <p className="text-sm text-slate-500 mt-1">Dimensionamiento de conductores y regulación de tensión</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Datos de entrada</h2>
          <div className="space-y-4">
            <Field label="Nombre del proyecto">
              <input value={input.name} onChange={(e) => update('name', e.target.value)}
                className="input" placeholder="Ej. Alimentador tablero principal" />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea value={input.description} onChange={(e) => update('description', e.target.value)}
                className="input min-h-[60px]" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Potencia (kW)">
                <input type="number" value={input.power_kw} onChange={(e) => update('power_kw', +e.target.value)} className="input" />
              </Field>
              <Field label="Tensión (V)">
                <input type="number" value={input.voltage} onChange={(e) => update('voltage', +e.target.value)} className="input" />
              </Field>
              <Field label="Factor de potencia">
                <input type="number" step="0.01" value={input.power_factor} onChange={(e) => update('power_factor', +e.target.value)} className="input" />
              </Field>
              <Field label="Distancia (m)">
                <input type="number" value={input.length_m} onChange={(e) => update('length_m', +e.target.value)} className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sistema">
                <select value={input.phases} onChange={(e) => update('phases', +e.target.value)} className="input">
                  <option value={1}>Monofásico</option>
                  <option value={3}>Trifásico</option>
                </select>
              </Field>
              <Field label="Material">
                <select value={input.conductor_material} onChange={(e) => update('conductor_material', e.target.value)} className="input">
                  <option value="copper">Cobre</option>
                  <option value="aluminum">Aluminio</option>
                </select>
              </Field>
              <Field label="Temp. ambiente (°C)">
                <select value={input.ambient_temp} onChange={(e) => update('ambient_temp', +e.target.value)} className="input">
                  {[21, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70].map((t) => (
                    <option key={t} value={t}>{t} °C</option>
                  ))}
                </select>
              </Field>
              <Field label="Método de instalación">
                <select value={input.installation_method} onChange={(e) => update('installation_method', e.target.value)} className="input">
                  {INSTALLATION_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="N° conductores en tubería">
                <input type="number" value={input.conduit_conductor_count} onChange={(e) => update('conduit_conductor_count', +e.target.value)} className="input" />
              </Field>
              <Field label="Icc en origen (kA)">
                <input type="number" value={input.fault_current_origin_ka} onChange={(e) => update('fault_current_origin_ka', +e.target.value)} className="input" />
              </Field>
              <Field label="Duración de falla (s)">
                <input type="number" step="0.1" value={input.fault_duration_s} onChange={(e) => update('fault_duration_s', +e.target.value)} className="input" />
              </Field>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          {result && (
            <>
              <ComplianceCard compliance={compliance} regulation={result.regulation} />

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Resultados eléctricos</h2>
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Corriente nominal" value={`${result.current} A`} accent="amber" />
                  <ResultCard label="Protección térmica" value={`${result.breaker} A`} accent="slate" />
                  <ResultCard label="Conductor seleccionado" value={result.conductor.size} sub={`${result.conductor.area_mm2} mm²`} accent="blue" />
                  <ResultCard label="Ampacidad corregida" value={`${result.correctedAmpacity} A`} accent="slate" />
                  <ResultCard label="Caída de tensión" value={`${result.voltageDrop} V`} accent="slate" />
                  <ResultCard label="Regulación" value={`${result.regulation} %`} accent={result.regulation > 3 ? 'red' : 'emerald'} />
                  <ResultCard label="Tensión en carga" value={`${result.voltageAtLoad} V`} accent="slate" />
                  <ResultCard label="Pérdidas (W)" value={`${result.powerLoss} W`} accent="slate" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">Factores de corrección aplicados</h2>
                <div className="text-xs text-slate-600 space-y-1.5">
                  <Row label="Factor por temperatura" value={`× ${result.tempFactor}`} />
                  <Row label="Factor por agrupamiento" value={`× ${result.methodDerating}`} />
                  <Row label="Resistencia (R)" value={`${result.resistance} Ω/km`} />
                  <Row label="Reactancia (X)" value={`${result.reactance} Ω/km`} />
                  <Row label="Factor de continuidad (125%)" value="aplicado" />
                </div>
              </div>

              <ShortCircuitResults data={result.shortCircuit} />
              <ConduitResults data={result.conduit} />
              <GroundingResults data={result.grounding} />

              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar proyecto'}
                </button>
                <button onClick={reset}
                  className="inline-flex items-center justify-center gap-2 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <RotateCcw className="w-4 h-4" /> Limpiar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function evaluateCompliance(regulation) {
  const limits = Object.entries(REGULATION_LIMITS).map(([k, v]) => ({ key: k, ...v }))
  const strictest = Math.min(...limits.map((l) => l.value))
  if (regulation <= strictest) return { status: 'compliant', label: 'Conforme con todas las normas', limits }
  const nonCompliant = limits.filter((l) => regulation > l.value)
  if (nonCompliant.length === limits.length) return { status: 'non_compliant', label: 'No conforme con todas las normas', limits }
  return { status: 'review', label: 'Requiere revisión según norma', limits }
}

function ComplianceCard({ compliance, regulation }) {
  const Icon = compliance.status === 'compliant' ? CheckCircle2 : AlertTriangle
  const colorMap = {
    compliant: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    review: 'bg-amber-50 border-amber-200 text-amber-700',
    non_compliant: 'bg-red-50 border-red-200 text-red-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${colorMap[compliance.status]}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium text-sm">{compliance.label}</div>
          <div className="text-xs mt-1 opacity-80">Regulación calculada: {regulation}%</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {compliance.limits.map((l) => (
              <span key={l.key} className={`text-[11px] px-2 py-0.5 rounded-full ${regulation <= l.value ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {l.label}: {l.value}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ label, value, sub, accent }) {
  const accents = {
    amber: 'border-amber-200 bg-amber-50', slate: 'border-slate-200 bg-slate-50',
    blue: 'border-blue-200 bg-blue-50', red: 'border-red-200 bg-red-50', emerald: 'border-emerald-200 bg-emerald-50',
  }
  return (
    <div className={`rounded-lg border p-3 ${accents[accent] ?? accents.slate}`}>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-900 mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
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
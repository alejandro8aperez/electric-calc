import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Gauge, Fuel, BatteryCharging } from 'lucide-react'
import { calcMotor } from '@/lib/motorCalc'
import { calcGenerator, calcUps } from '@/lib/generatorCalc'
import { STARTING_METHODS } from '@/lib/electricalData'
import { DEMO } from '@/lib/demo'
import { useI18n } from '@/lib/i18n'
import { Field, SummaryCard, Row, Panel as Card } from '@/components/ui/kit'

const TABS = ['motor', 'generator', 'ups']

export default function Motors() {
  const { t } = useI18n()
  const [tab, setTab] = useState('motor')

  const tabs = [
    { id: 'motor', label: t('motors.motorTab'), icon: Gauge },
    { id: 'generator', label: t('motors.generatorTab'), icon: Fuel },
    { id: 'ups', label: t('motors.upsTab'), icon: BatteryCharging },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t('motors.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('motors.subtitle')}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'motor' && <MotorTab />}
      {tab === 'generator' && <GeneratorTab />}
      {tab === 'ups' && <UpsTab />}
    </div>
  )
}

function MotorTab() {
  const { t } = useI18n()
  const [input, setInput] = useState({
    power_kw: 37, voltage: 440, phases: 3, power_factor: 0.87, efficiency: 0.92,
    starting_method: 'DOL', source_icc_ka: 10, length_m: 40, ambient_temp: 30,
    dip_limit: 15, service_factor: 1,
  })
  const set = (k, v) => setInput((s) => ({ ...s, [k]: v }))
  const r = useMemo(() => calcMotor(input), [input])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title={t('common.inputs')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Potencia (kW)"><input type="number" className="input" value={input.power_kw} onChange={(e) => set('power_kw', +e.target.value)} /></Field>
          <Field label="Tensión (V)"><input type="number" className="input" value={input.voltage} onChange={(e) => set('voltage', +e.target.value)} /></Field>
          <Field label="FP"><input type="number" step="0.01" className="input" value={input.power_factor} onChange={(e) => set('power_factor', +e.target.value)} /></Field>
          <Field label="Rendimiento"><input type="number" step="0.01" className="input" value={input.efficiency} onChange={(e) => set('efficiency', +e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label={t('motors.starting')}>
              <select className="input" value={input.starting_method} onChange={(e) => set('starting_method', e.target.value)}>
                {STARTING_METHODS.map((s) => <option key={s.id} value={s.id}>{s.label} ({s.startMultiple}×)</option>)}
              </select>
            </Field>
          </div>
          <Field label="Icc en el punto (kA)"><input type="number" className="input" value={input.source_icc_ka} onChange={(e) => set('source_icc_ka', +e.target.value)} /></Field>
          <Field label="Longitud (m)"><input type="number" className="input" value={input.length_m} onChange={(e) => set('length_m', +e.target.value)} /></Field>
          <Field label="ΔU máx. arranque (%)"><input type="number" className="input" value={input.dip_limit} onChange={(e) => set('dip_limit', +e.target.value)} /></Field>
          <Field label="Factor de servicio"><input type="number" step="0.05" className="input" value={input.service_factor} onChange={(e) => set('service_factor', +e.target.value)} /></Field>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="FLA" value={`${r.fla} A`} accent="amber" />
          <SummaryCard label={t('motors.startCurrent')} value={`${r.startingCurrent} A`} />
          <SummaryCard label={t('motors.dip')} value={`${r.voltageDip} %`} accent={r.voltageDip > r.dipLimit ? 'red' : 'emerald'} />
          <SummaryCard label={t('motors.contactor')} value={typeof r.contactor === 'number' ? `${r.contactor} A` : r.contactor} />
        </div>
        <Card title="Protección y cable">
          <div className="text-xs text-slate-600 space-y-2">
            <Row label="Cable (125 % FLA)" value={`${r.cable.size} mm² · PE ${r.cable.pe}`} />
            <Row label="Iz corregida" value={`${r.cable.correctedAmpacity} A`} />
            <Row label="Interruptor" value={`${r.breaker} A · curva ${r.curve}`} />
            <Row label={t('motors.thermalSetting')} value={`${r.thermalSetting} A`} />
            <Row label="Umbral magnético" value={`${r.magneticThreshold} A`} />
          </div>
        </Card>
        <Checks checks={r.checks} />
        <p className="text-[11px] text-slate-400">{DEMO.motorNote}</p>
      </div>
    </div>
  )
}

function GeneratorTab() {
  const { t } = useI18n()
  const [input, setInput] = useState({
    running_load_kw: 200, power_factor: 0.8, largest_motor_kw: 37,
    motor_efficiency: 0.9, motor_pf: 0.87, starting_method: 'DOL',
    future_growth: 10, load_factor: 1, voltage: 440,
  })
  const set = (k, v) => setInput((s) => ({ ...s, [k]: v }))
  const r = useMemo(() => calcGenerator(input), [input])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title={t('common.inputs')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carga continua (kW)"><input type="number" className="input" value={input.running_load_kw} onChange={(e) => set('running_load_kw', +e.target.value)} /></Field>
          <Field label="FP"><input type="number" step="0.01" className="input" value={input.power_factor} onChange={(e) => set('power_factor', +e.target.value)} /></Field>
          <Field label="Motor mayor (kW)"><input type="number" className="input" value={input.largest_motor_kw} onChange={(e) => set('largest_motor_kw', +e.target.value)} /></Field>
          <div>
            <Field label={t('motors.starting')}>
              <select className="input" value={input.starting_method} onChange={(e) => set('starting_method', e.target.value)}>
                {STARTING_METHODS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Reserva (%)"><input type="number" className="input" value={input.future_growth} onChange={(e) => set('future_growth', +e.target.value)} /></Field>
          <Field label="Tensión (V)"><input type="number" className="input" value={input.voltage} onChange={(e) => set('voltage', +e.target.value)} /></Field>
        </div>
      </Card>
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs text-amber-700 font-medium">{t('motors.ratedGen')}</div>
          <div className="text-3xl font-bold text-slate-900">{r.ratedKva} kVA</div>
          <div className="text-xs text-slate-500 mt-1">{r.ratedKw} kW · requerido {r.requiredKva} kVA</div>
        </div>
        <Card title={t('common.results')}>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Carga continua" value={`${r.runningKva} kVA`} />
            <SummaryCard label={t('motors.transient')} value={`${r.transientLoading} %`} accent={r.transientLoading > 100 ? 'red' : 'emerald'} />
            <SummaryCard label="In generador" value={`${r.iNominal} A`} />
            <SummaryCard label="Protección principal" value={`${r.mainBreaker} A`} />
            <SummaryCard label={t('motors.fuel')} value={`${r.fuelLph} L/h`} />
            <SummaryCard label="Arranque motor" value={r.starting} />
          </div>
        </Card>
        <p className="text-[11px] text-slate-400">{DEMO.generatorNote}</p>
      </div>
    </div>
  )
}

function UpsTab() {
  const { t } = useI18n()
  const [input, setInput] = useState({
    critical_kw: 20, power_factor: 0.9, autonomy_min: 15, dc_bus_voltage: 240,
    inverter_efficiency: 0.94, battery_efficiency: 0.9, depth_of_discharge: 0.8,
    sizing_margin: 0.25, block_ah: 100,
  })
  const set = (k, v) => setInput((s) => ({ ...s, [k]: v }))
  const r = useMemo(() => calcUps(input), [input])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title={t('common.inputs')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carga crítica (kW)"><input type="number" className="input" value={input.critical_kw} onChange={(e) => set('critical_kw', +e.target.value)} /></Field>
          <Field label="FP"><input type="number" step="0.01" className="input" value={input.power_factor} onChange={(e) => set('power_factor', +e.target.value)} /></Field>
          <Field label={t('motors.autonomy')}><input type="number" className="input" value={input.autonomy_min} onChange={(e) => set('autonomy_min', +e.target.value)} /></Field>
          <Field label={t('motors.dcBus')}><input type="number" className="input" value={input.dc_bus_voltage} onChange={(e) => set('dc_bus_voltage', +e.target.value)} /></Field>
          <Field label="Rend. inversor"><input type="number" step="0.01" className="input" value={input.inverter_efficiency} onChange={(e) => set('inverter_efficiency', +e.target.value)} /></Field>
          <Field label="DoD"><input type="number" step="0.05" className="input" value={input.depth_of_discharge} onChange={(e) => set('depth_of_discharge', +e.target.value)} /></Field>
          <Field label="Bloque (Ah @12 V)"><input type="number" className="input" value={input.block_ah} onChange={(e) => set('block_ah', +e.target.value)} /></Field>
          <Field label="Margen dimensionamiento"><input type="number" step="0.05" className="input" value={input.sizing_margin} onChange={(e) => set('sizing_margin', +e.target.value)} /></Field>
        </div>
      </Card>
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs text-amber-700 font-medium">UPS</div>
          <div className="text-3xl font-bold text-slate-900">{r.ratedKva} kVA</div>
          <div className="text-xs text-slate-500 mt-1">requerido {r.requiredKva} kVA</div>
        </div>
        <Card title="Banco de baterías">
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Energía" value={`${r.energyKwh} kWh`} accent="blue" />
            <SummaryCard label={t('motors.requiredAh')} value={`${r.installedAh} Ah`} sub={`req. ${r.requiredAh} Ah`} accent="amber" />
            <SummaryCard label={t('motors.blocks')} value={`${r.totalBlocks} (${r.blocksPerString}/string)`} />
            <SummaryCard label="Strings" value={`${r.strings}`} />
            <SummaryCard label="Descarga" value={`${r.dischargeA} A`} />
            <SummaryCard label="Recarga" value={`${r.chargeA} A`} />
          </div>
        </Card>
        <p className="text-[11px] text-slate-400">{DEMO.upsNote}</p>
      </div>
    </div>
  )
}

function Checks({ checks }) {
  const { t } = useI18n()
  return (
    <Card title={t('common.compliance')}>
      <ul className="text-xs space-y-1.5">
        {Object.entries(checks).filter(([, v]) => typeof v === 'boolean').map(([k, v]) => (
          <li key={k} className={v ? 'text-emerald-700' : 'text-red-700'}>
            {v ? '✓' : '✗'} {checks[`${k}Detail`]}
          </li>
        ))}
      </ul>
    </Card>
  )
}

import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Download, Upload, RotateCcw, Search } from 'lucide-react'
import { FAMILIES, MANUFACTURERS, familyLabel } from '@/lib/catalogData'
import {
  loadCatalog, upsertDevice, removeDevice, resetCatalog,
  exportCatalogCsv, importCatalogCsv, exportCatalogJson, importCatalogJson,
  getCurrency, setCurrency,
} from '@/lib/catalogStore'
import { useI18n } from '@/lib/i18n'
import { Panel as Card } from '@/components/ui/kit'

const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL']

const emptyDevice = () => ({
  family: 'MCB', manufacturer: 'Genérico', series: '', reference: '',
  description: '', rating_A: 16, poles: 1, curve: 'C', breaking_capacity_kA: 6,
  sensitivity_mA: '', rcd_type: '', price: 0, unit: 'u',
})

export default function Catalog() {
  const { t } = useI18n()
  const [catalog, setCatalog] = useState(() => loadCatalog())
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('')
  const [currency, setCur] = useState(() => getCurrency())
  const [draft, setDraft] = useState(null)
  const csvInput = useRef(null)
  const jsonInput = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((d) => {
      if (family && d.family !== family) return false
      if (!q) return true
      return `${d.reference} ${d.description} ${d.manufacturer} ${d.series}`.toLowerCase().includes(q)
    })
  }, [catalog, query, family])

  const counts = useMemo(() => {
    const c = {}
    for (const d of catalog) c[d.family] = (c[d.family] ?? 0) + 1
    return c
  }, [catalog])

  const changeCurrency = (code) => { setCur(code); setCurrency(code) }

  const handleAdd = () => {
    if (!draft?.reference?.trim()) return
    setCatalog(upsertDevice(catalog, draft))
    setDraft(null)
  }

  const handleExportCsv = () => download('catalogo.csv', exportCatalogCsv(catalog), 'text/csv')
  const handleExportJson = () => download('catalogo.json', exportCatalogJson(catalog), 'application/json')

  const handleImport = (e, kind) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      setCatalog(kind === 'csv' ? importCatalogCsv(text, catalog) : importCatalogJson(text))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('catalog.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('catalog.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input !w-auto" value={currency} onChange={(e) => changeCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setDraft(emptyDevice())} className="btn-dark"><Plus className="w-4 h-4" /> {t('catalog.add')}</button>
          <button onClick={handleExportCsv} className="btn-ghost"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={handleExportJson} className="btn-ghost"><Download className="w-4 h-4" /> JSON</button>
          <button onClick={() => csvInput.current?.click()} className="btn-ghost"><Upload className="w-4 h-4" /> CSV</button>
          <button onClick={() => jsonInput.current?.click()} className="btn-ghost"><Upload className="w-4 h-4" /> JSON</button>
          <button onClick={() => { if (confirm(t('catalog.confirmReset'))) setCatalog(resetCatalog()) }} className="btn-ghost"><RotateCcw className="w-4 h-4" /></button>
          <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleImport(e, 'csv')} />
          <input ref={jsonInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => handleImport(e, 'json')} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        {FAMILIES.map((f) => (
          <button key={f.id} onClick={() => setFamily(family === f.id ? '' : f.id)}
            className={`text-left rounded-lg border p-3 transition-colors ${family === f.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="text-lg font-semibold text-slate-900">{counts[f.id] ?? 0}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{f.label}</div>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input !pl-9" placeholder={t('catalog.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="input !w-auto" value={family} onChange={(e) => setFamily(e.target.value)}>
            <option value="">{t('catalog.allFamilies')}</option>
            {FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} / {catalog.length}</span>
        </div>

        {draft && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <select className="input" value={draft.family} onChange={(e) => setDraft({ ...draft, family: e.target.value })}>
              {FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <select className="input" value={draft.manufacturer} onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })}>
              {MANUFACTURERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input" placeholder="Serie" value={draft.series} onChange={(e) => setDraft({ ...draft, series: e.target.value })} />
            <input className="input" placeholder="Referencia *" value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} />
            <input className="input" placeholder="Descripción" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <input type="number" className="input" placeholder="In (A)" value={draft.rating_A} onChange={(e) => setDraft({ ...draft, rating_A: +e.target.value })} />
            <input type="number" className="input" placeholder="Polos" value={draft.poles} onChange={(e) => setDraft({ ...draft, poles: +e.target.value })} />
            <input type="number" className="input" placeholder="Icu (kA)" value={draft.breaking_capacity_kA} onChange={(e) => setDraft({ ...draft, breaking_capacity_kA: +e.target.value })} />
            <input type="number" className="input" placeholder={`Precio (${currency})`} value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} />
            <div className="flex items-center gap-2">
              <button onClick={handleAdd} className="btn-dark"><Plus className="w-4 h-4" /> {t('catalog.add')}</button>
              <button onClick={() => setDraft(null)} className="btn-ghost">{t('common.reset')}</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 px-2 font-medium">{t('catalog.reference')}</th>
                <th className="py-2 px-2 font-medium">Familia</th>
                <th className="py-2 px-2 font-medium">In (A)</th>
                <th className="py-2 px-2 font-medium">Polos</th>
                <th className="py-2 px-2 font-medium">Curva</th>
                <th className="py-2 px-2 font-medium">Icu (kA)</th>
                <th className="py-2 px-2 font-medium">{t('catalog.price')} ({currency})</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-1.5 px-2">
                    <input className="input !py-1 !text-xs" value={d.reference}
                      onChange={(e) => setCatalog(upsertDevice(catalog, { ...d, reference: e.target.value }))} />
                  </td>
                  <td className="py-1.5 px-2 text-slate-500">{familyLabel(d.family)}</td>
                  <td className="py-1.5 px-2 text-slate-700">{d.rating_A ?? '—'}</td>
                  <td className="py-1.5 px-2 text-slate-700">{d.poles ?? '—'}</td>
                  <td className="py-1.5 px-2 text-slate-700">{d.curve ?? '—'}</td>
                  <td className="py-1.5 px-2 text-slate-700">{d.breaking_capacity_kA ?? '—'}</td>
                  <td className="py-1.5 px-2">
                    <input type="number" className="input !py-1 !text-xs !w-24" value={d.price ?? 0}
                      onChange={(e) => setCatalog(upsertDevice(catalog, { ...d, price: +e.target.value }))} />
                  </td>
                  <td className="py-1.5 px-2">
                    <button onClick={() => setCatalog(removeDevice(catalog, d.id))} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 500 && <p className="text-[11px] text-slate-400 mt-2 px-2">{t('catalog.truncated')}</p>}
        </div>
      </Card>
    </div>
  )
}

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

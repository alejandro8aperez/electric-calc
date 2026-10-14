import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Zap, LayoutGrid, Calculator, ShieldCheck, Cpu, Gauge, FileText } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function Layout() {
  const { t, lang, setLang } = useI18n()

  const navItems = [
    { to: '/', label: t('nav.projects'), icon: LayoutGrid, end: true },
    { to: '/panel', label: t('nav.panel'), icon: Zap },
    { to: '/calculator', label: t('nav.calculator'), icon: Calculator },
    { to: '/transformer', label: t('nav.transformer'), icon: Cpu },
    { to: '/motors', label: t('nav.motors'), icon: Gauge },
    { to: '/coordination', label: t('nav.coordination'), icon: ShieldCheck },
    { to: '/report', label: t('nav.report'), icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-tight">{t('app.name')}</div>
              <div className="text-[11px] text-slate-500 leading-tight hidden sm:block">{t('app.tagline')}</div>
            </div>
          </div>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 shrink-0">
            {['es', 'en'].map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2 py-1 text-xs font-medium rounded-md uppercase ${lang === l ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400 print:hidden">
        {t('app.footer')}
      </footer>
    </div>
  )
}

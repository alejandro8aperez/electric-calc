import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Zap, Calculator, ShieldCheck } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Proyectos', icon: Zap, end: true },
  { to: '/calculator', label: 'Calculadora', icon: Calculator },
  { to: '/coordination', label: 'Coordinación', icon: ShieldCheck },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-tight">Electric Calc</div>
              <div className="text-[11px] text-slate-500 leading-tight">IEEE · NEC · RETIE · IEC</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="max-w-6xl mx-auto px-8 py-6 text-center text-xs text-slate-400">
        Calculadora eléctrica · Autónoma, sin conexión a backend
      </footer>
    </div>
  )
}
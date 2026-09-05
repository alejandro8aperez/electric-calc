import React from 'react'
import { Link } from 'react-router-dom'

export default function PageNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="text-6xl font-bold text-slate-200 mb-4">404</div>
      <h1 className="text-lg font-medium text-slate-900 mb-2">Página no encontrada</h1>
      <p className="text-sm text-slate-500 mb-6">La ruta que buscas no existe.</p>
      <Link to="/" className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
        Volver al inicio
      </Link>
    </div>
  )
}
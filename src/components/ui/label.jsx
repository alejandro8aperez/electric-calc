import React from 'react'

export function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 mb-1.5">
      {children}
    </label>
  )
}

import type { ReactNode } from 'react'

export function Field({ id, label, hint, error, warnings = [], children }: { id: string; label: string; hint?: ReactNode; error?: string; warnings?: string[]; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-xs text-slate-600">{hint}</p>}
      <div id={`${id}-err`}>
        {error && <p role="alert" className="text-xs font-medium text-red-800">⚠ {error}</p>}
        {warnings.map((w) => <p key={w} className="text-xs text-amber-900">⚠ {w}</p>)}
      </div>
    </div>
  )
}

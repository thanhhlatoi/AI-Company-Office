import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Secret } from '../../types/tools'
import { fieldsOf, type Field } from './schemaForm'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none'

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => { const v = draft.trim(); if (v && !value.includes(v)) onChange([...value, v]); setDraft('') }
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input className={input} aria-label={`Thêm vào ${label}`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Nhập rồi Enter" />
        <button type="button" onClick={add} className="rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50">Thêm</button>
      </div>
      {value.length === 0 ? <p className="text-xs text-slate-700">Chưa có mục nào.</p> : (
        <ul className="flex flex-wrap gap-1.5">{value.map((v) => <li key={v} className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2 pr-1 text-xs">{v}<button type="button" aria-label={`Bỏ ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="rounded-full px-1 hover:bg-slate-300">×</button></li>)}</ul>
      )}
    </div>
  )
}

function Control({ f, value, set, secrets }: { f: Field; value: unknown; set: (v: unknown) => void; secrets: Secret[] }) {
  const id = `f-${f.key}`
  switch (f.kind) {
    case 'string': return <input id={id} className={input} value={String(value ?? '')} onChange={(e) => set(e.target.value)} />
    case 'enum': return <select id={id} className={input} value={String(value ?? '')} onChange={(e) => set(e.target.value)}><option value="">Chọn…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
    case 'secret': {
      const own = secrets.filter((s) => s.kind === f.secretKind)
      return own.length
        ? <select id={id} className={input} value={String(value ?? '')} onChange={(e) => set(e.target.value)}><option value="">Chọn tài khoản…</option>{own.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        : <p className="text-sm text-slate-700">Chưa có bí mật loại “{f.secretKind}”. <Link className="underline" to="/settings/secrets">Tạo ở trang Bí mật</Link></p>
    }
    case 'integer': case 'number': return <input id={id} type="number" inputMode="decimal" min={f.min} max={f.max} step={f.kind === 'integer' ? 1 : 'any'} className={input} value={value === undefined || value === null ? '' : String(value)} onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))} />
    case 'boolean': return <input id={id} type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
    case 'list': return <ListField label={f.title} value={Array.isArray(value) ? value.map(String) : []} onChange={set} />
    default: return <pre className="overflow-auto rounded-lg bg-slate-50 p-2 text-xs">{JSON.stringify(value ?? f.def ?? null, null, 1)}</pre>
  }
}

/** Biểu mẫu PHẠM VI sinh từ JSON Schema của công cụ. Bí mật chỉ CHỌN từ danh sách, không gõ. */
export function SchemaForm({ schema, value, onChange, errors, secrets }: { schema: Record<string, unknown>; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; errors: Record<string, string>; secrets: Secret[] }) {
  const fields = fieldsOf(schema)
  if (!fields.length) return <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">Công cụ này không có phạm vi cần cấu hình.</p>
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label htmlFor={`f-${f.key}`} className="mb-1 block text-sm font-medium">{f.title}{f.required && <span className="text-red-700"> *</span>}</label>
          <Control f={f} value={value[f.key]} set={(v) => onChange({ ...value, [f.key]: v })} secrets={secrets} />
          {f.description && <p className="mt-0.5 text-xs text-slate-700">{f.description}</p>}
          {errors[f.key] && <p role="alert" className="mt-0.5 text-xs font-medium text-red-700">{errors[f.key]}</p>}
        </div>
      ))}
    </div>
  )
}

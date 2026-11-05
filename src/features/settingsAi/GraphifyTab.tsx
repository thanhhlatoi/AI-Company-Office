import { Check, Copy, Info, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { buildCommands, CHECKLIST, DEFAULT_IGNORE, parseChecked, type Mode, type Os } from './graphify'
import { INPUT } from './fieldProps'
import type { DraftForm } from './useDraft'

const MODES: [Mode, string][] = [['code', 'Chỉ code, offline'], ['ollama', 'Dùng Ollama đọc tài liệu'], ['none', 'Tắt LLM']]
const OSES: [Os, string][] = [['unix', 'Linux / macOS'], ['powershell', 'PowerShell (Windows)']]
const CK = 'agentoffice.graphifyChecklist' // chỉ chứa id các ô đã tick, không nhạy cảm

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState('ok') } catch { setState('fail') } // clipboard cần HTTPS hoặc localhost
    setTimeout(() => setState('idle'), 2500)
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={() => void copy()} aria-label={label} className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">{state === 'ok' ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}Sao chép</button>
      <span aria-live="polite" className="text-xs text-slate-700">{state === 'ok' ? 'Đã chép' : state === 'fail' ? 'Không chép được, hãy bôi đen và chép tay' : ''}</span>
    </span>
  )
}

function Radios<T extends string>({ legend, name, value, options, onChange }: { legend: string; name: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map(([v, l]) => <label key={v} className="flex items-center gap-1.5 text-sm"><input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />{l}</label>)}
      </div>
    </fieldset>
  )
}

export function GraphifyTab({ f }: { f: DraftForm }) {
  const [mode, setMode] = useState<Mode>('code')
  const [os, setOs] = useState<Os>(() => (typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent) ? 'powershell' : 'unix'))
  const [ignore, setIgnore] = useState(DEFAULT_IGNORE)
  const [checked, setChecked] = useState<string[]>(() => { try { return parseChecked(localStorage.getItem(CK)) } catch { return [] } })
  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]
    setChecked(next)
    try { localStorage.setItem(CK, JSON.stringify(next)) } catch { /* không lưu được thì thôi */ }
  }
  const blocks = buildCommands(mode, os, f.draft['ollama.baseUrl'])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-card border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p><strong>Graphify giúp bạn và trợ lý AI (Claude Code, Cursor...) hiểu code nhanh, đỡ tốn token.</strong> Nó chạy trên máy lập trình, <strong>KHÔNG chạy trong BE</strong> và không thay đổi cách agent hoạt động. Màn này chỉ tạo lệnh để bạn tự chạy; không cài, không chạy, không ghi file nào.</p>
      </div>

      <section className="space-y-3 rounded-card border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Tạo lệnh</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Radios legend="Chế độ" name="gf-mode" value={mode} options={MODES} onChange={setMode} />
          <Radios legend="Hệ điều hành" name="gf-os" value={os} options={OSES} onChange={setOs} />
        </div>
        {mode === 'ollama' && <p className="text-xs text-slate-600">Địa chỉ Ollama lấy từ tab Ollama (đã bỏ đuôi /v1).</p>}
        {blocks.map((b) => {
          const text = b.lines.join('\n')
          return (
            <div key={b.title} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{b.title}</h3><CopyButton text={text} label={`Sao chép lệnh: ${b.title}`} /></div>
              {b.note && <p className="text-xs text-slate-600">{b.note}</p>}
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100"><code>{text}</code></pre>
            </div>
          )
        })}
      </section>

      <section className="space-y-2 rounded-card border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Tệp .graphifyignore</h2>
        <p className="text-sm text-slate-700">Loại bỏ thư mục build và dữ liệu nhạy cảm khỏi đồ thị. Sao chép rồi lưu thành <code>.graphifyignore</code> ở gốc dự án (màn này không ghi file).</p>
        <label htmlFor="gf-ignore" className="sr-only">Nội dung .graphifyignore</label>
        <textarea id="gf-ignore" value={ignore} onChange={(e) => setIgnore(e.target.value)} rows={12} spellCheck={false} className={`${INPUT} font-mono`} />
        <div className="flex flex-wrap items-center gap-3"><CopyButton text={ignore} label="Sao chép nội dung .graphifyignore" /><button onClick={() => setIgnore(DEFAULT_IGNORE)} className="text-xs underline">Khôi phục mặc định</button></div>
      </section>

      <div className="flex items-start gap-2 rounded-card border-2 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
        <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p><strong>Lưu ý riêng tư:</strong> tài liệu và PDF đưa vào Graphify có thể được gửi tới model ở backend bạn chọn. Muốn giữ nội bộ, dùng chế độ “Dùng Ollama” (model chạy trên máy của bạn) hoặc “Chỉ code”.</p>
      </div>

      <section className="space-y-2 rounded-card border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Tiến trình của bạn</h2>
        <ul className="space-y-1">
          {CHECKLIST.map((c) => <li key={c.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked.includes(c.id)} onChange={() => toggle(c.id)} className="size-4" />{c.label}</label></li>)}
        </ul>
        <p className="text-xs text-slate-600">Chỉ lưu các ô đã tick trong trình duyệt này, không có thông tin nhạy cảm.</p>
      </section>

      <p className="text-xs text-slate-600">Chưa kiểm chứng trên máy bạn; xem <a href="https://docs.graphify.com" target="_blank" rel="noopener noreferrer" className="underline">docs.graphify.com</a>. Việc cho BE dùng đồ thị lúc chạy (MCP/Neo4j) là hướng mở rộng, chưa có trong màn này.</p>
    </div>
  )
}

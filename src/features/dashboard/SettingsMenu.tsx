import { Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'

/** Menu bánh răng: công tắc đi lại ngẫu nhiên (mô phỏng) và tốc độ đi. Lưu trong localStorage. */
export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const { randomWalk, walkSpeed, showVnd, vndRate, update } = useSettingsStore()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true) }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button aria-label="Cài đặt" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50">
        <Settings size={16} />
      </button>
      {open && (
        <div role="dialog" aria-label="Cài đặt" className="absolute right-0 top-11 z-40 w-72 space-y-4 rounded-card border border-slate-200 bg-white p-4 text-sm shadow-xl">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={randomWalk} onChange={(e) => update({ randomWalk: e.target.checked })} className="mt-1 size-4" />
            <span>
              <span className="block font-medium">Đi lại ngẫu nhiên khi rảnh</span>
              <span className="block text-xs text-slate-600">Mô phỏng cho văn phòng sinh động (pha cà phê, ghé bàn đồng nghiệp), tối đa 2 người cùng lúc. Không phải việc thật.</span>
            </span>
          </label>
          <label className="block">
            <span className="mb-1 flex justify-between font-medium"><span>Tốc độ đi</span><span className="tabular-nums text-slate-600">{walkSpeed} px/giây</span></span>
            <input type="range" min={60} max={180} step={10} value={walkSpeed} onChange={(e) => update({ walkSpeed: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="block">
            <span className="flex items-center gap-2 font-medium"><input type="checkbox" checked={showVnd} onChange={(e) => update({ showVnd: e.target.checked })} className="size-4" /> Hiện thêm tiền đồng (≈ đ)</span>
            <span className="mt-1 flex items-center gap-2 pl-6 text-xs text-slate-600">Tỉ giá <input type="number" min={1} step={100} value={vndRate} disabled={!showVnd} aria-label="Tỉ giá đồng trên đô la" onChange={(e) => Number(e.target.value) > 0 && update({ vndRate: Number(e.target.value) })} className="w-24 rounded border border-slate-300 px-1.5 py-0.5 disabled:opacity-50" /> đ/USD</span>
          </label>
          <Link to="/settings/notifications" onClick={() => setOpen(false)} className="block rounded-lg border border-slate-300 px-3 py-2 text-center font-medium hover:bg-slate-50">Cài đặt thông báo…</Link>
          <Link to="/settings/ai" onClick={() => setOpen(false)} className="block rounded-lg border border-slate-300 px-3 py-2 text-center font-medium hover:bg-slate-50">Cài đặt AI…</Link>
        </div>
      )}
    </div>
  )
}

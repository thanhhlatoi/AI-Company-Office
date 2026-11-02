import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DepartmentIcon } from '../../components/DepartmentIcon'
import { useAgentStore } from '../../store/agentStore'
import { useDepartmentStore } from '../../store/departmentStore'
import { useUiStore } from '../../store/uiStore'

/** Bỏ dấu tiếng Việt + chữ thường, để gõ "ke toan" vẫn tìm ra "Kế toán". */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()

interface Item { key: string; label: string; sub: string; to: string; icon: ReactNode }

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen)
  return open ? <Palette /> : null
}

function Palette() {
  const close = () => useUiStore.getState().setPalette(false)
  const navigate = useNavigate()
  const departments = useDepartmentStore((s) => s.departmentsById)
  const agents = useAgentStore((s) => s.agentsById)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  const items = useMemo<Item[]>(() => {
    const nq = norm(q.trim())
    const depts = Object.values(departments).sort((a, b) => a.order - b.order)
    const out: Item[] = depts
      .filter((d) => !nq || norm(d.name).includes(nq))
      .map((d) => ({ key: `d${d.id}`, label: d.name, sub: 'Phòng ban', to: `/department/${d.slug}`, icon: <DepartmentIcon name={d.icon} size={18} /> }))
    if (nq) {
      for (const a of Object.values(agents)) {
        const d = a.departmentId ? departments[a.departmentId] : undefined
        if (!d || !norm(`${a.name} ${a.role} ${d.name}`).includes(nq)) continue
        out.push({ key: `a${a.id}`, label: a.name, sub: `${a.role} · ${d.name}`, to: `/department/${d.slug}/agent/${a.id}`, icon: <Avatar name={a.name} color={a.color} size={22} /> })
        if (out.length >= 12) break
      }
    }
    return out
  }, [q, departments, agents])

  const go = (item?: Item) => { if (!item) return; close(); navigate(item.to) }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % Math.max(1, items.length)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + items.length) % Math.max(1, items.length)) }
    else if (e.key === 'Enter') go(items[active])
    else if (e.key === 'Escape') close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[15vh]" onMouseDown={close}>
      <div role="dialog" aria-modal="true" aria-label="Tìm kiếm" className="w-full max-w-lg overflow-hidden rounded-card bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[active] ? `palette-${items[active].key}` : undefined}
          aria-label="Tìm agent hoặc phòng ban"
          placeholder="Tìm agent hoặc phòng ban…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0) }}
          onKeyDown={onKey}
          className="w-full border-b border-slate-200 px-4 py-3 text-sm focus:outline-none"
        />
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-1">
          {items.map((it, i) => (
            <li key={it.key} id={`palette-${it.key}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(it)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === active ? 'bg-brand/10' : ''}`}>
              {it.icon}
              <span className="font-medium">{it.label}</span>
              <span className="ml-auto truncate text-xs text-slate-600">{it.sub}</span>
            </li>
          ))}
          {!items.length && <li className="px-3 py-6 text-center text-sm text-slate-600">Không tìm thấy kết quả.</li>}
        </ul>
      </div>
    </div>
  )
}

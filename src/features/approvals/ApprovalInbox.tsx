import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErrorBanner } from '../../components/ErrorBanner'
import { PANEL_CLASS } from '../../components/panelStyles'
import { loadSnapshot } from '../../realtime/eventSync'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'
import { ApprovalCard } from './ApprovalCard'
import { BlockedBudgets } from '../costs/BlockedBudgets'
import { useBlockedBudgets } from '../costs/hooks'
import { useApprovalLists } from './hooks'
import { MemoryPendingCard } from '../memory/MemoryPendingCard'
import { usePendingMemory } from '../studio/queries'

// Rộng hơn panel thường để nội dung hành động đọc được, không bị cắt
const INBOX_CLASS = PANEL_CLASS.replace('lg:w-[380px]', 'lg:w-[460px]')

/** Ngăn phải "Hộp thư phê duyệt": đang chờ + lịch sử. */
export function ApprovalInbox({ onClose }: { onClose: () => void }) {
  const focusId = useUiStore((s) => s.inbox.focusId)
  const sync = useWorkStore((s) => s.sync)
  const total = useWorkStore((s) => Object.keys(s.approvalsById).length)
  const status = useWorkStore((s) => (focusId ? s.approvalsById[focusId]?.status : undefined))
  const { pending, history } = useApprovalLists()
  // Tab tự chọn theo yêu cầu đang tô nổi; người dùng bấm tab thì ưu tiên lựa chọn đó cho tới khi tô nổi yêu cầu khác
  const [picked, setPicked] = useState<{ tab: 'pending' | 'history' | 'budget' | 'memory'; focusId: string | null } | null>(null)
  const tab = picked && picked.focusId === focusId ? picked.tab : status && status !== 'PENDING' ? 'history' : 'pending'
  const blocked = useBlockedBudgets().data ?? []
  const memPending = usePendingMemory().data ?? 0
  const root = useRef<HTMLElement>(null)

  useEffect(() => { root.current?.focus() }, [])
  // Bấm nhân vật / "Xem và duyệt": cuộn tới đúng yêu cầu
  useEffect(() => {
    if (!focusId) return
    requestAnimationFrame(() => document.getElementById(`approval-${focusId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [focusId, status])

  const list = tab === 'history' ? history : tab === 'pending' ? pending : []
  const other = tab === 'budget' || tab === 'memory'
  const loading = sync === 'loading' && total === 0
  return (
    <aside ref={root} tabIndex={-1} aria-label="Hộp thư phê duyệt" className={`${INBOX_CLASS} outline-none`}>
      <div className="flex items-center border-b border-slate-200 px-2">
        <div role="tablist" className="flex flex-1">
          {([['pending', `Đang chờ (${pending.length})`], ['budget', `Ngân sách (${blocked.length})`], ['memory', `Ký ức (${memPending})`], ['history', 'Lịch sử']] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setPicked({ tab: key, focusId })}
              className={`border-b-2 px-2.5 py-3 text-base ${tab === key ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
        <button aria-label="Đóng hộp thư" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={20} /></button>
      </div>
      {sync === 'error' && <ErrorBanner message="Không tải được các yêu cầu phê duyệt." onRetry={() => void loadSnapshot()} />}
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4" aria-busy={loading}>
        {loading && Array.from({ length: 2 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-card bg-slate-200" />)}
        {tab === 'budget' && <BlockedBudgets />}
        {tab === 'memory' && <MemoryPendingCard onNavigate={onClose} />}
        {!other && !loading && list.length === 0 && (
          <p className="py-10 text-center text-base text-slate-600">
            {tab === 'pending' ? 'Không có yêu cầu nào đang chờ duyệt.' : 'Chưa có yêu cầu nào đã xử lý.'}
          </p>
        )}
        {!other && !loading && list.map((a) => <ApprovalCard key={a.id} approval={a} focused={a.id === focusId} />)}
      </div>
    </aside>
  )
}

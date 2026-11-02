import { ConversationList } from '../features/history/ConversationList'
import { ConversationViewer } from '../features/history/ConversationViewer'
import { useHistoryFilters } from '../features/history/filters'
import { HistoryFilters } from '../features/history/HistoryFilters'

/** /history — tìm kiếm + trình xem hội thoại. `?c=ID` mở hội thoại; `?q=` truyền sang trình xem để nhảy tới chỗ khớp. */
export default function HistoryPage() {
  const f = useHistoryFilters()
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">Lịch sử hội thoại</h1>
      <HistoryFilters />
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Kết quả tìm kiếm" className={`w-full shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 md:w-96 ${f.selected ? 'hidden md:block' : ''}`}><ConversationList /></nav>
        <section aria-label="Hội thoại" className={`min-w-0 flex-1 ${f.selected ? '' : 'hidden md:grid md:place-items-center'}`}>
          {f.selected
            ? <ConversationViewer key={`${f.selected}|${f.q}`} id={f.selected} q={f.q} />
            : <p className="p-8 text-center text-sm text-slate-600">Chọn một hội thoại ở bên trái để xem.</p>}
        </section>
      </div>
    </div>
  )
}

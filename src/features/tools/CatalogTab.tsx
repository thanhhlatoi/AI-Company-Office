import { Globe, Lock, Send } from 'lucide-react'
import { useState } from 'react'
import { RiskChip } from '../../components/studio/badges'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import type { Tool } from '../../types/tools'
import { useTools } from '../studio/queries'
import { useToolSwitch } from '../studio/toolMutations'

type Ask = { tool: Tool; kind: 'kill' | 'flag-on' | 'flag-off' | 'revive' }
const TEXT: Record<Ask['kind'], (t: Tool) => { title: string; body: string; label: string; twoStep: boolean }> = {
  kill: (t) => ({ title: `Tắt khẩn cấp: ${t.name}`, body: `${t.agentCount} agent đang được cấp công cụ này sẽ MẤT quyền dùng ngay lập tức. Các task đang chờ công cụ sẽ bị chặn. Quyền đã cấp vẫn được giữ để bật lại.`, label: 'Tắt khẩn cấp', twoStep: false }),
  revive: (t) => ({ title: `Bật lại: ${t.name}`, body: 'Các quyền đã cấp sẽ dùng được trở lại.', label: 'Bật lại', twoStep: false }),
  'flag-on': (t) => ({ title: `Bật cờ xác nhận: ${t.name}`, body: 'Cho phép CẤP quyền cho công cụ rủi ro cao này. Mỗi lần gọi vẫn luôn chờ bạn duyệt.', label: 'Bật cờ', twoStep: true }),
  'flag-off': (t) => ({ title: `Tắt cờ xác nhận: ${t.name}`, body: 'Các quyền đã cấp sẽ bị chặn cho tới khi bật lại; không cấp mới được.', label: 'Tắt cờ', twoStep: false }),
}

/** Danh mục công cụ: thẻ + công tắc "Tắt khẩn cấp" toàn hệ thống + cờ xác nhận cho MONEY/DESTRUCTIVE. */
export function CatalogTab() {
  const q = useTools(), sw = useToolSwitch()
  const [ask, setAsk] = useState<Ask | null>(null)
  if (q.isLoading) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-card bg-slate-200" />)}</div>
  if (q.isError) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được công cụ. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>
  const t = ask && TEXT[ask.kind](ask.tool)
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(q.data ?? []).map((tool) => (
          <li key={tool.id} className={`flex flex-col gap-2 rounded-card border p-3 ${tool.enabled ? 'border-slate-200 bg-white' : 'border-red-300 bg-red-50'}`}>
            <div className="flex items-start justify-between gap-2"><div><b>{tool.name}</b><p className="text-xs text-slate-700">{tool.group}</p></div><RiskChip risk={tool.risk} /></div>
            <p className="text-sm text-slate-800">{tool.description}</p>
            <p className="flex flex-wrap gap-x-3 text-xs text-slate-700">
              {tool.readsExternal && <span className="inline-flex items-center gap-1 font-medium text-orange-900" title="Nguồn nhiễm: nội dung đọc về có thể chứa chỉ thị độc hại"><Globe size={12} aria-hidden />Nguồn nhiễm</span>}
              {tool.readsPrivate && <span className="inline-flex items-center gap-1"><Lock size={12} aria-hidden />Dữ liệu riêng</span>}
              {tool.sendsOut && <span className="inline-flex items-center gap-1"><Send size={12} aria-hidden />Gửi ra ngoài</span>}
            </p>
            <p className="text-xs text-slate-700">{tool.agentCount} agent đang dùng</p>
            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
              {tool.enabled
                ? <button onClick={() => setAsk({ tool, kind: 'kill' })} className="rounded-lg border border-red-400 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-50">Tắt khẩn cấp</button>
                : <><span className="text-sm font-bold text-red-800">ĐANG TẮT</span><button onClick={() => setAsk({ tool, kind: 'revive' })} className="rounded-lg border border-slate-400 px-3 py-1 text-sm hover:bg-white">Bật lại</button></>}
              {tool.requiresAdminFlag && (
                <label className="ml-auto flex items-center gap-1.5 text-sm"><input type="checkbox" checked={tool.adminFlagOn} onChange={() => setAsk({ tool, kind: tool.adminFlagOn ? 'flag-off' : 'flag-on' })} />Cờ xác nhận</label>
              )}
            </div>
          </li>
        ))}
      </ul>
      {ask && t && (
        <TwoStepConfirm title={t.title} twoStep={t.twoStep} confirmLabel={t.label} busy={sw.isPending} preview={<p className="text-sm">{t.body}</p>} onClose={() => setAsk(null)}
          onConfirm={(reason) => sw.mutate({ toolId: ask.tool.id, change: ask.kind === 'kill' || ask.kind === 'revive' ? { enabled: ask.kind === 'revive', reason } : { adminFlagOn: ask.kind === 'flag-on', reason } }, { onSuccess: () => setAsk(null) })} />
      )}
    </>
  )
}

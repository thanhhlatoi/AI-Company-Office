import { Download, FileUp, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { downloadUrl } from '../../api/knowledge'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { USE_MOCK } from '../../lib/config'
import { formatDateTime } from '../../lib/time'
import { useUiStore } from '../../store/uiStore'
import type { KnowledgeDoc } from '../../types/knowledge'
import { useDocuments } from '../studio/queries'
import { DocStages } from './DocStages'
import { describeError } from './errors'
import { ALLOWED_EXT, fmtSize } from './files'
import { useDocActions } from './mutations'
import { useUploads } from './useUploads'

const BTN = 'rounded-lg border border-slate-300 p-1.5 hover:bg-slate-50 disabled:opacity-50'

export function DocsTab({ collectionId }: { collectionId: string }) {
  const q = useDocuments(collectionId), act = useDocActions()
  const [trust, setTrust] = useState<KnowledgeDoc['trust']>('OWNER'), [over, setOver] = useState(false), [del, setDel] = useState<KnowledgeDoc | null>(null)
  const up = useUploads(collectionId, trust)
  const pick = useRef<HTMLInputElement>(null), replaceFor = useRef<string | undefined>(undefined)
  const rows = q.data?.pages.flatMap((p) => p.items) ?? []
  const onFiles = (list: FileList | null) => { if (list?.length) up.add([...list], replaceFor.current); replaceFor.current = undefined; if (pick.current) pick.current.value = '' }
  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files) }}
        className={`rounded-card border-2 border-dashed p-5 text-center text-sm ${over ? 'border-brand bg-blue-50' : 'border-slate-300'}`}
      >
        <FileUp className="mx-auto mb-1 text-slate-600" aria-hidden />
        <p>Kéo thả nhiều tệp vào đây, hoặc <button onClick={() => { replaceFor.current = undefined; pick.current?.click() }} className="font-semibold text-brand underline">chọn tệp</button></p>
        <p className="text-xs text-slate-700">Cho phép: {ALLOWED_EXT.join(', ')} · tối đa 50 MB mỗi tệp. Máy chủ vẫn kiểm tra lại.</p>
        <label className="mt-2 inline-flex items-center gap-2 text-sm">Nguồn tin cậy<select value={trust} onChange={(e) => setTrust(e.target.value as KnowledgeDoc['trust'])} className="rounded-lg border border-slate-300 px-2 py-1"><option value="OWNER">Chủ (tin cậy)</option><option value="EXTERNAL">Bên ngoài (không tin cậy)</option></select></label>
        <input ref={pick} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} aria-label="Chọn tệp tải lên" />
      </div>
      {trust === 'EXTERNAL' && <p role="status" className="rounded-lg bg-orange-50 p-2 text-sm text-orange-950">Tài liệu từ nguồn bên ngoài: task nào đọc chúng sẽ bị đánh dấu nhiễm.</p>}
      {up.items.length > 0 && (
        <ul aria-label="Đang tải lên" className="space-y-1.5">
          {up.items.map((u) => (
            <li key={u.key} className="rounded-lg border border-slate-200 p-2 text-sm">
              <div className="flex items-center gap-2"><Upload size={14} aria-hidden /><span className="min-w-0 flex-1 truncate">{u.name} <span className="text-xs text-slate-700">({fmtSize(u.size)})</span></span>
                {u.status === 'uploading' && <button aria-label={`Huỷ tải ${u.name}`} onClick={() => up.cancel(u.key)} className="rounded p-1 hover:bg-slate-100"><X size={14} /></button>}
                {u.status === 'error' && !u.error?.startsWith('Định dạng') && !u.error?.startsWith('Tệp') && <button onClick={() => up.retry(u.key)} className="rounded border border-slate-300 px-2 text-xs hover:bg-slate-50">Thử lại</button>}
                {u.status !== 'uploading' && <button aria-label={`Bỏ ${u.name} khỏi danh sách`} onClick={() => up.dismiss(u.key)} className="rounded p-1 hover:bg-slate-100"><X size={14} /></button>}</div>
              {u.status === 'uploading' && <div role="progressbar" aria-label={`Tải ${u.name}`} aria-valuenow={u.pct} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand transition-all" style={{ width: `${u.pct}%` }} /></div>}
              {u.status === 'done' && <p className="text-xs font-medium text-green-800">✓ Đã tải lên, đang xử lý</p>}
              {u.status === 'canceled' && <p className="text-xs text-slate-700">Đã huỷ</p>}
              {u.status === 'error' && <p role="alert" className="text-xs font-medium text-red-800">{u.error}</p>}
            </li>
          ))}
        </ul>
      )}
      {q.isLoading && <div className="h-32 animate-pulse rounded-card bg-slate-200" />}
      {q.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Không tải được tài liệu. <button className="underline" onClick={() => void q.refetch()}>Thử lại</button></p>}
      {!q.isLoading && !q.isError && rows.length === 0 && <p className="rounded-card border border-dashed border-slate-300 p-8 text-center text-sm text-slate-700">Chưa có tài liệu nào. Kéo thả tệp vào khung phía trên để bắt đầu.</p>}
      <ul className="space-y-2">
        {rows.map((d) => (
          <li key={d.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 96px' }} className="rounded-card border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2"><b className="min-w-0 break-all text-sm">{d.name}</b>
              {d.trust === 'EXTERNAL' && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-950" title="Task đọc tài liệu này sẽ bị đánh dấu nhiễm">Bên ngoài</span>}
              {d.version > 1 && <span className="text-xs text-slate-700">v{d.version}</span>}
              <span className="ml-auto flex gap-1">
                {d.status === 'FAILED' && describeError(d.errorCode).retry && <button onClick={() => act.reprocess.mutate(d.id)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"><RefreshCw size={12} aria-hidden />Xử lý lại</button>}
                <button aria-label={`Thay bản mới của ${d.name}`} title="Thay bản mới" onClick={() => { replaceFor.current = d.id; pick.current?.click() }} className={BTN}><Upload size={14} /></button>
                {USE_MOCK ? <button aria-label={`Tải xuống ${d.name}`} title="Tải xuống" onClick={() => useUiStore.getState().toast('Mock: chưa có tệp thật để tải xuống')} className={BTN}><Download size={14} /></button> : <a aria-label={`Tải xuống ${d.name}`} title="Tải xuống" href={downloadUrl(d.id)} className={BTN}><Download size={14} /></a>}
                <button aria-label={`Xoá ${d.name}`} title="Xoá" onClick={() => setDel(d)} className={`${BTN} text-red-800`}><Trash2 size={14} /></button></span></div>
            <p className="mt-0.5 text-xs text-slate-700">{d.mime.split('/').pop() || 'tệp'} · {fmtSize(d.sizeBytes)} · {d.chunkCount} đoạn · {formatDateTime(d.createdAt)}</p>
            <div className="mt-1.5"><DocStages d={d} /></div>
          </li>
        ))}
      </ul>
      {q.hasNextPage && <button disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} className="w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">{q.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}</button>}
      {del && <TwoStepConfirm title="Xoá tài liệu?" askReason={false} confirmLabel="Xoá" busy={act.remove.isPending} preview={<p className="text-sm">Xoá vĩnh viễn <b>{del.name}</b> và {del.chunkCount} đoạn đã lập chỉ mục. Agent sẽ không tìm thấy nó nữa.</p>} onClose={() => setDel(null)} onConfirm={() => act.remove.mutate(del.id, { onSuccess: () => setDel(null) })} />}
    </div>
  )
}

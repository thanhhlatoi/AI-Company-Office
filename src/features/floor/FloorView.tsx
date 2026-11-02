import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { getFloorLayout, regenerateLayout } from '../../api/floors'
import { USE_MOCK } from '../../lib/config'
import { startStatusChurn } from '../../mocks/statusChurn'
import { useAgentStore } from '../../store/agentStore'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { useSettingsStore } from '../../store/settingsStore'
import { useBudgets } from '../costs/hooks'
import type { Quality } from '../sprites/config'
import { FloorAgentList } from './FloorAgentList'
import { FloorScene, type PerfInfo } from './FloorScene'
import { companyBalanceMicro } from './objectState'
import { stressSetup } from './stress'
import { useAnnouncements } from './useAnnouncements'

const Q_LABEL: Record<Quality, string> = { low: 'Thấp', medium: 'Vừa', high: 'Cao' }

/** Canvas một tầng + thanh công cụ. Bố cục lỗi -> trang lỗi có nút "Tạo lại bố cục mặc định". `stress` (dev): n agent giả. */
export function FloorView({ slug, debug: debugDefault = false, broken = false, stress = 0 }: { slug: string; debug?: boolean; broken?: boolean; stress?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<FloorScene | null>(null)
  const [debug, setDebug] = useState(debugDefault)
  const mode = useSettingsStore((s) => s.quality)
  const [rebuilt, setRebuilt] = useState<string[]>([])
  const [perf, setPerf] = useState<PerfInfo | null>(null)
  const [suggest, setSuggest] = useState<Quality | null>(null)
  const [autoNote, setAutoNote] = useState<Quality | null>(null)
  const [listOpen, setListOpen] = useState(true)
  const reduceUser = useSettingsStore((s) => s.reduceMotion)
  const reduceSystem = useReducedMotion() && !reduceUser
  const qc = useQueryClient()
  const key = ['floor-layout', slug, broken]
  const layout = useQuery({ queryKey: key, queryFn: () => getFloorLayout(slug, broken ? '?broken=1' : ''), retry: false, enabled: !stress })
  const regen = useMutation({ mutationFn: () => regenerateLayout(slug), onSuccess: (l) => qc.setQueryData(key, l) })
  const budgets = useBudgets().data
  const stressData = useState(() => (import.meta.env.DEV && stress > 0 ? stressSetup(stress) : null))[0]
  const data = stressData?.layout ?? layout.data
  const agentIds = data?.seats.map((s) => s.agentId) ?? []
  const announcement = useAnnouncements(agentIds)

  useEffect(() => {
    let dead = false
    let made: FloorScene | null = null
    void FloorScene.create(host.current as HTMLDivElement, {
      onAgentTap: (id) => useAgentStore.getState().select(id), onRebuilt: setRebuilt, onPerf: setPerf, onSuggest: setSuggest, onAutoQuality: setAutoNote,
    }).then((s) => {
      if (dead) return s.destroy()
      made = s
      setScene(s)
    })
    return () => { dead = true; made?.destroy(); setScene(null) }
  }, [])
  useEffect(() => USE_MOCK ? startStatusChurn() : undefined, [])
  useEffect(() => { if (stressData) useAgentStore.setState((s) => ({ agentsById: { ...s.agentsById, ...Object.fromEntries(stressData.agents.map((a) => [a.id, a])) } })) }, [stressData])
  useEffect(() => { if (scene && data) scene.setLayout(data) }, [scene, data])
  useEffect(() => { scene?.setDebug(debug) }, [scene, debug])
  useEffect(() => { scene?.setQualityMode(mode) }, [scene, mode])
  useEffect(() => { scene?.setBalance(companyBalanceMicro(budgets)) }, [scene, budgets])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />Lưới 32px, footprint, chunk</label>
        <label className="flex items-center gap-1.5">Chất lượng
          <select aria-label="Chất lượng vẽ" className="rounded border border-slate-300 px-1 py-0.5" value={mode} onChange={(e) => { setSuggest(null); useSettingsStore.getState().update({ quality: e.target.value as typeof mode }) }}>
            <option value="auto">Tự động</option><option value="low">Thấp</option><option value="medium">Vừa</option><option value="high">Cao</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={reduceUser || reduceSystem} disabled={reduceSystem} onChange={(e) => useSettingsStore.getState().update({ reduceMotion: e.target.checked })} />
          Giảm chuyển động{reduceSystem && ' (theo hệ thống)'}
        </label>
        <button aria-expanded={listOpen} onClick={() => setListOpen(!listOpen)} className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50">Danh sách agent</button>
        {perf && <span className="text-xs text-slate-500" data-testid="perf">{perf.fps === null ? 'FPS …' : `FPS ${Math.round(perf.fps)}`} · {Q_LABEL[perf.quality]}{debug && ` · JS ${perf.jsMs.toFixed(2)} ms/frame · đang vẽ ${perf.drawn}/${perf.total}`}</span>}
        {debug && <span className="text-xs text-slate-500">Chunk vừa dựng lại: {rebuilt.length} ({rebuilt.join(' ')})</span>}
      </div>
      {suggest && (
        <div role="status" className="flex shrink-0 items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <span>FPS đang thấp (dưới 40). Gợi ý hạ chất lượng xuống “{Q_LABEL[suggest]}” (bỏ bóng, bỏ chuyển mờ, hoạt ảnh chậm lại).</span>
          <button className="rounded bg-amber-600 px-3 py-1 text-white" onClick={() => { useSettingsStore.getState().update({ quality: suggest }); setSuggest(null) }}>Hạ xuống {Q_LABEL[suggest]}</button>
          <button className="rounded border border-amber-400 px-3 py-1" onClick={() => setSuggest(null)}>Bỏ qua</button>
        </div>
      )}
      {autoNote && (
        <div role="status" className="flex shrink-0 items-center gap-3 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900">
          <span>FPS thấp nên chất lượng đã tự hạ xuống “{Q_LABEL[autoNote]}”. Chọn mức cố định ở ô “Chất lượng” nếu muốn.</span>
          <button className="rounded border border-sky-400 px-3 py-1" onClick={() => setAutoNote(null)}>Đã hiểu</button>
        </div>
      )}
      <p aria-live="polite" role="status" className="sr-only">{announcement}</p>
      <div className="flex min-h-0 flex-1">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <div ref={host} className="absolute inset-0" />
        {layout.isLoading && !stress && <p className="absolute left-4 top-4 rounded bg-white/90 px-3 py-1 text-sm">Đang tải bố cục tầng…</p>}
        {layout.isError && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
            <h2 className="text-lg font-semibold">Bố cục tầng này không hợp lệ hoặc không tải được</h2>
            <p className="max-w-md text-sm text-slate-600">{layout.error.message}</p>
            <div className="flex gap-2">
              <button onClick={() => void layout.refetch()} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-white">Thử lại</button>
              <button disabled={regen.isPending} onClick={() => regen.mutate()} className="rounded bg-brand px-4 py-2 text-sm text-white disabled:opacity-60">Tạo lại bố cục mặc định</button>
            </div>
            {regen.isError && <p className="text-sm text-red-700">Không tạo lại được: {regen.error.message}</p>}
          </div>
        )}
      </div>
      {listOpen && <FloorAgentList agentIds={agentIds} onFocus={(id) => scene?.focusAgent(id)} />}
      </div>
    </div>
  )
}

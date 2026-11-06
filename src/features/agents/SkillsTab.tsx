import { LoaderCircle, Pencil, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TwoStepConfirm } from '../../components/studio/TwoStepConfirm'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../api/http'
import { useUiStore } from '../../store/uiStore'
import type { HermesSkill } from '../../types/hermes'
import { describeError } from '../settingsAi/errors'
import { useAgentSkills, useNeedsRestart, useSkillActions, useSkillDetail } from './skillsHooks'
import { bulkChange, contentChanged, countEnabled, groupSkills, type SkillGroup } from './skillsLogic'

const BTN = 'rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-50'
type BulkAsk = { group: SkillGroup; changes: Record<string, boolean> }

/** Skill của bot Hermes thuộc agent này: bật/tắt từng skill hoặc cả nhóm, xem và sửa SKILL.md. Cần BE thật (không có mock). */
export function SkillsTab({ agentId }: { agentId: string }) {
  const q = useAgentSkills(agentId)
  const act = useSkillActions(agentId)
  const needsRestart = useNeedsRestart(agentId)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [ask, setAsk] = useState<BulkAsk | null>(null)
  const skills = useMemo(() => q.data ?? [], [q.data])
  const groups = useMemo(() => groupSkills(skills, query), [skills, query])
  const busy = act.toggle.isPending
  const err = [q.error, act.toggle.error, act.restart.error, act.sync.error].find(Boolean)

  // Agent chưa có bot: BE trả 409. Cho đồng bộ ngay tại đây thay vì bắt người dùng sang tab khác.
  if (q.error instanceof ApiError && q.error.status === 409) {
    return (
      <div className="space-y-3 text-sm">
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950">⚠ {describeError(q.error).message}</p>
        <button onClick={() => act.sync.mutate()} disabled={act.sync.isPending} className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50">
          {act.sync.isPending ? 'Đang tạo bot…' : 'Tạo bot trên Hermes'}
        </button>
        {act.sync.error && <p role="alert" className="text-red-800">⚠ {describeError(act.sync.error).message}</p>}
      </div>
    )
  }

  const setOne = (s: HermesSkill) => act.toggle.mutate({ [s.name]: !s.enabled })
  const bulk = (group: SkillGroup, enable: boolean) => {
    const changes = bulkChange(group.items, enable)
    if (Object.keys(changes).length === 0) return
    if (enable) act.toggle.mutate(changes)   // bật thì không cần hỏi; tắt cả nhóm mới hỏi
    else setAsk({ group, changes })
  }

  return (
    <section className="space-y-3 text-sm" aria-label="Skill của bot Hermes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-slate-700">
          {q.isLoading ? 'Đang tải…' : <>Đang bật <strong>{countEnabled(skills)}</strong>/{skills.length} skill</>}
        </p>
        <button onClick={() => void q.refetch()} disabled={q.isFetching} className={`${BTN} flex items-center gap-1`}>
          <RefreshCw size={12} className={q.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />Tải lại
        </button>
      </div>

      {needsRestart && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950">
          <span>⚠ Đã đổi skill. Bot chỉ dùng cấu hình mới sau khi restart (việc đang chạy của bot sẽ bị ngắt).</span>
          <button onClick={() => act.restart.mutate()} disabled={act.restart.isPending} className="rounded-lg bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {act.restart.isPending ? 'Đang restart…' : 'Restart bot'}
          </button>
        </div>
      )}
      {err && <p role="alert" className="text-red-800">⚠ {describeError(err).message}{describeError(err).requestId ? ` (mã tra log: ${describeError(err).requestId})` : ''}</p>}

      <label className="relative block">
        <span className="sr-only">Tìm skill</span>
        <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-500" aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, nhóm, mô tả…" className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 focus:border-brand focus:outline-none" />
      </label>

      {q.isLoading && <div className="h-24 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" aria-busy="true" />}
      {!q.isLoading && !q.error && groups.length === 0 && (
        <p className="rounded-card border border-dashed border-slate-300 p-4 text-center text-slate-700">{skills.length === 0 ? 'Bot này chưa có skill nào.' : 'Không có skill khớp từ khoá.'}</p>
      )}

      {groups.map((g) => (
        <div key={g.category || '_own'} className="rounded-card border border-slate-200">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
            <h3 className="font-semibold">{g.label} <span className="font-normal text-slate-600">({g.enabled}/{g.items.length})</span></h3>
            <div className="flex gap-1">
              <button onClick={() => bulk(g, true)} disabled={busy || g.enabled === g.items.length} className={BTN}>Bật hết</button>
              <button onClick={() => bulk(g, false)} disabled={busy || g.enabled === 0} className={BTN}>Tắt hết</button>
            </div>
          </div>
          <ul>
            {g.items.map((s) => {
              const pending = act.toggle.isPending && s.name in (act.toggle.variables ?? {})
              return (
                <li key={s.path} className="flex items-start gap-3 border-t border-slate-100 px-3 py-2 first:border-t-0">
                  <button
                    role="switch" aria-checked={s.enabled} aria-label={`${s.enabled ? 'Tắt' : 'Bật'} skill ${s.name}`}
                    onClick={() => setOne(s)} disabled={busy}
                    className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${s.enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-medium">{s.name}{pending && <LoaderCircle size={12} className="animate-spin motion-reduce:animate-none" aria-hidden />}</p>
                    {s.description && <p className="line-clamp-2 text-xs text-slate-600">{s.description}</p>}
                  </div>
                  <button onClick={() => setEditing(s.name)} aria-label={`Xem và sửa skill ${s.name}`} className={`${BTN} flex shrink-0 items-center gap-1`}><Pencil size={12} aria-hidden />Sửa</button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {ask && (
        <TwoStepConfirm
          title={`Tắt ${Object.keys(ask.changes).length} skill nhóm "${ask.group.label}"?`}
          preview={<p>Bot sẽ không dùng các skill này nữa: {Object.keys(ask.changes).join(', ')}. Bật lại được bất cứ lúc nào.</p>}
          askReason={false} confirmLabel="Tắt skill" busy={act.toggle.isPending}
          onConfirm={() => { act.toggle.mutate(ask.changes, { onSuccess: () => setAsk(null) }) }}
          onClose={() => setAsk(null)}
        />
      )}
      {editing && <SkillEditor agentId={agentId} skill={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

/** Xem và sửa nội dung SKILL.md. BE sao lưu bản cũ trên máy Hermes trước khi ghi đè; front matter phải giữ nguyên `name`. */
function SkillEditor({ agentId, skill, onClose }: { agentId: string; skill: string; onClose: () => void }) {
  const q = useSkillDetail(agentId, skill)
  return (
    <Modal title={`Skill: ${skill}`} onClose={onClose} wide>
      {q.isLoading && <div className="h-40 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" aria-busy="true" />}
      {q.error && <p role="alert" className="text-sm text-red-800">⚠ {describeError(q.error).message}</p>}
      {q.data && <EditorForm key={skill} agentId={agentId} skill={skill} original={q.data.content} onClose={onClose} />}
    </Modal>
  )
}

function EditorForm({ agentId, skill, original, onClose }: { agentId: string; skill: string; original: string; onClose: () => void }) {
  const act = useSkillActions(agentId)
  const toast = useUiStore((s) => s.toast)
  const [text, setText] = useState(original)
  const changed = contentChanged(original, text)
  const save = () => act.save.mutate({ skill, body: { content: text } }, {
    onSuccess: () => { toast(`Đã lưu skill ${skill}`); onClose() },
  })
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-slate-600">Giữ nguyên dòng <code>name: {skill}</code> trong phần đầu (front matter). Bản cũ được sao lưu trên máy Hermes (<code>SKILL.md.bak-before-ui-…</code>). Bot cần restart mới dùng nội dung mới.</p>
      <textarea
        aria-label={`Nội dung SKILL.md của ${skill}`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
        rows={20} className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs focus:border-brand focus:outline-none"
      />
      {act.save.error && <p role="alert" className="text-red-800">⚠ {describeError(act.save.error).message}</p>}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setText(original)} disabled={!changed || act.save.isPending} className={BTN}>Hoàn tác</button>
        <div className="flex gap-2">
          <button onClick={onClose} className={BTN}>Đóng</button>
          <button onClick={save} disabled={!changed || act.save.isPending} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
            {act.save.isPending ? 'Đang lưu…' : 'Lưu skill'}
          </button>
        </div>
      </div>
    </div>
  )
}

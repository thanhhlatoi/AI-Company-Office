import { CircleCheck, CircleDashed, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ApiError } from '../../api/http'
import { useLocalModelIds } from '../models/useLocalModels'
import { useUiStore } from '../../store/uiStore'
import type { Agent } from '../../types'
import type { HermesBot } from '../../types/hermes'
import { useNeedsRestart } from '../agents/skillsHooks'
import { describeError } from '../settingsAi/errors'
import { useHermesBot, useHermesBotActions } from './hermesBotHooks'
import { botChanges, botErrors, formOf, type BotForm } from './hermesBotLogic'

const INPUT = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'
const BTN = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50'

/** Cấu hình thật của bot Hermes thuộc agent: model/provider/địa chỉ/ngữ cảnh (sửa được) và SOUL, plugin, biến .env (chỉ xem). */
export function HermesBotTab({ agent }: { agent: Agent }) {
  const q = useHermesBot(agent.id)
  const act = useHermesBotActions(agent.id)
  const needsRestart = useNeedsRestart(agent.id)

  // Agent chưa có bot: BE trả 409. Cho tạo ngay tại đây.
  if (q.error instanceof ApiError && q.error.status === 409) {
    return (
      <section className="space-y-3 text-sm">
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950">⚠ {describeError(q.error).message}</p>
        <button onClick={() => act.sync.mutate()} disabled={act.sync.isPending} className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50">
          {act.sync.isPending ? 'Đang tạo bot…' : 'Tạo bot trên Hermes'}
        </button>
        {act.sync.error && <p role="alert" className="text-red-800">⚠ {describeError(act.sync.error).message}</p>}
      </section>
    )
  }
  const err = [q.error, act.restart.error].find(Boolean)
  return (
    <section className="space-y-4 text-sm" aria-label="Cấu hình bot Hermes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Bot trên Hermes</h2>
          <p className="text-slate-600">Cấu hình thật đang lưu trên máy Hermes của <b>{agent.name}</b>.</p>
        </div>
        <button onClick={() => void q.refetch()} disabled={q.isFetching} className={`${BTN} flex items-center gap-1.5`}>
          <RefreshCw size={14} className={q.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />Tải lại
        </button>
      </div>

      {needsRestart && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950">
          <span>⚠ Đã đổi cấu hình. Bot chỉ dùng cấu hình mới sau khi restart (việc đang chạy của bot sẽ bị ngắt).</span>
          <button onClick={() => act.restart.mutate()} disabled={act.restart.isPending} className="rounded-lg bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {act.restart.isPending ? 'Đang restart…' : 'Restart bot'}
          </button>
        </div>
      )}
      {err && <p role="alert" className="text-red-800">⚠ {describeError(err).message}{describeError(err).requestId ? ` (mã tra log: ${describeError(err).requestId})` : ''}</p>}
      {q.isLoading && <div className="h-40 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" aria-busy="true" />}
      {q.data && <BotView key={q.dataUpdatedAt} agent={agent} bot={q.data} />}
    </section>
  )
}

function BotView({ agent, bot }: { agent: Agent; bot: HermesBot }) {
  const act = useHermesBotActions(agent.id)
  const toast = useUiStore((s) => s.toast)
  const localModels = useLocalModelIds()
  const orig = formOf(bot)
  const [f, setF] = useState<BotForm>(orig)
  const errors = botErrors(orig, f)
  const changes = botChanges(orig, f)
  const dirty = Object.keys(changes).length > 0
  const valid = Object.keys(errors).length === 0
  const set = (k: keyof BotForm) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const save = () => act.save.mutate(changes, { onSuccess: () => toast('Đã lưu cấu hình bot') })
  const running = bot.gateway === 'running'

  return (
    <>
      <dl className="grid grid-cols-[130px_1fr] gap-y-2 rounded-card border border-slate-200 bg-white p-3">
        <dt className="text-slate-600">Tên bot</dt><dd className="font-mono text-xs">{bot.name}</dd>
        <dt className="text-slate-600">Gateway</dt>
        <dd className={`flex items-center gap-1 ${running ? 'text-emerald-800' : 'text-slate-700'}`}>
          {running ? <CircleCheck size={14} aria-hidden /> : <CircleDashed size={14} aria-hidden />}{bot.gateway}
        </dd>
        <dt className="text-slate-600">Mô tả</dt><dd>{bot.description ?? '—'} <span className="text-xs text-slate-500">(theo vai trò và phòng của agent)</span></dd>
        <dt className="text-slate-600">Số skill</dt><dd>{bot.skills}{bot.skillCategories.length > 0 && <span className="text-xs text-slate-500"> · {bot.skillCategories.join(', ')}</span>}</dd>
        <dt className="text-slate-600">Việc định kỳ</dt><dd>{bot.cronFiles} tệp</dd>
        {bot.terminal && <><dt className="text-slate-600">Terminal</dt><dd>{bot.terminal}</dd></>}
      </dl>

      <form onSubmit={(e) => { e.preventDefault(); if (dirty && valid) save() }} className="space-y-3 rounded-card border border-slate-200 bg-white p-3" noValidate>
        <h3 className="font-semibold">Model và kết nối</h3>
        <Field label="Model" error={errors.model} hint={`Hồ sơ agent đang chọn: ${agent.model}. Lưu lại hồ sơ agent sẽ ghi đè model ở đây.`}>
          <input list="bot-models" className={INPUT} value={f.model} onChange={set('model')} />
          <datalist id="bot-models">{localModels.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Provider" error={errors.provider}><input className={INPUT} value={f.provider} onChange={set('provider')} /></Field>
        <Field label="Địa chỉ API (baseUrl)" error={errors.baseUrl}><input className={INPUT} value={f.baseUrl} onChange={set('baseUrl')} /></Field>
        <Field label="Độ dài ngữ cảnh (token)" error={errors.contextLength}><input inputMode="numeric" className={INPUT} value={f.contextLength} onChange={set('contextLength')} /></Field>
        {act.save.error && <p role="alert" className="text-red-800">⚠ {describeError(act.save.error).message}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setF(orig)} disabled={!dirty || act.save.isPending} className={BTN}>Hoàn tác</button>
          <button type="submit" disabled={!dirty || !valid || act.save.isPending} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
            {act.save.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
          </button>
        </div>
      </form>

      <div className="space-y-2 rounded-card border border-slate-200 bg-white p-3">
        <h3 className="font-semibold">SOUL <span className="text-xs font-normal text-slate-600">(chỉ xem: sửa ở tab "Hồ sơ và prompt", bot sẽ nhận System prompt mới)</span></h3>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">{bot.soul || '(trống)'}</pre>
      </div>

      <div className="space-y-2 rounded-card border border-slate-200 bg-white p-3">
        <h3 className="font-semibold">Plugin</h3>
        {bot.plugins.length === 0 ? <p className="text-slate-600">Không bật plugin nào.</p>
          : <ul className="flex flex-wrap gap-1">{bot.plugins.map((p) => <li key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{p}</li>)}</ul>}
        <h3 className="pt-2 font-semibold">Biến môi trường (.env)</h3>
        {bot.envKeys.length === 0 ? <p className="text-slate-600">Bot không có khoá riêng (dùng cấu hình chung).</p>
          : <ul className="space-y-0.5">{bot.envKeys.map((k) => <li key={k.key} className="font-mono text-xs">{k.key} <span className={k.set ? 'text-emerald-800' : 'text-slate-500'}>{k.set ? '· đã đặt' : '· trống'}</span></li>)}</ul>}
        <p className="text-xs text-slate-500">Giá trị khoá không bao giờ hiển thị trên giao diện.</p>
      </div>
    </>
  )
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-800">{error}</span>}
    </label>
  )
}

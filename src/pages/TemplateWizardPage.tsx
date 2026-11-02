import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TwoStepConfirm } from '../components/studio/TwoStepConfirm'
import { useCollections, useModelProfiles, useNamespaces, useSecrets, useTemplates, useTools } from '../features/studio/queries'
import { useInstantiate } from '../features/templates/mutations'
import { recommendModels } from '../features/templates/logic'
import { Step1 } from '../features/templates/wizard/Step1'
import { Step2 } from '../features/templates/wizard/Step2'
import { Step3 } from '../features/templates/wizard/Step3'
import { Step4 } from '../features/templates/wizard/Step4'
import { Summary } from '../features/templates/wizard/Summary'
import { initDraft, problems, toInstantiate, type Draft } from '../features/templates/wizardLogic'
import { isHighRisk } from '../features/studio/risk'
import { useUiStore } from '../store/uiStore'
import type { AgentTemplate } from '../types/studio'
import type { Tool } from '../types/tools'
import type { ModelProfile } from '../types/models'

const STEPS = ['Thông tin', 'Model', 'Công cụ và quyền', 'Dữ liệu và ngân sách', 'Xem lại'] as const

export default function TemplateWizardPage() {
  const { id = '' } = useParams()
  const tpls = useTemplates(), tools = useTools(), models = useModelProfiles(), cols = useCollections(), nss = useNamespaces(), secrets = useSecrets()
  const t = tpls.data?.find((x) => x.id === id)
  const loading = tpls.isLoading || tools.isLoading || models.isLoading
  if (loading) return <div className="space-y-2 p-6">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-card bg-slate-200" />)}</div>
  if (!t || !tools.data || !models.data) return <div className="p-6"><h1 className="text-lg font-semibold">Không tìm thấy mẫu</h1><Link className="underline" to="/templates">Về Mẫu agent</Link></div>
  return <Wizard t={t} tools={tools.data} models={models.data} cols={cols.data ?? []} nss={nss.data ?? []} secrets={secrets.data ?? []} />
}

function Wizard({ t, tools, models, cols, nss, secrets }: { t: AgentTemplate; tools: Tool[]; models: ModelProfile[]; cols: NonNullable<ReturnType<typeof useCollections>['data']>; nss: NonNullable<ReturnType<typeof useNamespaces>['data']>; secrets: NonNullable<ReturnType<typeof useSecrets>['data']> }) {
  const nav = useNavigate(), create = useInstantiate(t.id)
  const first = recommendModels(t.modelRequirement, models).find((f) => f.fit)?.model ?? models[0]
  const [d, setD] = useState<Draft>(() => initDraft(t, tools, first?.id ?? '', first?.dataClass === 'LOCAL'))
  const [step, setStep] = useState(0), [tried, setTried] = useState(false), [confirm, setConfirm] = useState(false)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const issues = problems(d, t, tools), body = toInstantiate(d)
  const high = body.grants.some((g) => isHighRisk(tools.find((x) => x.id === g.toolId)?.risk ?? 'READ'))
  const go = (n: number) => { if (n > step && step === 0 && issues.some((p) => p.step === 1)) { setTried(true); return } if (n > step && step === 2 && issues.some((p) => p.step === 3)) { setTried(true); return } setStep(n) }
  const submit = () => create.mutate(body, { onSuccess: (r) => { useUiStore.getState().toast(`Đã tạo agent ${r.agent.name}`); nav(`/agents/${r.agent.id}/studio?tab=tools`) } })
  const hasTools = body.grants.length > 0
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3"><Link to="/templates" aria-label="Về Mẫu agent" className="rounded p-1 hover:bg-slate-100"><ArrowLeft size={18} /></Link><div><h1 className="text-xl font-bold">Tạo agent từ mẫu: {t.name}</h1><p className="text-sm text-slate-700">{t.description}</p></div></header>
      <ol aria-label="Các bước" className="mb-4 flex flex-wrap gap-2 text-sm">{STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined}><button onClick={() => (i <= step ? setStep(i) : go(i))} className={`rounded-full border px-3 py-1 ${i === step ? 'border-brand bg-blue-50 font-semibold text-brand' : i < step ? 'border-green-700 text-green-900' : 'border-slate-300 text-slate-700'}`}>{i < step ? '✓ ' : `${i + 1}. `}{s}</button></li>)}</ol>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {step === 0 && <Step1 t={t} d={d} set={set} tried={tried} />}
          {step === 1 && <Step2 t={t} d={d} set={set} models={models} hasTools={hasTools} />}
          {step === 2 && <Step3 t={t} d={d} set={set} tools={tools} secrets={secrets} tried={tried} />}
          {step === 3 && <Step4 d={d} set={set} cols={cols} nss={nss} />}
          {step === 4 && (
            <section aria-label="Xem lại" className="space-y-3 text-sm"><h2 className="text-base font-semibold">Xem lại rồi tạo</h2>
              {issues.length > 0 ? <ul role="alert" className="space-y-1">{issues.map((p, i) => <li key={i} className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-red-950">{p.text}<button onClick={() => setStep(p.step === 1 ? 0 : 2)} className="ml-auto underline">Sửa</button></li>)}</ul> : <p className="rounded-lg bg-green-50 p-2 text-green-950">Mọi thứ hợp lệ. Bấm “Tạo agent” để tạo trong một lần.</p>}
              <p><b>{d.name || '(chưa đặt tên)'}</b> · {d.role || '(chưa có vai trò)'} · {body.grants.length} công cụ được cấp</p>
              <button disabled={issues.length > 0 || create.isPending} onClick={() => (high ? setConfirm(true) : submit())} className="rounded-lg bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-50">{create.isPending ? 'Đang tạo…' : 'Tạo agent'}</button></section>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-3"><button disabled={step === 0} onClick={() => setStep(step - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40">Quay lại</button>{step < 4 && <button onClick={() => go(step + 1)} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">Tiếp tục</button>}</div>
        </div>
        <div className="min-w-0 rounded-card border border-slate-200 bg-white p-3 lg:sticky lg:top-0 lg:self-start"><Summary d={d} tools={tools} models={models} cols={cols} secrets={secrets} /></div>
      </div>
      {confirm && <TwoStepConfirm title="Tạo agent có công cụ rủi ro cao?" twoStep askReason={false} confirmLabel="Tạo agent" busy={create.isPending} preview={<p className="text-sm">Agent sẽ được cấp công cụ <b>MONEY / DESTRUCTIVE</b>. Mỗi lần gọi vẫn luôn chờ bạn duyệt.</p>} onClose={() => setConfirm(false)} onConfirm={submit} />}
    </div>
  )
}

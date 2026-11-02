import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { MICRO, usdToMicro } from '../../lib/money'
import { useDeviceStore } from '../../store/deviceStore'
import { ModelProfileInputSchema, type ModelProfile, type ModelProfileInput } from '../../types/models'
import { useSecrets } from '../studio/queries'
import { useSaveModel } from './modelMutations'

const inp = 'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
const EMPTY: ModelProfileInput = { label: '', provider: 'anthropic', modelId: '', baseUrl: null, secretId: null, dataClass: 'CLOUD', tier: 'BALANCED', capabilities: { toolUse: true, json: true, vision: false }, contextTokens: 200000, maxConcurrent: 4, inputPerMTokMicro: 0, outputPerMTokMicro: 0, deviceId: null }
const toInput = (m: ModelProfile): ModelProfileInput => ({ label: m.label, provider: m.provider, modelId: m.modelId, baseUrl: m.baseUrl ?? null, secretId: m.secretId ?? null, dataClass: m.dataClass, tier: m.tier, capabilities: m.capabilities, contextTokens: m.contextTokens, maxConcurrent: m.maxConcurrent, inputPerMTokMicro: m.inputPerMTokMicro, outputPerMTokMicro: m.outputPerMTokMicro, deviceId: m.deviceId ?? null })

/** Thêm / sửa hồ sơ model. Giá nhập bằng USD mỗi 1M token, lưu dạng micro-USD. Bí mật chỉ CHỌN từ danh sách. */
export function ProfileForm({ model, onClose }: { model?: ModelProfile; onClose: () => void }) {
  const [v, setV] = useState<ModelProfileInput>(model ? toInput(model) : EMPTY)
  const [err, setErr] = useState('')
  const save = useSaveModel(model?.id)
  const secrets = (useSecrets().data ?? []).filter((s) => s.kind === 'llm' || s.kind === 'other')
  const devices = Object.values(useDeviceStore((s) => s.devicesById))
  const set = <K extends keyof ModelProfileInput>(k: K, val: ModelProfileInput[K]) => setV({ ...v, [k]: val })
  const usd = (micro: number) => String(micro / MICRO)
  const submit = () => {
    const parsed = ModelProfileInputSchema.safeParse(v)
    if (!parsed.success) return setErr(parsed.error.issues[0].message)
    if (v.dataClass === 'CLOUD' && !v.secretId) return setErr('Model CLOUD cần chọn một bí mật (khoá API)')
    if (v.dataClass === 'LOCAL' && !v.baseUrl) return setErr('Model LOCAL cần địa chỉ máy chạy (baseUrl)')
    setErr(''); save.mutate(parsed.data, { onSuccess: onClose })
  }
  const cap = (k: 'toolUse' | 'json' | 'vision', label: string) => <label className="flex items-center gap-1.5"><input type="checkbox" checked={v.capabilities[k]} onChange={(e) => set('capabilities', { ...v.capabilities, [k]: e.target.checked })} />{label}</label>
  return (
    <Modal title={model ? `Sửa hồ sơ: ${model.label}` : 'Thêm hồ sơ model'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Tên hiển thị<input className={inp} value={v.label} onChange={(e) => set('label', e.target.value)} /></label>
          <label>Nhà cung cấp<input className={inp} value={v.provider} onChange={(e) => set('provider', e.target.value)} placeholder="anthropic, ollama, vllm…" /></label>
          <label>Mã model<input className={inp} value={v.modelId} onChange={(e) => set('modelId', e.target.value)} /></label>
          <label>Nhóm dữ liệu<select className={inp} value={v.dataClass} onChange={(e) => set('dataClass', e.target.value as ModelProfileInput['dataClass'])}><option value="CLOUD">CLOUD — dữ liệu gửi ra ngoài</option><option value="LOCAL">LOCAL — chạy trong mạng công ty</option></select></label>
          <label>Địa chỉ (baseUrl){v.dataClass === 'LOCAL' && <span className="text-red-700"> *</span>}<input className={inp} value={v.baseUrl ?? ''} onChange={(e) => set('baseUrl', e.target.value || null)} placeholder="http://máy:11434" /></label>
          <label>Khoá API (bí mật){v.dataClass === 'CLOUD' && <span className="text-red-700"> *</span>}<select className={inp} value={v.secretId ?? ''} onChange={(e) => set('secretId', e.target.value || null)}><option value="">Không dùng</option>{secrets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Tier<select className={inp} value={v.tier} onChange={(e) => set('tier', e.target.value as ModelProfileInput['tier'])}><option value="FAST">Nhanh</option><option value="BALANCED">Cân bằng</option><option value="POWER">Mạnh</option></select></label>
          <label>Máy chạy (model local)<select className={inp} value={v.deviceId ?? ''} onChange={(e) => set('deviceId', e.target.value || null)}><option value="">Không gắn máy</option>{devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label>Ngữ cảnh (token)<input type="number" min={1} className={inp} value={v.contextTokens} onChange={(e) => set('contextTokens', Math.floor(Number(e.target.value)))} /></label>
          <label>Giới hạn đồng thời<input type="number" min={1} className={inp} value={v.maxConcurrent} onChange={(e) => set('maxConcurrent', Math.floor(Number(e.target.value)))} /></label>
          <label>Giá vào (USD / 1M token)<input type="number" min={0} step="any" className={inp} value={usd(v.inputPerMTokMicro)} onChange={(e) => set('inputPerMTokMicro', usdToMicro(Number(e.target.value) || 0))} /></label>
          <label>Giá ra (USD / 1M token)<input type="number" min={0} step="any" className={inp} value={usd(v.outputPerMTokMicro)} onChange={(e) => set('outputPerMTokMicro', usdToMicro(Number(e.target.value) || 0))} /></label>
        </div>
        <fieldset className="flex flex-wrap gap-4"><legend className="mb-1 font-medium">Năng lực</legend>{cap('toolUse', 'Dùng công cụ')}{cap('json', 'JSON')}{cap('vision', 'Hình ảnh')}</fieldset>
        {err && <p role="alert" className="font-medium text-red-700">{err}</p>}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-slate-100">Huỷ</button><button disabled={save.isPending} onClick={submit} className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Đang lưu…' : 'Lưu'}</button></div>
      </div>
    </Modal>
  )
}

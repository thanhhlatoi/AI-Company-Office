import type { ReactNode } from 'react'
import type { ReasoningEffort, TestBody } from '../../types/settingsAi'
import { checkBaseUrl } from './validate'
import { Field } from './Field'
import { INPUT, fieldProps } from './fieldProps'
import { ModelSource } from './ModelSource'
import { TestRunner } from './TestRunner'
import type { DraftForm } from './useDraft'

const EFFORTS: [ReasoningEffort, string][] = [['', 'Mặc định của model'], ['none', 'none (tắt suy luận)'], ['low', 'low'], ['medium', 'medium'], ['high', 'high']]
const num = (v: number) => (Number.isNaN(v) ? '' : v)
const Section = ({ title, children }: { title: string; children: ReactNode }) => <section className="space-y-3 rounded-card border border-slate-200 bg-white p-4"><h2 className="font-semibold">{title}</h2>{children}</section>

export function OllamaTab({ f }: { f: DraftForm }) {
  const { draft: d, errors: e, set, readOnly } = f
  const url = checkBaseUrl(d['ollama.baseUrl'])

  // Thử kết nối dùng giá trị đang sửa (chưa lưu) để kiểm tra trước khi lưu. source=env: KHÔNG gửi overrides.
  const overrides: NonNullable<TestBody['overrides']> = {}
  if (!readOnly && f.keys.includes('ollama.baseUrl')) overrides.baseUrl = d['ollama.baseUrl'].trim()
  if (!readOnly && f.keys.includes('ollama.defaultModel')) overrides.model = d['ollama.defaultModel'].trim()
  const connBody: TestBody | null = e['ollama.baseUrl'] ? null : { target: 'ollama', ...(Object.keys(overrides).length ? { overrides } : {}) }

  return (
    <div className="space-y-4">
      <Section title="Chế độ AI">
        <Field id="provider" label="Agent dùng" hint="“AI giả” chỉ trả lời mẫu, không tốn token. “AI thật” gọi Ollama/OmniRoute.">
          <select {...fieldProps('provider')} value={d['llm.provider']} disabled={readOnly} onChange={(ev) => set('llm.provider', ev.target.value as 'fake' | 'local')} className={INPUT}>
            <option value="local">AI thật (local)</option>
            <option value="fake">AI giả (trả lời mẫu)</option>
          </select>
        </Field>
      </Section>

      <Section title="Kết nối Ollama">
        <Field id="ollama-url" label="Địa chỉ Ollama" error={e['ollama.baseUrl']} warnings={url.warnings} hint="Dạng http://host:port (thêm /v1 nếu gọi theo chuẩn OpenAI)">
          <input {...fieldProps('ollama-url', e['ollama.baseUrl'])} value={d['ollama.baseUrl']} disabled={readOnly} onChange={(ev) => set('ollama.baseUrl', ev.target.value)} className={INPUT} inputMode="url" spellCheck={false} />
        </Field>
        <TestRunner label="Thử kết nối" body={connBody} disabledReason="Sửa lỗi địa chỉ trước khi thử." />
        {!readOnly && Object.keys(overrides).length > 0 && <p className="text-xs text-slate-600">Đang thử với giá trị bạn vừa sửa (chưa lưu).</p>}
      </Section>

      <Section title="Model">
        <Field id="ollama-model" label="Model mặc định" error={e['ollama.defaultModel']}>
          <input {...fieldProps('ollama-model', e['ollama.defaultModel'])} value={d['ollama.defaultModel']} disabled={readOnly} onChange={(ev) => set('ollama.defaultModel', ev.target.value)} className={INPUT} spellCheck={false} />
        </Field>
        <ModelSource source="ollama" loadLabel="Tải danh sách model" selected={d['ollama.defaultModel']} onPick={readOnly ? undefined : (id) => set('ollama.defaultModel', id)} />
      </Section>

      <Section title="Suy luận và giới hạn">
        <Field id="effort" label="Mức suy luận (reasoning effort)" hint="Model suy luận có thể dùng hết token để nghĩ và trả nội dung rỗng; chọn “none” để tắt, hoặc tăng số token tối đa.">
          <select {...fieldProps('effort')} value={d['llm.reasoningEffort']} disabled={readOnly} onChange={(ev) => set('llm.reasoningEffort', ev.target.value as ReasoningEffort)} className={INPUT}>
            {EFFORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="timeout" label="Thời gian chờ (giây)" error={e['llm.timeoutSec']} hint="Mặc định 300. Lần gọi đầu có thể chậm vì Ollama nạp model.">
            <input {...fieldProps('timeout', e['llm.timeoutSec'])} type="number" min={1} max={3600} value={num(d['llm.timeoutSec'])} disabled={readOnly} onChange={(ev) => set('llm.timeoutSec', ev.target.valueAsNumber)} className={INPUT} />
          </Field>
          <Field id="max-tokens" label="Token tối đa mỗi câu trả lời" error={e['llm.maxOutputTokens']}>
            <input {...fieldProps('max-tokens', e['llm.maxOutputTokens'])} type="number" min={1} max={200000} value={num(d['llm.maxOutputTokens'])} disabled={readOnly} onChange={(ev) => set('llm.maxOutputTokens', ev.target.valueAsNumber)} className={INPUT} />
          </Field>
        </div>
      </Section>

      <Section title="Gọi thử 1 câu">
        <p className="text-sm text-slate-700">Gửi câu “Trả lời 1 từ: chào” tới AI đang dùng, theo cấu hình <strong>đã lưu</strong>.</p>
        {!readOnly && f.keys.length > 0 && <p className="text-xs text-amber-900">⚠ Bạn có thay đổi chưa lưu; lần gọi thử này chưa dùng chúng.</p>}
        <TestRunner label="Gọi thử 1 câu" body={{ target: 'llm' }} />
      </Section>
    </div>
  )
}

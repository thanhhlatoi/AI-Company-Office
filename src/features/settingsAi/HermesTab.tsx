import type { TestBody, SettingsAi } from '../../types/settingsAi'
import { Field } from './Field'
import { INPUT, fieldProps } from './fieldProps'
import { HermesSync } from './HermesSync'
import { KeyField } from './KeyField'
import { TestRunner } from './TestRunner'
import type { DraftForm } from './useDraft'
import { checkBaseUrl } from './validate'

export function HermesTab({ s, f }: { s: SettingsAi; f: DraftForm }) {
  const { draft: d, errors: e, set, readOnly } = f
  const url = checkBaseUrl(d['hermes.baseUrl'])
  // Thử kết nối dùng địa chỉ đang sửa (chưa lưu). source=env: KHÔNG gửi overrides.
  const body: TestBody | null = e['hermes.baseUrl'] ? null : { target: 'hermes', ...(!readOnly && f.keys.includes('hermes.baseUrl') ? { overrides: { baseUrl: d['hermes.baseUrl'].trim() } } : {}) }
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-card border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Cấu hình Hermes</h2>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={d['hermes.enabled']} disabled={readOnly} onChange={(ev) => set('hermes.enabled', ev.target.checked)} className="mt-1 size-4" />
          <span><span className="block font-medium">Dùng Hermes</span><span className="block text-xs text-slate-600">Hermes là đường riêng (không qua OmniRoute): lập kế hoạch cho mục tiêu và chạy các bot.</span></span>
        </label>
        <Field id="hermes-planner" label="Bên lập kế hoạch" hint="“Hermes” để Hermes chia việc cho agent; “LLM” dùng AI thường, không qua Hermes.">
          <select {...fieldProps('hermes-planner')} value={d['hermes.planner']} disabled={readOnly} onChange={(ev) => set('hermes.planner', ev.target.value as 'hermes' | 'llm')} className={INPUT}>
            <option value="hermes">Hermes</option><option value="llm">LLM thường</option>
          </select>
        </Field>
        <Field id="hermes-url" label="Địa chỉ Hermes" error={e['hermes.baseUrl']} warnings={url.warnings.filter((w) => !w.includes('/v1'))} hint="Dạng http://host:port. Sau khi dựng lại VPS, nhập lại địa chỉ mới ở đây.">
          <input {...fieldProps('hermes-url', e['hermes.baseUrl'])} value={d['hermes.baseUrl']} disabled={readOnly} onChange={(ev) => set('hermes.baseUrl', ev.target.value)} className={INPUT} inputMode="url" spellCheck={false} />
        </Field>
        <KeyField field="hermes" isSet={s.hermes.adminConfigured} readOnly={readOnly} />
        <TestRunner label="Thử kết nối" body={body} disabledReason="Sửa lỗi địa chỉ trước khi thử." />
        {!readOnly && f.keys.includes('hermes.baseUrl') && <p className="text-xs text-slate-600">Đang thử với địa chỉ bạn vừa sửa (chưa lưu).</p>}
      </section>
      {s.hermes.enabled ? <HermesSync /> : <p className="rounded-card border border-dashed border-slate-300 p-6 text-sm text-slate-700">Hermes đang tắt (theo cấu hình đã lưu), nên chưa có gì để đồng bộ. Bật và lưu để quản lý bot.</p>}
    </div>
  )
}

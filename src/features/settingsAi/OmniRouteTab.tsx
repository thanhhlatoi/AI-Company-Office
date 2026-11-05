import { useState, type ReactNode } from 'react'
import type { TestBody } from '../../types/settingsAi'
import { CostWarning } from './CostWarning'
import { Field } from './Field'
import { INPUT, fieldProps } from './fieldProps'
import { KeyField } from './KeyField'
import { ModelSource } from './ModelSource'
import { TestRunner } from './TestRunner'
import type { DraftForm } from './useDraft'
import { checkBaseUrl, safeHttpUrl } from './validate'
import type { SettingsAi } from '../../types/settingsAi'

const Section = ({ title, children }: { title: string; children: ReactNode }) => <section className="space-y-3 rounded-card border border-slate-200 bg-white p-4"><h2 className="font-semibold">{title}</h2>{children}</section>

export function OmniRouteTab({ s, f }: { s: SettingsAi; f: DraftForm }) {
  const { draft: d, errors: e, set, readOnly } = f
  const on = d['llm.viaOmniroute']
  const url = checkBaseUrl(d['omniroute.baseUrl'])
  const dash = safeHttpUrl(s.omniroute.dashboardUrl)
  const [combo, setCombo] = useState('') // combo chọn để gọi thử; rỗng = combo mặc định

  const overrides: NonNullable<TestBody['overrides']> = {}
  if (!readOnly && f.keys.includes('omniroute.baseUrl')) overrides.baseUrl = d['omniroute.baseUrl'].trim()
  const connBody: TestBody | null = e['omniroute.baseUrl'] ? null : { target: 'omniroute', ...(Object.keys(overrides).length ? { overrides } : {}) }

  return (
    <div className="space-y-4">
      <Section title="Dùng OmniRoute">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={on} disabled={readOnly} onChange={(ev) => set('llm.viaOmniroute', ev.target.checked)} className="mt-1 size-4" />
          <span><span className="block font-medium">Cho agent gọi AI qua OmniRoute</span><span className="block text-xs text-slate-600">OmniRoute là cổng chuẩn OpenAI đứng giữa BE và các AI (local, trả phí, miễn phí), có dự phòng. Tắt thì BE gọi thẳng Ollama.</span></span>
        </label>
      </Section>

      {on && <CostWarning dashboardUrl={s.omniroute.dashboardUrl} />}

      {on && (
        <>
          <Section title="Kết nối">
            <Field id="omni-url" label="Địa chỉ OmniRoute" error={e['omniroute.baseUrl']} warnings={url.warnings} hint="Mặc định http://localhost:20128/v1">
              <input {...fieldProps('omni-url', e['omniroute.baseUrl'])} value={d['omniroute.baseUrl']} disabled={readOnly} onChange={(ev) => set('omniroute.baseUrl', ev.target.value)} className={INPUT} inputMode="url" spellCheck={false} />
            </Field>
            <KeyField isSet={s.omniroute.apiKeySet} readOnly={readOnly} />
            {dash && <a href={dash} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Mở dashboard OmniRoute ↗</a>}
            <TestRunner label="Thử kết nối" body={connBody} disabledReason="Sửa lỗi địa chỉ trước khi thử." />
            {!readOnly && Object.keys(overrides).length > 0 && <p className="text-xs text-slate-600">Đang thử với địa chỉ bạn vừa sửa (chưa lưu).</p>}
          </Section>

          <Section title="Combo / model">
            <ModelSource source="omniroute" loadLabel="Tải danh sách combo/model" pickLabel="Chọn để thử" selected={combo} onPick={setCombo} />
          </Section>

          <Section title="Gọi thử 1 câu">
            <p className="text-sm text-slate-700">Gửi câu “Trả lời 1 từ: chào” qua {combo ? <>combo <strong>{combo}</strong></> : 'combo mặc định'}, theo cấu hình <strong>đã lưu</strong>.</p>
            {combo && <button onClick={() => setCombo('')} className="text-xs underline">Bỏ chọn combo</button>}
            {!readOnly && f.keys.length > 0 && <p className="text-xs text-amber-900">⚠ Bạn có thay đổi chưa lưu; lần gọi thử này chưa dùng chúng.</p>}
            <TestRunner label="Gọi thử 1 câu" body={{ target: 'llm', ...(combo ? { overrides: { model: combo } } : {}) }} />
          </Section>
        </>
      )}

      <details open className="rounded-card border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Nhắc bảo mật</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          <li>Giữ cổng OmniRoute ở <code>127.0.0.1</code>.</li>
          <li>Mở ra LAN thì phải bật yêu cầu API key.</li>
          <li>Không dùng mật khẩu mẫu của dashboard.</li>
        </ul>
      </details>
    </div>
  )
}

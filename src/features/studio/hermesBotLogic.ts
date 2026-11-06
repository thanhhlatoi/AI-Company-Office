import type { HermesBot } from '../../types/hermes.ts'

export interface BotForm { model: string; provider: string; baseUrl: string; contextLength: string }

export const formOf = (b: HermesBot): BotForm => ({
  model: b.model ?? '', provider: b.provider ?? '', baseUrl: b.baseUrl ?? '', contextLength: b.contextLength == null ? '' : String(b.contextLength),
})

export type BotChanges = { model?: string; provider?: string; baseUrl?: string; contextLength?: number }

/** Lỗi nhập liệu (tiếng Việt) theo từng ô; rỗng = hợp lệ. Chỉ kiểm ô đã khác bản đang lưu. */
export function botErrors(orig: BotForm, f: BotForm): Partial<Record<keyof BotForm, string>> {
  const e: Partial<Record<keyof BotForm, string>> = {}
  if (f.model !== orig.model && (!f.model.trim() || f.model.length > 300)) e.model = 'Model là một dòng, 1-300 ký tự'
  if (f.provider !== orig.provider && (!f.provider.trim() || f.provider.length > 60)) e.provider = 'Provider là một dòng, 1-60 ký tự'
  if (f.baseUrl !== orig.baseUrl && !/^https?:\/\/\S{1,290}$/.test(f.baseUrl.trim())) e.baseUrl = 'Địa chỉ phải bắt đầu bằng http:// hoặc https://'
  if (f.contextLength !== orig.contextLength) {
    const n = Number(f.contextLength)
    if (!/^\d+$/.test(f.contextLength.trim()) || n < 1024 || n > 10_000_000) e.contextLength = 'Số nguyên từ 1024 đến 10.000.000'
  }
  return e
}

/** Chỉ gửi các ô đã đổi (đã cắt khoảng trắng). */
export function botChanges(orig: BotForm, f: BotForm): BotChanges {
  const out: BotChanges = {}
  if (f.model !== orig.model) out.model = f.model.trim()
  if (f.provider !== orig.provider) out.provider = f.provider.trim()
  if (f.baseUrl !== orig.baseUrl) out.baseUrl = f.baseUrl.trim()
  if (f.contextLength !== orig.contextLength) out.contextLength = Number(f.contextLength)
  return out
}

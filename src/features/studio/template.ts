import type { AgentTemplate } from '../../types/studio'

/** Thay {{biến}} bằng giá trị cho trước, thiếu thì dùng mặc định của mẫu; biến lạ giữ nguyên. */
export function renderTemplate(t: Pick<AgentTemplate, 'systemPrompt' | 'variables'>, values: Record<string, string> = {}): string {
  const dflt = Object.fromEntries(t.variables.map((v) => [v.key, v.default]))
  return t.systemPrompt.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (all, k: string) => values[k] || dflt[k] || all)
}
/** Biến bắt buộc mà chưa có giá trị (cho bước kiểm tra của trình hướng dẫn) */
export const missingVariables = (t: Pick<AgentTemplate, 'variables'>, values: Record<string, string>) => t.variables.filter((v) => v.required && !(values[v.key] ?? v.default).trim())

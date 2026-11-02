// Mô tả một luật định tuyến bằng chữ (để bảng luật và ô mô phỏng giải thích được). Không import runtime: chạy được bằng `node --test`.
export interface RuleWhen { priority?: string | null; minTokens?: number | null; maxTokens?: number | null; departmentId?: string | null; agentId?: string | null; dataClass?: string | null }
const PRIORITY: Record<string, string> = { HIGH: 'Cao', NORMAL: 'Thường', LOW: 'Thấp' }
const SENS: Record<string, string> = { PUBLIC: 'Công khai', INTERNAL: 'Nội bộ', CONFIDENTIAL: 'Mật' }

export function describeWhen(w: RuleWhen, names: { department?: (id: string) => string | undefined; agent?: (id: string) => string | undefined } = {}): string {
  const parts: string[] = []
  if (w.priority) parts.push(`ưu tiên ${PRIORITY[w.priority] ?? w.priority}`)
  if (w.minTokens != null && w.maxTokens != null) parts.push(`${w.minTokens}–${w.maxTokens} token`)
  else if (w.minTokens != null) parts.push(`từ ${w.minTokens} token trở lên`)
  else if (w.maxTokens != null) parts.push(`tối đa ${w.maxTokens} token`)
  if (w.dataClass) parts.push(`dữ liệu ${SENS[w.dataClass] ?? w.dataClass}`)
  if (w.departmentId) parts.push(`phòng ${names.department?.(w.departmentId) ?? w.departmentId}`)
  if (w.agentId) parts.push(`agent ${names.agent?.(w.agentId) ?? w.agentId}`)
  return parts.length ? `Khi ${parts.join(', ')}` : 'Mọi task (luật mặc định)'
}

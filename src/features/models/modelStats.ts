import type { LlmModel } from '../../types/gateway'

export interface ModelStats { count: number; vision: number; tools: number; reasoning: number; maxContext: number | null }

/** Tổng hợp số liệu của một nhà cung cấp từ danh sách model (trường không báo thì không tính). */
export function summarize(models: LlmModel[]): ModelStats {
  const ctx = models.map((m) => m.contextWindow).filter((c): c is number => c != null)
  return {
    count: models.length,
    vision: models.filter((m) => m.vision === true).length,
    tools: models.filter((m) => m.tools === true).length,
    reasoning: models.filter((m) => m.reasoning === true).length,
    maxContext: ctx.length ? Math.max(...ctx) : null,
  }
}

/** Lọc theo chữ trong id (không phân biệt hoa thường) và tuỳ chọn chỉ model nhận ảnh. */
export const filterModels = (models: LlmModel[], q: string, visionOnly: boolean): LlmModel[] =>
  models.filter((m) => m.id.toLowerCase().includes(q.trim().toLowerCase()) && (!visionOnly || m.vision === true))

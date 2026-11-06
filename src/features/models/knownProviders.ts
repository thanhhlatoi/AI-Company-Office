import type { LlmProvider } from '../../types/gateway'

/** Nhà cung cấp từng thấy trên 9Router: nhớ lại để khi mất kết nối vẫn hiện (ở trạng thái không hoạt động). */
export type KnownMap = Record<string, { modelCount: number; lastSeen: string }>
export interface ProviderRow { name: string; modelCount: number; active: boolean; lastSeen: string }

/**
 * live = danh sách 9Router vừa trả; null = không kết nối được 9Router (mọi mục đã biết thành không hoạt động).
 * Mục có trong live là hoạt động; mục đã biết mà live không còn là không hoạt động. Hoạt động xếp trước.
 */
export function mergeKnown(known: KnownMap, live: LlmProvider[] | null, now: string): { rows: ProviderRow[]; next: KnownMap } {
  const next: KnownMap = { ...known }
  for (const p of live ?? []) next[p.name] = { modelCount: p.modelCount, lastSeen: now }
  const liveNames = new Set((live ?? []).map((p) => p.name))
  const rows = Object.entries(next).map(([name, k]) => ({ name, modelCount: k.modelCount, active: liveNames.has(name), lastSeen: k.lastSeen }))
  rows.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
  return { rows, next }
}

const KEY = 'ao.knownProviders'
export function loadKnown(): KnownMap {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown; return v && typeof v === 'object' ? (v as KnownMap) : {} } catch { return {} }
}
export function saveKnown(k: KnownMap) { try { localStorage.setItem(KEY, JSON.stringify(k)) } catch { /* trình duyệt chặn storage: chỉ giữ trong bộ nhớ */ } }

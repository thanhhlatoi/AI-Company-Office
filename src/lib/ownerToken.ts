// Mã chủ để SỬA Cài đặt AI (BE: OWNER_TOKEN). Chỉ giữ trong phiên trình duyệt (sessionStorage, đóng tab là mất) và trong bộ nhớ;
// KHÔNG đưa vào URL, query key, localStorage hay console. Chỉ được gắn vào các request tới /settings/ai (xem authHeaders).

const KEY = 'ao.ownerToken'
let memory: string | null = null
const listeners = new Set<() => void>()

const read = (): string | null => {
  if (memory) return memory
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

export const getOwnerToken = (): string | null => read()

export function setOwnerToken(token: string | null) {
  const t = token?.trim() || null
  memory = t
  try { if (t) sessionStorage.setItem(KEY, t); else sessionStorage.removeItem(KEY) } catch { /* trình duyệt chặn storage: vẫn dùng bộ nhớ */ }
  listeners.forEach((l) => l())
}

/** Cho useSyncExternalStore: giao diện cập nhật khi mã được đặt hoặc bị xoá (vd sau lỗi 401). */
export const subscribeOwnerToken = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** Đường dẫn cần mã chủ. Chỉ nhóm cài đặt AI: các request khác không bao giờ mang mã. */
export const needsOwnerToken = (path: string) => path === '/settings/ai' || path.startsWith('/settings/ai/') || path.startsWith('/settings/ai?')

/** Header Authorization cho request tới `path` (rỗng nếu không cần hoặc chưa có mã). */
export function authHeaders(path: string, token: string | null): Record<string, string> {
  return token && needsOwnerToken(path) ? { Authorization: `Bearer ${token}` } : {}
}

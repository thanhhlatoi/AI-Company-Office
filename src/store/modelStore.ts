import { create } from 'zustand'

/** Mỗi agent: nhãn model đang dùng (LOCAL/CLOUD) hoặc "không có model hợp lệ". Dạng chuỗi gọn để so sánh rẻ khi vẽ canvas. Nguồn: features/models/useModelSync.ts. */
interface ModelState { key: string; set: (m: Record<string, 'LOCAL' | 'CLOUD' | 'NONE'>) => void }
export const useModelStore = create<ModelState>((set) => ({ key: '', set: (m) => set({ key: Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([id, v]) => `${id}:${v}`).join(',') }) }))
export const modelTagOf = (key: string, agentId: string): 'LOCAL' | 'CLOUD' | 'NONE' | null => {
  const hit = key.split(',').find((x) => x.startsWith(`${agentId}:`))
  return hit ? (hit.split(':')[1] as 'LOCAL' | 'CLOUD' | 'NONE') : null
}

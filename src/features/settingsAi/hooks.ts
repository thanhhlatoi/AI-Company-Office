import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { getAiModels, getAiStatus, getSettingsAi, putSettingsAi } from '../../api/settingsAi'
import type { SettingsAiPatch } from '../../types/settingsAi'

// Query key ổn định và KHÔNG chứa bí mật.
const KEYS = { settings: ['settings-ai'] as const, status: ['settings-ai', 'status'] as const }

export const useSettingsAi = () => useQuery({ queryKey: KEYS.settings, queryFn: getSettingsAi, retry: false })

/** Làm mới mỗi 30 giây khi tab trình duyệt đang hiện (TanStack mặc định không refetch nền khi ẩn). */
export const useAiStatus = (enabled = true) =>
  useQuery({ queryKey: KEYS.status, queryFn: getAiStatus, retry: false, enabled, refetchInterval: 30_000, refetchIntervalInBackground: false })

export const useAiModels = (source: 'ollama' | 'omniroute') =>
  useQuery({ queryKey: ['settings-ai', 'models', source], queryFn: () => getAiModels(source), enabled: false, retry: false })

/** Sau khi lưu mà BE cần khởi động lại: giữ banner "Cần khởi động lại" (FE không biết lúc nào BE đã restart). */
export const useRestartPending = create<{ pending: boolean; set: (v: boolean) => void }>((set) => ({ pending: false, set: (pending) => set({ pending }) }))

export function useSaveSettings() {
  const qc = useQueryClient()
  const m = useMutation({
    // gcTime 0: không để biến mutation (có thể chứa apiKey) nằm lại trong cache
    gcTime: 0,
    mutationFn: putSettingsAi,
    onSuccess: async (data) => {
      if (data.applyMode === 'restart') useRestartPending.getState().set(true)
      await Promise.all([qc.invalidateQueries({ queryKey: KEYS.settings }), qc.invalidateQueries({ queryKey: KEYS.status })])
    },
  })
  return {
    isPending: m.isPending,
    /** reset() ngay khi xong để `variables` (có thể chứa khoá) bị xoá khỏi state của hook */
    save: async (patch: SettingsAiPatch) => { try { return await m.mutateAsync(patch) } finally { m.reset() } },
  }
}

import { useEffect } from 'react'
import { useModelPolicies, useModelProfiles } from '../studio/queries'
import { useModelStore } from '../../store/modelStore'

/** Đồng bộ "agent nào đang dùng model LOCAL/CLOUD / không có model hợp lệ" vào store cho canvas và panel. Gọi 1 lần ở gốc app. */
export function useModelSync() {
  const policies = useModelPolicies().data, models = useModelProfiles().data
  useEffect(() => {
    if (!policies || !models) return
    useModelStore.getState().set(Object.fromEntries(policies.map((p) => [p.agentId, p.resolved.modelId ? models.find((m) => m.id === p.resolved.modelId)?.dataClass ?? 'NONE' : 'NONE'])))
  }, [policies, models])
}

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createAgent, deleteAgent, listAgents, updateAgent } from '../../api/agents'
import { useAgentStore } from '../../store/agentStore'
import type { AgentInput } from '../../types'

/** Tải GET /agents rồi nạp vào store. Gọi 1 lần ở gốc app. */
export const useAgentsQuery = () => useQuery({ queryKey: ['agents'], queryFn: listAgents })

export function useAgentsSync() {
  const q = useAgentsQuery()
  const setAgents = useAgentStore((s) => s.setAgents)
  useEffect(() => { if (q.data) setAgents(q.data) }, [q.data, setAgents])
  return q
}

/** Tạo (không có id) hoặc sửa (có id) agent. */
export function useSaveAgent() {
  const upsert = useAgentStore((s) => s.upsertAgent)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AgentInput }) => (id ? updateAgent(id, input) : createAgent(input)),
    onSuccess: upsert,
  })
}

export function useDeleteAgent() {
  const remove = useAgentStore((s) => s.removeAgent)
  return useMutation({ mutationFn: deleteAgent, onSuccess: (_d, id) => remove(id) })
}

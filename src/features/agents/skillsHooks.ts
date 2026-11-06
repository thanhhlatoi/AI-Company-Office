import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAgentSkill, listAgentSkills, restartHermesBot, setAgentSkillsEnabled, syncHermesAgent, updateAgentSkill } from '../../api/hermes'

const key = (agentId: string) => ['hermes', 'skills', agentId] as const
export const restartKey = (agentId: string) => ['hermes', 'skills-dirty', agentId] as const

export const useAgentSkills = (agentId: string) => useQuery({ queryKey: key(agentId), queryFn: () => listAgentSkills(agentId), retry: false })

/** Nội dung đầy đủ của một skill (chỉ tải khi mở trình sửa). gcTime 0: không giữ nội dung dài trong bộ nhớ sau khi đóng. */
export const useSkillDetail = (agentId: string, skill: string) =>
  useQuery({ queryKey: [...key(agentId), skill], queryFn: () => getAgentSkill(agentId, skill), retry: false, gcTime: 0 })

/**
 * "Bot cần restart" nhớ trong cache theo agent (không mất khi chuyển tab): đổi skill xong bot chỉ dùng cấu hình mới sau khi restart,
 * mà restart lại ngắt việc đang chạy nên không tự làm.
 */
export const useNeedsRestart = (agentId: string) =>
  useQuery({ queryKey: restartKey(agentId), queryFn: () => false, initialData: false, staleTime: Infinity, gcTime: Infinity }).data

export function useSkillActions(agentId: string) {
  const qc = useQueryClient()
  const markDirty = () => qc.setQueryData(restartKey(agentId), true)
  const refreshHermes = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['hermes', 'status'] }),
    qc.invalidateQueries({ queryKey: ['hermes', 'agents'] }),
  ])
  const toggle = useMutation({
    gcTime: 0,
    mutationFn: (enabled: Record<string, boolean>) => setAgentSkillsEnabled(agentId, enabled),
    onSuccess: (r) => { qc.setQueryData(key(agentId), r.skills); if (r.needsRestart) markDirty() },
  })
  const save = useMutation({
    gcTime: 0,
    mutationFn: ({ skill, body }: { skill: string; body: { enabled?: boolean; content?: string } }) => updateAgentSkill(agentId, skill, body),
    onSuccess: (r, v) => {
      qc.setQueryData([...key(agentId), v.skill], r.skill)
      void qc.invalidateQueries({ queryKey: key(agentId), exact: true })
      if (r.needsRestart) markDirty()
    },
  })
  const restart = useMutation({
    gcTime: 0,
    mutationFn: () => restartHermesBot(agentId),
    onSuccess: () => { qc.setQueryData(restartKey(agentId), false); void refreshHermes() },
  })
  const sync = useMutation({
    gcTime: 0,
    mutationFn: () => syncHermesAgent(agentId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: key(agentId), exact: true }); void refreshHermes() },
  })
  return { toggle, save, restart, sync }
}

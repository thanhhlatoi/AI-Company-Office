import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAgentBot, restartHermesBot, syncHermesAgent, updateAgentBot } from '../../api/hermes'
import { restartKey } from '../agents/skillsHooks'

const key = (agentId: string) => ['hermes', 'bot', agentId] as const

export const useHermesBot = (agentId: string) => useQuery({ queryKey: key(agentId), queryFn: () => getAgentBot(agentId), retry: false })

export function useHermesBotActions(agentId: string) {
  const qc = useQueryClient()
  const refreshHermes = () => Promise.all([qc.invalidateQueries({ queryKey: ['hermes', 'status'] }), qc.invalidateQueries({ queryKey: ['hermes', 'agents'] })])
  const save = useMutation({
    gcTime: 0,
    mutationFn: (body: Parameters<typeof updateAgentBot>[1]) => updateAgentBot(agentId, body),
    onSuccess: (r) => { qc.setQueryData(key(agentId), r.profile); if (r.needsRestart) qc.setQueryData(restartKey(agentId), true) },
  })
  const restart = useMutation({
    gcTime: 0,
    mutationFn: () => restartHermesBot(agentId),
    onSuccess: () => { qc.setQueryData(restartKey(agentId), false); void qc.invalidateQueries({ queryKey: key(agentId), exact: true }); void refreshHermes() },
  })
  const sync = useMutation({
    gcTime: 0,
    mutationFn: () => syncHermesAgent(agentId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: key(agentId), exact: true }); void refreshHermes() },
  })
  return { save, restart, sync }
}

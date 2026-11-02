import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTask, listTasks } from '../../api/tasks'
import { tasksKey, upsertTask } from './cache'

export const useTasks = (agentId: string) => useQuery({ queryKey: tasksKey(agentId), queryFn: () => listTasks(agentId) })

export function useAssignTask(agentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; input: string }) => createTask(agentId, body),
    onSuccess: (task) => upsertTask(qc, task),
  })
}

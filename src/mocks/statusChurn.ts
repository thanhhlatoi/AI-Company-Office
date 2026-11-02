import { useAgentStore } from '../store/agentStore'
import type { AgentStatus } from '../types'

const POOL: AgentStatus[] = ['IDLE', 'IDLE', 'WORKING', 'WORKING', 'WORKING', 'BLOCKED', 'ERROR', 'OFFLINE']

/** Chỉ cho mock: cứ vài giây đổi trạng thái ngẫu nhiên của một agent để thấy tư thế/nhãn đổi theo. Trả về hàm dừng. */
export function startStatusChurn(everyMs = 3000): () => void {
  const id = setInterval(() => {
    const agents = Object.values(useAgentStore.getState().agentsById)
    if (!agents.length) return
    const a = agents[Math.floor(Math.random() * agents.length)]
    const status = POOL[Math.floor(Math.random() * POOL.length)]
    useAgentStore.getState().applyStatus(a.id, status, status === 'WORKING' ? { id: 'mock', title: 'Việc thử nghiệm' } : null)
  }, everyMs)
  return () => clearInterval(id)
}

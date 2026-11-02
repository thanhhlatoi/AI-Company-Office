import { useEffect, useState } from 'react'
import { useAgentStore } from '../../store/agentStore'
import { useWorkStore } from '../../store/workStore'
import type { AgentStatus } from '../../types'
import { approvalMessage, statusChangeMessage, summarize } from './announce'

const FLUSH_MS = 3000 // gom thông báo trong một nhịp
const CLEAR_MS = 6000

/** Văn bản cho vùng aria-live: agent trên tầng chuyển sang lỗi / bị chặn / ngoại tuyến / chờ duyệt. Không đọc lại trạng thái ban đầu. */
export function useAnnouncements(agentIds: string[]): string {
  const [text, setText] = useState('')
  const key = agentIds.join(',')
  useEffect(() => {
    const ids = new Set(key ? key.split(',') : [])
    let queue: string[] = []
    let prev: Record<string, AgentStatus> = Object.fromEntries(Object.values(useAgentStore.getState().agentsById).map((a) => [a.id, a.status]))
    let seenApprovals = new Set(Object.keys(useWorkStore.getState().approvalsById))
    let clear: ReturnType<typeof setTimeout> | undefined
    const offAgents = useAgentStore.subscribe((s) => {
      for (const a of Object.values(s.agentsById)) {
        const m = ids.has(a.id) ? statusChangeMessage(a.name, prev[a.id], a.status) : null
        if (m) queue.push(m)
      }
      prev = Object.fromEntries(Object.values(s.agentsById).map((a) => [a.id, a.status]))
    })
    const offWork = useWorkStore.subscribe((s) => {
      for (const ap of Object.values(s.approvalsById)) {
        if (seenApprovals.has(ap.id) || ap.status !== 'PENDING' || !ids.has(ap.agentId)) continue
        queue.push(approvalMessage(useAgentStore.getState().agentsById[ap.agentId]?.name ?? 'Agent'))
      }
      seenApprovals = new Set(Object.keys(s.approvalsById))
    })
    const timer = setInterval(() => {
      if (!queue.length) return
      setText(summarize([...new Set(queue)]))
      queue = []
      clearTimeout(clear)
      clear = setTimeout(() => setText(''), CLEAR_MS)
    }, FLUSH_MS)
    return () => { offAgents(); offWork(); clearInterval(timer); clearTimeout(clear) }
  }, [key])
  return text
}

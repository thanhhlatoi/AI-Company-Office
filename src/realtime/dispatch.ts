import type { QueryClient } from '@tanstack/react-query'
import { upsertTask } from '../features/tasks/cache'
import { useAgentStore } from '../store/agentStore'
import { evaluateDevice } from '../features/devices/alerts'
import { useDeviceStore } from '../store/deviceStore'
import { useRealtimeStore } from '../store/realtimeStore'
import { useWorkStore } from '../store/workStore'
import { ApprovalSchema, RealtimeMessageSchema } from '../types'
import { receive, setApplier } from './eventSync'
import { softInvalidate } from './invalidate'
import { ACTION_LABEL, goToTarget } from '../features/notifications/target'
import { patchDocument } from '../features/knowledge/cache'
import type { ModelProfile } from '../types/models'
import { useToastStore } from '../store/toastStore'

let client: QueryClient | null = null

/** Cửa vào của mọi message realtime: kiểm tra id (trùng / khoảng trống) ở eventSync rồi mới áp dụng. */
export function dispatch(raw: unknown, qc: QueryClient) {
  client = qc
  receive(raw)
}
setApplier((raw) => { if (client) apply(raw, client) })

/** Validate 1 message realtime rồi đẩy thẳng vào store / cache (không gọi lại API). Payload lạ chỉ log, không làm sập app. */
function apply(raw: unknown, qc: QueryClient) {
  const parsed = RealtimeMessageSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('[Realtime] message sai định dạng, bỏ qua:', parsed.error.issues, raw)
    return
  }
  const m = parsed.data
  switch (m.type) {
    case 'agent.status_changed':
      useAgentStore.getState().applyStatus(m.agentId, m.status, m.currentTask)
      break
    case 'task.created':
    case 'task.updated':
      upsertTask(qc, m.task)
      useWorkStore.getState().upsertTask(m.task)
      softInvalidate(qc, 'kanban')
      // task vừa xong -> số "hoàn thành hôm nay" của phòng thay đổi
      if (m.type === 'task.updated' && m.task.status === 'DONE') void qc.invalidateQueries({ queryKey: ['dept-stats'] })
      break
    case 'event.created':
      useRealtimeStore.getState().addEvent(m.event)
      break
    case 'task.handoff':
    case 'report.to_head':
    case 'meeting.started':
    case 'meeting.ended':
      useRealtimeStore.getState().pushMotion(m)
      break
    case 'approval.requested':
      useRealtimeStore.getState().addApproval(m.approvalId, m.agentId)
      useWorkStore.getState().upsertApproval(m.approval ?? ApprovalSchema.parse({ id: m.approvalId, agentId: m.agentId, createdAt: new Date().toISOString() }))
      break
    case 'approval.resolved':
      useRealtimeStore.getState().resolveApproval(m.approvalId)
      useWorkStore.getState().resolveApproval(m.approvalId, m.status ?? (m.approved ? 'APPROVED' : 'REJECTED'), m.reason)
      break
    case 'device.status_changed':
      useDeviceStore.getState().applyStatus(m.deviceId, m.status, m.lastSeen)
      evaluateDevice(m.deviceId)
      break
    case 'device.metrics':
      useDeviceStore.getState().applyMetrics(m.deviceId, m.metrics, m.uptimeSec, m.lastSeen)
      evaluateDevice(m.deviceId)
      break
    case 'device.alert':
      useDeviceStore.getState().raiseAlert({ deviceId: m.deviceId, kind: m.kind, message: m.message, severity: m.severity })
      break
    case 'network.link_changed':
      useDeviceStore.getState().applyLink(m)
      break
    case 'project.updated':
      qc.setQueryData(['project', m.project.id], m.project)
      softInvalidate(qc, 'projects')
      break
    case 'budget.updated':
      softInvalidate(qc, 'budgets')
      break
    case 'stats.invalidated':
      softInvalidate(qc, 'stats'); softInvalidate(qc, 'usage')
      break
    case 'notification.created': { // toast CHỈ sinh từ sự kiện này (BE đã khử trùng); cùng loại + cùng đối tượng thì gộp "x3"
      const n = m.notification, tg = n.target
      useToastStore.getState().push({ level: n.level, title: n.title, body: n.body || undefined, key: `${n.type}|${tg?.kind}:${tg?.id}`, action: tg ? { label: ACTION_LABEL[tg.kind], run: () => goToTarget(tg) } : undefined })
      softInvalidate(qc, 'notifications'); softInvalidate(qc, 'unread')
      break
    }
    case 'goal.created':
    case 'goal.updated':
      useWorkStore.getState().upsertGoal(m.goal)
      break
    case 'system.state_changed':
      useWorkStore.getState().setSystem(m.state, m.reason)
      break
    case 'grant.changed':
      for (const k of ['grants', 'effective', 'tools', 'audit', 'secrets']) softInvalidate(qc, k)
      break
    case 'tool.denied':
      softInvalidate(qc, 'tool-calls')
      break
    case 'model.health_changed':
      qc.setQueryData<ModelProfile[]>(['models'], (old) => old?.map((x) => (x.id === m.modelId ? { ...x, health: m.health } : x)))
      softInvalidate(qc, 'model-policy'); softInvalidate(qc, 'effective')
      break
    case 'document.status_changed':
      patchDocument(qc, m.document)
      softInvalidate(qc, 'collections')
      break
    case 'memory.pending_review':
      softInvalidate(qc, 'memory'); softInvalidate(qc, 'namespaces')
      break
    case 'template.instantiated':
      softInvalidate(qc, 'templates'); softInvalidate(qc, 'studio'); void qc.invalidateQueries({ queryKey: ['agents'] })
      break
    case 'department.dispatch':
      useRealtimeStore.getState().setDispatch({ departmentId: m.departmentId, headId: m.headId, targetAgentIds: m.targetAgentIds, at: Date.now() })
      break
  }
}

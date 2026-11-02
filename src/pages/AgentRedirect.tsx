import { Navigate, useParams } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'
import { useDepartmentStore } from '../store/departmentStore'

/** Link cũ /agents/:id -> /department/:slug/agent/:id (đợi dữ liệu tải xong mới biết phòng). */
export default function AgentRedirect() {
  const { id = '' } = useParams()
  const agents = useAgentStore((s) => s.agentsById)
  const departments = useDepartmentStore((s) => s.departmentsById)
  if (!Object.keys(departments).length || !Object.keys(agents).length) return null // đang tải
  const dept = agents[id]?.departmentId ? departments[agents[id].departmentId!] : undefined
  return <Navigate to={dept ? `/department/${dept.slug}/agent/${id}` : '/company'} replace />
}

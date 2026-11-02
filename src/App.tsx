import { useQueryClient } from '@tanstack/react-query'
import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { useAgentsSync } from './features/agents/hooks'
import { useBudgetSync } from './features/costs/useBudgetSync'
import { useModelSync } from './features/models/useModelSync'
import { useDevicesSync } from './features/devices/hooks'
import { useDepartmentsSync } from './features/departments/hooks'
import AgentRedirect from './pages/AgentRedirect'
import NotFoundPage from './pages/NotFoundPage'
import OfficePage from './pages/OfficePage'
// Mỗi trang là một chunk riêng, chỉ tải khi mở (Văn phòng giữ ở bundle chính vì là trang đầu)
const AgentsPage = lazy(() => import('./pages/AgentsPage'))
const CostsPage = lazy(() => import('./pages/CostsPage'))
const PricesPage = lazy(() => import('./pages/PricesPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const KanbanPage = lazy(() => import('./pages/KanbanPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage'))
const NetworkPage = lazy(() => import('./pages/NetworkPage'))
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AgentStudioPage = lazy(() => import('./pages/AgentStudioPage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const ModelsPage = lazy(() => import('./pages/ModelsPage'))
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const TemplateWizardPage = lazy(() => import('./pages/TemplateWizardPage'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))
const ModelComparePage = lazy(() => import('./pages/ModelComparePage'))
const CreditsPage = lazy(() => import('./pages/CreditsPage'))
const FloorPage = lazy(() => import('./pages/FloorPage'))
const SecretsPage = lazy(() => import('./pages/SecretsPage'))
const SpritesPage = import.meta.env.DEV ? lazy(() => import('./features/sprites/SpritesPage.tsx')) : null
const ActorsPage = import.meta.env.DEV ? lazy(() => import('./features/sprites/ActorsPage.tsx')) : null
import { setNavigator } from './lib/navigation'
import { loadSnapshot } from './realtime/eventSync'
import { connectRealtime } from './realtime/connection'

export default function App() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  useEffect(() => setNavigator(navigate), [navigate]) // cho toast từ sự kiện realtime điều hướng được
  useAgentsSync()
  useDepartmentsSync()
  useDevicesSync()
  useBudgetSync() // agent hết ngân sách -> huy hiệu trên canvas
  useModelSync() // nhãn LOCAL/CLOUD + "không có model hợp lệ" trên canvas
  useEffect(() => { void loadSnapshot() }, []) // ảnh chụp mục tiêu / task / duyệt / hệ thống + mốc lastEventId
  useEffect(() => connectRealtime(qc), [qc])
  return (
    <Routes>
      {SpritesPage && <Route path="/dev/sprites" element={<Suspense fallback={null}><SpritesPage /></Suspense>} />}
      {import.meta.env.DEV && <Route path="/dev/floor" element={<Navigate to="/floor/tang-1?debug=1" replace />} />}
      {ActorsPage && <Route path="/dev/actors" element={<Suspense fallback={null}><ActorsPage /></Suspense>} />}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/company" replace />} />
        <Route path="/company" element={<OfficePage />} />
        <Route path="/floor/:slug" element={<FloorPage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="/department/:slug" element={<OfficePage />} />
        <Route path="/department/:slug/agent/:id" element={<OfficePage />} />
        <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/costs" element={<CostsPage />} />
        <Route path="/costs/prices" element={<PricesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:id" element={<GoalsPage />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/templates/:id/create" element={<TemplateWizardPage />} />
        <Route path="/memory" element={<MemoryPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/knowledge/:id" element={<CollectionPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/models/compare" element={<ModelComparePage />} />
        <Route path="/settings/secrets" element={<SecretsPage />} />
        <Route path="/agents/:id/studio" element={<AgentStudioPage />} />
        <Route path="/agents/:id" element={<AgentRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

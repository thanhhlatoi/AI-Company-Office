import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProject, listProjectActivity, listProjects, listProjectSnapshots, postGoalProject, postProject, postProjectStatus } from '../../api/biz'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'

export const useProjects = (f: { status?: string; departmentId?: string; q?: string }) => useQuery({ queryKey: ['projects', f], queryFn: () => listProjects(f) })
export const useProject = (id: string) => useQuery({ queryKey: ['project', id], queryFn: () => getProject(id) })
export const useProjectSnapshots = (id: string) => useQuery({ queryKey: ['project', id, 'snapshots'], queryFn: () => listProjectSnapshots(id) })
export const useProjectActivity = (id: string) => useQuery({ queryKey: ['project', id, 'activity'], queryFn: () => listProjectActivity(id) })

const toast = (t: string, k?: 'success' | 'error') => useUiStore.getState().toast(t, k)
const useRefresh = () => { const qc = useQueryClient(); return () => { void qc.invalidateQueries({ queryKey: ['projects'] }); void qc.invalidateQueries({ queryKey: ['project'] }) } }

export function useCreateProject() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: postProject, onSuccess: () => { toast('Đã tạo dự án'); refresh() }, onError: () => toast('Tạo dự án thất bại', 'error') })
}
/** Lưu trữ / mở lại: KHÔNG optimistic, đổi sau khi BE xác nhận. */
export function useProjectStatus() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'archive' | 'reopen' }) => postProjectStatus(id, action),
    onSuccess: (_p, { action }) => { toast(action === 'archive' ? 'Đã lưu trữ dự án' : 'Đã mở lại dự án'); refresh() },
    onError: () => toast('Thao tác thất bại, thử lại', 'error'),
  })
}
export function useAssignGoal() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ goalId, projectId }: { goalId: string; projectId: string | null }) => postGoalProject(goalId, projectId),
    onSuccess: (g) => { useWorkStore.getState().upsertGoal(g); toast('Đã cập nhật dự án của mục tiêu'); refresh() },
    onError: () => toast('Không gán được mục tiêu, thử lại', 'error'),
  })
}

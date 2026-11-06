import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createDepartment, createGoal, deleteDepartment, getDepartmentStats, listDepartments, updateDepartment } from '../../api/departments'
import { isDepartmentEnabled } from '../../config/departments'
import { useDepartmentStore } from '../../store/departmentStore'
import type { DepartmentInput } from '../../types'

export const useDepartmentsQuery = () => useQuery({ queryKey: ['departments'], queryFn: listDepartments })

/** Tải GET /departments, bỏ phòng bị tắt trong config, nạp vào store. Gọi 1 lần ở gốc app. */
export function useDepartmentsSync() {
  const q = useDepartmentsQuery()
  const set = useDepartmentStore((s) => s.setDepartments)
  useEffect(() => { if (q.data) set(q.data.filter((d) => isDepartmentEnabled(d.slug))) }, [q.data, set])
  return q
}

/** Số liệu phòng (hoàn thành hôm nay, chi phí token). Tự tải lại khi có task hoàn thành (xem realtime/dispatch.ts). */
export const useDepartmentKpi = (id: string) => useQuery({ queryKey: ['dept-stats', id], queryFn: () => getDepartmentStats(id) })

export const useAssignGoal = (id: string) => useMutation({ mutationFn: (goal: string) => createGoal(id, goal) })

/** Sau khi đổi phòng: tải lại phòng, agent (đổi phòng / trưởng phòng) và các tầng. */
function useRefreshDepartments() {
  const qc = useQueryClient()
  return () => Promise.all(['departments', 'agents', 'floors', 'dept-stats'].map((k) => qc.invalidateQueries({ queryKey: [k] })))
}

/** Tạo (không có id) hoặc sửa (có id) phòng ban. */
export function useSaveDepartment() {
  const refresh = useRefreshDepartments()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DepartmentInput }) => (id ? updateDepartment(id, input) : createDepartment(input)),
    onSuccess: refresh,
  })
}

export function useDeleteDepartment() {
  const refresh = useRefreshDepartments()
  return useMutation({ mutationFn: deleteDepartment, onSuccess: refresh })
}

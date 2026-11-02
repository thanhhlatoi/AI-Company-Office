import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createGoal, getDepartmentStats, listDepartments } from '../../api/departments'
import { isDepartmentEnabled } from '../../config/departments'
import { useDepartmentStore } from '../../store/departmentStore'

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

import { create } from 'zustand'
import type { Department } from '../types'

interface DepartmentState {
  departmentsById: Record<string, Department>
  setDepartments: (list: Department[]) => void
}

export const useDepartmentStore = create<DepartmentState>((set) => ({
  departmentsById: {},
  setDepartments: (list) => set({ departmentsById: Object.fromEntries(list.map((d) => [d.id, d])) }),
}))

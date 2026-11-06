import { z } from 'zod'
import { DepartmentSchema, DepartmentStatsSchema, GoalResultSchema, type DepartmentInput } from '../types'
import { request } from './http'

export const listDepartments = () => request('GET', '/departments', z.array(DepartmentSchema))
export const getDepartmentStats = (id: string) => request('GET', `/departments/${id}/stats`, DepartmentStatsSchema)
export const createGoal = (id: string, goal: string) => request('POST', `/departments/${id}/goals`, GoalResultSchema, { goal })
export const createDepartment = (input: DepartmentInput) => request('POST', '/departments', DepartmentSchema, input)
export const updateDepartment = (id: string, input: DepartmentInput) => request('PUT', `/departments/${id}`, DepartmentSchema, input)
/** Agent trong phòng không bị xoá: chuyển về "Chưa phân phòng". */
export const deleteDepartment = (id: string) => request('DELETE', `/departments/${id}`, z.unknown())

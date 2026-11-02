import { z } from 'zod'
import { DepartmentSchema, DepartmentStatsSchema, GoalResultSchema } from '../types'
import { request } from './http'

export const listDepartments = () => request('GET', '/departments', z.array(DepartmentSchema))
export const getDepartmentStats = (id: string) => request('GET', `/departments/${id}/stats`, DepartmentStatsSchema)
export const createGoal = (id: string, goal: string) => request('POST', `/departments/${id}/goals`, GoalResultSchema, { goal })

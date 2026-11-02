import { z } from 'zod'
import { TaskSchema } from '../types'
import { request } from './http'

export const listTasks = (agentId: string) => request('GET', `/agents/${agentId}/tasks`, z.array(TaskSchema))
export const createTask = (agentId: string, body: { title: string; input: string }) =>
  request('POST', `/agents/${agentId}/tasks`, TaskSchema, body)

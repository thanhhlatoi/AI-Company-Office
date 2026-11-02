import { z } from 'zod'
import { AgentSchema, type AgentInput } from '../types'
import { request } from './http'

export const listAgents = () => request('GET', '/agents', z.array(AgentSchema))
export const getAgent = (id: string) => request('GET', `/agents/${id}`, AgentSchema)
export const createAgent = (input: AgentInput) => request('POST', '/agents', AgentSchema, input)
export const updateAgent = (id: string, input: AgentInput) => request('PUT', `/agents/${id}`, AgentSchema, input)
export const deleteAgent = (id: string) => request('DELETE', `/agents/${id}`, z.unknown())

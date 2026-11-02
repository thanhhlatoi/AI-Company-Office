// Cấu hình chung. Đổi VITE_USE_MOCK trong .env để chuyển mock <-> BE thật.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws'
export const STOMP_AGENTS_TOPIC = '/topic/agents'

// Danh sách model cố định cho dropdown trong form tạo/sửa agent.
export const AGENT_MODELS = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] as const

export const MAX_EVENTS_PER_AGENT = 200

// Cấu hình chung. VITE_USE_MOCK trong .env:
//   true   = toàn bộ dữ liệu giả, không gọi BE
//   false  = mọi thứ gọi BE thật
//   hybrid = endpoint BE đã có (xem api/beRoutes.ts) gọi BE thật, phần còn lại vẫn dùng mock. Realtime là STOMP thật.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export const HYBRID = import.meta.env.VITE_USE_MOCK === 'hybrid'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws'
// Khoá API của BE (AGENTOFFICE_API_KEY). Nằm trong bundle nên không phải bí mật với người mở được FE.
export const API_KEY = import.meta.env.VITE_API_KEY ?? ''
export const STOMP_AGENTS_TOPIC = '/topic/agents'

// Model đám mây, dùng cho bảng giá. Bot Hermes không chạy được nên form agent không cho chọn.
export const AGENT_MODELS = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] as const

// Model chạy thật trên Ollama của máy Hermes (192.168.1.184). Chọn model này thì BE ghi sang bot Hermes của agent.
// BE từ chối model không chạy được trên bot. Lấy danh sách bằng `ollama list`.
export const LOCAL_MODELS = ['qwen3.6-64k:latest', 'qwen3.6:35b-a3b-q4_K_M', 'hf.co/mradermacher/MiLMMT-46-4B-v1.0-GGUF:Q4_K_M'] as const

export const MAX_EVENTS_PER_AGENT = 200

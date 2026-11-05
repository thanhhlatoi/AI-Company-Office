// Bộ tạo lệnh Graphify (client-only, không gọi BE, không ghi file). Cú pháp lệnh lấy theo mô tả của dự án, CHƯA kiểm chứng trên máy thật.
export type Mode = 'code' | 'ollama' | 'none'
export type Os = 'unix' | 'powershell'
interface Block { title: string; note?: string; lines: string[] }

export const OLLAMA_PLACEHOLDER = 'http://<máy-ollama>:11434'

/** Địa chỉ Ollama cho Graphify: bỏ đuôi /v1 và dấu / cuối. Trả null nếu không hợp lệ HOẶC có ký tự lạ (lệnh được người dùng dán vào terminal, không để lọt dấu nháy/ký tự shell). */
export function ollamaHost(baseUrl: string): string | null {
  let u: URL
  try { u = new URL(baseUrl.trim()) } catch { return null }
  if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.username || u.password) return null
  const path = u.pathname.replace(/\/v1\/?$/, '').replace(/\/+$/, '')
  const out = `${u.protocol}//${u.host}${path}`
  return /^[A-Za-z0-9:/._\-[\]]+$/.test(out) ? out : null
}

const setEnv = (os: Os, k: string, v: string) => (os === 'unix' ? `export ${k}='${v}'` : `$env:${k} = '${v}'`)

export function buildCommands(mode: Mode, os: Os, ollamaBaseUrl: string): Block[] {
  const blocks: Block[] = [{
    title: '1. Cài đặt',
    note: 'Tên gói có HAI chữ y: graphifyy. Cần có uv trên máy.',
    lines: [mode === 'ollama' ? 'uv tool install "graphifyy[ollama]"' : 'uv tool install graphifyy'],
  }]
  if (mode !== 'code') {
    const host = mode === 'ollama' ? ollamaHost(ollamaBaseUrl) : null
    blocks.push({
      title: '2. Chọn backend',
      note: mode === 'ollama'
        ? `Biến chỉ có hiệu lực trong cửa sổ terminal đang mở.${host ? '' : ' Địa chỉ Ollama ở tab Ollama chưa hợp lệ nên đang dùng chỗ trống để bạn tự điền.'}`
        : 'Biến chỉ có hiệu lực trong cửa sổ terminal đang mở.',
      lines: mode === 'ollama'
        ? [setEnv(os, 'GRAPHIFY_BACKEND', 'ollama'), setEnv(os, 'OLLAMA_BASE_URL', host ?? OLLAMA_PLACEHOLDER)]
        : [setEnv(os, 'GRAPHIFY_BACKEND', 'none')],
    })
  }
  blocks.push({
    title: `${mode === 'code' ? 2 : 3}. Tạo đồ thị`,
    note: mode === 'code' ? 'Chỉ đọc code, không gọi model, chạy offline.' : mode === 'ollama' ? 'Tài liệu sẽ được model Ollama của bạn đọc (nội bộ, không ra ngoài).' : 'Không dùng LLM.',
    lines: [mode === 'code' ? 'graphify extract . --code-only' : 'graphify extract .'],
  })
  blocks.push({
    title: `${mode === 'code' ? 3 : 4}. Giữ đồ thị luôn mới (chọn một)`,
    lines: ['# cài hook để tự cập nhật theo thay đổi', 'graphify hook install', '# hoặc chạy nền theo dõi file', 'graphify watch'],
  })
  return blocks
}

export const DEFAULT_IGNORE = `# Build và thư viện
target/
node_modules/
dist/
build/

# Bí mật và dữ liệu nhạy cảm
.env
.env.*
*.pem
*.key
secrets/
*.sqlite
*.db
`

export const CHECKLIST = [
  { id: 'uv', label: 'Đã có uv trên máy lập trình' },
  { id: 'install', label: 'Đã cài graphifyy' },
  { id: 'env', label: 'Đã đặt biến môi trường (nếu dùng Ollama hoặc tắt LLM)' },
  { id: 'ignore', label: 'Đã tạo .graphifyignore ở gốc dự án' },
  { id: 'extract', label: 'Đã chạy graphify extract lần đầu' },
  { id: 'fresh', label: 'Đã cài hook hoặc chạy watch' },
] as const

/** Đọc danh sách ô đã tick từ localStorage; dữ liệu hỏng thì coi như chưa tick gì. */
export function parseChecked(raw: string | null): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && CHECKLIST.some((c) => c.id === x)) : []
  } catch { return [] }
}

/**
 * Tên đầy đủ của tiền tố nhà cung cấp trên 9Router (nguồn: open-sse/providers/registry/*.js của 9Router).
 * Tiền tố lạ (9Router thêm nhà mới) thì hiện nguyên tiền tố.
 */
const NAMES: Record<string, string> = {
  ag: 'Antigravity',
  cx: 'OpenAI Codex',
  gcli: 'Grok CLI (Grok Build)',
  mmf: 'MiMo Code Free',
  nvidia: 'NVIDIA NIM',
  ollama: 'Ollama Cloud',
  oc: 'OpenCode Free',
  'ollama-local': 'Ollama Local',
  'local-device': 'Local Device',
}

/** Chạy trên máy bạn (local) hay trên dịch vụ ngoài (cloud). Nguồn: 9Router (ollama-local gọi localhost:11434). Mọi tiền tố khác coi là cloud. */
const LOCAL = new Set(['ollama-local', 'local-device'])
export const isLocalProvider = (alias: string): boolean => LOCAL.has(alias)

export const providerName = (alias: string): string => NAMES[alias] ?? alias

/** Cách dùng/trả phí của nhà cung cấp (nguồn: category/hasFree/noAuth trong registry của 9Router). */
const PLANS: Record<string, string> = {
  ag: 'Đăng nhập OAuth · dùng gói thuê bao Antigravity',
  cx: 'Đăng nhập OAuth · dùng gói ChatGPT/Codex',
  gcli: 'Đăng nhập OAuth · dùng credit gói Grok Build',
  mmf: 'Miễn phí, không cần khoá · Xiaomi báo đã ngừng kênh miễn phí',
  nvidia: 'Miễn phí cho thành viên NVIDIA Developer · API key',
  oc: 'Miễn phí · không cần khoá',
  ollama: 'Gói miễn phí giới hạn (1 model cloud mỗi lúc) · API key',
  'ollama-local': 'Chạy trên máy bạn (localhost:11434) · không tốn quota',
}
export const providerPlan = (alias: string): string | null => PLANS[alias] ?? null

/** Chữ cái trong ô tròn của thẻ: 2 ký tự đầu của tên đầy đủ. */
export const providerInitials = (alias: string): string => providerName(alias).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()

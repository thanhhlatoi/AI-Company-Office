import type { z } from 'zod'
import { API_BASE_URL, API_KEY, HYBRID, USE_MOCK } from '../lib/config'
import { authHeaders, getOwnerToken, needsOwnerToken, setOwnerToken } from '../lib/ownerToken'
import { isBackedByBe } from './beRoutes'
import { mockRequest } from '../mocks/mockApi'

export class ApiError extends Error {
  status: number
  /** Body JSON của response lỗi (vd 409 `{reasonCode}` khi kéo thả bị từ chối) */
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
  /** `ApiError{code, message, requestId}` chuẩn của BE (nếu body đúng dạng đó) */
  private field(k: 'code' | 'message' | 'requestId') {
    const v = (this.body as Record<string, unknown> | null)?.[k]
    return typeof v === 'string' ? v : undefined
  }
  get code() { return this.field('code') }
  get serverMessage() { return this.field('message') }
  get requestId() { return this.field('requestId') }
}

/**
 * Điểm DUY NHẤT phân nhánh mock/BE thật. Mọi response (kể cả mock) đều đi qua zod:
 * lệch schema thì log rõ trong console và ném ApiError (không làm sập app).
 */
export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let json: unknown
  if (USE_MOCK || (HYBRID && !isBackedByBe(method, path))) {
    json = await new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      mockRequest(method, path, body).then(resolve, reject)
    })
  } else {
    // Mã chủ chỉ đi kèm request tới /settings/ai (xem lib/ownerToken.ts); các request khác không bao giờ mang nó
    const headers = { ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...authHeaders(path, getOwnerToken()) }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
    // Mã sai/hết hiệu lực: xoá để giao diện hỏi lại, không giữ mãi một mã chắc chắn bị từ chối
    if (res.status === 401 && needsOwnerToken(path)) setOwnerToken(null)
    if (!res.ok) throw new ApiError(res.status, `${method} ${path} -> HTTP ${res.status}`, await res.json().catch(() => null))
    const text = await res.text()
    json = text ? JSON.parse(text) : null
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    // /settings/ai có thể chứa bí mật nếu BE lỗi: không in nguyên response ra console
    console.error(`[API] ${method} ${path} lệch schema so với types/index.ts:`, parsed.error.issues, path.startsWith('/settings/ai') ? '(ẩn)' : json)
    throw new ApiError(0, `Response của ${method} ${path} sai định dạng`)
  }
  return parsed.data
}

import { ApiError } from '../../api/http'

/** Lỗi hiện cho người dùng: message + requestId (để tra log BE), không stacktrace, không nội dung response. */
export function describeError(e: unknown): { message: string; requestId?: string } {
  if (e instanceof ApiError) {
    if (e.status === 0) return { message: 'BE trả dữ liệu không đúng định dạng' } // zod parse lỗi (http.ts)
    return { message: e.serverMessage ?? `Lỗi ${e.status}`, requestId: e.requestId }
  }
  return { message: 'Không kết nối được tới BE' }
}

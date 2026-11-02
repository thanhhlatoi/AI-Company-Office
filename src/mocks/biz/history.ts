import { ApiError } from '../../api/http'
import { conversations, messagesOf } from './seedText'

/** DELETE /conversations/{id}. undefined = không phải route của nhóm này. */
export function historyRequest(method: string, path: string): unknown {
  const m = path.match(/^\/conversations\/([^/]+)$/)
  if (!m || method !== 'DELETE') return undefined
  const i = conversations.findIndex((c) => c.id === m[1])
  if (i < 0) throw new ApiError(404, 'Mock 404: không có hội thoại')
  conversations.splice(i, 1)
  messagesOf.delete(m[1])
  return null
}

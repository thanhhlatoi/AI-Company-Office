import { useQuery } from '@tanstack/react-query'
import { getAiModels } from '../../api/settingsAi'
import { LOCAL_MODELS, USE_MOCK } from '../../lib/config'

/**
 * Tên các model thật đang có trên Ollama (hỏi BE, BE hỏi /api/tags). Chưa tải xong, BE lỗi, hoặc đang chạy mock thì dùng
 * danh sách dự phòng trong lib/config.ts để form vẫn chọn được model.
 */
export function useLocalModelIds(): readonly string[] {
  const q = useQuery({
    queryKey: ['settings-ai', 'models', 'ollama', 'ids'],
    queryFn: () => getAiModels('ollama'),
    enabled: !USE_MOCK, retry: false, staleTime: 60_000,
  })
  const ids = q.data?.models.map((m) => m.id) ?? []
  return ids.length > 0 ? ids : LOCAL_MODELS
}

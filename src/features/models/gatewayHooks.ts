import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useReducer } from 'react'
import { listLlmModels, listLlmProviders, postLlmModelTest } from '../../api/gateway'
import { useUiStore } from '../../store/uiStore'
import { errText } from '../studio/mutations'
import { loadKnown, mergeKnown, saveKnown } from './knownProviders'

export const useLlmModels = (provider: string | null) => useQuery({ queryKey: ['llm-models', provider], queryFn: () => listLlmModels(provider!), enabled: provider !== null, staleTime: 60_000 })
/** Model của nhiều nhà cung cấp cùng lúc (cho số liệu trên thẻ); dùng chung cache với useLlmModels. */
export const useModelsOf = (providers: string[]) => useQueries({ queries: providers.map((p) => ({ queryKey: ['llm-models', p], queryFn: () => listLlmModels(p), staleTime: 60_000 })) })
export const useGatewayTest = () => useMutation({ mutationFn: postLlmModelTest, onError: (e) => useUiStore.getState().toast(errText(e, 'Không gọi thử được model'), 'error') })

/** Nhà cung cấp của 9Router, tự làm mới mỗi 15 giây. Lỗi gọi 9Router = mất kết nối: các mục đã biết chuyển sang không hoạt động. */
export function useProviderRows() {
  const q = useQuery({ queryKey: ['llm-providers'], queryFn: listLlmProviders, refetchInterval: 15_000, retry: 1 })
  const [tick, bump] = useReducer((n: number) => n + 1, 0)
  // ghi nhớ vào localStorage (hệ thống ngoài) mỗi lần lấy được danh sách mới; lỗi thì không đụng vào bộ nhớ
  useEffect(() => { if (q.data) saveKnown(mergeKnown(loadKnown(), q.data, new Date().toISOString()).next) }, [q.data, q.dataUpdatedAt])
  const rows = useMemo(() => (q.isLoading ? [] : mergeKnown(loadKnown(), q.isError ? null : q.data ?? [], '').rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick: buộc đọc lại bộ nhớ sau khi "Bỏ khỏi danh sách"
    [q.data, q.dataUpdatedAt, q.isError, q.isLoading, tick])
  const forget = (name: string) => { const k = loadKnown(); delete k[name]; saveKnown(k); bump() }
  return { rows, loading: q.isLoading, down: q.isError, refetch: () => void q.refetch(), forget }
}

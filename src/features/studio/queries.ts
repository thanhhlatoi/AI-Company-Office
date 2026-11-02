import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  checkTool, getEffective, listComparisons, listModelPolicies, getEvalSet, getModelPolicy, getStudio, listChunks, listCollections, listDocuments, listEffectiveAll, listGrants,
  listMemory, listModelProfiles, listNamespaces, listPermissionAudit, listPromptVersions, listRoutingRules, listSecrets, listTemplates,
  listToolCalls, listTools, searchCollection, type MemoryFilters, type ToolCallFilters,
} from '../../api/studio'
import { listEmbeddingModels } from '../../api/knowledge'
import { getConversationContext } from '../../api/memory'

// Khoá truy vấn = [nhóm, ...]; realtime làm mới theo NHÓM (xem realtime/dispatch.ts), nên nhóm là phần tử đầu.
const next = (p: { nextCursor?: string | null }) => p.nextCursor ?? undefined
const infinite = { initialPageParam: undefined as string | undefined, getNextPageParam: next }

// Công cụ và quyền
export const useTools = () => useQuery({ queryKey: ['tools'], queryFn: listTools })
export const useGrants = (agentId?: string) => useQuery({ queryKey: ['grants', agentId ?? 'all'], queryFn: () => listGrants(agentId) })
export const useEffective = (agentId: string) => useQuery({ queryKey: ['effective', agentId], queryFn: () => getEffective(agentId) })
export const useEffectiveAll = () => useQuery({ queryKey: ['effective', 'all'], queryFn: listEffectiveAll })
export const useToolCalls = (f: ToolCallFilters) => useInfiniteQuery({ queryKey: ['tool-calls', f], queryFn: ({ pageParam }) => listToolCalls(f, pageParam), ...infinite })
export const useSecrets = () => useQuery({ queryKey: ['secrets'], queryFn: listSecrets })
export const usePermissionAudit = () => useInfiniteQuery({ queryKey: ['audit'], queryFn: ({ pageParam }) => listPermissionAudit(pageParam), ...infinite })
export const useCheckTool = (toolId: string, agentId: string, args: Record<string, unknown>, enabled: boolean) => useQuery({ queryKey: ['check', toolId, agentId, args], queryFn: () => checkTool(toolId, agentId, args), enabled })

// Model
export const useModelProfiles = () => useQuery({ queryKey: ['models'], queryFn: listModelProfiles })
export const useModelPolicy = (agentId: string) => useQuery({ queryKey: ['model-policy', agentId], queryFn: () => getModelPolicy(agentId) })
export const useModelPolicies = () => useQuery({ queryKey: ['model-policy', 'all'], queryFn: listModelPolicies })
export const useComparisons = () => useQuery({ queryKey: ['comparisons'], queryFn: listComparisons })
export const useRoutingRules = () => useQuery({ queryKey: ['routing-rules'], queryFn: listRoutingRules })

// Kho tài liệu
/** Đang dựng chỉ mục thì hỏi lại mỗi 2 giây để thanh tiến độ chạy */
export const useCollections = () => useQuery({ queryKey: ['collections'], queryFn: listCollections, refetchInterval: (q) => (q.state.data?.some((c) => c.indexState === 'REINDEXING' || c.indexState === 'INDEXING') ? 2000 : false) })
export const useEmbeddingModels = () => useQuery({ queryKey: ['embedding-models'], queryFn: listEmbeddingModels })
export const useDocuments = (collectionId: string) => useInfiniteQuery({ queryKey: ['documents', collectionId], queryFn: ({ pageParam }) => listDocuments(collectionId, pageParam), ...infinite })
export const useChunks = (documentId: string | null) => useInfiniteQuery({ queryKey: ['chunks', documentId], queryFn: ({ pageParam }) => listChunks(documentId as string, pageParam), enabled: !!documentId, ...infinite })
export const useSearch = (collectionId: string, q: string, asAgent?: string) => useQuery({ queryKey: ['search', collectionId, q, asAgent ?? ''], queryFn: () => searchCollection(collectionId, q, asAgent), enabled: q.trim().length > 1 })
export const useEvalSet = (collectionId: string) => useQuery({ queryKey: ['eval', collectionId], queryFn: () => getEvalSet(collectionId) })

// Bộ nhớ
export const useMemory = (f: MemoryFilters) => useInfiniteQuery({ queryKey: ['memory', f], queryFn: ({ pageParam }) => listMemory(f, pageParam), ...infinite })
export const useNamespaces = () => useQuery({ queryKey: ['namespaces'], queryFn: listNamespaces })
/** Số mục chờ xem xét (chuông "Cần xử lý") */
export const usePendingMemory = () => useQuery({ queryKey: ['namespaces'], queryFn: listNamespaces, select: (l) => l.reduce((s, n) => s + n.pendingCount, 0), refetchInterval: 60_000 })

// Agent Studio và mẫu
export const useStudio = (agentId: string) => useQuery({ queryKey: ['studio', agentId], queryFn: () => getStudio(agentId) })
export const usePromptVersions = (agentId: string) => useQuery({ queryKey: ['prompt-versions', agentId], queryFn: () => listPromptVersions(agentId) })
export const useConversationContext = (id: string) => useQuery({ queryKey: ['conversation-context', id], queryFn: () => getConversationContext(id) })
export const useTemplates = () => useQuery({ queryKey: ['templates'], queryFn: listTemplates })

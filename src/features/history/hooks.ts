import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getConversation, listConversations, listMessages, type HistoryFilters } from '../../api/biz'

export const useConversations = (f: HistoryFilters) =>
  useInfiniteQuery({ queryKey: ['conversations', f], queryFn: ({ pageParam }) => listConversations(f, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (p) => p.nextCursor ?? undefined })

export const useMessages = (id: string) =>
  useInfiniteQuery({ queryKey: ['messages', id], queryFn: ({ pageParam }) => listMessages(id, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (p) => p.nextCursor ?? undefined })

export const useConversation = (id: string) => useQuery({ queryKey: ['conversation', id], queryFn: () => getConversation(id) })

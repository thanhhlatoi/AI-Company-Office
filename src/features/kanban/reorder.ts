/** Đưa `id` lên đứng ngay TRƯỚC `beforeId` (null = cuối danh sách). Không tìm thấy `beforeId` thì giữ nguyên. */
export function reorder(ids: string[], id: string, beforeId: string | null): string[] {
  const rest = ids.filter((x) => x !== id)
  const at = beforeId ? rest.indexOf(beforeId) : rest.length
  if (at < 0) return ids
  rest.splice(at, 0, id)
  return rest
}

/** Như reorder nhưng trên các trang của useInfiniteQuery: giữ nguyên kích thước từng trang. */
export function reorderPages<T extends { id: string }, P extends { items: T[] }>(pages: P[], id: string, beforeId: string | null): P[] {
  const flat = pages.flatMap((p) => p.items)
  const byId = new Map(flat.map((x) => [x.id, x]))
  const order = reorder(flat.map((x) => x.id), id, beforeId)
  let i = 0
  return pages.map((p) => ({ ...p, items: p.items.map(() => byId.get(order[i++]) as T) }))
}

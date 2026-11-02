import { EVENTS_PAGE, fetchEvents, getSystem, listAllApprovals, listAllTasks, listGoals } from '../api/work'
import { useRealtimeStore } from '../store/realtimeStore'
import { useWorkStore } from '../store/workStore'

// Đồng bộ DomainEvent: mỗi event có `id` tăng dần. Quy tắc:
//  - chưa có ảnh chụp ban đầu: giữ event lại (pending), áp sau khi có ảnh chụp
//  - id <= lastEventId: bỏ (trùng); id = last+1: áp ngay; id > last+1: có khoảng trống -> giữ lại và gọi GET /events?afterId=last để bù
//  - bù quá lớn (BE báo `truncated`): tải lại toàn bộ
// Event không có id (message kiểu cũ) áp ngay, không tham gia đồng bộ.

let apply: (raw: unknown) => void = () => {}
/** dispatch.ts đăng ký hàm áp dụng một message đã qua kiểm tra id. */
export const setApplier = (fn: (raw: unknown) => void) => { apply = fn }

const pending = new Map<number, unknown>()
let catching: Promise<void> | null = null
let loading: Promise<void> | null = null

/** Lấy id kể cả khi payload sai schema, để một event lạ không làm kẹt con trỏ. */
const idOf = (raw: unknown): number | null => {
  const id = (raw as { id?: unknown } | null)?.id
  return typeof id === 'number' && Number.isInteger(id) ? id : null
}
const last = () => useWorkStore.getState().lastEventId
const advance = (id: number) => useWorkStore.getState().setLastEventId(id)

/** Cửa vào duy nhất của mọi message realtime. */
export function receive(raw: unknown) {
  const id = idOf(raw)
  if (id == null) return apply(raw)
  const l = last()
  if (l == null) { pending.set(id, raw); return }
  if (id <= l) return
  if (id === l + 1) { apply(raw); advance(id); drain(); return }
  pending.set(id, raw)
  void catchUp()
}

/** Áp các event đang giữ theo thứ tự liên tục; còn khoảng trống thì đi bù. */
function drain() {
  let l = last()
  if (l == null) return
  for (const id of [...pending.keys()]) if (id <= l) pending.delete(id)
  for (let raw = pending.get(l + 1); raw !== undefined; raw = pending.get(l + 1)) {
    pending.delete(l + 1)
    apply(raw)
    advance(++l)
  }
  if (pending.size) void catchUp()
}

/** Tải ảnh chụp ban đầu (hoặc tải lại toàn bộ). Lấy mốc event TRƯỚC các danh sách: event xảy ra giữa chừng sẽ được áp lại (áp lại là vô hại). */
export function loadSnapshot(): Promise<void> {
  if (loading) return loading
  const w = useWorkStore.getState()
  w.setSync('loading')
  loading = (async () => {
    try {
      const system = await getSystem()
      const [goals, tasks, approvals] = await Promise.all([listGoals(), listAllTasks(), listAllApprovals()])
      useWorkStore.getState().replaceAll({ goals, tasks, approvals, system })
      useRealtimeStore.getState().setApprovals(approvals.filter((a) => a.status === 'PENDING')) // nhân vật giơ tay theo đúng danh sách chờ
      useWorkStore.getState().setSync('ready')
      drain()
    } catch (e) {
      console.error('[Sync] tải dữ liệu giao việc lỗi:', e)
      useWorkStore.getState().setSync('error')
    } finally { loading = null }
  })()
  return loading
}

/** Bù sự kiện đã lỡ (mất kết nối, hoặc phát hiện khoảng trống). Chưa có mốc thì tải lại toàn bộ. */
export function catchUp(): Promise<void> {
  if (last() == null) return loadSnapshot()
  if (catching) return catching
  catching = (async () => {
    try {
      for (;;) {
        const page = await fetchEvents(last() as number)
        if (page.truncated) { pending.clear(); useWorkStore.getState().setLastEventId(null); await loadSnapshot(); return }
        for (const raw of page.events) {
          const id = idOf(raw)
          if (id == null || id <= (last() as number)) continue
          apply(raw) // BE trả đúng thứ tự: chấp nhận cả khi id nhảy cách
          advance(id)
        }
        if (page.events.length < EVENTS_PAGE) { if (page.lastId > (last() as number)) advance(page.lastId); break }
      }
      drain()
    } catch (e) {
      console.error('[Sync] bù sự kiện lỗi:', e)
    } finally { catching = null }
  })()
  return catching
}

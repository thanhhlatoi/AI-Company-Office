import { useSyncExternalStore } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { motionQuery } from './motion'

/** Giảm chuyển động = hệ thống yêu cầu (prefers-reduced-motion) HOẶC người dùng tự bật trong cài đặt. Một nguồn duy nhất cho cả React lẫn canvas. */
export const isReducedMotion = () => motionQuery().matches || useSettingsStore.getState().reduceMotion

/** Cho code ngoài React (scene Pixi): gọi `cb` mỗi khi cờ đổi. Trả về hàm huỷ. */
export function subscribeReducedMotion(cb: (reduced: boolean) => void): () => void {
  const mq = motionQuery()
  const fire = () => cb(isReducedMotion())
  mq.addEventListener('change', fire)
  const off = useSettingsStore.subscribe((s, p) => { if (s.reduceMotion !== p.reduceMotion) fire() })
  return () => { mq.removeEventListener('change', fire); off() }
}

export function useReducedMotion(): boolean {
  const user = useSettingsStore((s) => s.reduceMotion)
  const system = useSyncExternalStore((cb) => { const mq = motionQuery(); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb) }, () => motionQuery().matches)
  return system || user
}

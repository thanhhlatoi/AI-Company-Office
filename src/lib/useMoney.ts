import { useSettingsStore } from '../store/settingsStore'
import { formatMoney } from './money'

/** Hàm định dạng tiền theo cài đặt: "$0.0123" hoặc "$0.0123 (≈ 320 đ)" khi bật hiện đồng. */
export function useMoney() {
  const show = useSettingsStore((s) => s.showVnd)
  const rate = useSettingsStore((s) => s.vndRate)
  return (micro: number) => formatMoney(micro, show ? rate : 0)
}

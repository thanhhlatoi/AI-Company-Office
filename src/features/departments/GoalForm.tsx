import { useUiStore } from '../../store/uiStore'

/** Tab "Mục tiêu phòng" của trưởng phòng: mở hộp thoại "Mục tiêu mới" với phòng chọn sẵn (luồng mục tiêu mới có duyệt kế hoạch). */
export function GoalForm({ departmentId }: { departmentId: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Giao mục tiêu cho cả phòng. Trưởng phòng sẽ đề xuất kế hoạch để bạn duyệt trước khi chạy.</p>
      <button onClick={() => useUiStore.getState().openComposer(departmentId)} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">Đặt mục tiêu cho phòng</button>
    </div>
  )
}

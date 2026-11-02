import { Modal } from '../../components/Modal'
import { useUiStore } from '../../store/uiStore'

const K = ({ children }: { children: string }) => <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800">{children}</kbd>
const GROUPS: { title: string; rows: [string[], string][] }[] = [
  { title: 'Chung', rows: [
    [['Ctrl', 'K'], 'Tìm agent / phòng ban'], [['1', '…', '9'], 'Vào phòng thứ 1…9'], [['0'], 'Về toàn công ty'], [['A'], 'Mở / đóng hộp thư "Cần xử lý" (duyệt, chờ ngân sách)'],
    [['G'], 'Tạo mục tiêu mới'], [['Esc'], 'Đóng ngăn bên / hộp thoại / huỷ thao tác kéo'], [['?'], 'Mở bảng phím tắt này'], [['Tab'], 'Di chuyển giữa các nút; "Bỏ qua tới nội dung" hiện khi bấm Tab đầu tiên'] ] },
  { title: 'Bảng task (Kanban)', rows: [
    [['Tab'], 'Tới thẻ cần thao tác'], [['Space'], 'Nhấc thẻ / thả thẻ'], [['↑', '↓'], 'Đổi thứ tự trong cột Chờ (nhảy giữa các thẻ)'], [['←', '→'], 'Sang cột khác'], [['Esc'], 'Huỷ khi đang nhấc thẻ'], [['Enter'], 'Mở chi tiết task'] ] },
  { title: 'Cấu hình agent, model, công cụ', rows: [
    [['Tab'], 'Tới tay cầm kéo ở danh sách có thể sắp xếp (model dự phòng, luật định tuyến)'], [['Space'], 'Nhấc / thả mục đang chọn'], [['↑', '↓'], 'Đổi vị trí khi đang nhấc'], [['Esc'], 'Huỷ thao tác kéo / đóng hộp thoại (mọi hộp xác nhận)'],
    [['Enter'], 'Trong ô "Thêm vào danh sách" (miền nhận, thư mục...): thêm mục'] ] },
  { title: 'Văn phòng (canvas)', rows: [
    [['Kéo chuột'], 'Di chuyển bản đồ'], [['Cuộn'], 'Phóng to / thu nhỏ'], [['Shift', 'G'], 'Bật / tắt lớp gỡ lỗi đường đi của nhân vật'] ] },
]

/** Hộp "Phím tắt" (mở bằng phím ? hoặc nút ? trên thanh trên). */
export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen)
  if (!open) return null
  return (
    <Modal title="Phím tắt" onClose={() => useUiStore.getState().setShortcuts(false)}>
      <div className="space-y-4">{GROUPS.map((g) => (
        <section key={g.title} aria-label={g.title}><h3 className="mb-1 text-sm font-semibold">{g.title}</h3>
          <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-1.5 text-sm">{g.rows.map(([keys, what]) => (
            <div key={keys.join('+') + what} className="contents"><dt className="flex flex-wrap items-center gap-1">{keys.map((k, i) => <span key={i} className="flex items-center gap-1">{i > 0 && k !== '…' && keys[i - 1] !== '…' && <span aria-hidden="true">+</span>}<K>{k}</K></span>)}</dt><dd className="text-slate-700">{what}</dd></div>))}
          </dl></section>))}
      </div>
    </Modal>
  )
}

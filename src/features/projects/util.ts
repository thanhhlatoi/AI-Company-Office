import type { Project } from '../../types/project'

export const totalTasks = (p: Project) => Object.values(p.counts).reduce((s, n) => s + n, 0)
export const PROGRESS_HELP = 'Tiến độ = trọng số task XONG / trọng số task chưa huỷ (ưu tiên Cao tính 3, Thường 2, Thấp 1). Task lỗi vẫn nằm ở mẫu số và được đếm riêng, không bị ẩn.'

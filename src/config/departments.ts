import type { PaletteName } from '../styles/tokens'

// NGUỒN DUY NHẤT về phòng ban cho FE (seed mock + cách vẽ). Thêm/xoá phòng: chỉ sửa file này.
// Khi BE có /departments, dữ liệu phòng đến từ BE; file này chỉ còn cung cấp props trang trí theo `slug`.

/** Mỗi prop là một hàm vẽ trong features/office/props/ (làm ở Bước 3-4). */
export type PropKind =
  | 'plant' | 'meeting-table' | 'goal-board'
  | 'meeting-table-large' | 'coffee-machine' | 'approval-corner' // chỉ dùng cho Khu chung
  | 'microphone' | 'ring-light' | 'idea-board' | 'timeline-screen'
  | 'neon-sign' | 'phone-stand' | 'poster-wall'
  | 'whiteboard' | 'server-rack'
  | 'filing-cabinet' | 'safe' | 'cash-register' | 'chart-wall'
  | 'growth-chart' | 'delivery-map'
  | 'network-board' | 'ups' | 'temp-gauge'

/** runsOn = id thiết bị (config/devices.ts) mà agent chạy trên đó. */
export interface Member { name: string; role: string; runsOn?: string; skills?: string[] } // name = chức danh

/** Phòng Hạ tầng: có thêm KHU THIẾT BỊ (xem features/office/layout.ts). */
export const INFRA_SLUG = 'ha-tang'

export interface DepartmentConfig {
  slug: string
  name: string
  icon: string // tên icon lucide (components/DepartmentIcon.tsx)
  palette: PaletteName
  /** false = ẩn phòng khỏi app (phòng "tuỳ chọn") */
  enabled: boolean
  /** số màn hình trên mỗi bàn (phòng Công nghệ có nhiều màn hình) */
  monitorsPerDesk: number
  props: PropKind[]
  head: Member
  staff: Member[]
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    slug: 'dieu-hanh', name: 'Điều hành', icon: 'crown', palette: 'bronze', enabled: true, monitorsPerDesk: 1,
    props: ['meeting-table', 'goal-board', 'plant'],
    head: { name: 'Hermes', role: 'Tổng điều phối', skills: ['điều phối', 'lập kế hoạch', 'giao việc'] },
    staff: [
      { name: 'Thư ký lịch', role: 'Lịch & cuộc họp', skills: ['lịch', 'cuộc họp'] },
      { name: 'Giám sát hệ thống', role: 'Theo dõi vận hành', skills: ['giám sát'] },
    ],
  },
  {
    slug: 'studio-youtube', name: 'Studio YouTube', icon: 'clapperboard', palette: 'coral', enabled: true, monitorsPerDesk: 1,
    props: ['microphone', 'ring-light', 'idea-board', 'timeline-screen'],
    head: { name: 'Biên tập trưởng', role: 'Trưởng phòng Studio', skills: ['biên tập', 'duyệt nội dung'] },
    staff: [
      { name: 'Biên kịch', role: 'Tiếng Việt', runsOn: 'workstation', skills: ['viết kịch bản', 'tiếng Việt'] },
      { name: 'Biên tập Qwen', role: 'Biên tập nội dung', runsOn: 'ai-pc', skills: ['biên tập', 'tiếng Việt'] },
      { name: 'Kiểm duyệt Claude', role: 'Kiểm duyệt', skills: ['kiểm duyệt'] },
      { name: 'Dịch thuật', role: 'EN / ES / DE', runsOn: 'laptop', skills: ['dịch EN', 'dịch ES', 'dịch DE'] },
      { name: 'Lồng tiếng TTS', role: 'Giọng đọc', runsOn: 'ai-pc', skills: ['lồng tiếng'] },
      { name: 'Thumbnail & Tiêu đề', role: 'Hình ảnh & SEO', skills: ['thumbnail', 'SEO'] },
    ],
  },
  {
    slug: 'tiktok-shorts', name: 'Studio TikTok & Shorts', icon: 'smartphone', palette: 'violet', enabled: true, monitorsPerDesk: 1,
    props: ['neon-sign', 'phone-stand', 'poster-wall'],
    head: { name: 'Trưởng nhóm Short', role: 'Trưởng phòng Short', skills: ['điều phối nhóm'] },
    staff: [
      { name: 'Cắt clip', role: 'Dựng video ngắn', runsOn: 'laptop', skills: ['dựng video'] },
      { name: 'Caption & Hashtag', role: 'Nội dung đăng', skills: ['caption', 'hashtag'] },
      { name: 'Lên lịch đăng', role: 'Xuất bản', skills: ['xuất bản'] },
      { name: 'Phân tích xu hướng', role: 'Trend', skills: ['phân tích xu hướng'] },
    ],
  },
  {
    slug: 'cong-nghe-web', name: 'Công nghệ Web', icon: 'code', palette: 'blue', enabled: true, monitorsPerDesk: 2,
    props: ['whiteboard', 'server-rack'],
    head: { name: 'Tech Lead', role: 'Trưởng phòng Công nghệ', skills: ['review code'] },
    staff: [
      { name: 'Frontend', role: 'React / UI', runsOn: 'workstation', skills: ['React', 'UI'] },
      { name: 'Backend', role: 'Java', runsOn: 'server', skills: ['Java', 'API'] },
      { name: 'DevOps/NAS', role: 'Hạ tầng', runsOn: 'server', skills: ['hạ tầng', 'triển khai'] },
      { name: 'QA', role: 'Kiểm thử', skills: ['kiểm thử'] },
      { name: 'Bảo mật', role: 'Security', skills: ['bảo mật'] },
    ],
  },
  {
    slug: 'ke-toan-thu-quy', name: 'Kế toán & Thủ quỹ', icon: 'wallet', palette: 'green', enabled: true, monitorsPerDesk: 1,
    props: ['filing-cabinet', 'safe', 'cash-register', 'chart-wall'],
    head: { name: 'Kế toán trưởng', role: 'Trưởng phòng Kế toán', skills: ['kế toán'] },
    staff: [
      { name: 'Thủ quỹ', role: 'Ngân quỹ', skills: ['ngân quỹ'] },
      { name: 'Kế toán chi phí token', role: 'Chi phí AI', skills: ['chi phí AI'] },
      { name: 'Kế toán thuế', role: 'Thuế & doanh thu', skills: ['thuế'] },
      { name: 'Báo cáo', role: 'Báo cáo tài chính', skills: ['báo cáo'] },
    ],
  },
  {
    slug: 'kinh-doanh', name: 'Kinh doanh', icon: 'briefcase', palette: 'orange', enabled: true, monitorsPerDesk: 1,
    props: ['growth-chart', 'delivery-map'],
    head: { name: 'Trưởng Kinh doanh', role: 'Trưởng phòng Kinh doanh', skills: ['kinh doanh'] },
    staff: [
      { name: 'Sales', role: 'Bán hàng', skills: ['bán hàng'] },
      { name: 'Mua hàng', role: 'Cung ứng', skills: ['cung ứng'] },
      { name: 'CSKH', role: 'Chăm sóc khách hàng', skills: ['chăm sóc khách hàng'] },
    ],
  },
  {
    slug: INFRA_SLUG, name: 'Hạ tầng & Máy móc', icon: 'server', palette: 'steel', enabled: true, monitorsPerDesk: 2,
    props: ['network-board', 'server-rack', 'ups', 'temp-gauge'],
    head: { name: 'Trưởng Hạ tầng', role: 'SysAdmin', runsOn: 'server', skills: ['quản trị hệ thống'] },
    staff: [
      { name: 'Giám sát hệ thống', role: 'Giám sát', runsOn: 'server', skills: ['giám sát'] },
      { name: 'Quản trị mạng', role: 'Router & mạng', runsOn: 'server', skills: ['mạng'] },
      { name: 'Sao lưu & NAS', role: 'Backup', runsOn: 'nas', skills: ['sao lưu'] },
      { name: 'Quản lý AI local', role: 'Model & GPU', runsOn: 'ai-pc', skills: ['quản lý model', 'GPU'] },
    ],
  },
]

export const departmentConfig = (slug: string) => DEPARTMENTS.find((d) => d.slug === slug)
/** Phòng không có trong config (BE thêm mới) mặc định được hiện. */
export const isDepartmentEnabled = (slug: string) => departmentConfig(slug)?.enabled !== false

/** Khu chung: phòng họp, quầy cà phê, góc "Chờ duyệt". Không phải phòng ban (không có trong sidebar/BE). */
export const COMMON_AREA = {
  slug: 'khu-chung',
  name: 'Khu chung',
  color: '#64748b',
  props: ['meeting-table-large', 'coffee-machine', 'approval-corner'] as PropKind[],
}
/** Props của một phòng theo slug (phòng ban hoặc khu chung). */
export const roomProps = (slug: string): PropKind[] => (slug === COMMON_AREA.slug ? COMMON_AREA.props : departmentConfig(slug)?.props ?? [])

// Chế độ hybrid (VITE_USE_MOCK=hybrid): endpoint nào BE đã có thì gọi BE thật, còn lại vẫn đi qua mock.
// BE phục vụ các endpoint này ở /api/fe (VITE_API_BASE_URL=http://localhost:8082/api/fe).
// Thêm endpoint mới ở BE xong thì thêm dòng vào đây để màn hình tương ứng chuyển sang dữ liệu thật.

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

const ID = '[^/?]+'
const ROUTES: ReadonlyArray<readonly [Method | '*', RegExp]> = [
  // Phòng ban và agent (hồ sơ agent: tên, vai trò, system prompt, model, màu, kỹ năng)
  ['GET', /^\/departments$/],
  // Cài đặt AI (bản chỉ đọc từ .env): cấu hình đang chạy, tình trạng Ollama/Hermes, model thật, nút Thử. PUT trả 409 SETTINGS_READ_ONLY.
  ['*', /^\/settings\/ai(\/(status|models|test))?$/],
  // Tạo / sửa / xoá phòng (docs/MISSING_API.md, A1b). Phải đi BE thật vì danh sách phòng đọc từ BE; BE chưa có thì form báo lỗi rõ.
  ['POST', /^\/departments$/],
  ['*', new RegExp(`^/departments/${ID}$`)],
  ['*', new RegExp(`^/agents(/${ID})?$`)],
  ['*', new RegExp(`^/agents/${ID}/tasks$`)],
  // Hermes: so khớp agent với bot, đồng bộ, khởi động lại
  ['GET', /^\/hermes\/(status|agents)$/],
  ['POST', /^\/hermes\/sync-all$/],
  ['POST', new RegExp(`^/agents/${ID}/hermes/(sync|restart)$`)],
  ['*', new RegExp(`^/agents/${ID}/hermes/(skills(/${ID})?|bot|channels(/(open|close))?)$`)],
  // Giao việc: mục tiêu, task, phê duyệt, điều khiển hệ thống
  ['GET', /^\/goals$/],
  ['POST', /^\/goals$/],
  ['POST', new RegExp(`^/goals/${ID}/(approve-plan|reject-plan|cancel)$`)],
  ['GET', /^\/tasks$/],
  ['POST', new RegExp(`^/tasks/${ID}/(cancel|retry)$`)],
  ['PUT', new RegExp(`^/tasks/${ID}/priority$`)],
  ['GET', /^\/approvals$/],
  ['POST', new RegExp(`^/approvals/${ID}/(approve|reject)$`)],
  ['GET', /^\/system$/],
  ['POST', /^\/system\/(pause|resume)$/],
  ['GET', /^\/events$/],
  // Kanban, chi tiết task, dự án, chi phí (docs/MISSING_API.md mục I)
  ['GET', new RegExp(`^/tasks/${ID}(/history)?$`)],
  ['POST', new RegExp(`^/tasks/${ID}/(assign|move)$`)],
  ['GET', /^\/kanban\/columns\/[A-Z_]+$/],
  ['GET', /^\/projects$/],
  ['POST', /^\/projects$/],
  ['GET', new RegExp(`^/projects/${ID}(/(snapshots|events))?$`)],
  ['POST', new RegExp(`^/projects/${ID}/(archive|reopen)$`)],
  ['POST', new RegExp(`^/goals/${ID}/project$`)],
  ['GET', /^\/(usage|model-prices|budgets)$/],
  ['POST', /^\/(model-prices|budgets)$/],
  ['PUT', new RegExp(`^/budgets/${ID}$`)],
  ['GET', new RegExp(`^/budgets/${ID}/changes$`)],
  ['GET', new RegExp(`^/departments/${ID}/stats$`)],
  ['GET', /^\/stats\/overview$/],
  // Công cụ và quyền (BE lưu + tính quyền hiệu lực; chưa ép lúc agent gọi tool). Bí mật: chỉ xem/xoá, ghi trả 501.
  ['GET', /^\/tools$/],
  ['PUT', new RegExp(`^/tools/${ID}$`)],
  ['POST', new RegExp(`^/tools/${ID}/check$`)],
  ['GET', /^\/(grants|effective-permissions|tool-calls|permission-audit|secrets)$/],
  ['GET', new RegExp(`^/agents/${ID}/effective-permissions$`)],
  ['POST', new RegExp(`^/agents/${ID}/permissions/preview$`)],
  ['PUT', new RegExp(`^/agents/${ID}/grants$`)],
  ['POST', /^\/secrets$/],
  ['POST', new RegExp(`^/secrets/${ID}/rotate$`)],
  ['DELETE', new RegExp(`^/secrets/${ID}$`)],
  // Thông báo trong app + cài đặt + lịch sử hội thoại. Telegram/Email: BE trả 501 (chưa hỗ trợ) để FE báo lỗi thật, không giả vờ thành công.
  ['GET', /^\/notifications(\/unread-count)?$/],
  ['POST', new RegExp(`^/notifications/(read-all|${ID}/read)$`)],
  ['*', /^\/notification-settings$/],
  ['*', /^\/notification-channels\/.+$/],
  ['GET', /^\/notification-deliveries$/],
  ['POST', new RegExp(`^/notification-deliveries/${ID}/resend$`)],
  ['GET', /^\/conversations$/],
  ['GET', new RegExp(`^/conversations/${ID}(/messages)?$`)],
  ['DELETE', new RegExp(`^/conversations/${ID}$`)],
]

/** `path` gồm cả query (vd `/approvals?status=ALL`). */
export function isBackedByBe(method: string, path: string): boolean {
  const clean = path.split('?')[0]
  return ROUTES.some(([m, re]) => (m === '*' || m === method) && re.test(clean))
}

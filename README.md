# AI Company Office (frontend)

Văn phòng ảo: mỗi nhân viên là một AI agent. Giao diện để giao việc, duyệt hành động nhạy cảm, theo dõi chi phí và cấu hình năng lực của từng agent (công cụ, model, kho tài liệu, bộ nhớ, mẫu).

React 18 · Vite · TypeScript strict · Tailwind v4 · PixiJS v8 · TanStack Query · Zustand · React Router · zod · STOMP (`@stomp/stompjs`) · dnd-kit · Recharts.

## Yêu cầu
- **Node.js ≥ 22.18** (khuyến nghị 24) và npm. `npm test` chạy trực tiếp các tệp `.ts` bằng `node --test`.
- Không cần backend: mặc định chạy bằng dữ liệu giả (mock).

## Chạy nhanh
```bash
npm install
cp .env.example .env     # tệp .env không được commit
npm run dev              # mở http://localhost:5173
```

## Các lệnh
| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy server phát triển (hot reload) |
| `npm run build` | Kiểm tra kiểu (`tsc -b`) rồi build ra `dist/` |
| `npm run preview` | Chạy thử bản build |
| `npm run lint` | Kiểm tra mã bằng oxlint |
| `npm test` | Chạy test đơn vị (tiền, khoảng thời gian, diff, schema form, quyền, logic mẫu...) |

Trước khi gửi code: `npm run lint && npm test && npm run build` phải đều qua.

## Cấu hình `.env`
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `VITE_USE_MOCK` | `true` | `true` = dữ liệu giả, không gọi BE. `false` = nối BE thật |
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | Địa chỉ REST của BE |
| `VITE_WS_URL` | `ws://localhost:8080/ws` | Địa chỉ WebSocket (STOMP) của BE |

Sửa `.env` xong phải khởi động lại `npm run dev`.

## Chế độ mock (mặc định)
`src/mocks/` giả lập cả REST lẫn realtime: 35 agent ở 7 phòng, thiết bị, 30 ngày dữ liệu chi phí/task, công cụ và quyền, 6 hồ sơ model, kho tài liệu, bộ nhớ, 19 mẫu agent. Dữ liệu nằm trong bộ nhớ nên **mất khi tải lại trang**. Có sự kiện chạy nền (task đổi trạng thái, thông báo, tài liệu đi qua các giai đoạn, model đổi sức khoẻ, ký ức mới chờ xem xét...).

Công cụ thử trong console của trình duyệt (chỉ ở `npm run dev`): đối tượng `window.__work` (tạo mục tiêu, duyệt kế hoạch, tạo yêu cầu duyệt thử, giả lập mất mạng, tạm dừng hệ thống...). Xem `src/mocks/work.ts`.

## Nối BE thật
1. `.env`: `VITE_USE_MOCK=false` và trỏ `VITE_API_BASE_URL`, `VITE_WS_URL` về BE.
2. BE bật CORS cho origin của FE (mặc định `http://localhost:5173`); WebSocket là STOMP thuần (không SockJS), topic `/topic/agents`, mỗi message là JSON có field `type`, trả subprotocol `v12.stomp`.
3. Mất kết nối: có banner, tự nối lại 1s → 2s → 4s… tối đa 30s rồi tải lại dữ liệu và bù sự kiện đã lỡ (`lastEventId`).
4. **Schema JSON hiện là giả định.** FE kiểm mọi response bằng zod; nếu BE khác, sửa một chỗ duy nhất trong `src/types/`. Nếu lệch, lỗi nằm trong console (`[API] … lệch schema`).

Tiền luôn là **số nguyên micro-USD** (1 USD = 1.000.000); chỉ `src/lib/money.ts` được định dạng ra "$0.0123".

## Các màn hình
| Đường dẫn | Nội dung |
|---|---|
| `/company`, `/department/:slug` | Văn phòng (canvas PixiJS), panel agent / phòng ban |
| `/dashboard` | KPI, biểu đồ, agent bận nhất, lỗi hay gặp |
| `/goals` | Mục tiêu, duyệt kế hoạch, hàng đợi |
| `/kanban` | Bảng task kéo thả |
| `/projects` | Dự án và tiến độ |
| `/costs` | Chi phí, ngân sách, giá model |
| `/history` | Lịch sử hội thoại (kèm ký ức/nguồn đã dùng) |
| `/agents/:id/studio` | **Agent Studio**: hồ sơ + prompt, model, công cụ và quyền, dữ liệu, nhật ký công cụ |
| `/tools` | Danh mục công cụ, ma trận quyền, "Bị từ chối", nhật ký thay đổi quyền |
| `/settings/secrets` | Bí mật (chỉ tên/loại/ngày, không bao giờ hiện giá trị) |
| `/models`, `/models/compare` | Hồ sơ model, luật định tuyến, so sánh |
| `/knowledge`, `/knowledge/:id` | Kho tài liệu: tải lên, đoạn, tìm thử, kiểm thử truy hồi, ACL |
| `/memory` | Bộ nhớ: duyệt, hàng chờ xem xét, quên, xuất |
| `/templates` | Mẫu agent: thư viện, tạo agent từ mẫu, nhập/xuất |
| `/network`, `/settings/notifications` | Hạ tầng thiết bị, thông báo |

Phím tắt: bấm `?` trong ứng dụng.

## Cấu trúc `src/`
- `api/` client REST (mỗi nhóm endpoint một tệp); `http.ts` là điểm duy nhất phân nhánh mock / BE thật
- `types/` schema zod + kiểu TS (nguồn sự thật của hình dạng dữ liệu)
- `realtime/` kết nối STOMP, đồng bộ sự kiện có id, dispatch vào store/cache
- `store/` Zustand; `features/*/queries|hooks` dùng TanStack Query cho dữ liệu máy chủ
- `features/` mã theo tính năng: `office` (canvas), `agents`, `studio`, `tools`, `models`, `knowledge`, `memory`, `templates`, `goals`, `kanban`, `costs`...
- `components/` thành phần dùng chung (`studio/` có chip rủi ro, nhãn LOCAL/CLOUD, hộp xác nhận hai bước, danh sách kéo sắp xếp)
- `mocks/` BE giả; `mocks/studio/` cho cấu hình năng lực agent
- `pages/` các route (tải lười)
- `lib/` tiện ích thuần (tiền, thời gian, diff, văn bản không dấu)

## Nguyên tắc an toàn đã áp dụng
- Nội dung do agent/tài liệu/ký ức sinh ra là **dữ liệu không tin cậy**: chỉ hiện dạng chữ hoặc markdown đã làm sạch (không HTML thô, liên kết chỉ http/https/mailto).
- Không bao giờ hiển thị hay lưu giá trị bí mật ở trình duyệt; ô nhập bí mật là ô mật khẩu, xoá ngay khi gửi, không vào URL/localStorage.
- Thay đổi quyền luôn có bước xem trước; mức MONEY / DESTRUCTIVE cần xác nhận hai bước.
- Phê duyệt / từ chối / xoá không "lạc quan": chỉ đổi giao diện sau khi BE xác nhận.

## Tài liệu cho backend
- `docs/BE_API_SPEC.md` (phần 1): agent, phòng ban, hạ tầng, realtime
- `docs/BE_API_SPEC_PART2.md` (phần 2): mục tiêu, phê duyệt, Kanban, dự án, chi phí, hội thoại, dashboard, thông báo
- `docs/BE_API_SPEC_PART3.md` (phần 3): Studio, công cụ/quyền, model, kho tài liệu, bộ nhớ, mẫu agent
- `docs/MISSING_API.md`: những chỗ BE còn thiếu / chưa chốt

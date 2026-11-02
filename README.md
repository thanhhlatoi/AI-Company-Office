# AI Company Office (frontend)

Văn phòng ảo: mỗi nhân viên là một AI agent. React 18 + Vite + TS strict, Tailwind, PixiJS v8, TanStack Query, Zustand, React Router, zod, STOMP (`@stomp/stompjs`).

## Chạy
```bash
npm install
npm run dev      # mặc định VITE_USE_MOCK=true (xem .env)
npm run build && npm run lint
```
Đổi `VITE_USE_MOCK=false` trong `.env` để nối BE thật (`VITE_API_BASE_URL`, `VITE_WS_URL`).

## Thư mục `src/`
- `api/` client REST, 1 file mỗi nhóm endpoint
- `realtime/` kết nối STOMP, reconnect, dispatch vào store
- `store/` Zustand stores
- `types/` schema zod + type TS khớp JSON backend
- `features/office/` canvas PixiJS (scene, sprite, label, camera)
- `features/agents/` danh sách, form tạo/sửa, panel chi tiết
- `features/tasks/` giao việc, lịch sử task
- `features/dashboard/` thanh thống kê trên cùng
- `components/` nút, modal, badge dùng chung
- `mocks/` dữ liệu giả + bộ giả lập trạng thái khi chưa nối BE
- `lib/` cấu hình, màu trạng thái, format thời gian
- `pages/` các route

Chỗ BE còn thiếu: xem `docs/MISSING_API.md`.

## Nối BE thật
1. Sửa `.env`: `VITE_USE_MOCK=false`, `VITE_API_BASE_URL`, `VITE_WS_URL` (STOMP thuần qua WebSocket, topic `/topic/agents`, mỗi message là JSON có field `type`).
2. BE cần bật CORS cho origin của FE (mặc định `http://localhost:5173`) và trả subprotocol `v12.stomp` khi bắt tay WebSocket.
3. Mất kết nối: banner vàng, tự nối lại 1s→2s→4s… tối đa 30s, nối lại xong tự tải lại danh sách agent.

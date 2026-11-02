# API BE còn thiếu / chưa chốt

Danh sách để viết BE. FE đang chạy bằng mock (`VITE_USE_MOCK=true`); mock nằm ở `src/mocks/`
và là đặc tả sống của các hợp đồng dưới đây. Schema zod của FE: `src/types/index.ts`.
Quy ước: `id` có thể là số hoặc chuỗi (FE chuẩn hoá về chuỗi); thời gian là ISO-8601.

## A. Phòng ban (BẮT BUỘC cho giao diện phòng ban)

### A1. `GET /departments` -> `Department[]`
```json
[{ "id": 1, "name": "Studio YouTube", "slug": "studio-youtube", "icon": "clapperboard",
   "color": "#c93d31", "headAgentId": 12, "order": 1 }]
```
- `slug`: dùng cho route `/department/:slug`, duy nhất.
- `icon`: tên icon lucide (FE map sẵn: crown, clapperboard, smartphone, code, wallet, briefcase; lạ thì dùng icon mặc định).
- `color`: màu accent hex. FE tự suy ra màu sàn/tường nếu không có trong bảng màu sẵn.
- `order`: thứ tự hiển thị / phím tắt 1-6.

### A2. `Agent` thêm 2 field (trong mọi response/ message có Agent)
- `departmentId`: id phòng (null nếu chưa thuộc phòng nào).
- `isHead`: `true` nếu là trưởng phòng (khớp `Department.headAgentId`).
- `POST /agents` và `PUT /agents/{id}` nhận thêm `departmentId` (để "Thêm agent vào phòng" / chuyển phòng).

### A3. `POST /departments/{id}/goals` -> kế hoạch chia việc
Request: `{ "goal": "Làm 3 video về chủ đề X trong tuần này" }`
Response:
```json
{ "id": 7, "departmentId": 2, "goal": "...", "createdAt": "...",
  "plan": [{ "agentId": 15, "taskTitle": "Viết kịch bản video 1", "taskId": 301 }] }
```
Trưởng phòng (agent) phân tích mục tiêu, tạo task cho nhân viên; FE hiển thị `plan` trong panel trưởng phòng.

### A4. Realtime: message mới `department.dispatch`
```json
{ "type": "department.dispatch", "departmentId": 2, "headId": 12, "targetAgentIds": [15, 16, 18] }
```
Phát khi trưởng phòng chia việc (ngay trước khi các `task.created` / `agent.status_changed` của nhân viên).
FE vẽ đường nối sáng từ bàn trưởng phòng tới từng nhân viên trong 1-2 giây.

## B. Số liệu (phòng ban + công ty)

### B1. `GET /departments/{id}/stats` (hoặc nhúng vào A1)
```json
{ "doneToday": 14, "running": 3, "errors": 0, "tokenCostToday": 1.82 }
```
- FE tự tính `running`/`errors` từ trạng thái agent realtime; BE chỉ BẮT BUỘC `doneToday`.
- `tokenCostToday` (USD, tuỳ chọn): không có thì FE ẩn thẻ "Chi phí token".

### B2. `GET /stats/company` -> `{ "tokenCostToday": 5.4 }` (tuỳ chọn)
Hiện ở thanh trên cùng; không có thì ẩn.

## C. Nhật ký

### C1. `GET /agents/{id}/events?limit=200` -> `AgentEvent[]`
Để tab "Nhật ký" có dữ liệu cũ khi mở trang (hiện chỉ có event realtime từ lúc mở trang).
### C2. `GET /departments/{id}/events?limit=200` (tuỳ chọn)
Nhật ký gộp cả phòng. Nếu chưa có, FE tự gộp event realtime của các thành viên.

## D. Trạng thái "chờ duyệt" (tuỳ chọn)
FE đang coi `BLOCKED` = chờ duyệt / bị chặn và tính chung với `ERROR` ở badge đỏ.
Nếu cần phân biệt, thêm giá trị `WAITING_APPROVAL` vào enum `AgentStatus` (báo FE để thêm màu + nhãn).

## F. Sự kiện cho nhân vật di chuyển (BẮT BUỘC cho tính năng đi lại)
Nguyên tắc: di chuyển chỉ là HIỆU ỨNG hiển thị. Trạng thái thật vẫn do BE gửi (`agent.status_changed`, `task.created`...);
FE không tự đổi trạng thái agent. Cả 4 sự kiện dưới đây đều là message trên `/topic/agents`, phân biệt bằng `type`.
Khi FE chưa nhận được sự kiện nào thì mọi nhân vật chỉ ngồi tại bàn.

| type | Payload | FE làm gì |
|---|---|---|
| `task.handoff` | `{ fromAgentId, toAgentId, taskId, message }` | Người giao đứng dậy, cầm tập giấy, đi tới ô đứng cạnh bàn người nhận, hiện bong bóng `message`, rồi về chỗ |
| `report.to_head` | `{ agentId, departmentId, taskId }` | Nhân viên đi tới bàn trưởng phòng báo xong rồi về |
| `approval.requested` | `{ agentId, approvalId }` | Agent giơ tay / hiện dấu chấm than (hoặc đi tới góc "Chờ duyệt") đến khi có `approval.resolved` |
| `meeting.started` | `{ departmentId, agentIds[], endsAt? }` | Các agent được mời vào phòng họp ở "Khu chung", ngồi quanh bàn tròn; hết họp (`meeting.ended` hoặc `endsAt`) thì về chỗ |
| `approval.resolved` | `{ approvalId, approved }` | Hạ tay / bỏ dấu chấm than |
| `meeting.ended` (tuỳ chọn) | `{ departmentId }` | Kết thúc họp sớm |

### F1. `POST /approvals/{id}/approve` -> `{ "id": 9, "status": "APPROVED" }`
Chủ bấm nút "Duyệt" trong panel agent. BE phát `approval.resolved` cho mọi client.
`GET /approvals?status=PENDING` -> `[{ id, agentId, title, createdAt }]` để khi mở trang biết agent nào đang chờ duyệt.
(Tuỳ chọn) `POST /approvals/{id}/reject`.

### F2. Trạng thái khi mở lại tab
FE không phát lại hoạt ảnh cũ: chỉ cần BE trả đúng `status` hiện tại của từng agent qua `GET /agents` và `GET /approvals?status=PENDING`;
đang họp thì cần `GET /meetings/active` -> `[{ departmentId, agentIds[] }]` (tuỳ chọn).

## E. Còn tồn từ trước
| Hạng mục | Hiện trạng | FE xử lý tạm |
|---|---|---|
| Chi phí token toàn công ty | Chưa có (xem B2) | Ẩn trên TopBar |
| JSON mẫu thật của mọi endpoint + message STOMP | Chưa cung cấp | Schema zod là GIẢ ĐỊNH, cần đối chiếu |
| Toạ độ bàn `x`,`y` | KHÔNG CẦN nữa: FE tự xếp bàn theo phòng | — |
| CORS cho `http://localhost:5173` và subprotocol `v12.stomp` | Cần xác nhận khi nối BE thật | — |

## G. Hạ tầng & thiết bị (phòng "Hạ tầng & Máy móc")
Thiết bị là MÁY THẬT được giám sát, không phải agent. Schema zod: `src/types/index.ts` (Device, DeviceMetrics, DeviceEvent, NetworkLink). Mock: `src/mocks/devices.ts`.
FE không bao giờ nhận/hiển thị mật khẩu, khoá, token của thiết bị (zod bỏ field lạ). Chỉ số thiếu thì FE ẩn mục đó, không lỗi.

- `GET /devices` -> `Device[]`: `{ id, name, type: WORKSTATION|AI_PC|LAPTOP|SERVER|ROUTER|NAS, os, status: ONLINE|DEGRADED|OFFLINE, lastSeen, uptimeSec, ownerAgentId, ip?, metrics }`.
  `metrics`: `{ cpuPct, ramPct, diskPct, tempC, netInKbps, netOutKbps, gpu?: {utilPct, vramPct, tempC}, nas?: {volumeUsedPct, raidStatus}, router?: {wanUp, latencyMs} }`.
- `GET /devices/{id}` -> `Device`. (FE hiện chưa gọi; mock có.)
- `GET /devices/{id}/events?limit=100` -> `[{ id, deviceId, type, message, severity: info|warning|critical, createdAt }]`. Chỉ cần lịch sử TRƯỚC khi mở trang; sự kiện sau đó FE tự ghi từ status/alert.
- `GET /network/topology` -> `[{ fromDeviceId, toDeviceId, kbps, latencyMs, up }]`. Đầu "Internet" dùng id `internet`; thường là `internet -> router -> từng thiết bị`.
- `Agent.runsOnDeviceId` (null nếu không gắn máy nào) trong mọi response/message có Agent.
- Realtime trên `/topic/agents` (nối lại sau mất kết nối: FE tải lại `/devices`, `/network/topology`):

| type | Payload | FE làm gì |
|---|---|---|
| `device.status_changed` | `{ deviceId, status, lastSeen? }` | Đổi đèn; OFFLINE -> báo động xoay, agent chạy trên máy hiện "Mất máy chủ" |
| `device.metrics` | `{ deviceId, metrics, uptimeSec?, lastSeen? }` (~5-10s/lần) | Cập nhật thanh CPU/RAM, biểu đồ nhỏ, tự đánh giá ngưỡng |
| `device.alert` | `{ deviceId, kind: cpu\|disk\|temp\|offline, message, severity: warning\|critical }` | Bật cảnh báo (toast một lần, sidebar, banner); agent phụ trách đi tới máy |
| `network.link_changed` | `{ fromDeviceId, toDeviceId, kbps, latencyMs, up }` | Cập nhật cáp / sơ đồ mạng |

Ngưỡng cảnh báo FE tự đánh giá từ `device.metrics` (config: `src/config/devices.ts`): CPU > 90% quá 5 phút, đĩa > 85%, nhiệt độ > 80°C; mất heartbeat > 60s = OFFLINE; tắt cảnh báo trễ 30s. `device.alert` của BE chỉ là đường tắt để bật ngay.
Điều khiển máy từ xa (Wake-on-LAN, khởi động lại, tắt máy): CHƯA làm, nút bị vô hiệu. Khi BE hỗ trợ, phải đi qua cổng phê duyệt mức DESTRUCTIVE, không gọi trực tiếp.

## H. Giao việc, hàng đợi, phê duyệt, điều khiển hệ thống (Prompt B — schema GIẢ ĐỊNH, chờ JSON thật)
Schema zod: `src/types/index.ts` (GoalSchema, PlanItemSchema, TaskSchema mở rộng, ApprovalSchema mở rộng, SystemStateSchema, EventsPageSchema). Mock chạy được: `src/mocks/work.ts`.

### H0. DomainEvent và đồng bộ (QUAN TRỌNG)
- Mọi message trên `/topic/agents` có thể kèm `id` (số nguyên **tăng dần, liên tục**, toàn hệ thống). Message không có `id` (loại cũ) FE áp ngay, không tham gia bù.
- FE áp theo thứ tự id; `id <= lastEventId` thì bỏ (trùng); `id > lastEventId + 1` (hở) thì FE gọi `GET /events?afterId=lastEventId` để bù.
- Mất kết nối rồi nối lại: FE gọi `GET /events?afterId=lastEventId`. Nếu `truncated=true` FE tải lại toàn bộ (H1–H5).
- Mốc ban đầu: `GET /system` trả `lastEventId` — BE phải lấy mốc này **trước/đồng thời** với dữ liệu snapshot (FE gọi `/system` trước rồi mới gọi `/goals`, `/tasks`, `/approvals`).

`GET /events?afterId=N&limit=500` -> `{ "events": [DomainEvent...], "truncated": false, "lastId": 120 }`
- `events`: các event có `id > N`, tăng dần, tối đa `limit`. `lastId`: id mới nhất của hệ thống. `truncated=true` (và `events` rỗng) khi BE không còn giữ đủ event từ N+1.

### H1. Goal
`GET /goals` -> `Goal[]`; `POST /goals` -> `Goal`; `POST /goals/{id}/approve-plan`; `POST /goals/{id}/reject-plan` `{reason}`; `POST /goals/{id}/cancel` (đều trả `Goal`).
```json
{ "id": 7, "title": "Báo cáo kết quả tuần", "description": "...", "departmentId": 2, "tokenBudget": 50000, "tokensUsed": 9584,
  "requirePlanApproval": true,
  "status": "AWAITING_PLAN_APPROVAL",
  "plan": [ { "key": "p1", "title": "Thu thập số liệu", "assigneeId": 15, "priority": "HIGH", "dependsOn": [], "estimateTokens": 2100 },
            { "key": "p2", "title": "Soạn báo cáo", "assigneeId": 16, "priority": "NORMAL", "dependsOn": ["p1"] } ],
  "rejectReason": null, "createdAt": "...", "updatedAt": "...", "finishedAt": null }
```
- `status`: `PLANNING` `AWAITING_PLAN_APPROVAL` `RUNNING` `DONE` `FAILED` `CANCELLED` `REJECTED`.
- `POST /goals` body: `{ title, description?, departmentId?, tokenBudget?, requirePlanApproval? (mặc định true) }`.
- `plan[].key` là id trong phạm vi kế hoạch; `dependsOn` trỏ tới `key` khác. Khi duyệt, BE tạo task thật và đổi `dependsOn` sang **id task**.
- Realtime: `goal.created` / `goal.updated` `{ goal }` (đối tượng đầy đủ, không phải bản vá).

### H2. Task (mở rộng)
Thêm vào Task: `goalId`, `priority` (`HIGH|NORMAL|LOW`, mặc định NORMAL), `dependsOn` (id task), `attempts`, `error`, `assignedById` (agent giao), `startedAt`, `tokensUsed`; `status` thêm `CANCELLED`.
- `GET /tasks` -> `Task[]` (task của mục tiêu chưa kết thúc + task kết thúc trong 24h gần nhất).
- `POST /tasks/{id}/cancel`, `POST /tasks/{id}/retry` (chỉ khi FAILED), `PUT /tasks/{id}/priority` `{ "priority": "HIGH" }` (đều trả `Task`).
- Realtime: `task.created` / `task.updated` `{ task }` như cũ (đối tượng đầy đủ). `task.handoff` như mục F.

### H3. Approval (mở rộng)
Thêm: `riskType` (`EXTERNAL|MONEY|DESTRUCTIVE`), `goalId`, `taskId`, `action`, **`argsSnapshot`** (object: đúng tham số sẽ thực thi — FE hiển thị nguyên văn, ví dụ `{to, subject, body}` hoặc `{payee, amount, currency}`), `expiresAt`, `status` (`PENDING|APPROVED|REJECTED|EXPIRED`), `decisionReason`, `decidedAt`.
- `GET /approvals?status=PENDING|ALL` (ALL = đang chờ + vài chục yêu cầu đã xử lý gần nhất); `POST /approvals/{id}/approve`; `POST /approvals/{id}/reject` `{ "reason": "..." }` (bắt buộc, FE không cho để trống). Lỗi `409` nếu đã xử lý.
- Realtime: `approval.requested` `{ agentId, approvalId, approval }`; `approval.resolved` `{ approvalId, approved, status, reason }` (status có thể là `EXPIRED`).
- DUYỆT/TỪ CHỐI không optimistic ở FE: chỉ đổi giao diện sau khi BE xác nhận.

### H4. Điều khiển hệ thống
`GET /system` -> `{ "state": "RUNNING|PAUSED", "reason": null, "lastEventId": 120 }`; `POST /system/pause` `{reason?}`; `POST /system/resume` (đều trả như GET). Khi PAUSED BE không bắt đầu task mới (task đang chạy tự kết thúc). Realtime: `system.state_changed` `{ state, reason? }`.

### H5. Việc FE chưa gọi trong Bước 1
Các hàm ghi (approve/reject, tạo/duyệt/huỷ goal, huỷ/thử lại/đổi ưu tiên task, pause/resume) sẽ nối ở các bước sau; mock đã hỗ trợ sẵn.

## I. Kanban, dự án, chi phí, lịch sử hội thoại, dashboard, thông báo (Prompt 3C — schema GIẢ ĐỊNH, chờ JSON thật)
Schema zod: `src/types/{common,project,cost,history,stats,notify,kanban}.ts` + `Task` mở rộng trong `src/types/index.ts`. Mock chạy được: `src/mocks/biz/*` (30 ngày dữ liệu).
**Tiền = số nguyên micro-USD** (1 USD = 1_000_000); FE đổi sang "$0.0123" ở `lib/money.ts`. Thời gian ISO-8601; ngày nhóm theo `Asia/Ho_Chi_Minh`.
**Phân trang cursor**: `{ items, nextCursor }` (`nextCursor` null = hết). Mọi message realtime mới có `id` DomainEvent như mục H0.

### I0. Task mở rộng
`status` thêm `AWAITING_APPROVAL` (chờ duyệt, task bị khoá) và `WAITING_BUDGET` (chờ ngân sách). Field mới: `version` (tăng mỗi lần đổi), `locked`, `parentId`, `projectId`, `costMicro`, `progressPct` (task cha).

### I1. Dự án
`GET /projects?status&departmentId&q` -> `Project[]`; `GET /projects/{id}`; `GET /projects/{id}/snapshots` -> `[{day, progressPct}]` (mỗi ngày); `GET /projects/{id}/events` -> `[{id, at, message, kind}]`.
`Project`: `{ id, name, description, departmentId, color, dueDate, status: ACTIVE|ARCHIVED, budgetMicro, costMicro, progressPct, counts: {queued, running, awaitingApproval, waitingBudget, done, failed, cancelled}, goalIds, createdAt }`.
**Công thức tiến độ** (BE tính, FE chỉ hiển thị): `Σ trọng số task DONE / Σ trọng số task chưa huỷ` (trọng số: HIGH 3, NORMAL 2, LOW 1); task FAILED vẫn nằm ở mẫu số và được đếm riêng.
Realtime: `project.updated { project }`.

Ghi: `POST /projects` body `{name, description, departmentId, color, dueDate, budgetMicro}` -> `Project`; `POST /projects/{id}/archive`, `POST /projects/{id}/reopen` -> `Project`; `POST /goals/{id}/project {projectId|null}` -> `Goal` (gán / chuyển / bỏ khỏi dự án; `Goal.projectId`; BE phát `project.updated` cho dự án cũ và mới). `Project.goalIds` do BE trả.

### I2. Kanban
`GET /kanban/columns/{QUEUED|RUNNING|AWAITING_APPROVAL|DONE|FAILED_CANCELLED}?projectId&agentId&departmentId&priority&q&cursor&limit=50` -> `{ items: Task[], total, nextCursor }`.
Cột `QUEUED` gồm cả `WAITING_BUDGET`, sắp theo thứ tự SẼ chạy (ưu tiên, rồi ai vào trước). Cột khác: mới cập nhật trước.
Di chuyển (làm ở Bước Kanban): `POST /tasks/{id}/move { toColumn, beforeTaskId?, expectedVersion }` -> `Task`; từ chối = HTTP 409 `{ reasonCode: DEPENDENCIES_PENDING|NOT_SUPPORTED|USE_APPROVAL_DIALOG|NOT_ALLOWED|STALE_VERSION }`.

Chi tiết một task: `GET /tasks/{id}` -> `Task`; `GET /tasks/{id}/history` -> `[{at, status, note}]` (lịch sử trạng thái); `POST /tasks/{id}/assign {agentId}` -> `Task` (đổi người phụ trách).
**`POST /tasks/{id}/move` — quy tắc BE (FE chỉ gợi ý, mọi lần thả hợp lệ về thao tác đều được gửi lên):**
| Từ → Đến | Kết quả |
|---|---|
| Chờ → Chờ (đổi chỗ, `beforeTaskId` = thẻ đứng ngay SAU vị trí mới; null = cuối) | 200 `Task` (BE tự lưu thứ tự, ảnh hưởng thứ tự chạy; FE cập nhật lạc quan) |
| Chờ → Đang làm | 200 nếu hết phụ thuộc và agent rảnh; `DEPENDENCIES_PENDING` nếu còn phụ thuộc; `NOT_ALLOWED` nếu agent bận |
| Chờ / Đang làm → Lỗi/Huỷ | Huỷ task (200); FE luôn hỏi xác nhận trước |
| Xong / Lỗi / Huỷ → Chờ | LÀM LẠI = tạo task MỚI, trả `Task` mới (id khác); FE hỏi xác nhận |
| Chờ duyệt → bất kỳ | `USE_APPROVAL_DIALOG` (duyệt bằng hộp thoại phê duyệt) |
| bất kỳ → Xong, bất kỳ → Chờ duyệt | `NOT_ALLOWED` |
| Đang làm → Chờ | `NOT_SUPPORTED` |
| `expectedVersion` ≠ `version` hiện tại | `STALE_VERSION` (FE tự tải lại cột) |
Từ chối = HTTP **409** với body JSON `{ "reasonCode": "..." }`; FE đọc `reasonCode` (không đọc message) và hiện lời giải thích tiếng Việt. Mỗi lần task đổi, BE tăng `version` và phát `task.updated` (đối tượng đầy đủ).
Task đang `AWAITING_APPROVAL` phải có `approval` PENDING gắn `taskId` để FE mở đúng yêu cầu khi bấm thẻ.

### I3. Chi phí và ngân sách
`GET /usage?from&to&groupBy=agent|department|project|model&projectId&agentId` -> `{ from, to, groupBy, totalMicro, prevTotalMicro, calls, inputTokens, outputTokens, avgPerTaskMicro, unpricedCalls, byDay: [{day, totalMicro, parts: {key: micro}}], rows: [{key, label, totalMicro, calls, inputTokens, outputTokens}] }`. `prevTotalMicro` = kỳ liền trước cùng độ dài; `Σ rows = Σ byDay = totalMicro`; `unpricedCalls` = cuộc gọi chưa có giá.
`GET /model-prices` -> `[{id, model, inputPerMTokMicro, outputPerMTokMicro, effectiveFrom}]`.
`GET /budgets` -> `[{id, scopeType: AGENT|DEPARTMENT|PROJECT|COMPANY, scopeId, scopeLabel, period: DAY|MONTH|TOTAL, limitMicro, usedMicro, reservedMicro, warnPct, mode: BLOCK|WARN, state: OK|SOFT|HARD}]`; `GET /budgets/{id}/changes` -> `[{id, budgetId, at, fromMicro, toMicro, reason}]`.
`Budget` thêm `waitingTasks` (số task đang WAITING_BUDGET vì ngân sách này, BE đếm trong phạm vi). `usedMicro`/`reservedMicro`/`state` BE tính lại mỗi lần đọc; `state` = HARD khi `used + reserved >= limit`, SOFT khi `>= limit * warnPct/100`.
Ghi: `POST /budgets` body `{scopeType, scopeId, period, limitMicro, warnPct, mode}` -> `Budget`; `PUT /budgets/{id}` body `{limitMicro, warnPct, mode, reason?}` -> `Budget`. **Tăng `limitMicro` mà thiếu `reason` -> HTTP 400 `{message}`** (FE cũng chặn nhưng BE phải ép); mỗi thay đổi hạn mức ghi vào `/budgets/{id}/changes`. Khi hạn mức đủ rộng, BE tự thả các task WAITING_BUDGET về QUEUED (và phát `task.updated`).
`POST /model-prices` body `{model, inputPerMTokMicro, outputPerMTokMicro, effectiveFrom}` -> `ModelPrice`; BE tính lại chi phí các cuộc gọi chưa có giá có thời điểm >= `effectiveFrom` rồi phát `stats.invalidated` / `budget.updated`. Giá áp dụng cho cuộc gọi theo bản ghi mới nhất có `effectiveFrom` <= thời điểm gọi.
Agent bị coi là HẾT NGÂN SÁCH (huy hiệu trên canvas) khi có ngân sách `mode=BLOCK`, `state=HARD`, thuộc COMPANY, hoặc DEPARTMENT của agent, hoặc AGENT là chính nó.
Realtime: `budget.updated { budget }`.

### I4. Lịch sử hội thoại
`GET /conversations?q&agentId&departmentId&projectId&goalId&from&to&role=USER|ASSISTANT|TOOL&hasError&tool&sort=relevance|newest&cursor&limit=30` -> trang `Conversation`: `{ id, title, agentId, goalId, taskId, projectId, startedAt, updatedAt, messageCount, tokens, costMicro, hasError, tools, snippet }`. **Tìm không dấu** ("ke toan" khớp "kế toán"); `snippet` = đoạn quanh từ khoá.
`GET /conversations/{id}` -> `Conversation` (404 nếu không có); `DELETE /conversations/{id}` -> 204 (xoá cả tin nhắn; FE hỏi xác nhận, không optimistic). Thêm bộ lọc `taskId` cho danh sách.
`GET /conversations/{id}/messages?cursor&limit=40` -> trang `Message`: `{ id, role, content, createdAt, tokens, costMicro, toolName, toolArgs, truncated }`. BE phải thay bí mật bằng `[REDACTED:LOẠI]` (cả `content` lẫn `toolArgs`); `truncated=true` khi tin bị cắt bớt. FE xem `content` là dữ liệu KHÔNG tin cậy (markdown đã làm sạch).

### I5. Dashboard
`GET /stats/overview?from&to&departmentId&projectId` -> xem `StatsOverviewSchema`: KPI `{value, prev}` (completed, medianSec, errorRate 0..1, cost), `p90Sec`, `recoveredRate`, `running/queued/awaiting`, `byDay`, `durationBuckets`, `costByDepartment`, `busiestAgents` (utilization 0..1, queueDepth, errorRate, costMicro), `errorGroups`, `heatmap` (7x24, null nếu chưa đủ dữ liệu), `enoughData`. Realtime `stats.invalidated` -> FE tải lại.

### I6. Thông báo
`GET /notifications?level&type&unread&cursor&limit=30` -> trang `{ id, level: INFO|SUCCESS|WARNING|CRITICAL, type, title, body, target: {kind: TASK|GOAL|APPROVAL|DEVICE|BUDGET|PROJECT|AGENT, id}, createdAt, readAt }`; `GET /notifications/unread-count` -> `{ count }`. Realtime `notification.created { notification }` (BE đã khử trùng). 
Ghi: `POST /notifications/{id}/read` -> `Notification`; `POST /notifications/read-all` -> `{count: 0}`.
Cài đặt: `GET /notification-settings` -> `{ telegram: {status: NONE|PENDING|VERIFIED, username, botName}, email: {status, address}, rules: [{type, channels: {app, telegram, email}, minLevel, projectId, agentId}], quiet: {enabled, from "HH:mm", to, tz}, digest: {enabled, at "HH:mm"} }`; `PUT /notification-settings` body `{rules, quiet, digest}` (thay toàn bộ) -> như GET. Loại sự kiện (`rules[].type`): goal.done, task.failed, task.done, approval.requested, budget.soft, budget.hard, device.offline. **FE không bao giờ nhận token bot / mật khẩu SMTP.**
Telegram: `POST /notification-channels/telegram/link` -> `{ code, botName, expiresAt }` (mã dùng một lần, hiệu lực 10 phút; trạng thái chuyển PENDING; người dùng gửi `/start <code>` cho bot -> VERIFIED; FE hỏi lại `GET /notification-settings` mỗi 3 giây khi PENDING); `POST .../telegram/test` -> `Delivery`; `DELETE .../telegram`.
Email: `POST /notification-channels/email {address}` (gửi thư xác minh, status PENDING) -> settings; `POST .../email/verify {code}` (sai mã = HTTP 400) -> settings; `POST .../email/test` -> `Delivery`; `DELETE .../email`.
Giao hàng: `GET /notification-deliveries?cursor&limit=20` -> trang `{id, channel: TELEGRAM|EMAIL, title, status: SENT|FAILED|DEAD, error, attempts, createdAt}`; `POST /notification-deliveries/{id}/resend` -> `Delivery`.
Toast: FE chỉ tạo toast từ `notification.created` (cùng `type` + `target` thì FE gộp "x3"); BE chịu trách nhiệm khử trùng và chỉ phát khi quy tắc kênh "app" cho phép.

## J. Agent Studio, công cụ/quyền, model, kho tài liệu, bộ nhớ, mẫu agent (Prompt 4D)
Đã chuyển sang `docs/BE_API_SPEC_PART3.md` (đặc tả đầy đủ, bổ sung dần theo từng bước). Schema zod: `src/types/{tools,models,knowledge,memory,studio,studioEvents}.ts`; mock: `src/mocks/studio/*`.

# Đặc tả API cho Backend — PHẦN 2: API mới (Giao việc, Kanban, Dự án, Chi phí, Lịch sử, Dashboard, Thông báo)

Bổ sung cho `docs/BE_API_SPEC.md` (phần 1: Agent, Phòng ban, Hạ tầng). Phần 1 giữ nguyên; file này liệt kê **mọi API FE đã gọi thêm** từ Prompt B và Prompt 3C, với request/response chuẩn.
Nguồn đối chiếu: schema zod `src/types/{index,common,project,kanban,cost,history,stats,notify}.ts` (lệch schema là FE báo lỗi, quy tắc zod xem mục 0.4 của phần 1), hàm gọi `src/api/{work,biz,approvals}.ts`, BE giả chạy được `src/mocks/work.ts` + `src/mocks/biz/*`.
Tất cả schema ở đây là **GIẢ ĐỊNH** cho tới khi có JSON thật từ BE: nếu khác, sửa một chỗ trong `src/types/*`.

## 0. Quy ước chung của phần 2
- **Tiền = số nguyên micro-USD** (1 USD = 1_000_000), kiểu `int`. FE chỉ đổi sang "$0.0123" ở lúc hiển thị. Không dùng số thực cho tiền.
- Thời gian ISO-8601 (UTC có `Z`). Ngày nhóm theo `Asia/Ho_Chi_Minh`; `day` dạng `YYYY-MM-DD`.
- `id` có thể là số hoặc chuỗi, FE chuẩn hoá về chuỗi. Field có `?` là tuỳ chọn / `null` được. Field có mặc định thì thiếu cũng được.
- **Trang cursor** (mọi danh sách dài): `{ "items": [...], "nextCursor": "abc" | null }`. `nextCursor` null = hết. FE truyền lại nguyên `cursor` (chuỗi đục, BE tự định nghĩa).
- Lỗi: HTTP 4xx/5xx; FE đọc `message` nếu có. Riêng `409` của `/tasks/{id}/move` đọc `reasonCode` (mục 3.2). `404` khi không có đối tượng.
- **Bí mật không bao giờ trả cho FE**: token bot Telegram, mật khẩu SMTP, khoá API. Nội dung hội thoại phải thay bí mật bằng `[REDACTED:LOẠI]`.
- Nội dung do agent sinh ra (`content`, `result`, `error`, `title`) FE xem là **không tin cậy** (render markdown đã làm sạch); BE vẫn nên làm sạch/giới hạn độ dài.

## 1. Bảng tổng hợp REST mới

Mức: **P0** FE gọi ngay lúc mở trang, **P1** FE gọi khi người dùng thao tác.

| # | Method + Path | Mức | Nhóm |
|---|---|---|---|
| 1 | `GET /system` | P0 | Hệ thống |
| 2 | `POST /system/pause` | P1 | Hệ thống |
| 3 | `POST /system/resume` | P1 | Hệ thống |
| 4 | `GET /events?afterId&limit` | P0 | Đồng bộ |
| 5 | `GET /goals` | P0 | Mục tiêu |
| 6 | `POST /goals` | P1 | Mục tiêu |
| 7 | `POST /goals/{id}/approve-plan` | P1 | Mục tiêu |
| 8 | `POST /goals/{id}/reject-plan` | P1 | Mục tiêu |
| 9 | `POST /goals/{id}/cancel` | P1 | Mục tiêu |
| 10 | `POST /goals/{id}/project` | P1 | Mục tiêu |
| 11 | `GET /tasks` | P0 | Task |
| 12 | `GET /tasks/{id}` | P1 | Task |
| 13 | `GET /tasks/{id}/history` | P1 | Task |
| 14 | `POST /tasks/{id}/cancel` | P1 | Task |
| 15 | `POST /tasks/{id}/retry` | P1 | Task |
| 16 | `PUT /tasks/{id}/priority` | P1 | Task |
| 17 | `POST /tasks/{id}/assign` | P1 | Task |
| 18 | `POST /tasks/{id}/move` | P1 | Kanban |
| 19 | `GET /kanban/columns/{column}` | P0 | Kanban |
| 20 | `GET /approvals?status=ALL` | P0 | Duyệt (mở rộng) |
| 21 | `POST /approvals/{id}/reject` | P1 | Duyệt |
| 22 | `GET /projects` | P0 | Dự án |
| 23 | `GET /projects/{id}` | P0 | Dự án |
| 24 | `GET /projects/{id}/snapshots` | P1 | Dự án |
| 25 | `GET /projects/{id}/events` | P1 | Dự án |
| 26 | `POST /projects` | P1 | Dự án |
| 27 | `POST /projects/{id}/archive` | P1 | Dự án |
| 28 | `POST /projects/{id}/reopen` | P1 | Dự án |
| 29 | `GET /usage` | P0 | Chi phí |
| 30 | `GET /model-prices` | P0 | Chi phí |
| 31 | `POST /model-prices` | P1 | Chi phí |
| 32 | `GET /budgets` | P0 | Ngân sách |
| 33 | `POST /budgets` | P1 | Ngân sách |
| 34 | `PUT /budgets/{id}` | P1 | Ngân sách |
| 35 | `GET /budgets/{id}/changes` | P1 | Ngân sách |
| 36 | `GET /conversations` | P0 | Lịch sử |
| 37 | `GET /conversations/{id}` | P1 | Lịch sử |
| 38 | `GET /conversations/{id}/messages` | P1 | Lịch sử |
| 39 | `DELETE /conversations/{id}` | P1 | Lịch sử |
| 40 | `GET /stats/overview` | P0 | Dashboard |
| 41 | `GET /notifications` | P0 | Thông báo |
| 42 | `GET /notifications/unread-count` | P0 | Thông báo |
| 43 | `POST /notifications/{id}/read` | P1 | Thông báo |
| 44 | `POST /notifications/read-all` | P1 | Thông báo |
| 45 | `GET /notification-settings` | P0 | Thông báo |
| 46 | `PUT /notification-settings` | P1 | Thông báo |
| 47 | `POST /notification-channels/telegram/link` | P1 | Thông báo |
| 48 | `POST /notification-channels/email` | P1 | Thông báo |
| 49 | `POST /notification-channels/email/verify` | P1 | Thông báo |
| 50 | `POST /notification-channels/{telegram\|email}/test` | P1 | Thông báo |
| 51 | `DELETE /notification-channels/{telegram\|email}` | P1 | Thông báo |
| 52 | `GET /notification-deliveries` | P1 | Thông báo |
| 53 | `POST /notification-deliveries/{id}/resend` | P1 | Thông báo |

Thứ tự làm đề xuất: (a) 1, 4, 5, 11, 20 + realtime có `id` → màn Mục tiêu / Phê duyệt chạy; (b) 6–9, 14–16, 2–3, 21 → thao tác; (c) 19, 18, 12–13, 17 → Kanban; (d) 22–28 → Dự án; (e) 29–35 → Chi phí; (f) 36–39; (g) 40; (h) 41–53.

---

## 2. Đồng bộ, hệ thống, mục tiêu

### 2.1 DomainEvent và bù sự kiện (QUAN TRỌNG)
- Mọi message trên `/topic/agents` có thể kèm `"id"` — số nguyên **tăng dần liên tục** toàn hệ thống. Không có `id` (loại cũ) thì FE áp ngay, không tham gia bù.
- FE áp theo thứ tự id: `id <= lastEventId` bỏ (trùng); `id > lastEventId + 1` (hở) thì gọi `GET /events?afterId=<lastEventId>` để bù.
- Nối lại realtime: FE gọi `/events?afterId=`; nếu `truncated=true` thì tải lại toàn bộ (`/system`, `/goals`, `/tasks`, `/approvals?status=ALL`, …).
- Mốc đầu: FE gọi `GET /system` **trước** rồi mới gọi `/goals`, `/tasks`, `/approvals`. BE phải lấy `lastEventId` **trước hoặc đồng thời** với dữ liệu snapshot (không để lọt event giữa hai lần gọi).

### 2.2 `GET /events?afterId=N&limit=500`
```json
{ "events": [ { "id": 121, "type": "task.updated", "task": { } }, { "id": 122, "type": "goal.updated", "goal": { } } ],
  "truncated": false, "lastId": 122 }
```
`events`: các message realtime y hệt dạng phát qua STOMP (có `id`), `id > N`, tăng dần, tối đa `limit`. `lastId` = id mới nhất của hệ thống. BE không còn giữ đủ event từ N+1 → `truncated:true`, `events:[]`.

### 2.3 `GET /system` | `POST /system/pause` `{ "reason": "Bảo trì" }` (reason tuỳ chọn, body có thể `{}`) | `POST /system/resume`
Cả ba trả:
```json
{ "state": "RUNNING", "reason": null, "lastEventId": 120 }
```
`state`: `RUNNING | PAUSED`. Khi PAUSED BE **không bắt đầu task mới** (task đang chạy tự kết thúc). Realtime `system.state_changed`.
FE KHÔNG optimistic: chỉ đổi giao diện sau khi BE trả.

### 2.4 Goal (mục tiêu)
```json
{ "id": 7, "title": "Báo cáo kết quả tuần", "description": "...", "departmentId": 2, "projectId": null,
  "tokenBudget": 50000, "tokensUsed": 9584, "requirePlanApproval": true,
  "status": "AWAITING_PLAN_APPROVAL",
  "plan": [ { "key": "p1", "title": "Thu thập số liệu", "assigneeId": 15, "priority": "HIGH", "dependsOn": [], "estimateTokens": 2100 },
            { "key": "p2", "title": "Soạn báo cáo", "assigneeId": 16, "priority": "NORMAL", "dependsOn": ["p1"] } ],
  "rejectReason": null, "createdAt": "2026-11-01T08:00:00Z", "updatedAt": "2026-11-01T08:00:05Z", "finishedAt": null }
```
- `status`: `PLANNING | AWAITING_PLAN_APPROVAL | RUNNING | DONE | FAILED | CANCELLED | REJECTED`.
- `plan[].key` là id trong phạm vi kế hoạch; `dependsOn` trỏ `key` khác. Khi duyệt, BE tạo task thật và đổi `dependsOn` sang **id task**.

| API | Request | Response / ghi chú |
|---|---|---|
| `GET /goals` | — | `Goal[]` |
| `POST /goals` | `{ "title": "...", "description": "", "departmentId": "2"?, "tokenBudget": 50000?, "requirePlanApproval": true }` | `Goal`. `title` bắt buộc; `requirePlanApproval` mặc định true. Phát `goal.created` |
| `POST /goals/{id}/approve-plan` | — | `Goal` (→ RUNNING, tạo task). 409 nếu không ở `AWAITING_PLAN_APPROVAL` |
| `POST /goals/{id}/reject-plan` | `{ "reason": "..." }` (FE bắt buộc nhập) | `Goal` (→ REJECTED, `rejectReason`) |
| `POST /goals/{id}/cancel` | — | `Goal` (→ CANCELLED; huỷ luôn task chưa xong của mục tiêu) |
| `POST /goals/{id}/project` | `{ "projectId": "3" \| null }` | `Goal` — gán / chuyển / bỏ khỏi dự án. BE phát `project.updated` cho dự án cũ và mới |

Realtime: `goal.created` / `goal.updated` `{ goal }` — đối tượng **đầy đủ**, không phải bản vá.

---

## 3. Task (mở rộng) và Kanban

### 3.1 Task — field mới thêm vào `Task` của phần 1
```json
{ "id": 5226, "agentId": 15, "title": "...", "input": "...", "status": "RUNNING", "result": null,
  "createdAt": "...", "updatedAt": "...",
  "goalId": 7, "priority": "HIGH", "dependsOn": [5220], "attempts": 1, "error": null,
  "assignedById": 14, "startedAt": "...", "tokensUsed": 1200,
  "version": 4, "locked": false, "parentId": null, "projectId": 3, "costMicro": 18250, "progressPct": null }
```
- `status` thêm: `CANCELLED`, `AWAITING_APPROVAL` (chờ duyệt, task bị khoá), `WAITING_BUDGET` (chờ ngân sách). Đầy đủ: `QUEUED RUNNING AWAITING_APPROVAL WAITING_BUDGET DONE FAILED CANCELLED`.
- `priority`: `HIGH | NORMAL | LOW` (mặc định NORMAL). `dependsOn`: id task phải `DONE` trước. `assignedById`: agent giao, null = chủ/hệ thống.
- `version`: **tăng mỗi lần task đổi** (FE gửi lại làm `expectedVersion`). `locked`: true thì FE không cho kéo. `progressPct`: chỉ task cha.
- Task `AWAITING_APPROVAL` phải có `Approval` PENDING gắn `taskId` để FE mở đúng yêu cầu khi bấm thẻ.

| API | Request | Response / ghi chú |
|---|---|---|
| `GET /tasks` | — | `Task[]`: task của mục tiêu chưa kết thúc + task kết thúc trong 24h gần nhất |
| `GET /tasks/{id}` | — | `Task` (404 nếu không có) |
| `GET /tasks/{id}/history` | — | `[ { "at": "...", "status": "RUNNING", "note": "Agent X nhận việc" } ]` |
| `POST /tasks/{id}/cancel` | — | `Task` (→ CANCELLED) |
| `POST /tasks/{id}/retry` | — | `Task` — chỉ khi `FAILED`, ngược lại 409 |
| `PUT /tasks/{id}/priority` | `{ "priority": "HIGH" }` | `Task` (FE cập nhật lạc quan, BE sai thì FE hoàn lại) |
| `POST /tasks/{id}/assign` | `{ "agentId": "16" }` | `Task` — đổi người phụ trách |

Realtime: `task.created` / `task.updated` `{ task }` — đối tượng đầy đủ (kèm `version` mới).

### 3.2 Kanban
`GET /kanban/columns/{column}?projectId&agentId&departmentId&priority&q&cursor&limit=50`
`column` ∈ `QUEUED | RUNNING | AWAITING_APPROVAL | DONE | FAILED_CANCELLED`.
```json
{ "items": [ Task ], "total": 148, "nextCursor": "c2" }
```
- `QUEUED` gồm cả `WAITING_BUDGET`, sắp theo thứ tự **SẼ chạy** (ưu tiên, rồi ai vào trước). Các cột khác: mới cập nhật trước.
- `FAILED_CANCELLED` gồm `FAILED` + `CANCELLED`. `q` tìm theo tiêu đề (không phân biệt dấu).

`POST /tasks/{id}/move`
```json
{ "toColumn": "RUNNING", "beforeTaskId": "5230", "expectedVersion": 4 }
```
→ 200 `Task` (đối tượng sau khi di chuyển) hoặc **409** `{ "reasonCode": "...", "message": "..." }`. FE đọc `reasonCode`, không đọc `message`.
`beforeTaskId` = thẻ đứng ngay SAU vị trí mới (null = cuối); chỉ dùng khi đổi chỗ trong cột Chờ.

| Từ → Đến | Kết quả BE |
|---|---|
| Chờ → Chờ (đổi chỗ) | 200 `Task`; BE lưu thứ tự, ảnh hưởng thứ tự chạy; FE cập nhật lạc quan |
| Chờ → Đang làm | 200 nếu hết phụ thuộc và agent rảnh; `DEPENDENCIES_PENDING` nếu còn phụ thuộc; `NOT_ALLOWED` nếu agent bận |
| Chờ / Đang làm → Lỗi/Huỷ | Huỷ task (200); FE luôn hỏi xác nhận trước |
| Xong / Lỗi / Huỷ → Chờ | LÀM LẠI = tạo task **mới**, trả `Task` mới (id khác); FE hỏi xác nhận |
| Chờ duyệt → bất kỳ | `USE_APPROVAL_DIALOG` |
| bất kỳ → Xong; bất kỳ → Chờ duyệt | `NOT_ALLOWED` |
| Đang làm → Chờ | `NOT_SUPPORTED` |
| `expectedVersion` ≠ `version` hiện tại | `STALE_VERSION` (FE tự tải lại cột) |

`reasonCode` ∈ `DEPENDENCIES_PENDING | NOT_SUPPORTED | USE_APPROVAL_DIALOG | NOT_ALLOWED | STALE_VERSION`. FE chỉ gợi ý; **mọi thao tác hợp lệ về mặt thao tác đều được gửi lên**, BE là bên quyết định.

---

## 4. Phê duyệt (mở rộng so với phần 1, mục 2.11–2.12)

`Approval` — field thêm:
```json
{ "id": 9, "agentId": 15, "title": "Gửi email cho khách", "createdAt": "...",
  "riskType": "EXTERNAL", "goalId": 7, "taskId": 5226, "action": "send_email",
  "argsSnapshot": { "to": "a@b.com", "subject": "...", "body": "..." },
  "expiresAt": "2026-11-01T09:00:00Z", "status": "PENDING", "decisionReason": null, "decidedAt": null }
```
- `riskType`: `EXTERNAL | MONEY | DESTRUCTIVE`. `status`: `PENDING | APPROVED | REJECTED | EXPIRED`.
- **`argsSnapshot` = ĐÚNG tham số sẽ thực thi** (FE hiển thị nguyên văn; sau khi duyệt BE phải thực thi đúng bản này, không đọc lại từ nơi khác).
- `GET /approvals?status=PENDING|ALL` — `ALL` = đang chờ + vài chục yêu cầu đã xử lý gần nhất. FE dùng `ALL` ở snapshot.
- `POST /approvals/{id}/approve` → `{ "id": 9, "status": "APPROVED" }`.
- `POST /approvals/{id}/reject` body `{ "reason": "..." }` (**bắt buộc**, FE không cho để trống) → `{ "id": 9, "status": "REJECTED" }`.
- Đã xử lý / hết hạn rồi → **409**. FE KHÔNG optimistic: chỉ đổi giao diện sau khi BE xác nhận.
- Realtime: `approval.requested` `{ agentId, approvalId, approval }` (kèm `approval` đầy đủ); `approval.resolved` `{ approvalId, approved, status, reason }` (`status` có thể là `EXPIRED`).

---

## 5. Dự án

`Project`:
```json
{ "id": 3, "name": "Kênh YouTube Q4", "description": "", "departmentId": 2, "color": "#2563eb", "dueDate": "2026-12-31T00:00:00Z",
  "status": "ACTIVE", "budgetMicro": 50000000, "costMicro": 18250000, "progressPct": 42.5,
  "counts": { "queued": 4, "running": 2, "awaitingApproval": 1, "waitingBudget": 0, "done": 30, "failed": 2, "cancelled": 1 },
  "goalIds": [7, 8], "createdAt": "..." }
```
- `status`: `ACTIVE | ARCHIVED`. **Công thức tiến độ (BE tính)**: `Σ trọng số task DONE / Σ trọng số task chưa huỷ`, trọng số HIGH 3, NORMAL 2, LOW 1. Task FAILED vẫn nằm ở mẫu số và được đếm riêng.

| API | Request | Response |
|---|---|---|
| `GET /projects?status&departmentId&q` | — | `Project[]` |
| `GET /projects/{id}` | — | `Project` (404 nếu không có) |
| `GET /projects/{id}/snapshots` | — | `[ { "day": "2026-10-30", "progressPct": 40.1 } ]` (mỗi ngày một dòng) |
| `GET /projects/{id}/events` | — | `[ { "id": 1, "at": "...", "message": "Hoàn thành mục tiêu X", "kind": "info" } ]` |
| `POST /projects` | `{ "name": "...", "description": "", "departmentId": "2"?, "color": "#2563eb", "dueDate": "..."?, "budgetMicro": 50000000? }` | `Project` |
| `POST /projects/{id}/archive` | — | `Project` (→ ARCHIVED) |
| `POST /projects/{id}/reopen` | — | `Project` (→ ACTIVE) |

Realtime: `project.updated` `{ project }` (đầy đủ).

---

## 6. Chi phí và ngân sách

### 6.1 `GET /usage?from&to&groupBy=agent|department|project|model&projectId&agentId`
```json
{ "from": "2026-10-04T00:00:00Z", "to": "2026-11-03T00:00:00Z", "groupBy": "agent",
  "totalMicro": 16020228, "prevTotalMicro": 14000000, "calls": 1200, "inputTokens": 900000, "outputTokens": 210000,
  "avgPerTaskMicro": 67600, "unpricedCalls": 0,
  "byDay": [ { "day": "2026-10-04", "totalMicro": 510000, "parts": { "15": 300000, "16": 210000 } } ],
  "rows": [ { "key": "15", "label": "Biên tập Qwen", "totalMicro": 1191000, "calls": 90, "inputTokens": 70000, "outputTokens": 15000 } ] }
```
**Bất biến BE phải giữ**: `Σ rows.totalMicro = Σ byDay.totalMicro = totalMicro`; mỗi ngày `Σ parts = totalMicro` ngày đó. `prevTotalMicro` = kỳ liền trước cùng độ dài (null nếu không có). `unpricedCalls` = số cuộc gọi chưa có giá (chi phí thật cao hơn số đang hiện).

### 6.2 Giá model
- `GET /model-prices` → `[ { "id": 1, "model": "claude-sonnet-5-5", "inputPerMTokMicro": 3000000, "outputPerMTokMicro": 15000000, "effectiveFrom": "2026-10-01T00:00:00Z" } ]`
- `POST /model-prices` body `{ "model", "inputPerMTokMicro", "outputPerMTokMicro", "effectiveFrom" }` → `ModelPrice`.
  Giá áp cho cuộc gọi theo bản ghi **mới nhất có `effectiveFrom` ≤ thời điểm gọi**. Sau khi thêm, BE tính lại chi phí các cuộc gọi chưa có giá có thời điểm ≥ `effectiveFrom`, rồi phát `stats.invalidated` và `budget.updated`.

### 6.3 Ngân sách
`Budget`:
```json
{ "id": 1, "scopeType": "DEPARTMENT", "scopeId": 2, "scopeLabel": "Studio YouTube", "period": "MONTH",
  "limitMicro": 100000000, "usedMicro": 60000000, "reservedMicro": 5000000, "waitingTasks": 0,
  "warnPct": 80, "mode": "BLOCK", "state": "OK" }
```
- `scopeType`: `AGENT | DEPARTMENT | PROJECT | COMPANY` (COMPANY: `scopeId` null). `period`: `DAY | MONTH | TOTAL`. `mode`: `BLOCK` (vượt thì task thành `WAITING_BUDGET`) hoặc `WARN` (chỉ cảnh báo).
- `usedMicro`, `reservedMicro` (đặt chỗ cho task đang chạy/chờ), `waitingTasks` (task đang chờ vì ngân sách này), `state` — **BE tính lại mỗi lần đọc**. `state = HARD` khi `used + reserved >= limit`; `SOFT` khi `>= limit * warnPct/100`; ngược lại `OK`.
- Agent bị coi là **HẾT NGÂN SÁCH** (huy hiệu trên canvas) khi có ngân sách `mode=BLOCK`, `state=HARD` thuộc COMPANY, hoặc DEPARTMENT của agent, hoặc AGENT là chính nó.

| API | Request | Response |
|---|---|---|
| `GET /budgets` | — | `Budget[]` |
| `POST /budgets` | `{ "scopeType", "scopeId"?, "period", "limitMicro", "warnPct": 80, "mode": "BLOCK" }` | `Budget` |
| `PUT /budgets/{id}` | `{ "limitMicro", "warnPct", "mode", "reason"? }` | `Budget`. **Tăng `limitMicro` mà thiếu `reason` → 400 `{ "message": "..." }`** (BE phải ép, FE cũng chặn) |
| `GET /budgets/{id}/changes` | — | `[ { "id": 1, "budgetId": 1, "at": "...", "fromMicro": 1000000, "toMicro": 2000000, "reason": "Thêm cho chiến dịch" } ]` |

Mỗi lần đổi hạn mức ghi một dòng `changes`. Khi hạn mức đủ rộng BE **tự thả** các task `WAITING_BUDGET` về `QUEUED` (và phát `task.updated`). Realtime: `budget.updated` `{ budget }`.

---

## 7. Lịch sử hội thoại

`Conversation`:
```json
{ "id": "c1", "title": "Kế toán chi phí token", "agentId": 15, "goalId": 7, "taskId": 5226, "projectId": 3,
  "startedAt": "...", "updatedAt": "...", "messageCount": 12, "tokens": 5400, "costMicro": 41000,
  "hasError": false, "tools": ["web_search", "send_email"], "snippet": "…tổng chi phí tháng…" }
```
`Message`:
```json
{ "id": "m1", "role": "TOOL", "content": "…markdown thô…", "createdAt": "...", "tokens": 120, "costMicro": 900,
  "toolName": "send_email", "toolArgs": { "to": "[REDACTED:EMAIL]" }, "truncated": false }
```
`role` ∈ `USER | ASSISTANT | TOOL`.

| API | Request | Response / ghi chú |
|---|---|---|
| `GET /conversations?q&agentId&departmentId&projectId&goalId&taskId&from&to&role&hasError&tool&sort=relevance\|newest&cursor&limit=30` | — | Trang `Conversation`. **Tìm không dấu** ("ke toan" khớp "kế toán"); `snippet` = đoạn quanh từ khoá (chữ thường, không HTML) |
| `GET /conversations/{id}` | — | `Conversation` (404 nếu không có) |
| `GET /conversations/{id}/messages?cursor&limit=40` | — | Trang `Message`, tăng dần theo thời gian |
| `DELETE /conversations/{id}` | — | 204; xoá cả tin nhắn. FE hỏi xác nhận, không optimistic |

**BE phải thay bí mật bằng `[REDACTED:LOẠI]`** (cả `content` và `toolArgs`); `truncated:true` khi tin bị cắt bớt.

---

## 8. Dashboard

`GET /stats/overview?from&to&departmentId&projectId`
```json
{ "updatedAt": "...", "from": "...", "to": "...", "enoughData": true,
  "completed": { "value": 237, "prev": 220 }, "medianSec": { "value": 296, "prev": 280 }, "p90Sec": 1703,
  "errorRate": { "value": 0.112, "prev": 0.08 }, "recoveredRate": 0.61,
  "cost": { "value": 17720131, "prev": 15000000 },
  "running": 4, "queued": 148, "awaiting": 3,
  "byDay": [ { "day": "2026-10-04", "completed": 8, "failed": 1, "costMicro": 510000 } ],
  "durationBuckets": [ { "label": "< 1 phút", "count": 40 } ],
  "costByDepartment": [ { "key": "2", "label": "Studio YouTube", "totalMicro": 9000000 } ],
  "busiestAgents": [ { "agentId": 15, "tasks": 17, "utilization": 0.82, "queueDepth": 7, "errorRate": 0.118, "costMicro": 1191000 } ],
  "errorGroups": [ { "key": "429", "message": "Lỗi 429: quá giới hạn tốc độ", "count": 8, "agentIds": [15, 16], "lastTaskId": 5226, "lastAt": "..." } ],
  "heatmap": [ [0, 1, 0, "… 24 số"], "… 7 hàng (thứ 2 → CN)" ] }
```
- `prev` = cùng chỉ số ở kỳ liền trước cùng độ dài (null/thiếu = chưa có để so sánh). `errorRate`, `recoveredRate`, `utilization`, `errorRate` của agent: **0..1**.
- `errorRate` = task lỗi hẳn / task kết thúc. `recoveredRate` = tỉ lệ thành công sau thử lại.
- **Bất biến nên giữ** (FE hiển thị cạnh nhau): `completed.value = Σ byDay.completed = Σ durationBuckets.count`; `Σ errorGroups.count = Σ byDay.failed`; `Σ byDay.costMicro = Σ costByDepartment.totalMicro`.
- `enoughData = false` (ít hơn 5 task kết thúc trong khoảng) → FE hiện "Chưa đủ dữ liệu" thay biểu đồ. `heatmap` = null khi chưa đủ dữ liệu (mock: < 20 task).
- `busiestAgents` đã sắp theo `tasks` giảm dần, tối đa 8 (mock; BE tự chọn, FE hiển thị bao nhiêu cũng được). `errorGroups` sắp theo `count` giảm dần.
- FE làm mới mỗi 30 giây và khi nhận realtime `stats.invalidated`.

---

## 9. Thông báo

`Notification`:
```json
{ "id": 1, "level": "WARNING", "type": "budget.soft", "title": "Ngân sách sắp hết", "body": "Studio YouTube đã dùng 85%",
  "target": { "kind": "BUDGET", "id": 1 }, "createdAt": "...", "readAt": null }
```
`level`: `INFO | SUCCESS | WARNING | CRITICAL`. `target.kind`: `TASK | GOAL | APPROVAL | DEVICE | BUDGET | PROJECT | AGENT` (FE dùng để điều hướng khi bấm). `type` ∈ `goal.done, task.failed, task.done, approval.requested, budget.soft, budget.hard, device.offline`.

| API | Request | Response |
|---|---|---|
| `GET /notifications?level&type&unread=true&cursor&limit=30` | — | Trang `Notification`, mới nhất trước |
| `GET /notifications/unread-count` | — | `{ "count": 3 }` |
| `POST /notifications/{id}/read` | — | `Notification` (FE lạc quan) |
| `POST /notifications/read-all` | — | `{ "count": 0 }` (FE lạc quan) |

Realtime `notification.created { notification }`: **BE chịu trách nhiệm khử trùng** và chỉ phát khi quy tắc kênh "app" cho phép. FE tạo toast chỉ từ message này (cùng `type` + `target` thì FE gộp "x3").

### 9.1 Cài đặt
`GET /notification-settings` và `PUT /notification-settings` (cùng dạng response):
```json
{ "telegram": { "status": "VERIFIED", "username": "@thanh", "botName": "AgentOfficeBot" },
  "email": { "status": "PENDING", "address": "a@b.com" },
  "rules": [ { "type": "task.failed", "channels": { "app": true, "telegram": true, "email": false },
               "minLevel": "WARNING", "projectId": null, "agentId": null } ],
  "quiet": { "enabled": true, "from": "22:00", "to": "07:00", "tz": "Asia/Ho_Chi_Minh" },
  "digest": { "enabled": false, "at": "18:00" } }
```
- `channel.status`: `NONE | PENDING | VERIFIED`. `PUT` body `{ "rules": [...], "quiet": {...}, "digest": {...} }` — **thay toàn bộ** ba phần này (không đụng tới telegram/email).
- **FE không bao giờ nhận token bot / mật khẩu SMTP.** Giờ `HH:mm`. Giờ yên lặng chặn Telegram/email, vẫn ghi vào app; `digest` gửi tóm tắt cuối ngày.

### 9.2 Kênh
| API | Request | Response / ghi chú |
|---|---|---|
| `POST /notification-channels/telegram/link` | — | `{ "code": "A1B2C3", "botName": "AgentOfficeBot", "expiresAt": "..." }` — mã dùng một lần, hiệu lực 10 phút, status → `PENDING`. Người dùng gửi `/start <code>` cho bot → `VERIFIED`. FE hỏi lại `GET /notification-settings` mỗi 3 giây khi PENDING |
| `POST /notification-channels/email` | `{ "address": "a@b.com" }` | Settings (gửi thư xác minh, email status `PENDING`) |
| `POST /notification-channels/email/verify` | `{ "code": "123456" }` | Settings. Sai mã → 400 `{ "message" }` |
| `POST /notification-channels/{telegram\|email}/test` | — | `Delivery` (gửi thử một thông báo) |
| `DELETE /notification-channels/{telegram\|email}` | — | 204 (ngắt kênh, status → `NONE`) |

### 9.3 Lịch sử giao hàng
`Delivery`: `{ "id": 1, "channel": "TELEGRAM|EMAIL", "title": "...", "status": "SENT|FAILED|DEAD", "error": null, "attempts": 1, "createdAt": "..." }` (`DEAD` = hết số lần thử, không tự gửi lại nữa).
- `GET /notification-deliveries?cursor&limit=20` → trang `Delivery`.
- `POST /notification-deliveries/{id}/resend` → `Delivery` (gửi lại, tăng `attempts`).

---

## 10. Realtime mới (STOMP `/topic/agents`)

Mọi message dưới đây (và các message cũ ở phần 1) **có thể kèm `"id"` DomainEvent** (mục 2.1). Mỗi frame một object JSON.

| type | Payload | Khi nào phát |
|---|---|---|
| `goal.created` / `goal.updated` | `{ goal }` | Tạo / đổi trạng thái / kế hoạch / tiến độ token của mục tiêu |
| `system.state_changed` | `{ state, reason? }` | Tạm dừng / tiếp tục |
| `approval.requested` | `{ agentId, approvalId, approval }` | Mở rộng: kèm `approval` đầy đủ (có `argsSnapshot`) |
| `approval.resolved` | `{ approvalId, approved, status?, reason? }` | Mở rộng: `status` có thể `EXPIRED` (hết hạn) |
| `task.created` / `task.updated` | `{ task }` | Mở rộng: Task có field mới, `version` tăng mỗi lần |
| `project.updated` | `{ project }` | Số đếm / tiến độ / chi phí / trạng thái dự án đổi |
| `budget.updated` | `{ budget }` | `used/reserved/state/limit` đổi |
| `stats.invalidated` | `{}` | Số liệu dashboard/chi phí đã lỗi thời (vd sau khi đổi giá) → FE tải lại |
| `notification.created` | `{ notification }` | Thông báo mới cho ứng dụng (đã khử trùng) |

---

## 11. Việc BE cần chú ý (hay sai)
1. **`id` DomainEvent liên tục, không trùng, không hở** — FE tự bù khi hở nhưng mỗi lần bù là một request; hở thường xuyên là bug BE.
2. **`version` của Task tăng ở MỌI thay đổi** (kể cả đổi ưu tiên/đổi người phụ trách). Kéo thả Kanban dựa vào nó để phát hiện xung đột.
3. **Tổng tiền phải khớp** giữa `/usage`, `/stats/overview`, `/budgets`, `Project.costMicro` (cùng một nguồn dữ liệu cuộc gọi; sau khi đổi giá phải tính lại cả bốn).
4. **Ép phía BE**, đừng tin FE: lý do khi tăng ngân sách (400), lý do khi từ chối phê duyệt, trạng thái hợp lệ khi `approve-plan` / `retry` / `move`.
5. **Không rò bí mật**: không trả token bot, SMTP, khoá API; redact hội thoại trước khi lưu hoặc trước khi trả.
6. **Phê duyệt** thực thi đúng `argsSnapshot`; hết hạn (`expiresAt`) thì chuyển `EXPIRED` và phát `approval.resolved`.
7. **Phân trang cursor ổn định**: thêm dữ liệu mới giữa hai lần gọi không được làm lặp/mất dòng (cursor theo `(sortKey, id)`).

## 12. FE đã làm / chưa làm (để BE biết giới hạn)
- Đã nối đủ 53 API ở mục 1 (mock đáp ứng tất cả). Chưa chạy với BE thật.
- Chưa có: phân quyền / đăng nhập (mọi API đang gọi như một chủ duy nhất); chưa gọi `GET /meetings/active`, `GET /agents/{id}`, `GET /devices/{id}`, `GET /stats/company` (xem phần 1).
- Điều khiển máy từ xa (WoL/restart/shutdown) vẫn bị vô hiệu ở FE, xem mục 4.6 phần 1.

# Đặc tả API cho Backend (Spring) — AgentOffice

Tài liệu tổng hợp MỌI thứ FE đang gọi / lắng nghe. Nguồn sự thật để đối chiếu:
- Schema zod FE: `src/types/index.ts` (FE kiểm tra mọi response bằng zod — lệch schema là FE báo lỗi, xem mục 0.4).
- Hàm gọi API: `src/api/*.ts`. Mock chạy được như BE giả: `src/mocks/*` (đọc để thấy hành vi mong đợi).
- Tài liệu cũ `docs/MISSING_API.md` vẫn còn nhưng file này thay thế nó (đầy đủ và chuẩn hơn).
- **Phần 2 — `docs/BE_API_SPEC_PART2.md`**: toàn bộ API mới (mục tiêu, phê duyệt mở rộng, Kanban, dự án, chi phí/ngân sách, lịch sử hội thoại, dashboard, thông báo, `id` DomainEvent + `/events`). Làm BE thì đọc cả ba file.
- **Phần 3 — `docs/BE_API_SPEC_PART3.md`**: Agent Studio, công cụ và quyền, bí mật, model, kho tài liệu, bộ nhớ, mẫu agent (76 REST + 6 realtime; mở đầu có bảng tổng hợp, thứ tự làm, mã lỗi và checklist quy tắc BE).

Cột "Mức":
- **P0** = FE đang gọi ngay, thiếu là hỏng màn hình.
- **P1** = FE đang gọi, thiếu thì tính năng đó không dùng được nhưng app vẫn chạy.
- **P2** = FE chưa gọi, dành sẵn (làm sau cũng được).

---

## 0. Quy ước chung

### 0.1 Kết nối
| Mục | Giá trị |
|---|---|
| REST base URL | `http://localhost:8080/api` (FE đọc từ `VITE_API_BASE_URL`) |
| WebSocket | `ws://localhost:8080/ws` (FE đọc từ `VITE_WS_URL`) |
| Giao thức realtime | STOMP qua **WebSocket thuần (không SockJS)**, subprotocol `v12.stomp` |
| Topic duy nhất | `/topic/agents` — mọi loại sự kiện đi chung topic, phân biệt bằng field `type` |
| Xác thực | Chưa có. FE không gửi header Authorization/cookie |
| CORS | Cho phép origin `http://localhost:5173`, method `GET, POST, PUT, DELETE, OPTIONS`, header `Content-Type` |

### 0.2 Dạng dữ liệu
- Body JSON, `Content-Type: application/json`. Chỉ gửi header này khi có body.
- **id**: số hoặc chuỗi đều được (FE chuẩn hoá về chuỗi). Khi FE gửi id lên (path, `departmentId` trong body) thì luôn là **chuỗi** → BE tự parse sang `Long` nếu cần.
- **Thời gian**: ISO-8601 UTC, ví dụ `"2026-11-01T15:24:49.123Z"`. Cấu hình Jackson: `WRITE_DATES_AS_TIMESTAMPS=false`.
- **Số**: phần trăm là 0–100 (không phải 0–1). Băng thông tính bằng **kbps**. Nhiệt độ °C.
- **Enum**: viết HOA đúng như tài liệu. FE **từ chối cả object** nếu gặp giá trị enum lạ (xem 0.4) → không tự thêm giá trị enum mới khi chưa báo FE.

### 0.3 Mã HTTP
FE chỉ phân biệt `res.ok` (2xx) và còn lại. Không đọc body lỗi. Quy ước đề xuất:
`200` đọc/sửa, `201` hoặc `200` tạo mới (đều được), `204` hoặc `200` xoá, `400` dữ liệu sai, `404` không có, `500` lỗi.
Body lỗi đề xuất (FE chưa dùng nhưng nên thống nhất): `{ "message": "..." }`.
Nếu response có body thì **phải là JSON hợp lệ**; không có body thì để trống.

### 0.4 Quy tắc zod mà BE phải tuân theo (hay gây lỗi nhất)
- Field **bắt buộc** (không ghi "tuỳ chọn") mà thiếu/`null` → FE ném lỗi "sai định dạng", cả danh sách không hiện. Một phần tử sai làm hỏng cả mảng.
- Field ghi `default` = có thể **bỏ hẳn** (không gửi); nhưng nếu gửi thì **không được `null`** trừ khi cột ghi "nullable".
- Field ghi "nullable"/"nullish" = có thể `null` hoặc bỏ.
- Field lạ BE gửi thêm: FE bỏ qua, không lỗi (vì vậy **đừng** gửi mật khẩu/khoá/token của thiết bị, FE cũng không lưu).
- Message realtime sai định dạng: FE bỏ qua message đó và log console, không sập.

---

## 1. Mô hình dữ liệu (response)

### 1.1 Agent
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| id | id | ✔ | |
| name | string | ✔ | |
| role | string | ✔ | |
| model | string | ✔ | vd `claude-sonnet-5-5` (dropdown FE: `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`; BE đừng chặn giá trị khác) |
| systemPrompt | string | default `""` | không `null` |
| color | string | default `#2563eb` | mã hex màu áo; không `null` |
| status | enum | ✔ | `IDLE` `WORKING` `BLOCKED` `ERROR` `OFFLINE` |
| currentTask | `{id, title}` | nullable, default null | task đang chạy (khi `WORKING`) |
| departmentId | id | nullable, default null | phòng ban |
| isHead | boolean | default false | trưởng phòng; khớp `Department.headAgentId` |
| runsOnDeviceId | id | nullable, default null | id thiết bị mà agent chạy trên đó (xem 1.7) |

```json
{ "id": 15, "name": "Biên kịch", "role": "Tiếng Việt", "model": "claude-sonnet-5-5",
  "systemPrompt": "Bạn là Biên kịch...", "color": "#6366f1", "status": "WORKING",
  "currentTask": { "id": 301, "title": "Viết kịch bản video 1" },
  "departmentId": 2, "isHead": false, "runsOnDeviceId": "workstation" }
```

### 1.2 Department
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| id | id | ✔ | |
| name | string | ✔ | tên hiển thị |
| slug | string | ✔ | **duy nhất**, dùng cho URL `/department/{slug}` |
| icon | string | default `building` | tên icon lucide FE đã map: `crown clapperboard smartphone code wallet briefcase server`; tên lạ → icon mặc định |
| color | string | ✔ | màu accent hex, vd `#c93d31` |
| headAgentId | id | nullable, default null | |
| order | number | default 0 | thứ tự hiển thị và phím tắt 1–9 |

Phòng đang dùng (slug): `dieu-hanh`, `studio-youtube`, `tiktok-shorts`, `cong-nghe-web`, `ke-toan-thu-quy`, `kinh-doanh`, **`ha-tang`** (Hạ tầng & Máy móc — slug này FE dùng để gắn khu thiết bị, đừng đổi). Màu phòng Hạ tầng: `#0e7490`.

### 1.3 Task
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| id | id | ✔ | |
| agentId | id | ✔ | |
| title | string | ✔ | |
| input | string | default `""` | không `null` |
| status | enum | ✔ | `QUEUED` `RUNNING` `DONE` `FAILED` |
| result | string | nullable, default null | **markdown**, chỉ có khi `DONE` |
| createdAt | string(ISO) | ✔ | |
| updatedAt | string(ISO) | ✔ | FE dùng để tính "hoàn thành hôm nay" ở mock |

### 1.4 AgentEvent (nhật ký của agent)
`{ id, agentId, message, createdAt }` — cả 4 field bắt buộc.

### 1.5 Approval
`{ id (bắt buộc), agentId (bắt buộc), title (tuỳ chọn), createdAt (tuỳ chọn) }`

### 1.6 GoalResult
`{ id, departmentId, goal, createdAt, plan: [{ agentId, taskTitle, taskId? }] }` — `taskId` tuỳ chọn, còn lại bắt buộc.

### 1.7 Device (máy thật được giám sát — KHÔNG phải agent)
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| id | id | ✔ | FE seed mock dùng: `workstation ai-pc laptop server router nas` |
| name | string | ✔ | |
| type | enum | ✔ | `WORKSTATION` `AI_PC` `LAPTOP` `SERVER` `ROUTER` `NAS` |
| os | string | default `""` | không `null` |
| status | enum | ✔ | `ONLINE` `DEGRADED` `OFFLINE` |
| lastSeen | string(ISO) | nullish | lần cuối nhận heartbeat — **quan trọng, xem 4.2** |
| uptimeSec | number | nullish | giây từ lần khởi động gần nhất |
| ownerAgentId | id | nullish | agent hạ tầng phụ trách (sẽ đứng dậy đi tới máy khi có cảnh báo) |
| ip | string | nullish | FE ẩn mặc định, bấm mới hiện |
| metrics | DeviceMetrics | default `{}` | |

**DeviceMetrics** — mọi trường đều tuỳ chọn/nullable; thiếu thì FE ẩn mục tương ứng:
```
cpuPct, ramPct, diskPct      number 0..100
tempC                         number (°C)
netInKbps, netOutKbps         number (kbps)
gpu?    { utilPct, vramPct, tempC }          // chỉ máy AI_PC
nas?    { volumeUsedPct, raidStatus }        // chỉ NAS; raidStatus là string, vd "Healthy", "Degraded"
router? { wanUp (boolean), latencyMs }       // chỉ ROUTER
```
```json
{ "id": "ai-pc", "name": "Máy AI local", "type": "AI_PC", "os": "Ubuntu 24.04 + CUDA",
  "status": "ONLINE", "lastSeen": "2026-11-01T15:24:49Z", "uptimeSec": 345600,
  "ownerAgentId": 40, "ip": "192.168.88.11",
  "metrics": { "cpuPct": 46, "ramPct": 71, "diskPct": 55, "tempC": 63, "netInKbps": 1500, "netOutKbps": 600,
               "gpu": { "utilPct": 88, "vramPct": 79, "tempC": 74 } } }
```

### 1.8 DeviceEvent
`{ id, deviceId, type (string, tự do vd "boot" "status" "alert"), message, severity: "info"|"warning"|"critical" (default info), createdAt }`

### 1.9 NetworkLink
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| fromDeviceId | id | ✔ | hoặc chuỗi cố định **`"internet"`** (nút ảo) |
| toDeviceId | id | ✔ | |
| kbps | number | default 0 | lưu lượng hiện tại cả hai chiều; không `null` |
| latencyMs | number | nullish | |
| up | boolean | default true | `false` = cáp đứt (FE vẽ đỏ nét đứt); không `null` |

Cấu trúc chuẩn: `internet → router`, rồi `router → từng thiết bị còn lại` (chiều from→to là chiều hạt sáng chạy).

---

## 2. REST API

Tổng hợp:

| # | Method + Path | Mức | Nhóm |
|---|---|---|---|
| 2.1 | `GET /agents` | P0 | Agent |
| 2.2 | `GET /agents/{id}` | P2 | Agent |
| 2.3 | `POST /agents` | P1 | Agent |
| 2.4 | `PUT /agents/{id}` | P1 | Agent |
| 2.5 | `DELETE /agents/{id}` | P1 | Agent |
| 2.6 | `GET /agents/{id}/tasks` | P0 | Task |
| 2.7 | `POST /agents/{id}/tasks` | P0 | Task |
| 2.8 | `GET /departments` | P0 | Phòng ban |
| 2.9 | `GET /departments/{id}/stats` | P1 | Phòng ban |
| 2.10 | `POST /departments/{id}/goals` | P1 | Phòng ban |
| 2.11 | `GET /approvals?status=PENDING` | P1 | Duyệt |
| 2.12 | `POST /approvals/{id}/approve` | P1 | Duyệt |
| 2.13 | `GET /devices` | P0* | Hạ tầng |
| 2.14 | `GET /network/topology` | P0* | Hạ tầng |
| 2.15 | `GET /devices/{id}/events` | P1 | Hạ tầng |
| 2.16 | `GET /devices/{id}` | P2 | Hạ tầng |
| 2.17 | `GET /agents/{id}/events?limit=200` | P2 | Nhật ký |
| 2.18 | `GET /departments/{id}/events?limit=200` | P2 | Nhật ký |
| 2.19 | `GET /stats/company` | P2 | Số liệu |
| 2.20 | `POST /approvals/{id}/reject` | P2 | Duyệt |
| 2.21 | `GET /meetings/active` | P2 | Họp |

\* P0 cho riêng phòng Hạ tầng; thiếu thì phòng đó không có thiết bị nhưng các phòng khác vẫn chạy.

> Giả định: nhóm Agent/Task (2.1–2.7) có thể BE đã làm theo schema cũ. Hãy đối chiếu từng field với mục 1, đặc biệt `departmentId`, `isHead`, `runsOnDeviceId` là field **mới** của Agent.

### 2.1 `GET /agents` → `Agent[]`
Trả **tất cả** agent kèm `status` hiện tại (FE dựng cả văn phòng từ đây; mở lại tab FE không phát lại hoạt ảnh nên `status` phải đúng thời điểm gọi). Mảng rỗng nếu chưa có.

### 2.2 `GET /agents/{id}` → `Agent`   |  `404` nếu không có.   (P2: FE có hàm `getAgent` nhưng chưa gọi ở đâu)

### 2.3 `POST /agents` → `Agent`
Request:
```json
{ "name": "Biên kịch", "role": "Tiếng Việt", "systemPrompt": "Bạn là biên kịch...",
  "model": "claude-sonnet-5-5", "color": "#6366f1", "departmentId": "2" }
```
Validation (FE đã chặn nhưng BE cũng nên): `name`, `role`, `model` không rỗng; `systemPrompt` ≥ 10 ký tự; `color` hex; `departmentId` tuỳ chọn (`null`/bỏ = chưa thuộc phòng).
Response: Agent vừa tạo với `status: "IDLE"`, `currentTask: null`, `isHead: false`, `runsOnDeviceId: null`.

### 2.4 `PUT /agents/{id}` → `Agent`
Body y như 2.3 (thay toàn bộ các field đó; có thể dùng để **chuyển phòng** bằng `departmentId`). Giữ nguyên `status`, `isHead`, `runsOnDeviceId`, `currentTask` — FE không gửi các field này. `404` nếu không có.

### 2.5 `DELETE /agents/{id}`
`204` (hoặc `200`) không body. FE tự xoá agent khỏi màn hình khi thành công.

### 2.6 `GET /agents/{id}/tasks` → `Task[]`
Sắp xếp **mới nhất trước**. `404` nếu agent không tồn tại.

### 2.7 `POST /agents/{id}/tasks` → `Task`
Request `{ "title": "Viết kịch bản", "input": "Chủ đề: ..." }` (`title` bắt buộc, `input` có thể rỗng).
Response: Task mới với `status: "QUEUED"`, `result: null`. Sau đó BE thực thi và phát realtime `task.created` (có thể ngay) → `agent.status_changed` (WORKING) → `task.updated` (RUNNING/DONE) → `agent.status_changed` (IDLE). FE xử lý trùng theo `id` nên phát `task.created` kể cả khi response đã trả task cũng không sao.

### 2.8 `GET /departments` → `Department[]`
Sắp xếp theo `order` tăng dần càng tốt (FE tự sort lại). Phải có đủ phòng kể cả `ha-tang`.

### 2.9 `GET /departments/{id}/stats` → 
```json
{ "doneToday": 14, "tokenCostToday": 1.82 }
```
- `doneToday` **bắt buộc**: số task `DONE` trong ngày hôm nay (múi giờ `Asia/Ho_Chi_Minh`) của các agent thuộc phòng.
- `tokenCostToday` (USD) **tuỳ chọn**; bỏ hoặc `null` thì FE ẩn thẻ "Chi phí token".
- FE tự tính số đang chạy / lỗi từ trạng thái agent; BE có gửi thêm `running`, `errors` cũng được (bị bỏ qua).
- FE tải lại endpoint này mỗi khi nhận `task.updated` có `status = DONE`.

### 2.10 `POST /departments/{id}/goals` → `GoalResult`
Request `{ "goal": "Làm 3 video về chủ đề X trong tuần này" }` (không rỗng).
Hành vi: trưởng phòng "chia việc": chọn nhân viên (không gồm trưởng phòng, ưu tiên người đang `IDLE`), tạo task cho từng người.
Response:
```json
{ "id": 7, "departmentId": 2, "goal": "Làm 3 video...", "createdAt": "2026-11-01T15:30:00Z",
  "plan": [ { "agentId": 15, "taskTitle": "Viết kịch bản video 1", "taskId": 301 },
            { "agentId": 16, "taskTitle": "Dịch kịch bản", "taskId": 302 } ] }
```
Đồng thời phát realtime: `department.dispatch` **trước**, rồi (sau ~1,5 giây) các `task.created` / `agent.status_changed` của nhân viên — FE dùng khoảng chờ này để vẽ đường nối sáng từ bàn trưởng phòng. `400` nếu phòng chưa có nhân viên.

### 2.11 `GET /approvals?status=PENDING` → `Approval[]`
Các yêu cầu đang chờ duyệt (để khi mở trang agent đang chờ vẫn giơ tay). Ví dụ:
`[{ "id": 9, "agentId": 15, "title": "Xin duyệt chi 20$ quảng cáo", "createdAt": "2026-11-01T15:00:00Z" }]`

### 2.12 `POST /approvals/{id}/approve` → `{ "id": 9, "status": "APPROVED" }`
(`status` là string bất kỳ.) Sau khi duyệt, BE phát `approval.resolved` cho mọi client. `404` nếu không có / `409` nếu đã xử lý.

### 2.13 `GET /devices` → `Device[]`
Tất cả thiết bị kèm `status`, `lastSeen`, `metrics` mới nhất. FE tải lại khi nối lại realtime.

### 2.14 `GET /network/topology` → `NetworkLink[]`
```json
[ { "fromDeviceId": "internet", "toDeviceId": "router", "kbps": 5200, "latencyMs": 12, "up": true },
  { "fromDeviceId": "router", "toDeviceId": "server", "kbps": 3100, "latencyMs": 1, "up": true },
  { "fromDeviceId": "router", "toDeviceId": "laptop", "kbps": 0, "latencyMs": null, "up": false } ]
```

### 2.15 `GET /devices/{id}/events` → `DeviceEvent[]`
Chỉ cần **lịch sử cũ** (trước khi người dùng mở trang), **cũ nhất trước, mới nhất cuối** (FE nối thẳng rồi đảo ngược để hiện mới nhất ở trên, không tự sắp xếp). Tối đa 100 dòng; có thể nhận `?limit=`. Loại sự kiện nên có: khởi động lại, mất kết nối, kết nối lại, nhiệt độ cao, đĩa gần đầy. Sự kiện phát sinh sau khi mở trang FE tự ghi từ realtime, nên không cần trùng.

### 2.16 `GET /devices/{id}` → `Device`   (P2, FE chưa gọi)

### 2.17 `GET /agents/{id}/events?limit=200` → `AgentEvent[]`   (P2)
Để tab "Nhật ký" của agent có dữ liệu cũ khi mở trang (hiện FE chỉ có event realtime từ lúc mở).

### 2.18 `GET /departments/{id}/events?limit=200` → `AgentEvent[]`   (P2, tuỳ chọn)

### 2.19 `GET /stats/company` → `{ "tokenCostToday": 5.4 }`   (P2, tuỳ chọn)
Để hiện chi phí token ở thanh trên cùng. Chưa có thì FE ẩn.

### 2.20 `POST /approvals/{id}/reject` → `{ "id": 9, "status": "REJECTED" }`   (P2) — phát `approval.resolved` với `approved: false`.

### 2.21 `GET /meetings/active` → `[{ "departmentId": 2, "agentIds": [15,16] }]`   (P2)

---

## 3. Realtime (STOMP `/topic/agents`)

Mỗi frame MESSAGE có **một** object JSON, có field `type`. Không cần header đặc biệt.
Gửi cho **mọi client** đang subscribe (broadcast).

Kết nối (Spring):
- `registry.addEndpoint("/ws").setAllowedOrigins("http://localhost:5173")` — **không** `.withSockJS()`.
- `config.enableSimpleBroker("/topic").setHeartbeatValue(new long[]{10000, 10000}).setTaskScheduler(...)` (FE dùng heartbeat mặc định 10s/10s; thiếu TaskScheduler thì Spring không gửi heartbeat và FE tưởng đứt).
- FE tự nối lại sau 1s, 2s, 4s… tối đa 30s. Khi nối lại FE tải lại `/agents`, `/devices`, `/network/topology`.

### 3.1 Agent & công việc (P0)
| type | Payload | Khi nào phát |
|---|---|---|
| `agent.status_changed` | `{ agentId, status, currentTask: {id,title}\|null }` | Mỗi lần agent đổi trạng thái. `currentTask` null khi không làm gì |
| `task.created` | `{ task: Task }` | Task mới tạo |
| `task.updated` | `{ task: Task }` | Task đổi trạng thái/kết quả. Khi `DONE` kèm `result` markdown |
| `event.created` | `{ event: AgentEvent }` | Dòng nhật ký của agent ("Bắt đầu: …", "Hoàn thành: …") |

### 3.2 Phòng ban (P1)
| type | Payload | Ghi chú |
|---|---|---|
| `department.dispatch` | `{ departmentId, headId, targetAgentIds: [id] }` | Trưởng phòng chia việc. Phát **trước** `task.created` / `agent.status_changed` của nhân viên ~1–1,5s |

### 3.3 Hiệu ứng nhân vật đi lại (P1)
Chỉ là **hiệu ứng hiển thị**; trạng thái thật vẫn do `agent.status_changed`. FE không tự đổi trạng thái agent. Chưa nhận sự kiện nào thì mọi người ngồi yên tại bàn.

| type | Payload | FE làm gì |
|---|---|---|
| `task.handoff` | `{ fromAgentId, toAgentId, taskId, message }` | Người giao cầm giấy đi tới bàn người nhận, hiện bong bóng `message` rồi về |
| `report.to_head` | `{ agentId, departmentId, taskId? }` | Nhân viên đi tới bàn trưởng phòng báo xong rồi về |
| `meeting.started` | `{ departmentId, agentIds: [id], endsAt? }` | Các agent vào phòng họp (Khu chung); `endsAt` ISO tuỳ chọn |
| `meeting.ended` | `{ departmentId }` | Kết thúc họp sớm |
| `approval.requested` | `{ agentId, approvalId }` | Agent giơ tay + dấu chấm than, nhãn "Chờ duyệt" đến khi có `approval.resolved`. Nên **đồng thời** có bản ghi trả về ở `GET /approvals?status=PENDING` |
| `approval.resolved` | `{ approvalId, approved }` | Hạ tay. `approved` mặc định true |

### 3.4 Hạ tầng & thiết bị (P0* cho phòng Hạ tầng)
| type | Payload | Khi nào / FE làm gì |
|---|---|---|
| `device.status_changed` | `{ deviceId, status, lastSeen? }` | Mỗi lần đổi `ONLINE/DEGRADED/OFFLINE`. OFFLINE: đèn đỏ + báo động xoay; mọi agent có `runsOnDeviceId` = máy này hiện "Mất máy chủ" và mờ đi; trở lại ONLINE thì tự hết |
| `device.metrics` | `{ deviceId, metrics, uptimeSec?, lastSeen? }` | **Định kỳ 5–10 giây/thiết bị đang sống**. Gộp nhiều thiết bị vào một message thì không được — mỗi message 1 thiết bị |
| `device.alert` | `{ deviceId, kind, message, severity }` | `kind` ∈ `cpu disk temp offline`; `severity` ∈ `warning critical` (mặc định warning). Đường tắt để bật cảnh báo ngay (xem 4.3) |
| `network.link_changed` | `{ fromDeviceId, toDeviceId, kbps, latencyMs, up }` | Phẳng (không lồng `link`). Phát khi lưu lượng đổi đáng kể hoặc đứt/nối lại |

Ví dụ:
```json
{ "type": "device.metrics", "deviceId": "ai-pc", "uptimeSec": 345650, "lastSeen": "2026-11-01T15:25:00Z",
  "metrics": { "cpuPct": 52, "ramPct": 72, "diskPct": 55, "tempC": 64, "netInKbps": 1480, "netOutKbps": 590,
               "gpu": { "utilPct": 91, "vramPct": 80, "tempC": 75 } } }
{ "type": "device.status_changed", "deviceId": "laptop", "status": "OFFLINE", "lastSeen": "2026-11-01T15:25:03Z" }
{ "type": "device.alert", "deviceId": "server", "kind": "cpu", "message": "CPU 96% kéo dài", "severity": "warning" }
{ "type": "network.link_changed", "fromDeviceId": "router", "toDeviceId": "laptop", "kbps": 0, "latencyMs": null, "up": false }
```

---

## 4. Quy tắc nghiệp vụ BE cần giữ

### 4.1 Nhất quán REST ↔ realtime
Trạng thái trong `GET /agents`, `/devices`, `/network/topology` tại thời điểm gọi phải khớp với chuỗi sự kiện realtime sau đó. FE tải REST rồi áp sự kiện lên; sự kiện đến cho id chưa có trong danh sách bị **bỏ qua** (lần tải sau mới có).

### 4.2 Heartbeat thiết bị (dễ sai nhất)
FE có đồng hồ canh: thiết bị **không phải OFFLINE** mà `lastSeen` cũ hơn **60 giây** thì FE tự chuyển OFFLINE trên màn hình. Vì vậy:
- Thiết bị sống phải gửi `device.metrics` đều ≤ 10s (và/hoặc cập nhật `lastSeen`).
- `lastSeen` trong `GET /devices` phải là thời điểm nhận heartbeat thật, không phải giờ hiện tại của server.
- Thiết bị OFFLINE thì **ngừng** gửi `device.metrics`; khi trở lại gửi `device.status_changed` `ONLINE` rồi tiếp tục metrics. Khởi động lại thì `uptimeSec` về nhỏ.

### 4.3 Ngưỡng cảnh báo
FE tự đánh giá từ `device.metrics` (cấu hình `src/config/devices.ts`), nên BE **không bắt buộc** gửi `device.alert`:
| Cảnh báo | Điều kiện FE |
|---|---|
| cpu | `cpuPct > 90` liên tục quá 5 phút |
| disk | `diskPct > 85` (hoặc `nas.volumeUsedPct > 85`) |
| temp | `tempC > 80` (hoặc `gpu.tempC > 80`) |
| offline | `status = OFFLINE` |
Cảnh báo tắt khi hết vi phạm **ổn định 30 giây** (chống chớp tắt). Nếu BE tự đánh giá và gửi `device.alert` thì FE bật ngay; FE vẫn tự tắt theo số liệu. Mỗi cảnh báo chỉ toast một lần cho tới khi tắt.
`DEGRADED` nên dùng khi một chỉ số vượt ngưỡng nhưng máy còn sống.

### 4.4 Sự kiện mất đường mạng
Đứt cáp tới một máy: phát `network.link_changed` (`up:false`, `kbps:0`) **và** `device.status_changed` `OFFLINE` cho máy đó (FE không tự suy ra từ link).

### 4.5 Chọn nhân viên / chia việc
`isHead = true` đúng một agent mỗi phòng và trùng `Department.headAgentId`. Trưởng phòng không nhận task từ `goals`.

### 4.6 Điều khiển máy từ xa (CHƯA làm, nhưng thiết kế trước)
FE có nút Wake-on-LAN / Khởi động lại / Tắt máy nhưng **luôn vô hiệu**. Khi BE làm: mọi hành động này là mức `DESTRUCTIVE`, phải tạo `Approval` rồi chờ chủ duyệt (qua 2.11/2.12), tuyệt đối không thực thi trực tiếp khi nhận một request thường. Cần báo FE trước khi mở nút.

---

## 5. Thứ tự làm đề xuất
1. **P0 chạy màn hình**: 2.1, 2.8, 2.6, 2.7 + realtime 3.1 (`agent.status_changed`, `task.*`, `event.created`).
2. **Phòng ban**: 2.9, 2.10, 3.2.
3. **Hạ tầng**: 2.13, 2.14, 2.15 + 3.4 (`device.metrics` đều 5–10s là quan trọng nhất) + field `runsOnDeviceId` trên Agent.
4. **Duyệt & hiệu ứng**: 2.11, 2.12 + 3.3.
5. CRUD agent 2.3–2.5, rồi các mục P2.

## 6. Việc FE còn lại (để BE biết giới hạn hiện tại)
- Khi nối lại realtime FE tải lại agents/devices/network nhưng **chưa** tải lại approvals; chưa có cơ chế `lastEventId` để lấy bù sự kiện.
- Form tạo/sửa agent chưa gửi `runsOnDeviceId`; BE tự gán (vd theo cấu hình) hoặc báo FE thêm trường vào body 2.3/2.4.
- Schema zod là **giả định** cho tới khi có JSON thật từ BE: nếu JSON thật khác, sửa một chỗ duy nhất `src/types/index.ts`.

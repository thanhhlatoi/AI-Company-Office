# Đặc tả API cho Backend — PHẦN 3: Agent Studio, công cụ và quyền, model, kho tài liệu, bộ nhớ, mẫu agent (Prompt 4D)

Bổ sung cho `BE_API_SPEC.md` (phần 1) và `BE_API_SPEC_PART2.md` (phần 2). Quy ước chung (tiền micro-USD, trang cursor `{items,nextCursor}`, id số/chuỗi, `id` DomainEvent, lỗi 409 `{reasonCode}`) giữ như phần 2, mục 0.
Schema GIẢ ĐỊNH — nguồn sống: `src/types/{tools,models,knowledge,memory,studio,studioEvents}.ts`, hàm gọi `src/api/studio.ts`, mock chạy được `src/mocks/studio/*`. File này được bổ sung thêm theo từng bước làm (hiện: **Bước 1 — các lệnh ĐỌC, xem trước và thử quyền**; lệnh GHI sẽ thêm ở Bước 2–7).

**Bất biến an toàn BE phải giữ**
- Không bao giờ trả giá trị bí mật (khoá API, mật khẩu, token): chỉ `id`, tên, loại, ngày, nơi đang dùng.
- Tam giác rủi ro (`privateData && readsExternal && sendsOut`): BE tự buộc mọi hành động gửi ra ngoài phải chờ duyệt, FE không tắt được.
- Nội dung tài liệu / ký ức / kết quả công cụ là dữ liệu KHÔNG tin cậy; BE đánh dấu `tainted` cho task đã đọc nội dung ngoài.

## 1. Công cụ và quyền
| API | Trả về |
|---|---|
| `GET /tools` | `Tool[]` |
| `GET /grants?agentId` | `Grant[]` |
| `GET /agents/{id}/effective-permissions` | `EffectivePermissions` |
| `GET /effective-permissions` | `EffectivePermissions[]` (mọi agent, cho ma trận quyền) |
| `POST /agents/{id}/permissions/preview` body `PermissionChange` | `EffectivePermissions` của bản thay đổi CHƯA lưu ("Sau thay đổi agent này sẽ có thể...") |
| `POST /tools/{toolId}/check` body `{agentId, args}` | `{decision: ALLOWED\|DENIED\|NEEDS_APPROVAL, reason}` — KHÔNG thực thi |
| `GET /tool-calls?agentId&toolId&decision&denied&cursor&limit` | trang `ToolCallLog` (mới nhất trước) |
| `GET /secrets` | `Secret[]` (không có giá trị) |
| `GET /permission-audit?cursor&limit` | trang `PermissionAudit` |

```json
// Tool
{ "id": "email_send", "name": "Gửi thư", "group": "Thư", "risk": "EXTERNAL", "description": "...",
  "scopeSchema": { "type": "object", "required": ["account","allowedDomains"], "properties": {
      "account": { "type": "string", "title": "Tài khoản gửi", "x-secretKind": "email" },
      "allowedDomains": { "type": "array", "items": { "type": "string" }, "title": "Miền nhận được phép", "default": [] },
      "dailyLimit": { "type": "integer", "title": "Tối đa mỗi ngày", "default": 10, "minimum": 1 } } },
  "readsExternal": false, "readsPrivate": false, "sendsOut": true,
  "enabled": true, "requiresAdminFlag": false, "adminFlagOn": false, "agentCount": 4 }
// Grant
{ "id": "g1", "agentId": "20", "toolId": "email_send", "scope": { "account": "s2", "allowedDomains": ["acme.com"] },
  "limits": { "maxCallsPerTask": 20, "maxPerMinute": null, "expiresAt": null }, "alwaysApprove": false, "secretId": null, "createdAt": "...", "updatedAt": "..." }
// EffectivePermissions
{ "agentId": "20", "privateData": true, "readsExternal": false, "sendsOut": true,
  "tools": [ { "toolId": "email_send", "allowed": true, "risk": "EXTERNAL", "needsApproval": false, "scopeSummary": "account: s2 · allowedDomains: acme.com", "expiresAt": null, "blockedReason": null } ] }
// PermissionChange (preview / lưu)
{ "grants": [ { "toolId": "web_search", "scope": {}, "limits": {}, "alwaysApprove": false } ], "remove": ["email_read"], "reason": "..." }
// ToolCallLog
{ "id": "tc9", "at": "...", "agentId": "20", "toolId": "email_send", "decision": "DENIED", "reason": "Miền nhận ... không nằm trong danh sách cho phép",
  "taskId": "5300", "args": { "to": "x@evil.example.net" }, "tainted": true }
```
- `risk`: `READ | WRITE_INTERNAL | EXTERNAL | MONEY | DESTRUCTIVE`. `x-secretKind` trong `scopeSchema` = FE cho chọn bí mật theo loại (không cho gõ bí mật).
- `EffectivePermissions.tools[]` liệt kê cả quyền đã cấp nhưng đang bị chặn: `allowed=false` + `blockedReason` (tắt khẩn cấp, thiếu cờ quản trị với MONEY/DESTRUCTIVE, hết hạn). Ba cờ `privateData/readsExternal/sendsOut` chỉ tính trên quyền **đang dùng được**.
- `needsApproval` = `alwaysApprove` hoặc công cụ MONEY/DESTRUCTIVE. Tam giác rủi ro làm lời gọi `NEEDS_APPROVAL` ở thời điểm gọi (xem `check`).
- `check` phải áp đúng phạm vi: miền nhận, tên miền được mở, thư mục, hạn mức/bên nhận chi tiền; từ chối kèm lý do tiếng Việt dễ hiểu.

## 2. Model
| API | Trả về |
|---|---|
| `GET /models` | `ModelProfile[]` |
| `GET /agents/{id}/model-policy` | `ModelPolicy` (kèm `resolved`) |
| `GET /routing-rules` | `RoutingRule[]` (đã theo thứ tự) |
| `POST /routing/simulate` body `{agentId, priority, tokens, dataClass}` | `{modelId, ruleId, explanation}` |

```json
{ "id": "qwen3-32b-local", "label": "Qwen3 32B (máy AI)", "provider": "ollama", "modelId": "qwen3:32b", "baseUrl": "http://ai-pc.lan:11434", "secretId": null,
  "dataClass": "LOCAL", "tier": "BALANCED", "capabilities": { "toolUse": true, "json": true, "vision": false },
  "contextTokens": 32000, "maxConcurrent": 2, "inUse": 1, "inputPerMTokMicro": 0, "outputPerMTokMicro": 0,
  "health": { "status": "UP", "checkedAt": "...", "consecutiveErrors": 0 }, "deviceId": "ai-pc" }
// ModelPolicy
{ "agentId": "7", "primaryId": "qwen3-32b-local", "fallbackIds": ["llama3-8b-local"], "escalationId": null, "routing": "FIXED", "privacy": "LOCAL_ONLY",
  "resolved": { "modelId": null, "blockedBy": "Qwen3 32B (máy AI): máy chạy model đang OFFLINE · Llama 3.1 8B (server): đang ngừng hoạt động" } }
```
- `tier`: `FAST | BALANCED | POWER`. `routing`: `FIXED | RULES | TIERED`. `privacy`: `ANY | TRUSTED | LOCAL_ONLY`. `health.status`: `UP | DEGRADED | DOWN`.
- **`resolved` do BE giải** tại thời điểm gọi: lần lượt model chính → dự phòng → leo thang, bỏ model vi phạm `privacy` (LOCAL_ONLY: chỉ `dataClass=LOCAL`; TRUSTED: nhà cung cấp đáng tin), model `DOWN`, model local mà `deviceId` đang OFFLINE. Không có model hợp lệ → `modelId=null` + `blockedBy` liệt kê từng ràng buộc. **BE tuyệt đối không tự chuyển lên cloud khi `privacy=LOCAL_ONLY`.**
- Model local gắn `deviceId` (phòng Hạ tầng): máy OFFLINE thì `health.status` phải là `DOWN`.

## 3. Kho tài liệu
| API | Trả về |
|---|---|
| `GET /collections` | `Collection[]` |
| `GET /collections/{id}` | `Collection` |
| `GET /collections/{id}/documents?cursor&limit` | trang `Document` |
| `GET /documents/{id}/chunks?cursor&limit` | trang `Chunk` |
| `GET /collections/{id}/search?q&asAgent` | `{visible, hits: SearchHit[]}` — `asAgent` bỏ trống = Quản trị |
| `GET /collections/{id}/eval` | `{questions, runs}` (bộ kiểm thử truy hồi) |

- `Collection`: `{id,name,description,sensitivity: PUBLIC|INTERNAL|CONFIDENTIAL, scope:{kind: SHARED|DEPARTMENT|AGENT,id}, docCount, indexState: READY|INDEXING|REINDEXING|FAILED, reindexPct, embeddingModel:{id,label,dataClass}, embeddingCostMicro, chunking:{size,overlap}, acl:[{kind: ALL|DEPARTMENT|AGENT, id, access: NONE|READ|WRITE}]}`.
- `Document`: `{id,collectionId,name,mime,sizeBytes,status: UPLOADED|EXTRACTING|CHUNKING|EMBEDDING|READY|FAILED, progressPct (của giai đoạn hiện tại), errorCode, trust: OWNER|EXTERNAL, chunkCount, version, createdAt}`. `errorCode` là mã (vd `PDF_SCANNED_NO_OCR`); FE tự dịch sang tiếng Việt — BE nên giữ danh sách mã ổn định.
- `SearchHit`: `{chunkId,documentId,documentName,page,text,score:{vector,keyword,fused}}`. `visible=false` khi agent `asAgent` không có quyền đọc bộ sưu tập (khác "không có kết quả"). **Tìm theo agent phải áp ACL thật.**
- `trust=EXTERNAL`: task đọc tài liệu này bị BE đánh dấu nhiễm (`tainted`).

## 4. Bộ nhớ
| API | Trả về |
|---|---|
| `GET /memory?agentId&namespaceId&q&kind&origin&status&subject&pinned&cursor&limit` | `{items: MemoryItem[], total, nextCursor}` (ghim trước, rồi mới nhất; `q` tìm không dấu) |
| `GET /memory/namespaces` | `MemoryNamespace[]` (kèm `itemCount`, `pendingCount`) |

- `MemoryItem`: `{id,namespaceId,agentId,kind: FACT|PREFERENCE|EVENT|PROCEDURE,content,subject,importance 1..5,origin: OWNER|AGENT_OBSERVED|EXTERNAL_INFERRED,confidence 0..1,status: ACTIVE|PENDING_REVIEW|REJECTED|EXPIRED,pinned,editedByOwner,createdAt,lastAccessedAt,expiresAt,source:{taskId,externalRefs[]}}`.
- Mục `EXTERNAL_INFERRED` (suy ra từ nội dung ngoài) khi `requireReview` phải vào `PENDING_REVIEW`, kèm `source` để chủ biết đã đọc gì.

## 5. Agent Studio và mẫu
| API | Trả về |
|---|---|
| `GET /agents/{id}/studio` | `StudioConfig` |
| `GET /agents/{id}/prompt-versions` | `PromptVersion[]` (mới nhất trước) |
| `POST /prompt/lint` body `{prompt}` | `{issues:[{line,severity: info\|warning\|error,code,message}], tokenEstimate}` |
| `GET /templates` | `AgentTemplate[]` |
| `GET /templates/{id}` | `AgentTemplate` |
| `GET /templates/{id}/agents` | `Agent[]` (agent tạo từ mẫu, để thông báo bản mới) |

- `StudioConfig`: `{agentId, templateId, templateVersion, latestTemplateVersion, memoryPolicy:{enabled,autoLoad,autoSummarize,requireReview}, collections:[{collectionId,access}], namespaces:[{namespaceId,access}], dailyBudgetMicro}`. `latestTemplateVersion > templateVersion` → FE hiện "Mẫu có bản mới".
- `AgentTemplate`: `{id,name,group,kind: BUILTIN|MINE|IMPORTED,version,description,systemPrompt,promptNotes:[{section,note}],variables:[{key,label,default,required}],suggestedTools:[{toolId,scope}],modelRequirement:{preferLocal,needsToolUse,minTier},locked,createdAt}`. Biến trong prompt dạng `{{key}}`. `suggestedTools` chỉ là ĐỀ XUẤT — tạo agent từ mẫu không bao giờ tự cấp quyền.

## 6. Realtime mới (kèm `id` DomainEvent)
| type | Payload | FE làm gì |
|---|---|---|
| `grant.changed` | `{agentId, toolId?}` | tải lại quyền hiệu lực, công cụ, nhật ký thay đổi |
| `tool.denied` | `{log: ToolCallLog}` | tải lại nhật ký công cụ / trung tâm "Bị từ chối" (cả `NEEDS_APPROVAL`) |
| `model.health_changed` | `{modelId, health}` | cập nhật chấm sức khoẻ ngay; tải lại chính sách model |
| `document.status_changed` | `{document}` | cập nhật thanh tiến trình của tài liệu (đối tượng đầy đủ) |
| `memory.pending_review` | `{item}` | tăng số hàng chờ xem xét |
| `template.instantiated` | `{templateId, agentId}` | tải lại danh sách mẫu / agent |

Yêu cầu duyệt phát sinh từ công cụ dùng lại `approval.requested` (phần 2, mục 4) với `action` = tên công cụ và `argsSnapshot` = tham số thật.

---

## 7. (Bước 2) Lệnh GHI của Agent Studio
| API | Request | Response / ghi chú |
|---|---|---|
| `POST /agents/{id}/prompt-versions` | `{prompt, note}` | `PromptVersion` mới (số phiên bản tăng dần). Đồng thời đặt `Agent.systemPrompt` = prompt. `400` nếu < 10 ký tự. **Không bao giờ ghi đè** phiên bản cũ |
| `POST /agents/{id}/prompt-versions/{versionId}/restore` | — | `PromptVersion` MỚI có nội dung bản cũ, `note` = "Khôi phục từ vN" |
| `PUT /agents/{id}/model-policy` | `{primaryId, fallbackIds, escalationId, routing, privacy}` | `ModelPolicy` (kèm `resolved`). `400 {message}` nếu model chính không có hoặc nằm trong `fallbackIds`. Đồng bộ `Agent.model` = `primaryId` |
| `POST /models/{id}/test` | `{prompt}` | `{modelId, output, inputTokens, outputTokens, costMicro, latencyMs, error}`. Đây là lần gọi thật (tốn token với CLOUD). Model DOWN/máy OFFLINE → `error` có chữ, `output` rỗng (HTTP 200) |
| `POST /agents/{id}/template-sync` | `{parts: ["prompt"\|"model"]}` | `StudioConfig`. `parts` rỗng = bỏ qua bản mẫu mới. `prompt`: tạo phiên bản prompt mới từ mẫu; `model`: đổi model chính sang model local khoẻ nếu mẫu `preferLocal`. Cập nhật `templateVersion` = bản mới nhất. **KHÔNG bao giờ tự cấp / thu hồi quyền công cụ** |
| `POST /departments/{id}/head` | `{agentId}` | Đặt trưởng phòng: `Agent.isHead` đúng một người mỗi phòng, `Department.headAgentId` khớp. `400` nếu agent không thuộc phòng |

Hồ sơ cơ bản (tên, vai trò, phòng ban, màu áo) dùng `PUT /agents/{id}` có sẵn ở phần 1. Biến trong prompt mẫu: `{{key}}`.

---

## 8. (Bước 3) Ghi quyền, công tắc công cụ, bí mật
| API | Request | Response / ghi chú |
|---|---|---|
| `PUT /agents/{id}/grants` | `PermissionChange` = `{grants:[GrantInput], remove:[toolId], reason?}` | `EffectivePermissions` mới. Một giao dịch. Lỗi: `400 {message}` thiếu/sai phạm vi (BE kiểm lại `required`, kiểu, `minimum/maximum` theo `scopeSchema`); `403 {reasonCode: ADMIN_FLAG_OFF}` khi công cụ MONEY/DESTRUCTIVE chưa bật cờ; `403 {reasonCode: TOOL_DISABLED}` khi đang tắt khẩn cấp; `404` agent/công cụ lạ. Mỗi dòng ghi `PermissionAudit` (GRANT/UPDATE/REVOKE kèm `before/after/reason`) và phát `grant.changed {agentId, toolId}` |
| `PUT /tools/{id}` | `{enabled?, adminFlagOn?, reason?}` | `Tool`. `enabled=false` = **tắt khẩn cấp có hiệu lực ngay** cho mọi agent (quyền đã cấp được giữ, `EffectivePermissions.tools[].allowed=false`, `blockedReason`). `adminFlagOn` chỉ hợp lệ với `requiresAdminFlag` (`400` nếu không). Ghi audit `KILL_SWITCH` / `ADMIN_FLAG`; phát `grant.changed {agentId:"*", toolId}` |
| `POST /secrets` | `{name, kind, value}` | `Secret` (không có giá trị). `409` nếu trùng tên. `kind` ∈ `email social bank llm other` |
| `POST /secrets/{id}/rotate` | `{value}` | `Secret` với `rotatedAt` mới |
| `DELETE /secrets/{id}` | — | `204`. `409 {reasonCode:"IN_USE", usedBy:[{agentId, toolId}]}` nếu còn quyền tham chiếu |

- **FE gửi `value` bí mật đúng một chiều**: ô mật khẩu, không đưa vào URL / localStorage, xoá khỏi state ngay khi gửi, và huỷ biến của mutation. BE không bao giờ trả giá trị bí mật.
- `PermissionChange` được dùng cả cho `POST /agents/{id}/permissions/preview` (mục 1) — hai API phải tính quyền hiệu lực **cùng một cách**.
- Quyền tham chiếu bí mật qua `scope` (khoá `x-secretKind` trong `scopeSchema` = loại bí mật được chọn); `Secret.usedBy` do BE tính từ các `Grant`.
- `ToolCallLog.decision = DENIED` cần `reason` tiếng Việt rõ ràng (FE hiển thị nguyên văn và dùng nó để gom nhóm "Bị từ chối"; phần trong ngoặc kép được bỏ khi gom).

---

## 9. (Bước 4) Hồ sơ model, luật định tuyến, so sánh
| API | Request | Response / ghi chú |
|---|---|---|
| `GET /model-policies` | — | `ModelPolicy[]` của MỌI agent (kèm `resolved`) — FE dùng để vẽ nhãn LOCAL/CLOUD / "Không có model" trên canvas |
| `POST /models` | `ModelProfileInput` = `{label, provider, modelId, baseUrl, secretId, dataClass, tier, capabilities, contextTokens, maxConcurrent, inputPerMTokMicro, outputPerMTokMicro, deviceId}` | `ModelProfile`. `400 {message}` nếu CLOUD thiếu `secretId` hoặc LOCAL thiếu `baseUrl`. Bí mật chỉ là tham chiếu `secretId` |
| `PUT /models/{id}` | như trên | `ModelProfile` |
| `POST /models/{id}/check` | — | `{ok, latencyMs, error, health}`; cập nhật `health` của hồ sơ và phát `model.health_changed`. Máy chạy model OFFLINE → `ok=false` |
| `PUT /routing-rules` | `{rules:[{id?, name, when, modelId}]}` | `RoutingRule[]` — thay TOÀN BỘ, thứ tự mảng = thứ tự ưu tiên (`order` BE tự đánh 1..n). `400` nếu `modelId` không tồn tại |
| `POST /routing/simulate` | `{agentId, priority, tokens, dataClass}` | `{modelId, ruleId, explanation}`. Phải áp **cả luật lẫn riêng tư và sức khoẻ**: luật khớp nhưng model bị chặn → `modelId=null`, `explanation` nêu ràng buộc |
| `POST /comparisons/estimate` | `{prompt, modelIds}` | `{estimateMicro, perModel:[{modelId, micro}]}` — ước tính theo giá model, giả định số token đầu ra |
| `POST /comparisons/run` | `{prompt, modelIds}` (2–4 model, `400` ngoài khoảng) | `Comparison` CHƯA lưu: `{id, prompt, createdAt, estimateMicro, results:[ModelTestResult]}`. Model lỗi → `results[].error` có chữ (HTTP vẫn 200) |
| `POST /comparisons` | `Comparison` | `Comparison` đã lưu (BE cấp `id` mới) |
| `GET /comparisons` | — | `Comparison[]` đã lưu, mới nhất trước |

- Chế độ `TRUSTED` = nhà cung cấp đáng tin **hoặc** model `LOCAL`. `LOCAL_ONLY` = chỉ `dataClass=LOCAL`, không bao giờ rơi xuống cloud.
- FE xác nhận trước khi chạy so sánh nếu `estimateMicro` > 50.000 (0,05 USD). BE vẫn nên tự giới hạn chi phí so sánh.
- So sánh gửi prompt tới model CLOUD: FE cảnh báo "không đưa dữ liệu CONFIDENTIAL vào so sánh cloud"; BE nên **từ chối** nếu phát hiện prompt chứa dữ liệu gắn nhãn CONFIDENTIAL khi `modelIds` có model CLOUD.

---

## 10. (Bước 5) Kho tài liệu: ghi, tải lên, kiểm thử truy hồi, tab Dữ liệu
| API | Request | Response / ghi chú |
|---|---|---|
| `GET /embedding-models` | — | `[{id, label, dataClass: LOCAL\|CLOUD, pricePerMTokMicro}]` |
| `POST /collections` | `CollectionInput` = `{name, description, sensitivity, scope:{kind,id}, embeddingModelId, chunking:{size,overlap}, acl:[{kind,id,access}], syncFolder}` | `Collection`. **`400` nếu `sensitivity=CONFIDENTIAL` mà model embedding là CLOUD** (BE tự ép, FE chỉ lọc danh sách) |
| `PUT /collections/{id}` | `CollectionInput` | `Collection`. Cùng ràng buộc CONFIDENTIAL ↔ embedding LOCAL. Đổi `acl` có hiệu lực ngay cho tìm kiếm |
| `POST /collections/{id}/reindex` | `{embeddingModelId}` | `Collection` với `indexState=REINDEXING`, `reindexPct` tăng dần (FE hỏi lại mỗi 2 giây). `409` nếu đang dựng lại; `400` nếu vi phạm CONFIDENTIAL |
| `POST /collections/{id}/sync` | — | `{queued}` — đồng bộ thư mục NAS (`400` nếu chưa cấu hình `syncFolder`) |
| `POST /collections/{id}/documents` | **multipart/form-data**: `file`, `trust` (`OWNER\|EXTERNAL`) | `Document` (`status=UPLOADED`). `415 {reasonCode: UNSUPPORTED_TYPE}`, `413 {reasonCode: TOO_LARGE}`. FE đã kiểm đuôi (`pdf docx md txt csv html eml`) và ≤ 50 MB nhưng BE quyết định |
| `POST /documents/{id}/replace` | multipart như trên | `Document` cùng `id`, `version`+1, quay lại `UPLOADED` |
| `POST /documents/{id}/reprocess` | — | `Document` (quay lại `EXTRACTING`, xoá `errorCode`) |
| `DELETE /documents/{id}` | — | `204`; xoá cả các đoạn / vector |
| `GET /documents/{id}/download` | — | Tệp gốc (FE mở bằng liên kết) |
| `POST /collections/{id}/eval/questions` | `{question, expected}` (`expected` = tên tài liệu đúng) | `{id, question, expected}` |
| `DELETE /collections/{id}/eval/questions/{qid}` | — | `204` |
| `POST /collections/{id}/eval/run` | `{k}` | `EvalRun` `{id, at, k, recallAtK, mrr, misses:[{question, expected}]}`; `400` nếu chưa có câu hỏi |
| `PUT /agents/{id}/studio` | `{memoryPolicy, collections:[{collectionId, access}], namespaces:[{namespaceId, access}]}` | `StudioConfig`. `collections[].access` là quyền RIÊNG của agent: BE lưu thành mục `AGENT` trong ACL của bộ sưu tập (mục AGENT thắng mục phòng ban, mục phòng ban thắng `ALL`; `NONE` = chặn rõ ràng) |

- **Tiến trình realtime**: mỗi lần tài liệu đổi giai đoạn BE phát `document.status_changed {document}` (đối tượng đầy đủ). Giai đoạn: `UPLOADED → EXTRACTING → CHUNKING → EMBEDDING → READY`; lỗi → `FAILED` + `errorCode`. `progressPct` là % của giai đoạn hiện tại.
- **Mã lỗi `errorCode` FE biết dịch**: `PDF_SCANNED_NO_OCR`, `UNSUPPORTED_TYPE`, `TOO_LARGE`, `ENCRYPTED`, `EMPTY_TEXT`, `EXTRACT_TIMEOUT`, `EMBEDDING_FAILED`, `VIRUS_DETECTED`. Mã lạ vẫn hiện "Lỗi xử lý (mã …)". Hãy giữ danh sách mã ổn định.
- **Tìm thử theo agent (`GET /collections/{id}/search?asAgent=`) phải áp ACL thật**; agent không có quyền → `{visible:false, hits:[]}` (khác "không có kết quả"). Điểm: `vector`, `keyword`, `fused` đều là số 0..1.
- **Tài liệu `trust=EXTERNAL`**: task đọc chúng bị BE đánh dấu nhiễm (`tainted`) — ảnh hưởng tam giác rủi ro ở phần 3 mục 1.
- Bộ nhớ trong StudioConfig: `namespaces[].access` lưu như ACL của không gian tên (đầy đủ ở Bước 6).

---

## 11. (Bước 6) Bộ nhớ: sửa, xem xét, quên, xuất, ngữ cảnh hội thoại
| API | Request | Response / ghi chú |
|---|---|---|
| `PUT /memory/{id}` | `{content?, pinned?, importance?}` | `MemoryItem`. Sửa `content` khác bản cũ → `editedByOwner=true`. `400` nếu nội dung rỗng |
| `DELETE /memory/{id}` | — | `204` |
| `POST /memory/{id}/review` | `{decision: APPROVE\|REJECT, content?}` | `MemoryItem`. Chỉ với `status=PENDING_REVIEW` (`409` nếu đã xem xét). `APPROVE` + `content` = "sửa rồi duyệt" (đặt `editedByOwner`). APPROVE → `ACTIVE`, REJECT → `REJECTED` |
| `POST /memory/review/bulk` | `{ids, decision}` | `{updated}` (bỏ qua mục không còn chờ) |
| `POST /memory/forget/preview` | `{subject, agentId?}` | `{count, samples[]}` — số mục SẼ xoá, không xoá gì. Khớp chủ thể **không dấu, không phân biệt hoa thường**, chỉ mục chưa bị từ chối/hết hạn |
| `POST /memory/forget` | `{subject, agentId?}` | `{deleted}`; `400` nếu không có mục nào khớp. Xoá cứng (kể cả bản sao trong chỉ mục vector). FE luôn xem trước và bắt gõ "XÁC NHẬN" |
| `GET /memory/export?agentId` | — | `{agentId, exportedAt, items: MemoryItem[]}` (mục chưa bị từ chối/hết hạn); FE tự tạo tệp JSON để tải |
| `PUT /memory/namespaces/{id}` | `{limit, ttlDays, requireReview}` | `MemoryNamespace`; `400` nếu `limit` < 1. `ttlDays=null` = giữ vĩnh viễn |
| `GET /conversations/{id}/context` | — | `{memories:[{id, content, origin, subject}], citations:[{chunkId, collectionId, documentId, documentName, page, snippet, trust}]}` — ký ức đã nạp vào task và đoạn tài liệu được trích dẫn trong hội thoại đó |

- `GET /memory` đã mô tả ở mục 4. `status` lọc `ACTIVE|PENDING_REVIEW|REJECTED|EXPIRED`; `total` là tổng sau lọc (không phụ thuộc trang).
- **Quy tắc BE**: mục `origin=EXTERNAL_INFERRED` khi `requireReview=true` phải vào `PENDING_REVIEW` và **không được nạp vào task** cho tới khi chủ duyệt. Chủ duyệt xong thì mới `ACTIVE`. Mục `trust=EXTERNAL` trong `citations` là nguồn khiến task bị đánh dấu nhiễm.
- **Chuông "Cần xử lý"** của FE = yêu cầu duyệt + ngân sách chặn việc + `Σ pendingCount` của `GET /memory/namespaces`. BE phát `memory.pending_review {item}` mỗi khi có mục mới vào hàng chờ.
- Nội dung ký ức / đoạn trích là dữ liệu KHÔNG tin cậy: FE chỉ hiện dạng chữ (không HTML, không markdown liên kết).

---

## 12. (Bước 7) Mẫu agent: lưu, nhập, nhân bản, xoá, tạo agent
| API | Request | Response / ghi chú |
|---|---|---|
| `POST /templates` | `AgentTemplateInput` = `{name, group, description, systemPrompt, promptNotes, variables, suggestedTools:[{toolId, scope}], modelRequirement}` | `AgentTemplate` `kind=MINE`, `version=1` |
| `POST /templates/import` | như trên (tệp JSON do người khác gửi) | `AgentTemplate` `kind=IMPORTED`, nhóm "Đã nhập". **BE phải coi nội dung là KHÔNG tin cậy: bỏ mọi `scope` trong `suggestedTools`** (FE cũng không điền sẵn phạm vi từ mẫu đã nhập), giới hạn kích thước, chạy PromptLinter |
| `POST /templates/{id}/clone` | — | `AgentTemplate` `MINE` bản sao ("… (bản của tôi)"). Mẫu dựng sẵn (`locked=true`) chỉ được nhân bản, không sửa/xoá |
| `DELETE /templates/{id}` | — | `204`; `403` với mẫu `locked`. Agent đã tạo từ mẫu giữ nguyên |
| `POST /agents/{id}/save-as-template` | `AgentTemplateInput` (prompt đã tham số hoá bằng `{{khoá}}`) | `AgentTemplate` `MINE`. **BE tự gỡ** khỏi `suggestedTools[].scope`: bí mật (`x-secretKind`), id tài khoản / kênh, đường dẫn, mã bảng tính, tên miền / bên nhận cụ thể; không bao giờ chép bộ nhớ, tài liệu, bí mật. Chỉ giữ các tham số số/boolean vô hại (vd hạn mức) |
| `POST /templates/{id}/instantiate` | `InstantiateInput` = `{name, role, departmentId, variables, model:{primaryId,fallbackIds,escalationId,routing,privacy}, grants:[GrantInput], collections:[{collectionId,access}], namespaces:[{namespaceId,access}], memoryPolicy, dailyBudgetMicro}` | `{agent}` — **MỘT giao dịch**: tạo agent + prompt (thay biến) + chính sách model + quyền công cụ + quyền kho + bộ nhớ + ngân sách ngày (`budget` AGENT/DAY, mode BLOCK). Lỗi: `400 {message}` thiếu biến bắt buộc / phạm vi sai, `403 {reasonCode: ADMIN_FLAG_OFF\|TOOL_DISABLED}`; lỗi thì **không tạo gì cả**. Mỗi quyền ghi audit `GRANT` kèm lý do "Tạo từ mẫu …". Phát `template.instantiated {templateId, agentId}` |

- **Mẫu KHÔNG BAO GIỜ tự cấp quyền**: `suggestedTools` chỉ là đề xuất. Agent mới chỉ có đúng những công cụ nằm trong `grants` của request (người dùng đã tick từng cái).
- `AgentTemplate.version` tăng khi mẫu `MINE` được sửa; `GET /agents/{id}/studio` trả `templateVersion` / `latestTemplateVersion` để FE báo "Mẫu có bản mới" (xem mục 5 và `POST /agents/{id}/template-sync` mục 7).
- Biến prompt dạng `{{khoá}}` (chữ, số, `_`, `-`); biến `required` thiếu thì `instantiate` trả `400`.

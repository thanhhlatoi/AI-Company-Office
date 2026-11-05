# Cài đặt AI (`/settings/ai`)

Màn hình để chủ cấu hình đường đi của AI: Ollama, OmniRoute, định tuyến theo độ khó, và hướng dẫn Graphify.
**BE hiện chưa có API cài đặt** (cấu hình AI nằm ở `.env`/`application.yml`), nên FE chạy bằng mock theo hợp đồng ở dưới.

## Chạy thử

```bash
# .env: VITE_USE_MOCK=true (mặc định hiện tại)
npm run dev
# mở /settings/ai?tab=overview&mock=ok
```

`?tab=` nhận `overview | ollama | omniroute | routing | graphify`. `?mock=` chỉ có tác dụng khi `VITE_USE_MOCK=true`:

| `mock=` | Mô phỏng |
|---|---|
| `ok` (mặc định) | `source=database`, `applyMode=live`, mọi thứ chạy tốt |
| `env` | `source=env`: chỉ xem; PUT trả 409 `SETTINGS_READ_ONLY` |
| `down` | Ollama/OmniRoute/Hermes không kết nối; thử trả `LLM_UNAVAILABLE` kèm `requestId`; tải model lỗi 502 |
| `slow` | Ollama chậm (`degraded`), lần thử mất ~4 giây (để thử nút Huỷ) |
| `timeout` | Lần thử quá hạn sau ~2,5 giây, `errorCode=TIMEOUT` |
| `badshape` | `GET /settings/ai` trả sai định dạng (thử zod) |
| `restart` | `applyMode=restart`: sau khi lưu hiện banner "Cần khởi động lại BE" |
| `fake` | `provider=fake`, tắt OmniRoute: banner "AI GIẢ" |

Mock giữ trạng thái trong bộ nhớ (sửa rồi lưu thì thấy), reset khi tải lại trang. Mock **không giữ khoá**: PUT chỉ lật cờ `apiKeySet`.

## Chuyển sang BE thật

Đặt `VITE_USE_MOCK=false` (và `VITE_API_BASE_URL`). Không cần sửa code: mọi lời gọi đi qua `src/api/settingsAi.ts` → `request()` (`src/api/http.ts`). Gắn xác thực sau này ở **một** chỗ: hàm `req` trong `src/api/settingsAi.ts` (hiện `request` chưa có tham số header).

## Hợp đồng API (đề xuất; schema zod ở `src/types/settingsAi.ts`)

Mọi response được parse bằng zod; sai định dạng thì hiện "BE trả dữ liệu không đúng định dạng". zod **bỏ khoá lạ**, nên nếu BE lỡ trả `apiKey` thì dữ liệu đã parse cũng không chứa nó.
Lỗi chuẩn: `ApiError{code, message, requestId}` (FE hiện message + `requestId`). Mã gợi ý: `LLM_UNAVAILABLE` (502), `VALIDATION`, `SETTINGS_READ_ONLY` (409, khi `source=env`), `FORBIDDEN`.

| Endpoint | Ghi chú |
|---|---|
| `GET /api/settings/ai` | `{applyMode, source, authEnabled?, llm{…, apiKeySet, viaOmniroute, modelAliases}, ollama, omniroute{…, apiKeySet}, hermes}`. **Không bao giờ** có giá trị khoá. |
| `PUT /api/settings/ai` | Cập nhật từng phần, trả lại bản mới như GET. |
| `POST /api/settings/ai/test` | `{target: ollama\|omniroute\|llm, overrides?{baseUrl,model,apiKey}}` → `{ok, latencyMs, message, errorCode?, requestId?, models?, sample?}` |
| `GET /api/settings/ai/models?source=ollama\|omniroute` | `{models:[{id, label?, supportsTools?, thinking?}]}` |
| `GET /api/settings/ai/status` | `{ollama, omniroute, llm, hermes}`, mỗi cái `{state: up\|degraded\|down\|unknown, latencyMs?, checkedAt, detail?}` |

Graphify không có API (client-only).

### Chỗ khác/thêm so với bản đề xuất đầu tiên (BE cần làm theo)

1. **`authEnabled?: boolean`** ở GET: thiếu hoặc `false` thì FE hiện dòng "Chưa có đăng nhập: chỉ dùng trong mạng LAN tin cậy".
2. **`requestId?`** trong kết quả `/test` (để tra log khi thử lỗi).
3. **`modelAliases` thay thế toàn bộ**: khi bảng định tuyến đổi, FE gửi cả object (xoá một alias = không gửi khoá đó). Các nhóm khác (`llm`, `ollama`, `omniroute`) cập nhật từng trường.
4. **Bật/tắt OmniRoute** gửi **cùng lúc** `llm.viaOmniroute` và `omniroute.enabled` (cùng giá trị).
5. **Khoá API ghi một chiều**: `omniroute.apiKey` / `llm.apiKey` = chuỗi (đặt/đổi), `null` (xoá), vắng mặt (giữ nguyên). Khoá được gửi **riêng** (không chung với các trường khác).
6. **`/test` với `target=llm` nhận `overrides.model`** (để thử qua một combo cụ thể). Không có `overrides` thì thử đúng cấu hình đã lưu. FE **không gửi `overrides` khi `source=env`**, và hiện chưa gửi `overrides.apiKey`.
7. PUT khi `source=env` phải trả 409 `SETTINGS_READ_ONLY`.

## Việc BE cần làm để màn này chạy thật

1. Thêm 5 endpoint ở trên theo hợp đồng.
2. Quyết định nơi lưu cấu hình. Làm trước **bản chỉ đọc** (`source=env`: hiển thị cấu hình đang chạy + nút thử, sửa vẫn ở `.env`) vì đơn giản và an toàn nhất. Bản sửa được (`source=database`) cần lưu khoá mã hoá (AES-GCM, như `Secret`) và quyết định áp dụng nóng hay khởi động lại (`applyMode`).
3. **Chặn SSRF ở BE** với `baseUrl` và `overrides` của `/test`: chỉ cho địa chỉ trong danh sách tin cậy (LAN của bạn), không cho tới `169.254.169.254`. FE chỉ cảnh báo (http/https, không `user:pass@`, địa chỉ ngoài LAN), không phải hàng rào.
4. **Xác thực chủ** cho nhóm `/api/settings/**` (đổi đường đi của AI và khoá bí mật).
5. **Chi phí qua OmniRoute**: nếu muốn ngân sách chặn được khoản cloud, BE phải đọc usage từ OmniRoute hoặc đặt giá theo từng combo. Chưa làm thì cảnh báo ở tab OmniRoute vẫn là sự thật.

## Hermes: cấu hình và đồng bộ bot (tab Hermes)

Tab này **không có mock** cho phần đồng bộ: cần BE thật (`VITE_USE_MOCK=false`). Khi chạy mock, khung "Bot trên Hermes" báo lỗi kết nối. Phần cấu hình dùng chung `GET/PUT /settings/ai` nên mock vẫn sửa thử được.

Mục đích: VPS chạy Hermes bị reset thì nhập lại địa chỉ/token và đồng bộ lại bot ngay trên giao diện, không phải sửa tệp trên máy chủ.

### Cấu hình (mở rộng `/settings/ai`)
- `PUT /api/settings/ai` nhận thêm `hermes: {enabled?, planner?: "hermes"|"llm", baseUrl?, adminToken?}`. `adminToken` ghi một chiều (chuỗi = đặt/đổi, `null` = xoá, vắng mặt = giữ nguyên). `GET` chỉ trả `hermes.adminConfigured` (đã đặt token chưa), **không bao giờ** trả token.
- `POST /api/settings/ai/test` nhận thêm `target: "hermes"` (có thể kèm `overrides.baseUrl`).
- Đổi địa chỉ Hermes và đổi `planner` có hộp xác nhận ở FE. `source=env` thì các ô bị khoá (nút Thử và đồng bộ vẫn dùng được).

### Đồng bộ bot (endpoint mới)
| Endpoint | Trả về |
|---|---|
| `GET /api/hermes/status` | `{reachable, checkedAt, detail?, agentsInOffice, botsInHermes (null nếu không biết), synced, missing, orphans}`. `missing` = agent chưa có bot sống trong Hermes; `orphans` = bot trong Hermes không còn agent. |
| `GET /api/hermes/agents` | `[{agentId, name, hermesBotId \| null, syncState: SYNCED\|NOT_SYNCED\|MISSING\|ERROR, error?, lastSyncedAt?}]`. `NOT_SYNCED` = chưa từng tạo bot; `MISSING` = DB còn `hermesBotId` nhưng Hermes không có (điển hình sau reset). |
| `POST /api/hermes/sync-all` | `{created, updated, failed: [{agentId, error}]}`. Tạo bot thiếu, cập nhật bot lệch; **không xoá bot thừa**. |
| `POST /api/agents/{id}/hermes/sync` | một dòng như `GET /hermes/agents` |
| `POST /api/agents/{id}/hermes/restart` | một dòng như trên |

Banner trong tab: không kết nối được → lỗi; `botsInHermes = 0` mà có agent → "Hermes chưa có bot nào (VPS vừa reset?)"; còn thiếu/thừa → "Hermes lệch với AgentOffice: …".

### Việc BE cần làm (Hermes)
1. Lưu cấu hình Hermes (địa chỉ, planner, bật/tắt, token admin **mã hoá**) trong DB thay vì chỉ `.env`, và để DB nằm ở volume/backup bền. Nếu không, VPS reset là mất cả cấu hình lẫn danh sách agent.
2. Thêm cột `hermesBotId` và trạng thái đồng bộ theo agent; AgentOffice là nguồn sự thật, Hermes chỉ là bản sao.
3. Hermes lỗi thì tạo/sửa agent vẫn thành công, agent được đánh dấu `ERROR`/`NOT_SYNCED` để đồng bộ sau.
4. Token admin Hermes chỉ ở BE. Xác thực chủ cho các endpoint này (tạo tiến trình bên ngoài) và giới hạn số bot.
5. Hợp đồng trên là đề xuất. FE parse bằng zod (`src/types/hermes.ts`): lệch thì chỉ sửa file đó.

Hạn chế hiện tại: banner lệch/chưa có bot chỉ hiện trong tab Hermes (không có ở đầu trang hay thẻ Tổng quan), và `agentId` BE trả số hay chuỗi đều được.

## Hành vi cần biết

- **Nháp chung** cho mọi tab, một thanh Lưu: hiện "N thay đổi chưa lưu", chỉ gửi trường đã đổi, khoá khi form có lỗi hoặc đang lưu (chặn bấm đúp). Hộp xác nhận khi đổi chế độ giả⇄thật, đổi địa chỉ Ollama/OmniRoute, xoá khoá.
- **Cảnh báo rời trang** chỉ có khi đóng tab/F5 (`beforeunload`). App dùng `<Routes>` (không phải data router) nên không chặn được bấm link nội bộ sang trang khác; chỉnh sửa chưa lưu sẽ mất.
- **Khoá API không bao giờ** nằm trong nháp, query key, URL, storage, console hay thông báo lỗi. Ô nhập bị xoá ngay khi bấm gửi; gửi lỗi thì phải nhập lại. `http.ts` không in nguyên response sai định dạng của `/settings/ai` ra console.
- `source=env`: mọi ô khoá, thanh Lưu ẩn; nút Thử vẫn dùng được.
- Cảnh báo chi phí OmniRoute hiện cố định (không có nút đóng) khi đang dùng OmniRoute (kể cả khi vừa bật trong nháp).
- Tab Graphify chỉ tạo lệnh, **không chạy gì và không ghi file**. `localStorage` chỉ lưu id các ô đã tick của checklist.
- Thẻ Hermes ở Tổng quan có nút dẫn tới tab Hermes.

## Kiểm thử

- `npm test` (`node --test`): schema zod (khoá lạ bị bỏ, sai định dạng bị từ chối), kiểm tra địa chỉ, nháp/diff/patch/xác nhận, bảng alias, bộ tạo lệnh Graphify (kể cả chặn ký tự nguy hiểm trong địa chỉ), kiểm tra tĩnh bí mật (không `console`/`sessionStorage`/`indexedDB`, query key sạch, khoá không vào `draft.ts`).
- `npm run e2e:settings-ai`: chạy thật bằng Chrome headless (cần `google-chrome` và dev server đang chạy với mock; đặt `E2E_URL` nếu khác `http://localhost:5173/settings/ai`). Kiểm: luồng khoá API (ô bị xoá ngay, khoá không ở DOM/storage/URL/console), cảnh báo chi phí không đóng được, nháp/lưu/xác nhận, `source=env`, thử kết nối (lỗi, huỷ, kết quả cũ không hiện muộn), bảng alias, phím mũi tên giữa các tab, dữ liệu sai định dạng, Graphify.
- **Chưa kiểm** (không có công cụ trong dự án): quét truy cập tự động bằng axe; test render từng component bằng jsdom; ô khoá nằm trong mutation cache của TanStack (đã giảm bằng `gcTime: 0` + `reset()`, chưa có test); chặn bấm đúp khi lưu và cảnh báo `beforeunload` (có trong code, chưa có test); bố cục dưới 768px (chỉ viết CSS, chưa xem trên màn hình thật); giao diện chưa được nhìn bằng mắt trên trình duyệt.

## Tệp

`src/types/settingsAi.ts` (schema) · `src/api/settingsAi.ts` · `src/mocks/settingsAi.ts` · `src/pages/SettingsAiPage.tsx` · `src/features/settingsAi/` (tab, nháp `draft.ts`/`useDraft.ts`, `validate.ts`, `graphify.ts`, `useTester.ts`, `KeyField.tsx`, …) · `tools/settings-ai-e2e.mjs`.

# Tài nguyên hình ảnh (sprite)

Góc nhìn 2D chéo từ trên xuống (3/4 top-down). Ô logic 32 px. Chưa có tài nguyên thật thì app chạy bằng **hình tạm vẽ bằng code**
(`src/features/sprites/procedural*.ts`); thêm atlas thật thì thay đúng phần có atlas, phần thiếu tự lùi về hình tạm.

## 1. Cấu trúc thư mục `public/assets/`
```
manifest.json          khai báo mọi thứ (kiểm bằng zod: src/features/sprites/manifest.ts)
LICENSES.md            giấy phép từng gói
sprites/characters/    {lớp}_{kiểu}.json + .png   (atlas nhân vật)
sprites/props/         atlas đồ vật
sprites/tiles/         atlas ô sàn, mảnh tường, khung cửa
sprites/emotes/        (dự phòng)
audio/                 (tuỳ chọn, chưa dùng)
```
Mọi tệp trong thư mục này (trừ `manifest.json`, `LICENSES.md`, `audio/`) phải được manifest dùng tới, nếu không `assets:check` báo "tệp thừa".

## 2. `manifest.json`
| Trường | Ý nghĩa |
|---|---|
| `version` | số nguyên |
| `tileSize` | 32 |
| `assetScale` | `1` = tài nguyên 32 px; `2` = gói 16 px, phóng gấp đôi khi vẽ |
| `pixelArt` | `true` = texture `nearest` (không làm mờ); `false` = `linear` |
| `packs[]` | `{id, name, author, sourceUrl, license, attributionRequired, notes}`. **`license` bắt buộc** |
| `characterLayers[]` | `{id, kind: body\|hair\|outfit\|accessory, style, atlas, tintable, order, pack, prebuilt?}` |
| `props[]` | `{catalogKey, atlas, frame \| animation \| states{state: tên}, anchor=[0,1], offsetPx=[0,0]}` |
| `tiles[]` | `{pattern, atlas, frame?, tintable=true}` (sàn, tường, cửa) |
| `emotes`, `carryOffsets` | dự phòng (schema đã có, chưa dùng) |
| `animations` | số khung và fps mong đợi của từng hoạt ảnh; mặc định lấy từ `config.ts` |

`order` gợi ý: body 0, outfit 10, hair 20, accessory 30. Hình tạm dùng cùng thang này nên xen kẽ đúng với lớp thật.

## 3. Nhân vật
- Khung **32×48** (gói 16 px: 16×24), cùng kích thước trong cả atlas. Anchor `(0.5, 1)` = giữa đáy khung (chân).
- Vẽ **3 hướng**: `down`, `up`, `right`. Hướng trái là bản **lật ngang** của `right` (không vẽ riêng; `assets:check` báo lỗi nếu có).
- Tên khung: `{anim}_{dir}_{index}` (vd `sit_type_down_0`). Atlas phải có khoá `animations` với mỗi `{anim}_{dir}` là danh sách khung theo thứ tự.
- Hoạt ảnh (số khung / fps) — nguồn: `src/features/sprites/config.ts`:

| Mức | Hoạt ảnh |
|---|---|
| A (bắt buộc) | `sit_idle` 2/2, `sit_type` 4/8, `sit_hand` 2/3, `sit_sleep` 2/1, `stand` 1/1, `walk` 4/8 |
| B (tuỳ chọn) | `sit_error` 2/4, `sit_think` 2/2, `talk` 2/4, `drink` 2/2 |

Mức B không có thì lùi về mức A gần nhất: `sit_error`→`sit_hand` (kèm biểu tượng đỏ), `sit_think`→`sit_idle`, `talk`/`drink`→`stand`.
Một hoạt ảnh **thiếu khung** (ít hơn số dự kiến) bị coi là chưa có và lùi về hình tạm, không chạy cụt.
- **Lớp tintable** được nhân màu theo `Agent.avatar` (body = màu da, hair = màu tóc, outfit = màu áo): vẽ lớp bằng sắc trắng/xám.
- **Thay từng lớp:** có atlas cho loại lớp nào thì loại đó dùng atlas; loại còn lại giữ hình tạm. Muốn dùng **avatar dựng sẵn** (một lớp đã gồm cả quần áo/tóc) thì đặt `"prebuilt": true` để không chồng hình tạm lên.

## 4. Đồ vật, sàn, tường, cửa
- **Đồ vật:** khai theo `catalogKey` (xem `src/features/sprites/catalog.ts`). Ảnh vẽ **lên phía trên** đáy footprint, anchor mặc định `(0,1)` = góc dưới-trái của footprint. `states` ánh xạ trạng thái → tên khung/hoạt ảnh (vd `monitor`: `off|idle|working|error`; `server_rack`: `default|busy|alert|off`).
- **Ô sàn:** pattern `wood`, `carpet`, `tile`, `checker`, `plain` (32×32, xám sáng để tint theo màu phòng).
- **Tường (autotile):** pattern `wall_{mask}` (tường cao) và `wall_low_{mask}` (tường phía nam, thấp); `mask` = N=1, E=2, S=4, W=8 cộng lại (0–15) theo các ô tường lân cận. Texture rộng 32, cao 32 + mặt đứng (cao: +40, thấp: +10), **đáy texture = đáy ô**. Cánh bắc do ô phía bắc vẽ (cánh nam của nó).
- **Cửa:** `door_h`, `door_h_low`, `door_v`, `door_v_low` (cùng cách đặt như tường).
- Tường, cửa, sàn tint theo màu tường/sàn của phòng, nên vẽ sắc sáng trung tính.

## 5. Thêm một gói mới
1. Đặt tệp vào `public/assets/sprites/...` (atlas `.json` + `.png`, mỗi cạnh ≤ 2048).
2. Khai `packs[]` (đủ `license`), rồi `characterLayers[]` / `props[]` / `tiles[]` trong `manifest.json`.
3. Ghi giấy phép vào `LICENSES.md`.
4. `npm run assets:check` đến khi hết lỗi.
5. Mở `/dev/sprites` xem từng hoạt ảnh 4 hướng, lưới, anchor, footprint; mục "Khung thiếu → hình tạm" liệt kê chỗ còn dùng hình tạm.
6. Mở `/floor/tang-1` xem trong cảnh thật; `/credits` phải liệt kê gói.

## 6. Xuất từ Aseprite
1. Đặt mỗi hoạt ảnh thành một **tag** tên `{anim}_{dir}` (vd `walk_down`, `sit_type_up`), đúng số khung.
2. *File → Export Sprite Sheet*: layout tuỳ ý, bật **JSON Data** và **Meta: Tags** (cả định dạng mảng lẫn hash đều được), ghi ra `.png` + `.json`.
3. `npm run assets:aseprite -- ten.json atlas.json [ten-anh.png]` → atlas PixiJS có khoá `animations`, khung đặt tên `{tag}_{index}`.
   Tag reverse/pingpong được mở ra thành chuỗi khung tương ứng. Khung không thuộc tag nào bị bỏ (có cảnh báo).
4. Chép atlas + png vào `sprites/characters/`, khai trong manifest, chạy `assets:check`.

## 7. `npm run assets:check`
Thoát mã 1 nếu có lỗi (dùng được trong CI). Kiểm tra: (a) đủ khung hoạt ảnh mức A theo từng hướng (mức B có thì phải đủ), (b) mọi khung đúng 32×48 (hoặc 16×24 khi `assetScale` 2), (c) tên khung và khoá `animations`, (d) atlas ≤ 2048×2048 và `meta.size` khớp ảnh thật, (e) mỗi gói có giấy phép, (f) không có tệp thừa; cộng thêm: khung của prop/tile/emote có thật trong atlas. Cảnh báo (không làm hỏng build): manifest chưa có atlas nào.

## 8. Gói mẫu để thử đường nạp
`npm run assets:sample -- <thư-mục>` sinh một gói pixel-art khối (CC0, do dự án tự tạo) đi qua đúng quy trình Aseprite JSON → `aseprite-to-pixi` → atlas. Tuỳ chọn: `--scale 2` (gói 16 px), `--drop walk_up_2` (bỏ một khung để thử chế độ lùi về hình tạm).
Để xem trong app: sinh vào `public/assets`, mở `/dev/sprites` và `/floor/tang-1`, rồi khôi phục `manifest.json` rỗng (`git checkout public/assets` hoặc xoá thư mục sinh ra).

## 9. Giấy phép
Mỗi gói phải ghi giấy phép và nguồn. Gói yêu cầu ghi công thì đặt `attributionRequired: true`; trang `/credits` tự sinh danh sách từ manifest.
Không tải sprite lạ lên từ giao diện; tài nguyên chỉ vào qua thư mục `public/assets` và manifest.

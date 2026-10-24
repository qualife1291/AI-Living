# Hợp đồng API (API Contract) — Xóm AI

Tất cả các phản hồi JSON từ máy chủ đều đính kèm header `Cache-Control: private, no-store` và `X-Content-Type-Options: nosniff`.

---

## 1. `GET /api/world` — Đọc trạng thái thế giới, đồng hồ và bối cảnh

Trả về snapshot hiện tại của khu phố, đồng hồ thế giới, thời tiết tất định, 2 bối cảnh đa chiều đang kích hoạt và tối đa 80 sự kiện gần nhất.

- **Phản hồi `200 OK`:**
```json
{
  "revision": 1,
  "serverNow": "2026-10-24T16:00:00.000Z",
  "world": {
    "born": "2026-10-24T00:00:00.000Z",
    "paused": false,
    "schedule": "08:00, 14:00, 20:00 (Asia/Ho_Chi_Minh)",
    "weather": "Nắng nhẹ",
    "lastAI": "2026-10-24T14:00:00.000Z",
    "people": [],
    "relationships": [],
    "commitments": []
  },
  "worldTime": {
    "simMs": 57600000,
    "dayIndex": 0,
    "hour": 23.0,
    "phase": "night",
    "phaseLabel": "Ban đêm",
    "daylight": 0.08,
    "season": "rainy",
    "seasonLabel": "Mùa mưa TP.HCM"
  },
  "weatherState": {
    "kind": "clear",
    "label": "Nắng nhẹ",
    "intensity": 0.52,
    "tempC": 25
  },
  "activeContexts": [],
  "events": []
}
```
- **Ghi chú kỹ thuật (Đã sửa L5 & L7):** Chỉ khởi tạo dòng `'home'` khi DB hoàn toàn trống và trả thêm `serverNow` để trình duyệt đồng bộ độ lệch đồng hồ (`clockOffsetMs`).

---

## 2. `POST /api/world` — Điều khiển tạm nghỉ, lịch, tốc độ và ghi đè thời tiết

Cập nhật trạng thái điều hành của thế giới với khóa lạc quan (`revision`).

- **Body đầu vào:**
```json
{
  "revision": 1,
  "paused": true,
  "schedule": "08:00, 14:00, 20:00 giờ Việt Nam",
  "speedScale": 1,
  "weatherOverride": "rain"
}
```
- **Mã trạng thái:**
  - `200 { "ok": true }`: Cập nhật thành công, `revision` tăng thêm `+1`.
  - `400`: JSON không hợp lệ hoặc thiếu trường thao tác (`paused`, `schedule`, `speedScale`, `weatherOverride`).
  - `403`: Header `Origin` có mặt nhưng khác origin của request.
  - `409`: `revision` không khớp với trạng thái hiện hành hoặc xung đột cập nhật đồng thời.

---

## 3. `POST /api/events` — Ghi sự kiện sinh hoạt mới (Idempotent & Transactional)

Xác thực sự kiện bằng `eventSchema` (`lib/event-schema.ts`), tính vị trí nối tiếp không nhảy (`lib/apply-event.ts`), và ghi đồng thời vào `episodes` + `worlds` bằng D1 batch có bảo vệ revision.

- **Body đầu vào:** Theo `EventInput` (xem chi tiết tại [DATA_MODEL.md](DATA_MODEL.md)).
- **Mã trạng thái:**
  - `200 { "ok": true, "id": "...", "revision": 2 }`: Ghi thành công.
  - `200 { "ok": true, "duplicate": true, "id": "..." }`: Sự kiện trùng `id` đã tồn tại (an toàn khi retry, kể cả khi hai request đến đồng thời — đã sửa **L3**).
  - `400 { "error": "Sự kiện không đúng cấu trúc", "issues": [{ "path": "...", "message": "..." }] }`: Sai schema Zod, nhân vật lặp trong `changes`, tiền sau thay đổi `< 0`, hoặc cặp quan hệ không tồn tại.
  - `403`: `Origin` không hợp lệ.
  - `409`: Thế giới đang tạm nghỉ (`paused = true`) hoặc `revision` cũ.
  - `413`: Độ dài byte UTF-8 thực tế của body vượt quá `20.000` byte (đã sửa **L4**).

---

## 4. `GET /api/instructions` — Hướng dẫn cho tác nhân AI

- `GET /api/instructions`: Trả về `text/plain; charset=utf-8` gồm hướng dẫn cơ bản và quy tắc sinh hoạt mở rộng.
- `GET /api/instructions?context=1`: Đính kèm thêm khối **Tổng hợp Bối cảnh Đa chiều (`synthesizeContextPrompt`)** tương ứng với giờ mô phỏng, thời tiết, trạng thái cư dân và mẫu Golden Episode hiện tại.

---

## 5. `GET /api/health` — Kiểm tra sức khỏe vận hành & Lượt chạy gần nhất

Trả về trạng thái vận hành gọn nhẹ gồm `serverNow`, `revision`, `paused`, `lastAI`, `episodeCountRecent`, `worldTime`, `weather` và bản ghi gần nhất từ bảng `tick_runs` (nếu đã chạy migration `0001`).

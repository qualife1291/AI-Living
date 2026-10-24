# Sổ tay Xử lý Sự cố & Vận hành An toàn (`RUNBOOK.md`)

---

## 1. Kiểm tra nhanh tình trạng hệ thống (`Health Check`)

- Gọi `GET /api/health` để kiểm tra:
  - `ok: true`, `revision` hiện tại, trạng thái `paused`, thời điểm `lastAI`.
  - Thông tin `worldTime` (pha ngày/đêm, giờ mô phỏng) và `weather` hiện hành.
  - Bản ghi `lastTick` từ bảng `tick_runs` (nếu đã áp dụng migration `0001`).

---

## 2. Xử lý khi gặp lỗi `409 Conflict` (`Revision conflict` hoặc `Xóm đang tạm nghỉ`)

1. **Nguyên nhân:**
   - Thế giới đang ở trạng thái `paused = true`.
   - Hoặc có một lượt ghi khác vừa tăng `revision` sau khi tác nhân đọc `GET /api/world`.
2. **Cách xử lý chuẩn:**
   - Đọc lại `GET /api/world`.
   - Nếu `world.paused === true`: **dừng ngay lượt chạy**, không tự ý bật lại nếu chủ dự án không yêu cầu.
   - Nếu `world.paused === false` và `revision` đã tăng: kiểm tra xem `events[0].id` có trùng với sự kiện vừa định ghi không. Nếu chưa có, cập nhật `revision` mới và điều chỉnh lại thay đổi theo trạng thái mới (thử lại tối đa 1 lần).

---

## 3. Quy trình Sao lưu (Backup) trước khi bảo trì Database

Nút **Tải dữ liệu** trên giao diện chỉ tải snapshot kèm 80 sự kiện gần nhất. Trước mọi thao tác sửa chữa dữ liệu hoặc chạy migration mới trên môi trường thật:

```bash
# Xuất toàn bộ cơ sở dữ liệu D1 local ra file SQL sao lưu
mkdir -p backups
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 export DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --output backups/xom-ai-backup-$(date +%Y%m%d-%H%M%S).sql
```

---

## 4. Quy trình dọn bản ghi test trùng lặp (`-stale`) có kiểm soát

Theo `MEMORY_SHORT.md`, nếu trên môi trường live còn tồn tại bản ghi test cũ có hậu tố `-stale`:
1. **Bước 1 — Đọc & Sao lưu:** Lưu toàn bộ kết quả `GET /api/world` ra tệp JSON lưu trữ.
2. **Bước 2 — Đối chiếu (`Dry-run`):** Kiểm tra xem bản ghi `-stale` đã cộng nhầm bao nhiêu `moneyDelta`, `energyDelta`, `hungerDelta`, `skillDelta`, câu `memory` nào bị nhân đôi trong `person.memories` và `relationship.trust` nào bị cộng lặp.
3. **Bước 3 — Sửa có kiểm tra `revision`:** Thực hiện câu lệnh cập nhật trong một giao dịch có điều kiện `WHERE id = 'home' AND revision = <expected_revision>` để loại bỏ đúng phần dư và xóa dòng episode `-stale` tương ứng. Tuyệt đối không xóa toàn bộ bảng hay reset thế giới.

---

## 5. Áp dụng Migration `0001_living_world_and_training.sql`

Migration `0001` sử dụng `CREATE TABLE IF NOT EXISTS` và `CREATE INDEX IF NOT EXISTS`, hoàn toàn không sửa bảng cũ:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_living_world_and_training.sql
```

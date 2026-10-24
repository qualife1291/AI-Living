# ADR-0001: Kết hợp Event Sourcing (`episodes`) và Snapshot (`worlds`)

- **Trạng thái:** Đã chấp nhận (Cập nhật sửa lỗi L2 ngày 24/10/2026)
- **Bối cảnh:** Xóm AI cần đọc trạng thái hiện tại nhanh trên mỗi lượt mở trang, nhưng đồng thời phải giữ lại lịch sử đầy đủ để kiểm toán, hiển thị nhật ký và phát lại (replay).
- **Quyết định:**
  1. Bảng `episodes` lưu toàn bộ sự kiện đã xác thực (bao gồm cả `relationship`, `contextId`, `revisionBefore`, `revisionAfter` — sửa lỗi L2).
  2. Bảng `worlds` lưu snapshot trạng thái hiện tại tại hàng `id = 'home'` kèm khóa lạc quan `revision`.
  3. Mọi lượt ghi mới thực hiện trong một giao dịch `db.batch` cập nhật đồng thời `episodes` và `worlds` dưới cùng điều kiện `revision`.
- **Hệ quả:** Đọc `GET /api/world` chỉ tốn 1 truy vấn snapshot + 1 truy vấn 80 sự kiện gần nhất, đồng thời lịch sử trong `episodes` đủ thông tin để dựng lại đồ thị quan hệ theo thời gian.

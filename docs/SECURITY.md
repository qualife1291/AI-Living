# Chính sách Bảo mật & Toàn vẹn Dữ liệu (`SECURITY.md`)

---

## 1. Mô hình Truy cập & Xác thực

- **Chế độ hiện hành (`owner-private`):** Toàn bộ ứng dụng được bảo vệ bởi lớp xác thực chủ sở hữu của nền tảng hosting (Sites dispatch). Không thay đổi `audience` sang công khai khi chưa có quyết định của chủ dự án và lớp kiểm soát quyền truy cập ở tầng máy chủ (xem [DESIGN_PROPOSALS.md](DESIGN_PROPOSALS.md) §8).
- **Chống CSRF trên trình duyệt (`validOrigin`):** Các route ghi (`POST /api/world`, `POST /api/events`) kiểm tra header `Origin` khớp với origin của URL request.
- **Bảo vệ chống Sniffing & Caching:** Mọi phản hồi JSON từ API đều đặt `Cache-Control: private, no-store` và `X-Content-Type-Options: nosniff`.

---

## 2. Kiểm soát Đầu vào & Chống Quá tải Payload

- **Kiểm tra kích thước thực tế (Đã sửa L4):** `POST /api/events` kiểm tra cả header `content-length` lẫn độ dài byte UTF-8 thực tế của chuỗi `await req.text()` (`<= 20.000` byte), ngăn chặn việc lách qua `content-length` bằng `Transfer-Encoding: chunked`.
- **Xác thực Schema Nghiêm ngặt (`lib/event-schema.ts`):**
  - Giới hạn độ dài mọi chuỗi (`title <= 120`, `summary <= 800`, `dialogue.text <= 300`, `memory <= 240`, `relationship.note <= 200`).
  - Chỉ chấp nhận đúng 3 mã nhân vật (`an`, `binh`, `chi`) và 12 địa điểm hợp lệ trong khu phố.
  - Phản hồi lỗi `400` chỉ trả về `path` và `message` của Zod, không phản chiếu (echo) dữ liệu đầu vào chưa tin cậy.

---

## 3. Chống Prompt Injection Nội bộ qua Ký ức

Vì trường `memory` và `dialogue` từ lượt AI trước sẽ được đọc lại vào prompt của lượt AI sau:
- Độ dài mỗi `memory` bị khóa cứng ở mức tối đa `240` ký tự và tối đa `60` mục gần nhất trong snapshot.
- Khi mở rộng tính năng nhận gợi ý từ bên ngoài, mọi dữ liệu văn bản từ người dùng phải được bọc trong thẻ ngữ cảnh dữ liệu thuần và kiểm tra qua `evaluateCandidateEvent()` (`lib/training.ts`) trước khi lưu.

---

## 4. Quản lý Bí mật & Đóng gói Bàn giao

- **Không lưu khóa bí mật trong mã nguồn:** Tuyệt đối không đưa `.env`, `.dev.vars`, token `OAI-Sites-Authorization`, `art_v2_...` hoặc `sk-proj-...` vào mã nguồn, nhật ký hay gói ZIP.
- **Quét tự động khi đóng gói (`scripts/package-handoff.py`):** Script đóng gói tự động quét biểu thức chính quy trên từng tệp và dừng ngay lập tức nếu phát hiện mẫu chuỗi giống khóa bí mật.

# ADR-0008: Giữ chế độ `owner-private` và kiến trúc phân quyền Viewer vs Admin

- **Trạng thái:** Đã chấp nhận (24/10/2026)
- **Bối cảnh:** Chủ dự án yêu cầu giữ website ở chế độ riêng tư (`owner-private`), đồng thời muốn có thiết kế sẵn sàng nếu sau này mở cho người xem (Viewer) hoặc chuyển lên tài khoản Cloudflare riêng.
- **Quyết định:**
  1. Giữ nguyên chế độ `owner-private` trên Sites theo đúng quy tắc trong `AGENTS.md`.
  2. Ghi rõ kiến trúc tách quyền Viewer (chỉ đọc `GET /api/world`, điều khiển camera/âm thanh cục bộ) và Admin/Agent (có quyền `POST /api/world`, `POST /api/events`) trong [DESIGN_PROPOSALS.md](../DESIGN_PROPOSALS.md) §8 và [SECURITY.md](../SECURITY.md).
- **Hệ quả:** Đảm bảo an toàn tuyệt đối ở hiện tại và có bản thiết kế rõ ràng khi chủ dự án quyết định mở rộng đối tượng người xem.

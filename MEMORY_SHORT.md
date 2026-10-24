# Bộ nhớ ngắn hạn

Đọc [docs/CLOUD_REVIEW.md](docs/CLOUD_REVIEW.md) để phân biệt kết quả đã kiểm chứng trên Codex Cloud và tài liệu bàn giao lịch sử.

## Việc tiếp theo
- Sinh thái: động vật phản ứng mưa/ngày đêm và cây trồng tiến triển, giữ liên tục đường đi.
- Nối sự kiện vào structured memories/commitments/nudges bằng giao dịch nguyên tử, thêm kiểm thử witness-bound retrieval.
- Lượt AI server và tick audit; chuẩn hóa idempotency khi revision thay đổi đồng thời.
- Phân biệt health missing-migration/lỗi DB với chưa có tick.
- Production: xác minh automation hiện có, backup D1 thật rồi kiểm tra migration/bản ghi `-stale`. Không dùng dữ liệu seed/local để suy luận live.

## Blocker
- Phiên hiện tại không có công cụ Sites/automations; chưa xác minh production hoặc lịch AI.
- Cấu hình cloud đã lưu draft; cần người dùng review/save và Publish trong Environment settings để task mới dùng snapshot.

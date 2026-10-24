# Bộ nhớ ngắn hạn

## Context mới
- Phát triển theo phase trong ROADMAP.md; mỗi đợt test giao diện gửi ảnh thực tế trực tiếp cho người dùng.
- Toàn bộ miễn phí; xuất video tạm hoãn; web owner-private.

## Việc chưa xong
- Phase 2: Sites create_schedule trả invalid_project hai lần, chưa bật lịch. Request ID đã thử: 2026-10-24:03897a510e1348161cf32711ddca5134. Không tạo schedule trùng; kiểm tra automations trước mọi retry.
- Hoàn tất xác minh kết quả scripts/verify-live.py; test đọc/ghi live chậm. Không tự tuyên bố pass nếu chưa có kết quả.
- Dọn bản ghi test id ai-first-20261024-stale nếu còn; test revision sai ban đầu đã tạo lặp nội dung. Đối chiếu snapshot và ký ức trước khi sửa.
- Phase 3: QA mobile thật; kiểm tra nhiều lượt AI nối tiếp, tăng độ tương phản nếu cần.

## Đã xong (tham chiếu dài hạn)
Xem MEMORY_LONG.md cho URL, stack, test standards, deploy, theme và giới hạn. Xóa các việc trên khi hoàn thành; xóa file khi không còn việc.

## Phase hình ảnh hiện tại
- Robot SVG và khu phố mở rộng đã xong, TypeScript/build và browser QA đã qua. Ảnh đã gửi.
- Đang lưu nguồn và deploy. Sau đó tiếp tục phase tự động; không bỏ các blockers ghi phía trên.

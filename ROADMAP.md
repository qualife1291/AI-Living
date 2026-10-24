# Roadmap và trạng thái bàn giao

## Phase 1 — Nền tảng và hình ảnh (đã xuất bản)
- Owner-private web, D1 snapshots/events, hồ sơ, ký ức, quan hệ, journal, pause/export.
- Ba robot SVG, khu phố rộng, các địa điểm, district views và zoom.
- Build, TypeScript và desktop navigation QA đã qua; ảnh đã gửi.

## Phase 2 — AI tiếp nối (cấu hình đã có, cần xác minh)
- Một scene AI đã ghi/readback qua service access.
- ChatGPT automation độc lập enabled, 08:00/14:00/20:00 giờ Việt Nam.
- Site-linked scheduler từng lỗi invalid_project; không tạo trùng. Chưa có scheduled result được xác minh.
- Bổ sung kế hoạch bước/hội thoại tự nhiên vào API và instructions trong mã mới.

## Phase 3 — Thế giới sinh động (đang bàn giao nguồn)
- Đã viết graph đường đi, interpolation, routines, AI plans, công việc theo nơi đến.
- Đã viết mèo/chó/sẻ theo tài liệu tập tính, follow camera, overlay đường đi và live board.
- Unit checks, TypeScript/build đã qua ở vòng phát triển; smoke UI nhìn thấy actors/animals và follow.
- Chưa publish lớp này; cần freeze/resume QA, continuity khi plan thay thế, mobile/performance và local API integration.

## Phase 4 — Planner và chiều sâu xã hội (chưa triển khai)
- Nhu cầu → mục tiêu → việc làm; ký ức liên quan; lời hứa và việc chưa xong.
- Gặp gỡ và lượt nói được kiểm tra tại server, hạn chế hội thoại lặp.
- Animal state/needs/quan hệ riêng lưu bền; chuyển động theo loài tốt hơn.
- Quan sát nhiều lượt, đánh giá mâu thuẫn và chi phí/quota.

## Phase 5 — Video và social (tạm hoãn theo yêu cầu)
- Chưa có video rendering, TTS hoặc auto-post.

## Quy trình
Mỗi phase có source, tài liệu, test evidence và ảnh UI; hoàn thiện phase hiện tại trước khi mở rộng. Không dùng mock/animation như bằng chứng inference liên tục. Handoff priority ở CODEX_HANDOFF.md.

# Bộ nhớ ngắn hạn

## Context mới
- Phát triển theo phase trong ROADMAP.md; mỗi đợt test giao diện gửi ảnh thực tế trực tiếp cho người dùng.
- Toàn bộ miễn phí; xuất video tạm hoãn; web owner-private.

## Việc chưa xong
- Phase 2: tác vụ ChatGPT độc lập đã tạo/bật (ID trong MEMORY_LONG.md). Cần xác minh kết quả lượt chạy đầu qua automations.peek; không tạo trùng dựa get_site.automations vì task độc lập không nằm ở đó.
- Hoàn tất xác minh kết quả scripts/verify-live.py; test đọc/ghi live chậm. Không tự tuyên bố pass nếu chưa có kết quả.
- Dọn bản ghi test id ai-first-20261024-stale nếu còn; test revision sai ban đầu đã tạo lặp nội dung. Đối chiếu snapshot và ký ức trước khi sửa.
- Phase 3: QA mobile thật; kiểm tra nhiều lượt AI nối tiếp, tăng độ tương phản nếu cần.

## Đã xong (tham chiếu dài hạn)
Xem MEMORY_LONG.md cho URL, stack, test standards, deploy, theme và giới hạn. Xóa các việc trên khi hoàn thành; xóa file khi không còn việc.



## Bàn giao sang Codex
- Đã hoàn tất cập nhật tài liệu và baseline checks cho bản ZIP; live stable không đổi.
- Đọc CODEX_HANDOFF.md để tiếp tục lớp sinh hoạt: chạy checks, QA motion/camera/pause, sửa plan transition, integration local, mobile.


## Bản v2 đang hoàn thiện
- Robot redesign/rig/Workshop, speech, môi trường và traffic đã hoàn tất vòng nguồn bàn giao; có browser evidence và ảnh cuối. Nguồn tham khảo trong docs/CHARACTER_DESIGN.md và docs/ANIMATION_SOURCES.md.
- Quan trọng: traffic chưa có collision avoidance với pedestrian. Camera-aware bubble offset đã có; cần thêm viewport QA.

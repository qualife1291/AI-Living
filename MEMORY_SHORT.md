# Bộ nhớ ngắn hạn (`MEMORY_SHORT.md`)

## Việc chưa xong (Ưu tiên tiếp theo khi mở trên môi trường có quyền deploy)
1. **Áp dụng migration `0001` và chạy thử local preview:** Chạy `drizzle/0001_living_world_and_training.sql` trên DB local, mở giao diện kiểm tra trực quan lớp phủ ánh sáng ngày/đêm, thời tiết và mục bối cảnh gợi ý trong tab Nhịp sống.
2. **Xác minh lượt chạy theo lịch (Scheduled Run):** Kiểm tra tác vụ ChatGPT độc lập (ID trong `MEMORY_LONG.md`) qua `automations.peek` hoặc kết nối Server Tick ghi vào bảng `tick_runs`.
3. **Sao lưu D1 đầy đủ trước khi dọn bản ghi `-stale`:** Thực hiện theo đúng quy trình trong [docs/RUNBOOK.md](docs/RUNBOOK.md) mục 3 & 4 trước khi xóa bản ghi test trùng lặp `ai-first-20261024-stale` trên production.
4. **Browser QA trên viewport di động thật (360–430 px):** Chụp ảnh thực tế gửi người dùng kèm nhãn `preview`/`production` theo quy tắc `AGENTS.md`.

## Blocker hiện hành
- Môi trường đóng gói gói bàn giao không kết nối trực tiếp vào production D1 và không tự publish lên Sites (tuân thủ `AGENTS.md`).

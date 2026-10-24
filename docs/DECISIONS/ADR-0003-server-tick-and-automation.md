# ADR-0003: Đường ghi sự kiện thống nhất (`lib/apply-event.ts`) cho Automation và Server Tick

- **Trạng thái:** Đã chấp nhận (24/10/2026)
- **Bối cảnh:** Dự án có thể nhận sự kiện từ tác vụ ChatGPT Automation bên ngoài hoặc từ Cron Trigger / Server Tick nội bộ trong tương lai. Nếu viết hai nhánh cập nhật riêng sẽ dễ lệch quy tắc kiểm tra.
- **Quyết định:**
  1. Tách toàn bộ logic kiểm tra điều kiện và biến đổi trạng thái thế giới sang hàm thuần `applyEventToWorld()` trong `lib/apply-event.ts`.
  2. Bổ sung bảng `tick_runs` (trong migration `0001`) và endpoint `GET /api/health` để theo dõi trạng thái vận hành thực tế.
- **Hệ quả:** Mọi nguồn sinh sự kiện đều đi qua cùng một bộ kiểm tra bất biến (tiền không âm, nhân vật không lặp, không ghi khi đang tạm nghỉ, kiểm tra đúng `revision`).

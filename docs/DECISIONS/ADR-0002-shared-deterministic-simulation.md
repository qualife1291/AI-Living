# ADR-0002: Dùng chung hàm mô phỏng tất định giữa Client và Server (`lib/life.ts` & `lib/clock.ts`)

- **Trạng thái:** Đã chấp nhận (Cập nhật sửa lỗi L1 ngày 24/10/2026)
- **Bối cảnh:** Trước đây chỉ trình duyệt gọi `actorsAt()` để vẽ vị trí nhân vật, còn server gán `plan.from = p.location` (vị trí tĩnh từ sự kiện trước), dẫn đến hiện tượng robot bị nhảy vị trí (teleport) khi có kế hoạch mới xen vào giữa routine (lỗi L1).
- **Quyết định:**
  1. Giữ `lib/life.ts` và `lib/clock.ts` là các hàm thuần tất định (Pure Deterministic Functions) không phụ thuộc DOM.
  2. Khi server xử lý sự kiện mới trong `lib/apply-event.ts`, server gọi `resolveTransitionOrigin(world, personId, nowMs)` (sử dụng chính `actorsAt`) để lấy điểm xuất phát sát nhất với vị trí mô phỏng hiện tại của robot.
- **Hệ quả:** Loại bỏ hoàn toàn hiện tượng nhảy vị trí khi chuyển tiếp từ routine sang kế hoạch AI mới, đồng thời mọi thiết bị nhìn thấy cùng một trạng thái khu phố.

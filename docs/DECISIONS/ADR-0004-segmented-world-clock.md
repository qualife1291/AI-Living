# ADR-0004: Đồng hồ thế giới phân đoạn (`lib/clock.ts`) và Thời tiết tất định

- **Trạng thái:** Đã chấp nhận (24/10/2026)
- **Bối cảnh:** Xóm AI cần có chu kỳ ánh sáng ngày/đêm (7 pha từ Bình minh đến Ban đêm) và thời tiết theo mùa TP.HCM (mùa mưa/mùa khô), đồng thời hỗ trợ tạm nghỉ (`paused`) hoặc tua nhanh (`scale`) mà không làm lệch vị trí.
- **Quyết định:**
  1. Xây dựng `lib/clock.ts` với cấu trúc `WorldTime`, `DayPhase`, `Season` và mảng neo phân đoạn `anchors: { realMs, simMs, scale }[]` (tương thích ngược hoàn toàn với `{ pausedAt, pausedMs }`).
  2. Dùng bộ sinh số giả ngẫu nhiên có hạt giống `mulberry32` + `hashSeed` trong `weatherAt(seed, worldTime)` để sinh thời tiết tất định mỗi khung 2 giờ.
  3. Trả `serverNow` trong `GET /api/world` để client tự bù độ lệch đồng hồ (`clockOffsetMs`).
- **Hệ quả:** Không cần ghi trạng thái thời tiết hay ánh sáng vào DB mỗi phút mà mọi trình duyệt vẫn hiển thị đồng nhất.

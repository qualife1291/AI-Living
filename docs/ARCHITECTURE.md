# Kiến trúc và Công nghệ (`ARCHITECTURE.md`)

> Xem thêm: [Hợp đồng API](API.md) · [Mô hình dữ liệu](DATA_MODEL.md) · [Từ điển thuật ngữ](GLOSSARY.md) · [Quyết định kiến trúc (ADR)](INDEX.md#mục-iv--hồ-sơ-quyết-định-kiến-trúc-docsdecisions)

---

## 1. Luồng tổng thể

1. **Trình duyệt (Client Projection):** Đọc `GET /api/world`, đồng bộ độ lệch thời gian qua `serverNow`, rồi dùng `lib/clock.ts` và `lib/life.ts` để nội suy vị trí, hoạt động, ánh sáng ngày/đêm, thời tiết và giao thông ở tốc độ ~13 khung hình/giây.
2. **Tác nhân AI / Lượt sinh hoạt (AI Turn):** Đọc `GET /api/instructions?context=1` và `GET /api/world` → nhận bối cảnh đa chiều đã tổng hợp (`lib/training.ts`) → tạo cảnh mới và tự kiểm tra qua `evaluateCandidateEvent()` → gửi `POST /api/events` → cập nhật nguyên tử vào `episodes` + `worlds` qua `lib/apply-event.ts`.

---

## 2. Stack thực tế

- **Ngôn ngữ & UI:** TypeScript 5.9.3 (`strict: true`), React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13, `lucide-react` 1.31.0.
- **Hạ tầng & CSDL:** Cloudflare Workers (`nodejs_compat`) qua Sites hosting; Cloudflare D1 (SQLite); Drizzle ORM 0.45.2 & `drizzle-kit` 0.31.10 cho schema và migration (`0000` và `0001`).
- **Xác thực dữ liệu:** Zod 3.25.76 (`lib/event-schema.ts`).
- **Đồ họa & Hoạt họa:** SVG + CSS `@keyframes` + `requestAnimationFrame`, tách lớp tĩnh `StaticScene` (`React.memo`) và lớp động.

---

## 3. Sơ đồ Module chính

| Đường dẫn | Vai trò |
|---|---|
| `app/page.tsx` | Giao diện điều hướng 4 tab (Ngắm xóm, Cư dân, Nhật ký, Nhịp sống), hiển thị rõ Snapshot vs Projection và thông tin bối cảnh/tự huấn luyện AI |
| `app/api/world/route.ts` | Đọc trạng thái thế giới kèm `serverNow`, `worldTime`, `weatherState`, `activeContexts`; cập nhật `paused`, `schedule`, `speedScale`, `weatherOverride` |
| `app/api/events/route.ts` | Kiểm tra kích thước byte UTF-8 thực tế (L4), xác thực `eventSchema`, gọi `applyEventToWorld()` (L1, L2) và xử lý race condition trùng `id` (L3) |
| `app/api/instructions/route.ts` | Trả hướng dẫn vận hành cho tác nhân AI, hỗ trợ `?context=1` đính kèm bối cảnh tổng hợp |
| `app/api/health/route.ts` | Kiểm tra sức khỏe hệ thống, đồng hồ thế giới và bản ghi `tick_runs` gần nhất |
| `components/world/CityMap.tsx` | Bản đồ khu phố tách `StaticScene` (`React.memo` — L6), lớp phủ ngày/đêm & mưa rào, `<svg role="group">` (L9), follow camera và bảng nhịp sống |
| `components/world/Robot.tsx` & `RobotWorkshop.tsx` | Hệ thống khớp xương (rig) SVG cho An, Bình, Chi và xưởng xem trước chuyển động |
| `lib/clock.ts` | Đồng hồ thế giới phân đoạn (`WorldTime`, `DayPhase`, `Season`), PRNG `mulberry32` và hàm thời tiết tất định `weatherAt()` |
| `lib/life.ts` | Đồ thị 26 nút, Dijkstra có cache, nội suy đường đi, ưu tiên `plan` trước `routine`, và `resolveTransitionOrigin()` chống nhảy vị trí (L1) |
| `lib/apply-event.ts` | Hàm thuần áp dụng sự kiện dùng chung cho cả API route và Server Tick |
| `lib/training.ts` | Bộ tổng hợp bối cảnh đa chiều (`synthesizeContextPrompt`), truy xuất mẫu SFT/DPO/Curriculum và hàm chấm điểm phản tư `evaluateCandidateEvent()` |
| `data/scenes.json` | Danh mục 16 hoạt cảnh chuẩn theo khung giờ trong ngày |
| `data/contexts/` & `data/training/` | 24 bối cảnh đa chiều, 6 Golden Episodes (SFT), 6 cặp đối chiếu DPO và giáo trình tự luyện 8 cấp độ |
| `db/schema.ts` & `drizzle/` | Định nghĩa bảng và migration `0000_deep_firebird.sql` + `0001_living_world_and_training.sql` |

---

## 4. Các lỗi kiến trúc L1–L10 đã được giải quyết

Toàn bộ 10 vấn đề kỹ thuật từ đợt review trước (L1 nhảy vị trí khi có plan mới, L2 thiếu `relationship` trong `episodes`, L3 race condition trùng `id`, L4 kiểm tra kích thước body, L5 ghi thừa trong `readWorld`, L6 render lại toàn bộ SVG tĩnh, L7 lệch đồng hồ client–server, L8 lỗi lint React Hooks, L9 `role="img"` trên SVG, L10 lệch `bio` và hướng dẫn schema) đã được xử lý triệt để. Xem bảng đối chiếu chi tiết tại [TECHNICAL_REVIEW.md](TECHNICAL_REVIEW.md).

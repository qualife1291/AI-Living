# Bàn giao sang Codex (`CODEX_HANDOFF.md`)

## Trạng thái bản bàn giao hiện tại (Đã cập nhật mã nguồn, tài liệu & bộ AI tự training — 24/10/2026)

Bản ZIP này đã hoàn tất việc **định dạng sạch toàn bộ mã nguồn**, **sửa triệt để các lỗi L1–L10 và 20 lỗi ESLint**, **bổ sung Đồng hồ thế giới (`lib/clock.ts`) + 16 hoạt cảnh (`data/scenes.json`)**, **tích hợp thư viện 24 bối cảnh đa chiều & bộ dữ liệu AI tự training (`lib/training.ts`, `data/contexts/`, `data/training/`)**, đồng thời **cơ cấu lại toàn bộ hệ thống tài liệu vào 6 mục chuyên đề** (xem [docs/INDEX.md](docs/INDEX.md)).

---

## Những gì đã có sẵn trong gói ZIP này

1. **Mã nguồn ứng dụng đã chuẩn hóa & tối ưu:**
   - Sửa lỗi **L1 (`resolveTransitionOrigin`)**: kế hoạch AI mới nối tiếp mượt mà từ vị trí mô phỏng hiện tại của robot.
   - Sửa lỗi **L2–L10**: lưu đầy đủ `relationship` trong `episodes`, bắt race condition trùng `id`, kiểm tra kích thước byte UTF-8 thực tế của request body, bỏ lệnh ghi thừa trong `readWorld()`, trả `serverNow` chống lệch đồng hồ, tách `StaticScene` (`React.memo`) trong `CityMap.tsx`, đổi `<svg role="group">` và thống nhất chính sách `prefers-reduced-motion`.
2. **Đồng hồ thế giới, Thời tiết & Hoạt cảnh:**
   - `lib/clock.ts`: Tính `WorldTime` (7 pha ngày/đêm theo giờ Việt Nam, độ sáng `daylight`, mùa mưa/khô TP.HCM) và `weatherAt()` tất định.
   - `data/scenes.json`: 16 hoạt cảnh gắn theo khung giờ trong ngày.
3. **Bộ Tổng hợp Bối cảnh Đa chiều & AI Tự Training:**
   - `data/contexts/neighborhood-contexts.json`: 24 thẻ bối cảnh đa chiều.
   - `data/training/sft-golden-episodes.json`: 6 mẫu sự kiện chuẩn SFT.
   - `data/training/dpo-preference-pairs.json`: 6 cặp đối chiếu ưu tiên DPO (`chosen` vs `rejected` + `critique`).
   - `data/training/self-play-curriculum.json`: Giáo trình 8 cấp độ cho AI tự luyện.
   - `lib/training.ts`: Hàm tổng hợp prompt `synthesizeContextPrompt()` và hàm chấm điểm phản tư `evaluateCandidateEvent()` trên thang 100 điểm.
4. **Cơ sở dữ liệu & Kiểm thử:**
   - Migration gốc `drizzle/0000_deep_firebird.sql` (giữ nguyên) và migration mở rộng `drizzle/0001_living_world_and_training.sql` (`memories`, `tick_runs`, `commitments`, `nudges`).
   - 4 bộ unit test thuần: `test-life.mjs`, `test-events.mjs`, `test-animation.mjs`, `test-training.mjs`.
   - Đầy đủ `.gitignore` và `.npmrc` (kèm bản sao `gitignore.txt`, `npmrc.txt`).

---

## Việc làm theo thứ tự khi mở ZIP trên môi trường triển khai

1. **Cài đặt & Chạy kiểm tra cơ sở:**
   ```bash
   corepack pnpm install --frozen-lockfile
   npm run test:unit
   npm run check
   npm run lint
   npm run build
   ```
2. **Khởi tạo hoặc nâng cấp DB Local:**
   - Áp dụng `0000_deep_firebird.sql` (nếu DB mới) và `0001_living_world_and_training.sql`.
3. **Browser QA (Desktop & Mobile 360–430 px):**
   - Kiểm tra hiển thị pha ngày/đêm, thời tiết, chuyển động robot, chế độ Theo (`Follow`), tạm dừng (`Pause`) và mục Bối cảnh & Tự huấn luyện AI trong tab **Nhịp sống**.
   - Chụp ảnh thực tế gửi người dùng kèm nhãn `preview` hoặc `production`.
4. **Triển khai & Bảo trì dữ liệu Production (nếu có quyền Sites):**
   - Kiểm tra tác vụ tự động qua `automations.peek` (ID trong `MEMORY_LONG.md`), không tạo tác vụ trùng.
   - Sao lưu D1 trước khi dọn bản ghi test `-stale` theo quy trình tại [docs/RUNBOOK.md](docs/RUNBOOK.md).

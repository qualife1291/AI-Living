# Vận hành, Cơ sở dữ liệu Local, Deploy & Giới hạn Chi phí (`OPERATIONS.md`)

> Xem thêm: [Sổ tay xử lý sự cố (RUNBOOK)](RUNBOOK.md) · [Bảo mật (SECURITY)](SECURITY.md)

---

## 1. Môi trường Local / Portable

- **Yêu cầu:** Node.js `>=22.13.0` (đã xác minh cài sạch trên Node 22.22.2; khuyến nghị Node 22.18+ hoặc Node 24+ để chạy trực tiếp các file test `.mjs` import `.ts`), `pnpm@11.25.0`.
- **Khôi phục Dotfiles (nếu trình giải nén ẩn file bắt đầu bằng dấu chấm):**
  Gói ZIP đã bao gồm cả `.gitignore`, `.npmrc` lẫn hai bản sao `gitignore.txt`, `npmrc.txt`.
- **Khởi tạo Database D1 Local lần đầu:**
  ```bash
  corepack pnpm install --frozen-lockfile
  node node_modules/vinext/dist/cli.js build
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_deep_firebird.sql
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_living_world_and_training.sql
  ```

---

## 2. Hosting & Quản lý Truy cập hiện hành

- `project_id` trong `.openai/hosting.json`: `appgprj_6adc7dc364d48191a09202c5b43309e4` (binding `DB`, chế độ `owner-private`).
- Giữ nguyên `project_id` này; không gọi `create_site` tạo dự án mới.
- Không thay đổi `audience` từ `owner-private` sang công khai nếu không có yêu cầu trực tiếp từ chủ dự án.

---

## 3. Tác vụ Sinh hoạt & Theo dõi Sức khỏe Hệ thống (`Health Check`)

- **Tác vụ ChatGPT Automation độc lập:** ID `6adcbdcc81cc819188a4a2ae65392369` (08:00, 14:00, 20:00 giờ Việt Nam). Kiểm tra qua `automations.peek`, không tạo trùng.
- **Endpoint kiểm tra sức khỏe:** `GET /api/health` trả về `serverNow`, `revision`, `paused`, `lastAI`, `worldTime`, `weather` và bản ghi `lastTick` trong bảng `tick_runs`.
- **Hướng dẫn kèm bối cảnh tổng hợp:** Tác nhân có thể đọc `GET /api/instructions?context=1` để nhận ngay bối cảnh phù hợp với giờ và thời tiết hiện tại.

---

## 4. Sao lưu Dữ liệu & Ngân sách Miễn phí

- **Sao lưu:** Nút "Tải dữ liệu" trên giao diện xuất snapshot kèm tối đa 80 sự kiện gần nhất. Để sao lưu toàn bộ DB trước khi bảo trì, dùng lệnh `wrangler d1 export` được hướng dẫn chi tiết trong [RUNBOOK.md](RUNBOOK.md).
- **Chính sách 0đ chi phí:** Không tích hợp API LLM trả phí, không tự bật gói trả phí. Nếu triển khai Workers AI trong tương lai, luôn giữ bộ đếm ngân sách dưới trần miễn phí (10.000 Neurons/ngày) và dừng tick khi chạm ngưỡng.

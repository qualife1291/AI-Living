# Xóm AI — Bộ nhớ dài hạn (`MEMORY_LONG.md`)

## Sản phẩm và yêu cầu đã chốt
- Chủ dự án: Hoang Long. Ngôn ngữ: tiếng Việt; múi giờ `Asia/Ho_Chi_Minh`.
- Ba robot AI **An, Bình, Chi** sống trong khu phố Việt Nam; tính cách, mục tiêu, ký ức gắn người chứng kiến và quan hệ riêng.
- Phong cách 2D nhìn chéo từ trên xuống, dịu mắt, không pixel art.
- Website riêng chỉ chủ sở hữu truy cập (`owner-private`). Không tự ý thay đổi audience khi sửa nguồn.
- Không phát sinh phí hạ tầng, AI; không đăng ký dịch vụ trả phí. Giới hạn tài khoản vẫn áp dụng.
- Xuất video đã tạm hoãn theo yêu cầu. Không tự đăng mạng xã hội.
- Tuổi đời xóm tăng theo ngày thật. Kỹ năng/quan hệ/kinh nghiệm thay đổi theo sự kiện đã lưu.

## Nguồn và triển khai
- Checkout chuẩn trên Sites: `/workspace/sites/xom-ai`
- Site `project_id`: `appgprj_6adc7dc364d48191a09202c5b43309e4`
- Slug: `xom-ai-long`
- Bản live đã biết: `https://xom-ai-long.bouncyslug18.chatgpt.site` (`owner-private`).
- Tác vụ ChatGPT độc lập: `Xóm AI sinh hoạt`, ID nội bộ: `6adcbdcc81cc819188a4a2ae65392369` (`enabled=true`, `Asia/Ho_Chi_Minh`, `08:00, 14:00, 20:00`). Kiểm tra qua `automations.peek`, không tạo trùng.

## Kiến trúc & Mô-đun cốt lõi (Sau đợt cập nhật 24/10/2026)
- `lib/clock.ts`: Đồng hồ thế giới phân đoạn (`WorldTime`, `DayPhase`, `Season`), PRNG có hạt giống `mulberry32` và hàm thời tiết tất định `weatherAt()`.
- `lib/life.ts`: Mạng lưới đường đi bộ 26 nút, Dijkstra có bộ nhớ đệm, nội suy tọa độ, lịch sinh hoạt (`routines`), ưu tiên kế hoạch AI (`plan`), và hàm `resolveTransitionOrigin()` (sửa lỗi L1 chống nhảy vị trí).
- `lib/apply-event.ts`: Hàm thuần áp dụng sự kiện dùng chung cho cả API `POST /api/events` và Server Tick, lưu đầy đủ `relationship` và `contextId` vào `episodes` (sửa lỗi L2).
- `lib/training.ts` + `data/contexts/` + `data/training/`:
  - 24 bối cảnh đa chiều (`data/contexts/neighborhood-contexts.json`).
  - 16 hoạt cảnh trong ngày (`data/scenes.json`).
  - 6 mẫu SFT Golden Episodes (`data/training/sft-golden-episodes.json`).
  - 6 cặp đối chiếu ưu tiên DPO (`data/training/dpo-preference-pairs.json`).
  - Giáo trình tự luyện 8 cấp độ (`data/training/self-play-curriculum.json`).
  - Hàm chấm điểm phản tư tự động `evaluateCandidateEvent()` trên thang 100 điểm.
- `components/world/CityMap.tsx`: Tách `StaticScene` (`React.memo`) khỏi lớp thực thể động (sửa lỗi L6), thêm lớp phủ ánh sáng ngày/đêm và mưa rào, dùng `<svg role="group">` (sửa lỗi L9).
- `db/schema.ts` & `drizzle/`: Giữ nguyên `0000_deep_firebird.sql`, bổ sung `0001_living_world_and_training.sql` (`memories`, `tick_runs`, `commitments`, `nudges`).
- `app/api/health/route.ts`: Endpoint kiểm tra trạng thái vận hành, đồng hồ thế giới và lượt tick gần nhất.

## Chuẩn kiểm thử bắt buộc
1. Bốn bộ unit test thuần (`test-life.mjs`, `test-events.mjs`, `test-animation.mjs`, `test-training.mjs`) đạt 100%.
2. `tsc --noEmit`, `eslint` và `vinext build` sạch lỗi.
3. Migration chỉ thêm mới (`0001`), không sửa migration đã áp dụng (`0000`).
4. Không có số tiền âm, chỉ số trong giới hạn `0–100`, retry trùng `id` an toàn kể cả khi gọi đồng thời (L3).
5. Không có credentials, `.env`, runtime DB hay token trong Git/ZIP (`scripts/package-handoff.py` tự động quét và kiểm tra `.gitignore`/`.npmrc`).

## Codex Cloud — kết quả đã kiểm chứng
- Checkout mới: `/workspace/AI-Living`, GitHub `qualife1291/AI-Living`, nhánh `main`; source ZIP gốc commit `702a7ba`.
- Node 24.19.0/pnpm 11.25.0. Six test suites, TypeScript, lint, build và API local đạt; Chromium desktop/mobile 390 px đạt, ảnh thật ở `docs/screenshots/cloud-*-preview.png`.
- Đồng hồ đổi tốc độ/pause/resume giữ liên tục; kế hoạch mới lưu `originPath` và `simStartedAt`, sự kiện mới đồng bộ thời gian thoại theo simulation clock. Không sửa SQL migration cũ.
- Lịch cư dân 24 giờ Việt Nam ở `lib/daily-routines.ts`; AI plan ưu tiên và nối về lịch nền không nhảy vị trí. Động vật chưa được nối lịch ngày đêm.
- `scripts/setup-local.mjs` khởi tạo D1 local lặp lại an toàn; startup dùng XDG trong `.sites-runtime`, không cần thay HOME.
- Nguồn sự thật của đợt này: `docs/CLOUD_REVIEW.md`. Không có bằng chứng mới về production, scheduler hay model training.

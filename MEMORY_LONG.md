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

## An và thế giới mở rộng — 25/10/2026
- Đã xác minh môi trường được Publish (runtime source spec revision 4). Phát triển tiếp trong cùng checkout, không tạo worktree.
- Nguồn hiện hành: `docs/LIVING_REALTIME.md`. 24 NPC ban đầu, +3/ngày TP.HCM, tối đa 240; tối đa 60 hiển thị và ưu tiên người đang gặp An. Vai trò thêm qua dữ liệu/UI hoặc đề xuất local LLM tối đa một lần/ngày.
- Lớp RealContext tách giờ thực Việt Nam khỏi simulation clock. Open-Meteo và Nager.Date đã đọc thành công qua relay đi đúng session proxy; có cache, timestamp, stale/unavailable. Chưa có traffic/festival feed; lịch âm/nghỉ bù chưa đầy đủ.
- llama.cpp b11856 + Qwen2.5-1.5B-Instruct Q4_K_M CPU đã chạy và xác minh SHA-256. Fixture đầu-cuối sinh hội thoại tiếng Việt và vai trò mới đạt; model nhỏ, chất lượng có thể khuôn mẫu. Không fine-tune hoặc paid AI API.
- `npm run living:up` khởi động web, bounded context relay, model và daemon local. Daemon 15 phút/lượt có ID idempotent, không phải scheduler production.
- Migration append-only 0002 thêm context_cache/living_turns. Scene/snapshot/tick audit ghi nguyên tử; tiến triển chỉ cập nhật sau hoạt động đã hoàn tất trong mô phỏng. Không thay đổi SQL migration cũ hay dữ liệu production.
- Bảy bộ test thuần và kiểm thử API cũ/mới, Chromium desktop/mobile đạt trong đợt này; ảnh `docs/screenshots/living-*-preview.png` là local preview. Giữ các giới hạn trong báo cáo, không suy luận production hoạt động.

- Bổ sung nguồn VisitHCMC công khai: cache sáu giờ, kiểm tra khoảng ngày/URL, loại ngày không xác định. Đã xác minh tháng 5/2026 có 3 mục và tháng 10/2026 trả rỗng. Tổng tám bộ test thuần; không dùng lịch rỗng để khẳng định thành phố không có sự kiện.

- Daemon thực trong cloud local đã ghi lượt `living-2026-10-25-30` với generator=local-llm và mở vai trò mới ngày 25/10. Browser QA cuối có 26 NPC phụ, không dùng số cố định 24 để phủ nhận tăng dân số.

## Thành phố khối và ba hướng — 25/10/2026
- Giao diện / là live canvas toàn viewport; mặc định theo An, HUD nhỏ và panel modal ẩn. /dashboard giữ công cụ cũ. Có pan/zoom/follow, camera fit viewport và lazy OSM.
- 33 địa điểm/32 tình huống theo dữ liệu; graph mở rộng, hiển thị xe máy/buýt/metro/máy bay và cơ chế tiếp cận/đi phương tiện/đi bộ cuối trong mạng mô phỏng.
- OSM trung tâm HCMC: 2.106 feature, dataset ODbL + attribution/source/timestamp; không dùng bản đồ đó để giả báo cáo giao thông hay gán sai vị trí cư dân.
- 14 theme tạo hình khối do dự án tự vẽ; lấy cảm hứng đồ chơi lắp ghép, không nhập logo/model/video LEGO. Appearance từng actor có schema/Origin/revision và giữ qua tick.
- Từng cư dân có contextual bandit, ba động vật có policy nhỏ; phản hồi fit sau khi kế hoạch hoàn tất. Có cảnh theo dõi nghề/nghỉ/học/chấn thương nhẹ/việc làm. Đây là học policy, không phải fine-tune Qwen.
- Migration append-only 0003_agent_experiences lưu audit dataset cùng policy update theo CAS/nonce. Snapshot giữ 200 mẫu đọc nhanh; archive phân trang JSONL và CLI export toàn bộ. Backup SQLite online đã kiểm tra trước migration.
- Nguồn mới nhất docs/URBAN_WORLD.md. Kiểm thử: 11 suite thuần, TypeScript/lint/build, API học đồng thời/không trùng/archive/phân trang, wardrobe lưu/reload/không đổi model và Chromium desktop/mobile; ảnh city/osm/wardrobe là local preview.
- ADR-0009 ghi định hướng chủ dự án: live quan sát An; studio kịch bản giáo dục riêng timeline; nhân vật người dùng có ownership/memory riêng. Chưa mở public, chưa tạo multi-user, chưa render/upload video.

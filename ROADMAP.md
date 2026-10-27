# Roadmap và Lộ trình Sprint bàn giao

> Cập nhật Codex Cloud: xem [docs/CLOUD_REVIEW.md](docs/CLOUD_REVIEW.md) cho ba phase mới, bằng chứng local và các phần còn thiếu. Các trạng thái live trong tài liệu bàn giao dưới đây chưa được xác minh lại.

## Phase 1 — Nền tảng và hình ảnh (Đã xuất bản)
- Owner-private web, D1 snapshots/events, hồ sơ, ký ức, quan hệ, journal, pause/export.
- Ba robot SVG, khu phố rộng, các địa điểm, district views và zoom.
- Build, TypeScript và desktop navigation QA đã qua; ảnh đã gửi.

## Phase 2 — AI tiếp nối & Vệ sinh kỹ thuật (Sprint 0 & Sprint 1 — Đã hoàn thành trong mã nguồn)
- Một scene AI đã ghi/readback qua service access; tác vụ ChatGPT độc lập đã bật (08:00/14:00/20:00 giờ Việt Nam).
- **Sprint 0 (Đã xong):** Định dạng sạch toàn bộ mã nguồn, sửa hết 20 lỗi ESLint + 6 cảnh báo, chuẩn hóa import, bổ sung `.gitignore`/`.npmrc` và cơ cấu lại toàn bộ tài liệu vào 6 mục chuyên đề (`docs/INDEX.md`).
- **Sprint 1 (Đã xong):** Sửa lỗi L1 (`resolveTransitionOrigin` chống nhảy vị trí khi có plan mới), L2 (lưu đầy đủ `relationship` vào `episodes`), L3 (bắt race condition trùng `id`), L4 (kiểm tra kích thước byte UTF-8 thực tế), L5 (bỏ lệnh ghi thừa khi đọc `GET`), L6 (tách `StaticScene` `React.memo`), L7 (`serverNow` chống lệch đồng hồ), L9 (`role="group"` cho SVG), L10 (chuẩn hóa `seed` bio và hướng dẫn schema).
- Bổ sung migration `0001_living_world_and_training.sql` (`memories`, `tick_runs`, `commitments`, `nudges`) và endpoint `GET /api/health`.

## Phase 3 — Thế giới sinh động & Đồng hồ thế giới (Sprint 2 — Đã hoàn thành trong mã nguồn)
- Đã viết graph đường đi, interpolation, routines, AI plans, công việc theo nơi đến, mèo/chó/sẻ theo tài liệu tập tính, follow camera, overlay đường đi và live board.
- **Đồng hồ thế giới (`lib/clock.ts`):** Chu kỳ 7 pha ngày/đêm, độ sáng `daylight`, mùa mưa/mùa khô TP.HCM, thời tiết tất định theo hạt giống (`mulberry32`) và hiển thị trạng thái đèn đường/lối đi bộ.
- **Danh mục 16 hoạt cảnh (`data/scenes.json`):** Chuẩn hóa hoạt cảnh theo khung giờ trong ngày.

## Phase 4 — Tổng hợp bối cảnh, Planner & Bộ AI Tự Training (Sprint 3 — Đã tích hợp bộ dữ liệu & đánh giá)
- **Thư viện 24 bối cảnh đa chiều (`data/contexts/neighborhood-contexts.json`):** Thời tiết, kinh tế vi mô, lời hứa xã hội, sinh thái động vật, văn hóa Việt Nam và thấu cảm.
- **Bộ dữ liệu AI tự training (`data/training/` & `lib/training.ts`):**
  - 6 mẫu Golden Episodes chuẩn SFT (`sft-golden-episodes.json`).
  - 6 cặp đối chiếu ưu tiên DPO (`dpo-preference-pairs.json`).
  - Giáo trình tự luyện 8 cấp độ (`self-play-curriculum.json`).
  - Hàm chấm điểm phản tư tự động `evaluateCandidateEvent()` trên thang 100 điểm.
- **Việc tiếp theo khi triển khai live:** Áp dụng migration `0001`, xác minh bản ghi `tick_runs` thực tế qua nhiều ngày, và thực hiện QA trình duyệt trên thiết bị di động.

## Phase 5 — Video và social (Tạm hoãn theo yêu cầu)
- Chưa bật video rendering, TTS thời gian thực hoặc auto-post. Thiết kế tiếng ríu Web Audio và kiến trúc âm thanh đường phố đã sẵn sàng tại [docs/DESIGN_PROPOSALS.md](docs/DESIGN_PROPOSALS.md) (§5–§6).

## Mở rộng từ 25/10/2026 — An là nhân vật chính
- **Phase A — Nội dung và cư dân theo dữ liệu:** đã triển khai local (24 NPC, tăng theo ngày, danh mục vai trò, ba điểm dịch vụ mới, UI mở rộng).
- **Phase B — RealContext TP.HCM:** đã nối thời tiết/ngày lễ/VisitHCMC và cache; traffic, lịch âm/nghỉ bù còn thiếu nguồn hoặc chưa đủ.
- **Phase C — Planner và AI local:** đã có CPU inference, daemon idempotent, câu chuyện/vai trò mới có kiểm tra, ký ức và kỹ năng từ hoạt động hoàn tất trong mô phỏng. Không phải fine-tune hay chạy production 24/7.
- **Phase D — Hệ sinh thái và vận hành thực:** tiếp tục nguồn realtime còn thiếu, chất lượng/mục tiêu dài hạn, động vật/cây, deploy và lịch production sau khi có quyền truy cập đúng project.
- Bằng chứng/giới hạn: [docs/LIVING_REALTIME.md](docs/LIVING_REALTIME.md).

## Thành phố và ba hướng — cập nhật theo yêu cầu mới
- **Đã triển khai local:** live canvas toàn viewport, 33 nơi/32 tình huống, dữ liệu OSM và SVG, 14 theme khối, học policy từng cư dân/động vật, archive trải nghiệm.
- **Hướng 1:** public viewer đọc trạng thái An + scheduler production bền vững, sau khi tách quyền ở máy chủ.
- **Hướng 2:** AI chia bài học thành script, stage branch/cast/shot list, preview và duyệt trước render/xuất bản.
- **Hướng 3:** nhân vật cá nhân, xác thực/ownership, ký ức/policy riêng và chia sẻ có kiểm soát.
- Bằng chứng và ranh giới: docs/URBAN_WORLD.md; quyết định nền tảng chung: docs/DECISIONS/ADR-0009-shared-world-three-product-directions.md.

## Phase 3D — theo yêu cầu chuyển 2D sang 3D
- Đã dựng renderer Three.js, 282 khối nhà/151 cao ốc, nhân vật và phương tiện trên graph cũ, camera orbit/follow/skyline/overview, chế độ 2D nhẹ và fallback WebGL.
- Tiếp theo: kiểm tra thiết bị thật, LOD hình học, nội thất, đa dạng xe và thời tiết 3D. Không coi thành phố này là khảo sát công trình thật.
- Chi tiết và bằng chứng: [docs/THREE_WORLD.md](docs/THREE_WORLD.md).

## Production version6 — 25/10/2026
Đã phát hành hardening/nội thất/hồ sơ/OSM3D, giữ owner-private. Kết quả thực ở docs/releases/latest.json. Chưa indoor routing, height coverage thật, cron/Qwen production hoặc public viewer. Nguồn phát triển tiếp MAP_3D_SOURCES.md.

## Production version7 — 25/10/2026
Đã sửa tỷ lệ/độ nét/thoại nền, chat có lưu/rules, lượt mở và pulse. Cloudautomation mỗi giờ enabled theo yêu cầu mới; cần theo dõi run đầu/soak và quota. Còn indoorgraph,collision/IK,physicalGPUbenchmark/freeformLLM và publicpermission.

## Nhân vật và xã hội — bản8
Nguồn đã hoàn thiện12cảnh/56lượt doagentbiênkịch, crowd24h, spacing1.4m, hỏiđáp/nghe/cửchỉ/nguồnAIriêng, geometrybo vàpropsngoàihiên; test/preview ởSOCIAL_REVIEW. Kiểm tra releaseledger để biết bảnproduction. Còn indoorroute/physics/IK, phục vụ/đạo cụ có trạng thái, giữ encounter trước crowdchange, vàmodelsemanticquality/thiếtbịthật/soak.

## Sửa phản hồi thực tế — production9,26/10/2026
Đã giữ đủcuộc thoại qua polling, groundnavigation quanhnhà, trafficnhườngngười/giữlàn, chi tiếtmặtđứng vàchunkLOD. XemGROUND_AND_MOTION_REVIEW vàledger26/10. CònphysicalGPUbenchmark, smallprop/animal/indoorcollision, bus/metroboardinghìnhhọcthật, đồngbộplayback giữa viewers vàbackendcompletion theooccupancy.


## Vật cản và chủ động — bản10,26/10/2026
Đã hoàn tất source/QA small-prop/tree/person avoidance, cinematicAn/aspectportrait, nhu cầu/kinh nghiệm/chống lặp/cohort công bằng và agenda độc lập. Bằng chứng SPACE_CAMERA_AUTONOMY; trạng thái production riêng ở releaseledger. Còn physicalGPU/soak, indoor/elevator/animal collision, đồng bộ playback và backend completion theo occupancy.


## Chi tiết đồ họa — bản 11, 27/10/2026
Đã chốt source và localQA cho rig có khớp, props gắn tay,66cụm đồ vật,6cảnh mới, cây/mây/nước và model mèo/chó/chim phối hợp groundnav. XemVISUAL_DETAIL_REVIEW vàreleaseledger. Còn hardwareGPU/soak, IK nội thất/thang máy/serve-clean/inventory và mô hìnhAI chất lượng hơn.

## Phase B tiếp nối — đuổi bắt theo cặp (source work)
Đã thêm cơ chế ghép hai người cùng chọn tag, đổi vai khi đến gần trên ground an toàn, pause/hủy/polling trong renderer 3D. Đây là presentation theo luật, chưa đồng bộ nhiều người xem/2D hoặc ghi reward. Xem docs/PAIRED_TAG.md. Cycle physics, thú theo chủ và C/D vẫn chưa hoàn tất; chưa deploy bản này.

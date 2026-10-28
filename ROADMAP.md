# Roadmap và Lộ trình Sprint bàn giao

> Trạng thái hiện hành 28/10: H0 nhịp chungD1/read-only diagnostics/healthbatch đã đạt51suite/API; tiếpH1≥20seed/G0/UX theo reviewClaude. source đã có rig/gallery/identity, LinUCB/skill gates, structured memory/pool/xưng hô, policy storage, cửa nhà riêng và audio opt-in. Production chỉ xác nhận qua releases/latest.json; candidate.json là gói chuẩn bị, chưa deploy. Backlog chi tiết ở docs/NEXT_PHASES.md.
>
> Các mục có ngày cũ phía dưới là lịch sử, bao gồm renderer 2D đã bị gỡ. Không dùng chúng để phục hồi 2D hoặc suy rằng mọi phase đã hoàn tất.
>
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

## Chỉ 3D và pet-walk — source work, 27/10/2026
Đã gỡ renderer/assets SVG2D và dashboard cũ, giữ tọa độ/graph cần cho3D. Wardrobe dùng WebGL, lỗi context có retry. PhaseB thêm petOwners lưu bằng CAS, UI phân công và companionfollow qua collision shared; ngắt pending tự động của thú không nhận reward giả. Xem docs/THREE_ONLY_AND_PETS.md. Chưa cyclefullbody, density/household/trafficgraph, LinUCB/skillgates hoặc modelA-B; chưa deploy.

## Phase B tiếp nối — xe đạp di chuyển (source work)
Cycle/transport=bicycle đã có ground route theo clearance9,2, toàn xe/người trong vùng bao, tăng/giảm tốc, nhường người/xe, bánh/pedal theo quãng đường, pause/dismount và camera full-bike. Xem docs/CYCLING.md. Chưa lực học toàn xe/IK, completion authoritative; tiếp theo phaseC density/household/trafficgraph và phaseD LinUCB/skillgates, history/modelA-B.

## Tài nguyên Gobkit/KayKit và định danh — đang triển khai

Tích hợp giữ nguyên tag/pet-walk/xe đạp/3D-only/overlays/households đã có trên work. Tiếp theo là importer 15 pack CC0, skeleton animation adapter, nhân vật có tên/tuổi/cách xưng hô rõ ràng, môi trường và tập tính theo loài, catalog tải theo nhu cầu. Theo docs/ASSET_EXPANSION.md; test nguồn hợp nhất rồi phát hành một bản production theo yêu cầu mới. Không đánh dấu density/traffic graph/LinUCB/durable history hoàn tất.

## Tiếp nhận main và review Gemini — 28/10/2026

Main đã merge work c83a5e3. Asset/identity/UI milestone đã qua full38unit/API/hash/check/lint/build và5browserharness trên nguồn cuối; gallery239model/15packs, core/focusedNPC có skin độc lập và giữ tỷ lệ. Đây là source candidate, phát hành theo ledger/nativeSites riêng.

Các phase tiếp theo được đánh giá ở docs/GEMINI_REVIEW_2026-10-28.md: ưu tiên LinUCB thực +skillgates/context-at-choice, durable thoại/memory với provenance, homeanchors/transit/collision, sinh thái/audio theo habitat. Không chép số3,71×/score98 hoặc hứa150ms/hardwareFPS từ harnesssynthetic. Native cron/public/LoRA/hardware/soak cần capability và nghiệm thu riêng; không tự biến lịch sử thành đã hoàn thành.

## Phase D nền tảng đã kiểm thử trong source
DisjointLinUCB/4skillgates/context-at-choice, roleexpansionguard, structuredmemory actor/provenance/CAS/topK/bulkarchive và poolhash/xưnghô đã triển khai;42unit/API/check/lint/build +social6/poll/F5desktopmobile đạt. Chi tiết PHASE_D_LEARNING.md. Chưa hierarchyglobal/role/P2P/skillsvector/policystorage táchsnapshot, occupancyauthority, fullmodelA-B hoặc sinhthái/home/transitphaseC/E.

## Phase C — cửa nhà đã kiểm thử trong source
60 cửa riêng, địa chỉ và Xem nhà, additive backfill, walking/full-bike ground routing đã qua 43 suite/API/browser desktop/mobile. Xem PHASE_C_HOMES. Chưa density live, indoor hoặc boarding/transit.

## Phase E — vườn có trạng thái (source)
Năm khóm/30cây,5phase/độẩm/tưới ownerCAS,2batch trong footprint cũ, camera vàUI desktop/mobile. Pure/geometry/full50/API đạt; chi tiết PHASE_E_GARDENS. Không nhận toàn bộ habitat/flora/ground/NPC gardening đã hoàn tất; production theo ledger riêng.

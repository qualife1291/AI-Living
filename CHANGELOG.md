# Changelog

## 2026-10-27 — Nhân vật có khớp và bối cảnh sinh hoạt nhiều chi tiết
- Tay/chân có khuỷu/gối, chuyển đi–đứng mềm theo quãng đường thực, giữ pose khi pause. Bổ sung nét mặt, cổ áo/cúc/đế giày và mũ tròn; sách/ly/bình tưới/dụng cụ theo tay cầm.
- Gom nhân vật vào sáu batch chung; chi tiết gần camera, chân/bóng theo nền thực của renderer.
- 66 cụm đồ vật thuộc bảy loại, footprint dùng chung với navigation; thêm tán cây nhiều lớp, bậc cửa thấp, mây và nước đài phun theo simulation clock.
- Dựng riêng mèo/chó/đàn sẻ; phối hợp vị trí ngoài trời với người và xe để tránh chồng chân.
- Sáu cảnh trao đổi mới, nâng thư viện lên 18 cảnh/88 lượt; giữ nhãn nguồn và lịch sử đã lưu.
- Bằng chứng và giới hạn: [VISUAL_DETAIL_REVIEW](docs/VISUAL_DETAIL_REVIEW.md).

## 2026-10-26 — Khoảng riêng, góc quay theo An và sinh hoạt chủ động
- Cây và đồ đạc dùng chung tọa độ giữa renderer/navigation:94 cây,507 footprint, cộng279 khối nhà. Dời shelter/ghế/cây trạm xe và cột đèn khỏi tuyến xe; bỏ6 cột trùng.
- Kiểm tra vùng quét của từng người, nhường lối/đi vòng khi đối đầu, đặt điểm đứng riêng để tránh tụm và xuyên nhau. Khi chờ, chân dừng bước.
- Tracking shot gần An, có người nghe, chọn góc tránh nhà và tự lùi trên màn hình dọc. Nút Theo quay về An; zoom tay thoát chế độ theo.
- Chọn việc theo năng lượng/đói/kinh nghiệm, hạn chế lặp và giữ kế hoạch chưa hoàn tất; luân phiên cư dân công bằng. Lịch NPC có công việc nhỏ và giờ nghỉ riêng.
- Khung lập kế hoạch5phút/pulse30giây khi trang đang mở. Không nhân điểm kỹ năng, không đổi model hay thêm dịch vụ trả phí. Giới hạn và bằng chứng: [SPACE_CAMERA_AUTONOMY](docs/SPACE_CAMERA_AUTONOMY.md).

## 2026-10-26 — Sửa thoại bị ngắt, chuyển động và đường đi
- Giữ trọn4–6lượt qua polling; nhịp2,4–4giây/câu, nghỉ0,3giây, cooldown20–45giây; đọc đầy đủ eventAI và dừng khi pause.
- Di chuyển theo từngframe với đường vòng quanh footprint, camera theo dt và clockoffset bùRTT. Render/layout/nav dùng chung dấu chân công trình; không đặt nhà trên đường xe.
- Xe đúng làn trên vòng khép kín, góc bo, có phanh/nhường người/khoảng cách; bỏ xe buýt/metro minh họa ở tuyến chưa có hình học an toàn.
- Khung cửa/bậu/viền mái/mái hiên sọc/bóng tiếp xúc, ánh sáng rõ khối; vật liệu nhẹ/chunkLOD chi tiết xa. Bằng chứng và giới hạn trong GROUND_AND_MOTION_REVIEW.

## 2026-10-25 — Nhân vật mềm hơn và hội thoại có lượt
- Đầu cầu/tóc ôm đầu, thân bo góc, tay chân capsule; thở/chớp mắt, quay mặt về đúng bạn, cử chỉ nói/nghe. Sửa vai, giày và tên quá lớn; thêm bàn/ghế/ly/chậu ở rìa địa điểm.
- Đám đông theo lịch24giờ và nghề, bữa ăn/nghỉ xen kẽ; vị trí riêng cách1,4m, vào vị trí liên tục, giới hạn cả người cuối dân số240.
- Hai agent phát triển biên kịch/review;12cảnh/56lượt, có khoảng yên và chờ câu mở đầu khi vừa tới. 2D/3D dùng chung điều phối; eventAI ưu tiên, đúng người nghe và nhãn nguồn.
- Prompt đạo diễn–nhân vật–phản biện cho cloud/local, guard chặn lặp gần nguyên văn. Qwenlocal3vai đã chạy thật nhưng có mẫu kém bị guard bác, không ghi world. Không thêm paidAPI/video.
- Nguồn tham khảo và hướng tạo hình trong VISUAL_DIRECTION; bằng chứng/test và giới hạn trong SOCIAL_REVIEW.

## 2026-10-25 — Thành phố 3D và khu cao ốc
- Đổi không gian sống mặc định sang Three.js/WebGL2; 282 khối nhà, gồm 151 cao ốc, cửa hàng tầng trệt, cây và công trình dịch vụ. Bố trí tất định chừa đường đi và khu vực quanh địa điểm.
- Nhân vật khối 3D đọc trang phục hiện có; giữ hoạt động, thoại, động vật và phương tiện trên cùng dữ liệu mô phỏng. Camera xoay/dịch/zoom, theo nhân vật, khu cao ốc và toàn cảnh theo tỷ lệ màn hình.
- HUD toàn viewport, biển tên thu gọn theo khoảng cách; chuyển 2D nhẹ và tự fallback khi WebGL không khả dụng/mất context. Giải phóng tài nguyên khi chuyển renderer. OSM vẫn là khảo sát 2D riêng có attribution.
- Instancing và runtime tải động; thêm kiểm thử hình học/đường đi và QA WebGL desktop/mobile. Chi tiết: [docs/THREE_WORLD.md](docs/THREE_WORLD.md). Không đổi DB hoặc phương pháp học AI.

## 2026-10-24 — Cập nhật mã nguồn toàn diện, Đồng hồ thế giới, Tổng hợp bối cảnh & Bộ AI Tự Training
- **Định dạng mã & Sửa lỗi ESLint:** Định dạng sạch toàn bộ các tệp mã nguồn trước đây bị nén 1 dòng (`CityMap.tsx`, `app/page.tsx`, `lib/life.ts`, `app/globals.css`...); sửa triệt để 20 lỗi ESLint và 6 cảnh báo (loại bỏ `any`, sửa `react-hooks/refs`, `set-state-in-effect`, `purity`, `@next/next/no-html-link-for-pages`, `prefer-const`).
- **Khắc phục lỗi logic & kiến trúc L1–L10:**
  - **L1 (P0):** Thêm `resolveTransitionOrigin()` trong `lib/life.ts` và `lib/apply-event.ts` để kế hoạch AI mới xuất phát từ đúng vị trí mô phỏng hiện tại, chấm dứt hiện tượng nhảy vị trí (teleport).
  - **L2 (P1):** Lưu đầy đủ `relationship`, `contextId`, `revisionBefore`, `revisionAfter` vào bảng `episodes`.
  - **L3 (P1):** Bắt ngoại lệ `UNIQUE`/`PRIMARY KEY` khi hai request trùng `id` đến cùng lúc để trả về `{ ok: true, duplicate: true, id }`.
  - **L4 (P2):** Kiểm tra độ dài byte UTF-8 thực tế của body (`<= 20.000` byte) và trả danh sách đường dẫn lỗi Zod an toàn khi mã `400`.
  - **L5 & L7 (P2):** Tách câu lệnh khởi tạo khỏi đường đọc thường xuyên trong `readWorld()` và trả thêm `serverNow` để đồng bộ đồng hồ client–server.
  - **L6 & L9 (P1/P2):** Tách component `StaticScene` bọc `React.memo` và đổi `<svg role="group">` trong `CityMap.tsx`; thống nhất chính sách `prefers-reduced-motion` và bỏ transition gây trễ trên `.map-person`.
- **Đồng hồ thế giới & Thời tiết tất định (`lib/clock.ts`, `data/scenes.json`):** Bổ sung chu kỳ 7 pha ngày/đêm theo giờ Việt Nam, thời tiết tất định theo mùa mưa/mùa khô TP.HCM (`mulberry32`), lớp phủ ánh sáng/mưa trên bản đồ và danh mục 16 hoạt cảnh chuẩn.
- **Tổng hợp bối cảnh đa chiều & Bộ AI Tự Training (`lib/training.ts`, `data/contexts/`, `data/training/`):**
  - Thêm 24 bối cảnh đa chiều (`neighborhood-contexts.json`), 6 mẫu SFT Golden Episodes (`sft-golden-episodes.json`), 6 cặp đối chiếu DPO (`dpo-preference-pairs.json`), giáo trình tự luyện 8 cấp độ (`self-play-curriculum.json`) và hàm chấm điểm phản tư `evaluateCandidateEvent()`.
  - Thêm bộ kiểm thử đơn vị thứ 4: `scripts/test-training.mjs`.
- **Database & Vận hành:** Thêm migration `drizzle/0001_living_world_and_training.sql` (`memories`, `tick_runs`, `commitments`, `nudges`) và endpoint `GET /api/health`.
- **Cơ cấu lại hệ thống tài liệu & Bổ sung Dotfiles:** Hoàn thiện đầy đủ các mục §3–§8 và Phụ lục G của `DESIGN_PROPOSALS.md`; tạo bản đồ tài liệu `docs/INDEX.md`, `API.md`, `DATA_MODEL.md`, `GLOSSARY.md`, `RUNBOOK.md`, `SECURITY.md`, `CONTRIBUTING.md`, `AI_TRAINING_AND_CONTEXTS.md` và 8 hồ sơ quyết định kiến trúc `docs/DECISIONS/ADR-0001..0008.md`; đưa `.gitignore` và `.npmrc` (kèm `gitignore.txt`, `npmrc.txt`) vào gói ZIP.

## 2026-10-24 — Review kỹ thuật toàn diện (trước khi cập nhật mã)
- Cài sạch từ lockfile (pnpm 11.25.0, Node 22.22.2): `test-life`, `test-events`, `test-animation` PASS; `tsc` 0 lỗi; `build` PASS.
- Phát hiện 20 lỗi ESLint, 6 cảnh báo; phát hiện lỗi L1–L10 và thiếu `.gitignore`/`.npmrc` trong bản nén cũ.

## 2026-10-24 — Initial implementation & Animated character handoff v2
- Xây dựng khu phố 2D với 3 robot AI An, Bình, Chi, mèo Mướp, chó Cún, đàn sẻ, 4 xe giao thông theo pha đèn, Xưởng nhân vật và bong bóng thoại.
- Lưu trữ trạng thái trong D1 (`worlds`, `episodes`), kiểm tra Zod, khóa lạc quan `revision` và chống trùng `id`.

## Codex Cloud — nhập source và phát triển nhịp sống
- Nhập source gốc lên GitHub main; chuẩn bị Workers/D1 local có thể khởi động lại.
- Sửa nhảy đồng hồ khi đổi tốc độ, vị trí khi thay kế hoạch; đồng bộ kế hoạch/thoại mới với simulation clock.
- Thêm lịch 24 giờ riêng cho ba cư dân: ăn uống, làm việc, nghỉ trưa, gặp gỡ và ngủ đêm.
- Kiểm tra chặt điều khiển thế giới; thêm hai bộ regression test và ảnh Chromium desktop/mobile thực tế.
- Xem docs/CLOUD_REVIEW.md cho kết quả, giới hạn và phần chưa triển khai.

## 25/10/2026 — An và khu phố mở rộng
- Thêm cư dân phụ có danh tính ổn định, dân số tăng theo ngày, mức quen thuộc và ký ức riêng; thêm vai trò từ dữ liệu/giao diện mà không sửa code.
- An chọn sinh hoạt theo giờ TP.HCM, lịch, thời tiết còn mới và nhu cầu; có học, làm việc, khám mô phỏng, đi chợ, ăn và chơi. Người gặp cùng đi tới điểm hẹn trước khi phát thoại.
- Kết nối thời tiết Open-Meteo, ngày lễ Nager.Date, cache/timestamp và trạng thái nguồn rõ ràng. Kẹt xe/lễ hội chưa có nguồn được ghi unavailable.
- Thêm AI CPU mã nguồn mở llama.cpp/Qwen, xác minh artifact SHA-256, output JSON/tiếng Việt có kiểm tra và fallback quy tắc; hỗ trợ đề xuất vai trò mới mỗi ngày.
- Thêm migration 0002, API living/catalog/tick và tick audit nguyên tử; supervisor local khởi động relay/model/web/daemon.
- Thêm kiểm thử provenance, mất nguồn, dân số, nhu cầu, đồng vị trí, đồng thời và fixture AI; chụp ảnh Chromium desktop/mobile thực tế. Chưa deploy production.

- Nối lịch sự kiện VisitHCMC với khoảng ngày có kiểm tra, cache sáu giờ và nguồn/link trong UI; chỉ lấy cảm hứng cho An khi ngày thực nằm trong khoảng sự kiện.

## 25/10/2026 — Thành phố toàn màn hình, tạo hình và học hành vi
- Chuyển trang chủ sang canvas toàn viewport với HUD nhỏ, panel ẩn, camera pan/zoom/follow và chế độ ẩn UI. Giữ bảng cũ ở /dashboard.
- Vẽ thư viện công trình/phương tiện SVG cho 33 điểm đến và 32 tình huống. Nối graph trường, bệnh viện, công an, nhà máy, rạp phim, sân bay, bến buýt và metro; có chuyển tiếp tiếp cận/đi phương tiện/đi bộ cuối.
- Thêm snapshot OSM 2.106 đối tượng có attribution ODbL, tải khi mở khảo sát; tách rõ hình học thật với thành phố mô phỏng.
- Thêm 14 theme nhân vật khối, có đồng phục cảnh sát/tài xế công nghệ/công nhân/giáo viên/người chú. Đổi và lưu màu áo, quần, da, tóc, kính/râu theo từng nhân vật.
- Thêm contextual bandit từng cư dân và policy động vật, fit phản hồi từ hoạt động hoàn tất; không học sớm/trùng/hủy. Qwen chưa fine-tune.
- Thêm migration 0003 archive trải nghiệm, cập nhật policy + dataset nguyên tử, phân trang JSONL, helper backup SQLite và export local.
- Ghi ADR-0009 cho ba hướng chung nền thế giới: live viewer, studio giáo dục tách nhánh và nhân vật cá nhân; chưa bật public/video/multi-user.

## 25/10/2026 — Độ tin cậy và góc quan sát nội thất
- Thêm mặt cắt 3D nội thất, lựa chọn tầng và hoạt cảnh cabin thang máy; hồ sơ tuổi mô phỏng/chương đời sống/ký ức.
- Cải thiện màu trời và ánh nắng theo giờ; giới hạn công việc render khi tab ẩn.
- Sửa archive batch lớn, proposal cũ, duplicate event, health/schema, context timeout/cache và polling; thêm gate owner và scheduler rules opt-in.
- Chưa deploy production; thang máy chưa điều phối cư dân thực. Chi tiết `docs/INTERIORS_AND_RELEASE.md`.

## 25/10/2026 — Production version6 và bản đồ khảo sát3D
- Phát hành owner-private với additive schema reconciliation và kiểm chứng bảo toàn lịch sử.
- Thêm khảo sát OSM3D912 công trình, ghi rõ heightước lượng, không lẫn vị trí cư dân mô phỏng.
- Lưu runbook, releaseledger/SHA, scriptbuild-package-source-sync và nghiên cứu nguồn3D/bối cảnh không phí.

## 25/10/2026 — Tỷ lệ, tương tác và nhịp sống
- Sửa tỷ lệ người–xe–nhà; thêm bánh/đèn xe, đạo cụ và preset độ nét; HUD sáng rõ, chữ gọn và ít blur.
- Khôi phục thoại nền3D, thêm chat có lưu theo ngữ cảnh/luật, lượt mở theo phiên và pulseidempotent.
- WorldGET chỉ đọccache bối cảnh, compact8events; giới hạn refreshcontext và chặn responsecũ sau điều khiển.
- Kiểm thử concurrency/API, viewportDPR, pause/offline/contextloss/lifecycle và các giới hạn tại EXPERIENCE_REVIEW.md.

- Productionversion7 đã nativepublish/readback; reuse lịchcloud mỗi giờ để cập nhật khi đóng trang. Lịchchưa có recordedrun đầu tại thời điểm bàn giao, không có cam kếtSLA24/7.

## Local candidate 27/10/2026 — diagnostics và routing
Thêm log client bounded/batch + owner JSONL, migration0006, audit tick; precompute1089venue routes vàLRU; grammar ambient/history50. Các gói hành vi/dân số/giao thông chưa làm; xem docs/FIXES_PHASE_A.md.

## Local candidate — giai đoạn B
Thêm9action kinds/scenarios, mapping clip/procedural/props và bike tập; chuỗi5bước hậu thoại, giữ plan còn hoạt động; lịch gặp NPC độc lập qua pulse với nhu cầu/cooldown/CAS. Source-only, chưadeploy. Giới hạn/tag/cycle/pet và nghiệm thu: docs/PHASE_B_ACTIONS.md.

## 27/10/2026 — sửa hàng đợi telemetry trên work
- Chia batch diagnostics theo kích thước JSON UTF-8 tối đa16KiB, thay vì chỉ đếm32log. Tránh HTTP413 lặp vô hạn với log tiếng Việt/ký tự đa byte.
- Chuẩn hóa field theo giới hạn endpoint, giữ log chưaACK và chỉ xóa phần batch đã đượcACK. Không đổi migration/production.

# Bộ nhớ ngắn hạn

Đọc [docs/URBAN_WORLD.md](docs/URBAN_WORLD.md) và [ADR-0009](docs/DECISIONS/ADR-0009-shared-world-three-product-directions.md) trước khi sửa. Đây là hướng mới nhất: không gian live toàn màn hình, nhân vật khối/trang phục, học từ trải nghiệm và ba hướng sản phẩm tương lai.

## Việc tiếp theo
- Đánh giá chất lượng policy/hội thoại, mục tiêu dài hạn và quan hệ hai chiều. Cư dân học mô hình hành vi từ phản hồi mô phỏng; Qwen vẫn chỉ inference, chưa fine-tune.
- Nối nguồn giao thông thật, lịch âm/nghỉ bù và lịch hoạt động từng cơ sở. OSM là snapshot hình học; mô phỏng chưa map-match nhân vật vào graph OSM thật.
- Renderer mặc định đã chuyển Three.js; tiếp tục LOD hình học, nội thất, mô hình phương tiện/hiệu ứng thời tiết 3D và sinh thái cây. Động vật đã có policy nhỏ và trú mưa/nghỉ đêm theo tick; chưa phải model sinh học.
- Triển khai các hướng theo ADR-0009: tách Viewer/Admin và scheduler bền vững trước public; stage branch riêng trước video; ownership/cách ly trước multi-user.
- Tiếp tục structured commitments/nudges của API AI cũ; migration 0003 hiện lưu archive trải nghiệm học cư dân.

## Giới hạn vận hành
- Phiên có môi trường đã được update/publish (runtime revision 5). Đợt thành phố/tạo hình này bổ sung source và migration 0003 sau đó.
- Chưa có công cụ/credential deploy Sites hoặc kiểm tra automation production; không tạo lịch trùng, không đổi owner-private hay bật upload video.
- Daemon chỉ chạy khi process/môi trường còn sống; không có cam kết production 24/7.
- Bộ dataset archive chứa phản hồi mô phỏng, cần đánh giá chất lượng trước khi dùng fine-tune. Không tuyên bố mọi cư dân đã có cùng số mẫu học chỉ vì đều được khởi tạo policy.

## Mốc hardening/nội thất đã push — 25/10/2026
- Yêu cầu mới: luôn push các mốc source và bộ nhớ ngắn hạn; đã ghi vào AGENTS.md. Nhánh hiện hành `work`, remote qualife1291/AI-Living. Checkpoint 5b58c6e, b991c3e; mốc cuối xem git log.
- Đã sửa archive batch lớn (collector giữ 240 mới ngoài cap snapshot200), proposal basis revision/turnId, event duplicate, health503, context timeout/cache/relay, request polling; owner gate Worker và scheduled handler rules opt-in.
- Frozen dependencies, tsc/lint/12 suite cũ + test-hardening/build đạt. DB kiểm thử work/review-qa (0000–0003), API living/appearance/learning archive 240 mẫu/concurrency/proposal và built Worker admin403 đạt. Chromium desktop + mobile390: city/profile/interior/floor/no errors/no overflow đạt; ảnh thật docs/screenshots/hardening đã gửi trong chat.
- Nguồn tiếp nhận mới: docs/INTERIORS_AND_RELEASE.md. Nội thất mặt cắt3D, ba tầng chung template, cabin kiến trúc; chỉ bố trí cư dân thật tầng trệt. Tuổi hư cấu tăng theo simulation clock, không có family/birth/death. Chưa có indoor routing/elevator occupancy/call-serve-clean; tiếp tục ưu tiên các luồng đó rồi animation/weather/LOD/benchmark.
- Chưa deploy, chưa gắn cron, chưa đổi audience. Trước deploy cần cấu hình XOM_ADMIN_USER_ID qua cơ chế runtime và xác minh hosting identity headers; thiếu thì fail-closed403. XOM_LOCAL_ADMIN=true chỉ dành local, không đưa lên production. Scheduler chỉ rules, không Qwen24/7; chưa xác minh Sites cron. Bản production cũ chưa được kiểm tra.
- API/browser QA dùng DB fixture riêng tại port5174; port5175 test no-admin. Không sử dụng DB này làm dữ liệu thật. Build có cảnh báo chunkThree>500KB/static route classification; không có lỗi build.

## Đang chuẩn bị production và khảo sát map3D — 25/10/2026
- Người dùng đã yêu cầu setup/push prod và luôn ghi Git để phục hồi env. Site appgprj_6adc7dc364d48191a09202c5b43309e4 được xác nhận owner-private, live version5. Không tạo Site mới.
- Đã fetch source Sites qua credential ngắn hạn trong stdin, refs/remotes/sites/main=2d62353. Helper Sites không có trong filesystem/skill resources, dùng Git với ephemeral HTTP header (không lưu credential).
- Phát hiện journal chỉ 0000 trong khi SQL đã tới0003. Cần append journal/snapshot metadata để host áp dụng đầy đủ, không sửa SQL cũ. Sắp phát triển OSM3D snapshot độc lập, không đưa cư dân giả vào map thật.
- Automation cũ 6adcbdcc81cc819188a4a2ae65392369 hiện paused; không resume hoặc tạo trùng. Credential/runtime tokens không được lưu vào docs/release ledger.

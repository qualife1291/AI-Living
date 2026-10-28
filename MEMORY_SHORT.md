# Việc đang tiếp tục — 28/10/2026

- User đã cho phép tiếp tục các phase hợp lý trong file Gemini, merge/push main và phát hành một bản owner-private. Không hỏi lại quyền đã có. Push checkpoint work trước kiểm thử dài; chỉ merge main khi đã kiểm thử.
- Production bị chặn vì phiên không có native Sites get_site/credential/deploy/status/DB tools, kể cả sau restart. Câu hỏi bật kết nối đang chờ. Không tìm token cũ, tạo Site khác hoặc coi GitHub push là deploy. latest.json là ledger đã xác minh cuối, không phải readback live phiên này.
- Candidate đã đóng gói: source f0d2312446f4fb6e667942c945bf145c5d8c2f7c, work/production-f0d2312.tar.gz, SHA256 ce3903096b97349007a98ab954251720f5ae44ba0b8ff4ecd068471192eec017. Nó chứa phase D đã kiểm thử, chưa chứa home anchors. Main ed288bd ghi candidate; work đã đi tiếp. Phải làm candidate exact-SHA mới sau khi chốt các phần tiếp theo.
- Tiếp theo: skill vector/hierarchy/P2P có provenance; completion/playback đa viewer; density/LOD, traffic graph/boarding/indoor; habitat/flora/audio; benchmark runtime thật. Xem docs/GEMINI_REVIEW_2026-10-28.md. Không nhận metrics demo Gemini thành bằng chứng.
- Giữ only3D/tag/pet/bike/overlays, mọi ID/history/memory/home/petOwners. Không reset DB, sửa migration đã áp dụng, paid API/public/video/cron trùng. Mọi production migration cần backup/readback native. Không gọi ETA/client receipt là physical completion authoritative.
- Hardware GPU, soak dài, model A/B thực/LoRA và lịch production cần capability thật. Preview dùng SwiftShader/fixtures, API persistence kiểm riêng bằng D1 local. Sau build phải khởi động fresh Worker và không rebuild khi browser QA đang chạy.

- Source mới audio opt-in đã qua check/lint/build/API và browser Web Audio thật desktop/mobile/320px/unsupported. Đang chốt final source có thêm fix daemon không gửi lại proposal đã bị review bác và server reviewNarrative. Còn full45/build/API/hồi quy browser trên compiled source cuối, log /tmp/final-next-*; chưa merge main hoặc tạo candidate mới cho các thay đổi sau f0d2312.

- Guard mới sau browser build: server bác proposal nếu plan không có encounter (đang bận/ngủ); API fixture chuyển đồng hồ cố định trong entry in-memory riêng, kiểm cả ban ngày/busy/night. Còn build/API cuối cho guard này, không sửa UI sau browser. NEXT_PHASES.md ghi rõ phần chưa triển khai; không coi thiếu Sites là blocker của mọi backlog source.

- Tiếp tục sau môi trường unavailable: checkout/node_modules/dist còn, /tmp logs cũ mất. Remote main vẫn sau work 7 commit; không có code agent khác mới khi fetch. Thay đổi chưa commit duy nhất là negative context-cache fixture để API test busy/night không gọi upstream sau clock advance. Đang chạy lại check/build/API và 45 suite để chốt main/candidate. Native Sites vẫn chưa có trong tool catalog.

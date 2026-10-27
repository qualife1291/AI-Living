# Việc đang tiếp tục — 28/10/2026

- User đã cho phép tiếp tục các phase hợp lý trong file Gemini, merge/push main và phát hành một bản owner-private. Không hỏi lại quyền đã có. Push checkpoint work trước kiểm thử dài; chỉ merge main khi đã kiểm thử.
- Production bị chặn vì phiên không có native Sites get_site/credential/deploy/status/DB tools, kể cả sau restart. Câu hỏi bật kết nối đang chờ. Không tìm token cũ, tạo Site khác hoặc coi GitHub push là deploy. latest.json là ledger đã xác minh cuối, không phải readback live phiên này.
- Candidate đã đóng gói: source f0d2312446f4fb6e667942c945bf145c5d8c2f7c, work/production-f0d2312.tar.gz, SHA256 ce3903096b97349007a98ab954251720f5ae44ba0b8ff4ecd068471192eec017. Nó chứa phase D đã kiểm thử, chưa chứa home anchors. Main ed288bd ghi candidate; work đã đi tiếp. Phải làm candidate exact-SHA mới sau khi chốt các phần tiếp theo.
- Tiếp theo: skill vector/hierarchy/P2P có provenance; completion/playback đa viewer; density/LOD, traffic graph/boarding/indoor; habitat/flora/audio; benchmark runtime thật. Xem docs/GEMINI_REVIEW_2026-10-28.md. Không nhận metrics demo Gemini thành bằng chứng.
- Giữ only3D/tag/pet/bike/overlays, mọi ID/history/memory/home/petOwners. Không reset DB, sửa migration đã áp dụng, paid API/public/video/cron trùng. Mọi production migration cần backup/readback native. Không gọi ETA/client receipt là physical completion authoritative.
- Hardware GPU, soak dài, model A/B thực/LoRA và lịch production cần capability thật. Preview dùng SwiftShader/fixtures, API persistence kiểm riêng bằng D1 local. Sau build phải khởi động fresh Worker và không rebuild khi browser QA đang chạy.

- WIP Phase E audio: nút Âm thanh thiên nhiên opt-in, synth Web Audio gió/mưa/chim; không context trước click, pause/hidden/OSM suspend, off/unmount dispose. Check/lint đã đạt; còn build, browser lifecycle thật/320px/API và full source QA trước merge. Harness scripts/qa-soundscape.py. Không nhận nghe/độ trễ phần cứng đã kiểm chứng.

# Việc đang tiếp tục — 28/10/2026

- User đã cho phép tiếp tục các phase hợp lý trong review Gemini, merge/push main và một bản owner-private. Push checkpoint work trước bước dài, chỉ gộp main khi đã kiểm thử.
- Native Sites get_site/credential/deploy/status/DB tools vẫn không có trong phiên. Không tìm token cũ, tạo Site khác hoặc coi GitHub push là deploy. latest.json chỉ là deploy ledger đã xác minh cuối, chưa readback live lại.
- Đang gộp nguồn đã kiểm thử 9f60f5b và đóng gói candidate exact-SHA mới. Candidate.json hiện vẫn chỉ gói cũ f0d2312 (42 suite, chưa có cửa nhà/policy storage/audio). Đọc candidate.json sau checkpoint để lấy gói mới; không deploy nhầm gói cũ.
- Tiếp theo theo docs/NEXT_PHASES.md: completion/playback theo ground, vector kỹ năng/hierarchy/P2P có provenance, RAG/export/context cards 33 nơi, density/LOD/traffic/indoor, habitat/flora. Thiếu Sites chỉ chặn production, không chặn các việc source độc lập.
- Giữ only3D/tag/pet/bike/overlays, IDs/history/memory/home/petOwners. Không reset DB, sửa migration đã áp dụng, paid API/public/video/cron trùng. Production migration 0006/0007 cần backup và readback đúng project.
- Hardware GPU, soak dài, real model A/B/LoRA và ops cần bằng chứng riêng. Browser SwiftShader dùng fixture; API persistence bằng D1 cô lập. Sau build phải khởi động fresh Worker, không rebuild giữa browser QA.

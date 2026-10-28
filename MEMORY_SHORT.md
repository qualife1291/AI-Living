# Việc đang tiếp tục — 28/10/2026

- User đã cho phép tiếp tục các phase hợp lý trong review Gemini, merge/push main và một bản owner-private. Push checkpoint work trước bước dài, chỉ gộp main khi đã kiểm thử.
- Native Sites get_site/credential/deploy/status/DB tools vẫn không có trong phiên. Không tìm token cũ, tạo Site khác hoặc coi GitHub push là deploy. latest.json chỉ là deploy ledger đã xác minh cuối, chưa readback live lại.
- Candidate mới đã đóng gói từ main/work source e90021b72806c780d385111b846f30bb1de6460e: work/production-e90021b.tar.gz, SHA256 2f2461830b98887f7512cee8c46e640cb18b781077e68104c8099cf6edf6e5da. Xem docs/releases/candidate.json và 2026-10-28-candidate.md. Đây là prepared-not-deployed, gói cũ f0d2312 không dùng mặc định.
- Tiếp theo theo docs/NEXT_PHASES.md: completion/playback theo ground, vector kỹ năng/hierarchy/P2P có provenance, RAG/export/context cards 33 nơi, density/LOD/traffic/indoor, habitat/flora. Thiếu Sites chỉ chặn production, không chặn các việc source độc lập.
- Giữ only3D/tag/pet/bike/overlays, IDs/history/memory/home/petOwners. Không reset DB, sửa migration đã áp dụng, paid API/public/video/cron trùng. Production migration 0006/0007 cần backup và readback đúng project.
- Hardware GPU, soak dài, real model A/B/LoRA và ops cần bằng chứng riêng. Browser SwiftShader dùng fixture; API persistence bằng D1 cô lập. Sau build phải khởi động fresh Worker, không rebuild giữa browser QA.

- Domain skills source đã qua46/check/lint/build/API/browser desktop/mobile/320px/social6/F5. Kết quả chuyển MEMORY_LONG/PHASE_D; candidate e900 chưa chứa domain. WIP tiếp theo: context cards49/33places + strict selection/source/season activation và daemon grounding; còn unit context/full47/check/lint/build/API. Không gọi card biên tập là thực tế đã quan sát.

- Context cards49/33places đã qua47/check/lint/build/API. Nguồn editorial và phase/weather khớp payload; strict location/date/fresh origin được kiểm tra. Xem CONTEXT_AND_MEMORY. RAG WIP mới: daemon retrieve đúng hai actor, 3record/người, 400char, giữowner/source; denied không snapshot fallback, unavailable chỉ own summaries. Targeted helper/daemon tests đạt; còn full48/check/lint/build/API. Main/candidate vẫn mốc0992549/e900 trước domain/context/RAG.

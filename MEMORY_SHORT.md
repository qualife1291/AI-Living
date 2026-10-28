# Việc đang tiếp tục — 28/10/2026

- User cho phép tiếp tục phase hợp lý, merge/push main và một bản owner-private. Không hỏi lại quyền đã có; push checkpoint trước bước dài.
- Native Sites credential/deploy/status/DB tools vẫn chưa có. Không tìm token cũ, tạo Site khác hoặc coi GitHub push là deploy. latest.json là ledger đã xác minh cuối, chưa readback live lại.
- Đang gộp source50 flora đã kiểm thử lên main và đóng gói exact-SHA candidate mới. Candidate.json cho tới ledger update vẫn da1bfd6 (49 suite, chưa flora); xem candidate.json sau checkpoint để tránh dùng gói cũ.
- Backlog ở NEXT_PHASES: ground completion/playback đa viewer; hierarchy/P2P có provenance; backfill/export; LocalSceneContext actual props; density/LOD/traffic/indoor; loài/habitat/cây lớn/thu hoạch; model A/B và hardware/soak. Flora foundation không đồng nghĩa hoàn tất toàn bộ Phase E hoặc NPC đã chăm cây.
- Giữ3D/tag/pet/bike/overlays, IDs/history/memory/home/petOwners/policy. Không reset DB, sửa migration cũ, paidAPI/public/video/cron trùng. Native production cần backup/schema/migration0006/0007/readback; flora chỉ metadata optional không migration mới. Thiếu Sites không chặn việc source độc lập.

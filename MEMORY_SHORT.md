# Việc đang tiếp tục — 28/10/2026

- User đã cho phép tiếp tục phase hợp lý từ Gemini, merge/push main và một bản owner-private. Không hỏi lại quyền đã có. Push checkpoint trước bước dài.
- Native Sites credential/deploy/status/DB tools vẫn chưa có trong phiên; không tìm token cũ hoặc tạo Site khác. latest.json chỉ là ledger deploy đã xác minh cuối, chưa readback live lại.
- Candidate mới source da1bfd6c6be80324a29b43a28497837a40ddcfed đã push main/work và đóng gói: work/production-da1bfd6.tar.gz, SHA256 84f983e2de2c112d7fff9a1deeb92c3228447a8b4d9190ed9ab9abefaa73021d. Xem docs/releases/candidate.json và ledger28/10. Đây là prepared-not-deployed; e90021b là gói cũ, không dùng mặc định.
- Backlog thực ở NEXT_PHASES: ground completion/playback đa viewer; hierarchy/P2P có provenance; backfill/export SFT/DPO đúng prompt; LocalSceneContext actual props; density/LOD/traffic/indoor; habitat/flora; model A/B và hardware/soak. Nền tảng49 đã qua unit/check/lint/build/API, UI domain/social đã có preview desktop/mobile/F5/320px; xem MEMORY_LONG.
- Giữ3D/tag/pet/bike/overlays, IDs/history/memory/home/petOwners. Không reset DB, sửa migration cũ, paidAPI/public/video/cron trùng. Native production cần backup/schemacheck/migration0006/0007/readback; thiếu Sites không chặn source độc lập.

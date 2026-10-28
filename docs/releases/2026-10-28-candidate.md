# Candidate chuẩn bị — chưa deploy

Candidate hiện hành là source da1bfd6 bên dưới và candidate.json. Mốc e90021b là lịch sử trước phần tiếp nối.

- Source `e90021b72806c780d385111b846f30bb1de6460e` đã push work và main. Gói `work/production-e90021b.tar.gz` có SHA256 `2f2461830b98887f7512cee8c46e640cb18b781077e68104c8099cf6edf6e5da`, được release:build/package từ checkout sạch.
- 45/45 unit, check/lint/build/assets và API compiled D1 đạt. Bảy browser harness ở mốc UI cuối trước đó đã đạt desktop/mobile; renderer/UI không đổi sau đó, ảnh/metrics đã tracked. Guard busy/night và fixture cache vừa kiểm tra lại sau môi trường restart.
- Bao gồm cửa nhà, policy storage 0007, audio và model review/fallback. Archive có migration 0007 và không có secrets/DB/fixture entry. Phải kiểm tra schema live/backup trước áp dụng 0006/0007, không reset.
- Không có native Sites credential/deploy/status/DB tools trong phiên. Không tạo version/deployment hoặc đọc live. latest.json giữ ledger deploy đã xác minh cuối; chưa khẳng định trạng thái production hiện tại từ ledger đó.
- Gói cũ f0d2312 vẫn là lịch sử, không dùng mặc định. Những thay đổi source tiếp nối sau SHA trên không nằm trong gói này.

## Candidate tiếp nối — da1bfd6

- Source `da1bfd6c6be80324a29b43a28497837a40ddcfed` đã push main/work. Gói `work/production-da1bfd6.tar.gz`, SHA256 `84f983e2de2c112d7fff9a1deeb92c3228447a8b4d9190ed9ab9abefaa73021d`, release build/package từ checkout sạch; manifest/source stamp/migration0007 và loại secrets/DB/test-entry đã kiểm tra.
- 49/49unit/check/lint/build/API đạt. Bao gồm tám domain skills/legacy gates,49context cards/33venues, private RAG local daemon và plan-binding/full-duration/outcome-bound narrative report. RAG là source workflow local; không bật Qwen/cron trong Worker.
- Fresh browser domain/social/F5/320px source48 đã đạt; source49 không đổi UI/renderer, thêm backend identity/reporting đã có regression before-fail/after-pass và HTTP D1. Các browser/asset evidence khác giữ từ milestone trước, không claim GPU thật.
- Chưa deploy/readback production vì native Sites tools vẫn không có. latest.json không đổi; schema live và full backup phải được xác minh trước 0006/0007/deploy. Không sinh version/deployment ID giả.

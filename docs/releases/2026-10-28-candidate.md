# Candidate chuẩn bị — chưa deploy

- Source `e90021b72806c780d385111b846f30bb1de6460e` đã push work và main. Gói `work/production-e90021b.tar.gz` có SHA256 `2f2461830b98887f7512cee8c46e640cb18b781077e68104c8099cf6edf6e5da`, được release:build/package từ checkout sạch.
- 45/45 unit, check/lint/build/assets và API compiled D1 đạt. Bảy browser harness ở mốc UI cuối trước đó đã đạt desktop/mobile; renderer/UI không đổi sau đó, ảnh/metrics đã tracked. Guard busy/night và fixture cache vừa kiểm tra lại sau môi trường restart.
- Bao gồm cửa nhà, policy storage 0007, audio và model review/fallback. Archive có migration 0007 và không có secrets/DB/fixture entry. Phải kiểm tra schema live/backup trước áp dụng 0006/0007, không reset.
- Không có native Sites credential/deploy/status/DB tools trong phiên. Không tạo version/deployment hoặc đọc live. latest.json giữ ledger deploy đã xác minh cuối; chưa khẳng định trạng thái production hiện tại từ ledger đó.
- Gói cũ f0d2312 vẫn là lịch sử, không dùng mặc định. Những thay đổi source tiếp nối sau SHA trên không nằm trong gói này.

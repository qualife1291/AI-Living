# Candidate chuẩn bị — chưa deploy

Candidate hiện hành là sourcee6fe888 bên dưới và candidate.json. Các mốc trước giữ làm lịch sử; không dùng mặc định.

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

## Candidate flora — c77c21c

- Source `c77c21cdaf4d0a893976443b479919b8e3186f0a` đã push main/work. Gói `work/production-c77c21c.tar.gz`, SHA256 `34cbc9d713f9876926f8403e45d255e032a1d3b182f954c8f4f4854309b19a60`, exact-SHA build/package từ checkout sạch; source stamp/0007/không secrets hoặc DB/test-entry đã kiểm tra.
- 50unit/check/lint/build/API D1 đạt. 5plots/30plants/5phases, persisted owner care/CAS và2batches trong footprint cũ. Fresh browser gardens/social/home/cycle/pet đạt desktop/mobile, ảnh preview đã gửi; care mock trong browser và persistence kiểm bằng D1 riêng.
- Flora metadata optional không migration mới. Vẫn cần backup/schema live cho0006/0007 và native deploy/readback; không deploy hoặc thay latest.json trong phiên vì không có Sites tools.

## Candidate H0 — 383ec11

- Source `383ec115a883d7d1c2caee6c23cd2fe194c28aa2` đã push main/work. Gói `work/production-383ec11.tar.gz`, SHA256 `6506f9a641ab0a3358ec1149d617691dd81f8b127107ad46e941437a3220d19b`, exact-SHA release build/package từ checkout sạch, source stamp `2026-10-28T03:00:15.028Z`. App/lib tree trùng nguồn51suite/API đã kiểm; archive796entries có0007 và không có secrets/DB/test-entry theo tên.
- 51/51unit/check/lint/build/assets/API đạt; D1 admission20request→1pipeline/19coalesced, compiledHTTP12viewer→1pipeline, retry không audit trùng, pause/error/expiry/nonce đạt. GETdiagnostics chỉđọc, healthschema batch503/200 và preservation đạt. Fresh localWorker health200/ready/revision0; khôngproduction.
- Bao gồm toàn bộ flora và nội dung candidate trước. UI/renderer không đổi trong H0; browser flora sourcec77 vẫn là evidence trước đó, không claim browser H0 mới. ReviewClaude đã đưa H1/G0/UX và các phase có điều kiện vào NEXT_PHASES.
- H0 khôngmigration mới, không thay scheduler/audience hoặc xóa lịch sử. Chưa nativeSites/backup/liveSchema/deploy/readback; latest.json giữ nguyên. Giữclientfallback đến khi xác minh lịchproduction, không tạocron trùng.

## Candidate H1 — e6fe888

- Source `e6fe88804f262bc7f7cacfa2813128454eceada4` đã push main/work; exact-SHA release build/package từ checkout sạch. Gói `work/production-e6fe888.tar.gz`, SHA256 `9b1fcc5c0f8b92a8f95b6da387e5e845726be0bc7bbc0c8bbec01b69f5e034ea`, stamp `2026-10-28T04:01:10.795Z`; kiểm source/migration0007, không secrets/DB/test-entry theo tên.
- 52/52suite/check/lint/build/assets/API đạt;15.375outcomes/1.500choices golden giữ nguyên. Full20seed×60ngày×24agent/policy và repeat cùng hash; paired CI giữ cả kết quả LinUCB chưa thắng tổng reward. Không đổi default policy hoặc thêm migration.
- Review Claude/Deepseek đã đưa vào ROADMAP, tiếpH2 stress/cold-start rồi residual/prior theo cổng đo. UI không đổi; không claim browser mới hoặc training LLM.
- Native Sites credential/deploy/status/DB tools vẫn không có khi discovery lượt này. Chưa backup/schema live/deploy/readback; latest.json giữ nguyên, owner-private.

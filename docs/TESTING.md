# Kiểm thử và bằng chứng

`scripts/unit-suites.json` là danh sách suite hiện hành; `npm run test:unit` dùng process độc lập, tối đa 4 workers, thu đủ lỗi thay vì fail-fast. `XOM_TEST_JOBS=1` chạy tuần tự. Mốc H10 có57suite đã đạt; đây không phải kết quả chạy mới mỗi khi sửa tài liệu.

## Chọn kiểm tra theo thay đổi

| Thay đổi | Kiểm tra |
|---|---|
| Chỉ tài liệu/comment | Liên kết/path/anchor, tham chiếu file đã xóa, `git diff --check`; nếu đổi danh sách ZIP phải tạo/verify ZIP thật. Không cần chạy lại toàn ứng dụng. |
| Simulation/learning | Suite trực tiếp và full unit, TypeScript/lint; API compiled D1 khi đổi persistence/guards/CAS. |
| Renderer/UI/assets | Unit geometry/nav/lifecycle, TypeScript/lint/build/assets; browser desktop/mobile, pause/resume/poll/resize/context loss và ảnh thật. |
| Release | Full gates bên dưới, exact-SHA package, backup/live schema/native deploy/readback theo [runbook](PRODUCTION_RUNBOOK.md). |

```bash
npm run test:unit
npm run check
npm run lint
npm run assets:check
npm run build
npm run test:api:local
```

Unit dùng memory/fixtures/D1 cô lập, không production. Có core/schema/time, learning/social/domain/plan-completion, ground/traffic/camera/household, geometry/assets/rigs, security/telemetry/pulse-gate. `node scripts/run-unit-tests.mjs --list` liệt kê đầy đủ, không cần chép danh sách tên vào docs.

API dùng Worker mới build và D1 riêng: owner/origin/schema/bytes, pet/flora/CAS/history, policy/memories/actor privacy, proposal guards, pulse 12 viewer không audit trùng, diagnostics GET chỉ đọc/POST retention và health schema. D1 gate suite riêng kiểm 20 request→1 pipeline, pause/failure/expiry/nonce/cadence. Không gọi đây là production load/billing benchmark.

## Browser

Restart Worker từ `dist/server/wrangler.json` sau build. `QA_BASE` bắt buộc loopback; không gửi localhost làm link preview cho người dùng. Ví dụ lệnh nội bộ: `QA_BASE=http://127.0.0.1:5320 python3 scripts/qa-social.py`.

| Harness trong scripts/ | Điều phải giữ |
|---|---|
| qa-social.py | Đủ 6 lượt, luân phiên/poll/F5/source badge/camera. |
| qa-overlays-households.py | Tên dài/câu 240 ký tự, pill/occlusion/click, hồ sơ và 320px. |
| qa-cycle.py, qa-tag.py | Full bike/ground/pause/dismount, đổi vai/no teleport/cancel. |
| qa-three-only-pets.py | Follow/pause/assignment/wardrobe/OSM, hide/resize, WebGL loss/retry/no2D. |
| qa-home-anchors.py | 60 cửa/đích riêng/địa chỉ/camera desktop/mobile. |
| qa-gardens.py | 5 phase/care/pause/framing/CAS/errors/320px. |
| qa-domain-skills.py | 8 domain/4 gate/legacy/no overflow. |
| qa-soundscape.py | Gesture opt-in, signal thật, pause/hidden/OSM/off/unmount/unsupported. |
| qa-resource-gallery.py | 19 mẫu/15 pack, texture/clip, selection race/load retry/pause/dispose. |

Ảnh và metrics ở [screenshots](screenshots/), bằng chứng máy đọc ở [validation](validation/). Browser có thể mock mutations; persistence phải kiểm D1 riêng. Gửi ảnh QA thực cho người dùng, ghi preview local hay production. Ảnh AI/asset preview không thay QA; SwiftShader và synthetic 240 không chứng minh hardware FPS/pin/nhiệt/density live hoặc soak 24 giờ.

[LEARNING](LEARNING.md) mô tả benchmark policy runtime; không phải model A/B hoặc bằng chứng ngữ nghĩa. Không tự chạy `test-world.mjs`/`verify-live.py` hay fixtures lên production.

## Learning rollout

`node scripts/test-learning-policy.mjs` kiểm golden trước refactor, outcome/purity/gates, oracle/drift, determinism/censoring/CI/seed alignment. `npm run simulate:learning` và `scripts/compare-learning.mjs` chạy offline; profile/limits/hash và kết quả ở [LEARNING](LEARNING.md). CLI từ chối ghi đè baseline khác và so sánh report sai checksum. Không đưa rollout/synthetic outcomes vào DB thật. H2 thêm `test-residual-policy.mjs`: ownership/completion/replay/checkpoint, raw models/skills không đổi, EMA shift, prior không tạo samples, cap không chặn emergency, cold-stress và H1 row giữ nguyên. Evidence H2 ghi full repeat byte/hash, prior checksum/profile/seed-overlap và immutable-output CLI guards; negative result không cho phép tự bật policy.

H3 `test-reward-evidence.mjs` kiểm settlement khác decision state, đầy đủ duration/key/legacy, saturation và negative outcome, actor/context/version/domain tamper, replay và inspector không backfill/ghi đè/lộ raw record kể cả JSONL lỗi. Compiled API kiểm evidence trong archive/JSONL, legacy bytes giữ nguyên và hai request học cạnh tranh chỉ tạo một sample/receipt/archive. Golden và full H1 hash phải giữ nguyên. Kết quả thực tế từng mốc nằm trong validation JSON, không suy từ tên suite.

H4 `test-hierarchical-prior.mjs` kiểm source/version/catalog/signature/support/SPD, ownership/monotonic samples/dedup, compiler không bị input sửa, bounded confidence/fallback, giữ raw personal models/skills và emergency/gates. CLI kiểm seed/profile/checksum/immutable output; wrapper giữ H1/H2 default reports. [Protocol](validation/learning-h4-protocol-v1.json) cố định trước kết quả; artifact/reports/same-decision MSE/paired gates/repeats ở [evidence](validation/learning-h4-2026-10-28.json). Không gọi donor support là earned samples hoặc tắt guard để cải thiện benchmark.

H6 `test-outcome-replay.mjs` kiểm actor filter trước audit, exact duplicates/conflicting IDs hoặc actor+sample, ledger thời gian/gaps, legacy/weak/version/context, one-pass/SPD/counts, compiler isolation và fallback personal sau24plan. CLI hash-pinned/ignored-output/exclusive-create/source preservation/JSONL error privacy và synthetic deterministic replay được kiểm trực tiếp. Compiled local API kiểm JSONL thật→replay đúng actor, không ghi DB/tăng own samples. [Protocol](validation/learning-h6-protocol-v1.json) cố định trước đo; full repeats, ridge order agreement và holdout gates ở [evidence](validation/learning-h6-2026-10-28.json). Không suy curriculum làm ridge tốt hơn từ roundoff.

H10 `test-bounded-search.mjs` kiểm miền tham số, grid/budget/seed isolation, deterministic ranking và đa dạng window, effect gate cho forced-only control, validation không thêm candidate, source checksum admission và không chép donor state. Negative control warm6 phải giữ raw trajectory bằng baseline; proxy/full/8seed-validation/20seed-holdout phân biệt rõ. [Protocol](validation/learning-h10-protocol-v1.json) được amend effect gate trước search, không sau kết quả. [Evidence](validation/learning-h10-2026-10-28.json) kiểm parent/case hashes, no-selection stop thật với0holdout plans và repeats; không gọi no-op là policy tốt hơn.

## ZIP source

Sau commit/push: `python3 scripts/package-handoff.py /tmp/xom-ai-source.zip`. Script quét credential patterns/exclusions, kiểm required files, manifest/hash từng file và đọc lại ZIP. Gói này khác production archive. `TRANSFER_MANIFEST.json` được sinh ở repo để đóng gói; không commit file sinh ra hoặc ZIP/DB/cache.

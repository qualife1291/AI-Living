# Kiểm thử và bằng chứng

`scripts/unit-suites.json` là danh sách suite hiện hành; `npm run test:unit` dùng process độc lập, tối đa 4 workers, thu đủ lỗi thay vì fail-fast. `XOM_TEST_JOBS=1` chạy tuần tự. Mốc H3b có70suite đã đạt; đây không phải kết quả chạy mới mỗi khi sửa tài liệu.

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
npm run test:api:ground
npm run test:api:shared-ground
npm run test:api:legacy
node scripts/test-chat-admission-api.mjs
npm run audit:learning-evidence
```

Unit dùng memory/fixtures/D1 cô lập, không production. Có core/schema/time, learning/social/domain/plan-completion, ground/traffic/camera/household, geometry/assets/rigs, security/telemetry/pulse-gate. `node scripts/run-unit-tests.mjs --list` liệt kê đầy đủ, không cần chép danh sách tên vào docs.

`test:api:legacy` chạy thêm các hợp đồng HTTP world/living/learning/liveness/appearance/proposal, mỗi script có D1 mới đủ migration và clock fixture riêng; không dùng DB của preview/người dùng. `audit:learning-evidence` kiểm checksum và tính lại các comparison H2/H4/H6/H10 từ report đã đóng băng; không sinh rollout mới hoặc mở outcome holdout12000–12019.

API dùng Worker mới build và D1 riêng: owner/origin/schema/bytes, pet/flora/CAS/history, policy/memories/actor privacy, proposal guards, pulse 12 viewer không audit trùng, diagnostics GET chỉ đọc/POST retention và health schema. Health có8table probes+latest tick trong một batch; backfill schema0008 được kiểm thiếu→503/đủ→ready, world giữ nguyên. D1 gate suite riêng kiểm 20 request→1 pipeline, pause/failure/expiry/nonce/cadence. Không gọi đây là production load/billing benchmark.

## Browser

Restart Worker từ `dist/server/wrangler.json` sau build. `QA_BASE` bắt buộc loopback; đặt `QA_OUT` để lưu ảnh/metrics một lượt nghiệm thu riêng và giữ bằng chứng cũ; không gửi localhost làm link preview cho người dùng. Ví dụ lệnh nội bộ: `QA_BASE=http://127.0.0.1:5320 python3 scripts/qa-social.py`.

| Harness trong scripts/ | Điều phải giữ |
|---|---|
| qa-chat-admission.py | HTTP429 giữ draft/focus, không tự retry, hồi phục khi chủ động gửi lại; desktop/mobile, không overflow. Mock UI writes; quota/rollback kiểm riêng trên compiled D1. |
| qa-g0-ux.py | Gzip/canonical fallback, pause403/409/5xx/network/ACK, chat focus/draft, keyboard,320px, presets/resize/hidden/context loss/retry và reduced-motion. |
| qa-shared-ground.py | Hai shared viewer desktop/mobile mở lệch giờ, cùng absolute sample roots, camera/F5/pause, no extrapolation, ảnh thật; synthetic source và D1 riêng. |
| qa-loading.py | Compiled loopback build,3 cold-page repeat/viewport, network profile cố định, bytes/first-frame và asset completeness; `QA_BEFORE` tùy chọn phải là build khác nếu so sánh. Một build không chứng minh cải thiện/SLA thiết bị thật. |
| qa-social.py | Đủ 6 lượt, luân phiên/poll/F5/source badge/camera. |
| qa-overlays-households.py | Tên dài/câu 240 ký tự, pill/occlusion/click, hồ sơ và 320px. |
| qa-cycle.py, qa-tag.py | Full bike/ground/pause/dismount, đổi vai/no teleport/cancel. |
| qa-three-only-pets.py | Follow/pause/assignment/wardrobe/OSM, hide/resize, WebGL loss/retry/no2D; ≥80% sample có cả inFrame+sightline qua cây/building. Fixture bootstrap có thể chưa sát caretaker: giữ seed, gap<120 và đóng về<55 cuối cửa sổ12s; ghi initial/final gap, không teleport để ép đạt. |
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

G0 `test-g0-ux.mjs` kiểm giải nén byte-identical cho26model, corruption/missing/abort canonical fallback và disposed không retry, pixel budget đến8K, pause HTTP/ACK/network, deadline signal và không tự gửi lại write. Mocks cũ pause phải trả `{ok:true}` như endpoint thật. Browser/metrics và so sánh tải ở [g0 evidence](validation/g0-ux-2026-10-28.json); không dùng timings local hay SwiftShader để kết luận hardware FPS.

H6b `test-bulk-replay.mjs` đối chiếu full artifact với H6 single-file trên virtual concatenation; cross-file duplicates/legacy conflicts/sample/time neighbors, Unicode/CRLF/empty file, malformed UTF8 và record/byte/line budgets thật. Có1440accepted/49batch/mid-file resume/oracle,100k scanned-record limit, SQL rollback sau final-artifact writes, SIGKILL thật trước COMMIT rồi recover/CAS, writer cạnh tranh, source/manifest/checkpoint tamper, symlink/hardlink/unrelated DB guard, export exclusive và lỗi không echo private text. API compiled đọc JSONL phân trang thật→bulk/resume/export, so oracle và kiểm world/history/memories/earned policy giữ nguyên. [Evidence H6b](validation/learning-h6b-2026-10-28.json) là kiểm đúng dữ liệu/transaction, không là rollout policy, throughput SLA, power-loss hoặc production QA. App/renderer/runtime/schema không đổi nên không có browser run mới.

Memory backfill `test-memory-backfill.mjs` kiểm source recipient/evidence, ID+semantic reconciliation/legacy preservation, preview zero-write, source/memory/world/range phantom CAS, concurrent/lost-ACK retry, receipt integrity, budgets/client ACK/privacy. SQLite native trigger abort/ignore/edit-world/edit-existing chứng minh rollback thật;123source/18batch thêm40row, giữ16cũ và rescan thêm0. API Worker compiled lặp owner+local/remote/body/UTF8/schema guards, historical episode/outcome backfill, concurrent requests và silent-ignore D1 rollback; giữ world/revision/archive/policies/memory cũ. Migration0008 chỉ test trên DB cô lập; không browser mới vì UI không đổi. [Evidence](validation/memory-backfill-2026-10-28.json).

Curation `test-dataset-curation.mjs` kiểm exact request/context/model/sampling/review SHA, explicit semantic checklist, actual proposal/narrative guards, actor filter trước audit và own-memory/fact scope. Có6fixture biên tập/6pair, loại không review/heuristic labels, source-kind/provenance mismatch, duplicates/ID conflict/contradictory review, connected groups và train-only selection;100scene test đủ ba partition và loại cả nhóm target. Artifact tự tính lại hash vẫn phải qua admission/rebuild exports. CLI process thật kiểm preview zero-write, export600/atomic/exclusive, source/hash/UTF8/BOM/record/byte caps, symlink parent trước mkdir, existing symlink/hardlink/output giữ nguyên và không echo private text/path. Fixture5train/0validation/1holdout đều đã review, không là blind model evaluation. Offline-only, không persistence/UI/schema đổi; build kiểm code/compiler/fixtures không vào Worker, không cần browser mới. [Evidence](validation/dataset-curation-2026-10-28.json).

Ground `test-ground-timeline.mjs` kiểm600fixed ticks vs6chunk bằng nhau,423moving peer sweeps bằng oracle, static segment/speed cap, plan baseline/replacement/unsupported/late/expired không bịa arrival, backlog/pause/rewind/born và segmented speed/pause/resume. Native SQLite kiểm status/preview zero-write, exact world/session CAS, concurrent/lost-ACK operation, receipt tamper kể cả rehash, ignore session INSERT/UPDATE hoặc receipt INSERT rollback cả cursor/ledger, source race và giữ world/memory/history/policy. `test:api:ground` chạy Worker compiled+D1 cô lập: owner/local/remote/origin/UTF8/bytes/schema, thiếu0009 không bootstrap, server plan→600step→1arrival, concurrent one commit, status readers và silent receipt ignore D1 rollback thật. Migration0009 chỉ fixture; chưa prod/migrate DB người dùng. Shared A* normalized source giữ byte-identical ngoài logger callback;1089route/5401frame regression đạt, UI/renderbehavior không đổi nên không browser mới. [Evidence](validation/ground-timeline-2026-10-28.json).

GND2 `test-shared-ground.mjs` kiểm replay capture-boundary theo chunk/resume, source plan replacement/removal, roster enter/leave, accepted pause/scale clock,246actor+12car occupancy, bike/tag/pet checkpoint và physics budgets. Native SQL kiểm immutable journal atomic cùng world, source error rollback writer, no-op lost ACK/concurrent one commit/CAS, ignored session/receipt rollback. Pure sampling cùng absolute time, no extrapolation và giữ whole frame khi roster/body đổi. Compiled D1 `test:api:shared-ground` lặp guards/missing0010/no-bootstrap/atomic sources/world readback/rollback và reuse pulse; existing API/GND1 cũng đạt. Browser hai viewer thực desktop/mobile trên build mới, mock source frames riêng, camera/F5/pause/hold và overflow; không gọi đây là production/GPU/soak. Gói prod từ build sạch chặn cache `.wrangler`, fixture/DB/private sources và kiểm lại source/migration0010/26gzip bytes. [Evidence](validation/ground-shared-2026-10-28.json).

Studio: `npm run simulate:living` kiểm 28.804 frame logic; `node scripts/test-studio-quality.mjs` kiểm model rig/tay thật, tiếp xúc đạo cụ, seek/replay và hash 21 voice clip. `QA_BASE=http://127.0.0.1:PORT QA_OUT=work/studio python3 scripts/qa-studio.py` kiểm cả4 cảnh desktop/mobile trên build mới; có thể đặt `QA_SCENARIOS=kitten-care` khi chỉ cảnh này đổi. Chạy thêm `node --experimental-transform-types scripts/test-studio-sound.mjs` cho lifecycle/stop-order contract và `scripts/qa-studio-sound.py` để đo AudioContext thật, pause/seek/hidden/unmount và lỗi tải clip. Đây là mô phỏng biên tập, không ghi world, không chứng minh quality LLM/GPU/mobile FPS hay human listening/MOS.

GND3: `test-ground-authority.mjs` chạy observer trên GND2 physics thật, kiểm chunk/resume, clock bridge, arrival/presence/window/cancel, đủ3000ms+LOS, explicit emission và chỉ named listener sau toàn bộ câu. Planned/partial/cancelled text không cấp heard; baseline/legacy/transit/clock mismatch/third speaker và tọa độ ngoài accepted Walk state bị loại. `test-ground-authority-all-actors.mjs` kiểm243human kể cả ngoài renderer subset. `test-ground-authority-store.mjs` kiểm native SQLite cùng CAS hai ledger, immutable receipts, concurrency, lost ACK, bốn silent-ignore rollback và preflight trước world write; CLI status mặc định, loopback/ACK/byte caps. `test-ground-authority-view.mjs` kiểm DTO parent/source/time và sample không sửa roots.

`npm run test:api:authority` dùng **Worker build mới + D1 tạm**: owner/local/remote/origin/UTF8/2KiB, thiếu0011 không bootstrap hoặc ghi dở, explicit baseline start, actual replay và coupled rollback/concurrency/retry, GET world parent-bound, reuse pulse, giữ world/memory. `QA_BASE=http://127.0.0.1:PORT QA_OUT=work/gnd3 python3 scripts/qa-ground-authority.py` mở hai Chromium desktop/mobile: cùng caption/roots, cosmetic pose không đổi root, camera/F5 độc lập, pause không credit, cancel/end ẩn caption, malformed parent không đầu độc watermark và ACK không ghi memory. Browser dùng replay thật nhưng transport/checkpoint fixture tổng hợp; không phải durable D1 hoặc production proof. Xem [evidence](validation/ground-authority-2026-10-29.json). Migration0011 chỉ ở fixture local; receipt chưa cấp reward/P2P, chưa có training gain/GPU/soak/remote QA.

H3b `test-ground-learning.mjs` chạy appointment thật qua GND2/GND3: đủ hai presence receipt/plan/epoch và overlap cửa sổ mới có reward, actual root distance là cost; partial/pause/cancel/baseline/transit/clock jump/retirement không nhận positive credit. Context/outcome bất biến, chunk/resume cùng proof, duplicate không fit lại, raw JSON/partition/namespace sai bị loại. Matrix artifact rebuild từ one-pass ledger; CLI smoke process thật và guards SHA/UTF8/bytes/exclusive/symlink/hardlink/traversal/overwrite. `test-ground-authority-store.mjs` inject cùng clock cho SQLite julianday và server, không phụ thuộc giờ thật đã vượt fixed fixture anchor. [H3b evidence](validation/learning-h3b-2026-10-29.json) giữ70/70full suite và hai lỗi đã sửa;96study task/32train repeat byte-identical, holdout action collapse **không promote**. UI/runtime/schema không đổi; kiểm build loại experimental code thay vì chạy browser lại để nhận một bằng chứng không liên quan.

Citizens29/10: [evidence](validation/citizens-2026-10-29.json) giữ70work/73QA suite,12style/radius/late upgrade/source immutability và8Studio case ảnh thật. G0 dùng manifest27transport hiện tại,4fallback gồm delayed primary; `QA_G0_ONLY_FALLBACKS=1` hoặc `QA_G0_VIEWPORT=mobile` chạy phần bị ảnh hưởng, report chỉ nhận phần đã chạy. Harness ghi screenshot/body/errors/canvas telemetry khi lỗi; một mobile OSM timeout rồi retest đạt chưa là soak PASS. Source-vault check chỉ đọc/hash các ZIP trong registry ngoài app, không tải hoặc deploy.

Supplied29/10: [evidence](validation/supplied-civilians-2026-10-29.json) giữ73suite và browser source68060d6; `test-supplied-assets.mjs` kiểm5member/SHA/license chính xác, cấm đổi CC0, một mesh/material/44bone/11clip và2palette. G0 giữ4fallback + delayed upgrade; Studio thêm mức chiều cao≥93% và đường nhìn qua scenery trang trí. Authoring --write cần vault/Pillow/dev tools; CI --check chỉ đọc derivative. Bốn ZIP gốc ngoài app đã kiểm bytes/SHA, ZIP4 có250GLB tĩnh/50mẫu×5LOD chứ không có rig/clip.

H5a `test-peer-sharing.mjs` chạy accepted GND3 physics và chứng minh offer-before-hearing, chunk/resume cùng proof, baseline/partial/pause/cancel/transit không mint. Kiểm clone/JSON/forwarding/sai world-session-recipient, TTL/decay chỉ đọc, top-K/topic, immutable proof, capacity không eviction-amplification và clock fence sau duplicate. CLI subprocess kiểm checksum, bounds/options/private errors/exclusive output; path guards tái sử dụng helper study đã có test symlink/hardlink. Study cố định và biên tập, không đo policy/model gain; module phải vắng trong Worker JS build. Không persistence/UI/schema đổi, nên không API/browser H5 mới; regression compiled app vẫn phải đạt.

# Kiểm thử và bằng chứng

`scripts/unit-suites.json` là danh sách suite duy nhất; `npm run test:unit` chạy process độc lập, tối đa4workers và thu đủ lỗi. `XOM_TEST_JOBS=1` chạy tuần tự; `node scripts/run-unit-tests.mjs --list` liệt kê suite. Không chép số pass cũ thành kết quả của source mới.

## Chọn gate theo thay đổi

| Thay đổi | Kiểm tra |
|---|---|
| Docs/skill | `npm run check:docs`, `python3 scripts/validate-agent-skills.py`, `git diff --check`; đóng gói/verify ZIP nếu đổi source export. |
| Code/refactor | Unit liên quan rồi full unit, type/lint/build; đối chiếu trước/sau khi thay cấu trúc. Không bỏ kiểm tra để đạt số đẹp. |
| Persistence/guards/CAS | Các gate code và API compiled trên D1 mới, kiểm concurrency/retry/rollback/privacy và dữ liệu cũ. |
| Renderer/UI/assets | Code gate + assets; browser desktop/mobile, pause/resize/context loss và ảnh thật từ build mới. |
| Release | Gate code/API liên quan, exact source SHA; backup/schema/native deploy/readback theo [runbook](PRODUCTION_RUNBOOK.md) và [QA](CLOUDFLARE_AGENT_QA.md). |

```bash
npm run check:docs
python3 scripts/validate-agent-skills.py
npm run check
npm run lint
npm run test:unit
npm run assets:check
npm run build
npm run test:api:local
npm run test:api:legacy
node scripts/test-evening-api.mjs
node scripts/test-api-resource-budgets.mjs
node scripts/test-write-churn-api.mjs
node scripts/test-ontology-api.mjs
node scripts/test-chat-admission-api.mjs
node scripts/test-progress-api.mjs
npm run audit:learning-evidence
```

Lệnh API dùng **Worker vừa build + D1 cô lập**, không DB preview hoặc người dùng. `test:api:local` kiểm owner/origin/body/schema, snapshot/policy/memory, pulse12viewer, retention và zero-write GET. `test:api:legacy` kiểm world/living/learning/liveness/appearance/proposal. Chat admission kiểm hai isolate chung D1; progress kiểm12reader, private payload và missing-schema503. EPERM mở cổng là hạn chế môi trường, không phải lý do nới assertion.

## Học, ground và dữ liệu

| Miền | Gate/phạm vi bổ sung |
|---|---|
| Policy/archive | Unit kiểm dirty write105→0/2changed, mixed revision/CAS/nonce/rollback, retained200/sequence/backfill. `test-evening-api.mjs` kiểm9namespace, subsequent settlement chỉ đổi1posterior và tick không ghi trùng. Đây không là usage live. |
| QA catalog/fare | Trên **cloudflare-qa**: `test-feasible-learning.mjs` kiểm thiếu tiền trước scoring; sau build chạy `test-mobility-learning-api.mjs` cho8request/3fare, tick không trừ lại.41/H6 không đổi. |
| H1–H10/offline | Unit và `audit:learning-evidence` kiểm model/provenance/checksum và tính lại report đã đóng băng. Protocol, seed, holdout và các kết quả negative ở [LEARNING](LEARNING.md). Không sinh rollout mới, mở holdout12000–12019 hoặc promote để dọn code. |
| Replay/backfill/curation | Unit + compiled local API kiểm actor filter, cursor/resume, source/receipt CAS, lost ACK, silent-ignore rollback, immutable export và giữ own samples/history/memory. Không backfill earned points hoặc chuyển lời kể thành witnessed memory. |
| GND1/GND2/GND3 | Sau build: `npm run test:api:ground`, `npm run test:api:shared-ground`, `npm run test:api:authority` khi chạm miền tương ứng. Giữ clock/source/two-head CAS, journal/receipt, pause/cancel và parent binding theo [kiến trúc](ARCHITECTURE.md). |
| H3b/H5a/H5b1 | Unit chạy receipt/physics và fault/clock/privacy fences; `node scripts/test-peer-offer-d1.mjs` kiểm journal trong workerd fixture riêng. Build phải vắng experimental importer. Chưa app API/P2P/runtime; xem [H5b1](LEARNING.md#h5b1--journal-và-đối-chiếu-receipt-bền-vững). |
| Liveness/đời sống | Unit kiểm unfinished/cancelled plans, cohort/animal clock, nhu cầu theo thời gian, social sau22h, ngủ/nhà riêng/rạp im lặng. [Learning](LEARNING.md) giữ hợp đồng; số sample mô phỏng không chứng minh chất lượng tăng. |
| Ops/hosting | Unit kiểm log allowlist, request correlation, pause/admission/version/clock fences. QA có thêm Access JWT/config/single-Cron. [OBSERVABILITY](OBSERVABILITY.md) là contract, native runtime proof phải lấy riêng. |

## Browser

Restart Worker từ `dist/server/wrangler.json` sau build. Nhóm harness social/interior/evening/UI/budgets nhận `QA_CHROMIUM_PATH`, mặc định `/usr/bin/chromium`; CI dùng Google Chrome có sẵn trên runner, không cài Chromium Snap. `QA_BASE` bắt buộc loopback; đặt `QA_OUT` để lưu ảnh/metrics một lượt nghiệm thu riêng và giữ bằng chứng cũ; không gửi localhost làm link preview cho người dùng. Ví dụ lệnh nội bộ: `QA_BASE=http://127.0.0.1:5320 python3 scripts/qa-social.py`.

| Harness trong scripts/ | Điều phải giữ |
|---|---|
| qa-system-budgets.py | Compiled loopback desktop/mobile: steady-minute GET/pulse cadence,100caller queue có unit riêng,25retry click không parallel reads, Ctrl+H/IME không lấy shortcut, button44px/cached-state/no overflow. API intercepted, không là usage native hoặc GPU proof. |
| qa-scene-interactions.py | City follow giữ ID, native skin/instance picking/occlusion, drag/pinch không thành tap;4Studio×desktop/mobile focus/zoom/orbit/shot/restart/reset và mèo trên đất/được bế phải có cả người hỗ trợ trong khung; dimensions khăn phải khớp mesh sau chuyển stage. |
| qa-jump-lod.py | Pause khi NPC đang nhảy rồi chuyển native→crowd→native: cùng model/độ cao/clock desktop-mobile, không reset pha khi select/zoom. |
| qa-city-activities.py, qa-wardrobe-lod.py |15ca hoạt động/2ca wardrobe desktop-mobile; shader errors, đủ cư dân khi action atlas warm, model preview/city trùng, màu khi pause, một preview canvas và zoom giữ identity. API writes synthetic; contact/clearance kiểm actual skin trong city-actions/crowd-skins. |
| qa-chat-admission.py | HTTP429 giữ draft/focus, không tự retry, hồi phục khi chủ động gửi lại; desktop/mobile, không overflow. Mock UI writes; quota/rollback kiểm riêng trên compiled D1. |
| qa-g0-ux.py | Gzip/canonical fallback, pause403/409/5xx/network/ACK, chat focus/draft, keyboard,320px, presets/resize/hidden/context loss/retry và reduced-motion. |
| qa-shared-ground.py | Hai shared viewer desktop/mobile mở lệch giờ, cùng absolute sample roots, camera/F5/pause, no extrapolation, ảnh thật; synthetic source và D1 riêng. |
| qa-loading.py | Compiled loopback build,3 cold-page repeat/viewport, network profile cố định, bytes/first-frame và asset completeness; `QA_BEFORE` tùy chọn phải là build khác nếu so sánh. Một build không chứng minh cải thiện/SLA thiết bị thật. |
| qa-social.py | Đủ 6 lượt, luân phiên/poll/F5/source badge/camera. |
| qa-interior-native.py | Desktop/mobile:3native model đúng ID, callback draw thực, pixel không rỗng và đạo cụ native;3camera, pause/resume theo clock đã ACK, canvas giữ qua polling, tầng trên không tạo cư dân, tải canonical bị giữ>4s rồi nhận model. Tối đa8controller trong phòng kiểm bằng actual GLB ởtest-interior-cast; test browser không là authenticated remote hoặc GPU/FPS proof. |
| qa-ui-review.py |4viewport1440/390/320/844×390:axe4.11.0 WCAG2/2.1/2.2A/AA tags, bounds/overflow, zero draws sau modal/scroll, giữ canvas qua camera/tầng, context-loss/retry, static-model/paused-Studio zoom và native return link. Axe file phải đúng SHA trong harness; truyền QA_AXE_PATH, QA_BASE loopback và QA_OUT thư mục riêng. Không tắt rule để đạt; incomplete cần review thủ công. Synthetic APIs, existing pulse bị intercept, không DB người dùng. |
| qa-evening-life.py |16ca desktop/mobile:phố22:30, nằm giường, sofa/tivi, cửa tủ lạnh, ghế rạp, ăn tối, nhậu2người và vỉa hè. Actual draw/pixel/bed-seat support/props/appliance flags; ảnh cần mở để tìm TV bị che, hướng ghế hoặc cửa xuyên người. test-evening-life kiểm5skin thật/nệm/hông/chân, giờ ngủ đa dạng, nhu cầu theo plan,9settlement/cancel và shared replay plan ngủ dài. test-evening-api chạy Worker compiled/D1 cô lập:9namespace sample+9posterior, retry không trùng; không DB thật hoặc physical-completion proof. |
| qa-overlays-households.py | Tên dài/câu 240 ký tự, pill/occlusion/click, hồ sơ và 320px. |
| qa-cycle.py, qa-tag.py | Full bike/ground/pause/dismount, đổi vai/no teleport/cancel. |
| qa-three-only-pets.py | Follow/pause/assignment/wardrobe/OSM, hide/resize, WebGL loss/retry/no2D; ≥80% sample có cả inFrame+sightline qua cây/building. Fixture bootstrap có thể chưa sát caretaker: giữ seed, gap<120 và đóng về<55 cuối cửa sổ12s; ghi initial/final gap, không teleport để ép đạt. |
| qa-home-anchors.py | 60 cửa/đích riêng/địa chỉ/camera desktop/mobile. |
| qa-gardens.py | 5 phase/care/pause/framing/CAS/errors/320px. |
| qa-domain-skills.py | 8 domain/4 gate/legacy/no overflow. |
| qa-soundscape.py | Gesture opt-in, signal thật, pause/hidden/OSM/off/unmount/unsupported. |
| qa-resource-gallery.py | 19 mẫu/15 pack, texture/clip, selection race/load retry/pause/dispose. |

Framing metadata đạt vẫn phải mở ảnh cận cảnh: trường hợp mèo từng đạt head/feet nhưng camera lọt vào tay người bế và khăn giữ kích thước cũ. Giữ ảnh lỗi như baseline, sửa cả kiểm tra envelope/mesh dimensions trước khi chốt.

Ảnh và metrics ở [screenshots](screenshots/), bằng chứng máy đọc ở [validation](validation/). Browser có thể mock mutations; persistence phải kiểm D1 riêng. Gửi ảnh QA thực cho người dùng, ghi preview local hay production. Ảnh AI/asset preview không thay QA; SwiftShader và synthetic 240 không chứng minh hardware FPS/pin/nhiệt/density live hoặc soak 24 giờ.

[LEARNING](LEARNING.md) mô tả benchmark policy runtime; không phải model A/B hoặc bằng chứng ngữ nghĩa. Không tự chạy `test-world.mjs`/`verify-live.py` hay fixtures lên production.

## Fixture và đóng gói

Chat UI/D1 thật dùng `node --import ./scripts/sites-env.mjs scripts/prepare-chat-browser-fixture.mjs`, tạo DB mới dưới `/tmp/xom-phase-verification-*`; Wrangler phải dùng đúng persist-to. `qa-chat-reliability.py` cần `QA_DB` có0exchange, kiểm lost/wrong ACK, retry cùng UUID và giữ world/history/policy byte-identical. Một run thất bại cần fixture mới, giữ DB lỗi để đối chiếu. [Phạm vi](validation/phase-verification-2026-10-29.json).

Browser GND local dùng `qa-shared-ground.py`/`qa-ground-authority.py`; transport/checkpoint có fixture, không là production authority. Studio có thể chọn `QA_SCENARIOS=kitten-care`; sound cần unit transform-types và `qa-studio-sound.py` cho AudioContext thật. Human listening/MOS, GPU và soak giữ trạng thái chưa kiểm nếu chưa có bằng chứng tương ứng.

Sau commit/push: `python3 scripts/package-handoff.py /tmp/xom-ai-source.zip`. Export quét credential patterns/exclusions, kiểm required files và checksum/đọc lại ZIP. `TRANSFER_MANIFEST.json` chỉ ở trong ZIP; không tạo file sinh trong source. Đây là source export, khác archive production của [runbook](PRODUCTION_RUNBOOK.md). Giữ license, raw specs và release audit; không gọi file ít import là vô dụng nếu đó là CLI, framework entrypoint hoặc hợp đồng tích hợp.

Ontology:3suite core/GitHub/D1 nằm trong unit registry; compiled `test-ontology-api.mjs` chạy sau build trong workflow quality hiện hữu. Fixtures không network/DB thật; migration0013 chỉ apply vào D1 mới trong test. [Contract](ONTOLOGY.md#kiểm-thử).

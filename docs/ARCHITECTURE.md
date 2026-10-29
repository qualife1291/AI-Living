# Kiến trúc hiện hành

HEAD/handoff cho biết source hiện hành; phiên bản production được ghi riêng trong [releases/latest.json](releases/latest.json). Push GitHub và build local không đồng nghĩa phát hành.

## Luồng dữ liệu

Mặc định trình duyệt đọc `/api/world`, đồng bộ `serverNow` và dùng đồng hồ phân đoạn trong `lib/clock.ts`. `lib/life.ts` và routine sinh ý định/đích; WalkDirector áp dụng ground/collision, TagDirector/PetWalkDirector cấp mục tiêu. Local opt-in `?ground=shared` dùng journal/replay/frame GND2 bên dưới; camera không chạy physics hoặc sinh spawn. Cả hai là mô phỏng theo luật, không gọi LLM mỗi frame.

`City3D` tải runtime Three.js theo nhu cầu. Runtime dựng cảnh instanced/LOD, cập nhật người, thú, xe và camera. Ba core cùng một NPC đang chọn có thể dùng skin/skeleton clone độc lập; đám đông dùng sáu batch và thú dùng năm batch. Nhãn tên/thoại là DOM qua WorldOverlays, ACK đọc bắt đầu sau DOM commit. Chỉ có renderer 3D; lỗi WebGL có retry, không SVG/fallback 2D. Texture canvas, ảnh atlas của glTF và icon giao diện vẫn cần cho3D/UI.

Planner/rules hoặc local LLM sinh kế hoạch và hội thoại có nguồn riêng. Server lưu snapshot/history bằng revision CAS; các lượt đủ điều kiện mới ghi kết quả học vào archive. Hoàn thành theo simulation time hiện chưa phải bằng chứng nhân vật đã đến bằng groundnavigation; các director presentation và reading time hiện còn theo phiên viewer. Không tự quảng bá thành authoritative multiplayer hoặc suy nghĩ liên tục.

## Stack

| Thành phần | Nguồn hiện hành |
|---|---|
| UI/framework | TypeScript5.9.3 strict, React19.2.6, Vinext1.0.0-beta.5/Vite8.0.13; Next/eslint-config-next16.4.1 theo lockfile |
| 3D | Three.js0.186.1/WebGL2, GLTFLoader, SkeletonUtils, InstancedMesh/LOD; 41 modelKenney +239 Gobkit/KayKit canonical CC0 |
| API/schema | Worker nodejs_compat, Zod4.6.6; endpoint mutations có origin/schema/body limits và owner guard |
| Persistence | D1 SQLite, Drizzle0.45.2;23bảng trong db/schema.ts, migration0000–0011 (0004reconciliation); ground0009–0011 local opt-in |
| AI local | llama.cpp/CPU opt-in; rule fallback, narrative guard, không cần paid API để chạy ứng dụng |
| Production | Sites project cũ, owner-private; native credential/deploy/readback theo PRODUCTION_RUNBOOK |

## Ranh giới module

| Module | Trách nhiệm |
|---|---|
| app/page.tsx | Thành phố toàn màn hình, drawer/camera/wardrobe/petcare; /assets là catalog3D, /studio là timeline độc lập |
| components/city/three/runtime.ts | Điều phối render/camera/quality/lifecycle; không ghi history qua mỗi frame |
| people.ts, model-actors.ts, rigged-avatar.ts, fauna.ts | Batch/procedural rigs và model có skin; pause, ground alignment, asset disposal |
| lib/city/walk-ground.ts, walk-path.ts, walkability.ts, footprints.ts, scenery.ts | Shared geometry và pure A*/cache; WalkDirector giữ frame/collision người/xe/bike9,2unit |
| lib/living/ground-timeline.ts, ground-store.ts | Ground GND1 local core/static fixed-step, independent session/CAS/receipts; chưa reward/P2P/renderer authority |
| lib/living/shared-ground{,-store,-view}.ts, city/director-state.ts | GND2 journal replay/all-actor+traffic checkpoint và server-frame sampling; local opt-in, không reward/P2P |
| lib/living/ground-authority{,-store,-service,-view}.ts | GND3 quan sát physics đã nhận, receipt arrival/presence/co-presence/emitted/heard; commit cùng shared head, không tự ghi memory hoặc học |
| lib/city/traffic.ts, tag-game.ts, pet-walk.ts | Giao thông/ghép cặp/mục tiêu companion; giữ collision chung |
| lib/living/engine.ts, social-scheduler.ts, activities.ts | Population/routine/plan5 bước, schedulerNPC20s simulation/pulse, không sinh reward từ activity bị hủy |
| identity.ts, households.ts, pets.ts | Metadata snapshot additive, ID/history ổn định, household mới tối đa4/người chăm thú có CAS |
| lib/living/social.ts, dialogue-grammar.ts | Lời thoại đến đúng nơi, nguồn AI/script, chống lặp và thời gian đọc; server pool cho lượt An + browser hash pool bền qua F5; reading/occupancy còn viewer-local |
| lib/living/learning.ts, animal-learning.ts | Outcome learning theo luật; không phải fine-tune LLM hoặc AI động vật chuyên biệt |
| lib/store.ts, apply-event.ts, living/service.ts, living/pulse-gate.ts | Snapshot+episode/living history, revision/idempotency, pulse D1 admission chung, không reset DB |
| living/context-cards.ts, prompt-memories.ts | Catalog gợi ý theo nơi/phase/weather/festival; private top-K đúng actor cho daemon, không ghi sự kiện hoặc trao ký ức cho peer |
| living/flora.ts, city/garden-plots.ts, three/gardens.ts | Pure growth/owner care metadata, generated shared footprints và hai batch3D; không ghi actor outcomes từ render |
| lib/training.ts, living/director.ts | Context/data mẫu/reflection và guard; không coi điểm heuristic là chứng minh chất lượng model |

## Giới hạn và hướng tiếp

Household đã có60 cửa riêng; chưa có indoor route; bus/metro chưa authoritative boarding. Core chibi giữ tỷ lệ gốc trong disc thay vì kéo dài tới chiều cao người thủ tục. Gallery đủ asset on-demand; không thả tất cả loài/fantasy vào phố. GPU thật, soak, privacy public viewer, production scheduler và native deploy phải được kiểm chứng riêng. Quyết định SVG cũ trong ADR-0006 đã được thay thế; không dùng lịch sử để phục hồi2D.

## Ground GND1 — timeline server local

[Contract](validation/ground-timeline-contract-v1.json), [evidence](validation/ground-timeline-2026-10-28.json). Namespace `server-ground-core-static-v1` là mô phỏng độc lập **ba core** với static footprints và swept peer discs. Không gồm NPC/thú/xe/boarding/tag/renderer; receipt luôn `eligibleForReward:false`, `eligibleForP2P:false`, chưa là shared-world physical arrival. Renderer/reading/traffic vẫn viewer-local, learning rewardv1 không đổi. Đây là nền để kiểm/cấp authority rộng hơn về sau, không tự nối pulse hoặc scheduler.

Explicit local start lấy declared location làm vị trí khởi tạo simulation có clearance và seed provenance, **không chứng minh actor đã ở đó trong lịch sử**. Plans đang có chỉ làm baseline, không receipt. Chỉ quan sát plan thay đổi từ world server; full SHA, revision, observation simtime và geometry version được pin. Không dùng originPath/from làm teleport hoặc nhận pose/path/time từ client. Plan mới không được chạy ở thời gian trước quan sát; plan bị thay hủy chuyển động chưa xác nhận, step cũ bị bỏ lỡ không được backfill arrival. Legacy thiếu simStartedAt, transport và dynamic action chưa hỗ trợ giữ đứng; session vẫn giữ vị trí cũ.

Pure A* được tách nguyên thuật toán khỏi WalkDirector, logger chỉ còn ở browser wrapper. Solver dùng bước100ms,≤16unit/s, mỗi tick tối đa một segment để kiểm swept static/relative moving peer chính xác. Stable core order và conservative yielding có thể deadlock; báo blocked, không đẩy/teleport xuyên người. Mỗi request≤600tick/60s simulation, giữ backlog khi đến chậm. Server Date.now+segmented computeSimMs quyết định target; client không gửi thời gian. Pause không ghi/move, rewind/born/geometry mismatch từ chối. Arrival chỉ khi solver tới slot của đúng plan/step trong source window; không chứng minh hoàn thành hoạt động, cuộc gặp hay kiến thức đã truyền.

`ground_sessions` giữ checkpoint/hash/nonce; `ground_batches` giữ immutable operation/sequence/source hash+revision/receipt/arrivals. CAS so **raw world+revision và raw session+checksum**; state+receipt+pure SQL postassert cùng D1 batch. Assertion bắt cả INSERT bị silently ignore; lỗi rollback thật. Status/preview không ghi/bootstrap world. Mỗi advance, kể cả0tick, consume operation UUID và receipt để lost-ACK retry không chạy thêm thời gian. Response duplicate có thể trả checkpoint cũ, đọc status để lấy head mới. Không tự retry write, không xóa session/lock để sửa conflict. Receipt/hash là integrity của mô phỏng local, không chữ ký hay authority ngoài scope.

```bash
# SESSION và OPERATION là UUID mới. CLI mặc định status, chỉ loopback.
npm run ground:timeline -- --session=SESSION --action=preview
npm run ground:timeline -- --session=SESSION --action=start --operation=OPERATION
# Dùng checkpoint từ response; đổi operation UUID cho mỗi advance mới.
npm run ground:timeline -- --session=SESSION --action=advance --expected-checkpoint=SHA_HEAD --operation=OPERATION_MOI
npm run ground:timeline -- --session=SESSION
```

Endpoint owner+local-admin+loopback, body≤2KiB, response CLI≤32KiB; state/receipt≤128KiB, raw world≤2MiB, path≤512points. Không tự gọi endpoint production hoặc bật local-admin trên Site. Migration0009 chỉ thêm hai bảng/index, không seed session/repair data và chưa áp dụng lên DB thật; health8probes không yêu cầu hai bảng opt-in này. GND2 bên dưới bổ sung journal/replay/renderer chung, không nâng nhãn receipt GND1.

## Ground GND2 — shared replay và renderer local

[Contract](validation/ground-shared-contract-v2.json), [evidence](validation/ground-shared-2026-10-28.json). Namespace `server-shared-ground-v2` là một timeline local cho `home`, tách GND1. Explicit start tạo genesis từ source world hiện có, không observed history. Sau start, trigger SQLite ghi mọi world UPDATE thành source bất biến **trong chính transaction của writer**; source lỗi hủy cả world write. Lưu raw revision, engine capture time và plan/roster/clock transitions theo thứ tự, kể cả plan bị thay/xóa giữa hai pulse. Không xóa source/ID/history hoặc khôi phục history bằng suy đoán.

Ground clock ban đầu lấy world simtime, sau đó tích phân pause/scale **đã được commit** ở journal capture boundary. Clock này có namespace riêng, không sửa world/reward clock hoặc backdate chuyển động. Outer tick100ms real chia thành≤100ms simulation; mỗi batch≤20outer ticks/120physics steps. Chạy theo batch/resume giữ kết quả, backlog không bị bỏ qua. Source≤2MiB, page≤8/8MiB, state≤1,8MiB; high speed/đóng viewer có thể cần nhiều pulse để bắt kịp, chưa SLA/liveness hoặc soak.

Server restore checkpoint của Walk/Traffic/Tag/Pet directors, chạy cả243human tối đa+3thú+12xe ambient, không phụ thuộc camera/budget72 của renderer. Footprint, peer sweeps, bike radius, tag/pet state được giữ; thêm kiểm car/pedestrian liên tục bảo thủ. Nếu bước xe không an toàn, giữ xe và tính lại người; còn lỗi thì giữ pose, không teleport. Spawn/retire là sự kiện simulation có nguồn. Bus/metro boarding, activity fulfillment và semantic encounters chưa có. Quy tắc yielding có thể blocked; không hứa crowd liveness.

State, source cursor,20frame gần nhất và operation receipt commit bằng exact world/source/state CAS + SQL postassert; receipt bị silently ignore rollback cả frame/cursor. Advance0tick vẫn consume operation. Status read-only, không bootstrap world. API yêu cầu đủ3table+3index+3trigger; active pulse preflight checkpoint/journal trước world writes. World revisions phải liền mạch; SQLite seq chỉ cần tăng, có thể có khoảng trống. Đứt journal hoặc thiếu trigger bị chặn, không tự backfill nguồn. Existing local pulse chạy shared step nếu đã start (CAS/coalescing khoảng1s); base learning/narrative gate9s giữ nguyên, không cron/daemon mới. Chưa start thì trigger/pulse không tạo shared source hoặc session.

```bash
npm run ground:shared
npm run ground:shared -- --action=start --session=UUID_SESSION --operation=UUID_OPERATION
npm run ground:shared -- --action=advance --session=UUID_SESSION --operation=UUID_OPERATION_MOI --expected-checkpoint=SHA_HEAD
```

Sau start, mở đường dẫn local với `?ground=shared` để xem preview. API/GET world query chỉ owner+local-admin+loopback; production owner vẫn bị từ chối. Shared page dùng loop pulse/poll hiện có ở1s, đọc metadata+frame server. Renderer sample theo thời gian đã align với server trừ1,5s playback delay; không Walk/TrafficDirector local, không extrapolate khi thiếu frame, không fallback physics riêng. Roster/body-envelope đổi thì giữ cả khung cũ đến khung kế tiếp. Hai viewer mở lệch giờ/camera/F5 nhận cùng root pose ở cùng thời điểm; render rigs/camera không là authority. Browser QA dùng fixture synthetic trên build mới, D1 được kiểm riêng; ảnh thật ở [desktop](screenshots/gnd2/shared-desktop-preview.png) / [mobile](screenshots/gnd2/shared-mobile-preview.png).

Shared preview không phát thoại/script do viewer quyết định; GND3 bên dưới bổ sung caption server khi được kích hoạt riêng. Receipt luôn không eligible reward/P2P; không đổi learned samples, policy/memory hoặc gán outcome ground vào namespace simulation-plan-time cũ. Migration0010 chưa áp dụng DB người dùng/production; health8probes vẫn không yêu cầu shared tables. Giữ owner-private và local-admin đóng trên Site.

## Ground GND3 — authority local

[Protocol v1](validation/ground-authority-contract-v1.json) cố định trước triển khai. `ground-authority.ts` chỉ quan sát pose/WalkDirector sau kiểm tra an toàn của GND2, trên toàn bộ243human, không dựa budget72 của renderer. Mapping thời gian `G+(P-S)` được đóng băng khi nhận intent, đồng thời raw active plan/step/location phải khớp; lệch clock không được bù bằng credit. Plan tồn tại lúc start/tân cư là baseline. Plan mới có epoch/SHA/source/window và requested+routed goal; receipt phân biệt đến sau di chuyển với đã ở đó. `presence-completed` cần stationary goal presence liên tục≥38% cửa sổ và cửa sổ đóng đầy đủ, chỉ chứng minh hiện diện mô phỏng. Không suy ra lao động, thu nhập hoặc chữa bệnh; plan thiếu anchor/transit/moving games không được nhận completion ngoài phạm vi.

Co-presence cần≤30unit liên tục3000ms simulation và static swept sightline, chỉ hai người tham gia được nhận nguồn. Lời thoại phải từ LivingTurn mới đã commit, đúng An+resident và hai plan còn hiệu lực. Server chờ mốc turn+120000ms đã map, đủ co-location/goal/window rồi mới phát từng câu12000ms, cách1000ms. Text đang nằm trong plan hoặc câu bị ngắt chưa là đã nghe; chỉ named listener sau toàn bộ cửa sổ hợp lệ có receipt `heard-text-not-witnessed-truth`. Pause không cộng thời lượng. Thay plan/source text/epoch hoặc mất tiếp xúc hủy delivery.

Migration0011 thêm hai bảng authority và immutable batch triggers, không sửa namespace cũ. Activation chỉ trên shared session đã có, expected shared checkpoint+operation UUID; mặc định status chỉ đọc, không bootstrap/reset. Marker shared head và authority head được CAS/postassert trong **cùng D1 batch** với nguồn/frame/receipt GND2; retry không cộng lại, silent ignore hủy cả hai. Khi active, preflight thiếu schema/checkpoint chặn trước ordinary pulse world writes. Chưa active thì0011 là tùy chọn. Reuse pulse hiện có, không cron/daemon mới.

```bash
npm run ground:authority -- --origin=http://127.0.0.1:PORT
npm run ground:authority -- --origin=http://127.0.0.1:PORT --action=start --session=UUID_SHARED_SESSION --operation=UUID_OPERATION_MOI --expected-checkpoint=SHA_SHARED_HEAD
```

Advance tiếp bằng `ground:shared` hoặc pulse có sẵn. API `/api/living/ground/authority` vẫn owner+local-admin+loopback, body≤2KiB; CLI≤32KiB và không tự retry. Shared GET world trả DTO `sharedAuthority` riêng, buộc đúng parent checkpoint/sequence/source/time. Viewer chỉ lấy utterance tại sample time, ưu tiên render hai người tham gia, Talk/Listen chỉ là pose; ACK hiển thị không tạo ký ức viewer. Không TTS hoặc claim nhân vật hiểu/suy nghĩ từ caption. GND3 receipt luôn `eligibleForReward:false`, `eligibleForP2P:false`; H3b/H5 cần protocol/namespace/admission riêng.0011 chưa migrate production hoặc DB người dùng; không gọi local acceptance là rollout.

# Kiến trúc hiện hành

HEAD/handoff cho biết source hiện hành; phiên bản production được ghi riêng trong [releases/latest.json](releases/latest.json). Push GitHub và build local không đồng nghĩa phát hành.

## Luồng dữ liệu

Trình duyệt đọc `/api/world`, đồng bộ `serverNow` và dùng đồng hồ phân đoạn trong `lib/clock.ts`. `lib/life.ts` và routine sinh ý định/đích; WalkDirector áp dụng đường đi mặt đất, footprint, swept collision, khoảng riêng và nhường xe; TagDirector/PetWalkDirector chỉ cấp mục tiêu cho cùng navigation pipeline. Đây là mô phỏng theo luật, không gọi LLM mỗi frame.

`City3D` tải runtime Three.js theo nhu cầu. Runtime dựng cảnh instanced/LOD, cập nhật người, thú, xe và camera. Ba core cùng một NPC đang chọn có thể dùng skin/skeleton clone độc lập; đám đông dùng sáu batch và thú dùng năm batch. Nhãn tên/thoại là DOM qua WorldOverlays, ACK đọc bắt đầu sau DOM commit. Chỉ có renderer 3D; lỗi WebGL có retry, không SVG/fallback 2D. Texture canvas, ảnh atlas của glTF và icon giao diện vẫn cần cho3D/UI.

Planner/rules hoặc local LLM sinh kế hoạch và hội thoại có nguồn riêng. Server lưu snapshot/history bằng revision CAS; các lượt đủ điều kiện mới ghi kết quả học vào archive. Hoàn thành theo simulation time hiện chưa phải bằng chứng nhân vật đã đến bằng groundnavigation; các director presentation và reading time hiện còn theo phiên viewer. Không tự quảng bá thành authoritative multiplayer hoặc suy nghĩ liên tục.

## Stack

| Thành phần | Nguồn hiện hành |
|---|---|
| UI/framework | TypeScript5.9.3 strict, React19.2.6, Vinext1.0.0-beta.5/Vite8.0.13; Next/eslint-config-next16.4.1 theo lockfile |
| 3D | Three.js0.186.1/WebGL2, GLTFLoader, SkeletonUtils, InstancedMesh/LOD; 41 modelKenney +239 Gobkit/KayKit canonical CC0 |
| API/schema | Worker nodejs_compat, Zod4.6.6; endpoint mutations có origin/schema/body limits và owner guard |
| Persistence | D1 SQLite, Drizzle0.45.2;18bảng trong db/schema.ts, migration0000–0009 (0004reconciliation); ground0009 local opt-in |
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

Endpoint owner+local-admin+loopback, body≤2KiB, response CLI≤32KiB; state/receipt≤128KiB, raw world≤2MiB, path≤512points. Không tự gọi endpoint production hoặc bật local-admin trên Site. Migration0009 chỉ thêm hai bảng/index, không seed session/repair data và chưa áp dụng lên DB thật; health8probes hiện tại không yêu cầu hai bảng opt-in này. Phase tiếp phải giải quyết NPC/traffic/occupancy, durable world plan lifecycle và renderer dùng chung timeline trước khi mở H3b/H5.

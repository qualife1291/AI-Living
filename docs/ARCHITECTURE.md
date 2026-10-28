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
| Persistence | D1 SQLite, Drizzle0.45.2; 16bảng trong db/schema.ts, migration 0000–0008 (0004reconciliation) |
| AI local | llama.cpp/CPU opt-in; rule fallback, narrative guard, không cần paid API để chạy ứng dụng |
| Production | Sites project cũ, owner-private; native credential/deploy/readback theo PRODUCTION_RUNBOOK |

## Ranh giới module

| Module | Trách nhiệm |
|---|---|
| app/page.tsx | Thành phố toàn màn hình, drawer/camera/wardrobe/petcare; /assets là catalog3D, /studio là timeline độc lập |
| components/city/three/runtime.ts | Điều phối render/camera/quality/lifecycle; không ghi history qua mỗi frame |
| people.ts, model-actors.ts, rigged-avatar.ts, fauna.ts | Batch/procedural rigs và model có skin; pause, ground alignment, asset disposal |
| lib/city/walk-ground.ts, walkability.ts, footprints.ts, scenery.ts | Geometryshared/nav clearance/path/cache, người/xe/bike9,2 unit |
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

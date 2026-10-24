# Kiến trúc và công nghệ

## Luồng

Browser → Vinext routes → D1 world/events. Browser dùng lib/life.ts để dựng vị trí tại thời gian hiện tại. Tác vụ ChatGPT riêng → private service access → GET world/instructions → tạo event/kế hoạch → POST events → GET readback. Không có API key LLM trong web.

## Stack thực tế

- TypeScript 5.9.3, React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13.
- Cloudflare Workers với nodejs_compat, qua Sites hosting.
- D1 SQLite; Drizzle ORM 0.45.2 và drizzle-kit 0.31.10.
- Zod 3.25.76 kiểm tra event; lucide-react cho icon.
- SVG + CSS + requestAnimationFrame, không dùng Phaser/Pixi/Unity.
- Node 24.22.1 là runtime đã chạy test; pnpm 11.25.0 là pin dự án. package.json/pnpm-lock.yaml là nguồn phiên bản chuẩn.
- Không dùng Supabase, Redis, queue riêng, API LLM trả phí, vector DB hoặc FFmpeg trong bản này.

## Module

| Đường dẫn | Vai trò |
|---|---|
| app/page.tsx | UI điều hướng, snapshot, profile, journal, pause/export |
| components/world/CityMap.tsx | Map, actor/animal rendering, follow camera, speech, live board |
| components/world/Robot.tsx | Robot dùng chung giữa avatar/map/dialogue |
| components/world/Animal.tsx | Mèo/chó/chim bằng SVG |
| components/world/useLife.ts | Clock cập nhật khung hình; dừng khi paused |
| lib/life.ts | Graph, shortest path, interpolation, routine/plan projection, animal rules, camera bounds |
| lib/world.ts | Kiểu world, seed và hướng dẫn tác nhân |
| lib/event-schema.ts | Contract Zod cho event, change, plan và dialogue |
| lib/store.ts | Snapshot read/seed, 80 event gần nhất, private no-store |
| db/schema.ts + drizzle/ | Tables và migration schema-only |
| worker/index.ts + scripts/vite | Tích hợp Worker/Vinext/Sites từ starter |

## Dữ liệu lưu

worlds(id, revision, data JSON); episodes(id, created_at, source, data JSON). Snapshot có people, relationships, born, paused, clock, weather, lastAI, schedule. Person có money/energy/hunger/skill, location/activity, tối đa 60 memories và plan tùy chọn. Episodes lưu lịch sử; API trả 80 gần nhất, không phải full export.

## API

- GET /api/world: snapshot, revision, events. Có thể seed world khi DB mới.
- POST /api/world: {revision,paused? ,schedule?}; revision stale trả 409. Pause cập nhật pausedAt/pausedMs.
- POST /api/events: schema trong lib/event-schema.ts. Trùng id trả success duplicate mà không cộng trạng thái; revision stale 409. Ghi episode + snapshot bằng D1 batch có guard.
- GET /api/instructions: instructions + lifeInstructions để tác vụ mới không cần phiên cũ.

Mọi API dựa owner-private dispatch để xác thực truy cập. Origin guard không thay thế authentication. Không public Site khi chưa thêm authorization thích hợp; không dùng service bearer trên trình duyệt.

## Consistency và migration

Event id là idempotency key, revision là optimistic lock. Transaction batch bảo vệ episode và world cùng revision. Race hai request cùng id có thể nhận unique constraint error; nên bổ sung readback handling nếu cần production hardening. Không sửa migration 0000 đã áp dụng. Mở rộng JSON hiện tại không cần schema migration; phải giữ tương thích event/world cũ.

## Ranh giới simulation

Runtime position/activity không được ghi DB mỗi frame. Actor plan ưu tiên trong thời gian còn hiệu lực; hết plan quay lại routine từ đích plan. Chuyển tiếp khi kế hoạch mới đến giữa routine còn cần QA. Cơ chế hiện chưa xác thực toàn bộ social co-location ở server; tác nhân được hướng dẫn, renderer chỉ hiện timed speech khi robot đứng tại location phù hợp.

## Bản v2 animation
Robot.tsx có rig joints và motion props, RobotWorkshop dùng để QA minh họa; SpeechBubble.tsx/lib/speech.ts quản lý text và speaker; Vehicle.tsx/lib/traffic.ts quản lý lane/phase. Không thêm dependencies. Chi tiết design/ràng buộc tại ANIMATION_SOURCES.md.

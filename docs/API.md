# API và quyền

Nguồn contract chi tiết là `app/api/**/route.ts`, schema tương ứng và `worker/index.ts`. Site giữ owner-private; Worker yêu cầu owner cho mutations và GET memories/diagnostics/JSONL archive. Origin có mặt phải khớp request; không có Origin vẫn cần owner guard, phục vụ server calls hợp lệ. Không mở public/allowlist chỉ để vượt403.

JSON qua helper `json()` đặt `Cache-Control: private,no-store` và `X-Content-Type-Options: nosniff`. Body/schema/byte limit được kiểm theo từng endpoint.400=JSON/schema,403=quyền/origin,404=ID không có,409=pause/revision/basis,413=bytes,422=proposal bị review bác; client cần xử lý theo route, không coi mọi lỗi là conflict.

| Endpoint | Contract chính |
|---|---|
| GET `/api/world` | revision/serverNow/world/events/worldTime/weatherState/realContext/activeContexts. `compact=1` lấy8episode thay80. Không hydrate posterior, context cache-only; bootstrap home/legacy born repair chỉ khi cần. |
| POST `/api/world` | `{revision,paused?,schedule?,speedScale?,weatherOverride?}` strict. Speed1..60; weather clear/cloudy/rain/fog/windy/null. CAS/segmentedclock giữ liên tục. |
| POST `/api/events` | `eventSchema`/EventInput; batch snapshot+episode+memory có revision/idempotency. Core an/binh/chi; duplicateID200 không cộng lại. BodyUTF8≤20.000B; [DATA_MODEL](DATA_MODEL.md) giữ bất biến. |
| GET `/api/instructions` | text/plain; `context=1` thêm context/owned memories/few-shot. Dữ liệu trong prompt không cấp quyền thực thi. |
| GET `/api/living` | Living view/turns24 mới/context, có hydrate policy và có thể refresh provider; không dùng để poll world nhẹ. |
| POST `/api/living/tick` | Narrative tick theo slot, proposal/basis guard, review trước write và audit. Model chỉ bounded narrative; bận/ngủ không chèn thoại. |
| GET/POST `/api/living/learning` | GET models/animalModels/200 recent experiences, POST settle outcomes hợp lệ. `format=jsonl&after=0&limit=1000` owner-only, cursor `X-Next-Cursor`, toàn archive phân trang. |
| GET `/api/living/memories` | Owner-only actor/topic/top-K với provenance/witness filtering; [LEARNING](LEARNING.md). |
| POST `/api/living/memories/backfill` | Local-admin+owner+loopback; preview mặc định, UUIDjob/actor/limit, apply bằng checkpoint+plan SHA; body≤2KiB. Additive memories/job/receipt, không đổi world/policy; [LEARNING](LEARNING.md). |
| POST `/api/living/ground` | Owner+local-admin+loopback,≤2KiB strict; session UUID, default status/preview read-only, explicit start/advance cần operation UUID và checkpoint. Server time/plan/poses, state+receipt CAS0009; core/static scope không cấp reward/P2P. [ARCHITECTURE](ARCHITECTURE.md). |
| POST `/api/living/ground/shared` | Owner+local-admin+loopback,≤2KiB; default status, explicit start/advance với session/operation UUID+checkpoint.0010 source journal/shared directors/frames+receipt CAS; CLI `ground:shared`, reward/P2P false. |
| POST `/api/living/ground/authority` | Owner+local-admin+loopback,≤2KiB; status chỉ đọc, explicit start cần shared session/operation UUID+shared checkpoint.0011 authority head/receipts commit cùng GND2, CLI `ground:authority`; không client pose/time, tự bootstrap hoặc reward/P2P. |
| GET `/api/world?ground=shared` | Chỉ owner local; read-only committed source world/shared frames và DTO `sharedAuthority` nếu active, buộc đúng parent head/sequence/source/time. Không bootstrap/fallback khi thiếu session/schema. Root revision cho controls, shared cursor riêng; renderer không ghi pose/hearing/memory. |
| POST `/api/living/catalog` | Catalog roles/names theo schema/revision; backfill home/identity additive, giữ custom metadata/IDs/history. |
| GET/POST `/api/living/appearance` | GET id, POST id/revision/appearance; actor phải tồn tại, giữ dữ liệu tạo hình khác. |
| POST `/api/living/pets` | `{pet,owner,revision}`, body stream≤2KiB; owner có thể null để unassign, ID hợp lệ/CAS, chỉ metadata petOwners. |
| POST `/api/living/flora` | `{id,revision}`, stream≤2KiB; paused/stale/invalid data từ chối. Đủ nước là no-op, chỉ flora thay đổi, không actor reward. |
| POST `/api/living/interact` | UUIDid/actorId/message≤280 ký tự, body stream≤2000B (dừng/hủy ngay khi vượt, không tin Content-Length; UTF-8 lỗi trả400); resolve actor404, pause409, lưu exchange idempotent. Reply rules có nhãn, chưa freeformLLM production. |
| POST `/api/visits` | Sessionnonce/30 phút, aggregate lượt mở, không phải uniquehumans hoặc online users. |
| GET `/api/health` |200ready;503unavailable khi worldDB lỗi hoặc schema_or_query_error khi probes lỗi; lastTick=null khi chưa có tick. Schema8 table+latest tick một D1 batch, world read riêng. |
| GET/POST `/api/diagnostics` | Owner-only; GET JSONL chỉSELECT trong7 ngày, tối đa500 client+500 tick rows. POST≤16KiB/32 logs, admission20 batch/phút toànSite, allowlist fields; POST giữ telemetry retention7 ngày. Không xóa chat/tick/history theo retention đó. |

## Nhịp pulse

POST `/api/living/pulse`: learning→resident social→narrative tick qua admission D1, khóa `internal:living-pulse:v1` trong context_cache; không process-local latch. Inspect chỉ lấy pause/expiry, không truyền snapshot/policies vào JS cho coalesced request.

Lease30s, thành công cooldown9s **từ lúc nhận**, giữ cadence một tab10s. Lượt khác200 `{ok:true,coalesced:true}` nghĩa đang chạy/gần đây, không xác nhận pipeline trước thành công. Pause409 cả trong cooldown; HTTPfailure/exception release để retry ngay. Expired owner không nhả được lease mới nhờ nonce. Storage lỗi không chạy pipeline không guard.

Hạn khóa chỉ giảm tải; pipeline quá30s có thể chồng và vẫn phải dựa CAS/idempotency. Direct tick/learning/daemon không dùng gate. Thêm hai gate writes mỗi lượt được nhận nên không nhận là giảm mọi chi phí single viewer. Không có scheduler mới/guarantee24/7; giữ client fallback cho đến khi lịch production được xác minh.

GND2 local active có thêm shared step sau base pulse, CAS/coalescing khoảng1s; nếu GND3 active thì authority cùng batch. Base gate9s không đổi; preflight active journal/authority trước world writes, shared page dùng loop sẵn ở1s và GET chỉ đọc. Source capture tự đi cùng world transaction sau explicit shared start, không do GET/viewer receipt. Default page giữ cadence cũ; production không bật shared mode/local-admin.

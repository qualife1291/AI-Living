# Mô hình dữ liệu hiện hành

Nguồn: db/schema.ts, lib/world.ts, lib/event-schema.ts, lib/living/schema.ts. Source có14bảng; số bảng/migration production phải xác minh live, không suy ra từ schema local.

## D1 và migration append-only

| Bảng | Vai trò | Migration lịch sử |
|---|---|---|
| worlds | JSON snapshot home, revision CAS | 0000 |
| episodes | Sự kiện bất biến/idempotency, toàn bộ dialogue/changes/relationship và revision metadata | 0000 |
| memories | person/event/text/kind/importance/witnessed_with/time | 0001 |
| tick_runs | Idempotency/trạng thái/model/lỗi lượt chạy | 0001 |
| commitments | Lời hứa from/to/text/due/status/event | 0001 |
| nudges | Gợi ý owner và event đã tiêu thụ | 0001 |
| context_cache | Cache dữ liệu nguồn, expiresAt | 0002 |
| living_turns | Archive hội thoại/kế hoạch có provenance | 0002 |
| agent_experiences | Archive outcome, seq và ID unique | 0003 |
| view_sessions | Đếm lượt theo phiên/nonce, không phải số người duy nhất | 0005 |
| site_metrics | Bộ đếm aggregate | 0005 |
| visitor_exchanges | Trao đổi visitor có ID/actor/time/data | 0005 |
| client_logs | Telemetry giới hạn/rate/retention, indexcreated_at | 0006 |
| learning_policies | Ma trận LinUCB theo actor, exact revision tham chiếu trong snapshot | 0007 |

0004 là reconciliation schema cho lịch sử0000–0003; không đăng ký lại các SQL đã áp dụng hoặc sửa migration cũ. Dùng setup-local.mjs/Drizzle journal. Backup trước migration/repair production. memories/commitments có schema nhưng luồng sống vẫn giữ nhiều dữ liệu trong snapshot; không coi các bảng đó đã được khai thác đầy đủ.

## Domain

Core event API giữ ba ID an/binh/chi. LivingState có NPC neighbor-ID riêng, tối đa240theo catalog; renderer có budget hiển thị riêng. Có33địa điểm và41scenario trong data/city; Gemini ghi32scenario là số cũ trước9actions mới.

STEP_KINDS có16giá trị: work,eat,rest,social,garden,read,play,drink,run,jump,tag,cycle,exercise,walk-pet,shop,study. Plan lưu createdAt/pausedMs/from/originPath/simStartedAt/steps/transport/generator; originPath giữ chuyển tiếp liên tục từ vị trí projection cũ. Render ground có thể chậm hơn projection khi bị cản.

Resident giữ id/name/roleId/color/arrivedOn/familiarity/memories/plan. home gồm householdId/label/place và anchorId/address optional; identity gồm ageAtArrival/gender/previousNames. Backfill chỉ thêm metadata, đổi đúng tên tự sinh có alias; không thay customname/ID/history/plan. Household là nhóm ở, chưa phải quan hệ cha mẹ/con; 60 cửa riêng đã có ground routing, chưa có nội thất. petOwners là map animal-ID→resident-ID; explicit unassignment được giữ.

LivingState còn có catalog/needs/skills/learning/experiences/appearances/animalLearning/socialSchedule. experience snapshot giới hạn200mục, archiveDB giữ dữ liệu đầy đủ. Agent có meanReward/trials/outcome và posterior LinUCB thật. Ma trận chuyển vào learning_policies trong cùng CAS/nonce transaction, snapshot giữ policyRevision cùng needs/tabular/memories. Đọc planner/learning hydrate đúng revision; world polling không đọc bảng policy. Legacy inline vẫn dùng trước migration; dữ liệu lỗi/xung đột phải dừng và giữ nguyên để đối chiếu. Animal policy giữ ba loài cũ, không tự gán kỹ năng LLM.

## Bất biến

- Mọi write kiểm tra owner/origin/schema và revision; retry không cộng lại tác động; pause chặn outcome/event mới theo contract endpoint.
- ID/history/memory và world.born không bị reset để sửa lỗi. Ký ức chỉ thuộc người chứng kiến hoặc có provenance nghe kể.
- Tiền không âm; needs/skill/trust trong0..100. Event change mỗi coreID tối đa một lần; moneyDelta±30000, needs±20, skillDelta0..3.
- POST telemetry tính byte UTF-8 của cả JSON envelope, tối đa16KiB; ACK chỉ sau JSON ok:true, retry không làm mấtqueue.
- Đọc snapshot legacy không tự ghi hàng loạt metadata; persistence bổ sung qua mutation/planner đã được CAS bảo vệ.
- Tách snapshot/structured records phải có legacy read fallback và transaction; không xóa JSON cũ trước backfill/readback.

Domain skills là metadata additive của AgentLearning: domainSkills và legacySkillGates, không phải backfill earned points. Experience mới có skillGain optional domain/before/after/amount, vẫn source simulation. Context cards49/33nơi là catalog source editorial, không ghi thành event/memory; RAG daemon đọc memories hiện có và không ghi knowledge transfer.

Pending mới có planKey để phát hiện plan bị thay dù giữ timestamp, không là proof arrival/security. reportedEncounters giữ64 ID đã report contextual simulation result để tránh cộng lại. Các field optional, legacy đọc được, không sửa migration hoặc xóa history.

LivingState.flora optional chứa record growth/anchor/moisture theo ID khóm, không migration. Default cho legacy chỉ là tuổi biên tập; care ghi bằng CAS, không tạo nhân vật/ký ức/reward hoặc sửa namespace học. Catalog garden-plots JSON sinh từ footprint hiện có; không dùng projection làm receipt.

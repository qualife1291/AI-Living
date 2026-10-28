# Mô hình dữ liệu hiện hành

Nguồn: db/schema.ts, lib/world.ts, lib/event-schema.ts, lib/living/schema.ts. Source có21bảng; số bảng/migration production phải xác minh live, không suy ra từ schema local.

## D1 và migration append-only

| Bảng | Vai trò | Migration lịch sử |
|---|---|---|
| worlds | JSON snapshot home, revision CAS | 0000 |
| episodes | Sự kiện bất biến/idempotency, toàn bộ dialogue/changes/relationship và revision metadata | 0000 |
| memories | person/event/text/kind/importance/witnessed_with/time | 0001 |
| tick_runs | Idempotency/trạng thái/model/lỗi lượt chạy | 0001 |
| commitments | Lời hứa from/to/text/due/status/event | 0001 |
| nudges | Gợi ý owner và event đã tiêu thụ | 0001 |
| context_cache | Cache nguồn và pulse lease/cooldown tạm thời có nonce, expiresAt | 0002 |
| living_turns | Archive hội thoại/kế hoạch có provenance | 0002 |
| agent_experiences | Archive outcome, seq và ID unique | 0003 |
| view_sessions | Đếm lượt theo phiên/nonce, không phải số người duy nhất | 0005 |
| site_metrics | Bộ đếm aggregate | 0005 |
| visitor_exchanges | Trao đổi visitor có ID/actor/time/data | 0005 |
| client_logs | Telemetry giới hạn/rate/retention, indexcreated_at | 0006 |
| learning_policies | Ma trận LinUCB theo actor, exact revision tham chiếu trong snapshot | 0007 |
| memory_backfill_jobs | Actor/config/upper bounds/cursor/counters và SHA CAS của bảo trì local | 0008 |
| memory_backfill_batches | Receipt append-only theo job/sequence, plan/source/target digest và inserted IDs; không transcript | 0008 |
| ground_sessions | Independent local core/static simulation checkpoint, born/geometry/plan/pose/nonce, không world authority | 0009 |
| ground_batches | Append-only operation/sequence/source/arrival receipt, unique session+operation và session+sequence | 0009 |
| ground_shared_states | Một local shared home checkpoint: directors/canonical clock/source cursor/frames, session identity | 0010 |
| ground_shared_sources | Immutable raw world revision/capture time; UPDATE trigger atomic khi shared đã start | 0010 |
| ground_shared_batches | Operation/sequence/source lifecycle receipt; world/source/state CAS và postassert | 0010 |

0004 là reconciliation schema cho lịch sử0000–0003; không đăng ký lại các SQL đã áp dụng hoặc sửa migration cũ. Dùng setup-local.mjs/Drizzle journal. Backup trước migration/repair production. memories/commitments có schema nhưng luồng sống vẫn giữ nhiều dữ liệu trong snapshot; không coi các bảng đó đã được khai thác đầy đủ.

## Domain

Core event API giữ ba ID an/binh/chi. LivingState có NPC neighbor-ID riêng, tối đa240theo catalog; renderer có budget hiển thị riêng. Có33 địa điểm và41 scenario trong data/city; Gemini ghi32 scenario là số cũ trước9 actions mới.

STEP_KINDS có16 giá trị: work,eat,rest,social,garden,read,play,drink,run,jump,tag,cycle,exercise,walk-pet,shop,study. Plan lưu createdAt/pausedMs/from/originPath/simStartedAt/steps/transport/generator; originPath giữ chuyển tiếp liên tục từ vị trí projection cũ. Render ground có thể chậm hơn projection khi bị cản.

Resident giữ id/name/roleId/color/arrivedOn/familiarity/memories/plan. home gồm householdId/label/place và anchorId/address optional; identity gồm ageAtArrival/gender/previousNames. Backfill chỉ thêm metadata, đổi đúng tên tự sinh có alias; không thay customname/ID/history/plan. Household là nhóm ở, chưa phải quan hệ cha mẹ/con; 60 cửa riêng đã có ground routing, chưa có nội thất. petOwners là map animal-ID→resident-ID; explicit unassignment được giữ.

LivingState còn có catalog/needs/skills/learning/experiences/appearances/animalLearning/socialSchedule. experience snapshot giới hạn200mục, archiveDB giữ dữ liệu đầy đủ. Agent có meanReward/trials/outcome và posterior LinUCB thật. Ma trận chuyển vào learning_policies trong cùng CAS/nonce transaction, snapshot giữ policyRevision cùng needs/tabular/memories. Đọc planner/learning hydrate đúng revision; world polling không đọc bảng policy. Legacy inline vẫn dùng trước migration; dữ liệu lỗi/xung đột phải dừng và giữ nguyên để đối chiếu. Animal policy giữ ba loài cũ, không tự gán kỹ năng LLM.

## Bất biến

- Mọi write kiểm tra owner/origin/schema và revision; retry không cộng lại tác động; pause chặn outcome/event mới theo contract endpoint.
- ID/history/memory và world.born không bị reset để sửa lỗi. Structured memory gắn recipient/actor có nguồn; witness metadata không tự chứng minh hiện diện vật lý. Heard-from-peer cần provenance/authority riêng.
- Tiền không âm; needs/skill/trust trong0..100. Event change mỗi coreID tối đa một lần; moneyDelta±30000, needs±20, skillDelta0..3.
- POST telemetry tính byte UTF-8 của cả JSON envelope, tối đa16KiB; ACK chỉ sau JSON ok:true, retry không làm mấtqueue.
- Đọc snapshot legacy không tự ghi hàng loạt metadata; persistence bổ sung qua mutation/planner đã được CAS bảo vệ.
- Tách snapshot/structured records phải có legacy read fallback và transaction; không xóa JSON cũ trước backfill/readback.

Domain skills là metadata additive của AgentLearning: domainSkills và legacySkillGates, không phải backfill earned points. Experience mới có skillGain optional domain/before/after/amount, vẫn source simulation. Context cards49/33 nơi là catalog source editorial, không ghi thành event/memory; RAG daemon đọc memories hiện có và không ghi knowledge transfer.

Pending mới có planKey để phát hiện plan bị thay dù giữ timestamp, không là proof arrival/security. reportedEncounters giữ64 ID đã report contextual simulation result để tránh cộng lại. Các field optional, legacy đọc được, không sửa migration hoặc xóa history.

LivingState.flora optional chứa record growth/anchor/moisture theo ID khóm, không migration. Default cho legacy chỉ là tuổi biên tập; care ghi bằng CAS, không tạo nhân vật/ký ức/reward hoặc sửa namespace học. Catalog garden-plots JSON sinh từ footprint hiện có; không dùng projection làm receipt.


Experience.rewardEvidence optional (H3) lưu version reward/features, identity/catalog signature, settlement before/after/components, decision context, sample delta và mức plan binding. New prepareLearning outcomes ghi evidence đầy đủ vào archive/JSONL cùng world/policy CAS; snapshot chỉ giữ summary200experience để tránh lặp payload evidence trong polling; legacy archive không backfill, không DDL mới. Authority simulation-plan-time không là ground/encounter receipt hoặc chữ ký của nguồn ngoài. Audit JSONL offline phân loại consistency; không có write/import/training API từ evidence. Chi tiết và giới hạn ở [LEARNING](LEARNING.md).

Memory backfill0008 là bảo trì explicit local: preview không ghi; apply chỉ INSERT missing structured memories và CAS job/receipt cùng transaction, không UPDATE/DELETE memory hoặc world/policy/history. Giữ legacy/divergent rows và timestamp nguồn; high-water đóng theo job, không là full-content snapshot. Hai index actor/event và actor/seq hỗ trợ đối chiếu/paging. Xem [LEARNING](LEARNING.md) cho provenance/giới hạn và [runbook](PRODUCTION_RUNBOOK.md) trước migration production.

Ground0009 là opt-in local session/ledger riêng, không thêm pose/receipt vào snapshot hoặc archive học. State pin exact world source, plan SHA/revision/observed time, fixed-step cursor và geometry scope; bootstrap positions không là observed history. Session/receipt+postassert cùng CAS batch, pause giữ nguyên; không sửa memories, policy, plans hoặc earned samples. Receipt namespace core/static luôn không eligible reward/P2P; không suy heard/witnessed từ arrival. [ARCHITECTURE](ARCHITECTURE.md) giữ contract/CLI/giới hạn; rollout production và shared renderer còn riêng.

GND2/0010 tách shared home khỏi GND1. Journal trigger chỉ hoạt động sau explicit start; capture raw source cùng world transaction, engine time không được đứng trước committed cursor/source trước. Unique world/revision, source UPDATE/DELETE bị chặn. State giữ serialized Walk/Tag/Pet/Traffic, all-actor occupancy và20frame; source/plan/roster lifecycle receipt không là activity completion. Canonical ground clock tích phân accepted pause/scale, không rewrite world clock hoặc reward evidence. No-op advance vẫn durable operation; source/state/batch lỗi rollback thật. Chỉ bảng mới thay đổi, không reset hoặc sửa history/memory/policy hiện có. Xem ARCHITECTURE cho scope/replay/renderer và giới hạn; reward/P2P vẫn false.

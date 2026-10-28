# Tiếp tục từ đây — 28/10/2026

Chỉ đọc [AGENTS](AGENTS.md) và file này khi bắt đầu. [ROADMAP](ROADMAP.md) là backlog duy nhất; [README](README.md) chỉ mục theo công việc.

| Phần | Context hiện tại |
|---|---|
| Source | `work` đang làm H6b memory backfill; `main` ở bulk/cursor. Xem Git cho HEAD. Implementation source`fa6a5b1`; sau đó chỉ docs/evidence/tests/ledger. LinUCB/runtime/renderer/persistence giữ G0. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi+NPC,60cửa, tag/pet/bike, DOM tên/thoại, audio opt-in,5khóm/30cây. G0 gzip lossless/pixel budget/pause/chat/keyboard/reduced-motion đã có. Không2D. |
| AI/dữ liệu | LinUCB6D,8domain/gates, policy store0007/CAS, memories top-K/RAG, dialogue hashes,49context cards/33nơi; H3 full archived reward evidence. Không fine-tune LLM. |
| Đã kiểm | H6b59suite/check/lint/build/assets/API local đạt. Paginated JSONL→bulk/resume/export khớp oracle, giữ world/history/memories/own policies. SIGKILL/CAS/concurrent writer/100k limit/paths/export đạt. App không đổi nên không browser mới; G0 QA SwiftShader source`e5f5583` còn hợp lệ. |
| Production | [latest.json](docs/releases/latest.json) là deploy verified cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) là gói **chưa deploy**; Git không chứng minh live. |

**H6b bulk/cursor đã có:** [LEARNING](docs/LEARNING.md), [contract](docs/validation/learning-h6b-contract-v1.json), [evidence](docs/validation/learning-h6b-2026-10-28.json). `npm run replay:bulk -- ...` cần manifest/raw SHA và checkpoint SHA để CAS; `new` chỉ cho đầu job. SQLite riêng dưới Gitignored `.sites-runtime/training/<job>`, mặc định1batch/lệnh. Data/ID ledger/cursor/final artifact commit chung; batch lỗi rollback, prefix đã commit giữ. Chỉ fit lúc hết nguồn, export private riêng, không ghi đè. Actor filter trước audit, foreign/freeform text không lưu; stdout không actor/path/text. SourceSHA của artifact là JSONL ảo có LF ranh giới file, manifest SHA nằm riêng. Run/export vẫn kiểm hash toàn nguồn/ledger; xem LEARNING về giới hạn và hot-journal recovery, không xóa DB/lock để sửa.

**Đang triển khai:** memory backfill contract `docs/validation/memory-backfill-contract-v1.json` đã chốt; API local-only/CLI preview+apply/migration0008 đã có; test trực tiếp, type/lint và schema drift đạt. Còn full60suite/build/API compiled và release. Preview local-only, plan/head SHA CAS, append-only migration0008 cho job+receipt; không rewrite ký ức/snapshot. Tiếp memory backfill **additive**, source/actor/recipient filter, stable IDs, checkpoint/CAS/đối chiếu và dry-run giữ nguyên dữ liệu; sau đó curation/few-shot/DPO cùng prompt/context/model và validator thật. Không suy event/role/witness lịch sử từ state hiện tại, không tự ghi production. H3b/H5 vẫn chờ server ground/encounter authority.

**Nền học:** H2/H4/H6/H10 chưa promote, default giữ cá nhân; H10 không candidate đủ validation và holdout12000–12019 **chưa quan sát**. Không retune source/seed đã xem. Private replay không tăng earned samples/skills/memories hoặc chép donor posterior; chỉ prediction artifact. Runtime importer/version/rollback/CAS chưa có. Seed ranges và nghiên cứu cũ ở LEARNING/protocols, không cần đọc toàn bộ mặc định.

**Blocker prod:** thiếu native Sites credential/deploy/status/DB tools; user đã cho phép merge/push/prod, không hỏi lại. Gói H6b source`a974743` đã build/package, SHA256/823entries và offline-code exclusion đã kiểm trong candidate.json; local `work/production-a974743.tar.gz` **chưa deploy**. Commit sau gói chỉ ledger/handoff. Khi tool có lại: đúng project/audience, backup/schema0006/0007, exact-SHA deploy/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo Site/cron khác, tìm credential cũ hoặc mở public để sửa403.

**Giới hạn:** ground/playback/tag/pet/bike theo viewer, completion backend simtime+plan match chưa physical arrival. Không cấp skill/P2P từ ETA/thoại/render. Gallery chưa placement mọi loài; Society/NIM còn backlog có điều kiện, không hosted trial output vào production. Không GPU/soak/live QA mới.

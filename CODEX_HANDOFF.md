# Tiếp tục từ đây — 28/10/2026

Chỉ đọc [AGENTS](AGENTS.md) và file này khi bắt đầu. [ROADMAP](ROADMAP.md) là backlog duy nhất; [README](README.md) chỉ mục theo công việc.

| Phần | Context hiện tại |
|---|---|
| Source | `work` chốt memory backfill H6b, `main` chờ merge. Implementation source`c8c18e2`; sau đó docs/evidence/tests/ledger. Policy/renderer/UI giữ nguyên. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi+NPC,60cửa, tag/pet/bike, DOM tên/thoại, audio opt-in,5khóm/30cây. G0 gzip/pixel budget/pause/chat/keyboard/reduced-motion có rồi, không2D. |
| AI/dữ liệu | LinUCB6D,8domain/gates, policy store0007/CAS, memories top-K/RAG,49context cards/33nơi; H3 archived reward evidence. H6b bulk/cursor offline đã có. Không fine-tune LLM. |
| Đã kiểm |60suite/check/lint/build/assets/API local đạt. Backfill dry-run/CAS/concurrency/owner-local guards/silent-ignore D1 rollback và preservation đạt.123source/18batch thêm40giữ16, rescan0. Không UI/browser mới; G0 QA source`e5f5583` giữ nguyên. |
| Schema/prod | Source16table, thêm migration0008 job/receipt+index. **Chưa migrate/backfill production**. [latest](docs/releases/latest.json) là deploy verified cuối; [candidate](docs/releases/candidate.json) là gói **chưa deploy**. |

**Memory backfill local đã có:** [LEARNING](docs/LEARNING.md), [contract](docs/validation/memory-backfill-contract-v1.json), [evidence](docs/validation/memory-backfill-2026-10-28.json). `npm run memories:backfill` mặc định preview, chỉ owner+local-admin+loopback; apply cần plan/head SHA, không tự retry. Source episode phải gán rõ recipient, outcome phải verified fingerprint-v1; không suy từ speaker/current roles/memory rings. Giữ timestamp nguồn và mọi row cũ/legacy/divergent. CAS source page/memory scope/raw world và nonce; memory+checkpoint+receipt một D1 batch, postassert rollback cả khi INSERT bị ignore. Born/config/version/high-water cố định theo job, appends cần job mới. Receipt chỉ attests page lúc commit, không full-content snapshot; source repair cũ riêng. Không UPDATE/DELETE memory/world/policy/history. Job complete không có nghĩa khôi phục mọi dữ liệu thiếu chứng cứ.

**Bước code tiếp:** H6b dataset curation/few-shot/DPO — cùng prompt/context/model và source/version, actor/recipient isolation, validator thật. Heuristic/score98 không là quality label; không tự fine-tune/thuê GPU hoặc promote model. Dữ liệu hiện có gồm curated fixtures và audited replay; phải phân biệt synthetic/editorial với observed simulation source, không suy preference hay role lịch sử từ state hiện tại.

**Nền học:** H2/H4/H6/H10 chưa promote; H10 không candidate đủ validation và holdout12000–12019 **chưa quan sát**, không retune seeds đã xem. Bulk replay private không tăng earned samples/skills/memories; runtime importer/version/rollback/CAS chưa có. H3b/H5 vẫn chờ server ground/encounter authority, không cấp reward/P2P từ ETA/thoại/render. Seed ranges và studies ở LEARNING/protocols.

**Blocker prod:** thiếu native Sites credential/deploy/status/DB tools, user đã cho phép merge/push/prod, không hỏi lại. Candidate trước source`a974743` giữ tới khi chốt gói memory backfill. Khi tools có lại: đúng project/audience, backup/schema0006/0007/**0008**, exact-SHA deploy/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Migration0008 không tự backfill; không bật local-admin ở Site để vượt guard. Không tạo Site/cron khác hoặc tìm credential cũ.

Ground/playback còn viewer-local, completion backend simtime+plan match chưa physical arrival. Gallery chưa placement mọi loài; Society/NIM vẫn backlog có điều kiện, không hosted trial output vào production. Không GPU/soak/live QA mới.

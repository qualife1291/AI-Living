# Tiếp tục từ đây — 28/10/2026

Chỉ đọc [AGENTS](AGENTS.md) và file này khi bắt đầu. [ROADMAP](ROADMAP.md) là backlog duy nhất; [README](README.md) chỉ mục theo công việc.

| Phần | Context hiện tại |
|---|---|
| Source | `work` có H6b curation offline; main đang ở memory backfill. Xem Git cho HEAD. Code đã xong;61suite/check/lint đạt, release build/API/assets đang đợi. Chưa gọi phase hoàn tất release. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi+NPC,60cửa, tag/pet/bike, DOM tên/thoại, audio opt-in,5khóm/30cây. G0 gzip/pixel budget/pause/chat/keyboard/reduced-motion có rồi, không2D. |
| AI/dữ liệu | LinUCB6D,8domain/gates, policy store0007/CAS, memories top-K/RAG,49context cards/33nơi; H3 archived reward evidence. H6b replay bulk/cursor, memory backfill local, curation offline. Không fine-tune LLM. |
| Schema/prod | Source16table; migration0008 job/receipt+index **chưa migrate/backfill production**. [latest](docs/releases/latest.json) là deploy verified cuối; [candidate](docs/releases/candidate.json) là gói chưa deploy. |

**WIP release curation:** compiler `lib/dataset-curation.ts`, `npm run training:curate` default preview; exact canonical request/context/model/sampling/source SHA, explicit review human/agent, existing proposalSchema+reviewNarrative, own actor/memory scope, connected splits và offline train-only selector. Export600/atomic/exclusive dưới Gitignored private training.6fixture mới đều **editorial**,5train/0validation/1holdout đã review, không blind model evaluation;6partial DPO cũ không nâng nhãn. Capture/reviewer là khai báo, hash không chứng thực server/ground hay ngữ nghĩa. Không model calls/training/importer/runtime prompt/world/policy/schema/UI đổi. Contract/evidence và cách dùng ở [LEARNING](docs/LEARNING.md). Cần release build, compiled API/assets, verify offline code/fixtures không vào Worker, final evidence/handoff, merge/push và candidate ledger.

**Bước code tiếp sau gates:** server-owned ground/timeline/encounter authority foundation để mở H3b/H5; xem ROADMAP. Hai viewer lệch giờ phải thống nhất, arrival kiểm plan/revision/path/collision/speed, không thưởng/P2P từ ETA/thoại/client receipt. Giữ rewardv1 và dữ liệu lịch sử. Corpus model thật/A-B cần exact capture mới, review và frozen protocol/holdout riêng; chưa runtime few-shot.

**Nền học:** H2/H4/H6/H10 chưa promote; H10 không candidate đủ validation và holdout12000–12019 **chưa quan sát**, không retune seeds đã xem. Bulk replay private không tăng earned samples/skills/memories; runtime artifact importer/version/rollback/CAS chưa có. Memory backfill additive chỉ owner+local-admin+loopback, default preview, apply plan/head SHA; không source/legacy inference hoặc production call. Chi tiết/giới hạn/receipt và evidence ở LEARNING, không đọc toàn validation mặc định.

**Blocker prod:** thiếu native Sites credential/deploy/status/DB tools; user đã cho phép merge/push/prod, không hỏi lại. Candidate memory source`5bcb99a` còn nguyên cho tới khi gói mới verified. Khi tools có lại: đúng project/audience, backup/schema0006/0007/**0008**, exact-SHA deploy/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Migration0008 không tự backfill; không bật local-admin trên Site, tạo Site/cron khác hoặc tìm credential cũ.

Ground/playback hiện viewer-local, completion backend simtime+plan match chưa physical arrival. Gallery chưa placement mọi loài; Society/NIM vẫn backlog có điều kiện. Không GPU/soak/live QA mới; UI/renderer giữ nguyên, browser G0 source`e5f5583` là bằng chứng cũ.

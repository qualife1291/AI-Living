# Tiếp tục từ đây — 28/10/2026

Chỉ đọc [AGENTS](AGENTS.md) và file này khi bắt đầu. [ROADMAP](ROADMAP.md) là backlog duy nhất; [README](README.md) chỉ mục theo công việc.

| Phần | Context hiện tại |
|---|---|
| Source | H6b curation offline đã hoàn tất, `main`/`work` đồng bộ; xem Git cho HEAD. Implementation/release source`aae6fbc`, sau đó chỉ docs/evidence/ledger. Runtime/policy/renderer/UI/schema giữ nguyên so memory backfill. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi+NPC,60cửa, tag/pet/bike, DOM tên/thoại, audio opt-in,5khóm/30cây. G0 gzip/pixel budget/pause/chat/keyboard/reduced-motion có rồi, không2D. |
| AI/dữ liệu | LinUCB6D,8domain/gates, policy store0007/CAS, memories top-K/RAG,49context cards/33nơi; H3 archived reward evidence. H6b replay bulk/cursor, memory backfill local, curation offline. Không fine-tune LLM. |
| Đã kiểm |61/61suite, TypeScript/lint/release build/assets/API compiled D1 local đạt. Code curation/fixture không vào Worker/archive;829entries/source/migration và26gzip byte-verified.23MD/99local links hợp lệ. Không browser/live QA mới. |
| Schema/prod | Source16table; migration0008 job/receipt+index **chưa migrate/backfill production**. [latest](docs/releases/latest.json) là deploy verified cuối; [candidate](docs/releases/candidate.json) là gói chưa deploy. |

**Curation local đã có:** `lib/dataset-curation.ts`, `npm run training:curate` default preview; exact request/context/model/sampling/source SHA, explicit semantic review, proposalSchema+reviewNarrative, own actor/memory scope, connected splits và offline train-only selector. Đổi source ID không giấu được review trái ngược cùng prompt/model/sampling. Export600/atomic/exclusive private.6fixture mới đều **editorial**,5train/0validation/1holdout đã review, không blind model evaluation;6partial DPO cũ không nâng nhãn. Capture/reviewer là khai báo, hash không chứng thực server/ground hay ngữ nghĩa. Không model calls/training/importer/runtime prompt đổi. [LEARNING](docs/LEARNING.md) giữ cách dùng/giới hạn; [evidence](docs/validation/dataset-curation-2026-10-28.json) giữ kiểm thực tế.

**WIP hiện tại:** Ground GND1 local server walking timeline theo [contract](docs/validation/ground-timeline-contract-v1.json): ba core/static footprints + peer collision, fixed simsteps, CAS/session/receipt migration0009 và owner-local API/CLI. Bootstrap không chứng minh vị trí lịch sử; không backdate plan mới, không nhận client pose/time. Scope chưa traffic/NPC/renderer chung nên chưa đủ cấp reward/P2P hoặc claim shared-world physical arrival. Chưa code/kiểm hoàn tất. Ground integration đầy đủ vẫn là phụ thuộc H3b/H5; giữ rewardv1 và lịch sử.

**Nền học:** H2/H4/H6/H10 chưa promote; H10 không candidate đủ validation và holdout12000–12019 **chưa quan sát**, không retune seeds đã xem. Bulk replay private không tăng earned samples/skills/memories; runtime artifact importer/version/rollback/CAS chưa có. Memory backfill additive chỉ owner+local-admin+loopback, default preview, apply plan/head SHA; không source/legacy inference hoặc production call. Chi tiết/giới hạn/receipt và evidence ở LEARNING, không đọc toàn validation mặc định.

**Blocker prod:** thiếu native Sites credential/deploy/status/DB tools; user đã cho phép merge/push/prod, không hỏi lại. Gói source`aae6fbc` tại `work/production-aae6fbc.tar.gz`, SHA/829entries ở candidate.json, **chưa deploy**; latest.json giữ nguyên. Khi tools có lại: đúng project/audience, backup/schema0006/0007/**0008**, exact-SHA deploy/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Migration0008 không tự backfill; không bật local-admin trên Site, tạo Site/cron khác hoặc tìm credential cũ.

Ground/playback hiện viewer-local, completion backend simtime+plan match chưa physical arrival. Gallery chưa placement mọi loài; Society/NIM vẫn backlog có điều kiện. Không GPU/soak/live QA mới; UI/renderer giữ nguyên, browser G0 source`e5f5583` là bằng chứng cũ.

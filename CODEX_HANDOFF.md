# Tiếp tục từ đây — 28/10/2026

Chỉ đọc [AGENTS](AGENTS.md) và file này khi bắt đầu. [ROADMAP](ROADMAP.md) là backlog duy nhất; [README](README.md) chỉ mục theo công việc.

**WIP GND2:** triển khai theo [contract v2](docs/validation/ground-shared-contract-v2.json): journal world commit/clock, serialized all-actor+traffic physics, shared frame renderer opt-in local và reuse pulse. Chưa code/kiểm hoàn tất; GND1/prod candidate bên dưới là mốc trước phase này.

| Phần | Context hiện tại |
|---|---|
| Source | GND1 local ground foundation hoàn tất; `main`/`work` đồng bộ, xem Git cho HEAD. Implementation/release source`e1c130a`; sau đó chỉ docs/evidence/ledger. Learning/world/clock/pulse/renderer/assets giữ nguyên. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi+NPC,60cửa, tag/pet/bike, DOM tên/thoại, audio opt-in,5khóm/30cây. G0 transport/pixel budget/UX có rồi, không2D. |
| AI/dữ liệu | LinUCB6D,8domain/gates, policy store0007/CAS, memories top-K/RAG,49cards/33nơi; H3 evidence. H6b replay bulk/cursor, backfill local, curation offline có rồi; không fine-tune. |
| Đã kiểm |62/62suite/check/lint/build/assets, existing API và ground API compiled D1 local đạt; extended segmented-clock target đạt. Shared A* chỉ tách module/logger,1089route/5401frame regression đạt. Không browser/live QA mới. |
| Schema/prod | Source18table, thêm0009 ground session/ledger. **Chưa migrate0008/0009 hay backfill production**. Health8probes giữ nguyên, ground schema là local opt-in. [latest](docs/releases/latest.json) là deploy verified cuối; [candidate](docs/releases/candidate.json) là gói chưa deploy. |

**GND1 đã có:** `lib/living/ground-{timeline,store}.ts`, `lib/city/walk-path.ts`; `npm run ground:timeline` default status, preview không ghi, start/advance explicit operation UUID+checkpoint. Owner+local-admin+loopback, không client pose/time/path.100ms fixed-step,600tick/request,16unit/s, shared static footprints + relative swept core discs; backlog giữ lại. Bootstrap location là simulation seed, plan có sẵn làm baseline; plan mới chỉ chạy sau observation, không backdate/teleport. State/operation receipt+SQL postassert cùng world/session CAS, lost-ACK dedup **cả advance0tick**, receipt pin và silent-ignore rollback. [ARCHITECTURE](docs/ARCHITECTURE.md) giữ CLI/contract/giới hạn; [evidence](docs/validation/ground-timeline-2026-10-28.json) giữ kiểm thực tế.

**Ranh giới:** namespace `server-ground-core-static-v1` chỉ3core/static local, chưa NPC/thú/xe/boarding/tag/renderer chung. Receipt luôn không eligible reward/P2P, không chứng minh activity completion, knowledge transfer hoặc shared-world physical arrival. Renderer/reading/playback vẫn viewer-local; existing learning rewardv1 không đổi. Không tự advance/pulse/scheduler hoặc bật production.

**Bước tiếp:** Ground GND2 — lifecycle plan/world source và occupancy toàn actor/traffic, rồi renderer dùng chung timeline/clock; kiểm hai viewer mở lệch giờ. Giữ scope/bootstrap/collision/speed/cancel/pause/CAS rõ, không nâng nhãn receipt GND1 hoặc backfill lịch sử. H3b/H5 vẫn chờ full authority và gates riêng.

**Nền học:** H2/H4/H6/H10 chưa promote; H10 holdout12000–12019 **chưa quan sát**, không retune seeds đã xem. Curation6pair mới là editorial5train/0validation/1holdout đã review, không blind evaluation/model capture; chưa runtime importer/few-shot. Backfill local additive chỉ đúng recipient/evidence, không suy legacy/history. Chi tiết ở [LEARNING](docs/LEARNING.md); không đọc toàn validation mặc định.

**Blocker prod:** thiếu native Sites credential/deploy/status/DB tools; user đã cho phép merge/push/prod, không hỏi lại. Gói source`e1c130a` tại `work/production-e1c130a.tar.gz`,834entries/SHA trong candidate.json, **chưa deploy**. Khi tools có lại: đúng project/audience, backup/schema0006/0007/**0008/0009**, exact-SHA deploy/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không bật local-admin trên Site, tạo Site/cron khác hoặc tìm credential cũ. Migration không tự backfill/start session. Không GPU/soak mới; browser G0 source`e5f5583` là bằng chứng cũ.

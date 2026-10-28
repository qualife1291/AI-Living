# Tiếp tục từ đây — 29/10/2026

Đọc [AGENTS](AGENTS.md) và file này trước. [ROADMAP](ROADMAP.md) là backlog duy nhất; chỉ mở tài liệu đúng chủ đề.

| Phần | Context hiện tại |
|---|---|
| Source | Acceptance app/camera source`4ecb5f5`;20harness và63suite đạt. `work` đã nhận tài liệu Cloudflare mới từ `origin/main`; xem Git cho HEAD. Code hosting/auth QA nằm trên `cloudflare-qa`, **chưa được nhập vào app branch này**. |
| Nghiệm thu | [Report](docs/validation/acceptance-2026-10-28.json):95run,27lượt lỗi+disposition,4nhóm API gồm6legacy HTTP,4timeline120s+studio desktop/mobile,9[ảnh thật](docs/screenshots/acceptance-2026-10-28/). Profile local/synthetic/SwiftShader, không phải live/GPU/soak. |
| Sửa thật | Camera xét tán cây và hai chủ thể, chuyển góc tránh che, giãn theo khoảng cách companion;91%desktop/99%mobile visible+sightline. Giữ seed, bounded catch-up, không teleport. Daemon example theo cảnh, từ chối finish_reason bị cắt. |
| AI/dữ liệu | LinUCB6D/8domain/store0007, RAG/49cards, replay/bulk/backfill/curation có rồi. Không fine-tune/promote. H1 full tái lập hash nhưng return/needs trượt; H2/H4/H6/H10 giữ negative; holdout12000–12019 chưa mở. Model thực còn lặp/semantics yếu, đã từ chối. |
| Schema | Source21table đến0010. **Chưa migrate0008–0010/start/backfill DB người dùng/Sites A**. Health8probes giữ nguyên. DB fixture API/browser riêng; không lấy seed làm lịch sử thật. |
| Bước tiếp | Theo user: **GND3 sau functional local acceptance**. Nghiệm thu local đã chốt; [protocol GND3](docs/validation/ground-authority-contract-v1.json) đã freeze, đang bắt đầu code outcome/encounter/server-emitted speech. Chưa có GND3 runtime/schema. Reward/P2P/model promotion và rollout vẫn có gate riêng. |

**GND2:** `shared-ground{,-store,-view}.ts`, `city/director-state.ts`; explicit local start, immutable world source journal trong transaction writer.246actor/12car, serialized Walk/Traffic/Tag/Pet,100ms real ticks chia≤100ms sim,≤20outer/120physics; backlog giữ lại. Canonical ground clock riêng tích phân accepted pause/scale, không sửa world/reward clock. Exact state/world/source CAS+receipt+postassert, zero-tick lost ACK, source revision+1 (SQLite seq gaps được phép),9schema objects/preflight chặn đứt journal trước pulse writes. Bootstrap là simulation seed.

**Viewer:** `?ground=shared` chỉ owner+local-admin+loopback; remote owner vẫn403. Reuse pulse/poll1s, base gate9s; không cron mới. Sample20server frames theo aligned time−1,5s, không physics/spawn/extrapolation theo viewer; roster/body đổi giữ whole frame. Shared preview chưa phát script/thoại viewer-local. GND1/GND2 receipts chưa eligible reward/P2P. [ARCHITECTURE](docs/ARCHITECTURE.md) giữ hợp đồng/CLI. GND3 cần plan/window/cancel, co-location+duration, clock mapping và nguồn/recipient; **planned dialogue không là emitted/heard/witnessed**.

**Giới hạn nghiệm thu:** Một renderer-host failure khi chạy đồng thời native tests+browser chưa rõ nguyên nhân; chạy riêng đạt. Chưa nhận concurrency-resource stress, liveness/catch-up dài, GPU hoặc24h soak. Curation6pair mới là editorial5train/0validation/1holdout đã review, chưa blind model A/B/runtime importer; không retune study seeds.

**Ba môi trường riêng:**

- **Sites A production:** [ledger](docs/releases/latest.json) là readback lịch sử cuối, native Sites tools phiên này vẫn thiếu. Candidate`33cd6ae` đã verify archive nhưng cũ hơn acceptance fixes, **chưa deploy**. Full backup/schema/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md) trước migration/cutover; quyền release đã có, không hỏi lại. Không tìm token cũ/bật local-admin/tạo lịch trùng.
- **Cloudflare staging:** [runbook](docs/CLOUDFLARE_STAGING.md); agent khác ghi source`2c51d4c`, version`01929deb`, deployment`75a4ac0f`, owner-only Access, D1 staging riêng, không import Sites A, chưa authenticated browser QA/cron. Các đoạn bootstrap/disabled cũ trong runbook là lịch sử.
- **Cloudflare QA:** [runbook](docs/CLOUDFLARE_AGENT_QA.md), branch`cloudflare-qa` tự build/deploy riêng. Cập nhật muộn nhất: signed JWT patch`7d9254dc`, version`f43759da`, deployment`c1c69d3a`; Static Assets không forward`ctx.access`, vì vậy không tin header chưa verify. **POST authenticated sau patch chưa được kiểm**, không nhận remote PASS. Phiên này không có Cloudflare tools hoặc `CF_ACCESS_CLIENT_ID/SECRET`/API token hiện hành; không tìm secret cũ. Remote QA/independent review theo PR template **còn BLOCKED**, giữ code trên`work`, chưa promote main/staging/prod. Không merge WIP sang QA branch hoặc nới Access.

**Môi trường làm việc:** artifacts/logs tại`work/acceptance-2026-10-28/`, report đã commit. Preview5340 dùng DB riêng`/tmp/xom-acceptance-20261028-state`; CPU model tạm đã dừng, file public SHA-pinned giữ lại. Build/package trước preview; cache`dist/server/.wrangler` phải đưa khỏi dist. Dùng `work/acceptance-2026-10-28/stop-preview.py` để dừng đúng server của task, không xóa DB. Không để launcher browser cũ/scheduler trùng chạy lại.

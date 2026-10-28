# Tiếp tục từ đây — 28/10/2026

Chỉ cần đọc [AGENTS](AGENTS.md) và file này khi bắt đầu. [ROADMAP](ROADMAP.md) là backlog duy nhất, [README](README.md) chỉ mục theo công việc.

| Phần | Context hiện tại |
|---|---|
| Source | `main`/`work` chốt G0/UX; xem Git cho HEAD. QA source`e5f5583`, các commit sau chỉ docs/evidence/harness/ledger. LinUCB cá nhân giữ nguyên; G0 đổi transport/renderer/controls, không đổi reward/features/persistence. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi+NPC, tag/pet/bike, nhãn/thoại DOM,60cửa, audio opt-in,5khóm/30cây có care. Không renderer2D. |
| AI/dữ liệu | LinUCB6D,8domain skills/gates, policy store0007/CAS, memories top-K/RAG, dialogue hashes,49context cards/33nơi; H3 archived reward evidence, snapshot chỉ summary. Không fine-tune LLM. |
| Đã kiểm | G0:58suite/check/lint/build/assets/API local đạt. Browser desktop/mobile: lỗi pause/ACK, chat, keyboard,320px,DPR/poll/OSM/hidden/context retry/reduced-motion/fallback. SwiftShader, không hardware GPU/live QA. |
| Production | [latest.json](docs/releases/latest.json) là deploy verified cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) là gói chuẩn bị **chưa deploy**; không suy live từ Git. |

**H10 v1 đã kết thúc không selection:** [LEARNING](docs/LEARNING.md), [protocol](docs/validation/learning-h10-protocol-v1.json), [evidence](docs/validation/learning-h10-2026-10-28.json). Fit9000/point9500/search10000/validation11000 tách. Grid9warm6/12/24×k0,5/2/5,691.200search plans. Amendment effect gate đăng ký trước search: warm6 chỉ forced sleep, không là improvement candidate. Freeze w12-k2/w24-k2 trước1.658.880validation plans; cả hai chưa đủ gates2profile. Holdout12000–12019 **chưa quan sát**, status0plan và không outcome files. Không retune search/validation hoặc tự mở holdout sau thất bại.

**G0/UX đã xong:** [evidence](docs/validation/g0-ux-2026-10-28.json), [ASSETS](docs/ASSETS.md), [RENDERING](docs/RENDERING.md).26 gzip transport giữ canonical/license/hash; pixel budget thành phố, pause status/ACK không tự retry, chat focus/draft, keyboard/reduced-motion và metadata. Browser encoded model resources4,33→1,02MB;3repeat với CDP30ms/2MBs cho median first-ready desktop4,41→2,77s/mobile4,21→2,63s, không SLA. Unshaped single samples còn trong evidence, không suy nhanh hơn mọi thiết bị.

**Bước code tiếp:** H6b bulk/cursor replay **local** theo [ROADMAP](ROADMAP.md), giữ actor isolation/source SHA/dedup/conflict và chỉ tăng checkpoint sau batch được chấp nhận; không tự ghi DB/production. Memory backfill additive/CAS và dataset curation là phần còn lại riêng. H3b/H5 chờ server ground/encounter authority; runtime priors vẫn cần protocol/version/rollback/CAS và bằng chứng trước activation.

**Nền học cần giữ:** H2/H4/H6 đều chưa promote; H6 có actor-scoped local JSONL replay SHA-pinned, unique source records một lượt, conflicts reject, legacy không suy bổ sung. Private model artifacts chỉ Gitignored .sites-runtime/training. Không tăng earned trials/skills/memory hoặc chép donor posterior. Seeds đã xem: H2eval2000–2019; H4train3000/val4000/holdout5000; H6train6000/val7000/holdout8000; H10fit9000/point9500/search10000/val11000 (xem protocol cho range). Không gán role lịch sử từ role hiện tại.

**Blocker prod:** thiếu native Sites credential/deploy/status/DB tools; user đã cho phép merge/push/prod, không hỏi lại. Gói H10 source`6473e98` đã build/package, SHA256 và796entries đã xác minh trong candidate.json; gói local `work/production-6473e98.tar.gz` **chưa deploy**. Khi công cụ có lại: xác minh project/audience, backup/schema0006/0007, exact-SHA deploy/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo Site/cron khác hoặc tìm credential cũ. Git push không phải Sites deploy.

**Giới hạn:** ground/playback/tag/pet/bike còn theo viewer; completion backend theo simtime+plan match, chưa physical arrival. Không cấp skill/P2P từ ETA/thoại/render. Gallery không là placement của mọi loài. Society WP20–27/NIM vẫn backlog có điều kiện; không hosted trial API/output vào production. Bằng chứng cũ ở validation/screenshots/releases, không cần đọc toàn bộ mặc định.

# Tiếp tục từ đây — 28/10/2026

Chỉ cần đọc [AGENTS](AGENTS.md) và file này để bắt đầu. [README](README.md) chỉ mục tài liệu theo công việc; [ROADMAP](ROADMAP.md) là backlog duy nhất.

| Phần | Context hiện tại |
|---|---|
| Source | `work` và `main` đồng bộ; xem `git status/log` cho HEAD. Default policy giữ LinUCB; H1 tách outcome thuần và thêm CLI rollout/paired comparison, chưa đưa policy mới lên runtime. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi + NPC, tag/pet/bike, nhãn/thoại DOM, 60 cửa nhà, audio opt-in, 5 khóm hoa/30 cây có growth/moisture/care. Không còn renderer 2D. |
| AI/dữ liệu | LinUCB 6D, 8 domain skills/gates, policy table 0007/CAS, memories top-K/RAG, dialogue hashes, 49 context cards/33 nơi. Đây là học policy mô phỏng, chưa fine-tune LLM. |
| Đã kiểm | H1 source: 52 suite + TypeScript/lint/build/assets/API local đạt. D1: 20 pulse→1 pipeline; compiled HTTP: 12 viewer→1 pipeline. Browser flora/social/home/cycle/pet desktop/mobile đã đạt ở UI trước H0; H0 không đổi renderer. |
| Production | [latest.json](docs/releases/latest.json) là lần deploy đã xác minh cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) ghi source/gói đã chuẩn bị, **chưa deploy**. Không suy trạng thái live từ Git. |

**Bước code tiếp — H2:** đã review Claude/Deepseek và hoàn tất H1, không thêm spec/memory MD. Đọc ROADMAP + LEARNING phần H1. Trước residual/EMA/prior cần stress/cold-start profile (baseline needs gần1, competence/recovery đều3ngày); dùng raw reward/version/context-at-choice, không giả samples. Ngưỡng candidate tương lai: return/needs không giảm, feasible opportunity cost không tăng, entropy≥80% bằng paired CI. Giữ default LinUCB khi chưa đạt; offline prior/tuning ưu tiên trước G0/UX, P2P chờ encounter authority.

**Blocker:** phiên gần nhất thiếu native Sites credential/deploy/status/DB tools. User đã cho phép merge/push/prod; thiếu capability không phải thiếu quyền. Candidate H1 đã đóng gói đúng source trong candidate.json. Khi công cụ có lại, xác minh project/audience, backup/schema 0006/0007, deploy đúng candidate và readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo cron/Site khác, bỏ client pulse hoặc tìm credential cũ.

**Giới hạn cần nhớ:** ground/playback/tag/pet/bike còn theo viewer; backend completion theo simtime+plan matching, chưa authoritative arrival. Không cấp skill/P2P từ ETA, lời kể hoặc render. Gallery không đồng nghĩa mọi loài đã sống trong phố. Chưa GPU điện thoại/soak/model A/B thực.

H1:20seed×60ngày×24agent,691.200plan/policy,15375outcome/1500choice golden giữ nguyên; full repeat cùng hash. Tabular reward1,224431 vs LinUCB1,196251; opportunity cost3,938199 vs3,382465 nên không claim thắng toàn diện. Chỉ đọc hai file đầu vào; docs chủ đề mở theo nhu cầu. Kết quả backend/UI cũ giữ tại [validation](docs/validation/), [ảnh QA](docs/screenshots/) và [release ledgers](docs/releases/); lịch sử triển khai chi tiết nằm trong Git, không cần đọc mặc định.

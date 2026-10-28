# Tiếp tục từ đây — 28/10/2026

Chỉ cần đọc [AGENTS](AGENTS.md) và file này để bắt đầu. [README](README.md) chỉ mục tài liệu theo công việc; [ROADMAP](ROADMAP.md) là backlog duy nhất.

| Phần | Context hiện tại |
|---|---|
| Source | `work` và `main` đồng bộ; xem `git status/log` cho HEAD. App giữ hành vi H0; đợt mới chỉ dọn docs, sửa tham chiếu ZIP và comment. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi + NPC, tag/pet/bike, nhãn/thoại DOM, 60 cửa nhà, audio opt-in, 5 khóm hoa/30 cây có growth/moisture/care. Không còn renderer 2D. |
| AI/dữ liệu | LinUCB 6D, 8 domain skills/gates, policy table 0007/CAS, memories top-K/RAG, dialogue hashes, 49 context cards/33 nơi. Đây là học policy mô phỏng, chưa fine-tune LLM. |
| Đã kiểm | H0 source: 51 suite + TypeScript/lint/build/assets/API local đạt. D1: 20 pulse→1 pipeline; compiled HTTP: 12 viewer→1 pipeline. Browser flora/social/home/cycle/pet desktop/mobile đã đạt ở UI trước H0; H0 không đổi renderer. |
| Production | [latest.json](docs/releases/latest.json) là lần deploy đã xác minh cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) ghi source/gói đã chuẩn bị, **chưa deploy**. Không suy trạng thái live từ Git. |

**Bước code tiếp:** H1 benchmark rollout runtime≥20 seed, regret/entropy/repeat/needs stability/variance; sau đó G0 tải/resolution và UX. Đọc [ROADMAP](ROADMAP.md), rồi chỉ [LEARNING](docs/LEARNING.md) và script benchmark nếu làm H1.

**Blocker:** phiên gần nhất thiếu native Sites credential/deploy/status/DB tools. User đã cho phép merge/push/prod; thiếu capability không phải thiếu quyền. Khi công cụ có lại, xác minh project/audience, backup/schema 0006/0007, deploy đúng candidate và readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo cron/Site khác, bỏ client pulse hoặc tìm credential cũ.

**Giới hạn cần nhớ:** ground/playback/tag/pet/bike còn theo viewer; backend completion theo simtime+plan matching, chưa authoritative arrival. Không cấp skill/P2P từ ETA, lời kể hoặc render. Gallery không đồng nghĩa mọi loài đã sống trong phố. Chưa GPU điện thoại/soak/model A/B thực.

Đã dọn tài liệu: 82→23 file Markdown; chỉ đọc hai file đầu vào, các tài liệu chủ đề mở theo nhu cầu. Liên kết/tham chiếu và ZIP source đã kiểm đạt; không thay hành vi ứng dụng. Kết quả backend/UI cũ giữ tại [validation](docs/validation/), [ảnh QA](docs/screenshots/) và [release ledgers](docs/releases/); lịch sử triển khai chi tiết nằm trong Git, không cần đọc mặc định.

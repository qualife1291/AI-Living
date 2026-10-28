# Tiếp tục từ đây — 28/10/2026

Chỉ cần đọc [AGENTS](AGENTS.md) và file này để bắt đầu. [README](README.md) chỉ mục tài liệu theo công việc; [ROADMAP](ROADMAP.md) là backlog duy nhất.

| Phần | Context hiện tại |
|---|---|
| Source | `work` đang có H2; `main` chờ merge sau kiểm chứng. Xem `git status/log` cho HEAD. Default policy giữ LinUCB; H1 tách outcome thuần và thêm CLI rollout/paired comparison, chưa đưa policy mới lên runtime. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi + NPC, tag/pet/bike, nhãn/thoại DOM, 60 cửa nhà, audio opt-in, 5 khóm hoa/30 cây có growth/moisture/care. Không còn renderer 2D. |
| AI/dữ liệu | LinUCB 6D, 8 domain skills/gates, policy table 0007/CAS, memories top-K/RAG, dialogue hashes, 49 context cards/33 nơi. Đây là học policy mô phỏng, chưa fine-tune LLM. |
| Đã kiểm | H1 source: 52 suite + TypeScript/lint/build/assets/API local đạt. D1: 20 pulse→1 pipeline; compiled HTTP: 12 viewer→1 pipeline. Browser flora/social/home/cycle/pet desktop/mobile đã đạt ở UI trước H0; H0 không đổi renderer. |
| Production | [latest.json](docs/releases/latest.json) là lần deploy đã xác minh cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) ghi source/gói đã chuẩn bị, **chưa deploy**. Không suy trạng thái live từ Git. |

**Đang chốt H2:** code được cố định tại `a0cd226`; protocol đã đăng ký trước ở validation/learning-h2-protocol-v1.json. Hai profile ×4 policy ×20seed giữ lại(2000–2019),24agent×60ngày đã hoàn tất; prior riêng từng profile train8seed(1000–1007). Raw reports/prior/comparisons ở validation/h2-v1. Cả3 candidate đều trượt return gate; stress còn trượt needs gate. Residual giảm MSE trên cùng decision nhưng warm chưa chứng minh thêm lợi ích return. Giữ runtime/default LinUCB, không fake samples/ghi liveDB.53suite/check/lint/build/assets/API compiled local đã đạt. Còn full deterministic repeat/CLI guard, lưu evidence tổng hợp và cập nhật LEARNING/ROADMAP, rồi merge/push. Không chỉnh tham số theo20seed đã xem; H2 chưa đủ điều kiện promotion.

**Blocker:** phiên gần nhất thiếu native Sites credential/deploy/status/DB tools. User đã cho phép merge/push/prod; thiếu capability không phải thiếu quyền. Candidate H1 đã đóng gói đúng source trong candidate.json. Khi công cụ có lại, xác minh project/audience, backup/schema 0006/0007, deploy đúng candidate và readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo cron/Site khác, bỏ client pulse hoặc tìm credential cũ.

**Giới hạn cần nhớ:** ground/playback/tag/pet/bike còn theo viewer; backend completion theo simtime+plan matching, chưa authoritative arrival. Không cấp skill/P2P từ ETA, lời kể hoặc render. Gallery không đồng nghĩa mọi loài đã sống trong phố. Chưa GPU điện thoại/soak/model A/B thực.

H1:20seed×60ngày×24agent,691.200plan/policy,15375outcome/1500choice golden giữ nguyên; full repeat cùng hash. Tabular reward1,224431 vs LinUCB1,196251; opportunity cost3,938199 vs3,382465 nên không claim thắng toàn diện. Chỉ đọc hai file đầu vào; docs chủ đề mở theo nhu cầu. Kết quả backend/UI cũ giữ tại [validation](docs/validation/), [ảnh QA](docs/screenshots/) và [release ledgers](docs/releases/); lịch sử triển khai chi tiết nằm trong Git, không cần đọc mặc định.

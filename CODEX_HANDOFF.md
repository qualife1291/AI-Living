# Tiếp tục từ đây — 28/10/2026

Chỉ cần đọc [AGENTS](AGENTS.md) và file này để bắt đầu. [README](README.md) chỉ mục tài liệu theo công việc; [ROADMAP](ROADMAP.md) là backlog duy nhất.

| Phần | Context hiện tại |
|---|---|
| Source | `work` đang có H3; `main` ở mốc H2, chờ merge sau gates; xem Git cho HEAD. Xem `git status/log` cho HEAD. Default policy giữ LinUCB; H1 outcome/rollout và H2 prior/residual/cold-stress chỉ offline, chưa đưa policy mới lên runtime. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi + NPC, tag/pet/bike, nhãn/thoại DOM, 60 cửa nhà, audio opt-in, 5 khóm hoa/30 cây có growth/moisture/care. Không còn renderer 2D. |
| AI/dữ liệu | LinUCB 6D, 8 domain skills/gates, policy table 0007/CAS, memories top-K/RAG, dialogue hashes, 49 context cards/33 nơi. Đây là học policy mô phỏng, chưa fine-tune LLM. |
| Đã kiểm | H2 source:53 suite + TypeScript/lint/build/assets/API local đạt; full repeat H1/warm stress/prior byte-identical. D1: 20 pulse→1 pipeline; compiled HTTP: 12 viewer→1 pipeline. Browser flora/social/home/cycle/pet desktop/mobile đã đạt ở UI trước H0; H0 không đổi renderer. |
| Production | [latest.json](docs/releases/latest.json) là lần deploy đã xác minh cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) ghi source/gói đã chuẩn bị, **chưa deploy**. Không suy trạng thái live từ Git. |

**H2 v1 đã đánh giá, không promote:** [LEARNING](docs/LEARNING.md) có kết quả; [evidence](docs/validation/learning-h2-2026-10-28.json) trỏ protocol/raw reports và CLI guards. Hai profile ×4 policy ×20seed giữ lại(2000–2019),24agent×60ngày =5.529.600plan; hai prior train8seed/profile(1000–1007) riêng. Cả3 candidate trượt return, stress còn trượt needs. Residual giảm MSE cùng decision nhưng warm chưa chứng minh thêm lợi ích return; không fine-tune LLM. Giữ runtime/default LinUCB, không fake samples/liveDB. Không retune20seed đã xem. Observer hiện chỉ offline checkpoint; runtime còn cần durable receipt/CAS.

**Đang H3 (WIP):** review Society/NIM đã gộp vào [ROADMAP](ROADMAP.md), evidence ở validation/society-nim-review-2026-10-28.json. Đã kiểm điều khoản/model card NVIDIA qua tài liệu công khai, không gọi inference hoặc xin key. Đã có version/breakdown reward hiện hành, settlement/context/sample/plan-binding evidence trong archive CAS và inspector offline; giữ v1 reward/context/matrices và legacy. Đã bắt và sửa regression legacy plan chỉ có start anchor: giữ outcome cũ, matched key/duration=null và audit legacy-unverified. Targeted/golden/API compiled/CAS race đạt ở lượt đầu; cần chạy lại full54suite/check/lint/build/API trên bản fix. Full H1 repeat có kết quả, còn đối chiếu hash/evidence/đóng gói. Phải push checkpoint trước các bước dài. Sau đó H4 hierarchy. Có thể làm với LinUCB hiện hành; không bật candidate H2 đã thất bại. Reward mới chỉ từ outcome có authority, không cấp skill/social/travel từ ETA/thoại. H2 promotion vẫn chờ phiên bản/protocol/seed mới nếu tiếp tục nghiên cứu. H6 còn archive replay/curriculum; synthetic prior H2 chỉ là một phần, không đánh dấu hoàn tất.

**Blocker:** phiên gần nhất thiếu native Sites credential/deploy/status/DB tools. User đã cho phép merge/push/prod; thiếu capability không phải thiếu quyền. Candidate H2 đã đóng gói đúng source `d835821` trong candidate.json; experimental modules không vào Worker. Khi công cụ có lại, xác minh project/audience, backup/schema 0006/0007, deploy đúng candidate và readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo cron/Site khác, bỏ client pulse hoặc tìm credential cũ.

**Giới hạn cần nhớ:** ground/playback/tag/pet/bike còn theo viewer; backend completion theo simtime+plan matching, chưa authoritative arrival. Không cấp skill/P2P từ ETA, lời kể hoặc render. Gallery không đồng nghĩa mọi loài đã sống trong phố. Chưa GPU điện thoại/soak/model A/B thực.


Bằng chứng backend/UI cũ ở [validation](docs/validation/), [ảnh QA](docs/screenshots/) và [release ledgers](docs/releases/); lịch sử triển khai trong Git. Không đọc toàn bộ mặc định.

# Tiếp tục từ đây — 28/10/2026

Chỉ cần đọc [AGENTS](AGENTS.md) và file này để bắt đầu. [README](README.md) chỉ mục tài liệu theo công việc; [ROADMAP](ROADMAP.md) là backlog duy nhất.

| Phần | Context hiện tại |
|---|---|
| Source | `work` đang triển khai H4; `main` còn H3 foundation. Xem `git status/log` cho HEAD. Default policy giữ LinUCB. H3 thêm evidence archive/audit; H1/H2 experimental policies vẫn offline. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi + NPC, tag/pet/bike, nhãn/thoại DOM, 60 cửa nhà, audio opt-in, 5 khóm hoa/30 cây có growth/moisture/care. Không còn renderer 2D. |
| AI/dữ liệu | LinUCB 6D, 8 domain skills/gates, policy table 0007/CAS, memories top-K/RAG, dialogue hashes, 49 context cards/33 nơi. Đây là học policy mô phỏng, chưa fine-tune LLM. |
| Đã kiểm | H3 source:54suite + TypeScript/lint/build/assets/API local/CAS đạt; full H1 byte-identical. H2 warm stress/prior repeat ở evidence cũ. D1: 20 pulse→1 pipeline; compiled HTTP: 12 viewer→1 pipeline. Browser flora/social/home/cycle/pet desktop/mobile đã đạt ở UI trước H0; H0 không đổi renderer. |
| Production | [latest.json](docs/releases/latest.json) là lần deploy đã xác minh cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) ghi source/gói đã chuẩn bị, **chưa deploy**. Không suy trạng thái live từ Git. |

**H3 foundation đã có:** [LEARNING](docs/LEARNING.md) và [evidence H3](docs/validation/learning-h3-2026-10-28.json) mô tả version/breakdown reward hiện hành, settlement before/after/context/sample/plan-binding, audit JSONL offline. Full evidence ở archive, snapshot chỉ summary200record; cùng CAS/policy transaction. Legacy giữ bytes và mức binding yếu/unknown, không backfill. Không đổi raw reward/LinUCB, không physical arrival/social/commitment authority.54suite/check/lint/build/assets/API compiled/CAS đạt; H1 full repeat giữ byte/hash.

**Đang H4 (WIP):** protocol đã đăng ký tại validation/learning-h4-protocol-v1.json trước kết quả: global/role.kind priors từ completed synthetic H3 evidence, bounded prediction blend, personal uncertainty/samples/matrices không đổi. Train3000–3007, validation4000–4007, holdout5000–5019. Đã có trainer/strict SPD artifact/immutable selector, actual catalog role.kind wrapper, CLI train/eval và targeted guards đạt; golden H1 giữ nguyên. Còn full55suite/check/lint/build/API, full study/repeat và evidence; chưa đo full. Không bật production hoặc nhận private archived records. Phải push checkpoint trước bước dài. H3b reward dài hạn chờ authority; không thưởng từ ETA/thoại. H6 archive replay/curriculum chưa xong. H2 v1 đã đánh giá và **không promote**; không retune20seed2000–2019 đã xem hoặc bật residual thất bại. Nếu nghiên cứu policy mới phải có protocol/train-validation-holdout mới.

**Đề xuất Society/NIM:** đã gộp vào [ROADMAP](ROADMAP.md), đối chiếu chi tiết ở [review](docs/validation/society-nim-review-2026-10-28.json). WP20–27 là tương lai có phụ thuộc; sửa accounting/knowledge/retention assumptions, không tạo root spec/MEMORY. NVIDIA trial API và output không dùng production; mới kiểm tài liệu chính thức, chưa key/inference/account/quota hay benchmark. Không chặn thứ tự học hiện tại để làm NIM.

**Blocker:** phiên gần nhất thiếu native Sites credential/deploy/status/DB tools. User đã cho phép merge/push/prod; thiếu capability không phải thiếu quyền. Candidate H3 đã đóng gói đúng source `891691f` trong candidate.json; offline audit/experimental policy không vào Worker. Khi công cụ có lại, xác minh project/audience, backup/schema 0006/0007, deploy đúng candidate và readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo cron/Site khác, bỏ client pulse hoặc tìm credential cũ.

**Giới hạn cần nhớ:** ground/playback/tag/pet/bike còn theo viewer; backend completion theo simtime+plan matching, chưa authoritative arrival. Không cấp skill/P2P từ ETA, lời kể hoặc render. Gallery không đồng nghĩa mọi loài đã sống trong phố. Chưa GPU điện thoại/soak/model A/B thực.


Bằng chứng backend/UI cũ ở [validation](docs/validation/), [ảnh QA](docs/screenshots/) và [release ledgers](docs/releases/); lịch sử triển khai trong Git. Không đọc toàn bộ mặc định.

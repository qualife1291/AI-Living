# Tiếp tục từ đây — 28/10/2026

Chỉ cần đọc [AGENTS](AGENTS.md) và file này để bắt đầu. [README](README.md) chỉ mục tài liệu theo công việc; [ROADMAP](ROADMAP.md) là backlog duy nhất.

| Phần | Context hiện tại |
|---|---|
| Source | `work` đang H6; `main` còn H4. Xem `git status/log` cho HEAD. Default policy giữ LinUCB. H3 thêm evidence archive/audit; H1/H2 experimental policies vẫn offline. |
| Sản phẩm | Thành phố Three.js, An/Bình/Chi + NPC, tag/pet/bike, nhãn/thoại DOM, 60 cửa nhà, audio opt-in, 5 khóm hoa/30 cây có growth/moisture/care. Không còn renderer 2D. |
| AI/dữ liệu | LinUCB 6D, 8 domain skills/gates, policy table 0007/CAS, memories top-K/RAG, dialogue hashes, 49 context cards/33 nơi. Đây là học policy mô phỏng, chưa fine-tune LLM. |
| Đã kiểm | H4 source:55suite + TypeScript/lint/build/assets/API local/CAS đạt; full H1 byte-identical. H2 warm stress/prior repeat ở evidence cũ. D1: 20 pulse→1 pipeline; compiled HTTP: 12 viewer→1 pipeline. Browser flora/social/home/cycle/pet desktop/mobile đã đạt ở UI trước H0; H0 không đổi renderer. |
| Production | [latest.json](docs/releases/latest.json) là lần deploy đã xác minh cuối, chưa readback lại. [candidate.json](docs/releases/candidate.json) ghi source/gói đã chuẩn bị, **chưa deploy**. Không suy trạng thái live từ Git. |

**H3 foundation đã có:** [LEARNING](docs/LEARNING.md) và [evidence H3](docs/validation/learning-h3-2026-10-28.json) mô tả version/breakdown reward hiện hành, settlement before/after/context/sample/plan-binding, audit JSONL offline. Full evidence ở archive, snapshot chỉ summary200record; cùng CAS/policy transaction. Legacy giữ bytes và mức binding yếu/unknown, không backfill. Không đổi raw reward/LinUCB, không physical arrival/social/commitment authority.54suite/check/lint/build/assets/API compiled/CAS đạt; H1 full repeat giữ byte/hash.

**H4 offline v1 đã đánh giá, không promote:** [LEARNING](docs/LEARNING.md), [protocol](docs/validation/learning-h4-protocol-v1.json) và [evidence H4](docs/validation/learning-h4-2026-10-28.json). Global/role.kind priors chỉ từ synthetic H3 completed outcomes, k5 confidence riêng; không copy donor samples/matrices/skills/memory.2profile,8train/8validation/20holdout seed mới,552.960train+5.806.080eval plans. Ngày1 reward và cùng-decision MSE tốt hơn, nhưng reward60ngày giảm ở cả hai profile; role-vs-global chưa có lợi ích rõ. Giữ LinUCB cá nhân; model/artifact H4 không vào Worker. Full prior/role-stress/H1 repeat byte/hash giữ nguyên.55suite/check/lint/build/assets/API local/CAS đạt.

**Đang H6 (WIP):** protocol đăng ký tại validation/learning-h6-protocol-v1.json trước kết quả. Replay H3 compatible numeric outcomes, actor-scoped local import, exact dedup/conflict guard, một lượt chronological/curriculum; kiểm ridge order-invariance. Synthetic warm24-k5 hypothesis dùng train6000–6007/validation7000–7007/holdout8000–8019; không retune seed cũ. Đã có replay corpus/dedup/conflict/actor filter, strict model, CLI local hash-pinned private-only, synthetic trainer/order validation và warm24 wrapper; targeted/golden/check đạt. 56suite/check/lint/build/assets/API đạt; fullstudy đã chạy: ridge order agreement<1e-8, warm24 chưa đủ promotion gates. Đang thêm compiled JSONL→actor replay integration và chạy full deterministic repeats/evidence. Code model cố địnhc6c3123, không retune. Phải push checkpoint trước bước dài. Không ghi DB hoặc tăng earned samples. H3b/H5 chờ ground/encounter authority. H4 runtime còn cần role-at-choice thật, artifact installation/version/rollback/CAS nếu có candidate đủ bằng chứng. H2 v1 cũng không promote. Không retune các seed đã xem: H2eval2000–2019; H4train3000–3007/validation4000–4007/holdout5000–5019. Warm-only/cutoff chỉ là giả thuyết cho protocol/seed mới, chưa triển khai.

**Đề xuất Society/NIM:** đã gộp vào [ROADMAP](ROADMAP.md), đối chiếu chi tiết ở [review](docs/validation/society-nim-review-2026-10-28.json). WP20–27 là tương lai có phụ thuộc; sửa accounting/knowledge/retention assumptions, không tạo root spec/MEMORY. NVIDIA trial API và output không dùng production; mới kiểm tài liệu chính thức, chưa key/inference/account/quota hay benchmark. Không chặn thứ tự học hiện tại để làm NIM.

**Blocker:** phiên gần nhất thiếu native Sites credential/deploy/status/DB tools. User đã cho phép merge/push/prod; thiếu capability không phải thiếu quyền. Candidate H4 đã đóng gói đúng source `cccc544` trong candidate.json; offline audit/hierarchy models không vào Worker. Khi công cụ có lại, xác minh project/audience, backup/schema 0006/0007, deploy đúng candidate và readback theo [runbook](docs/PRODUCTION_RUNBOOK.md). Không tạo cron/Site khác, bỏ client pulse hoặc tìm credential cũ.

**Giới hạn cần nhớ:** ground/playback/tag/pet/bike còn theo viewer; backend completion theo simtime+plan matching, chưa authoritative arrival. Không cấp skill/P2P từ ETA, lời kể hoặc render. Gallery không đồng nghĩa mọi loài đã sống trong phố. Chưa GPU điện thoại/soak/model A/B thực.


Bằng chứng backend/UI cũ ở [validation](docs/validation/), [ảnh QA](docs/screenshots/) và [release ledgers](docs/releases/); lịch sử triển khai trong Git. Không đọc toàn bộ mặc định.

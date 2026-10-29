# Context tiếp nhận — 29/10/2026

Đọc [AGENTS](AGENTS.md), file này rồi [ROADMAP](ROADMAP.md). ROADMAP là backlog duy nhất; mở tài liệu chủ đề khi cần contract. Lịch sử test, SHA và lỗi đã xử lý nằm trong validation/Git, không chép lại vào handoff.

| Phần | Trạng thái cần giữ |
|---|---|
| Git | `work` là nhánh tích hợp; `work` đã nhận bản Studio 5989cff; `main` còn ở 402df57 khi đối chiếu. Fetch trước push, giữ cập nhật của agent khác. QA/staging có hosting/auth riêng, không merge wrapper ngược vào work/main. |
| Live và học | Runtime có 41 scenario, LinUCB cá nhân, memory/domain skills/RAG. H6 có 96 candidate ở catalog/sandbox riêng; QA 7157c32 thêm marker `shadow-only`, chưa chạy scorer hoặc promote model. [Learning](docs/LEARNING.md), [H6](docs/H6_OFFLINE_POLICY_SCALE.md). |
| Ground/P2P | GND1–3 có local journal/replay/receipt; H3b/H5a chỉ offline. Chưa nối receipt thành reward thực, own-memory hay P2P live. Không import proof JSON như authority. [Kiến trúc](docs/ARCHITECTURE.md). |
| Đồ họa | Supplied rigs/crowd/wardrobe/contact/camera đã có nghiệm thu local. Bản sửa focus người bế mèo và kích thước khăn đã vào work (5989cff); bằng chứng local giữ cả lỗi hình trước sửa và navigation timeout. Chưa nghiệm thu remote/GPU/soak. [Rendering](docs/RENDERING.md), [graphics evidence](docs/validation/graphics-interactions-2026-10-29.json). |
| QA | Structured log, progress snapshot/CLI, Access/D1 riêng và một Cron đã có. Native proof mới nhất trong [Ops evidence](docs/validation/qa-observability-2026-10-29.json) gắn source 4377ed7; QA 7157c32 mới hơn, không tự kế thừa readback cũ. Authenticated browser/GPU/24 giờ soak còn chờ. [Runbook QA](docs/CLOUDFLARE_AGENT_QA.md). |
| Production | Sites A: [ledger](docs/releases/latest.json) là readback lịch sử version 11; [candidate](docs/releases/candidate.json) là gói 77d1d1f chưa deploy. Source23 table đến 0011 không chứng minh DB live đã migrate. Backup full DB/schema và readback trước cutover; không reset IDs/born/history/memory/policy. [Runbook](docs/PRODUCTION_RUNBOOK.md). |
| Asset nguồn | Canonical/derivative/license giữ trong app; ZIP gốc thuộc vault ngoài app, phải kiểm tồn tại/hash theo [registry](data/assets/source-archives.json). Chưa có bằng chứng backup ngoài workspace thành công. [ASSETS](docs/ASSETS.md). |

Công việc tiếp theo: đóng acceptance QA/prod và các blocker ưu tiên trong ROADMAP; H5b cần durable offer/receipt authenticity/inbox CAS trước runtime. Nghiên cứu H2/H3b/H4/H6/H10 chưa đạt promotion gates; không retune cohort đã xem. H6 heavy là kết quả offline, không bằng chứng field gain.

Đợt hiện tại chỉ hợp nhất/dọn tài liệu. Giữ validation JSON, release audit, đặc tả người dùng và giấy phép; không đổi runtime/schema/model hoặc deploy QA chỉ vì sửa docs. H6 shadow có chủ sở hữu riêng; fetch và đối chiếu nhánh trước khi phát triển tiếp để tránh triển khai trùng.

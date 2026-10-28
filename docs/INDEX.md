# Bản đồ Hệ thống Tài liệu Xóm AI

Toàn bộ tài liệu của dự án **Xóm AI** được cơ cấu thành **6 mục chuyên đề** rõ ràng, giúp chủ dự án và các tác nhân AI (Codex / Automation) tra cứu nhanh mà không bị chồng chéo.

---

> Hiện hành 28/10: [Review Claude](CLAUDE_REVIEW_2026-10-28.md), [H0 pulse](PHASE_H0_PULSE.md), [Review Gemini](GEMINI_REVIEW_2026-10-28.md), [Phase D](PHASE_D_LEARNING.md), [Context/memory](CONTEXT_AND_MEMORY.md), [Cửa nhà](PHASE_C_HOMES.md), [Audio](PHASE_E_AMBIENCE.md), [Vườn cây](PHASE_E_GARDENS.md), [Phần còn lại](NEXT_PHASES.md), [Candidate](releases/candidate.json). Các tài liệu cũ chỉ giữ lịch sử; không phục hồi renderer 2D.

> Tiếp nối mới: [Xe đạp di chuyển và va chạm toàn xe](CYCLING.md).

> Hiện hành: [Chỉ dùng 3D và thú đi theo chủ](THREE_ONLY_AND_PETS.md).

> Review trước đó: [main/Gemini và bugfix 27/10](MAIN_REVIEW_2026-10-27.md).

## 0. Điểm vào & Điều phối tại Thư mục gốc

| Tài liệu | Vai trò |
|---|---|
| [../README.md](../README.md) | Tổng quan sản phẩm, hướng dẫn cài đặt, chạy kiểm thử và cấu trúc thư mục |
| [../AGENTS.md](../AGENTS.md) | Quy tắc bắt buộc hiện hành cho tác nhân AI khi đọc/sửa mã nguồn và vận hành |
| [../CODEX_HANDOFF.md](../CODEX_HANDOFF.md) | Hướng dẫn bàn giao, trạng thái hiện tại và thứ tự công việc tiếp theo |
| [../ROADMAP.md](../ROADMAP.md) | Lộ trình phát triển Phase 1–5 kết hợp Sprint 0–4 |
| [../MEMORY_SHORT.md](../MEMORY_SHORT.md) | Việc chưa xong và các điểm chặn (blockers) hiện hành |
| [../MEMORY_LONG.md](../MEMORY_LONG.md) | Quyết định kiến trúc dài hạn, lịch sử các đợt kiểm tra và thông số hệ thống |
| [../CHANGELOG.md](../CHANGELOG.md) | Nhật ký thay đổi sản phẩm theo thời gian |

---

## Mục I — Tầm nhìn, Thiết kế Mở rộng & Sinh thái

| Tài liệu | Nội dung chính |
|---|---|
| [THREE_WORLD.md](THREE_WORLD.md) | Lịch sử chuyển sang 3D; fallback 2D trong tài liệu này đã bị gỡ |
| [VISION.md](VISION.md) | Trải nghiệm đích, nguyên tắc nhân quả, ký ức gắn người chứng kiến và đạo đức mô phỏng |
| [DESIGN_PROPOSALS.md](DESIGN_PROPOSALS.md) | **Thiết kế mở rộng hoàn chỉnh (§0–§8 & Phụ lục G):** Đồng hồ thế giới, chu kỳ ngày/đêm, thời tiết TP.HCM, 16 hoạt cảnh, vòng đời cây trồng, Utility AI động vật, tiếng ríu Web Audio, âm thanh đường phố và phân quyền Viewer/Admin |
| [CHARACTER_DESIGN.md](CHARACTER_DESIGN.md) | Thiết kế hình khối, khớp xương (rig) và cá tính của 3 robot An, Bình, Chi |
| [ANIMAL_BEHAVIOR.md](ANIMAL_BEHAVIOR.md) | Nguồn tài liệu khoa học và luật tập tính của mèo Mướp, chó Cún, đàn sẻ |
| [ANIMATION_SOURCES.md](ANIMATION_SOURCES.md) | Nguồn tham khảo kỹ thuật SVG transform-origin, rAF, pathfinding và giao thông |

---

## Mục II — Kiến trúc, Hợp đồng API & Mô hình Dữ liệu

| Tài liệu | Nội dung chính |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc hiện hành: Three.js, Worker/D1, planner/presentation và giới hạn authority |
| [API.md](API.md) | Hợp đồng chi tiết cho `GET/POST /api/world`, `POST /api/events`, `GET /api/instructions`, `GET /api/health` |
| [DATA_MODEL.md](DATA_MODEL.md) | 14 bảng D1, policy tách snapshot, bất biến dữ liệu và migration append-only đến 0007 |
| [GLOSSARY.md](GLOSSARY.md) | Từ điển thuật ngữ chuẩn dùng thống nhất trong mã nguồn và tài liệu |

---

## Mục III — Trí tuệ Nhân tạo, Tổng hợp Bối cảnh & Bộ AI Tự Training

| Tài liệu | Nội dung chính |
|---|---|
| [AI_BEHAVIOR.md](AI_BEHAVIOR.md) | Cơ chế phối hợp giữa luật mô phỏng và lượt LLM, quy tắc hội thoại có thời điểm (`atSecond`) |
| [AI_TRAINING_AND_CONTEXTS.md](AI_TRAINING_AND_CONTEXTS.md) | **Kỹ thuật tổng hợp 24 bối cảnh đa chiều** (`data/contexts/`) và **Bộ dữ liệu AI tự training** (`data/training/`: SFT Golden Episodes, DPO Preference Pairs, Self-Play Curriculum 8 cấp độ, Reflexion Evaluator) |

---

## Mục IV — Hồ sơ Quyết định Kiến trúc (`docs/DECISIONS/`)

| Tài liệu | Quyết định |
|---|---|
| [DECISIONS/ADR-0001-event-sourcing-snapshot.md](DECISIONS/ADR-0001-event-sourcing-snapshot.md) | Kết hợp bảng lịch sử `episodes` (nguồn chân lý) và `worlds` (snapshot đọc nhanh) |
| [DECISIONS/ADR-0002-shared-deterministic-simulation.md](DECISIONS/ADR-0002-shared-deterministic-simulation.md) | Dùng chung hàm mô phỏng tất định `lib/life.ts` và `lib/clock.ts` giữa client và server |
| [DECISIONS/ADR-0003-server-tick-and-automation.md](DECISIONS/ADR-0003-server-tick-and-automation.md) | Đường ghi sự kiện thống nhất `lib/apply-event.ts` cho cả Automation và Server Tick |
| [DECISIONS/ADR-0004-segmented-world-clock.md](DECISIONS/ADR-0004-segmented-world-clock.md) | Đồng hồ thế giới phân đoạn (`anchors`) hỗ trợ tạm dừng và đổi tốc độ không nhảy vị trí |
| [DECISIONS/ADR-0005-witness-bound-memory-retrieval.md](DECISIONS/ADR-0005-witness-bound-memory-retrieval.md) | Ký ức gắn người chứng kiến (`witnessed_with`) và bộ dữ liệu DPO chống rò rỉ thông tin |
| [DECISIONS/ADR-0006-framework-vinext-vs-spa-hono.md](DECISIONS/ADR-0006-framework-vinext-vs-spa-hono.md) | Giữ Vinext ổn định ở giai đoạn hiện tại và lộ trình chuyển nhẹ sang Vite SPA + Hono nếu cần |
| [DECISIONS/ADR-0007-isolated-testing-and-production-safety.md](DECISIONS/ADR-0007-isolated-testing-and-production-safety.md) | Kiểm thử cô lập, chặn mặc định mọi lệnh ghi từ xa vào production |
| [DECISIONS/ADR-0008-access-control-viewer-vs-admin.md](DECISIONS/ADR-0008-access-control-viewer-vs-admin.md) | Giữ chế độ `owner-private` và thiết kế sẵn ranh giới Viewer vs Admin khi mở rộng |

---

## Mục V — Vận hành, Bảo mật & Đóng góp

| Tài liệu | Nội dung chính |
|---|---|
| [OPERATIONS.md](OPERATIONS.md) | Hướng dẫn chạy local, quản lý D1 migration, lịch tự động và giới hạn chi phí 0đ |
| [RUNBOOK.md](RUNBOOK.md) | Quy trình xử lý sự cố: lệch revision 409, lỗi tick, sao lưu D1 và dọn bản ghi `-stale` an toàn |
| [SECURITY.md](SECURITY.md) | Mô hình bảo mật, kiểm tra kích thước payload thực tế, chống CSRF và chống prompt-injection nội bộ |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Quy chuẩn định dạng mã, lệnh kiểm tra bắt buộc và quy trình đóng gói bàn giao |
| [STARTER_REFERENCE.md](STARTER_REFERENCE.md) | Tài liệu tham khảo gốc của nền tảng Vinext starter |

---

## Mục VI — Kiểm thử & Báo cáo Đánh giá

| Tài liệu | Nội dung chính |
|---|---|
| [TESTING.md](TESTING.md) | Kết quả chạy 4 bộ unit test (`life`, `events`, `animation`, `training`), checklist nghiệm thu |
| [TECHNICAL_REVIEW.md](TECHNICAL_REVIEW.md) | Báo cáo review kỹ thuật toàn diện (Phần 1) và bảng đối chiếu trạng thái sửa lỗi L1–L10 |
| [ZIP_REVIEW.md](ZIP_REVIEW.md) | Báo cáo kiểm tra tính toàn vẹn của gói ZIP bàn giao (bao gồm `.gitignore`, `.npmrc` và SHA-256) |

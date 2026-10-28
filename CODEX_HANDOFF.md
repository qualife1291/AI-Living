# Tiếp nhận Xóm AI

| Trạng thái | Chi tiết |
|---|---|
| Source | User đã merge work vào main; HEAD và MEMORY_SHORT cho biết nguồn đang làm, releases/candidate.json cho biết mốc đã đóng gói, latest.json chỉ ghi deploy đã xác minh |
| Renderer | Chỉ3D; giữ XZ/nav/canvastextures/icon cần dùng, không phục hồi SVG/fallback2D |
| Tài nguyên | 41Kenney +239Gobkit/KayKit canonical CC0; gallery on-demand; core+focusedNPC dùng skin độc lập |
| QA nguồn đã merge | 50unit/API/check/lint/build/hash, desktop/mobile social6/cycle/overlay/pet/3Dretry; gallery15packs vàmobile, garden5phase/30plants/care/camera; giới hạn ở MEMORY_LONG |
| Production | docs/releases/latest.json là ledger đã xác minh cuối; không suy ra từ SHA GitHub |

Đọc AGENTS.md → MEMORY_SHORT.md → MEMORY_LONG.md → ROADMAP.md trước sửa. Sau đó đọc docs/GEMINI_REVIEW_2026-10-28.md, docs/ASSET_EXPANSION.md và docs/PRODUCTION_RUNBOOK.md.

Cài nếu thiếu node_modules: `bash scripts/sites-env.sh -- corepack pnpm install --frozen-lockfile --prefer-offline --store-dir .sites-runtime/pnpm-store`. Node>=22.18, pnpm11.25.0. Kiểm tra bằng npm run test:unit/check/lint/assets:check/build/test:api:local; browser phải dùng Worker khởi động mới sau build.

Không resetDB/memory/history; migration append-only, backup trướcprod. Chỉ dùng native Sites credential mới với project cũ, không tìm token trongfile hoặc tạo site khác. User đã cho phép merge/push và một bảnprod; không hỏi lại quyền đã có. Mỗi checkpoint phải push và ghi phần chưa test, không nhận WIP là hoàn tất. Không paidAPI/public/video/crontrùng.

Tài liệu bàn giao ngày24/10 giữ tại [history/CODEX_HANDOFF_2026-10-24](docs/history/CODEX_HANDOFF_2026-10-24.md) chỉ để tra cứu lịch sử; hướng dẫn hiện hành ở ARCHITECTURE/DATA_MODEL/TESTING.

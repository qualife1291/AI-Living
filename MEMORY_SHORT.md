# Bàn giao work — 27/10/2026
- Đọc docs/PAIRED_TAG.md cho phần đuổi bắt theo cặp mới trong phiên 3D và kết quả test. Source/checkpoint141971c,71859cb; ảnh/metrics QA cuối được push cùng tài liệu sau đó. Không lặp lại phần đã hoàn tất. Review trước đó: docs/WORK_REVIEW_2026-10-27.md.
- Còn: đồng bộ vai/tag qua nhiều viewer hoặc 2D; hiện reload/đổi renderer/tập actor sẽ khởi tạo cặp lại. Không tự tuyển người chưa chọn tag; chưa có xác nhận completion vật lý ở backend hoặc reward cho lượt bắt.
- Backlog kế tiếp: xe đạp di chuyển có collision toàn thân, thú theo chủ, density/household/traffic graph, LinUCB/skill gates, durable dialogue history/model A-B. Chưa hoàn tất C/D; chọn từng phần với tiêu chí nghiệm thu rõ ràng.
- Chưa nghiệm thu điện thoại/GPU thật, soak30phút/24giờ,150người/80xe/p95<33ms; zero collision trong fixture không chứng minh mọi tình huống hết kẹt.
- Main vẫn a5b7c5a; chỉ push work. Production ledger vẫn version11/c1ddea1, chưa deploy hoặc xác minh live trong các lượt này. Trước release cần backup mới, kiểm tra migration0006 thực tế và giữ owner-private. Không reset DB/test fixture trên production.
- Luôn push checkpoint và cập nhật bàn giao trước test lâu; không commit .dev.vars/DB/cache hoặc tạo automation trùng/API tính phí. Cài: bash scripts/sites-env.sh -- corepack pnpm install --frozen-lockfile --prefer-offline --store-dir .sites-runtime/pnpm-store.

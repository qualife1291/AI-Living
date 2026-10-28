# Quy tắc làm việc

Đọc **file này và [CODEX_HANDOFF.md](CODEX_HANDOFF.md)** khi bắt đầu. Chỉ mở tài liệu đúng chủ đề được liên kết từ handoff/README; không đọc toàn bộ docs hoặc lịch sử Git để lấy context mặc định.

- Tiếng Việt, `Asia/Ho_Chi_Minh`; không phát sinh phí, giữ Site **owner-private**. Video/social/public/multi-user chưa được bật.
- Chỉ renderer 3D. Giữ XZ/navigation, texture canvas và icon còn dùng; không khôi phục SVG/fallback 2D.
- Giữ ID, `world.born`, ký ức, history, home, petOwners và policy. Không reset DB/xóa dữ liệu thật để sửa lỗi. Migration append-only, backup đầy đủ trước repair/migration production.
- Không commit/in token, credential, `.env`, DB hoặc cache. Credential mới qua native Sites/hidden stdin; không tìm token cũ, tạo Site khác hoặc vượt audience. Dùng project trong `.openai/hosting.json`.
- Không tạo automation trùng. ID/lịch đã ghi ở [runbook](docs/PRODUCTION_RUNBOOK.md); xác minh trước khi sửa. Thiếu native tools thì tiếp tục local và ghi blocker.
- Không thêm subagent nếu người dùng hoặc hướng dẫn áp dụng chưa yêu cầu. Không tự gửi email/tin nhắn, mua dịch vụ hoặc đăng social.
- Rules/animation/plan outcome, editorial script và lượt LLM có nguồn riêng. Không gọi chúng là suy nghĩ 24/7, fine-tune hay physical completion khi chưa có bằng chứng ground.
- Chia phase, push checkpoint `work` trước bước dài; ghi WIP/blocker trong handoff. Quyền merge/push và một bản prod đã có từ chủ dự án; không hỏi lại. Task tài liệu không tự yêu cầu deploy app.
- Kiểm thử theo thay đổi ở [TESTING](docs/TESTING.md). Không chạy `test-world.mjs`/`verify-live.py` lên production mặc định. Browser QA phải dùng build mới và gửi ảnh thực, ghi preview hay production; không dùng ảnh AI làm bằng chứng.
- Phát hành theo runbook: backup/schema, exact source SHA, version/deployment/env revision/readback, cập nhật ledger. GitHub push không phải Sites deploy. Gỡ `XOM_OWNER_PRIVATE_ORIGIN` trước khi thay audience.

**Giữ tài liệu gọn:** handoff chỉ context hiện tại/blocker; ROADMAP chỉ việc chưa xong; CHANGELOG chỉ mốc sản phẩm; hợp đồng/giới hạn ở tài liệu chủ đề. Không tạo MEMORY_SHORT/LONG, WIP/review theo phiên hoặc chép lại nhật ký kiểm thử. Dùng Git history, validation JSON và release ledger cho bằng chứng cũ. Xóa/gộp tài liệu phải sửa cả liên kết và danh sách đóng gói; giữ giấy phép, đặc tả gốc cần tra cứu và release audit.

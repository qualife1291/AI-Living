# Hướng dẫn cho Codex tiếp tục Xóm AI

1. Đọc CODEX_HANDOFF.md, MEMORY_SHORT.md, MEMORY_LONG.md và ROADMAP.md trước khi sửa.
2. Yêu cầu chủ dự án: tất cả không phát sinh phí; chưa làm video; giữ Site owner-private; tiếng Việt; Asia/Ho_Chi_Minh.
3. Chia phase, triển khai tuần tự. Mỗi lần browser QA có ảnh phải gửi ảnh thực tế cho người dùng, phân biệt preview và production. Không gửi ảnh minh họa như bằng chứng test.
4. Cập nhật tài liệu cùng thay đổi. MEMORY_SHORT.md chỉ chứa context mới, việc chưa xong và blocker; xóa mục hoàn thành, xóa file nếu trống. MEMORY_LONG.md lưu stack, quyết định, theme, chuẩn test, kết quả và giới hạn. CHANGELOG.md ghi thay đổi sản phẩm.
5. Không reset DB, không xóa lịch sử/ký ức thật để xử lý lỗi. Không sửa migration đã áp dụng; append migration mới. Backup trước repair production.
6. Không hardcode/in/lưu token, API key hoặc .env trong source/ZIP/logs. Credential chỉ truyền qua cơ chế bí mật hoặc stdin. Không dùng service access để bỏ qua audience.
7. Tác vụ ChatGPT độc lập có ID trong MEMORY_LONG.md; không tạo trùng vì get_site.automations rỗng. Dùng automations.peek nếu có công cụ.
8. Đường đi, động vật, câu chào theo luật là mô phỏng. Lượt LLM sinh kế hoạch/hội thoại có nguồn riêng. Không gọi là suy nghĩ 24/7, tự huấn luyện hoặc AI động vật chuyên biệt.
9. Chạy test-life, test-events, TypeScript và build sau thay đổi liên quan. Kiểm thử local trước live. Không chạy verify-live.py hoặc test-world.mjs lên production mặc định.
10. Source ZIP không chứa production snapshot; không được suy luận dữ liệu seed là dữ liệu live hiện tại.
11. Không tự mua dịch vụ, cấu hình billing hoặc tự đăng social. Không thêm subagent nếu không được yêu cầu bởi người dùng hoặc hướng dẫn áp dụng.
12. Nếu có Sites skill: tái sử dụng project_id trong .openai/hosting.json; xin credential mới bằng native tool, không create_site mới. Nếu không có: tiếp tục local, không đoán token, ID hoặc remote.

13. Yêu cầu mới: push các mốc source lên nhánh hiện hành và cập nhật MEMORY_SHORT.md trong quá trình làm, nhất là trước bước kiểm thử lâu/rủi ro mất env. Ghi rõ WIP và kiểm tra chưa hoàn tất; không để trạng thái chỉ nằm trong chat. Không commit secrets, DB hoặc cache.

14. Khi phát hành: cập nhật docs/releases/latest.json và ledger theo ngày với SHA source, version/deployment ID, status, env revision và kiểm tra readback; push cả mốc trước build và nhật ký sau deploy. Không coi push GitHub là deploy Sites. Không lưu secret/backup DB vào Git. Đọc PRODUCTION_RUNBOOK.md; gỡ XOM_OWNER_PRIVATE_ORIGIN trước thay audience.

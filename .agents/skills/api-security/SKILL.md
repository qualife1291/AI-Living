---
name: api-security
description: Application and API security review and implementation - threat modeling, OWASP Top 10 2025 mapping, object-level and function-level authorization (BOLA, BFLA), input validation and mass assignment, SSRF, rate limiting, CORS and security headers, file uploads, error handling, and secrets. Use for any change touching authorization, user input, external URLs, uploads, API exposure, or security audits.
---

# API Security

## Chuẩn tham chiếu (kiểm chứng 2026-11-16)
- OWASP Top 10:2025 là khung chính để phân loại rủi ro. Các thay đổi đáng chú ý so với 2021:
  - A01 Broken Access Control vẫn đứng đầu và đã gộp SSRF vào đây.
  - A02 Security Misconfiguration tăng từ hạng 5 lên hạng 2.
  - A03 Software Supply Chain Failures là mục mới.
  - A10 Mishandling of Exceptional Conditions là mục mới.
- OWASP ASVS là checklist chi tiết để kiểm chứng từng yêu cầu. Chọn cấp độ phù hợp với rủi ro sản phẩm.
- Với AI agent và MCP: xem `ai-agent-integrations`.

## Operating contract
1. Đọc `AGENTS.md`, route/controller, middleware xác thực, model và schema, và cấu hình CORS, headers, rate limit.
2. Tách **evidence** (file:line), **assumption**, **recommendation**. Không kết luận "an toàn" khi chưa kiểm chứng.
3. Định nghĩa test tấn công và test hợp lệ trước khi sửa. Báo PASS/FAIL/NOT RUN.

## Threat modeling nhanh
- Xác định tài sản (dữ liệu, tài khoản, tiền, quyền admin), người dùng (ẩn danh, đã đăng nhập, tenant khác, admin, dịch vụ nội bộ), và điểm vào (API, webhook, upload, URL do người dùng cung cấp).
- Áp dụng STRIDE cho từng điểm vào: giả mạo, sửa đổi, chối bỏ, lộ thông tin, từ chối dịch vụ, leo thang đặc quyền.
- Ghi lại kiểm soát hiện có và khoảng trống. Ưu tiên theo khả năng xảy ra × tác động.

## Authorization (A01)
- Kiểm tra quyền ở server cho **mọi** request, không chỉ ở giao diện hay menu.
- BOLA (Broken Object Level Authorization): với mọi ID tài nguyên, kiểm tra người gọi có quyền trên đúng bản ghi đó. Test bằng hai tài khoản: thử truy cập tài nguyên của tài khoản kia.
- BFLA (Broken Function Level Authorization): endpoint admin và nội bộ phải có kiểm tra vai trò riêng. Đừng dựa vào việc "URL không công khai".
- Multi-tenant: mọi truy vấn phải lọc theo tenant. Kiểm tra tenant lấy từ session, không từ tham số client.
- Deny by default: endpoint mới không có quyền mặc định nào.
- Không tin các trường như `role`, `price`, `userId`, `isAdmin` nhận từ client. Tính lại trên server.

## Input validation và mass assignment
- Validate schema ở mọi ranh giới. Từ chối trường không khai báo.
- Chống mass assignment: không ghép thẳng body vào model. Chọn rõ các trường được phép cập nhật.
- Giới hạn kích thước, độ sâu, và số phần tử. Chặn regex có nguy cơ ReDoS.
- Chuẩn hoá trước khi kiểm tra quyền (Unicode, path, URL) để tránh bypass.

## SSRF (nằm trong A01:2025)
- Nếu server gọi URL do người dùng cung cấp (webhook, import, preview ảnh): dùng allowlist hostname và cổng. Chặn IP nội bộ, loopback, link-local (169.254.169.254), và các dải private.
- Phân giải DNS một lần và dùng IP đã kiểm tra để gọi. Chặn redirect tới địa chỉ không được phép.
- Đặt timeout và giới hạn kích thước phản hồi.

## Upload file
- Kiểm tra kích thước, MIME thực tế (magic bytes), và phần mở rộng theo allowlist.
- Lưu ngoài web root, đổi tên bằng UUID. Không dùng tên file gốc để ghi đường dẫn.
- Quét nội dung khi có khả năng (antivirus, re-encode ảnh để loại payload).
- Phục vụ file từ domain riêng hoặc với `Content-Disposition` và `X-Content-Type-Options: nosniff`.

## Rate limiting và chống lạm dụng
- Rate limit theo IP và theo tài khoản cho đăng nhập, reset mật khẩu, OTP, tìm kiếm, và endpoint tốn tài nguyên.
- Giới hạn kích thước request, timeout, và số kết nối.
- Phản hồi lỗi đăng nhập và reset không tiết lộ tài khoản có tồn tại hay không (user enumeration).

## CORS và security headers
- CORS: allowlist origin cụ thể. Không dùng `*` kèm `credentials: true` (trình duyệt sẽ từ chối, nhưng cấu hình như vậy cho thấy thiết kế sai). Không phản chiếu Origin tùy ý.
- Headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, và `frame-ancestors` hoặc `X-Frame-Options` cho trang nhạy cảm.
- Cookie: `HttpOnly`, `Secure`, `SameSite` phù hợp. Chi tiết nằm ở `auth-session-flows`.
- CSRF: với cookie-based session, endpoint thay đổi trạng thái cần cơ chế chống CSRF hoặc kiểm tra Origin/Sec-Fetch-Site.

## Lỗi và thông tin nhạy cảm (A02, A10)
- Lỗi chung cho client, chi tiết trong log nội bộ có request id.
- Tắt debug, stack trace, và trang lỗi mặc định của framework trong production.
- Xử lý ngoại lệ có chủ đích: fail closed cho quyết định bảo mật (nếu kiểm tra quyền lỗi thì từ chối), không fail open.
- Không để lỗi phần mềm làm lộ dữ liệu hoặc bỏ qua bước xác thực.

## Secret và dữ liệu nhạy cảm
- Không đưa secret vào code, log, URL, hay response. Dùng secret manager.
- Mã hóa dữ liệu nhạy cảm lúc lưu (at rest) và đường truyền (TLS). Không tự viết thuật toán mã hóa.
- Trả về tối thiểu dữ liệu cần thiết. Lọc trường nhạy cảm khỏi serializer.

## Kiểm chứng
- Viết test tấn công cho: BOLA giữa hai tài khoản, truy cập không đăng nhập, leo thang vai trò, mass assignment, SSRF tới địa chỉ nội bộ, và upload file sai kiểu.
- Kiểm tra headers và CORS bằng request thực tế (curl hoặc test).
- Dùng công cụ phân tích tĩnh và DAST khi có: xem `sast-secret-scan`.
- Ghi rõ NOT RUN nếu không có môi trường để chạy test tấn công.

## Deliverables
- Threat model ngắn cho thay đổi (tài sản, điểm vào, kiểm soát)
- Bảng phát hiện theo mức độ nghiêm trọng, kèm bằng chứng file:line và cách tái hiện
- Test bảo mật và kết quả, kèm rủi ro còn lại

## Stop conditions
- Không khai thác lỗ hổng trên hệ thống không thuộc phạm vi được phép. Chỉ kiểm thử trên môi trường được cấp quyền.
- Phát hiện lỗ hổng đang bị khai thác trên production: dừng, báo ngay người có thẩm quyền, không tự ý thử nghiệm thêm.
- Thay đổi chính sách xác thực hoặc phân quyền toàn hệ thống: cần xác nhận của người phụ trách.

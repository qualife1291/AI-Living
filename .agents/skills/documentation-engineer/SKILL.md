---
name: documentation-engineer
description: Technical documentation strategy and writing - README structure, architecture decision records, API documentation generated from specs, runbooks and operational docs, developer onboarding, docs-as-code workflow, doc freshness and ownership, and review checklists for accuracy. Use when creating or restructuring project documentation, writing an ADR or runbook, documenting an API or a service, or reviewing docs for accuracy and completeness. For Markdown syntax and formatting details, use markdown-writer; for release notes, use changelog-writer.
---

# Documentation Engineer

## Nguyên tắc
- Tài liệu phải đúng với code hiện tại. Tài liệu sai còn tệ hơn không có tài liệu, vì người đọc tin vào nó.
- Mỗi tài liệu có một mục đích và một đối tượng đọc rõ ràng. Nếu không trả lời được "ai đọc cái này và để làm gì", đừng viết.
- Ưu tiên tài liệu sinh từ nguồn (OpenAPI, JSDoc/TypeDoc, docstring, proto, schema) khi có thể, để giảm lệch pha.
- Tài liệu sống cùng code: cùng repo, cùng PR, cùng review.

## Chuẩn và công cụ (kiểm chứng 2026-11-16)
- ADR theo mẫu Michael Nygard (Context, Decision, Consequences) hoặc MADR (Markdown Architectural Decision Records). Chọn một và giữ nhất quán.
- OpenAPI là nguồn chính cho tài liệu REST (xem `api-contracts`). Công cụ hiển thị phổ biến gồm Swagger UI, Redoc, và Scalar; kiểm tra công cụ repo đang dùng.
- Docs-as-code: tài liệu trong repo, build bằng static site generator (MkDocs, Docusaurus, VitePress, Starlight, Sphinx tuỳ hệ sinh thái), kiểm tra liên kết và build trong CI.
- Với Markdown: xem `markdown-writer`. Với CHANGELOG và release notes: xem `changelog-writer`.

## Operating contract
1. Đọc `AGENTS.md`, cấu trúc thư mục docs hiện có, README, các ADR, và nguồn sinh tài liệu (spec, docstring) để biết chỗ nào là nguồn chân lý.
2. Tách **evidence** (file:line, lệnh đã chạy, kết quả thực tế), **assumption**, **recommendation**.
3. Mọi lệnh trong tài liệu phải được chạy thử trước khi ghi vào. Báo PASS/FAIL/NOT RUN cho từng lệnh.

## README
Cấu trúc tối thiểu:
1. Tên dự án và mô tả một câu nói rõ dự án làm gì và cho ai.
2. Trạng thái (badge build, phiên bản) nếu có công cụ tự động cập nhật. Badge hỏng là tín hiệu xấu.
3. Yêu cầu: phiên bản runtime, công cụ, hệ điều hành đã kiểm chứng.
4. Cài đặt: từng lệnh, theo thứ tự, và kết quả mong đợi.
5. Chạy: lệnh khởi động dev và lệnh build production.
6. Cấu hình: biến môi trường bắt buộc và tuỳ chọn, kèm giá trị mẫu (không kèm secret thật).
7. Kiểm thử và lint: lệnh chạy toàn bộ và chạy một phần.
8. Cấu trúc thư mục: chỉ mô tả các thư mục chính, không liệt kê từng file.
9. Đóng góp: quy trình PR, quy ước commit, nơi báo lỗi.
10. Liên kết tới tài liệu sâu hơn (kiến trúc, API, runbook).
11. Giấy phép và liên hệ.

Kiểm tra: người mới clone repo trên máy sạch có chạy được theo đúng README không. Ghi lại các bước đã thực hiện và chỗ phải đoán.

## ADR
- Một file cho một quyết định, đánh số tăng dần và không đổi số sau khi tạo.
- Các mục: tiêu đề, trạng thái (Proposed, Accepted, Superseded by ADR-xxx, Deprecated), ngày, bối cảnh, các lựa chọn đã xem xét, quyết định, hệ quả (tích cực và tiêu cực), và liên kết tới tài liệu liên quan.
- Ghi rõ lựa chọn bị loại và lý do. Đây là phần giá trị nhất khi người sau hỏi "tại sao không dùng X".
- Không sửa nội dung ADR đã được chấp nhận. Nếu quyết định đổi, viết ADR mới và đánh dấu ADR cũ là Superseded.
- Độ dài: thường một đến hai trang. Nếu dài hơn, có thể đang gộp nhiều quyết định.

## Tài liệu API
- Nguồn chân lý là spec (OpenAPI, proto, GraphQL schema). Tài liệu hiển thị được sinh từ đó.
- Với mỗi endpoint: mô tả mục đích, tham số, body mẫu, phản hồi thành công và lỗi có thể gặp, mã lỗi, giới hạn tốc độ, và yêu cầu xác thực.
- Có ví dụ chạy được bằng curl hoặc SDK. Ví dụ phải được kiểm tra định kỳ trong CI.
- Ghi rõ phiên bản API và chính sách deprecate (xem `api-contracts`).
- Không để lộ cấu trúc nội bộ hoặc tên bảng DB trong tài liệu công khai.

## Runbook
- Viết cho người trực lúc 3 giờ sáng, đang căng thẳng và không quen hệ thống. Ngắn, rõ, có lệnh cụ thể.
- Cấu trúc: triệu chứng (người dùng thấy gì, alert nào kêu), cách xác nhận (lệnh hoặc dashboard), giảm thiểu nhanh (rollback, tắt feature flag, scale), điều tra nguyên nhân (để sau khi đã ổn định), liên hệ leo thang.
- Mỗi bước có kết quả mong đợi và điều kiện chuyển sang bước tiếp theo.
- Kiểm tra định kỳ: diễn tập ít nhất khi có thay đổi lớn, và ghi ngày kiểm tra cuối cùng.
- Liên kết với `observability-sre` về alert và dashboard.

## Onboarding cho developer
- Lộ trình đầu tiên: cài đặt, chạy được một luồng nhỏ, đọc được luồng dữ liệu chính, và tạo được một PR nhỏ.
- Bản đồ hệ thống: các dịch vụ, nơi lưu dữ liệu, ai sở hữu từng phần, và công cụ chính.
- Danh sách thuật ngữ nội bộ, vì mỗi đội thường có từ riêng gây khó hiểu.
- Liên kết tới ADR quan trọng nhất (khoảng 5 đến 10) thay vì toàn bộ lịch sử.

## Tài liệu sống: độ tươi và quyền sở hữu
- Mỗi tài liệu có người chịu trách nhiệm (CODEOWNERS hoặc ghi trong đầu file).
- Ghi ngày cập nhật cuối và phiên bản phần mềm mà tài liệu áp dụng.
- Kiểm tra tự động khi có thể: liên kết hỏng, lệnh trong README chạy được, OpenAPI hợp lệ, ví dụ trong doc chạy được.
- Khi xoá tính năng, xoá tài liệu của tính năng đó trong cùng PR. Đánh dấu deprecated thay vì xoá khi người dùng vẫn cần.

## Đánh giá tài liệu
Checklist khi review tài liệu của người khác:
- Có đúng với code hiện tại không? Chạy thử các lệnh.
- Có thiếu bước nào mà người mới sẽ bị kẹt không?
- Có thuật ngữ không được định nghĩa không?
- Có thông tin nhạy cảm không?
- Có liên kết hỏng không?
- Đối tượng đọc có rõ không, và độ sâu có phù hợp không?

## Kiểm chứng
```bash
# Ví dụ tuỳ công cụ của repo
npm run docs:build                       # build site tài liệu nếu có
npx markdownlint-cli2 "docs/**/*.md"     # xem markdown-writer
npx @redocly/cli lint openapi.yaml       # kiểm tra spec nếu có
```
- Chạy lại các lệnh trong README trên môi trường sạch, hoặc container tạm thời.
- Ghi PASS/FAIL/NOT RUN cho từng lệnh đã ghi trong tài liệu.

## Deliverables
- Tài liệu đã viết hoặc cập nhật, kèm nơi lưu trong repo
- Danh sách lệnh đã kiểm chứng và kết quả
- Danh sách chỗ còn thiếu hoặc không chắc, cần người phụ trách xác nhận

## Stop conditions
- Không ghi lệnh hoặc cấu hình vào tài liệu khi chưa chạy thử được, trừ khi ghi rõ là NOT RUN.
- Không đưa secret, dữ liệu khách hàng, hay địa chỉ hạ tầng nội bộ vào tài liệu công khai.
- Không xoá tài liệu của tính năng vẫn đang được dùng mà không có thông báo deprecate.

# Review gói ZIP bàn giao

## Kết luận

Gói ZIP có đầy đủ mã nguồn và tài liệu để Codex tiếp tục từ checkpoint hiện tại. Đây là một bản bàn giao nguồn, không phải xác nhận mọi tính năng đã hoàn thiện hoặc đã publish.

## Các mục đã kiểm tra

- Đối chiếu tất cả file Git-tracked với archive: không thiếu, không dư file nguồn và byte nội dung khớp.
- SHA-256 cho từng file khớp manifest; ZIP integrity test không lỗi.
- Tất cả Markdown links nội bộ trỏ tới file có thật.
- Có README, AGENTS, CODEX_HANDOFF, MEMORY_SHORT/LONG, roadmap, changelog.
- Có docs về vision, architecture/stack/API, AI plans, animals, animation và character sources, operations, testing.
- Có migration/schema DB, package.json, pnpm-lock, TypeScript/Vite/Worker config, source SVG/CSS và ba bộ unit tests.
- Có ảnh preview robot/city/workshop trong docs/screenshots, có mô tả nguồn ảnh và giới hạn QA.
- Đã giải nén ZIP vào thư mục mới, mặc định execution profile portable; test-life, test-events, test-animation, TypeScript noEmit và vinext build đều PASS.
- Đã áp dụng migration vào database LOCAL MỚI từ bản giải nén: hai bảng tạo thành công. Không đụng production DB.
- Việc kiểm tra giải nén dùng lại dependencies đã cài từ workspace qua symlink. Không tuyên bố đã thử cài dependencies từ Internet trên máy sạch. node_modules không nằm trong ZIP.
- Hai write-test scripts cũ đã thêm guard từ chối remote mặc định; test guard đã qua. Các test integration/live đầy đủ vẫn chưa được xác minh.
- Bản ZIP cuối có thêm báo cáo này và chỉnh mô tả kiểm thử thành ba bộ. Source/manifest được đóng lại sau review.

## Những thứ cố ý không nằm trong ZIP

- Production database/snapshot đầy đủ, credentials/API keys, .env và service bearer tokens.
- node_modules, build outputs, runtime caches/state, .git và lịch sử Git.
- Automation được lưu trên tài khoản ChatGPT và quyền truy cập Sites. ID/reference và quy trình kiểm tra nằm trong docs, nhưng không thể dùng ZIP để tự nhân bản account permissions hoặc scheduled task.

## Những việc chưa hoàn tất

Collision avoidance/right-of-way giữa người và xe; plan transition giữa chừng; kiểm chứng first scheduled run; mobile/reduced-motion QA đầy đủ; full live API integration và repair test duplicate cũ. Đây là giới hạn tính năng, không phải file bị thiếu. Chi tiết và thứ tự xử lý nằm ở CODEX_HANDOFF.md và MEMORY_SHORT.md.

Video/TTS/social export vẫn tạm hoãn theo yêu cầu chủ dự án. Lớp sinh hoạt/thiết kế cuối chưa publish lên Site trong đợt bàn giao này.

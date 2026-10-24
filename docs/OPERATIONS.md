# Chạy, lưu trữ, deploy và bảo mật

## Local/portable

Đọc README. Node 24+, pnpm đúng pin, install frozen. Clean clone mặc định portable. Build tạo dist/server/wrangler.json. D1 local cần apply migration schema lần đầu; ví dụ command trong README dùng .wrangler/state (không tự thêm /v3). Đọc migration journal trước nếu DB đã tồn tại.

Migration source có trong ZIP; production records không có. Khi mở local, seed tạo một thế giới mới, không phải khôi phục world live.

Managed Work có Sites: dùng skill Sites, installer và sites-preview. Môi trường khác dùng portable scripts, không hardcode đường dẫn plugin /root/.codex từ máy cũ.

## Hosting hiện hành

project_id trong .openai/hosting.json: appgprj_6adc7dc364d48191a09202c5b43309e4. binding DB, không R2. Owner-private. Giữ ID này; không create_site lần nữa. Credential không có trong ZIP; Codex mới phải có cùng tài khoản/quyền Sites để lấy lại.

Luồng chuẩn: read get_site/access → lấy source write credential ngắn hạn → source workflow push commit/package exact output → save/deploy owner-private → poll terminal result. Không đoán remote URL, version ID hoặc deployment ID. Không đổi audience để xử lý lỗi authentication.

Đối với plain Cloudflare account, chưa có cấu hình triển khai độc lập và auth tương đương trong dự án. Nếu chuyển provider, phải thiết kế lại access trước; không gửi worker thẳng lên public rồi coi là cùng mức bảo mật.

## Tác vụ sinh hoạt

Độc lập trong ChatGPT Automations, không được chứa trong source ZIP hoặc import tự động. ID và lịch được ghi MEMORY_LONG.md, không phải bí mật. Dùng peek để kiểm tra thay vì tạo trùng. GET /api/instructions là instructions hiện hành; task phải giữ source authorization và no paid services.

Token private service access lấy mới từ get_site; chỉ gửi về chính origin qua OAI-Sites-Authorization, không theo redirect, không in/log/lưu file. Token không cấp quyền vào app connector khác hoặc tự tạo user identity.

## Pause

POST world với revision hiện hành và paused boolean. clock.pausedAt chặn tiến thời gian, clock.pausedMs tích lũy thời gian nghỉ. Chỉ label schedule không chứng minh actual scheduler state; pause thế giới không xóa hoặc tắt automation (automation thấy paused thì bỏ ghi).

## Backup và dữ liệu

JSON download trên UI: snapshot + 80 event gần nhất, KHÔNG backup đủ DB. Không có full DB export đã xác minh. Trước repair production cần một luồng backup đầy đủ có quyền phù hợp; chưa được triển khai. Không chỉnh DB bằng seed hoặc migration data.

## Chi phí

Chưa cấu hình billing hoặc API tính phí. Hosting và task dùng khả năng tài khoản hiện có, bị quota/availability. Không mở mãi trình duyệt thay cho server simulation. Nếu quota hết, báo trạng thái và dừng inference; không tự đăng ký trả phí.

## Assets và dependencies

Robot, animals, map là SVG code tự viết. Font Google Fonts có fallback sans-serif và có thể không tải khi offline. Gói dependencies và license trong lockfile/vendor là nguồn thật. Chưa gỡ mọi starter UI dependency không dùng; ưu tiên không đổi lockfile chỉ để “dọn đẹp” trước khi baseline build ổn.

# Xóm AI — Bộ nhớ dài hạn

## Sản phẩm và yêu cầu đã chốt
- Chủ dự án: Hoang Long. Ngôn ngữ: tiếng Việt; múi giờ Asia/Ho_Chi_Minh.
- Ba nhân vật trưởng thành An, Bình, Chi sống trong khu trọ Việt Nam; tính cách, mục tiêu, ký ức và quan hệ riêng.
- Phong cách 2D nhìn chéo từ trên xuống, dịu mắt, không pixel art.
- Website riêng chỉ chủ sở hữu truy cập. Không thay đổi audience khi sửa nguồn.
- Không phát sinh phí hạ tầng, AI; không đăng ký dịch vụ trả phí. Giới hạn tài khoản vẫn áp dụng.
- Xuất video đã tạm hoãn theo yêu cầu. Không tự đăng mạng xã hội.
- Tuổi đời xóm tăng theo ngày thật. Kỹ năng/quan hệ/kinh nghiệm thay đổi theo sự kiện; không tự huấn luyện model.

## Nguồn và triển khai
- Checkout: /workspace/sites/xom-ai
- Site project_id: appgprj_6adc7dc364d48191a09202c5b43309e4
- Slug: xom-ai-long
- Git source được quản lý bởi Sites; credential ngắn hạn chỉ truyền qua stdin.
- Đọc .openai/hosting.json trước mọi thao tác; không create_site lần nữa.
- Dùng Sites workflow để commit/push/package và deploy owner-private.

## Stack
- TypeScript, React 19, Vinext/Vite, Cloudflare Workers qua Sites.
- D1 binding DB; Drizzle schema và migrations trong drizzle/.
- SVG vẽ bản đồ và nhân vật, CSS responsive; lucide-react icons.
- Zod kiểm tra schema các sự kiện.
- Không có API LLM tính phí. Dự kiến dùng scheduled ChatGPT task đọc/ghi world qua private service access, cần kiểm chứng trước khi bật.

## Cấu trúc và dữ liệu
- app/page.tsx: bản đồ, cư dân, nhật ký, quản lý nhịp sống.
- lib/world.ts: hồ sơ ban đầu và hướng dẫn lượt AI.
- lib/store.ts: đọc world + 80 sự kiện gần nhất, không cache.
- GET /api/world: trạng thái, revision, events.
- POST /api/world: pause hoặc mô tả lịch; optimistic revision guard.
- POST /api/events: sự kiện có id chống trùng; kiểm tra giới hạn và cập nhật world + episode bằng D1 batch transaction.
- GET /api/instructions: hướng dẫn cho tác nhân chạy độc lập.
- DB worlds lưu snapshot; episodes lưu lịch sử sự kiện. Ký ức gần nhất tối đa 60/nhân vật; lịch sử sự kiện vẫn nằm trong DB.
- Tiền trong thế giới là số mô phỏng; không có giao dịch ngoài đời.
- Chuyển động nhân vật là hoạt cảnh SVG, không phải bằng chứng LLM đang suy nghĩ.

## Theme và style
- Nền kem #f7f8f3; xanh sage #8ba17b; giấy #fdfef9; chữ #36453b.
- Màu An terracotta #ed9e6f, Bình lavender #8f9bc4, Chi sage #98b789.
- Font Be Vietnam Pro / Manrope, sans-serif fallback. Góc bo 10–14px, đường viền mảnh, nhiều khoảng thở.
- Desktop sidebar + bản đồ + hồ sơ; mobile bottom navigation, một cột.
- Tôn trọng prefers-reduced-motion; controls có focus-visible và nhãn.

## Chuẩn kiểm thử bắt buộc
1. TypeScript noEmit và production build thành công.
2. Migration schema-only; không sửa migration đã áp dụng, tạo migration mới.
3. Đọc ghi world tồn tại qua refresh; thiếu/không hợp lệ schema bị từ chối.
4. Retry cùng event id không tăng revision/trạng thái lần nữa.
5. Revision cũ bị 409, pause chặn lượt ghi AI.
6. Không có số tiền âm, chỉ số trong giới hạn 0–100.
7. Desktop/mobile kiểm tra điều hướng, hồ sơ, nhật ký, controls.
8. Writer phải được kiểm tra qua intended unattended service access trước khi tạo schedule.
9. Không báo schedule đã chạy chỉ từ việc tạo schedule thành công.
10. Không credentials, .env, runtime DB hay token trong Git/artifact.

## Kết quả xác minh
- Đang triển khai; chưa xác nhận build, publication hoặc schedule. Cập nhật phần này sau mỗi kết quả thực tế.

## Quy tắc bộ nhớ
- MEMORY_SHORT.md: chỉ việc chưa xong, context mới và blockers; xóa mục khi xong, xóa file khi trống.
- MEMORY_LONG.md: quyết định, kiến trúc, chuẩn test, kết quả, giới hạn; không lưu bí mật.
- CHANGELOG.md: thay đổi sản phẩm theo ngày, đi cùng commit.

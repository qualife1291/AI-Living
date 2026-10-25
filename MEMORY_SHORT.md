# Bộ nhớ ngắn hạn

Đọc [docs/LIVING_REALTIME.md](docs/LIVING_REALTIME.md) trước khi sửa; đây là bản mở rộng mới nhất, sau [docs/CLOUD_REVIEW.md](docs/CLOUD_REVIEW.md).

## Việc tiếp theo
- Kết nối nguồn giao thông TP.HCM đáng tin cậy; hiện ghi unavailable. Lịch VisitHCMC đã nối, cần theo dõi thay đổi cấu trúc/độ phủ nguồn. Chưa có đủ lịch âm/nghỉ bù/giờ mở cửa từng cơ sở.
- Chất lượng hội thoại local model còn khuôn mẫu; cải thiện đánh giá ngữ nghĩa, theo đuổi mục tiêu và kế hoạch dài hạn, không gọi đó là tự train model.
- Sinh thái: động vật phản ứng mưa/ngày đêm và cây trồng tiến triển, giữ liên tục đường đi.
- Đồng bộ đầy đủ structured memories/commitments/nudges của API AI cũ; living state hiện có ký ức và mức quen thuộc riêng cho NPC.
- Production: kết nối đúng Sites project và xác minh automation cũ trước deploy, backup D1 thật, áp dụng migration 0002. Không dùng dữ liệu fixture/local để suy luận live và không tạo lịch trùng.

## Blocker/giới hạn
- Không có công cụ Sites/automations hoặc credential deploy trong phiên; chưa deploy Site hay tạo scheduler production.
- User đã Publish môi trường trước đợt này. Các model, migration và lệnh living:up được bổ sung sau đó; cần snapshot Publish mới để task sau giữ bản mở rộng, theo cấu hình draft đã lưu.
- Daemon sống khi process/môi trường còn chạy; không có cam kết 24/7 khi task bị dừng.

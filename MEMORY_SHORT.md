# Bộ nhớ ngắn hạn

Đọc [docs/URBAN_WORLD.md](docs/URBAN_WORLD.md) và [ADR-0009](docs/DECISIONS/ADR-0009-shared-world-three-product-directions.md) trước khi sửa. Đây là hướng mới nhất: không gian live toàn màn hình, nhân vật khối/trang phục, học từ trải nghiệm và ba hướng sản phẩm tương lai.

## Việc tiếp theo
- Đánh giá chất lượng policy/hội thoại, mục tiêu dài hạn và quan hệ hai chiều. Cư dân học mô hình hành vi từ phản hồi mô phỏng; Qwen vẫn chỉ inference, chưa fine-tune.
- Nối nguồn giao thông thật, lịch âm/nghỉ bù và lịch hoạt động từng cơ sở. OSM là snapshot hình học; mô phỏng chưa map-match nhân vật vào graph OSM thật.
- Renderer mặc định đã chuyển Three.js; tiếp tục LOD hình học, nội thất, mô hình phương tiện/hiệu ứng thời tiết 3D và sinh thái cây. Động vật đã có policy nhỏ và trú mưa/nghỉ đêm theo tick; chưa phải model sinh học.
- Triển khai các hướng theo ADR-0009: tách Viewer/Admin và scheduler bền vững trước public; stage branch riêng trước video; ownership/cách ly trước multi-user.
- Tiếp tục structured commitments/nudges của API AI cũ; migration 0003 hiện lưu archive trải nghiệm học cư dân.

## Giới hạn vận hành
- Phiên có môi trường đã được update/publish (runtime revision 5). Đợt thành phố/tạo hình này bổ sung source và migration 0003 sau đó.
- Chưa có công cụ/credential deploy Sites hoặc kiểm tra automation production; không tạo lịch trùng, không đổi owner-private hay bật upload video.
- Daemon chỉ chạy khi process/môi trường còn sống; không có cam kết production 24/7.
- Bộ dataset archive chứa phản hồi mô phỏng, cần đánh giá chất lượng trước khi dùng fine-tune. Không tuyên bố mọi cư dân đã có cùng số mẫu học chỉ vì đều được khởi tạo policy.

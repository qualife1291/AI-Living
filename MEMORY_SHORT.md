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

## Đang thực hiện — hardening và đời sống nội thất (25/10/2026)
- Người dùng yêu cầu sửa các điểm rà soát, bổ sung nội thất/thang máy, hình ảnh và hồ sơ tuổi/trưởng thành; yêu cầu luôn push code và lưu context để phục hồi khi env lỗi.
- Đã đồng bộ frozen dependency Three.js. Source đang sửa: archive bỏ cap 32, proposal kèm basis revision/turnId, health kiểm tra schema, polling chống chồng, admin gate tại Worker, scheduled handler opt-in rules.
- Nội thất Three.js mặt cắt + 3 tầng + cabin hoạt cảnh, đồ đạc theo loại địa điểm; nhân vật lấy occupancy thật, chỉ tầng trệt. Thang máy chưa là tuyến di chuyển cư dân. Hồ sơ tuổi hư cấu tăng theo simulation clock; chưa có sinh/tử/gia đình.
- CHƯA HOÀN TẤT KIỂM TRA: cần tsc/lint/unit/build, API local và browser QA. Chưa deploy, không đổi audience, không bật scheduler/paid AI. Quyền production mới yêu cầu XOM_ADMIN_USER_ID; local dùng XOM_LOCAL_ADMIN=true + loopback.
- Checkpoint mới: push WIP 5b58c6e trên nhánh work đã thành công. Sau đó tsc/lint/12 suite/build đều đạt; thêm test-hardening tái hiện 240 outcomes vượt snapshot 200 và xác nhận collector giữ đủ để archive. Chuẩn bị API/browser QA tại port 5174, D1 cô lập work/review-qa; không chạm DB thật.

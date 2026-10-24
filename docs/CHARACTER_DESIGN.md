# Thiết kế nhân vật cuối — An, Bình, Chi

## Nguồn tham khảo đã truy cập

1. Pixar — WALL-E: https://www.pixar.com/wall-e . Trang nhân vật có WALL-E/EVE/Auto và hình thiết kế. Tham khảo tương phản hình khối/công năng và khả năng kể chuyện qua tư thế. Không đưa nhân vật, logo hoặc ảnh phim vào sản phẩm.
2. Disney — Learn to Draw Baymax, hướng dẫn bởi Jin Kim: https://video.disney.com/watch/learn-to-draw-baymax-from-big-hero-6-disney-insider-50713727de917d48908a3701 . Trang xác nhận bài hướng dẫn; không khẳng định đã phát/xem toàn bộ video. Tham khảo hướng thiết kế thân thiện, hình khối rõ.
3. Star Wars — BB-8 Databank: https://www.starwars.com/databank/bb-8 . Tham khảo khả năng nhận diện silhouette của droid; không dùng thân cầu hoặc vòng trang trí BB-8 cho cư dân của dự án.
4. Paula Escobar — Chimot rig portfolio: https://www.puduemplumado.com/chimot/ . Tài liệu tác giả trình bày rotation views, controller mắt, thay hình tay/chân; tham khảo cách tách điều khiển rig, không sao chép asset hoặc rig của tác giả.

Ngoài ra đã tìm ảnh model sheet/turnaround qua image search để so sánh cách trình bày. Các ảnh bên thứ ba không được đóng vào ZIP; chỉ lưu các URL gốc và thiết kế SVG tự viết.

## Ngôn ngữ hình khối và công việc

| Robot | Dáng riêng | Chi tiết nhận diện | Biểu cảm/cử động |
|---|---|---|---|
| An | Đầu đa giác, thân công cụ bất đối xứng | Kính quang học đôi hình góc, đai dụng cụ, mũ kỹ thuật, tay kẹp | Mắt có đồng tử/highlight; tay thao tác; bước chân nhanh |
| Bình | Đầu cao bo cạnh, thân hẹp | Một cảm biến quang tâm lớn, panel dọc, module dữ liệu bên hông | Sensor nháy, tay chỉ/giải thích, dáng gọn |
| Chi | Đầu tròn, thân quả lê | Màu kem-xanh, mầm cây và gói sau lưng, găng tròn | Mắt cười, tay tưới/chăm sóc, chuyển động nhẹ |

Ba nhân vật có chung vị trí xương để dùng cùng runtime, nhưng shell, khuôn mặt, tỷ lệ và phụ kiện khác nhau. SVG gradients có ID riêng qua React useId để tránh xung đột giữa avatar/map/workshop. Màu vẫn theo Person.color để giữ nhận diện đã có trong snapshot.

## Rig và preview

Robot.tsx có leg-left/right, arm-left/right, torso, head, eyes, mouth. Pivot nằm đúng khớp; hai chân lệch nửa chu kỳ. RobotWorkshop cho xem idle/walk/work/garden/social và lời thoại mẫu. Demo không tạo ký ức hoặc gọi LLM. Robot trên map nhận motion theo action hiện tại và speaking theo active speaker.

## Typography và lời thoại

Ô chữ nằm trên đầu, tspan xuống dòng giữ nguyên toàn câu. Text nguồn và hoạt động thật tách nhau; sample có nhãn demo. Camera-aware offset giữ ô chữ trong góc nhìn và bỏ bubble của actor ngoài viewport. Hình vẫn là SVG code có thể scale và sửa xương; không phải video/imagegen hoặc skeleton 3D.

## Việc còn lại

Bổ sung side/back views nếu cần đổi hướng thật; hiện renderer dùng front view thay vì full 8-direction sprites. Chưa có facial blend shapes, audio/lip sync hoặc IK. Kiểm thử theo từng action trước khi thêm thiết kế mới.

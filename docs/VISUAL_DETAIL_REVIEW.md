# Chi tiết nhân vật, bối cảnh và hoạt cảnh — bản 11

Giữ thành phố hoạt hình 3D với tông xanh ngọc, vàng ấm và san hô; nâng chi tiết phục vụ quan sát sinh hoạt hằng ngày. Toàn bộ hình học mới do dự án dựng bằng Three.js, dùng dependency hiện có. Không thêm dịch vụ trả phí hoặc asset không rõ giấy phép.

## Nhân vật và chuyển động

`people.ts` gom đầu, tóc, thân, tay chân, mặt và đạo cụ của cả dàn nhân vật vào sáu nhóm geometry. Bản trước dùng 19 mesh riêng theo bộ phận. Màu da, trang phục và diện mạo đã lưu tiếp tục được đọc từ appearance của từng cư dân.

Tay có vai–khuỷu–cổ tay; chân có hông–gối–cổ chân và khối nối để không hở khi gập. Thêm cổ, tai, mũi, lòng mắt, chân mày, má, miệng khi nói, cổ áo, cúc, phù hiệu nhỏ, đế giày và mũ đầu bếp tròn. Chi tiết mặt/đạo cụ chỉ dựng cho người ở gần camera hoặc nhân vật được chọn.

`HumanMotion` lấy bước đi từ quãng đường thực tế của root đã tránh va chạm. Dáng chuyển dần giữa đi/đứng/nói/nghe; hướng quay dùng cung ngắn và damping. Chân dừng dần khi nhường lối. Pause giữ nguyên pose, hướng và các hiệu ứng theo simulation clock. Chuyển động trang trí không dịch chuyển root qua vật cản hoặc ghi vào lịch sử.

Sách có bìa/trang/nét dòng và giữ cân giữa hai tay; ly nước, bình tưới với vòi/giọt và dụng cụ theo tay cầm. Hoạt cảnh theo kind thực của actor. `groundElevation` đọc cùng cao độ cỏ, nền địa điểm, đường và lối đi được renderer dựng; chân và bóng tiếp xúc bám các bề mặt đó. Đây là rig thủ tục, còn thiếu IK/tiếp xúc bàn ghế và vật lý cơ thể đầy đủ.

## Bối cảnh và hoạt cảnh

Thêm 66 cụm ở 33 địa điểm, gồm bảy loại: quầy rau có mái sọc/giỏ và rau quả, kệ sách nhiều tầng, bàn dụng cụ/bản vẽ, xe đạp đỗ, bồn hoa, bảng tin và thùng rác. Tổng 833 phần chi tiết trong các cụm này. Renderer và navigation dùng cùng catalog; các model nằm trong footprint đã dành chỗ. Placement chừa cửa, công trình, vật cản cũ, mặt đường và vùng quay xe.

Catalog ground hiện có 573 footprint bối cảnh, cộng 279 công trình; 94 cây được giữ vị trí. Tán cây nhiều lớp, thân chạm tới tán; bậc cửa được chia thành ba bậc thấp. Thêm khung cửa/tay nắm. Mây là 18 khối nhẹ trong một batch; đài phun có 16 tia/128 hạt dùng buffer cố định và simulation clock. Các hiệu ứng này là hình ảnh mô phỏng.

Thêm sáu cảnh trao đổi: chọn rau cho bữa cơm, tìm một trang sách hữu ích, kiểm tra bản vẽ, chừa chỗ cho cây, đọc lời hẹn ở bảng tin, nghỉ tay bên tách nước. Tổng thư viện 18 cảnh/88 lượt. Nguồn vẫn gắn nhãn “Kịch bản”; chỉ event có nguồn AI đã lưu mới mang nhãn AI. Đối thoại không tự tạo giao dịch hay thay đổi kho đồ.

Mèo, chó và đàn sẻ được dựng riêng với chân/tai/mõm/đuôi hoặc cánh/mỏ; dùng năm batch chung. Ba policy cũ được giữ nguyên, đàn sẻ hiển thị ba con. Ground projection của động vật được đưa vào cùng WalkDirector với người, chừa chỗ đứng riêng và nhường xe; loại bỏ hai khối hộp chồng dưới chân nhân vật thấy trong QA. Đây là điều phối footprint ngoài trời, chưa có vật lý cơ thể hoặc tiếp xúc nội thất đầy đủ.

## Kiểm chứng và giới hạn

24 bộ unit, TypeScript, lint và build đã đạt trước lượt chỉnh hình cuối; các kiểm tra rig/ground, TypeScript/lint/build được chạy lại sau chỉnh. Bộ mới kiểm tra 600 frame chuyển đi–đứng/pause/reorder, dàn 72 người ở gần với đủ đạo cụ, nối khớp, mặt đất, budget của sáu batch, tất cả phần model nằm trong footprint và buffer hiệu ứng đứng yên khi pause. Thêm 1.800 frame người/động vật tới chung đích, khoảng riêng, model động vật hữu hạn và pause. Traffic kiểm tra 22.740 trạng thái với 852 vật cản; đủ 1.089 cặp địa điểm đi bộ hoàn tất.

Browser QA dùng Chromium SwiftShader trên fixture local, không ghi world production: desktop/mobile qua đủ sáu lượt thoại và polling, chọn Bình→Theo An, zoom tay; chuyển động quét không xuyên footprint; bốn cảnh đọc/tưới/uống nước/chợ không lỗi JS hay tràn ngang. Ảnh nằm trong `docs/screenshots/detail`, `social`, `motion`; chỉ là preview local. Kết quả cuối và phiên bản phát hành xem release ledger.

Chưa có benchmark GPU/điện thoại vật lý, soak dài, IK nội thất/thang máy hoặc inventory thật cho đạo cụ. Hình học nhiều hơn cần theo dõi fill rate; số batch giảm không tự bảo đảm FPS trên mọi thiết bị. Không đổi DB/migration, model AI hoặc schedule production trong đợt này.

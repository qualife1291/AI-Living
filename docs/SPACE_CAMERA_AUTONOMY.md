# Vật cản, góc quay và chủ động — bản10

Bản9 chỉ xét khối nhà/xe, nên cây, đồ đạc và người khác chưa có vật cản. Bản này dùng `sceneryTrees` cho cả renderer và navigation, 507 footprint của thân cây, bàn/ghế/chậu, đài nước, cột và vật thể mặt đất. Tán lá được nâng khỏi đầu người; thân cây vẫn chắn đường.

WalkDirector bổ sung khoảng riêng, kiểm tra đường quét với người khác, đặt điểm đứng riêng và tránh đối đầu. Đây vẫn là điều phối 3D ở tầng hiển thị, chưa phải hệ vật lý cơ thể/IK hay backend occupancy. Dời đồ đạc trạm bus khỏi làn xe, gộp các đèn trùng và đặt13 cột ngoài đường/nút quay xe. Renderer và kiểm thử dùng chung tọa độ. Phần đồ đạc phải được giữ khớp danh mục khi thêm model mới.

Camera chuyển sang tracking shot gần nhân vật, hạ góc nhìn, chừa chỗ cho người đối thoại và chọn góc không bị nhà che. Chuyển vị trí/điểm nhìn có easing theo thời gian; không cắt ngẫu nhiên. Nút theo nhân vật quay lại An. Màn hình dọc tự lùi khi có hai người để không mất người nghe/thoại; kiểm thử projection cả đầu/chân và điểm neo lời nói. Zoom thủ công thoát follow; nút Theo quay lại An. Vẫn có orbit/overview thủ công.

Học nhanh hơn nghĩa là nhận thêm kết quả hoạt động đã hoàn tất và lựa chọn phù hợp nhu cầu/kinh nghiệm, không nhân khống điểm kỹ năng hoặc tuyên bố nâng trí tuệ model. Lịch nền có công việc nhỏ và nghỉ/đi việc vặt lệch theo ID. Guard giữ hoạt động chưa hoàn tất, cohort luân phiên để mọi cư dân được xử lý. Slot mới5phút dùng prefix `living-v2` để không đụng ID15phút cũ; viewer pulse30giây khi đang mở. Không thêm cron hay model trả phí; lúc đóng trang vẫn phụ thuộc tác vụ cloud hiện có.

Kết quả test và phiên bản production được ghi ở releaseledger. Ảnh là preview local nếu không ghi rõ production. Còn benchmark GPU thật, va chạm nội thất/động vật và đồng bộ playback giữa nhiều viewer.


Kiểm chứng bản10:
- 23 bộ unit, TypeScript, lint và build đạt. Navigation thử đủ1.089 cặp địa điểm; kiểm tra160 đường vòng quanh đồ đạc và so khớp spatial index với oracle.
- Swept-disc kiểm tra cả khoảng giữa hai frame: đi đối đầu, bốn luồng giao cắt,16 người đi ngược và12 người tới chung đích đều hoàn tất;63 spawn chồng nhau có chỗ đứng riêng theo ID. Không đẩy dịch chuyển sau khi khởi tạo.
- Xe kiểm tra22.740 trạng thái trên279 công trình và507 vật cản bối cảnh:0 giao nhau. Có kiểm tra người băng đường, hàng xe dừng/chạy lại và pause.
- Camera kiểm tra180 hướng/tỷ lệ màn hình, có cả điểm đầu/chân/neo thoại. QA browser đọc đủ6lượt qua polling ở desktop và mobile, chọn Bình→Theo quay lạiAn, zoom thoát follow.
- Browser dùng Chromium SwiftShader; ảnh là synthetic local, không ghi world production. Mẫu motion cuối:20 frame/9giây,19 bước di chuyển,0 frame stale,0 giao footprint, bước lớn nhất2,408units. Lượt trước29frame/9giây; không suy luận cải thiện FPS từ chênh lệch software rendering. Đây không phải FPS GPU/điện thoại thật, chưa bảo đảm hết lag hoặc24hsoak.

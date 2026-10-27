# Đuổi bắt theo cặp — phase B tiếp nối

## Hành vi

Trong renderer 3D, khi hai nhân vật có hoạt động `tag`, đã đến gần Công viên hoặc Sân thể thao và có đường nhìn không bị vật cản chắn, họ có thể ghép cặp. Chỉ ghép những người đã chọn chơi; không kéo người đang làm việc, ăn, đọc sách hay đi đến địa điểm khác vào trò chơi. Cặp được giữ qua polling và thay đổi thứ tự actor. Nếu lẻ người, người còn lại chờ bạn và không chạy tại chỗ.

Người đuổi yêu cầu tốc độ 28 unit/giây; người chạy tránh 20 unit/giây. Người chạy chọn điểm trong vòng 36 unit quanh vùng sân chơi đã chiếu lên nền hợp lệ. TagDirector chỉ đưa ra đích đến. WalkDirector vẫn quyết định từng bước thực, kiểm tra swept collision với công trình, cây, đạo cụ, xe và các nhân vật khác. Không dịch chuyển tức thời để tạo một lượt bắt.

Khi khoảng cách ground thực <=13,6 unit và đoạn nối không bị vật cản chắn, hai người đổi vai sau thời gian miễn bắt. Ngưỡng này lớn hơn khoảng cách cá nhân tối thiểu: mô phỏng bắt khi tới gần, không yêu cầu hai model va vào nhau. Sau mỗi lần đổi vai có 1,6 giây miễn bắt và hai người phải tách ra xa hơn ngưỡng bắt ít nhất 3 unit trước lần bắt tiếp theo. Hai người bị kẹt gần nhau không được tự động tăng lượt bắt liên tục.

Pause hoặc đồng hồ mô phỏng đứng yên đóng băng cả vị trí lẫn vai. Đổi loại hoạt động, địa điểm hoặc mất người chơi khỏi tập actor hiển thị sẽ hủy cặp. Thay thế thế giới hoặc tua đồng hồ lùi hơn một giây xóa trạng thái điều khiển cũ cùng navigation. Khi hoạt động kết thúc, nhân vật trở lại lịch trình vốn có.

Kế hoạch tag mới giữ một địa điểm trong 180 giây thay vì chuyển giữa Công viên và Sân thể thao sau 90 giây. Kế hoạch cũ vẫn đọc được; nếu đổi địa điểm thì cặp cũ bị hủy. NPC social scheduler không cắt ngang một hoạt động tag để tạo cuộc gặp khác. Cơ chế micro-activity chỉ đổi các lượt idle `social/play`, giữ các hoạt động đã chọn như tag, chạy, đạp xe, tập thể dục hoặc chăm cây.

## Ranh giới

Đây là luật mô phỏng thuộc **phiên hiển thị 3D**, không phải model AI mới. Vai/lượt bắt không ghi vào snapshot, ký ức, quan hệ hoặc phần thưởng học. Reload, đổi renderer hoặc đổi tập actor có thể khởi tạo cặp mới. Chưa đồng bộ trò chơi giữa nhiều người xem. Renderer 2D đã được gỡ; không còn backlog triển khai tag trong2D. Không tự thêm kế hoạch tag cho người chưa chọn chơi, không bắt buộc luôn có một cặp trong thế giới.

Nhân vật có thể dừng hoặc nhường khi không có đường an toàn. Không dùng timeout để bỏ collision hoặc tăng lượt bắt. Vùng có quá nhiều vật cản có thể không có điểm chạy tiếp; đây không phải cam kết mọi cặp sẽ bắt được nhau hay hết kẹt trong 20 giây. Không có migration, dependency, API trả phí, thay đổi scheduler production hoặc deploy trong đợt này.

## Kiểm chứng và chạy lại

`node scripts/test-tag-game.mjs` chạy cả hai địa điểm với navigation thật: 3.600 frame, Công viên 28 lần đổi vai và Sân thể thao 6 lần, không vi phạm footprint/khoảng cách cá nhân trong mẫu thử. Kiểm tra pause, hủy, thứ tự/polling, người thứ ba chờ, đổi thế giới/tua lùi, nguồn world không bị mutate; mẫu Công viên có bước tối đa 1,40001 unit ở timestep50ms. Kiểm tra lịch NPC thật không bị social scheduler thay hoạt động tag.

`npm run test:unit` có thêm suite này; TypeScript, lint, build và API local được chạy cùng đợt. QA trên Worker đã build dùng `QA_BASE=http://127.0.0.1:<port> python3 scripts/qa-tag.py`. Script chỉ chấp nhận loopback, dùng hai kế hoạch tag tổng hợp và mock mutation; không ghi DB. Nó kiểm tra đổi vai thực, khoảng cách/no teleport, polling, pause/tiếp tục, hủy khi kế hoạch đổi và lỗi JavaScript trên desktop/mobile. Ảnh và metrics ở `docs/screenshots/tag` là **preview local**, không phải production hay benchmark điện thoại thật.

Kết quả build cuối: full **31 lệnh suite**, TypeScript, lint, build và API D1 local đều đạt. Browser desktop có 129 frame/2 lần đổi vai; mobile 202 frame/1 lần đổi vai trong cửa sổ 14 giây, 8 request polling mỗi case; pause/resume/cancel và no-teleport đều đạt, không lỗi JavaScript. Kiểm tra hồi quy hội thoại desktop/mobile vẫn đủ 6 lượt và camera controls. Số frame là mẫu chạy phần mềm SwiftShader trong môi trường này, không phải cam kết hiệu năng thiết bị thật.

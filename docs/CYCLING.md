# Xe đạp di chuyển và va chạm toàn xe — 27/10/2026

## Hành vi

Hoạt động cycle và các chuyến có transport=bicycle nay di chuyển bằng xe đạp trong renderer3D. Xe/người không đi bộ rồi mới dựng xe tại chỗ. Với chuyến đi để đọc sách/làm việc, xe được giữ đến khi ground thực tới đích, dù projection từ đồng hồ đã báo đến trước; sau đó mới xuống xe và dùng đạo cụ của hoạt động tiếp theo.

Tốc độ tối đa22unit/giây, tăng tốc12unit/giây², giảm tốc theo khoảng cách tới đích. Khi bị chặn thì dừng/nhường; tiếp tục khi có đường an toàn. Bánh xe và pedal theo quãng đường ground đã đi, không chạy theo wall clock. Pause giữ nguyên vị trí, rig, quãng đường và góc bánh; đứng xe không tiếp tục đạp. Đổi kế hoạch sẽ xuống xe. Đây là mô hình chuyển động kinematic, chưa mô phỏng lực bánh/lốp, quán tính nghiêng, té ngã hoặc IK bàn chân/tay.

Mô hình xe và người dùng vùng ground bảo thủ bán kính9,2unit, bao trọn ở mọi yaw. Kiểm tra vertex GLB và hình học xe thật qua36pose đo bán kính lớn nhất8,85unit. Vì vùng bao không đổi theo yaw, cả lúc quay xe cũng không đưa đầu/đuôi xe xuyên vật cản. Bản thân vùng bao là disc, không phải hình sát từng ống khung xe; xe có thể phải chờ hoặc không đi qua một lối hẹp mà người đi bộ vẫn lọt.

Khi một người đang ở sát tường/người khác không đủ chỗ mở vùng xe, họ đi bộ tới chỗ thoáng trước khi lên xe. Không dịch chuyển vị trí đang tồn tại để ép mount thành công. Khi khởi tạo actor mới, chọn vị trí trống cho toàn thân xe, tránh cả phương tiện đang ở đó. Backend snapshot/kế hoạch/di sản ký ức không bị thay đổi bởi việc dựng xe.

## Đường đi và tương tác

WalkDirector dùng hai mức clearance:4,8 cho người/thú và9,2 cho xe. Grid được cache theo clearance; route cache vẫn giới hạn1024entry. Bảng route precompute cho người đi bộ chỉ dùng ở4,8; xe tự tìm đường và mọi đoạn đều được kiểm tra theo9,2. Spatial index truy vấn thêm các bucket cần cho vùng xe lớn hơn.

Sweep static footprint dùng vùng xe; khoảng cách hai actor lấy tổng bán kính riêng cộng margin. Forecast nhường đường của ô tô cũng nhận bán kính actor thực, không coi người đi xe là một điểm đi bộ nhỏ. Chướng ngại, xe và các actor vẫn được kiểm tra trong từng bước, kể cả khi polling đổi thứ tự danh sách. Nếu không có đường an toàn thì dừng, không bỏ collision bằng timeout.

Rig GLB được khôi phục base trước khi cộng pose pedal/exercise. Một số clip không key mọi limb; cộng offset liên tục trước đây có thể làm chân xoay dần dù quãng đường không đổi. Regression đã tái hiện và chặn lỗi này. Camera theo người đi xe mở rộng theo aspect để lấy cả xe/người vào khung; mobile không chỉ hiển thị phần thân trên. Khi còn ngồi trên xe, đạo cụ đọc sách/làm việc chưa xuất hiện.

## Kiểm chứng

- Full33lệnh unit suite, TypeScript, lint và build đạt. Các ca people/pet/tag/traffic cũ tiếp tục chạy; không đổi ngân sách spacing của người đi bộ.
- Test cycle-ground:1200frame, đi249,91unit, bước lớn nhất1,1unit tại50ms; pause/dismount và nguồn world không mutate.
- Mount từ chỗ hẹp không teleport; mixed cyclist/pedestrian1600frame có sweep oracle, đi251,63unit và không vi phạm khoảng cách trong mẫu. Spatial oracle4000kiểm tra độc lập đối chiếu toàn bộ obstacle.
- Vertex thật36pose xác nhận toàn xe/người trong9,2unit; đứng xe không tích lũy góc chân, bánh theo quãng đường, xuống xe ẩn xe. Cooperative crossing1400frame kiểm tra ô tô nhường vùng full-bike, có tiến triển qua đường.
- Kiểm tra commute giữ xe sau projection arrival sớm, chỉ xuống khi tới đích ground. Đường giữa Công viên/Sân thể thao có clearance hợp lệ theo xe.
- Browser: QA_BASE=http://127.0.0.1:<port> python3 scripts/qa-cycle.py. Synthetic fixture local kiểm tra di chuyển, drive clip, polling, pause đóng băng rig, đổi kế hoạch xuống xe, không nhảy tọa độ, không tràn ngang/JSerror và full-body trong khung>90%frame. Ảnh/metrics ở docs/screenshots/cycle là Chromium SwiftShader preview local, không phải production hoặc FPS điện thoại thật.

## Giới hạn và tiếp nối

Vai/đường ground là trạng thái phiên hiển thị, chưa occupancy authoritative nhiều viewer. Backend completion/reward của người vẫn theo kế hoạch mô phỏng, chưa có chứng nhận đã đạp đủ đường thực. Chưa lực học toàn xe, đổ xe, dây/IK hoặc xử lý mọi ngõ hẹp. Dữ liệu và test không chứng minh mọi tình huống hết kẹt trong20giây. Không migration, dịch vụ trả phí, resetDB, merge main hoặc deploy trong đợt này.

Phần tiếp theo của roadmap: phaseC density/household/traffic graph; phaseD LinUCB/skill gates; durable dialogue history và model A/B vẫn chưa triển khai đầy đủ. Không khôi phục renderer2D.

QA camera cuối: desktop99frame/227,88unit, mobile168frame/244,56unit trong12giây, 8 request polling mỗi case; drive clip, full-body in-frame>90%, pause/dismount/no teleport đều đạt. Social regression vẫn đủ6lượt trên cả hai màn hình. Test bổ sung16pose của rider instanced cũng nằm trong vùng9,2unit (max8,85), cùng với36pose GLB. Các ảnh là preview local trên fixture; không phải bằng chứng production hoặc FPS phần cứng.

# Tích hợp tài nguyên Gobkit/KayKit — đang thực hiện

Ngày tiếp nhận 27/10/2026. Đã đọc 15 giấy phép CC0 trong ZIP. Đặc tả/README là dữ liệu tham khảo, không tự thực thi các đoạn lệnh hoặc URL của chúng.

239 file glTF/GLB canonical: 50 động vật, 56 người của Gobkit; KayKit Adventurers có 8 GLB (bao gồm 2 thư viện animation) và 31 glTF đạo cụ; Furniture 53 glTF; City Builder 41 glTF. Các format FBX/OBJ tương ứng không cần tải trùng vào trình duyệt.

Mục tiêu: import có hash/nguồn/giấy phép/dependency/giới hạn bộ nhớ; skeleton clone độc lập; clip mapping theo dữ liệu thật; model theo nghề/tuổi/loài và môi trường phù hợp. Danh mục 3D tải từng model theo nhu cầu cho phép truy cập toàn bộ asset, tránh nạp hàng trăm model vào thành phố cùng lúc. Vũ khí/trang phục fantasy được giới thiệu đúng bối cảnh sân khấu/triển lãm, không gán thành hoạt động phố mặc định.

Không suy ra có clip bay/nói chuyện từ tên pack: nhiều model chỉ cung cấp idle/attack/dead/walk. Phải chuẩn hóa track ghép nếu có, không để sinh vật tuần hoàn qua chết/tấn công. Các loài không bay như kiwi/penguin không được cho bay. Cần habitat cho loài dưới nước/nông trại/hoang dã; tên/đặc điểm hiển thị phải khớp model.

Các thay đổi work hiện hành từ agent khác (tag, pet owner/walk, xe đạp di chuyển, 3D-only, overlays, households) được giữ. Nhân vật được phân nhóm tuổi/giới/cách xưng hô, giữ ID và lịch sử; không tạo tên kiểu “Linh 2”. Test mới và trạng thái release sẽ bổ sung sau triển khai.

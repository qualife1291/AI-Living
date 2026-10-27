# Tích hợp tài nguyên Gobkit/KayKit — đang thực hiện

Ngày tiếp nhận 27/10/2026. Đã đọc 15 giấy phép CC0 trong ZIP. Đặc tả/README là dữ liệu tham khảo, không tự thực thi các đoạn lệnh hoặc URL của chúng.

239 file glTF/GLB canonical: 50 động vật, 56 người của Gobkit; KayKit Adventurers có 8 GLB (bao gồm 2 thư viện animation) và 31 glTF đạo cụ; Furniture 53 glTF; City Builder 41 glTF. Các format FBX/OBJ tương ứng không cần tải trùng vào trình duyệt.

Mục tiêu: import có hash/nguồn/giấy phép/dependency/giới hạn bộ nhớ; skeleton clone độc lập; clip mapping theo dữ liệu thật; model theo nghề/tuổi/loài và môi trường phù hợp. Danh mục 3D tải từng model theo nhu cầu cho phép truy cập toàn bộ asset, tránh nạp hàng trăm model vào thành phố cùng lúc. Vũ khí/trang phục fantasy được giới thiệu đúng bối cảnh sân khấu/triển lãm, không gán thành hoạt động phố mặc định.

Không suy ra có clip bay/nói chuyện từ tên pack: nhiều model chỉ cung cấp idle/attack/dead/walk. Phải chuẩn hóa track ghép nếu có, không để sinh vật tuần hoàn qua chết/tấn công. Các loài không bay như kiwi/penguin không được cho bay. Cần habitat cho loài dưới nước/nông trại/hoang dã; tên/đặc điểm hiển thị phải khớp model.

Các thay đổi work hiện hành từ agent khác (tag, pet owner/walk, xe đạp di chuyển, 3D-only, overlays, households) được giữ. Nhân vật được phân nhóm tuổi/giới/cách xưng hô, giữ ID và lịch sử; không tạo tên kiểu “Linh 2”. Test mới và trạng thái release sẽ bổ sung sau triển khai.

Importer đầu đã kiểm tra 418 file, 55.207.250 byte dưới ngân sách 64 MiB, 114 model có skin. Toàn bộ dependency phục vụ từ Site. Human002 có clip Talk/Listen/Nod/Sit thật; các pack động vật thực tế có bốn clip đặt tên riêng, khác mô tả track ghép trong một số README. Chưa thể gọi tích hợp runtime hoàn tất ở mốc chỉ mới import này.

## Tiếp nhận a14e939 và nối runtime (27/10, giờ Việt Nam)

Đã kiểm tra bốn commit mới so với 97fd21d, fast-forward work; main vẫn a5b7c5a. Baseline 36 lệnh unit/check/lint/build đạt trên nguồn nhận. Remote chỉ cấu hình fetch main nên tiếp nối phải fetch rõ refs/heads/work, tránh đọc nhầm origin/work cũ.

Checkpoint mới nối ba core vào Gobkit Human002 (engineer/accountant/receptionist), ưu tiên Talk/Listen khi xã hội; giữ Kenney3D nếu model chưa tải. Chỉ NPC đang chọn tải model theo vai trò, tối đa một NPC skeleton cùng ba core; cư dân khác giữ batched LOD. Chưa đổi nghề/hồ sơ/AI hay tự đưa trang phục sân khấu vào đời thường. Trang phục và phụ kiện gốc của model vẫn thuộc mesh, chưa có tủ đồ theo trang phục của từng pack.

Điểm tay/đỉnh đầu dùng mẫu vertex của skin sau deformation, thay bone origin chưa khớp hình học do bind offsets. Nhãn tên trong city lấy đỉnh đầu thật; pause/pose/bicycle vẫn dùng cùng ground pipeline. Khi dispose phải dừng mixer, giải phóng geometry/material/skeleton clone và giữ nguyên cached source/textures đến khi library đóng. Gallery chờ đúng lần tải đang chọn, có retry lỗi tải/WebGL, sửa width toàn màn hình và camera theo aspect; static/paused model chỉ draw khi thay đổi hoặc xoay/resize.

Đang chạy kiểm thử tích hợp mới actual skin/ground/disc/Talk/Listen/focused NPC/dispose; chưa chốt QA browser cuối tại checkpoint này. Không nhận các test Kenney cũ là bằng chứng mới của Gobkit. Full social6lượt sau DOM ACK và browser15packs/mobile/lifecycle còn bắt buộc trước khi chốt.

Review ảnh thực bắt thêm vấn đề của asset gốc: laptop/calculator/cốc được tác giả đặt như các đảo geometry bên hông, không theo tay trong Talk/Sit. Scene dùng phiên bản Human002 bỏ riêng các đảo phụ kiện đã review ở vùng source minX>0,055/maxY<0,06, giữ body/fingers/headset; gallery giữ nguyên source đầy đủ. Helper chỉ áp dụng Human002, không suy ra quy tắc đó cho động vật/pack khác. Bản sao compact toàn bộ attributes, nguồn GLB/hash không bị sửa. Đạo cụ hoạt động của city tiếp tục gắn tay qua surface anchors.

Danh tính foundation: tên mới dùng tên Việt và họ/tên đệm khi trùng, không thêm số; backfill chỉ đổi đúng mẫu tên tự sinh cũ ứng với neighbor-ID/catalog, giữ tên tự đặt và alias previousNames, không viết lại memory/dialogue. Metadata identity.ageAtArrival/gender tương thích snapshot, giữ tuổi legacy20–44 theo thuật toán cũ. UI hiển thị nhóm tuổi/giới tính đã chọn và gợi ý An gọi bạn/cô/chú/bác/em. NPC legacy chưa chọn giới tính được ghi rõ; chưa tự nhận đủ hệ thống trẻ em/giới theo model, chưa đổi toàn bộ script xưng hô hoặc tạo quan hệ gia đình từ household. Dân số không tăng ngoài cấu hình đang có.

Review ảnh city sau đó cho thấy ép chiều cao17,5 cùng XZradius4,4 làm kéo dài đầu model chibi. RiggedAvatar chuyển sang fit đồng nhất ba trục (17,5 là chiều cao tối đa), giữ dáng gốc và disc4,8; chiều cao thực core khoảng7,7–8,0units. Đạo cụ cầm tay thu theo cùng tỷ lệ; camera follow không đi xe lấy chiều cao thực của cả cặp để bố cục gần hơn, giữ nguyên khung full-bike đã nghiệm thu. Đây là nhân vật chibi cách điệu, không tuyên bố tỷ lệ cơ thể người thật. Test chống kéo méo được thêm vào actual-city-rigs. Cần ảnh và hồi quy browser mới cho thay đổi cuối này.

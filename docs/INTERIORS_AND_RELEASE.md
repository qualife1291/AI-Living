# Nội thất, hồ sơ cuộc đời và điều kiện phát hành — 25/10/2026

Đây là source/local preview, không phải bằng chứng production. Nhánh `work` có checkpoint được push theo yêu cầu chủ dự án. Không đổi audience, không phát sinh phí, không render/upload video.

## Phạm vi sản phẩm
- Trước đợt này: thành phố ngoài trời 3D, phương tiện mô phỏng, đồng hồ, routine, policy học từ trải nghiệm; chưa có góc quan sát nội thất, tuổi hoặc lịch sử trưởng thành rõ ràng.
- Mới: bảng Địa điểm mở mặt cắt nội thất 3D có orbit/zoom, chọn 3 tầng, bàn/ghế, quầy/bồn rửa, sách, cây và thang máy. Vật dụng bàn thay theo nhóm dining/study/work. Nhân vật hiện diện được lấy từ projection thật; không thêm người giả để lấp phòng. Nhân vật chỉ bố trí tầng trệt, không suy diễn tầng hiện tại.
- Thang máy là hoạt cảnh kiến trúc cùng simulation clock và pause. Chưa phải tuyến di chuyển thực của NPC; ba tầng dùng cùng mẫu mặt bằng, chưa có floor graph, hàng chờ, lựa chọn tầng hay occupancy cabin.
- Hồ sơ: tuổi khởi đầu hư cấu 20–44 theo ID, tăng mỗi năm mô phỏng; ngày đến xóm, số ngày, phản hồi đã học, chương trải nghiệm và ký ức. Không có ngày sinh thật, sinh/tử, trẻ em hoặc hệ gia đình; số mẫu không được dùng làm tuổi.
- Ánh sáng: nội suy trời từ đêm tới ngày, màu nắng bình minh/hoàng hôn, vị trí đèn và exposure theo giờ. Không thêm tài sản trả phí, không tuyên bố đồ họa photorealistic hay hiệu năng điện thoại thật.

## Sửa độ tin cậy
- Frozen install đồng bộ Three.js và type. COREPACK_HOME mặc định vào `.sites-runtime/corepack`.
- Archive không giới hạn 32; collector giữ cả batch mới khi vượt snapshot 200, ghi cùng CAS/nonce. Snapshot đọc nhanh vẫn giữ 200; archive giữ đầy đủ.
- Proposal phải kèm `basis: {revision, turnId}`. Server từ chối cảnh cũ; retry slot đã ghi là duplicate không thay đổi thế giới. Daemon gửi basis và thử lại trong chu kỳ sau khi xung đột.
- Events trả duplicate-success cả khi revision guard mất cuộc đua và ID đã tồn tại.
- Health trả 503 khi không đọc được DB hoặc thiếu bảng mở rộng. Không tráo lỗi schema thành chưa có tick.
- Client không chồng request world; timeout 10s. Nguồn context timeout 2.5s, truyền cancellation vào adapter VisitHCMC; cache thất bại 60s và vẫn có nhãn unavailable. Cache JSON lỗi không làm parse vỡ route. Dùng cùng relay cho world và living.

## Quyền truy cập
Worker kiểm tra mọi API mutation và export JSONL. Production yêu cầu `XOM_ADMIN_USER_ID` bằng ID chủ sở hữu từ header đã được hosting xác thực. Thiếu cấu hình sẽ từ chối ghi (403); viewer vẫn đọc. Hosting bắt buộc loại header identity do client tự gửi và chỉ chèn identity đã xác minh. Không deploy trực tiếp Worker công khai nếu không có tầng xác thực này.

Local: `setup-local.mjs` thêm `XOM_LOCAL_ADMIN=true` trong `.dev.vars`; chỉ chấp nhận URL loopback. Không đưa biến này vào production. Kiểm thử Workers build có thể dùng `--var XOM_LOCAL_ADMIN:true` trên port local. UI viewer hiện có thể thấy nút quản trị nhưng backend từ chối thao tác; tách UI quyền là bước tiếp theo.

## Scheduler
Có `scheduled` handler opt-in bằng `XOM_RULE_SCHEDULER=true`, gọi settlement và rule tick. Chưa gắn cron production hoặc xác minh hỗ trợ scheduling trên Sites. Handler không chạy Qwen; inference vẫn là daemon local. Không cam kết AI 24/7 và không tạo automation trùng. Trước production phải kiểm tra quyền owner, migrations thật, scheduler hiện hữu, backup và health/readback. Không tự bật billing.

## Kiểm chứng
- Frozen install; TypeScript, lint, 12 suite cũ, hardening mới và build đạt. Build vẫn cảnh báo chunk Three lớn và phân loại tĩnh route của Vinext.
- `scripts/test-hardening.mjs`: fail-closed admin, 240 outcomes giữ đủ cho archive trong khi snapshot giới hạn 200, retry không học trùng, tuổi và pause, elevator bounds.
- DB cô lập `work/review-qa`: migration 0000–0003; API living đồng thời, catalog, wardrobe, learning đồng thời/archive cursor và bound proposal đã kiểm tra. Built Worker port 5175 không bật local admin từ chối ghi 403.
- `scripts/qa-interiors.py`: Chromium thật, SwiftShader, desktop/mobile. Ảnh thực ở `docs/screenshots/hardening`; không phải benchmark GPU hay điện thoại vật lý.

## Ưu tiên tiếp theo theo hướng game/cinema
1. Indoor graph và kế hoạch nhiều bước: vào sảnh, chờ thang máy, chọn tầng, tới bàn, gọi món/nấu/ăn/dọn; chỉ trao reward cho hành vi đã hoàn tất.
2. Mặt bằng riêng theo tòa nhà, lịch mở cửa, vị trí ngồi, hàng chờ và đồng bộ appearance giữa ngoài trời/nội thất.
3. Cử chỉ có mục đích, đạo cụ cầm tay, hội thoại gắn vị trí, timeline sự kiện theo nhân vật và quan hệ hai chiều.
4. LOD, thời tiết 3D, mây/bầu trời, chuyển động xe và benchmark thiết bị thật; chưa thể coi đây là đồ họa chất lượng cao nhất.
5. Production rollout riêng sau cấu hình quyền, backup và scheduler bền vững; giữ owner-private đến khi có yêu cầu mở.

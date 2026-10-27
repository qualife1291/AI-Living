# Phase E — âm thanh thiên nhiên

Source có âm thanh môi trường opt-in, mặc định tắt và không tạo AudioContext khi tải trang. Nút loa trong HUD bật tiếng gió, mưa theo weatherState hiện tại và chim mô phỏng ban ngày khi trời không mưa lớn. Âm thanh tổng hợp bằng Web Audio, không dùng micro, file ngoài, TTS hoặc API tính phí. Đây là âm thanh trang trí, không phải AI nhận biết hay mô hình sinh học.

Pause, ẩn tab hoặc sang OSM làm context suspend; tiếng chim chỉ tạo khi active, ban ngày và context running. Tắt hoặc rời trang giải phóng timer, nguồn loop, oscillator/gain và đóng context. Resume đang chờ không được bỏ qua pause mới. Bật lại tạo context mới từ thao tác người dùng, không tự lưu lựa chọn qua F5. Trình duyệt không hỗ trợ có thông báo và thành phố vẫn dùng được.

Browser Chromium/SwiftShader với Web Audio thật đã kiểm tra desktop/mobile: zero context trước click, oscillator có tạo và buffer âm thanh đầu ra khác 0 với peak nhỏ hơn 0,25, pause/hidden/OSM/toggle/unmount đúng; kiểm tra cả 320px và unsupported. Ảnh/metrics ở docs/screenshots/soundscape là preview fixture local, không phải production hoặc đánh giá nghe/độ trễ trên thiết bị thật. Harness qa-soundscape.py chỉ loopback, mock world/pulse/visits và living view không truy cập upstream.

Các phần Phase E còn lại — habitat theo loài, vòng đời cây, placements KayKit và mật độ đa mức — chưa được coi hoàn tất bởi tính năng âm thanh này. Không lấy số loài/FPS/latency trong Gemini làm kết quả đã đo.

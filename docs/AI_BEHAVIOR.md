# Cơ chế AI, công việc và hội thoại

## Hai lớp

1. **Luật:** graph đường đi, lịch sinh hoạt theo tính cách, interpolation, hành động tưới rau/đọc/làm việc/nghỉ, câu chào ngắn khi gặp nhau. Label trong UI chỉ rõ luật sinh hoạt.
2. **Lượt LLM:** đọc snapshot + ký ức + events, tạo cảnh mới, thay đổi đã xảy ra và kế hoạch tiếp theo. Hội thoại được lưu trong journal; timed speech có nguồn từ lượt AI.

Không có inference mỗi frame. Sử dụng ChatGPT task theo lịch đã tạo; chưa có bằng chứng lượt tự chạy thành công. Không dựa vào việc scheduler enabled để suy ra thế giới đã được cập nhật.

## Tính cách

- An: lạc quan, muốn mở quầy nước, cần học cách tính chi phí.
- Bình: điềm tĩnh, thích minh bạch, giữ sổ chi tiêu chung.
- Chi: ấm áp, hơi ngại mở lời, thích nấu ăn và trồng húng quế.

Thiết kế hình dáng là robot; bio cũ còn tuổi người trong snapshot được UI chuyển thành Robot AI, không reset ký ức cũ.

## Ví dụ event (mẫu, không phải sự kiện đã xảy ra)

```json
{
  "id":"example-ai-scene-001",
  "revision":0,
  "source":"ai",
  "title":"Gặp nhau ở thư viện",
  "summary":"An và Bình hẹn xem cách tính chi phí.",
  "dialogue":[{"speaker":"an","text":"Mình tính chỗ này vẫn chưa ra, bạn xem giúp nhé?","atSecond":50,"location":"Thư viện"}],
  "changes":[{
    "id":"an","moneyDelta":0,"energyDelta":-2,"hungerDelta":2,"skillDelta":0,
    "activity":"Hẹn Bình đọc tài liệu","location":"Sân chung",
    "memory":"Đã hẹn Bình tìm cách tính chi phí tại thư viện.",
    "plan":[{"location":"Thư viện","activity":"Đọc cách tính chi phí","duration":120,"kind":"read"}]
  }]
}
```

Mẫu chỉ minh họa cấu trúc; khi tạo cảnh thật phải cho cả người nghe plan tương thích, đảm bảo revision hiện hành và dành đủ thời gian đến nơi. atSecond tính từ lúc event ghi; dialogue hiện 6 giây, không lặp tự động. Nếu không có atSecond, vẫn đọc được trong journal.

## Điều kiện tự nhiên

- Chọn một vấn đề nhỏ, để nhân vật trả lời nhau thay vì lần lượt diễn thuyết.
- Hành động phải phù hợp vị trí, tiền và thông tin nhân vật có.
- Không tăng kỹ năng vì một việc chưa làm. Không biến kế hoạch thành kết quả đã hoàn thành.
- Tạo cơ hội giúp đỡ, từ chối, đổi ý và nghỉ; tránh lặp lời chào khi chưa có nội dung mới.
- Các plan dài 1–8 bước; mỗi bước 30–180 giây, tối đa 24 phút. kind: work/eat/rest/social/garden/read/play.
- Lịch routine xấp xỉ 10 phút/vòng để quan sát bản demo, không phải một ngày thật. Ngày xóm là ngày thật; cần thiết kế simulation-time rõ hơn nếu làm nội dung dài hạn.

## Kế hoạch phát triển tiếp

Thay routine cố định bằng needs/action planner có hunger/energy/social/task priorities, deadline và shared resources. Có kiểm tra co-location và lần lượt nói ở server. Lưu lời hứa, việc chưa xong, memory retrieval liên quan; đánh giá mâu thuẫn trước ghi. Đây là roadmap, chưa phải chức năng đã hoàn tất.

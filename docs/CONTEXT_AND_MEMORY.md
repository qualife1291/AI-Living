# Bối cảnh biên tập và ký ức cho daemon

## Bối cảnh phủ 33 địa điểm

Catalog có 49 thẻ, giữ 24 thẻ cũ và thêm nơi còn thiếu cùng ba chủ đề văn hóa. context-cards.ts kiểm tra schema/ID/địa điểm và gắn source editorial-suggestion. Không ghi các thẻ thành event, ký ức hay inventory. Các ảnh skill trong screenshots/domain-skills là preview fixture, không phải production.

Bộ chọn lọc đúng location nếu được truyền, phase và effective weather; không lấy thẻ nắng khi trời mưa hoặc đổi sang địa điểm khác để đủ số lượng. World API truyền thời tiết thực sự đang hiển thị. Daemon chọn theo location của turn và tôn trọng weather override trước nguồn quan sát. Kết quả tất định, không sửa world, tối đa tám thẻ; daemon chỉ lấy hai.

Thẻ cuối tuần cần calendar.weekend. Tết và Trung thu cần nguồn festivals fresh từ HTTPS visithcmc.vn, title đúng chủ đề và start/end bao ngày hiện tại; không suy ngày âm lịch từ tháng dương. Ngày Nhà giáo chỉ kích hoạt khi calendar context là 20/11, không suy đã có buổi lễ/quà. Thẻ đèn lồng cũ được viết thành gợi ý, bỏ khẳng định tự động hôm nay là rằm.

Full 47 suite/check/lint/build/API đạt cho phần cards. Unit chạy 40 cặp phase/weather, đủ 33 nơi, date/source/stale/malformed/determinism/purity; HTTP xác minh source editorial và phase/weather khớp payload. Đây chưa là LocalSceneContext theo occupancy hoặc vật thể thật.

## Ký ức theo chủ đề

Daemon gọi owner-only /api/living/memories cho đúng An và người cùng cảnh, topic từ location/activity. Server top-K đã lọc actor/witness; client kiểm tra lại personId, witnessedWith, kind, ID và ngày. Chỉ tối đa hai actor, ba record/người, 400 ký tự/record, deadline 2,5 giây cho mỗi request song song. Truncation chỉ trong prompt, không sửa DB; giữ id/eventId/kind/ownerId/date để đối chiếu.

403/401 trả status denied và không đưa snapshot fallback vào prompt. Network/contract failure là unavailable; chỉ dùng tối đa ba chuỗi tóm tắt sẵn có của chính người đó, không lấy ký ức của người khác. Input helper chỉ chấp nhận loopback HTTP(S), không credential trong URL hoặc actor ID tùy ý. Không có read/write production mới.

System direction nhắc rõ ownerId, source, phần rút gọn và data/instruction boundary. Ký ức của một speaker không tự trở thành điều người nghe đã biết; không ghi heard-from-peer, tăng skills/trials, tạo event hoặc công nhận đã đến trên ground từ retrieval. Đây là lọc và cung cấp context; chưa chứng minh model luôn tuân thủ ngữ nghĩa hoặc cho kết quả tốt hơn. Chưa chạy model A/B thực hoặc tự tạo SFT/DPO.

RAG helper/daemon có targeted tests cho filtering, bounds, denied/unavailable và payload. Full 48/48 suite, check/lint/build và compiled Worker/D1 API đã đạt. Integration dùng retrievePromptMemories gọi trực tiếp Worker owner guard và D1 rows: 403 không có records, top-K của An không sang prompt của Bình. Chưa chạy lại model LLM thực; kiểm thử prompt không chứng minh chất lượng ngữ nghĩa.

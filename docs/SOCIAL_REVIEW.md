# Review sinh hoạt xã hội và điều phối hội thoại

Review này kiểm tra `lib/living/social.ts`, `residentRoutine` và `crowdAt` trong quá trình phát triển. Chỉ dùng world local được tạo trong bộ nhớ; không gọi API production và không sửa lịch sử thật. Đây là kiểm tra logic/projection, chưa thay thế browser QA, hiệu năng GPU hoặc chứng minh chạy lâu ngày.

Chạy lại bằng `node scripts/test-social.mjs`. Bộ kiểm tra gom kết quả từng trường hợp để một lỗi không che các lỗi khác.

## Đã kiểm tra

| Trường hợp | Nội dung và ý nghĩa |
| --- | --- |
| Thư viện kịch bản | ID duy nhất, địa điểm/kind hợp lệ, 4–6 lượt luân phiên, câu ngắn, thời lượng cộng đúng, cử chỉ có tên được hỗ trợ |
| Khoảng cách đứng | 3 nhân vật chính + 60 ID hàng xóm khác nhau cùng một nơi có slot riêng và cách nhau ít nhất 14 world units; kết quả tất định |
| Dân số tối đa | 240 cư dân trong world, vẫn chọn đúng 60 hiển thị gồm người đang theo dõi/người gặp An ở cuối danh sách; slot duy nhất, staging dưới 150 units và giữ vị trí của nhóm đầu |
| Tới nơi liên tục | Tìm các lần đi→đứng thật quanh các mốc lịch trong ngày, thu hẹp đến hai frame cách tối đa 1 ms; khoảng nhảy sau staging dưới 0,2 unit |
| Có hỏi đáp và khoảng yên | Theo dõi 750 giây mô phỏng: hai người nói luân phiên, listener đúng, tên thay hết placeholder, có ít nhất hai cảnh đủ lượt và khoảng yên ít nhất 180 giây giữa các cảnh |
| Người vừa tới | Bắt đúng khoảng câu thứ hai rồi cho một người vừa đứng lại: cảnh phải yên, chờ cycle kế tiếp và bắt đầu ở lượt mở lời, không nhập vai từ câu trả lời |
| Pause | Sau pause, đối thoại, poses và vị trí cả nhân vật chính/NPC giữ nguyên dù thời gian thực trôi thêm 4 giờ |
| Ranh giới sinh hoạt | Không phát thoại nền ở phòng riêng, phòng khám/bệnh viện, 22:00–06:00, khi đang đi, khác nơi hoặc đứng quá xa |
| Ưu tiên AI | Event AI đã lưu phải ưu tiên hơn thư viện và lời living theo luật; title phải thuộc đúng event |
| Đúng bạn đối thoại | Khi An nói với Chi, Bình đứng gần hơn không được biến thành người nghe thay Chi; khi Chi đang đi thì không dựng một cuộc nói chuyện AI với Bình |
| Không nhầm ID | Event ID là prefix của một ID khác không được nhận nhầm title/nguồn |
| Không đổi dữ liệu | World, ký ức/tiền/quan hệ và input actor phải nguyên vẹn sau projection/staging |
| Nhịp ngày đêm | Lịch NPC dài đúng 24 giờ, có ăn/nghỉ/việc, khác nhau theo role/ID, không gom mọi người vào quảng trường, đêm về khu dân cư |
| Biên tập model | Nhận cảnh 4 câu biên soạn hợp lệ; bác speaker ngoài cặp, người nói liền hai câu và đoạn Qwen local thực tế lặp ý gần nguyên văn |

## Phát hiện cần sửa trong review

1. Event AI từng dùng title của `livingTurn` không liên quan. Thứ tự `livingSpeech ?? speechAt(...)` cũng có thể để lời theo luật che event AI. Hai trường hợp đã có regression test và đạt sau thay đổi của agent triển khai.
2. Chọn người nghe gần nhất cho event đã lưu có thể gán lời nói An↔Chi thành An↔Bình. Nếu Chi đi xa, Bình tiếp tục bị chọn thay. Đã sửa ưu tiên speaker thực sự thuộc hội thoại và kiểm tra cùng nơi/đã đứng lại/khoảng cách; hai regression test đều đạt. Event fixture cần tối thiểu hai speaker để có cặp, không dùng người ngoài cứu cảnh đơn thoại.
3. Tìm event bằng `speech.key.startsWith(event.id + '-')` mơ hồ khi các ID có chung prefix. Đã sửa so đúng ID và index dòng; regression test đạt.

Kết quả lần chạy đầu 14 trường hợp: 11 đạt, 3 không đạt, tương ứng hai tình huống chọn sai người nghe và lookup ID mơ hồ ở mục 2–3. Sau các sửa trên, thêm trường hợp dân số 240, người mới tới và bộ lọc nội dung, lần chạy lại `node scripts/test-social.mjs` đạt **20/20**. Không có thao tác ghi world hoặc API live trong suite.

`Actor.stationaryFor` cho phép projector biết một người đã đứng tại nơi đó bao lâu. Thoại nền chỉ bắt đầu nếu cả hai đã có mặt trước đầu cycle hiện tại; test xác nhận người vừa tới giữa cảnh phải chờ lời mở đầu tiếp theo. Cách này dùng thời gian mô phỏng nên vẫn đóng băng đúng khi pause.

Thí nghiệm local Qwen chạy ba vai đạo diễn→nhân vật→phản biện thực sự đã sinh một cảnh mà chính model phê duyệt, nhưng hai câu cuối gần như chép ý nhau. `reviewNarrative` bác cảnh bằng so sánh cụm ba từ; mẫu văn bản chính xác được giữ trong regression test và không ghi vào world. Kết quả này cho thấy có thể chạy model không dùng API trả phí, đồng thời chất lượng model nhỏ còn hạn chế. Không dùng chữ “agent phản biện đã duyệt” để thay validator hoặc đánh giá nội dung. Guard hiện kiểm tra cấu trúc, cặp speaker, luân phiên, độ dài, trùng/gần trùng và tiêu đề; nó chưa chứng minh mọi câu trả lời đúng nghĩa hay mọi dữ kiện đều có thật.

Lượt rules trong `planLivingTurn` nay chọn thư viện theo địa điểm/kind và gắn `scriptId` khi có cảnh phù hợp, thay vì ghép lời chào nghề không khớp nơi đang tới. Nguồn vẫn là `rules`; chỉ tên kịch bản có thêm provenance, không tự nâng thành `local-llm`.

## Giới hạn và kiểm tra tiếp theo

Khoảng cách slot kiểm tra người cùng điểm tới ở trạng thái đứng. Nó không chứng minh tránh va chạm trên toàn tuyến, độ rộng hiên, indoor occupancy hay IK. Nhiều slot cùng một nơi vẫn có thể vượt mặt tiền nhỏ; browser QA phải nhìn lại khu vực đông người.

Khoảng yên hiện dùng cycle cố định `48 + cooldownSeconds`, trong khi cảnh dài 36 hoặc 46 giây. Vì vậy 180 giây là mức tối thiểu, không phải độ dài chính xác của mọi cycle. Việc bắt cặp là tất định từ snapshot hiện tại; một người mới tới có thể đổi tập ứng viên. Regression mới bao phủ việc người vừa tới không nhập cảnh từ câu trả lời, nhưng chưa chứng minh mọi cặp giữ nguyên trước tất cả thay đổi đám đông/ưu tiên event. Không tuyên bố đã có hệ xã hội tự chủ chỉ dựa vào các test này.

Kịch bản thư viện là nội dung do agent biên soạn trong phiên phát triển. Chỉ lượt model thực sự hoàn tất, vượt validator và có readback mới được ghi nguồn AI tương ứng. Đồng hồ, cử chỉ và lịch NPC còn lại là mô phỏng bằng luật.

## Bằng chứng trình duyệt và khả năng chạy lại

Đã chạy `npm run check`,18suite trong `npm run test:unit`, lint và build. `scripts/qa-experience.py` đạt desktop/mobile, chuyển renderer, mấtWebGL, offline/reconnect, chat và pause/resume. Sau khi xem ảnh và sửa tóc/biển tên, `scripts/qa-social.py` đạt cả desktop1440×900/DPR1.5 và mobile390×844/DPR3: thấyAn→Bình rồiBình→An, một người nói/cặp, khoảng cách14units, nhãnKịchbản, khôngJSerror/trànngang. [Ảnh desktop](screenshots/social/workshop-desktop-preview.png) và [ảnh mobile](screenshots/social/reply-mobile-preview.png) là **preview local**, syntheticworld ởxưởng, không ghi dữ liệu production. Filemetrics lưu thời điểm quan sát khác nhau; các cặp ở xa có thể đang trong khoảng yên.

SwiftShader ghi34/32drawcalls, khoảng416k triangles,14geometries; không phải FPSđiện thoại thật. Geometrymỗi primitive80–168triangles (hair132), dùng chunginstancing; không tạo material/geometry theo cư dân. Preview còn là mô hình cách điệu, chưa photorealistic, rig/IK hay điều phối toàn bộ nội thất.

Chạy `npm run living:ai` rồi `npm run living:direct` để thử3vai Qwen ởloopback8090; kết quả nằmwork/gitignored và không cóworldwriter. Một mẫu thực đã bị guard bác vì hai câu gầnnguyênvăn dù modelcriticchấpnhận. Các guard chỉ bắt lỗi cấu trúc/lặp, không bảo đảm ngữ nghĩa hoàn hảo; do đó thư viện đã biên tập và cloudinstruction giữ vai trò hiện tại. Cloudtask đọc `/api/instructions` mới mỗi lượt; không cần thêm lịch hoặc đưa modelCPU lênWorker.

# Tiêu chí kiểm thử bốn kịch bản đính kèm

Nguồn: file người dùng `Kịch Bản.md`, SHA-256 `787b96e54aaab31c567170074702b3e082184807071e596d126d6eb20954f327`. Nội dung được dùng làm đặc tả cảnh và tiêu chí. Các điểm 94–97/100, câu “hoàn hảo”, lệnh `--auto-patch=true` và `--render-mode=webgpu-ultra` trong file là ví dụ của tài liệu, không phải bằng chứng phần mềm đã chạy hay lệnh đã được thực thi.

## API và cách chạy

`lib/city/scenarios/index.ts` xuất `scenarioDefinitions`, `scenarioFrame(id, seconds)`, `walletDropHeight` và các type. Bốn ID: `wallet-return`, `sanitation-gratitude`, `kitten-care`, `bakery-courtesy`. Mỗi cảnh dài 120 giây, dùng 10 world units/m. Đây là projection studio có thể seek/pause bằng thời gian truyền vào, không gọi API, đọc/ghi DB, đổi ký ức hoặc giả tạo lịch sử live.

Frame gồm nhân vật có tên/tuổi/chiều cao/trang phục, vị trí/hướng/action/clip, tốc độ/quãng đường, phase hoạt ảnh và biểu cảm chuyển dần; đạo cụ có ID duy nhất, chủ sở hữu pháp lý, người đang cầm, vị trí và điểm nắm; năm shot với lens/FOV/khẩu độ/movement/focus; bầu trời/ánh sáng/mặt nền; thoại và ledger sự kiện đã xảy ra.

Clip tham chiếu đúng tên có trong gói Kenney Blocky Characters: `idle`, `walk`, `sprint`, `pick-up`, `holding-right`, `holding-both`, `interact-right`, `emote-yes`, `emote-no`, `sit`. Locomotion phase dựa quãng đường, không thay đổi vị trí root để giả chuyển động. Biểu cảm có pha chuyển 450ms; camera chuyển góc theo cung với easing 2,4 giây, giữ khoảng cách tới điểm nhìn.

```bash
node scripts/test-scenario-benchmarks.mjs --suite=all --record-metrics
```

`--suite=<id>` chọn một cảnh. `--record-metrics` ghi JSON ở `work/scenario-benchmarks.json` (gitignored). CLI đo logic headless; nó từ chối cờ tự sửa code hoặc render GPU/video chưa được triển khai. Không xuất video vì yêu cầu dự án trước đó vẫn tạm hoãn video.

## Những gì đo được

Lượt kiểm tra cuối của engine: **11/11 trường hợp đạt**, **28.804 frame** (7.201 frame/cảnh, bao gồm hai đầu 0 và 120 giây). Số dưới đây là kết quả tính từ chạy test, không phải điểm tự đánh giá nội dung.

| Cảnh | Khoảng tâm người nhỏ nhất | Tốc độ người lớn nhất | Giao nhau giữa hai frame / vật cản tĩnh |
| --- | ---: | ---: | ---: |
| Trả ví | 0,80m | 2,266m/s | 0 / 0 |
| Tri ân lao công | 1,166m | 0,406m/s | 0 / 0 |
| Chăm mèo con | 1,476m giữa hai người | 0,402m/s | 0 / 0 |
| Nhường lượt ở quầy bánh | 1,00m | 1,144m/s | 0 / 0 |

Kiểm tra dùng swept-disc độc lập trên đoạn di chuyển giữa hai mẫu, bán kính thân người trong cast, footprint tĩnh và giới hạn bước/tốc độ; không chỉ kiểm tra một ảnh. Riêng cảnh tiếp xúc mèo, khoảng cách người–mèo được cho phép giảm khi người lớn đỡ thân mèo; trẻ giữ khoảng cách trước lúc hỗ trợ. Các kiểm tra khác gồm hữu hạn hình học/camera, clip hợp lệ, đạo cụ không xuyên mặt sàn, expression blend trong giới hạn, pause/seek lặp lại giống nhau và sửa một snapshot không làm hỏng frame tiếp theo.

| Yêu cầu câu chuyện | Triển khai có đo | Kết quả engine |
| --- | --- | --- |
| Ví rơi, nhặt, tìm đúng người, trả lại | Một ID ví; chủ sở hữu luôn Minh; custody rơi → Tuấn → Minh; inspection bắt đầu sau nhận thấy 350ms; xác định chủ trước đề nghị trao; không nhận tiền thưởng | Đạt logic/thời gian/bảo toàn |
| Ví rơi 75cm, restitution 0,15 | Công thức trọng lực và một lần nảy; không chui dưới sàn; đỉnh nảy khoảng 1,69cm | Đạt mô hình nảy đơn giản |
| Mời nước và giúp gom lá | Một ly chuyển từ quầy → Lan → Hạnh; lời mời trước nhận, nhận trước uống; Hạnh cất chổi trước khi nhận; Hoàng dùng chổi phụ rồi cất; tám lá bảo toàn; fatigue/cường độ quét thay đổi dần | Đạt logic/bảo toàn |
| Hỗ trợ mèo nhẹ nhàng | Mai gọi người lớn, đi chậm; gọi hỗ trợ trước chăm; khăn sẵn trước giữ ấm/bế; mèo và khăn theo người đỡ; hướng khi được bế được easing | Đạt trình tự và liên tục |
| Xếp hàng, nhường người dùng nạng | Nam trở về cuối hàng; cả hàng đồng ý rồi mở lối; Ba đến quầy sau đó; một ổ bánh giao đúng một lần; năm ổ bảo toàn; thứ tự bốn người chờ trước Nam giữ nguyên | Đạt logic/khoảng cách |
| Camera, tuổi, màu trời, diễn biến 120 giây | Năm shot/cảnh, lens 24–105mm, khẩu độ metadata, thông số theme; nhân vật có tuổi/chiều cao/phụ kiện; mọi frame seek được | Đạt dữ liệu và projection; cần QA ảnh render |

Trong lúc triển khai, sampler phát hiện lỗi tuyến đi của Ba cắt qua quầy khi rời cảnh và vị trí đầu cảnh của Ba quá gần Nam; các điểm đường/làn đã được sửa và chạy lại đến 0 giao nhau. Test còn phát hiện mèo đổi hướng đột ngột khi bắt đầu được bế; đã thêm easing trước khi đo lại. Không tự sửa trọng số LLM hoặc gọi các chỉnh sửa kinematic này là fine-tune.

## Những khác biệt được chọn rõ ràng

- Tài liệu đồng thời yêu cầu ví nảy 3cm và restitution 0,15 khi rơi 75cm. Hai giá trị không khớp trong mô hình đơn giản: 0,15 cho (75×0,15²≈1,69)cm. Engine ưu tiên hệ số 0,15 và báo đúng kết quả.
- Hàng chờ dùng khoảng tâm 1m, có dư địa cho model/nạng, thay khoảng 0,6m đồng thời mâu thuẫn với buffer 0,65m trong bảng cuối tài liệu. Người trao ví cách nhau 0,8m theo phân cảnh. Khoảng tâm không đồng nghĩa khoảng hở bề mặt da 0,65m.
- Cảnh mèo chuyển thành giữ ấm, gọi người hỗ trợ và làm theo hướng dẫn; không trình diễn người chưa có chuyên môn cắt dây sát da hoặc cho mèo uống sữa. Không mô tả đây là hướng dẫn thú y.
- Sau lượt ưu tiên của Ba, Nam chờ theo thứ tự gốc, không vượt bốn người còn lại để được phục vụ ngay. Cảnh kết thúc khi anh bình thản tiến lên trong hàng; “cảnh hoàn tất” không có nghĩa mọi khách đều đã mua xong.
- Các nhân vật/tuổi của kịch bản thuộc studio hư cấu, không được chèn thành người thật mới hoặc lịch sử đã xảy ra trong xóm live.

## Chưa được chứng minh hoặc chưa triển khai đầy đủ

| Phần đặc tả vi mô | Trạng thái cần giữ trung thực |
| --- | --- |
| Pixel nhìn thấy nhân vật/đạo cụ, occlusion, tỷ lệ model và bố cục mobile | Cần browser QA với renderer/asset thật; test headless không chấm thay |
| Ngón tay/IK tiếp xúc mesh ví, cốc, nạng; weight transfer và foot locking đầy đủ | Engine có kinematic hand targets và bảo toàn vị trí đạo cụ; không chứng minh mesh tiếp xúc từng ngón hoặc vật lý cơ thể |
| Pores, nếp nhăn 1,2mm, tóc rời, giọt mồ hôi, vải dệt, lông ướt | Các model low-poly đính kèm không cung cấp đầy đủ những chi tiết này |
| DOF thật theo f-number, Rayleigh/Mie, heat haze, volumetric dust, puddle reflection | Metadata có yêu cầu lens/aperture/theme; cần shader/postprocess và kiểm ngân sách GPU riêng |
| Tần số động vật 4Hz, mỏ/miệng phát âm, tiếng đồ vật, SFX/TTS | Chưa có bằng chứng audio hoặc facial/lip sync vi mô |
| WebGPU-ultra, FPS điện thoại/GPU thật, soak 24 giờ | Chưa được benchmark bằng engine headless hoặc SwiftShader |
| Tự biên dịch weights, tự fine-tune toàn mạng, tự patch code theo điểm dưới 85, xuất video | Không được dựng giả. Các giá trị cảm xúc/trật tự trong cảnh là tham số mô phỏng, không phải weights LLM; video còn tạm hoãn |

Chỉ các mục đo được ở trên có thể nhận trạng thái đạt từ script. Bản render và release ledger bổ sung bằng chứng riêng; không gọi toàn bộ đặc tả siêu vi mô đã đạt chỉ vì 11 test logic xanh.

# Hướng tạo hình và đạo diễn Xóm AI

Ngày review: 25/10/2026. Nguồn tham khảo là [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos), commit `92aee2f586ac0715cb3cbcb6384834f98a33383d`. Đã đọc README, giấy phép MIT và các tệp dưới đây. Repo là tuyển tập prompt và bài đăng; tên model, video, chất lượng và hiệu năng trong bài đăng là tuyên bố của tác giả. Không phải thư viện nhân vật hoặc engine có thể nhập để tự động đạt cùng chất lượng.

Review này dùng các ý tưởng về hình khối, nhịp diễn và bố cục. Không lấy lại nhân vật thương hiệu, model, âm thanh hoặc video. Không bật xuất video hay dịch vụ sinh ảnh trả phí.

## Tám nguồn đã đọc

| Nguồn | Nội dung thực có trong tệp | Áp dụng cho Xóm AI |
| --- | --- | --- |
| [Interactive Felt Character — JakubAntowski](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/jakubantowski-020905.md) | Prompt ngắn yêu cầu bề mặt nỉ, thở, chớp mắt, squash/stretch và phản ứng chuột. | Giữ nhân vật riêng của xóm; làm tròn thân/đầu, thêm thở và chớp mắt rất nhẹ. Không dựng lông nỉ nặng hoặc sao chép mascot được nhắc tới. |
| [Marble Computer — GodsBoy7777](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/godsboy7777-150194.md) | Một HTML, Three.js, không asset ngoài; chuyển động phải có nguyên nhân, không teleport; gỗ/đồng/kính, ánh sáng ấm, bóng mềm, camera chậm. | Cư dân tới gần rồi mới nói, hướng mặt và cử chỉ khớp lượt; camera bám mượt. Giữ instancing, hạn chế shader. Mục tiêu 60fps trong prompt không phải bằng chứng hiệu năng cho app này. |
| [Self-Building House — MrKindey](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/mrkindey-267498.md) | Prompt về nhà theo năm giai đoạn, cutaway/X-ray/explode, ánh sáng dusk, cây instanced và camera preset. | Nội thất cần mặt cắt dễ đọc, phân tầng rõ, vật dụng theo công năng. Tái sử dụng hình học cây/ghế; camera có góc gần và tổng quan. Không coi mặt cắt hiện tại là indoor routing. |
| [The Last Piano — kopert0x](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/kopert0x-098349.md) | Một robot tìm đàn trong mưa, mèo đến nghe; cùng một timeline điều khiển tay, nốt và đèn; Canvas 2D, không asset ngoài. | Cùng simulation clock điều khiển tiếp cận, nói, nghe, gật đầu và rời đi. Dừng thế giới phải dừng cả diễn xuất; không tạo bubble độc lập với khoảng cách. |
| [Train Window — itsolelehmann](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/itsolelehmann-762215.md) | Prompt một dòng: bốn mùa ngoài cửa tàu, toa ấm cúng, ly cà phê, phong cách Grand Budapest Hotel. | Mỗi góc có một điểm nhấn đời thường và bảng màu giới hạn: ly/cây/ghế/biển quán; môi trường đổi theo giờ. Tham khảo cách phối màu, không sao chép nhận diện phim. |
| [House Walkthrough — aayush4soni](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/aayush4soni-644283.md) | **Không công bố prompt đầy đủ**; tệp chép bài đăng về bản vẽ nhà, tỷ lệ, đồ nội thất, camera ngang mắt và test tất định. | Kiểm tra kích thước theo mét, cửa/ghế/bàn tương ứng với người. Đánh dấu chiều cao bản đồ ước lượng; đo và test app này riêng, không mượn số test hoặc đồ nội thất của tác giả làm kết quả. |
| [Latentown — sanjay_khadka07](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/sanjay-khadka07-620029.md) | **Không công bố prompt đầy đủ**; bài đăng nói về thành phố 3D, chuyện thành công trình và người đưa tin qua sông. | Cho từng nơi có công năng và câu chuyện dễ nhận ra; cảnh dịch vụ gắn cửa quán/ghế chờ/lối đi. Không cần tăng số cao ốc để tăng chất lượng đời sống. |
| [Crayon Piano — 0xCodez](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/0xcodez-474136.md) | Phòng ấm, mèo chơi piano, cùng timeline cho tay và âm nhạc; pause/replay/seek. | Chọn một tâm điểm rõ, cử chỉ phải tương ứng với vật đang dùng. Tách test nhịp diễn khỏi screenshot; lấy cùng thời điểm mô phỏng để so sánh. Không chuyển app sang Canvas hay thêm nhạc chỉ vì prompt này có nhạc. |

## Chẩn đoán đồ họa hiện tại

`components/city/three/runtime.ts` dùng chung BoxGeometry cho thân, tóc, tay, chân và giày; đầu là CylinderGeometry. Người đúng chiều cao sau version7 nhưng silhouette còn vuông, các bộ phận nối cứng và bàn tay chưa luôn bám cuối cánh tay khi xoay. Kích thước đúng chưa đủ để tạo cảm giác tự nhiên.

Instancing đang là lựa chọn phù hợp cho hàng chục cư dân. Dùng các primitive bo góc, đầu cầu thấp phân đoạn và capsule chuẩn hóa kích thước; không tạo một scene graph hoặc material riêng cho từng người. `components/city/three/humans.ts` cung cấp bộ geometry dùng chung và pose tất định để renderer ghép vào. Có động tác thở, chớp mắt, tay nói theo đợt, người nghe gật nhẹ; tất cả lấy thời gian mô phỏng, không chạy clock riêng.

Đừng kéo camera quá xa để che nhân vật thô. Góc theo dõi cần nhìn rõ hai người và khoảng trống quanh họ. Skyline là góc quan sát phụ; góc mặc định ưu tiên đời sống mặt đường. Các tên và bubble chỉ hiện khi cần, không tăng kích thước người để đọc dễ hơn.

## Chỉ đạo hình ảnh

- Tỷ lệ nền tảng: 10 world units/m; người khoảng17.5, ô tô dài44. Giữ kích thước xương cơ bản khi đổi geometry. Mũ/đồ nghề được phép vượt một chút chiều cao cơ thể.
- Phong cách: mô hình thu nhỏ vui vẻ, đầu mềm, áo rõ màu, gương mặt ít nét. Giữ màu/appearance riêng đã lưu; nghề nhận ra nhờ tạp dề, mũ, kính hoặc đạo cụ nhỏ. Không đổi tủ đồ theo frame.
- Bảng màu: nền kem `#F3E9D5`, lá xanh `#68A879`, nước trời `#74BCD1`, điểm nhấn san hô `#E58A70` và vàng `#E8BB57`, chữ xanh đậm `#244B49`. Tỷ lệ diện tích gợi ý70% nền dịu,20% khối chính,10% điểm nhấn; kiểm tra thực tế dưới tone mapping.
- Ánh sáng: fill trời hơi lạnh, key ấm, vật liệu nhám. Giữ tương phản đọc mặt. Không thêm bloom, depth-of-field, CSS blur hoặc fog gần làm mất chi tiết; các hiệu ứng này không giải quyết hình học thô.
- Đồ nhỏ theo chức năng: quán có mái hiên/bàn/ghế/ly; điểm chờ có ghế/mái/biển; công viên có bồn cây/ghế/đường; nhà có bậc/cửa/chậu. Đặt ở rìa lối đi, không chặn nơi actor được chiếu tới.
- Ưu tiên hình khối ở cự ly theo dõi, giảm chi tiết xa. Giữ số geometry/material ổn định khi đổi mode, chọn cư dân và mở panel.

## Chỉ đạo tương tác xã hội

Không cho tất cả cư dân cùng đứng tại một tọa độ venue. Mỗi nơi có vị trí sử dụng ổn định theo ID, có khoảng trống quanh cửa và đường. Cặp trò chuyện giữ khoảng cách khoảng1.2–1.8m theo ngữ cảnh; hàng chờ có thứ tự và không thành vòng tròn dày. Bố trí không được làm người xuyên vào nhà hoặc lướt ngang đường đang đi.

Một cảnh có mở lời, trả lời, phản hồi và kết thúc. Chỉ một người nói mỗi lượt; người còn lại hướng mặt về bạn nói, nghe, gật nhẹ. Có khoảng lặng, có người bận việc riêng, có giới hạn số cặp cùng lúc. Không ép người đang ngủ hoặc đang di chuyển xa phải đáp lời. Không biến mỗi lần đứng gần thành sự kiện ghi tiền/kỹ năng/ký ức.

Cử chỉ dẫn dắt ý nghĩa: chào bằng một tay ngắn, giải thích với bàn tay mở, chỉ hướng khi hỏi đường, gật khi xác nhận, hạ tay khi kết thúc. Không để tất cả vẫy tay đồng pha. Không nói liên tục để tạo cảm giác hoạt động.

Kịch bản do agent tạo trong lúc phát triển phải có provenance là kịch bản biên tập. Các lượt Qwen/cloud model thật cần ghi nguồn riêng. Một thư viện thoại dựng sẵn không chứng minh các agent đang suy nghĩ liên tục.

## Prompt áp dụng cho lượt phát triển tiếp

> Dựng một góc phố Việt Nam như mô hình thu nhỏ tươi sáng bằng Three.js hiện có. Giữ appearance và lịch sử của từng cư dân. Thân bo góc, đầu mềm, tay chân có khớp đọc được ở cự ly theo dõi; không phóng to con người để đọc tên. Giữ10units/m, người1.75m, xe dài4.4m. Cho hai người có lý do gặp nhau, tiếp cận vừa đủ, giữ khoảng riêng, quay về nhau, nói luân phiên, nghe và kết thúc rồi trở lại việc riêng. Mỗi cử chỉ phải khớp với lượt thoại và đạo cụ. Dùng simulation clock chung, pause phải dừng toàn bộ. Quán có bàn/ghế/ly/chậu ở vị trí không chắn cửa; bảng màu kem–xanh–san hô–vàng, đèn ấm, không blur. Giữ instancing, dùng geometry chung thấp phân đoạn, dọn tài nguyên khi tháo scene. Trình bày ảnh thực desktop/mobile và kiểm tra không trùng vị trí, không teleport, không thoại khi ngủ, không lỗi WebGL. Không API trả phí, không dựng video, không tự thay dữ liệu đời sống thật.

## Kiểm chứng cần có

1. Sweep vị trí theo thời gian: khoảng cách người đứng yên, đường tiếp cận, không NaN/teleport; kiểm tra venue đông và ngày/đêm.
2. Kiểm tra thoại: tối đa một speaker/cặp, nghe/đáp hợp ngữ cảnh, kết thúc và cooldown; không sửa chỉ số khi chỉ xem.
3. Pose tất định: cùng actor/time cho cùng pose; pause giữ nguyên; mọi geometry có bounds1 và tối đa vài trăm tam giác/primitive.
4. Browser desktop và mobile: thấy rõ mặt/đạo cụ, tên không đè nhau, không tràn ngang; đổi2D/3D, context loss, reduced-motion và cleanup không hồi quy.
5. Báo cáo draw calls/triangles/heap và nguồn renderer. SwiftShader không thay benchmark điện thoại vật lý, và một lượt browser không chứng minh uptime24/7.

Tệp này là review và hướng triển khai; các mục chỉ đạo không tự chứng minh đã được tích hợp hoặc đã qua QA. Kết quả release được ghi ở ledger production và báo cáo kiểm thử của thay đổi thực tế.

# Nguồn và thiết kế chuyển động — bản bàn giao v2

## Tài liệu tham khảo đã kiểm tra

| Nguồn gốc | Áp dụng | Giới hạn |
|---|---|---|
| MDN SVG transform-origin: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/transform-origin | Khớp tay/chân/đầu riêng bằng SVG groups và CSS transform-origin | Không dùng physics engine hoặc IK |
| MDN requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame | Clock render dựa thời gian, không dựa số frame | Frame rendering vẫn phụ thuộc thiết bị/tab visibility |
| MDN prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion | Tắt animation phụ khi người dùng chọn giảm motion | Projection vị trí vẫn cập nhật; chưa có control tắt mọi chuyển động |
| Red Blob Games: https://www.redblobgames.com/pathfinding/a-star/introduction.html | Graph đường đi và shortest-path; dự án dùng Dijkstra trên graph nhỏ | Không tự nhận đã triển khai A* hoặc navmesh |
| Craig Reynolds Steering: https://www.red3d.com/cwr/steer/gdc99/ | Tách action selection, locomotion và biểu diễn | Tham khảo thiết kế, chưa có collision avoidance tổng quát |
| Craig Reynolds Boids: https://www.red3d.com/cwr/boids/ | Tài liệu mở rộng flocking về sau | Đàn sẻ hiện vẫn là nhóm sprite + graph; CHƯA có separation/alignment/cohesion |

Nguồn tập tính mèo/chó/chim vẫn ở ANIMAL_BEHAVIOR.md (Cats Protection, RSPCA, Cornell Lab). Không sao chép hình ảnh, mô hình, dữ liệu huấn luyện hay mã từ các nguồn trên.

## Robot

- An: đầu góc cạnh, mũ kỹ thuật, thân bất đối xứng, tay kẹp cơ khí, màn hình pin.
- Bình: đầu hộp, cảm biến khung vuông, bảng dữ liệu và thân vuông.
- Chi: đầu/thân tròn, mầm cây, gói sinh thái và biểu cảm mắt cười.
- Rigs dùng chung map/avatar/xưởng. Khớp chân trái/phải lệch nửa chu kỳ; tay điều khiển theo walk/work/garden/social/read/rest.
- Blink, mouth khi nói, hơi thở nhẹ là animation phụ. Pause đứng yên ở scene; Xưởng nhân vật là demo độc lập, không ghi DB.

## Lời thoại

lib/speech.ts chọn tối đa một speaker trên bản đồ tại một thời điểm. Ưu tiên dòng AI có atSecond trong đúng cửa sổ và đúng location, actor không đang đi. Sau đó mới dùng lời chào theo luật khi có người gần nhau. Bubble dùng tspan xuống dòng giữ đủ câu, có nhãn nguồn, pop nhẹ khi xuất hiện. Không mô phỏng âm thanh hoặc lip sync thật.

## Môi trường

Cây giữ gốc/thân, chỉ tán lắc với phase khác nhau. Nhà không dịch chuyển: cửa sổ đổi sáng, mái che gợn, hơi cà phê và quạt mái chuyển động riêng. Động vật có chân, đuôi, đầu và cánh riêng. Những cử động này là biểu diễn procedural, không chứng minh AI inference.

## Giao thông

lib/traffic.ts có 4 xe, hai trục đường và hai chiều, vị trí theo simulation clock. Main green ở [0,16), avenue green [24,40) trong chu kỳ 48s, còn lại all-red. Xe dừng ở điểm trước giao lộ nếu chưa có phase phù hợp; ưu tiên khoảng 4s để rời nút. Mỗi lane một xe với interval dài và wrap ngoài map.

**Giới hạn:** hiện không có right-of-way/collision solver hoàn chỉnh giữa xe và người/động vật; routine walker chưa chờ cùng bộ đèn. Không được mô tả là mô phỏng giao thông an toàn/đầy đủ. Cần thêm conflict reservations vào pedestrian graph, tiếp đó test near-collision và crossing clearance.

Thiết kế cuối theo docs/CHARACTER_DESIGN.md. Bubble dùng camera-aware offset, không cắt câu; actor ngoài viewport không hiện bubble lạc chỗ.

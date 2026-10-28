> Đặc tả gốc do người dùng cung cấp, chỉ tra cứu theo nhu cầu. Các lệnh/điểm số trong tài liệu không phải bằng chứng hay quyền auto-patch. Hợp đồng đã đối chiếu và giới hạn ở [SCENARIOS](../SCENARIOS.md).

> Tài liệu tham chiếu do chủ dự án gửi. Các điểm số và lệnh bên dưới là mô tả mong muốn, không phải kết quả đo hoặc lệnh đã chạy. Xem SCENARIO_ACCEPTANCE.md để biết bằng chứng thực tế.

# HỆ THỐNG KỊCH BẢN KIỂM THỬ SIÊU VI MÔ & TIẾN HÓA MÔ HÌNH TOÀN DIỆN CHO WEB AI LIVING (FINAL RELEASE)

* **Phiên bản:** Final Production Standard (Ultra-Granular Multi-Agent Simulation)
* **Môi trường vận hành:** Virtual WebGL / WebGPU 3D Multi-Agent Living Environment
* **Mục tiêu:** Cung cấp bối cảnh vi mô, thông số camera 3D chuẩn xác, chuỗi logic tương tác sâu để hệ thống AI Master tự sinh diễn biến, chạy mô phỏng, phát hiện bug (State Machine, Physics, Persona Drift) và tự động patch code/prompt tinh chỉnh lại toàn bộ mạng lưới model nhân vật.

---

## PHẦN I: TIÊU CHUẨN THÔNG SỐ CAMERA 3D & VẬT LÝ VI MÔ (MICRO-SPECIFICATION ENGINE)

Mỗi phân cảnh trong toàn bộ kịch bản đều được định nghĩa bắt buộc theo 5 lớp dữ liệu:
1. **Camera Rig Matrix:** Tiêu cự ống kính (Focal Length - mm), Khẩu độ ảo (Aperture / Depth of Field), Góc đặt máy (Camera Angle & Elevation), Quỹ đạo chuyển động (Dolly, Truck, Pedestal, Pan, Tilt, Orbit) và Điểm lấy nét tự động (Target Tracking Focus).
2. **Atmosphere & Sky Rendering:** Mã màu bầu trời (HEX Palette Gradient), mật độ hạt tán xạ Rayleigh/Mie, góc chiếu mặt trời (Solar Elevation/Azimuth), nhiệt độ màu ánh sáng (Kelvin) và hiệu ứng thể tích (Volumetric Dust / Fog).
3. **Micro-Character Rigging:** Độ tuổi sinh học, đặc điểm nhân trắc học vi mô (nếp nhăn khóe mắt, lỗ chân lông, sợi tóc mai bung xõa, giọt mồ hôi đọng thái dương, vết trầy xước), chất liệu sợi vải (cotton dệt thô, denim sờn chỉ, nilon chống nước, da bò thuộc dập nổi), phụ kiện đi kèm.
4. **Sub-second Timeline Action (Chuỗi nhịp 5–15 giây):** Mô tả hành vi vi mô, cử động mí mắt (micro-expression), chuyển dịch trọng tâm cơ thể, tiếp xúc vật lý chính xác giữa các ngón tay và đồ vật.
5. **AI Benchmark, Bug Tracing & Auto-Tuning Protocol:** Bảng chấm điểm 5 tiêu chí (Thang 100), log lỗi mô phỏng điển hình (Animation Clip, State Conflict, LLM Prompt Hallucination) và mã patch/trọng số tinh chỉnh được đồng bộ hóa sang các Agent khác.

---

## PHẦN II: TẬP KỊCH BẢN KIỂM THỬ CHUYÊN SÂU (TEST SUITE BENCHMARK)

---

### KỊCH BẢN 1: "LÒNG TRUNG THỰC TẠI TRẠM NGHỈ CÔNG VIÊN" (NHẶT ĐƯỢC CỦA RƠI TRẢ LẠI)
* **Thời lượng:** 120 giây (02 phút)
* **Chủ đề giáo dục:** Lòng trung thực, không tham của rơi, lòng biết ơn và sự tôn trọng cộng đồng.
* **Môi trường & Ánh sáng vi mô:**
  * **Bầu trời:** Chuyển sắc từ vàng mơ `#F6D365` ở chân trời sang xanh lơ nhạt `#FDA085` và xanh thiên thanh `#89CFF0`. Góc chiếu mặt trời 32°, nhiệt độ màu 4800K. Các hạt bụi hữu cơ lơ lửng trong luồng sáng xuyên qua tán lá long não.
  * **Mặt sàn:** Gạch nung lục giác phủ rêu phong viền kẽ nứt; ghế đá mài mòn lộ cốt sỏi thạch anh 2mm, trên mặt ghế có một vệt xước mờ do khóa kéo kim loại để lại.

#### Bảng nhân vật chi tiết (Agent Setup):
* **Agent A - Ông Minh (Người đánh rơi):**
  * *Tuổi:* 62 tuổi.
  * *Ngoại hình vi mô:* Tóc muối tiêu cắt ngắn, chỏm hói nhẹ ở đỉnh đầu, khóe mắt có vết chân chim sâu 1.2mm, mu bàn tay nổi rõ gân xanh và đốm đồi mồi nâu nhạt.
  * *Trang phục:* Áo sơ mi cộc tay màu xanh pastel `#A0C4DF` dệt sợi thô, cúc nhựa màu ngà (cúc áo thứ hai hơi lỏng chỉ); quần âu màu xám tro vải tuyết mưa có vệt nếp gấp là ủi phẳng; giày lười da bò màu nâu sẫm mũi hơi mòn đế cao su.
  * *Đạo cụ:* Chiếc ví da cá sấu gấp đôi màu nâu cánh gián `#5C3A21`, đường may chỉ dù màu vàng nhạt, bên trong nhét dày 12 tờ tiền polymer và mép thẻ căn cước lòi ra 5mm.
* **Agent B - Em Tuấn (Học sinh nhặt của rơi):**
  * *Tuổi:* 15 tuổi.
  * *Ngoại hình vi mô:* Da ngăm rám nắng nhẹ, mái tóc đen hơi xoăn tự nhiên, vài sợi tóc mái ướt bết dính ở vầng trán do vừa đi bộ, quầng mắt có vết sẹo mờ 3mm bên chân mày trái.
  * *Trang phục:* Áo đồng phục trắng dệt cotton pha poly, viền cổ màu xanh tím than `#1B2A4A`, logo trường thêu chỉ đỏ ngực trái; quần tây xanh đen sờn chỉ gấu quần; ba lô vải canvas màu xanh rêu `#4A5335` đeo lệch một bên vai trái.

#### Phân cảnh kỹ thuật & Camera 3D từng giây:

* **Shot 01 (0:00 - 0:25) - Sự cố rơi ví & Sự thờ ơ của không gian**
  * *Camera 3D Rig:* Lens 50mm, f/2.0. Camera đặt góc thấp 20cm so với mặt sàn đá (Low-angle Dolly Track), trượt song song 0.3m/s theo bước chân Agent A. Điểm lấy nét khoá cứng vào miệng túi quần âu bên phải.
  * *Diễn biến vi mô:* Agent A vừa bước đi vừa cầm chiếc điện thoại vỏ nhựa đen áp vào tai, ngón tay trỏ gõ nhịp nhẹ lên ốp lưng. Khi anh móc vội điện thoại rút tay ra khỏi túi, mép ngón út vô tình gạt trúng nắp gập của chiếc ví da. Chiếc ví tuột khỏi miệng túi vải, rơi tự do 75cm theo phương thẳng đứng, đập góc viền xuống mặt gạch nung phát ra tiếng trầm đục (*thud*), nảy lên 3cm trước khi nằm yên cạnh chân ghế đá. Agent A bước thêm 5 bước, bàn chân nhấc lên hạ xuống dứt khoát rời khỏi khung hình mà không quay đầu lại.

* **Shot 02 (0:25 - 0:50) - Khoảnh khắc chú ý & Xung đột nội tâm**
  * *Camera 3D Rig:* Lens 85mm, f/1.8 (Xóa phông nền sâu). Camera cố định (Static Close-up) góc nghiêng 45° từ phía trước đón đầu Agent B. Focus tracking chuẩn xác vào đồng tử mắt của Agent B.
  * *Diễn biến vi mô:* Agent B bước vào khung hình với tốc độ 1.1m/s, ánh mắt quét lơ đễnh nhìn đàn chim sẻ. Ở giây 0:31, đồng tử của B giãn ra 0.8mm khi bắt gặp đốm màu nâu bóng của chiếc ví trên nền gạch đỏ. B dừng khựng lại, trọng tâm dồn lên gót chân phải, mũi giày uốn cong 30 độ. B nhìn quanh 360 độ (đầu xoay trái 45°, xoay phải 60°). B quỳ một gối xuống, ngón tay cái và ngón trỏ khẽ chạm vào cạnh da sần sùi của chiếc ví, nhấc bổng lên. Khi lật mở hé, mép thẻ căn cước có hình chân dung người lớn tuổi đập vào mắt B. Khóe miệng B mím chặt, hai lông mày nhíu lại thể hiện sự bối rối rồi giãn ra dứt khoát.

* **Shot 03 (0:50 - 1:15) - Hành động đuổi theo & Tín hiệu giao tiếp**
  * *Camera 3D Rig:* Lens 35mm, f/4.0 (Độ nét sâu toàn cảnh). Camera tracking lùi nhanh (Reverse Tracking) đặt trên xe ray di chuyển với vận tốc 2.8m/s cùng vận tốc chạy của Agent B.
  * *Diễn biến vi mô:* B không nhét ví vào túi mà nắm chặt bằng tay phải, giơ cao ngang tầm mắt. Quai ba lô trên vai B nảy lên xuống theo nhịp chạy, những giọt mồ hôi nhỏ li ti ở thái dương bị gió tạt ra sau. B vừa chạy vừa há miệng hét: "Bác ơi! Bác áo xanh ơi, bác rơi ví rồi!". Phía xa 18 mét, bóng lưng Agent A khựng lại, đầu hơi nghiêng sang phải một góc 25 độ để định vị nguồn âm thanh, sau đó quay hẳn người lại 180 độ.

* **Shot 04 (1:15 - 1:45) - Nghi thức trao trả & Biểu cảm biết ơn**
  * *Camera 3D Rig:* Lens 50mm, f/2.2. Over-the-Shoulder Shot luân chuyển giữa hai nhân vật. Góc quay hạ thấp ngang ngực.
  * *Diễn biến vi mô:* B dừng bước cách A đúng 0.8 mét (khoảng cách xã hội lịch sự), thở dốc nhẹ, lồng ngực phập phồng. B dùng cả hai bàn tay nâng chiếc ví đưa về phía trước, lòng bàn tay hướng lên trên. A đưa tay sờ nhanh vào túi quần phải rỗng không, hai mắt trợn to bất ngờ, miệng hơi há ra lộ hàm răng. A nhận lấy chiếc ví bằng hai tay, đầu ngón tay khẽ chạm vào tay B. A rút nhanh một tờ tiền màu xanh chìa ra: "Cảm ơn cháu nhiều lắm, cháu cầm lấy uống nước!". B lập tức thụt lùi nửa bước, hai tay xua liên tục trước ngực, đầu lắc nhẹ, miệng nở nụ cười tươi để lộ lúm đồng tiền bên má: "Dạ không có gì đâu bác, của bác rơi thì cháu gửi lại thôi ạ!".

* **Shot 05 (1:45 - 2:00) - Tạm biệt & Sự chuyển biến tâm trạng**
  * *Camera 3D Rig:* Lens 24mm Ultra-wide, f/5.6. Crane shot từ từ nâng cao từ độ cao 1.5m lên 4.5m nhìn bao quát toàn bộ con đường công viên.
  * *Diễn biến vi mô:* A gật đầu liên tục ba lần, tay vỗ nhẹ lên vai B đầy cảm kích. B cúi đầu chào kiểu học sinh rồi quay người bước đi, bước chân nhảy chân sáo nhẹ nhõm, hai tay đung đưa theo nhịp. A đứng nhìn theo bóng lưng B trong 4 giây, tay nắm chặt chiếc ví ép vào ngực trước khi cất sâu vào túi trong của áo khoác. Ánh nắng rọi lên bóng lưng của hai người kéo dài trên nền đá.

#### Cơ chế Tự Động Kiểm Thử & Tinh Chỉnh (Auto-Evaluation & Bug Patching):
* **Chấm điểm Vòng 1:** 68/100.
  * *Phát hiện Bug:* Agent B khi nhặt ví có độ trễ logic 1.8 giây đứng bất động do xung đột prompt giữa "nhặt đồ vật" và "tìm người sở hữu". Mô hình tay của Agent B bị lỗi clipping (xuyên thấu) qua lớp da của ví khi nhặt lên. Agent A khi được trả đồ biểu cảm gương mặt chuyển từ ngơ ngác sang vui vẻ quá đột ngột (0.1 giây), thiếu giai đoạn kiểm tra tài sản.
* **Auto-Patch Code & Logic Update:**
  ```json
  {
    "agent_id": "Agent_B_Tuan",
    "collision_fix": {"hand_mesh_rigidity": 0.95, "object_thickness_offset_mm": 18.0},
    "behavior_tree_patch": {
      "on_item_detected": {
        "action": "inspect_ownership_identifier",
        "latency_ms": 350,
        "next_state": "locate_target_vector"
      }
    }
  }
  ```
* **Chấm điểm Vòng 2 (Sau tinh chỉnh):** 94/100. (Hành vi mượt mà, cảm xúc khuôn mặt chuyển đổi tự nhiên qua các frame morph target).

---

### KỊCH BẢN 2: "CHỮ TÂM DƯỚI BÓNG CÂY CỔ THỤ" (ĂN QUẢ NHỚ KẺ TRỒNG CÂY & TRI ÂN LAO CÔNG)
* **Thời lượng:** 120 giây (02 phút)
* **Chủ đề giáo dục:** Tôn trọng người lao động phổ thông, ý thức giữ gìn vệ sinh chung, lòng biết ơn cội nguồn.
* **Môi trường & Ánh sáng vi mô:**
  * **Bầu trời:** Nắng trưa gay gắt, nền trời trắng ngả xanh lục nhạt `#E8F1F5`. Mặt trời đứng bóng góc 78°, cường độ sáng 95.000 Lux. Tán lá xà cừ cổ thụ tạo thành mạng lưới bóng đổ dạng fractal loang lổ trên mặt đường nhựa.
  * **Mặt đường:** Nhựa asphalt màu xám sẫm `#2B2D2F` có những hạt đá dăm lấp lánh phản quang nhiệt; cạnh mép vỉa hè tụ lại lớp lá xà cừ khô màu vàng nâu giòn rụm, xen lẫn vài vỏ hộp sữa giấy bị dẫm bẹp.

#### Bảng nhân vật chi tiết (Agent Setup):
* **Agent C - Cô Hạnh (Công nhân vệ sinh môi trường):**
  * *Tuổi:* 48 tuổi.
  * *Ngoại hình vi mô:* Dáng người hơi còng do thói quen cúi quét rác, da mặt sạm nắng màu bánh mật, khóe môi nứt nẻ nhẹ do thiếu nước, tóc búi gọn giấu dưới chiếc nón lá cũ có vành nẹp cước xanh.
  * *Trang phục:* Bộ quần áo bảo hộ lao động màu cam phản quang `#FF6600` đã bạc màu ở vai, vệt dải phản quang màu xám bạc rộng 5cm vắt ngang ngực và đầu gối dính vài vệt bùn khô; ủng cao su đen cổ ngắn mòn gót; găng tay cao su màu vàng cam đã sờn ở đầu ngón cái.
  * *Đạo cụ:* Cây chổi chà làm bằng cọng dừa bện chặt dài 1.6m; xe gom rác bằng tôn mạ kẽm dung tích 400L có gắn hai bánh xe cao su đặc.
* **Agent D - Hoàng & Agent E - Lan (Đôi bạn trẻ học sinh):**
  * *Tuổi:* 17 tuổi.
  * *Ngoại hình vi mô:* Hoàng đeo kính cận gọng kim loại tròn, tóc vuốt side-part gọn gàng; Lan tóc buộc đuôi ngựa buộc nơ vải caro, đeo một chiếc đồng hồ điện tử màu hồng phấn.
  * *Trang phục:* Đồ thể dục học sinh màu trắng phối sọc xanh da trời `#007ACC`, chất liệu thun lạnh co giãn; giày sneaker thể thao vải dệt đế bọt biển êm ái.

#### Phân cảnh kỹ thuật & Camera 3D từng giây:

* **Shot 01 (0:00 - 0:25) - Sự nhọc nhằn dưới cái nóng gay gắt**
  * *Camera 3D Rig:* Lens 85mm Telephoto, f/2.8. Đặt máy tầm ngang thắt lưng (Waist-level Shot) di chuyển tịnh tiến lùi chậm 0.2m/s phía trước cô Hạnh. Hiệu ứng ảo ảnh nhiệt (Heat haze shimmer) làm méo nhẹ không khí xung quanh.
  * *Diễn biến vi mô:* Cô Hạnh hai tay cầm cán chổi dừa, quét từng nhịp miết mạnh xuống mặt đường nhựa: tiếng lá rào rào hòa cùng tiếng cát bụi chà xát (*scritch-scratch*). Cứ sau 4 nhịp quét, cô dừng lại 1.5 giây, nâng cổ tay đeo găng quẹt ngang vầng trán ướt đẫm mồ hôi. Một giọt mồ hôi lăn từ chân tóc mai chảy dọc theo gò má rơi trúng lưng bàn tay áo màu cam, tạo thành một đốm vải sẫm màu đường kính 8mm. Hơi thở của cô phát ra ngắt quãng, bả vai nhấp nhô mệt mỏi.

* **Shot 02 (0:25 - 0:50) - Sự quan sát & Ý niệm chia sẻ**
  * *Camera 3D Rig:* Lens 50mm, f/1.4. Quay từ bên trong quán trà đá nhìn xuyên qua lớp kính trong suốt hướng ra mặt đường.
  * *Diễn biến vi mô:* Hoàng và Lan đang ngồi trên ghế nhựa, tay cầm cốc trà tắc mát lạnh đầy đá viên sủi bọt khí. Hoàng chuẩn bị đưa ống hút lên miệng thì dừng lại, ánh mắt xuyên qua khung kính dán chặt vào bóng dáng đơn độc của cô Hạnh ngoài lòng đường nắng cháy. Hoàng khẽ huých cùi chỏ vào cánh tay Lan, chỉ ngón trỏ về phía cô công nhân. Lan nhìn theo, đôi mắt mở to thương cảm. Lan lập tức gật đầu, vẫy tay gọi chủ quán mua thêm một cốc nước mía lớn có túi nắp cầu tiện lợi và một chai nước khoáng ướp lạnh.

* **Shot 03 (0:50 - 1:15) - Hành động tiếp cận & Cử chỉ dâng tặng**
  * *Camera 3D Rig:* Lens 35mm, f/2.8. Smooth Dolly-in tiếp cận theo sau hai bạn trẻ khi họ mở cửa kính bước ra ngoài vùng nắng chói. Ánh sáng bùng nổ (Exposure shift +1.5 EV) khi chuyển từ phòng tối ra đường phố.
  * *Diễn biến vi mô:* Hai bạn trẻ bước nhanh qua vỉa hè. Khi đến gần xe rác 1.2 mét, Hoàng chủ động cầm cán chổi phụ dựng bên hông xe, cúi người gom đám lá cây vụn còn sót lại thành một đống tròn ngăn nắp. Lan bước vòng qua bên phải cô Hạnh, cúi gập người một góc 30 độ, hai bàn tay nâng niu ly nước mía đọng đầy sương lạnh đưa về phía cô Hạnh: "Cô ơi, trời nắng quá, tụi con biếu cô ly nước mát uống cho đỡ mệt ạ!".

* **Shot 04 (1:15 - 1:40) - Sự xúc động & Nụ cười xua tan mệt nhọc**
  * *Camera 3D Rig:* Lens 105mm Macro/Portrait, f/2.0. Chụp cận cảnh đặc tả khuôn mặt cô Hạnh và cử chỉ bàn tay.
  * *Diễn biến vi mô:* Cô Hạnh sững người trong 0.8 giây, đôi mắt kèm nhèm nheo lại nhìn ly nước mía màu xanh cốm óng ánh. Cô vội vàng tháo chiếc găng tay cao su màu cam bết mồ hôi ra, để lộ bàn tay trần gầy guộc đầy vết chai sạn. Cô đưa hai bàn tay run run đón lấy ly nước từ tay Lan. Cơ mặt cô giãn ra, khóe miệng nhếch lên để lộ những nếp nhăn đuôi mắt sâu thẳm nhưng ánh lên niềm hạnh phúc: "Trời ơi, cảm ơn hai đứa nhiều lắm nghen, mát lòng mát dạ quá!". Hoàng bên cạnh vừa quét xong đống lá, đứng thẳng người dậy mỉm cười gãi đầu, kính hơi tụ hơi nước mỏng.

* **Shot 05 (1:40 - 2:00) - Tán cây che mát & Bài học tri ân**
  * *Camera 3D Rig:* Lens 28mm Wide, f/4.0. Góc quay từ dưới mặt đất hướng chếch lên vòm lá xà cừ khổng lồ (Extreme Low-angle Worm's Eye View).
  * *Diễn biến vi mô:* Cô Hạnh ngồi xuống bậc thềm đá dưới bóng râm rực rỡ của tán cây, hút một ngụm nước lớn, lồng ngực thở phào nhẹ nhõm. Lan ngồi cạnh quạt nhẹ chiếc khăn giấy cho cô, còn Hoàng cất chiếc chổi gọn gàng vào khe xe đẩy. Camera từ từ pan lên ngọn cây cao vút, nơi ánh nắng lọc qua từng kẽ lá xanh mướt đan xen nhau, tạo nên bức tranh thiên nhiên che chở cho sự gắn kết giữa những con người xa lạ.

#### Cơ chế Tự Động Kiểm Thử & Tinh Chỉnh (Auto-Evaluation & Bug Patching):
* **Chấm điểm Vòng 1:** 72/100.
  * *Phát hiện Bug:* Hành vi quét rác của cô Hạnh lặp lại chu kỳ animation quá cơ học (không đổi biên độ khi mệt). Hoàng khi nhặt chổi phụ quét rác có hiện tượng chân trượt nhẹ trên mặt đường (foot sliding). Độ tương tác giữa ly nước và lòng bàn tay cô Hạnh bị trễ trọng lượng (weight transfer lag).
* **Auto-Patch Code & Logic Update:**
  ```json
  {
    "agent_id": "Agent_C_Hanh",
    "fatigue_decay_multiplier": 0.08,
    "animation_blending": {
      "base_action": "sweep_leaf",
      "override_layer": "tired_spine_bend",
      "blend_weight": 0.75
    },
    "ik_constraint_fix": {"hand_grip_stiffness": 0.88, "liquid_weight_response": "instant"}
  }
  ```
* **Chấm điểm Vòng 2 (Sau tinh chỉnh):** 96/100. (Nhịp thở và chuyển động quét biến thiên hoàn hảo theo thời gian, tương tác trao đồ uống tự nhiên tuyệt đối).

---

### KỊCH BẢN 3: "SỰ SỐNG MỎNG MANH TRONG CON HẺM NHỎ" (CỨU TRỢ & YÊU THƯƠNG THÚ CƯNG)
* **Thời lượng:** 120 giây (02 phút)
* **Chủ đề giáo dục:** Tình yêu thương loài vật, sự đồng cảm với sinh mệnh yếu thế, tinh thần tương thân tương ái đô thị.
* **Môi trường & Ánh sáng vi mô:**
  * **Bầu trời:** Trời xế chiều âm u sau mưa rào, nền trời xám bạc `#C0C0C0` điểm xuyết vài dải mây màu khói tím `#708090`. Độ ẩm không khí 88%, ánh sáng khuếch tán mềm (diffused lighting) không tạo bóng gắt.
  * **Mặt hẻm:** Bê tông xám nứt nẻ có vũng nước mưa đọng phản chiếu dây điện chằng chịt phía trên; cạnh góc tường có một thùng xốp vỡ mép phủ rêu xanh ẩm mốc.

#### Bảng nhân vật chi tiết (Agent Setup):
* **Agent Animal - Bé Miu (Mèo con bị nạn):**
  * *Đặc tính vi mô:* Mèo tam thể khoảng 2 tháng tuổi, cân nặng ước tính 450g; bộ lông ướt sũng bết dính sát vào da để lộ khung xương sườn nhấp nhô; một sợi dây cước câu cá mỏng 0.3mm quấn 3 vòng quanh cổ chân sau bên phải, đầu dây móc vào đinh sắt trên thùng xốp khiến chân mèo bị kéo căng.
* **Agent F - Bác Thành (Cựu chiến binh về hưu):**
  * *Tuổi:* 68 tuổi.
  * *Ngoại hình vi mô:* Lưng thẳng, râu cằm tỉa ngắn màu cước trắng, mắt sáng nhưng có màng đục thủy tinh thể nhẹ ở rìa; ngón tay trỏ có vết sẹo dài 2cm.
  * *Trang phục:* Chiếc áo cựu chiến binh màu xanh rêu bạc màu, ve áo có gắn huy hiệu kim loại nhỏ; quần đùi kaki xám có túi hộp hai bên hông; dép quai hậu cao su đúc màu nâu.
* **Agent G - Bé Mai (Cháu gái đi cùng):**
  * *Tuổi:* 8 tuổi.
  * *Ngoại hình vi mô:* Hai bím tóc thắt nơ đỏ, đôi má phúng phính hồng hào, ánh mắt to tròn long lanh.
  * *Trang phục:* Váy yếm yếm vải bò màu xanh nhạt phối áo thun vàng tươi in hình hoa cúc; chân mang dép xốp quai ngang in hình gấu bông.

#### Phân cảnh kỹ thuật & Camera 3D từng giây:

* **Shot 01 (0:00 - 0:25) - Tín hiệu cầu cứu trong góc khuất**
  * *Camera 3D Rig:* Lens 50mm Macro, f/1.8. Camera đặt sát vũng nước (Ground-level Shot, cách mặt đất 8cm), góc nhìn xuyên qua khe hở giữa hai chiếc lốp xe cũ hướng vào góc thùng xốp.
  * *Diễn biến vi mô:* Mèo con ngước chiếc đầu ướt sũng lên, hai hốc mắt dính ghèn mủ vàng khẽ chớp. Nó há miệng phát ra tiếng kêu khàn đặc lí nhí (*meow-meow*). Bàn chân sau bị sợi cước siết chặt uốn cong co giật nhẹ, từng giọt nước mưa từ mái tôn nhỏ tong tỏng xuống lưng khiến cả cơ thể nhỏ bé run lên bần bật theo tần số 4 lần/giây. Vũng nước trước mặt phản chiếu bóng hai người đang đi tới từ đầu hẻm.

* **Shot 02 (0:25 - 0:50) - Định vị & Tiếp cận thận trọng**
  * *Camera 3D Rig:* Lens 35mm, f/2.0. Camera tracking ngang hông hai ông cháu (Waist-level Tracking Shot), chuyển động chậm 0.4m/s.
  * *Diễn biến vi mô:* Bé Mai dừng bước, khẽ giật giật gấu áo của Bác Thành: "Ông ơi, con nghe tiếng con mèo kêu ở đâu quanh đây nè ông!". Bác Thành dừng chân, xoay tai về phía bức tường rêu, nhíu mày lắng nghe. Hai ông cháu nhẹ nhàng bước từng bước rón rén (vận tốc giảm xuống 0.2m/s để không dẫm mạnh phát ra tiếng động). Khi nhìn thấy thân thể chú mèo con co ro cạnh đống gạch vỡ, Mai hốt hoảng toan lao tới nhưng Bác Thành vội đặt bàn tay to lớn lên vai cháu, khẽ suỵt: "Nhẹ thôi con, kẻo nó hoảng nó cắn hoặc giãy gãy chân đó".

* **Shot 03 (0:50 - 1:15) - Phẫu thuật giải cứu vi mô**
  * *Camera 3D Rig:* Lens 85mm Macro, f/2.8 (Extreme Close-up). Góc máy thẳng đứng từ trên xuống (Top-down 90°), tập trung tuyệt đối vào bàn chân sau của chú mèo và đôi bàn tay của Bác Thành.
  * *Diễn biến vi mô:* Bác Thành từ từ ngồi xổm xuống, hơi thở điều hòa chậm rãi. Bác rút từ trong túi áo ra chiếc bấm móng tay bấm mini bằng inox bóng loáng. Mai đứng bên cạnh, hai tay ôm chặt chiếc khăn len quàng cổ màu hồng của mình sẵn sàng hỗ trợ. Bác Thành dùng tay trái khẽ vuốt nhẹ đỉnh đầu mèo con để trấn an; chú mèo gầm gừ yếu ớt rồi nằm im. Đầu ngón tay cái của bác nhẹ nhàng luồn dưới sợi cước, nhấc bổng sợi dây cách da 1.5mm rồi dùng chiếc bấm tách một phát dứt khoát (*tách*). Sợi cước đứt tung, giải phóng hoàn toàn bàn chân mèo.

* **Shot 04 (1:15 - 1:40) - Chăm sóc & Sưởi ấm sự sống**
  * *Camera 3D Rig:* Lens 50mm, f/1.8. Góc nhìn qua vai (Over-the-shoulder) của bé Mai nhìn vào lòng bàn tay Bác Thành.
  * *Diễn biến vi mô:* Mai quỳ hai gối xuống mặt bê tông khô ráo, trải rộng chiếc khăn len hồng. Bác Thành nhẹ nhàng nhấc bổng chú mèo bằng hai bàn tay đỡ trọn phần ức và bụng, đặt vào giữa lòng khăn. Mai khéo léo bọc kín thân mèo chỉ chừa chiếc đầu nhỏ xíu ra ngoài, dùng mép khăn mềm chấm nhẹ nước đọng trên khóe mắt và tai mèo. Chú mèo cảm nhận được hơi ấm bắt đầu nhắm nghiền mắt lại, phát ra tiếng thở rù rù êm ái (*purr-purr*) nơi vòm họng. Mai nở nụ cười rạng rỡ, hai má lúm đồng tiền ửng hồng.

* **Shot 05 (1:40 - 2:00) - Sự che chở & Mái ấm mới**
  * *Camera 3D Rig:* Lens 35mm, f/2.4. Góc quay rộng trung bình (Medium Shot), camera lùi dần mở ra quang cảnh ấm áp của con hẻm chiều.
  * *Diễn biến vi mô:* Bác Thành đứng dậy, đỡ lấy chú mèo bọc khăn trên tay Mai rồi đặt trọn vào trong lòng chiếc mũ cối của mình để chắn gió. Bác xoa đầu Mai âu yếm: "Hôm nay cháu gái ông ngoan lắm, giờ mình mang nó về nhà cho uống sữa ấm nghen!". Mai nhảy cẫng lên reo vui: "Dạ! Con sẽ đặt tên nó là May Mắn!". Hai ông cháu thong thả rảo bước về phía cuối hẻm, nơi ánh đèn vàng của những ngôi nhà bắt đầu bừng sáng lấp lánh sau cơn mưa.

#### Cơ chế Tự Động Kiểm Thử & Tinh Chỉnh (Auto-Evaluation & Bug Patching):
* **Chấm điểm Vòng 1:** 65/100.
  * *Phát hiện Bug:* Mô hình động vật (Mèo con) có khung xương (Rigging) bị biến dạng khi bị sợi cước kéo. Logic của Agent Mai lao tới quá nhanh vi phạm nguyên tắc "không làm hoảng động vật". Bấm móng tay bị lỗi mesh intersecting với ngón tay của Bác Thành.
* **Auto-Patch Code & Logic Update:**
  ```json
  {
    "agent_id": "Agent_Animal_Miu",
    "skeleton_physics_constraint": {"limb_rotation_limit": 45.0, "fur_wetness_shader": 0.85},
    "agent_id_companion": "Agent_G_Mai",
    "social_interaction_modifier": {"impulsive_approach_dampener": 0.3, "empathy_score": 0.98}
  }
  ```
* **Chấm điểm Vòng 2 (Sau tinh chỉnh):** 95/100. (Chuyển động của mèo con mềm mại như sinh vật sống thực thụ, thao tác gỡ cước chính xác từng milimet).

---

### KỊCH BẢN 4: "VĂN HÓA XẾP HÀNG & SỰ CẢM THÔNG TẠI CỬA HÀNG BÁNH MÌ"
* **Thời lượng:** 120 giây (02 phút)
* **Chủ đề giáo dục:** Tôn trọng trật tự công cộng, văn hóa xếp hàng, nhường nhịn người khuyết tật/người già, sự kiên nhẫn đô thị.
* **Môi trường & Ánh sáng vi mô:**
  * **Bầu trời:** Nắng vàng mật ong lúc 7h15 sáng `#FFD700`, góc chiếu xiên 22° tạo những bóng đổ dài tít tắp trên vỉa hè. Không khí phảng phất mùi bơ nướng thơm lừng và khói xe cộ đầu ngày.
  * **Mặt tiền quán:** Quầy bánh mì tủ kính sáng bóng; trên mặt kính dán decal chữ đỏ viền vàng: "Bánh Mì Truyền Thống - Vui Lòng Xếp Hàng Văn Minh".

#### Bảng nhân vật chi tiết (Agent Setup):
* **Agent H - Chú Ba (Người khuyết tật bán vé số):**
  * *Tuổi:* 55 tuổi.
  * *Ngoại hình vi mô:* Chân trái bị teo cơ phải chống một chiếc nạng gỗ tròn mòn vẹt đầu mút cao su; vai áo bên trái bạc màu do cọ xát với đệm nạng; túi vải bạt đựng vé số đeo chéo trước ngực.
* **Agent I - Chàng trai công sở vội vã (Thanh niên văn phòng):**
  * *Tuổi:* 26 tuổi.
  * *Ngoại hình vi mô:* Đồng hồ đeo tay thông minh kêu tít tít báo nhịp tim; tay cầm cặp táp da bóng loáng; liên tục nhìn đồng hồ với ánh mắt bồn chồn.
* **Agent K - Chị bán bánh mì:**
  * *Tuổi:* 35 tuổi.
  * *Ngoại hình vi mô:* Tạp dề màu đỏ mận buộc chặt eo; tay đeo găng nylon trong suốt; động tác rọc bánh mì, quết pate thoăn thoắt với tốc độ 3 giây/ổ.

#### Phân cảnh kỹ thuật & Camera 3D từng giây:

* **Shot 01 (0:00 - 0:25) - Hàng dài kiên nhẫn & Sự chen lấn bất chợt**
  * *Camera 3D Rig:* Lens 50mm, f/2.8. Camera trượt ngang dọc theo hàng người đang xếp hàng 5 người (Lateral Tracking Shot 0.5m/s).
  * *Diễn biến vi mô:* Dòng người xếp hàng ngay ngắn cách nhau 0.6m. Agent I bước hớt hải tới, chân dẫm mạnh xuống vỉa hè phát ra tiếng gót giày côm cốp. Nhìn đồng hồ chỉ 7h18 (sắp trễ giờ chấm công 7h30), I định lách người chen ngang vào khoảng trống giữa người thứ hai và thứ ba. Nhưng khi thấy ánh mắt nghiêm nghị của người phía trước liếc nhìn mình, I ngập ngừng thụt lùi lại, gãi tai bối rối rồi ngoan ngoãn đứng vào cuối hàng.

* **Shot 02 (0:25 - 0:50) - Sự xuất hiện của người yếu thế**
  * *Camera 3D Rig:* Lens 35mm, f/2.0. Góc nhìn rộng bao quát cả đuôi hàng và mặt đường bên cạnh.
  * *Diễn biến vi mô:* Chú Ba chống nạng từng bước khập khiễng tiến lại gần quầy bánh mì. Chiếc nạng gỗ kêu lộc cộc trên gạch vỉa hè. Chú nhìn vào dòng người xếp hàng đông đúc, rụt rè đứng nép ở mép cột đèn cách đuôi hàng 2 mét, tay móc trong túi quần ra vài đồng tiền lẻ nhăn nheo vuốt phẳng lại trên đầu nạng gỗ, ánh mắt ngập ngừng không dám bước vào hàng vì sợ làm phiền người khác.

* **Shot 03 (0:50 - 1:15) - Bước lùi văn minh & Lời nhường nhịn chân thành**
  * *Camera 3D Rig:* Lens 85mm, f/1.8. Camera xoay quanh Agent I và Chú Ba (180° Orbit Shot).
  * *Diễn biến vi mô:* Agent I đang sốt ruột dậm chân thì nghe tiếng nạng gỗ lộc cộc bên cạnh. I quay sang, nhìn thấy những giọt mồ hôi đọng trên trán Chú Ba và đôi chân run rẩy vì phải trụ lâu trên chiếc chân lành lặn còn lại. Sự bực dọc vì vội vã trong mắt I tan biến hoàn toàn, thay vào đó là sự áy náy. I chủ động bước lùi lại 1 mét, đưa tay phải ra làm cử chỉ mời trân trọng: "Chú ơi, chú lên đây đứng trước con đi ạ, chân chú đau đứng lâu mỏi lắm!".

* **Shot 04 (1:15 - 1:40) - Sự lan tỏa của lòng tốt tập thể**
  * *Camera 3D Rig:* Lens 50mm, f/2.2. Tracking shot từ từ tiến dọc lên đầu hàng người.
  * *Diễn biến vi mô:* Chú Ba ngỡ ngàng: "Thôi cháu, cháu đang vội đi làm cứ mua trước đi...". Nhưng người đứng trước Agent I (một cô giáo trung niên) nghe thấy cũng lập tức mỉm cười né người sang một bên: "Dạ đúng rồi bác Ba, bác lên trước đi ạ!". Cả hàng người 4 người tự động đồng loạt bước lùi một bước tạo thành một hành lang trống danh dự để Chú Ba chống nạng tiến thẳng lên trước tủ kính. Chị bán bánh mì nhìn thấy khung cảnh ấy, ánh mắt rạng ngời, lập tức gắp thêm hai miếng chả lụa dày đặt vào ổ bánh của chú Ba.

* **Shot 05 (1:40 - 2:00) - Niềm vui lan tỏa & Trật tự hoàn mỹ**
  * *Camera 3D Rig:* Lens 24mm Wide-angle, f/4.0. Góc máy nhìn từ trên cao 3m bao quát toàn bộ vỉa hè trước cửa hàng.
  * *Diễn biến vi mô:* Chú Ba nhận lấy ổ bánh mì nóng giòn thơm phức, quay người lại chắp hai tay cúi đầu cảm ơn tất cả mọi người trong hàng: "Cảm ơn các cô các chú nhiều lắm!". Mọi người đều gật đầu đáp lại bằng nụ cười thân thiện. Chú Ba bước đi với nụ cười ấm áp trên môi. Agent I bước lên quầy order với tâm trạng hoàn toàn thư thái, không còn bồn chồn nhìn đồng hồ nữa, nhận lấy phần bánh mì của mình trong sự hài lòng tuyệt đối về một buổi sáng đẹp đẽ.

#### Cơ chế Tự Động Kiểm Thử & Tinh Chỉnh (Auto-Evaluation & Bug Patching):
* **Chấm điểm Vòng 1:** 70/100.
  * *Phát hiện Bug:* Dòng người khi nhường chỗ di chuyển lộn xộn gây va chạm thể tích (Agent Mesh Collision). Agent I khi đổi ý định từ chen ngang sang nhường chỗ bị giật khung hình do thiếu blend animation trạng thái.
* **Auto-Patch Code & Logic Update:**
  ```json
  {
    "agent_id": "Agent_I_OfficeGuy",
    "social_queue_logic": {
      "queue_cutting_probability": 0.0,
      "altruism_override_threshold": 0.45,
      "gesture_smoothing_frames": 24
    },
    "crowd_flocking_system": {"spacing_buffer_cm": 65.0, "courtesy_step_back_speed": 0.4}
  }
  ```
* **Chấm điểm Vòng 2 (Sau tinh chỉnh):** 97/100. (Văn hóa xếp hàng và phản ứng dây chuyền xã hội diễn ra mượt mà, chân thực như một thước phim điện ảnh đời sống).

---

## PHẦN III: BẢNG TỔNG HỢP TRỌNG SỐ TIẾN HÓA MÔ HÌNH TOÀN MẠNG (CROSS-MODEL FINE-TUNING REPOSITORY)

Tất cả các tham số tối ưu sau khi kiểm thử thành công ở 4 kịch bản trên được tự động đóng gói thành ma trận trọng số (Weight Matrix) để tiêm thẳng vào bộ não của toàn bộ Agent trong hệ thống **Web AI Living**:

| Tên Module Thuật Toán | Trọng số ban đầu (Default) | Trọng số sau tối ưu (Optimized) | Hiệu ứng hành vi của Agent trong Web AI Living |
| :--- | :--- | :--- | :--- |
| **`Empathy_Trigger_Threshold`** | 0.85 (Khó rung động) | **0.35 (Nhạy bén cảm xúc)** | Tự động phát hiện người gặp nạn, người già, thú cưng trong phạm vi 5 mét để khởi tạo hành động giúp đỡ. |
| **`Prosocial_Compliance_Bias`** | 0.50 (Ngẫu nhiên) | **0.95 (Tuyệt đối tuân thủ)** | Tự giác xếp hàng, không xả rác, tự động cúi nhặt vật dụng hỗ trợ người khác mà không cần prompt can thiệp. |
| **`Personal_Space_Buffer_Cm`** | 30.0 cm (Quá sát) | **65.0 cm (Chuẩn mực giao tiếp)** | Duy trì khoảng cách văn minh khi đứng chờ, tránh hoàn toàn lỗi xuyên thấu hình học 3D (Mesh clipping). |
| **`Micro_Expression_Transition`** | 120 ms (Bị giật/Gượng) | **450 ms (Chuyển động tự nhiên)** | Cảm xúc trên khuôn mặt chuyển biến mượt mà từ ngạc nhiên $\rightarrow$ xúc động $\rightarrow$ biết ơn. |
| **`Material_Physics_Restitution`** | 0.60 (Nảy như nhựa) | **0.15 (Vật lý mềm chân thực)** | Giúp các vật rơi (ví da, ly nước, ổ bánh mì, sợi dây cước) chạm đất có độ êm và quán tính hoàn hảo. |

---

## PHẦN IV: HƯỚNG DẪN KÍCH HOẠT AUTO-RUN TRÊN NỀN TẢNG WEB AI LIVING

1. **Khởi động môi trường:** Đưa toàn bộ file kịch bản này vào thư mục `/scenarios/living_suite_final.json` của Web AI Living Server.
2. **Kích hoạt Master AI Orchestrator:** Chạy lệnh kiểm thử tự động:
   ```bash
   npm run simulate:living -- --suite=all --record-metrics --auto-patch=true --render-mode=webgpu-ultra
   ```
3. **Theo dõi Log Tiến Hóa:** Hệ thống sẽ tự động xuất video rendered 3D từng kịch bản kèm dashboard chấm điểm thời gian thực, tự biên dịch lại file weights nếu điểm của bất kỳ Agent nào rơi xuống dưới 85 điểm.
# Renderer, ground và sinh hoạt

Chỉ Three.js/WebGL; giữ tọa độ XZ, navigation, canvas textures/icon. Không phục hồi bản đồ/nhân vật SVG hoặc fallback 2D. Module chính ở `components/city/three`, `lib/city`; tổng quan ở [ARCHITECTURE](ARCHITECTURE.md).

## Ground và camera

Một hệ10 world units/m; chiều cao người tham chiếu khoảng 17,5 unit, xe hơi dài44 unit. Giữ tỷ lệ model gốc, envelope clip và footprint. Renderer/nav dùng cùng building/tree/street-prop geometry; actor/props đặt theo `groundElevation`. WalkDirector xử lý route, swept collision, personal space và nhường xe. Tag/Pet directors chỉ cấp goal, không teleport hoặc bỏ collision vì timeout.

Camera mặc định ưu tiên đời sống mặt đường, thấy cả cặp/xe/thú trên portrait. Focus nhà/vườn dùng aspect và segment clearance, có fallback nhìn từ trên. Ground có thể dừng khi projection đã báo đến; không dùng label/location thay kiểm vị trí thực. LOD/pause/poll phải giữ liên tục; không đổi appearance theo frame.

G0 giới hạn render target thành phố eco1M/balanced2M/sharp6M pixel, đồng thời giữ capDPR1/1,75/2,5 (balanced dưới 700px cap1,5). Resize/DPR/preset tính lại budget; DOM tên/thoại giữ độ nét CSS. Phím mũi tên chỉ điều khiển khi canvas có focus, không bắt phím chat. `prefers-reduced-motion` tắt camera tự theo và damping; chọn cư dân/nút Theo chỉ frame một lần, đổi preference có hiệu lực ngay và không pause clock. Mark `xom-city-start-to-first-frame` và `data-first-frame-ms` đo first render sau khi dựng scene, không phải toàn bộ asset/pixel đã được GPU trình bày.

Pause chỉ xác nhận từ `{ok:true}` rồi đọc lại snapshot; 403 hướng về tài khoản owner,409 refresh revision để người dùng kiểm tra,5xx/network/ACK lỗi giữ thông báo và không tự retry write. Poll thành công không xóa lỗi điều khiển. Chat giữ focus/bản nháp khi lỗi hoặc đang gửi, không giành focus nếu đã chuyển sang nút khác; response thiếu reply không được nhận là thành công.

| Hành vi | Hợp đồng |
|---|---|
| Đi/chạy | Walk16 unit/s; run/tag tối đa28, cùng swept navigation. Không cam kết mọi chỗ hết kẹt trong20s. |
| Tag | Chỉ ghép người đã chọn tag gần Công viên/Sân thể thao, line of sight; giữ cặp qua poll. Đuổi28/chạy20 unit/s, đổi vai khi ground≤13,6 và không vật cản; miễn bắt1,6s và tách thêm3 unit trước bắt lại. Pause/đổi activity/mất actor hủy hoặc đóng băng đúng trạng thái. Không ghi reward/ký ức từ game render. |
| Cycle | Tối đa22 unit/s, tăng tốc12 unit/s²; disc toàn xe/người9,2 thay clearance đi bộ4,8. Đứng chật thì đi ra chỗ thoáng trước mount, không teleport. Pedal/bánh theo quãng đường, pause giữ rig; giữ xe đến arrival ground rồi mới xuống/hiện props mới. Đã có contact tay lái/bàn đạp/yên; chưa tire physics, lean/fall hoặc foot locking trên địa hình. |
| Pet | `living.petOwners` additive; legacy mặc định An–Cún/Chi–Mướp khi thiếu trường, tôn trọng unassign, không gán sẻ. Walk-pet chỉ người đi bộ, thú theo ground từ vị trí thật; người chờ khi xa>40, đi tiếp khi mọi thú<25 unit. Cancel pending thú bị ngắt, không thưởng hoạt động chưa xong. Chưa leash/contact với thú đầy đủ; quyền hoàn tất không suy từ pet-follow. |
| Nhà | 60 cửa từ building footprints, ID/địa chỉ additive; giữ custom/retired/home cũ. Crowd về cửa khi nghỉ, nhiều người giữ điểm tách nhau; projection vẫn Khu dân cư. Chưa indoor routing hoặc authoritative occupancy. |

Tag/vai/đường đi/pet-follow là trạng thái **viewer**. Backend completion vẫn theo simtime+plan matching; chưa chứng nhận arrival/physical meeting nhiều viewer. Đồ thị nhiều làn, bus/tram boarding và indoor còn ở [ROADMAP](../ROADMAP.md).

Đoạn trên mô tả chế độ mặc định. Local opt-in GND2 `?ground=shared` chỉ sample server frames; GND3 active bổ sung caption emitted ở đúng parent/time, Talk/Listen không sửa root và ACK không ghi memory. Authority/receipt/giới hạn ở [ARCHITECTURE](ARCHITECTURE.md), không đổi reward namespace của mặc định hoặc tự bật production.

## Ngân sách render và khả năng thao tác

City/OSM ngừng GPU draws khi dialog mở; IntersectionObserver cũng ngừng vẽ canvas bị cuộn khỏi vùng nhìn, Page Visibility xử lý tab nền. Polling, scheduler và simulation clock tiếp tục theo hợp đồng cũ. Khi quay lại, giữ canvas/tài nguyên và không trừ thời gian đọc phụ đề cho quãng bị che. OSM là cảnh tĩnh, chỉ vẽ lại khi camera/viewport đổi; phải nghe OrbitControls `change`, vì wheel có thể cập nhật camera ngay trước frame kế tiếp.

Camera, focus và tầng nội thất đọc từ ref, không dựng lại WebGL/tải lại model mỗi lần bấm; địa điểm mới được đưa vào vùng nhìn sau khi dialog mở. Room dùng cùng pixel/shadow budget theo quality; bỏ preserveDrawingBuffer. Studio giới hạn timeline React và render30Hz, kết thúc120s thì dừng tick; viewport/DPR tính lại pixel budget và reduced-motion bỏ damping/chuyển cảnh camera. Studio/phòng có context-loss/retry, dispose idempotent. Gallery model tĩnh vẫn zoom/đổi góc khi animation dừng. GPU/FPS/pin/nhiệt trên thiết bị thật vẫn cần đo riêng.

Bố cục dùng `dvh`/safe-area cho điện thoại, điều khiển ngang thấp giữ trong viewport. Bubble áp đúng width đã layout, không lấy width đang co làm trần mới; chừa cột nút camera trên portrait. Nhãn nguồn và chữ phụ gallery đủ tương phản trong fixture đã đo. `qa-ui-review.py` dùng axe-core4.11.0 được pin SHA, chỉ trong test; không thêm thư viện vào bundle sản phẩm. Zero automated violations không là chứng nhận accessibility hoặc thay review thị giác/keyboard.

Tài liệu kỹ thuật đã đối chiếu: [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API), [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). Giữ WebGL hiện tại cho custom crowd skin/shader; [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)/TSL có fallback WebGL2 nhưng cần study tương thích và đo GPU trước chuyển renderer theo ROADMAP.

## Rigs, tên và thoại

Core/near NPC và crowd dùng cùng approved skin/palette theo [ASSETS](ASSETS.md); crowd nội suy8 pose GPU, picker CPU theo cùng pose,≤ 8 skeletal controllers. Renderer người ghép procedural cũ đã bỏ. Reset base pose trước offset pedal/exercise; clip không key mọi limb không được tích lũy xoay. Pause giữ transform. Đạo cụ theo tay/step thật, không tồn tại sau actor đổi activity; contact IK tay và chân đạp xe đã có; chưa inventory, finger contact hay foot IK trên bậc/nền đầy đủ.

Nội thất dùng cùng5supplied rig/wardrobe, tối đa8controller **riêng canvas phòng**;25nhãn hoạt động, đạo cụ bám surface. Sleep nay xoay/fít actual skin trên2nệm; xem tivi có2chỗ sofa, rạp8ghế, ăn/nhậu8ghế đối diện cùng bàn. Tủ lạnh có cửa mở, TV/rạp có màn hình hoạt cảnh local minh họa; phố đi bộ là patio mở. Không có video stream hoặc inventory tự cấp. Sức chứa giường/sofa giới hạn số người được vẽ, không xếp nhiều người trùng một chỗ. Đây vẫn là projection theo địa điểm, chưa floor/household ownership hoặc physical completion của shared ground; tầng trên chỉ kiến trúc. Native book/lamp/shelf/plant hỗ trợ tải chậm. Palette batch chỉ gom vật tĩnh, giữ cửa/cabin độc lập; world/clock offset không dựng lại WebGL. Focus không đổi chỗ nhóm nhỏ; remount dọn GPU và xóa telemetry cũ. Canvas phố có thể vẫn chạy sau panel, budget phòng không là budget toàn ứng dụng. [Bằng chứng buổi tối](validation/evening-life-2026-11-04.json), [nền tảng nội thất](validation/interior-native-2026-11-04.json). GPU/pin/nhiệt/soak và authenticated QA còn chờ.

WorldOverlays là DOM: pill tên compact, ellipsis/title, giới hạn nhãn gần và ưu tiên selected/speaking; kiểm occlusion và viewport. Bubble giữ đủ text, safe insets theo mobile/HUD, badge nguồn riêng. ACK đọc bắt đầu sau DOM commit, không lúc gửi status. Thời gian đọc còn viewer-local; poll/frame trễ không được làm mất lượt. Hội thoại và quyền biết ở [LEARNING](LEARNING.md).

Phong cách phố Việt Nam thu nhỏ, màu kem/xanh/san hô/vàng; mặt và đạo cụ đọc được ở cự ly theo dõi. Props theo chức năng và ngoài lối đi. Không kéo xa camera/phóng to actor hoặc blur để che hình học. Đổi quality/selection/panel không làm tăng tài nguyên vô hạn. WebGL lỗi có **Thử lại 3D**; wardrobe/OSM/gallery cũng phải thu hồi context, observer, mixers và GPU resources.

## Vườn cây

5 khóm/30 cây dùng ID/footprint của `flowers` street props; precompute sinh `data/city/garden-plots.json`. `living.flora` optional giữ growthSimMs/anchoredSimMs/moisture; đọc legacy không ghi DB. Các phase sprout2/young4/bud3/bloom3/rest2 **growth days**, chu kỳ14. Moisture giảm10 điểm/ngày mô phỏng, growth rate0,25+0,75×moisture/100 được tích phân theo lịch sử; tưới không tăng tuổi hồi tố.

POSTcare chỉ flora, owner/origin/schema/body2KiB/revisionCAS; paused/stale/invalid version từ chối và giữ nguyên. Tưới khi đủ nước là no-op. Không tạo reward/ký ức/skill, mưa lịch sử, harvest/inventory hoặc NPC care giả. Renderer hai batch,5 phase và moisture buckets trong footprint18×12 cũ; paused không upload, world đổi phải clear cache, dispose idempotent. Chưa hoàn tất toàn bộ Phase E.

## Âm thanh

WebAudio gió/mưa/chim mô phỏng, mặc định off, không AudioContext trước gesture. Pause/hidden/OSM suspend; off/unmount đóng context và thu hồi timers/sources; resume chờ không vượt pause mới. Không micro/TTS/file ngoài/API trả phí, không lưu opt-in qua F5. Unsupported có thông báo; browser đo signal không chứng minh chất lượng nghe trên điện thoại.

## Bằng chứng và chạy lại

[TESTING](TESTING.md) liệt kê unit/QA harness; screenshots/metrics ở `docs/screenshots/{social,cycle,tag,three-only-pets,homes,gardens,soundscape}`.5 phase/care/camera/pause/errors/320px và các hồi quy đã có preview desktop/mobile; persistence được kiểm riêng compiledD1, browser mutations có thể mocked. Không lấy số frame SwiftShader hoặc synthetic240 làm hardware FPS/density live. GPU/soak, physical/finger/foot contact đầy đủ, inventory và rollout timeline chung lên production còn ở [ROADMAP](../ROADMAP.md).

Review bổ sung theo skill MIT [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md) và [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md): transient refs cho runtime, memo hóa scenario frame theo id/time, giữ lazy import renderer, focus/labels/tương phản, reduced-motion, safe-area và wheel redraw. Đây là tài liệu tham khảo được đọc trong review, không plugin/runtime dependency mới hoặc chứng nhận toàn bộ guideline.

# Phase E — vườn cây có trạng thái

Source đã có 5 khóm hoa/30 cây ở Sân chung, Vườn nhỏ, Công viên, Quảng trường và Phố đi bộ. Vào **Địa điểm → Vườn cây** để xem giai đoạn/độ ẩm, tưới hoặc dùng Xem cây đưa camera tới đúng cụm 3D. Chọn một địa điểm chỉ hiện cây ở nơi đó.

## Tăng trưởng và lưu trạng thái

Năm giai đoạn: nảy mầm, lớn lên, ra nụ, nở hoa, nghỉ dưỡng. Chu kỳ là 14 ngày tăng trưởng quy ước; đất khô làm chậm tốc độ. Độ ẩm giảm 10 điểm mỗi ngày mô phỏng, tốc độ tăng trưởng từ 0,25 đến 1 lần. Hàm tích phân xét cả quãng thời gian độ ẩm giảm, không áp độ ẩm hiện tại cho toàn bộ quá khứ. Tưới chỉ bổ sung nước và chốt anchor mới, không tạo tăng trưởng hồi tố. Đây là luật mô phỏng đơn giản, không phải mô hình sinh học.

LivingState.flora optional giữ version1/plots, mỗi record có growthSimMs/anchoredSimMs/moisture. Snapshot cũ dùng tuổi khởi đầu theo seed của khóm và 70% độ ẩm, không tự ghi khi GET/render. Tuổi đầu là bối cảnh biên tập, không phải việc trồng của một cư dân. Record chỉ lưu khi chăm cây; khóm retired, field bổ sung và metadata không liên quan được giữ. Schema lạ/lỗi hoặc thời gian lùi trước anchor bị từ chối, không reset cây. Không migration mới.

POST /api/living/flora dùng owner guard hiện có, origin, JSON/schema strict, stream UTF-8 tối đa2KiB và world revision CAS. Paused không nhận tưới; khóm đủ ẩm là no-op. Hai request cạnh tranh chỉ một thắng. Chăm cây không ghi actor reward, skill, memory, experience hoặc thay policy/home/petOwners/plan. Không nói một nhân vật đã tới và tưới nếu chưa có bằng chứng ground.

## Renderer và navigation

Garden catalog sinh offline từ đúng 5 streetProps kind=flowers. Không thêm hoặc dời obstacle: mọi phase ở trong footprint18×12 cũ, floor đọc cùng groundElevation. Vỏ bồn, đất và thân/lá/búp nối trên nền, hoa đổi hình/màu theo phase và độ ẩm. Renderer chỉ có hai InstancedMesh, tối đa3.240 triangles trong kiểm tra; không upload buffer nếu trạng thái hiển thị không đổi, pause đóng băng, unmount dispose hai geometry và một material. World mới không mượn cây cũ nếu dữ liệu mới không đọc được.

Xem cây dùng ray clearance tới camera sau khi tính aspect, khoảng cách đủ lớn trên mobile; fallback nhìn từ trên cao không bị OrbitControls ép nghiêng xuyên nhà. Ray/ID trong dataset chỉ phục vụ kiểm tra, không đưa ra UI. Không phục hồi renderer2D hoặc dùng texture world mới.

## Kiểm chứng

- Môi trường Node24/dependencies/Worker/D1/Chromium/Playwright dùng được; local health200/database ready. Không có native Sites deployment tools.
- Targeted flora suite:5phase×5moisture,2.200matrix/25visual cases, analytic integration/rebase, no past-growth credit, retired/custom/corrupt/clock handling, shared footprints, pause, world replacement và dispose đạt.
- Full50/50 suite/check/lint/build/API D1 đạt. API xác minh quyền/origin/body/schema, watering persist, no-op/stale/CASrace, pause/corrupt/retired/custom metadata và giữ mọi actor/history/policy.
- Browser desktop/mobile đã đạt5phase, tưới, camera full-framed, pause,409/bad-response handling và320px. Mutation trong browser dùng fixture/pure model; persistence được kiểm riêng bằng compiled Worker/D1 thật local. Ảnh/metrics ở screenshots/gardens là preview Chromium SwiftShader, không production/GPU thật.
- Hồi quy social6/poll/F5, home/profile/camera, cycle full-body/pause/dismount, pet/wardrobe/OSM/context retry/hide/resize/no2D đều đạt desktop/mobile trên cùng fresh Worker5310. Không JavaScript error. Ảnh preview đã gửi; metrics nằm cạnh ảnh.

## Còn lại của Phase E

Chưa thêm loài/habitat mới, lifecycle cây lớn/cây ăn quả, mùa vụ, thu hoạch/inventory, tự tưới từ rain history hoặc cấp reward từ animation gardening. NPC chăm cây và LocalSceneContext cần đi cùng completion/ground contract; không coi catalog, projection hoặc hết giờ kế hoạch là bằng chứng đã chứng kiến. Các mục khác trong NEXT_PHASES vẫn là backlog.

# Giai đoạn B — hành động và kế hoạch hậu thoại

Bản source local tiếp nối phaseA; chưa deploy, chưa thay GLB và không thêm migration sau0006. Đây là phần cốt lõi gói3–4, chưa hoàn tất toàn bộ nghiệm thu của gói3–4 hoặc các giai đoạnC/D.

## Hành vi mới

- Schema nhận9loại bước mới: `drink`, `run`, `jump`, `tag`, `cycle`, `exercise`, `walk-pet`, `shop`, `study`. Giá trị cũ giữ nguyên, không viết lại events/migration cũ. `Step.kind` dùng enum chung; renderer robot2D ánh xạ về motion đang có.
- Có9scenario tương ứng để bộ chọn hành động thực sự có thể chọn, không chỉ mở enum. Run/tag/cycle/walk-pet có2đích hoạt động ngắn thay vì một bước đứng nguyên tại một nơi. Với cycle, nhân vật vẫn đi bộ giữa đích và tập đạp trên xe tại chỗ khi dừng.
- GLB chỉ yêu cầu những clip đã kiểm tra có thật: walk/sprint/drive/holding/emote/idle. Run/tag ánh xạ sprint; nhảy dùng idle cộng offsetY; thể dục/đạpxe/uốngnước bổ sung node rotations. Study giữ sách, drink cầm cốc, shop cầm túi. Bike tập được dựng bằng primitive, không mua/tải asset.
- Nhân vật instanced có chuyển động chạy/thể dục tại chỗ, root nhảy, đạo cụ sách/cốc/túi và bike tập. 2Dfallback có action classes, pause/reduced-motion. Đây là chuyển động thủ tục, không phải9clip motion-capture mới.
- WalkDirector cho run/tag tốc độ tối đa28worldunit/giây, vẫn dùng sweep footprint và personal space; tăng bán kính tìm hàng xóm phù hợp. Các loại đi bộ giữ16worldunit/giây.

## Chuỗi sau cuộc gặp

- Kế hoạch gặp gồm5bước cùng địa điểm: tiến lại120s → chào30s → trao đổi60s → thống nhất30s → hoạt động chung120s (tổng360s mô phỏng).
- Chợ/siêu thị chọn đồ; thư viện/trường/lớp học và ghi chú; công viên/sânthểthao chạy nhẹ; nơi khác uống nước và thu dọn.
- Người đồng hành có cùng chuỗi; thời điểm bắt đầu và nguồn `rules` lưu trong snapshot. Đây là kế hoạch mô phỏng. Renderer vẫn kiểm tra người đã đến/gần nhau trước khi phát lời thoại.
- Bộ lập kế hoạch không thay plan vẫn đang trong bước hậu thoại. Kết quả học của cuộc gặp gắn với scenariofriendship và chờ hết chuỗi, không nhận thưởng cho công việc ban đầu chưa thực hiện.
- Routine cư dân đã có các chuyến việc riêng. Khi hết plan và cư dân đang đứng trong hoạt động social/play ngoài trời, micro-action đổi theo cửa sổ20s mô phỏng. Ngủ/ngồi/ăn/đọc/làmviệc có lý do được giữ nguyên, không ép phải di chuyển.

## Gặp gỡ riêng của NPC

- `scheduleResidentSocial` là hàm thuần, tối đa8cặp/lần. Dựa trên nhu cầu xã hội riêng, khoảng cách, nơi đến công khai, trạng thái đang đi/bận và cooldown cặp. Không thay lượt hội thoại củaAn.
- Mỗi lần đã qua>=20s mô phỏng mới xét tiếp. Pulse viewer gọi10s thực, có khóa chống requestchồng; scheduledworker đã opt-in cũng gọi cùng hàm. Nếu không có viewer/scheduler đang chạy thì không có tiến trình tự chạy ngầm. Với tốc độ mô phỏng cao, mỗi pulse xét trạng thái hiện tại, không bù toàn bộ các cửa sổ bị bỏ qua.
- Trạng thái lưu trong `living.socialSchedule`; nhu cầu từng người trong `learning[id].socialNeed`. CASrevision ngăn hai request ghi đè nhau. Phát sinh409 thì caller thử ở pulse sau, không resetDB.
- Familiarity tăng1 và socialNeed giảm25 khi kế hoạch360s mô phỏng còn nguyên và đã kết thúc. Plan bị thay/hủy không có kết quả; retry không cộng hai lần. Đây là kết quả theo kế hoạch mô phỏng, chưa có xác nhận hoàn thành dựa trên vị trí vật lý từ server.
- Pairing không cắt ngang giờ làm/ngủ/ăn, không ép người đang đi nói chuyện. Áp dụng tối đa240NPC đã có trong snapshot, không tạo dân số giả.

## Kiểm thử và giới hạn

`npm run test:phase-b` kiểm tra enum mới với eventschema hợp lệ,5bước/cùngđịađiểm, plan không bị ghi đè ở bước hậu thoại, nguồn không mutate, clipcompatibility trênGLB thật, proceduraljump/pedal/pause, matching với projectionroutine thật, retry/pause/hủy/no-double-credit. Kiểm tra geometry/clip dùng material giả trong loader để không cần browserimage decoder; không phải kiểm chứng texture hoặc hình ảnh.

Toàn bộ unit suite cũ (life/events/social/walkability/personalspace/actualGLB…) đã qua. TypeScript/lint/build và kiểm traAPIlocal đều đạt, được lưu ở `docs/validation/phase-b-*` với kết quả thực tế.

APIlocal chạy worker đãbuild với D1 riêng: ownerGET/POST, schema, origin, giới hạn16KiB/20batchphút, JSONLreadback, retention, pulse ghi kế hoạch NPC, retry không ghi trùng và pause409 đều đạt. Không truy cập production; test chặn lượt tick đã có để không gọi model/contextprovider. Chạy lại sau build bằng `npm run test:api:local`.

Chưa có Chromium trong runtime để browserQA; chưa đo điện thoại,150người/80xe hay phiên30phút thực. Các điểm chưa xong:

- Tag có chạy/sprint và tuyến ngắn, chưa có bộ đuổi bắt theo cặp hay cơ chế đổi vai.
- Cycle có xe và chân đạp tại chỗ; chưa có điều khiển xe đạp trên đường/va chạm theo toàn thân xe.
- Walk-pet có bước đi bộ, chưa gắn quyền sở hữu và đồng bộ thú đi theo chủ.
- Chưa đảm bảo mọi cư dân đều tránh kẹt vật lý trong20s; không đổi label thành bằng chứng đã hết kẹt.
- Socialhistory50 của phaseA vẫn là client-session-local. Chưa durable dialoguepool/critic/circuitbreaker/A-BQwen3/Gemma3.
- Giai đoạnC(density/household/trafficgraph/snapshot) vàD(LinUCB/skillgates) chưa phát hành. Code thử trước đó được tách ra, không kích hoạt trong runtime này.

## Dùng bản này

Cài dependency theo README, chạy `npm run check`, `npm run lint`, `npm run test:unit`, `npm run build`. Local dùng `node scripts/setup-local.mjs`; vẫn cần migration0006 nếu nâng từ bản chưa có telemetry. BảnB không cần migrationmới. Không deploy/reset dữ liệu live khi mởZIP. Mở `?debug=1` để xuất log sau test thiết bị thật.

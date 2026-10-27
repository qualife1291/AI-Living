# Chỉ dùng 3D và đi dạo cùng thú — 27/10/2026

## Gỡ renderer 2D

Đã xóa hai bản đồ SVG `UrbanMap`/`CityMap`, các renderer Robot/Animal/Vehicle, workshop SVG, `BlockCharacter`, các mẫu công trình/xe/OSM SVG, traffic và helper camera/bubble chỉ dùng cho chúng. Dashboard cũ chuyển hướng về `/`; không mang theo bản đồ cũ. Đã gỡ nhánh chọn renderer, fallback 2D, CSS không còn dùng và mười ảnh QA SVG cũ. Manifest của ZIP bàn giao cũ cũng được gỡ vì không còn mô tả checkout hiện tại; công cụ đóng gói sẽ sinh manifest mới khi cần.

Tủ đồ dùng `AppearancePreview` WebGL, tái sử dụng hình học nhân vật 3D và appearance hiện có. Preview chỉ vẽ khi đổi lựa chọn hoặc kích thước, không chạy thêm vòng animation. Khi đóng bảng, observer, geometry, material và WebGL context được thu hồi. Khi không mở được WebGL hoặc mất context, thành phố/OSM báo lỗi rõ ràng và có nút **Thử lại 3D**. Dữ liệu snapshot và các bảng thông tin vẫn được giữ.

Những phần còn cần thiết được giữ: tọa độ XZ và đường đi/phép chiếu, D1/lịch sử/ký ức, OSM dùng để dựng 3D, canvas tạo texture chữ/bóng cho Three.js, favicon và icon giao diện. Chúng không phải renderer thế giới 2D. Tài liệu phát hành cũ được giữ như lịch sử, có chỉ dẫn sang tài liệu này; không được dùng chúng để khôi phục 2D.

## Phase B tiếp nối: người chăm sóc và đi dạo cùng thú

`living.petOwners` là metadata trong snapshot, không cần migration. Mô phỏng mặc định An chăm Cún, Chi chăm Mướp; với snapshot cũ chưa có trường này, phép đọc áp dụng cùng mặc định mà không sửa DB. Bản ghi đã phân công hoặc đã bỏ phân công được tôn trọng. Đàn sẻ không được phân công cho một người.

Trong bảng Cư dân, **Người chăm sóc thú cưng** cho phép chọn cư dân hoặc bỏ phân công. `POST /api/living/pets` kiểm tra owner guard của Worker, origin, JSON/schema, body stream tối đa2KiB, ID cư dân và revision CAS. Lỗi409 không ghi đè thay đổi của người khác. Chỉ cập nhật metadata phân công; không sửa ký ức, kế hoạch hoặc animal policy đã học.

Khi người chăm sóc đang chọn `walk-pet` và đi bộ trong tập actor hiển thị, Cún/Mướp yêu cầu đích ground ở phía sau người đó. Cả người và thú vẫn qua WalkDirector: tránh công trình/cây/đạo cụ, xe và khoảng cách cá nhân. Thú bắt đầu từ vị trí thật; nếu quá xa thì người chờ (>40unit), chỉ tiếp tục khi tất cả thú theo mình tới gần (<25unit). Hai thú cùng một người có hai bên đi riêng. Bị chặn thì dừng/nhường, không teleport hoặc bỏ collision để kéo thú về.

Pause đóng băng bước di chuyển. Đổi người chăm sóc, người ngừng `walk-pet` hoặc ra khỏi tập actor hiển thị thì thú trở về lịch trình/policy cũ bằng đường đi liên tục. Lượt đi dạo ngắt một pending tự tìm ăn/chơi: backend đánh dấu cancelled, không cộng reward hay trials cho hoạt động chưa hoàn tất; không tạo reward mới cho đi dạo. Lịch sử học trước đó được giữ.

Đây là mô phỏng theo luật. Chưa có dây dắt/IK, vật lý thân thú toàn phần hoặc đồng bộ occupancy giữa nhiều viewer. Backend vẫn chưa xác nhận hoàn thành hoạt động của người bằng vị trí ground thực; việc học của người theo kế hoạch vẫn có giới hạn đã ghi từ trước. Trường hợp nhiều vật cản có thể phải chờ lâu; không cam kết leash cứng hoặc mọi tình huống hết kẹt trong20giây. Không có API tính phí, deployment, reset DB hoặc đổi lịch production.

## Kiểm chứng

- Full32lệnh unit suite, TypeScript, lint và build đạt. Test pet-walk chạy1600frame: người chờ100frame cho thú tới, đi200unit, không vi phạm static footprint/personal space trong mẫu thử; khoảng cách sau khi hội đủ điều kiện tối đa24,507unit. Có test first spawn, pause/cancel/unassign và không thưởng pending bị ngắt.
- Worker/D1 riêng: owner guard, schema, byte limit, origin, phân công/bỏ phân công, revision conflict, hai request cạnh tranh và giữ nguyên người/ký ức/animal learning đều đạt. `npm run test:api:local` chạy lại được sau build, không truy cập production.
- Browser: `QA_BASE=http://127.0.0.1:<port> python3 scripts/qa-three-only-pets.py` kiểm tra desktop/mobile, pet follow, pause, dropdown phân công, wardrobe3D, OSM3D, context loss/retry, WebGL ban đầu không có rồi bật lại; không có renderer2D hoặc lỗi JavaScript. UI mutation dùng fixture/mock, persistence được kiểm tra riêng trên D1 thật local.
- Ảnh ở `docs/screenshots/three-only-pets` là ảnh chụp Chromium SwiftShader trên dữ liệu thử local, không phải production hoặc benchmark điện thoại thật. Kết quả cuối được ghi ở metrics.json và MEMORY_LONG.md.

## Phần tiếp theo

Phase B còn xe đạp di chuyển với collision toàn thân; hỗ trợ dây/IK và occupancy chung cần phạm vi riêng. Phase C còn density/household/traffic graph; phase D còn LinUCB/skill gates; các phần dialogue history/model A-B cũng chưa hoàn tất. Phải kiểm thử từng phần rồi push checkpoint lên work, không đổi nhãn backlog thành hoàn thành. Main và production chưa thay đổi trong đợt này.

QA bản camera cuối ghi nhận desktop87frame/mobile160frame trong12giây, cả hai đều đạt điều kiện thú nằm trong khung >80%frame. Camera bám cặp người/thú và HUD ghi tên thú đang cùng đi. Có thêm1200frame kiểm thử hai thú cùng một người, đổi thứ tự input, khoảng cách và đi hết đường. Kiểm tra hồi quy hội thoại vẫn đủ6lượt trên desktop/mobile sau đợt dọn CSS; xem metrics/ảnh social. Các số frame là mẫu SwiftShader trong môi trường này, không phải FPS thiết bị thật.

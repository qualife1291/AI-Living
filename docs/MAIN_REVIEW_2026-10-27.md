# Review main sau đồ họa Gemini và phase A/B

Mốc đầu vào: `a5b7c5a` từ GitHub `main`, ngày 27/10/2026. Đã đọc code và các báo cáo FIXES_PHASE_A, PHASE_B_ACTIONS, GRAPHICS_3D_PACK. ZIP đính kèm vượt giới hạn tải 32 MiB; review sử dụng code đã được chủ dự án push lên main, không tuyên bố đã giải nén ZIP. Kết quả hiện hành được ghi thêm bên dưới khi kiểm thử hoàn tất.

## Cấu trúc và stack

- React 19 + TypeScript strict phù hợp UI, hồ sơ, timeline và công cụ debug. Three.js quản lý animation/instancing trực tiếp, tránh đưa cập nhật từng frame vào cây React của cả thành phố.
- Vinext/Vite biên dịch API tương thích App Router thành Worker; Cloudflare D1 + Drizzle lưu trạng thái. Đây không phải Next server Node chạy trên production. Giữ adapter đang hoạt động, pin phiên bản và kiểm tra route thật; thay toàn bộ framework chưa có lợi ích được đo để bù rủi ro migration.
- `lib/living` giữ luật/kế hoạch/học, `lib/city` giữ đường đi/footprint/camera, `components/city/three` giữ presentation, `components/studio` giữ kịch bản có thể tua. Cảnh studio không ghi thế giới live.
- Các file runtime lớn nên tiếp tục tách thành môi trường, actor presentation, tài nguyên và điều khiển camera theo từng thay đổi có regression. Không chuyển sang Unity/Godot hoặc thêm thư viện state/physics chỉ để đổi tên stack.
- Node tối thiểu được nâng lên 22.18 để khớp việc chạy trực tiếp module TypeScript trong test; CI dùng Node 24. CI đọc repo, chạy check/lint/unit/asset/build, không có quyền tự push/deploy.

## Lỗi tìm thấy và bản sửa

| Mức | Lỗi có bằng chứng trong code | Bản sửa |
| --- | --- | --- |
| P1 | `shop` yêu cầu `bag`, `simpleProp` có nhánh dựng túi nhưng whitelist không chứa `bag`, gây throw trong render | Thêm công thức/binding và chạy thực các hoạt động có đạo cụ |
| P1 | Procedural rotation cộng thêm mỗi lần draw dù presentation time không đổi | Pose báo có cập nhật; chỉ cộng offset một lần trên pose mới; kiểm tra 30 lần timestamp giống nhau |
| P1 | Actor biến mất nhưng đạo cụ/xe tập vẫn visible | Ẩn cả ba theo cùng vòng đời nhân vật |
| P1 | HTTP 200 HTML đăng nhập có thể bị coi là ACK, xóa log chưa lưu | Chỉ xóa khi phản hồi JSON `ok:true`; kiểm tra HTML 200 và JSON từ chối |
| P1 | Migration mới 0006 có hai DDL trong một chunk; thiếu snapshot và index trong schema Drizzle | Tách statement, giữ SQL nghiệp vụ, thêm snapshot/index; kiểm tra bằng migrator thật và D1 local. Không sửa migration 0–5 |
| P2 | Studio vẫn vẽ GPU liên tục khi đã pause và camera đứng yên | Chỉ vẽ khi timeline/camera/viewport đổi |
| P2 | Delta playback bị cắt 100ms khiến cảnh chạy chậm hơn thời gian thực khi FPS thấp | Dùng elapsed thật, reset anchor khi đổi visibility |
| P2 | Tải model xong sau unmount hoặc WebGL constructor lỗi có thể giữ tài nguyên | Abort kiểm tra sau preload, dispose thư viện, chặn cập nhật state sau unmount |
| P2 | Mọi preset dùng shadow 2048 và vùng 190m, tăng tải trên điện thoại | Eco dùng bóng tiếp xúc; balanced 512 mobile/1024 desktop; sharp 2048; vùng shadow theo nhân vật 36m |
| P2 | Lỗi render một frame làm vòng lặp hỏng, không kích hoạt fallback | Dừng vòng lỗi, ghi loại lỗi ngắn và chuyển 2D |
| P2 | Ảnh AI thay vào đường dẫn được tài liệu cũ dùng làm bằng chứng browser QA | Giữ ảnh AI ở `public/renders-3d`; khôi phục ảnh chụp thật từ Git, chụp lại bản tích hợp |

## Phạm vi còn thiếu trong log bàn giao

Tag theo cặp/đổi vai, xe đạp di chuyển có collision toàn thân, thú theo chủ, household/density/traffic graph, LinUCB/skill gates, lịch sử hội thoại durable và model A/B là feature backlog đã được tác giả phase B ghi rõ. Chưa có bằng chứng để đánh dấu các phần này đã hoàn tất. Full body/finger IK, vật liệu vi mô/DOF, điện thoại/GPU thật và soak 30 phút/24 giờ cũng cần đợt triển khai và đo riêng. Không đổi các nhãn đó thành “đã fix” sau test logic.

## Bản vá dependency

Audit production ban đầu báo 23 advisory (3 critical, 7 high, 9 moderate, 4 low). Đây là kết quả dependency graph, không phải khẳng định mọi advisory đều có đường khai thác trên Worker đang chạy. Đang cập nhật bản vá tương thích cho Next/eslint config, Zod và dependency chuyển tiếp; giữ lockfile, minimum release age và kiểm tra build/API sau cập nhật. Kết quả audit cuối được bổ sung sau khi cài xong.

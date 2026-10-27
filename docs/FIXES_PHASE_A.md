# Bản sửa nền tảng quan sát và tuyến đường — 27/10/2026

Báo cáo mốc phaseA. Bản tiếp nối và trạng thái hiện tại: [PHASE_B_ACTIONS.md](PHASE_B_ACTIONS.md).

Đây là bản sửa **một phần giai đoạn A**, không phải hoàn tất gói 0–8. Chưa deploy, chưa sửa dữ liệu production, chưa thay asset GLB.

## Thay đổi có trong source

- Client ring buffer 512 sự kiện, cooldown 5 giây theo loại/actor; flush tối đa32 log mỗi15 giây, timeout5 giây, chỉ bỏ log đã được server ACK. `longtask`, frame>50ms, route miss/route>8ms, blocked>=5giây, tọa độ không hữu hạn, vi phạm clearance và WebGL lost. p95 panel tính từ tối đa1800 frame gần nhất, không lấy từ các frame chậm riêng lẻ. Reset mốc frame khi tab đổi visibility.
- `?debug=1`: xem số log chờ, p95 frame, tải JSONL log chưa gửi hoặc log đã lưu. Đây là dữ liệu đo từ phiên của bạn, không phải cam kết hiệu năng.
- `POST /api/diagnostics`: body đọc stream giới hạn16KiB, tối đa32 sự kiện/batch; allowlist loại sự kiện và trường dữ liệu ngắn. Admission SQL nguyên tử giới hạn20 batch/phút cho toàn site, kể cả nhiều worker. Không log nội dung hội thoại, credentials hay toàn snapshot.
- `client_logs` lưu mỗi batch. Xóa dữ liệu cũ hơn7 ngày khi POST/GET; khi site hoàn toàn không có request thì chưa có cron dọn riêng. GET xuất tối đa500 batch mới nhất và500 tick records có error trong7 ngày. Endpoint cả đọc/ghi đi qua `adminAllowed` ở worker; GET thêm bảo vệ chủ sở hữu riêng, không phụ thuộc việc các GET khác được public.
- Migration append-only `0006_client_logs.sql`, thêm schema Drizzle/journal và setup-local; không sửa migration0–5.
- Audit tick request: schema/speaker rejection,409/duplicate, tổng thời gian xử lý, exception/TimeoutError vào `tick_runs.error`. Đây là thời gian request tick, **chưa phải đo riêng latency của tiến trình model local**. Không gọi lỗi DB là lỗi model.
- Bảng1089 route giữa33 địa điểm, tạo lại bằng `npm run prebuild` hoặc tự động trước `npm run build`. Kiểm tra swept segment của route khi dùng để không lấy đường cũ xuyên chướng ngại. Điểm actor ngoài bảng vẫn dùng A*. Cache LRU1024 thay FIFO256; clone đường trả về tránh caller sửa cache.
- Tách phép kiểm tra nền sang `walk-ground.ts`. Giữ nguyên cơ chế swept collision, reservations và side-pass của WalkDirector. Thử chiếu staging/jitter ở lớp hội thoại đã bị loại vì làm nhảy tại điểm đến; **chưa sửa toàn bộ đường hiển thị jitter2D**, không tuyên bố hết xuyên nhà.
- Hội thoại ambient SocialDirector dùng grammar slot theo nhóm địa điểm. Lịch sử50 câu chính xác cho mỗi cặp, thứ tự ID không ảnh hưởng, tối đa256 cặp mỗi director. Số lượt bằng kịch bản gốc, giữ pause/readability/AI provenance. Chỉ là hội thoại theo luật, không phải model AI mới. Lịch sử là client-session-local; chưa chống lặp ngữ nghĩa, chưa durable qua reload, chưa áp dụng cho hội thoại persisted/model.

## Tình trạng các gói

| Gói | Tình trạng |
|---|---|
|0|Một phần: instrumentation, endpoint, retention lazy, export, tick audit; còn HTTP integration/readback, latency riêng model, dead-zone/margin chi tiết|
|1|Một phần: precomputed venue routes, LRU, đo route/stuck; còn worker/budget A*, jitter dùng chung2D, recovery mới và LOD update budget|
|2|Một phần: grammar ambient + exact history50; còn ký ức/thời tiết/quán tính chủ đề, trigram/embedding, history server, dialogue pool race, server guard/circuit breaker/A-B|
|3–4|Chưa triển khai action enum/animation, hậu thoại, ghép cặp nhu cầu và idle policy mới|
|5–6|Chưa tăng mật độ, household assignment, giao thông graph hay motorbike/cycle|
|7|Chưa triển khai vector kỹ năng/giai đoạn/LinUCB|
|8|Chưa tách snapshot/embedding memory/cài llama.cpp; cron hiện có không được cấu hình lại|

## Kiểm thử

- `npm run test:unit`: đạt toàn bộ suite có sẵn, gồm life/events/social28case/walkability8case/personal-space7case/scenario-benchmarks/actualGLB.
- `npm run test:diagnostics`: đạt800câu, history cặp, bounded buffer, cooldown, giữ log khi lỗi, ACK batch.
- SQLite in-memory: migration chạy lại an toàn; SQL admission20/25request; retention delete đạt. Không phải test HTTP hoặc D1production.
- TypeScript/lint/build cuối cùng đều đạt, gồm phần tick records trong JSONL; kết quả ở `validation/`.
- Tại mốcA, HTTP local chưa xác minh hoàn tất: Wrangler ban đầu lỗi `uv_interface_addresses`; thử adapter loopback chỉ trong /tmp, không đưa vào source; HTTP request chưa đọc được phản hồi đáng tin cậy. MốcB đã bổ sung test workerAPIlocal/D1riêng đạt; xem PHASE_B_ACTIONS.md. Chưa có browserend-to-end.
- Chưa browserQA, điện thoại thực, WebGLlost thực,150người/80xe,30phút hay p95frame<33ms. Không dùng benchmark logicCPU làm FPSđiệnthoại.

## Cài bản sửa

Giữ nguyên pnpm lockfile, cài dependency theo README. Chạy `npm run check`, `npm run test:unit`, `npm run test:diagnostics`, `npm run build`. Môi trường local: `node scripts/setup-local.mjs` sau build sẽ áp dụng0006. Production: backup DB rồi áp dụng **chỉ migration0006** bằng cơ chế deployment hiện có; không chạy setup-local trên DBproduction. Giữ owner-private và cấu hình owner hiện có. Nếu chưa áp dụng0006, log upload sẽ lỗi và client giữ buffer giới hạn để retry.

Mở URL app với `?debug=1`; sau phiên test tải log server và log chưa gửi. Dữ liệu server giới hạn7ngày và bản xuất có giới hạn500batch, vì vậy nên xuất sau từng phiên. Panel owner-only trên endpoint; UI debug tự nó không cấp quyền.

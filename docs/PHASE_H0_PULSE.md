# Phase H0 — Nhịp mô phỏng dùng chung

## Hành vi

`POST /api/living/pulse` giữ owner/origin guard và pipeline learning → resident social → narrative tick. Trước pipeline, server đọc cờ pause và expiry nhỏ từ D1; không truyền world/policy JSON về JS cho lượt coalesced. Reservation dùng UPSERT có điều kiện trên `context_cache`, chung giữa Worker isolates/tab, không dùng bộ nhớ process.

Một pulse được nhận giữ lease30s; pulse khác trả200 `{ok:true,coalesced:true}`. Đây là thông báo đã có lượt gần đây/đang chạy, không xác nhận lượt ấy hoàn tất. Client vẫn đọc world theo lịch hiện có. Thành công giữ cooldown9s tính từ lúc nhận, không tính từ lúc xong; một tab10s không bị đổi thành20s. Lỗi HTTP hoặc exception nhả lease cho retry ngay. Worker chết tự hết lease; nonce ngăn lượt cũ nhả lease mới. Pause trả409 cả trong cooldown.

Lease chỉ giảm tải, không thay authority: revision CAS/nonce của world/policy vẫn quyết định ghi, daemon/direct tick/learning giữ đường riêng. Nếu pipeline lâu hơn30s có thể có lượt mới; CAS/idempotency vẫn phải ngăn ghi lặp. Cooldown có thể trì hoãn cập nhật mới tối đa9s; không có scheduler mới hoặc cam kết24/7. Storage lỗi trả lỗi, không chạy pipeline không được admission.

`context_cache` dùng đúng một khóa `internal:living-pulse:v1`, không sửa schema/migration. Không xóa episodes/memories/turns/experiences/visitor_exchanges/tick_runs cũ. Lượt coalesced không thêm audit tick. Lượt được nhận thêm một claim và một completion write, nên đây là giảm khuếch đại theo nhiều viewer, không tuyên bố giảm mọi chi phí cho một viewer.

`GET /api/diagnostics` chỉ SELECT, lọc7ngày. Retention client telemetry vẫn chỉ trong POST được nhận (chính sách đã có), không dùng GET dọn DB. Health gom6schema probes + latest tick vào một D1 batch; world read vẫn như cũ. Thiếu bảng/query lỗi trả503; không có tick không tự coi là DB lỗi.

## Kiểm chứng

51/51suite đạt với4workers (mẫu29,47s khi chạy đồng thời build); TypeScript/lint/build và API Worker/D1 cô lập đạt. Suite D1 mới kiểm20request cạnh tranh chỉ1pipeline/19coalesced, cooldown/cadence, pause, HTTP/exception retry, expiry/nonce và giữ world/history/cache nguồn. CompiledWorker/API kiểm wave12viewer chỉ1pipeline, retry không audit trùng, owner/origin, diagnostics GET không xóa và POST giữ retention; health503 khi thiếu schema,200 sau bổ sung bảng và world nguyên vẹn.

Bằng chứng máy đọc: [pulse-2026-10-28.json](validation/pulse-2026-10-28.json). Không thay renderer/UI nên không chạy lại browser chỉ để xác nhận backend; ảnh flora desktop/mobile ở milestone trước vẫn có phạm vi như cũ. Chưa đo production D1 billing/CPU/load hoặc hardware GPU; không nhận số request giảm trong fixture là SLA. Chưa production readback.

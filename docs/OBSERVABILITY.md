# Theo dõi hệ thống và tiến độ QA

Log có cấu trúc là chẩn đoán vận hành, không phải history thế giới hoặc bằng chứng nhân vật đã học tốt hơn. Không có dịch vụ trả phí, bảng log D1, scheduler, importer hay auto-repair mới.

## Log Worker

`XOM_SYSTEM_LOGS=true` bật custom log; mặc định tắt ở app/Sites. Nhánh QA bật trong `configure-cloudflare-qa.mjs`, giữ Workers Logs và gắn `CF_VERSION_METADATA` để mỗi record có version ID khi runtime cung cấp. Cloudflare deployment/version metadata dùng để đối chiếu Git SHA; push Git không tự chứng minh deployment thành công.

Schema `xom-system-log-v1`: `at`, `event`, `level`, `requestId`, `trigger`, `route`, `method`, optional `version` và các trường allowlist dưới đây. ID do server tạo cho từng invocation, bỏ qua request ID do client gửi. API response có `X-Request-Id` cùng ID với custom log của request. AsyncLocalStorage tách từng request và Cron; không lưu state request trong biến global.

| Event | Đọc như thế nào |
|---|---|
| `http_complete` | status/durationMs của write hoặc HTTP lỗi; 4xx warn, 5xx error. GET/HEAD/OPTIONS thành công không custom-log để giảm poll noise. |
| `http_uncaught` | Lỗi chưa được route xử lý; errorType có allowlist, không message/stack. Giữ hành vi throw cũ. |
| `chat_storage_failed` | stage=read/write, status503; không log câu chat, exchange UUID hay actor. |
| `chat_throttled` | status429/retryAfter; không IP/identity. |
| `pulse_stage` | stage=learning/social/tick, status/durationMs, updated khi có. Short-circuit/failure vẫn giữ thứ tự và CAS cũ. |
| `pulse_result` | Kết quả HTTP pipeline, duplicate/coalesced; coalesced không xác nhận lượt trước thành công. |
| `cron_result` | Chỉ nhánh QA: status/durationMs/updated/duplicate/coalesced, cùng version/requestId với các stage. |
| `cron_failed` / `cron_disabled` | Cron lỗi hoặc không khớp cấu hình QA hiện có; không tạo lịch thay thế. |
| `qa_auth_denied` | Nhánh QA: status403 và các boolean về context/audience/hostname/HTTPS; không claim values hoặc credential. JWT verifier vẫn fail-closed. |

Runtime lọc cả key lẫn kiểu/miền giá trị, không serialize Error, URL/query, body, header, cookie, token, email, SQL hoặc private payload. Unknown route chỉ thành `/api/other`/`/page`. Log sink lỗi không được biến durable write thành lỗi. Wrapper giữ streaming response và cache headers, không đọc body để log. Cloudflare invocation logs/uncaught logs là lớp platform riêng; không suy quy tắc custom log bảo đảm mọi log platform đã redact.

Vào **Workers & Pages → ai-living-qa → Observability**, chọn đúng version và khoảng thời gian. Lọc `schema=xom-system-log-v1`, `event=cron_result` hoặc `requestId` lấy từ response lỗi; đối chiếu `pulse_stage` để tìm bước lỗi/chậm. `durationMs` là wall time, không phải CPU/FPS. Native invocation outcome/CPU và D1 readback cần kiểm riêng; không gọi status200/coalesced hoặc CI success là bằng chứng học 24/7.

QA dùng đúng một cron `*/5 * * * *` UTC và D1 lease chung với browser. Xem [runbook QA](CLOUDFLARE_AGENT_QA.md) cho IDs/deploy/auth và [evidence](validation/qa-observability-2026-10-29.json) cho kết quả thực đã đo.

## Phase Ops: snapshot và cảnh báo đình trệ

GET `/api/system/progress` chỉ dành cho owner qua QA Access hoặc local-admin trên loopback. Worker gate bảo vệ cả GET này; route thêm fence QA/loopback. Không dùng `readWorld`, không bootstrap DB trống, hydrate policy, sửa clock/cache hoặc ghi client diagnostics. Một SELECT trả một snapshot nhất quán, chỉ aggregate:

`schema=xom-progress-v1`, environment, observedAt, version, worldBorn, paused, revision, turns, experiences, policies, completedTicks, lastTickFinishedAt. Không trả nhân vật, nội dung, ký ức hoặc model matrices; response private/no-store. Thiếu world/schema trả503 và giữ dữ liệu. Các COUNT phục vụ kiểm tra thủ công; chưa là endpoint poll tần suất cao hay SLA cho history lớn.

Trong browser QA đã đăng nhập Access, đọc `await fetch('/api/system/progress',{cache:'no-store'}).then(r=>r.json())` và lưu hai JSON aggregate theo thứ tự thời gian. Có thể đọc cùng SELECT qua Cloudflare connector được cấp quyền; ghi rõ đây là native D1 readback, không thay authenticated HTTP acceptance.

```bash
node scripts/watch-qa-progress.mjs before.json after.json
```

CLI chỉ đọc hai file tối đa8KiB/file, strict UTF8/schema, từ chối symlink leaf; không nhận token/URL/DB hoặc thực hiện network/write. Exit0 nghĩa so sánh hợp lệ, exit1 nghĩa input lỗi; automation phải đọc `status`, không suy exit0 là healthy.

| Status | Ý nghĩa |
|---|---|
| `ticks_progressing` | completedTicks tăng và tick hoàn tất nằm trong khoảng quan sát; learning có thể yên lặng hợp lệ. |
| `paused` / `pause_changed` | Đang pause hoặc hai đầu khoảng có thay đổi pause; không gán stall. |
| `deployment_changed` | Version thay đổi: tách cửa sổ theo version trước khi kết luận. |
| `state_changed` | Khác environment/birth hoặc counter tụt: cần kiểm nguồn; không reset/repair tự động. |
| `clock_mismatch` | Tick có timestamp tương lai so với snapshot. |
| `insufficient_window` | Chưa đủ15phút và chưa quan sát tick tiến bộ. |
| `activity_without_tick_progress` | Đủ15phút, revision tăng nhưng chưa có completed tick trong cửa sổ. |
| `stalled` | Đủ15phút, unpaused ở hai đầu, chưa thấy completed tick hoặc revision tiến bộ; đây là cảnh báo cần đối chiếu log. |

Hai snapshot không thấy mọi pause/restart ở giữa. `cronAttributionProven=false`, `modelQualityGainProven=false` luôn giữ trong report: row growth không chứng minh gain hoặc nguồn Cron. Muốn xác nhận tự chạy phải ghép **native scheduled outcome + cron_result không coalesced/duplicate + cùng version + D1 tiến bộ**, trong cửa sổ không có browser writes của bài test. Không tự mở Access, tăng tài nguyên, tạo Cron hay reset dữ liệu để làm report xanh.

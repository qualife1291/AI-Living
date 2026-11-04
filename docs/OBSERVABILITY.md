# Theo dõi hệ thống và tiến độ QA

Log có cấu trúc là chẩn đoán vận hành, không phải history thế giới hoặc bằng chứng nhân vật đã học tốt hơn. Không có dịch vụ trả phí, bảng log D1, scheduler, importer hay auto-repair mới.

## Log Worker

`XOM_SYSTEM_LOGS=true` bật custom log; mặc định tắt ở app/Sites. Nhánh QA bật trong `configure-cloudflare-qa.mjs`, giữ Workers Logs và gắn `CF_VERSION_METADATA` để mỗi record có version ID khi runtime cung cấp. Cloudflare deployment/version metadata dùng để đối chiếu Git SHA; push Git không tự chứng minh deployment thành công.

Schema `xom-system-log-v1`: `at`, `event`, `level`, `requestId`, `trigger`, `route`, `method`, optional `version` và các trường allowlist dưới đây. ID do server tạo cho từng invocation, bỏ qua request ID do client gửi. API response do wrapper trả về có `X-Request-Id` cùng ID với custom log của request; uncaught exception trả bởi platform không bảo đảm header này. AsyncLocalStorage tách từng request và Cron; không lưu state request trong biến global.

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

QA72d4c2f bổ sung allowlist `h6ShadowOnly`/`h6Candidates` và metadata count/hash ở nhánh QA. Đây là release marker, không chứng minh scorer/model inference hoặc policy96 đang chạy; [H6](H6_OFFLINE_POLICY_SCALE.md) giữ contract và [ROADMAP](../ROADMAP.md) giữ phần còn thiếu.

## Phase Ops: snapshot và cảnh báo đình trệ

GET `/api/system/progress` chỉ dành cho owner qua QA Access hoặc local-admin trên loopback. Worker gate bảo vệ cả GET này và chuẩn hóa dấu / cuối trước phân quyền; diagnostics/memories/learning JSONL aliases cũng được chặn. Route thêm fence QA/loopback. Không dùng `readWorld`, không bootstrap DB trống, hydrate policy, sửa clock/cache hoặc ghi client diagnostics. Một SELECT trả một snapshot nhất quán, chỉ aggregate:

`schema=xom-progress-v1`, environment, observedAt, version, worldBorn, paused, revision, turns, experiences, policies, completedTicks, lastTickFinishedAt. Không trả nhân vật, nội dung, ký ức hoặc model matrices; response private/no-store. Thiếu world/schema trả503 và giữ dữ liệu. Các COUNT phục vụ kiểm tra thủ công; chưa là endpoint poll tần suất cao hay SLA cho history lớn.

Trong browser QA đã đăng nhập Access, đọc `await fetch('/api/system/progress',{cache:'no-store'}).then(r=>r.json())` và lưu hai JSON aggregate theo thứ tự thời gian. Có thể đọc cùng SELECT qua Cloudflare connector được cấp quyền; ghi rõ đây là native D1 readback, không thay authenticated HTTP acceptance. Snapshot native SQL để version=null vì không chạy qua Worker; không suy hai null là deployment ổn định, phải đối chiếu deployment history riêng.

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
| `tick_evidence_mismatch` | Counter và timestamp tick không khớp hoặc timestamp lùi; không kết luận healthy từ bằng chứng này. |
| `insufficient_window` | Chưa đủ15phút và chưa quan sát tick tiến bộ. |
| `activity_without_tick_progress` | Đủ15phút, revision tăng nhưng chưa có completed tick trong cửa sổ. |
| `stalled` | Đủ15phút, unpaused ở hai đầu, chưa thấy completed tick hoặc revision tiến bộ; đây là cảnh báo cần đối chiếu log. |

Hai snapshot không thấy mọi pause/restart ở giữa. `cronAttributionProven=false`, `modelQualityGainProven=false` luôn giữ trong report: row growth không chứng minh gain hoặc nguồn Cron. Muốn xác nhận tự chạy phải ghép **native scheduled outcome + cron_result không coalesced/duplicate + cùng version + D1 tiến bộ**, trong cửa sổ không có browser writes của bài test. Không tự mở Access, tăng tài nguyên, tạo Cron hay reset dữ liệu để làm report xanh.

## Đối chiếu cửa sổ Cron, lỗi và H6

Sau khi đã lấy hai snapshot và export các custom record `xom-system-log-v1` thành NDJSON, chạy:

```bash
node scripts/audit-qa-window.mjs before.json after.json custom-logs.ndjson
```

Chỉ đọc file local: snapshot tối đa8KiB, NDJSON tối đa4MiB/10.000record, UTF8 nghiêm ngặt; từ chối symlink leaf, directory/FIFO, không HTTP/DB/credential/scheduler. Export mỗi custom JSON record một dòng theo thứ tự thời gian, tách khỏi envelope platform; không đưa log có payload riêng tư vào Git.

Report `xom-qa-window-v1` tổng hợp delta tick/turn/sample, số Cron hoàn tất/coalesced/duplicate/lỗi/thiếu bằng chứng, latency từng stage p50/p95/max, lỗi HTTP/auth/throttle và lượt H6 evaluate/model-used/blocked/changed/errors. Chỉ ghép cùng Worker version **khác null** và request ID; một Cron hoàn tất phải có đủ ba stage200 đúng thứ tự rồi result200 với duplicate/coalesced=false. Record trùng, version khác hoặc thiếu stage không được tính thành thành công. Latency là wall time, không phải CPU; không cộng/average percentile của các invocation H6.

`correlated_progress` nghĩa D1 tick tiến và exported log có pipeline khớp trong cửa sổ; `attention_required` chỉ ra lỗi/fence/thiếu bằng chứng; `insufficient_evidence` không đồng nghĩa hệ thống dừng. Exit0 chỉ là input hợp lệ, phải đọc status. Không có log H6 hoặc model-used=0 không chứng minh scorer chạy. File export không tự xác minh nguồn, nên native scheduler attribution và model quality luôn false; vẫn cần native scheduled/deployment/D1 readback và bài đánh giá riêng. Đây là công cụ kiểm tra thủ công, chưa là monitor chạy nền hay soak24h.

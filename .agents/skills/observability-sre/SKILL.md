---
name: observability-sre
description: Observability and production reliability - structured logs, metrics and RED/USE signals, distributed tracing with OpenTelemetry, SLIs and SLOs with error budgets, alerting that pages only on user impact, dashboards, incident diagnosis and runbooks. Use when adding instrumentation, designing alerts or SLOs, diagnosing a production problem from telemetry, or reviewing whether a service can be operated safely.
---

# Observability SRE

## Chuẩn tham chiếu (kiểm chứng 2026-11-16)
- OpenTelemetry là chuẩn thu thập telemetry. Convention cho HTTP và database đã ổn định (HTTP từ v1.23.0, database từ v1.33.0 theo các nguồn tổng hợp). Convention GenAI vẫn ở trạng thái Development, nên tên thuộc tính có thể đổi.
- Dùng tên thuộc tính ở trạng thái Stable cho dashboard và alert dài hạn. Với Development, ghi rõ phiên bản và chấp nhận có thể đổi.
- Một số SDK (ví dụ Java agent) có bản lớn mới với thay đổi mặc định về convention. Kiểm tra changelog trước khi nâng.
- Với cảnh báo: khuyến nghị theo SRE (alert theo tác động người dùng, không theo từng triệu chứng hạ tầng) vẫn là nguyên tắc nền.

## Operating contract
1. Đọc `AGENTS.md`, cấu hình logging/metrics/tracing, dashboard và alert hiện có, runbook, và danh sách endpoint quan trọng.
2. Tách **evidence** (file:line, metric name, dashboard link), **assumption**, **recommendation**.
3. Mọi kết luận về nguyên nhân sự cố phải có bằng chứng từ telemetry. Báo PASS/FAIL/NOT RUN.

## Logs
- JSON có cấu trúc: timestamp (UTC), level, message, service, version, environment, request id, trace id, và context nghiệp vụ tối thiểu.
- Một sự kiện, một dòng log. Không log nhiều dòng để mô tả một luồng.
- Mức độ: `error` cho lỗi cần người xử lý hoặc làm hỏng yêu cầu; `warn` cho bất thường có thể tự phục hồi; `info` cho sự kiện nghiệp vụ quan trọng; `debug` chỉ bật có điều kiện.
- Không log dữ liệu nhạy cảm (xem `privacy-data-governance`). Log lỗi kèm loại lỗi và mã lỗi, không kèm toàn bộ payload.
- Log không phải metric: không đếm bằng cách grep log trong các hệ thống đắt đỏ.

## Metrics
- RED cho dịch vụ phục vụ request: Rate (số request), Errors (tỷ lệ lỗi), Duration (phân vị p50, p95, p99).
- USE cho tài nguyên: Utilization, Saturation, Errors (CPU, memory, connection pool, queue depth).
- Đặt tên metric theo quy ước thống nhất và giới hạn số label. Label có cardinality cao (user id, request id, URL đầy đủ) làm nổ chi phí và làm chậm hệ thống.
- Histogram cho độ trễ. Không tính trung bình cho độ trễ.
- Đo ở biên: tại ingress của dịch vụ và tại client khi có thể.

## Tracing
- Span cho mỗi thao tác đáng kể: HTTP inbound/outbound, truy vấn DB, lời gọi dịch vụ khác, job xử lý message.
- Truyền context trace qua header chuẩn W3C Trace Context (`traceparent`). Đảm bảo log có trace id để nối log với trace.
- Tên span theo mẫu chuẩn (ví dụ `GET /api/orders/{id}` thay vì URL đầy đủ có id).
- Sampling: cân nhắc head-based và tail-based sampling để giữ trace lỗi và trace chậm.
- Không đưa dữ liệu nhạy cảm vào thuộc tính span.

## SLI, SLO và error budget
- SLI là tỷ lệ sự kiện tốt trên tổng số sự kiện, đo từ góc nhìn người dùng: thành công của request, độ trễ dưới ngưỡng, tỷ lệ job hoàn thành đúng hạn.
- SLO là mục tiêu cho SLI trong một cửa sổ thời gian (ví dụ 99.9% trong 30 ngày). Chọn mục tiêu dựa trên nhu cầu người dùng, không chọn số cho đẹp.
- Error budget = 1 − SLO. Khi tiêu hết budget, ưu tiên độ tin cậy hơn tính năng mới theo chính sách đã thống nhất.
- Đặt SLO cho các hành trình quan trọng (đăng nhập, thanh toán, tìm kiếm), không cho từng endpoint nhỏ.

## Alerting
- Alert theo triệu chứng ảnh hưởng người dùng (tỷ lệ lỗi tăng, SLO burn rate cao), không theo nguyên nhân tiềm ẩn (CPU 80%) trừ khi nguyên nhân đó gây hậu quả rõ ràng.
- Hai mức: page (cần xử lý ngay, có người chịu trách nhiệm) và ticket (xử lý trong giờ làm việc). Không page cho việc có thể chờ.
- Mỗi alert có runbook: triệu chứng, cách xác minh, bước giảm thiểu, người liên hệ. Alert không có runbook là alert chưa hoàn thiện.
- Đo burn rate theo nhiều cửa sổ (nhanh và chậm) để giảm cảnh báo nhiễu.
- Định kỳ rà soát alert: xoá alert không hành động được, điều chỉnh ngưỡng.

## Dashboard
- Một dashboard cho mỗi dịch vụ: sức khoẻ tổng quan (RED), tài nguyên (USE), phụ thuộc (DB, queue, API bên ngoài), và phiên bản đang chạy.
- Dashboard giúp trả lời "có vấn đề không, ở đâu, từ khi nào, và có liên quan đến thay đổi gần đây không". Gắn annotation cho deploy.

## Chẩn đoán sự cố
Quy trình có thể lặp lại:
1. Xác định triệu chứng và phạm vi: ai bị ảnh hưởng, từ khi nào, tỷ lệ bao nhiêu.
2. Đối chiếu với thay đổi gần đây: deploy, config, feature flag, dữ liệu, phụ thuộc bên ngoài.
3. Khoanh vùng bằng trace và metric theo phụ thuộc: DB chậm, dịch vụ khác lỗi, hay hàng đợi tăng.
4. Đưa ra giả thuyết, tìm bằng chứng phủ định và khẳng định. Không kết luận khi chỉ có một mảnh thông tin.
5. Giảm thiểu trước (rollback, tắt feature flag, scale), điều tra nguyên nhân gốc sau.
6. Ghi lại timeline và bài học theo định dạng blameless postmortem.

## Vận hành an toàn
- Mọi service có health check, graceful shutdown, và giới hạn tài nguyên (xem `backend-engineer`).
- Có quy trình rollback đã kiểm chứng. Rollback phải được thử, không chỉ tồn tại trên giấy.
- Capacity: biết ngưỡng hiện tại và dự báo khi nào cần mở rộng, dựa trên dữ liệu.

## Kiểm chứng
- Sinh tải giả lập và xác nhận metric, log, trace phản ánh đúng sự việc.
- Chủ động làm lỗi (chaos nhẹ hoặc inject fault ở môi trường test) để kiểm tra alert có kích hoạt đúng.
- Kiểm tra tính năng trace propagation qua các dịch vụ bằng một request thực tế.
- Với SLO mới: xác nhận công thức SLI trên dữ liệu lịch sử trước khi cam kết.

## Deliverables
- Danh sách instrumentation đã thêm (log, metric, span) và tên chính xác
- Đề xuất SLI/SLO và alert kèm runbook
- Kết quả kiểm chứng và giới hạn của telemetry (NOT RUN nếu chưa kiểm)

## Stop conditions
- Thay đổi chính sách retention hoặc nơi lưu telemetry có dữ liệu cá nhân: cần `privacy-data-governance`.
- Không tự thay đổi cấu hình alert đang page người trực trên production khi chưa thông báo người phụ trách.

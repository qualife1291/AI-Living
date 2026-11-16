---
name: performance-profiler
description: Measuring and improving performance with evidence - defining metrics and workloads, establishing baselines, profiling CPU, memory, I/O, database queries, network and build time, identifying bottlenecks, validating improvements with before-and-after measurements, and guarding against regressions. Use when a system is slow, when a change may affect latency, throughput, memory or bundle size, or when optimizing is requested.
---

# Performance Profiler

## Nguyên tắc
- Đo trước, tối ưu sau. Tối ưu không có số đo là đoán mò.
- Tối ưu điểm nghẽn thực tế. Nơi chiếm 5% thời gian thì tối ưu 50% cũng chỉ được 2.5%.
- Mọi số đo ghi kèm điều kiện: phần cứng, phiên bản, build type (debug hay release), dữ liệu, số lần lặp, và cách lấy số (trung vị, p95, p99).

## Operating contract
1. Xác định mục tiêu bằng số: ví dụ p95 của endpoint X dưới 300 ms khi có 500 request mỗi giây, hoặc bundle đầu tiên dưới 200 KB gzip.
2. Tách **measured** (số đo có điều kiện), **hypothesis** (nghi ngờ nguyên nhân), **conclusion** (đã xác nhận bằng so sánh).
3. Mọi thay đổi có số đo trước và sau trên cùng điều kiện. Báo PASS/FAIL/NOT RUN.

## Quy trình
1. **Chọn workload đại diện**: dữ liệu gần thực tế về kích thước và phân bố, không dùng dữ liệu rỗng hoặc quá nhỏ. Bao gồm cả cold start và warm, và các đường đi hiếm nhưng nặng.
2. **Đặt baseline**: chạy nhiều lần, loại bỏ lần đầu nếu là warm-up có chủ đích, ghi phương sai. Nếu phương sai lớn, đo lại trước khi kết luận.
3. **Xác định điểm nghẽn**:
   - CPU: profile sampling (pprof, async-profiler, py-spy, Chrome DevTools Performance, Xcode Instruments Time Profiler, Android Studio CPU profiler).
   - Bộ nhớ: heap snapshot, allocation profile, phát hiện rò rỉ bằng cách lặp thao tác và xem bộ nhớ tăng dần.
   - Database: `EXPLAIN (ANALYZE, BUFFERS)`, số truy vấn trên một request, truy vấn chậm trong log (xem `database-engineer`).
   - Mạng: số request, kích thước payload, độ trễ từng lời gọi, số kết nối mới, waterfall trong trình duyệt.
   - Build: thời gian từng bước, cache hit rate, số module được biên dịch lại.
4. **Phân tích**: với mỗi điểm nghẽn, đo tỷ trọng thời gian và hỏi nó có thể được loại bỏ, giảm tần suất, hay làm song song không.
5. **Tối ưu có chủ đích**: một thay đổi mỗi lần, để biết thay đổi nào tạo ra kết quả.
6. **So sánh**: chạy cùng workload, cùng điều kiện, và báo cáo chênh lệch kèm độ tin cậy (khoảng tin cậy hoặc phương sai).
7. **Chống hồi quy**: thêm benchmark hoặc budget vào CI khi có công cụ (ví dụ Lighthouse CI cho web, benchmark của framework, `hyperfine` cho CLI, bundle size budget).

## Các lỗi thường gặp
- Đo debug build rồi kết luận cho release.
- Benchmark trên máy dev đang chạy nhiều ứng dụng khác.
- Dùng trung bình cho độ trễ, bỏ qua đuôi p99 nơi người dùng thực sự khổ.
- Cache làm kết quả đẹp hơn thực tế ở môi trường production có cache lạnh.
- Tối ưu thuật toán cho dữ liệu nhỏ, trong khi dữ liệu thật rất lớn.
- Thêm cache mà không có chiến lược invalidation, tạo lỗi dữ liệu cũ.

## Khi tối ưu frontend
- Đo Core Web Vitals (LCP, INP, CLS) trên dữ liệu người dùng thật nếu có, không chỉ Lighthouse trên máy mạnh.
- Phân tích bundle để tìm thư viện lớn không cần thiết, code splitting theo route, và tài nguyên chặn render.

## Kiểm chứng
- Số đo trước và sau, cùng điều kiện, cùng số lần lặp, kèm phương sai.
- Kiểm tra không có hồi quy về chức năng: chạy test đầy đủ sau tối ưu.
- Kiểm tra không đánh đổi bộ nhớ hoặc độ chính xác mà không ghi nhận.

## Deliverables
- Mục tiêu bằng số và workload đã dùng
- Baseline, điểm nghẽn có bằng chứng profile, và phân tích tỷ trọng
- Bảng so sánh trước và sau, với điều kiện đo
- Đề xuất benchmark hoặc budget để chống hồi quy

## Stop conditions
- Không đo trên production dưới tải thật mà không có kế hoạch giảm thiểu và phê duyệt.
- Không kết luận đã tối ưu khi chưa có số đo sau thay đổi.

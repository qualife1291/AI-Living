---
name: qa-debugger
description: Systematic bug investigation - reproducing the failure, narrowing the scope, forming and testing hypotheses against evidence, identifying root cause rather than symptom, writing a regression test before the fix, and verifying nearby behavior. Use when a bug is reported, a test fails unexpectedly, behavior diverges between environments, or a race condition or intermittent failure appears.
---

# QA Debugger

## Nguyên tắc
- Không sửa khi chưa tái hiện được, hoặc chưa xác định được cơ chế gây lỗi có bằng chứng. Sửa theo đoán mò thường che triệu chứng và tạo lỗi mới.
- Một giả thuyết chỉ được coi là đúng khi có bằng chứng khẳng định nó và không có bằng chứng phủ định.
- Mỗi lỗi đã sửa phải để lại một test ngăn lỗi tái diễn.

## Operating contract
1. Ghi báo cáo lỗi nguyên văn, môi trường, phiên bản, các bước tái hiện, và kết quả mong đợi so với thực tế.
2. Tách **observed** (log, hành vi quan sát được), **hypothesis** (cơ chế có thể), **conclusion** (đã được chứng minh).
3. Thay đổi trong quá trình điều tra phải có thể hoàn tác. Báo PASS/FAIL/NOT RUN cho từng bước.

## Quy trình
1. **Tái hiện**: chạy đúng các bước của báo cáo. Nếu không tái hiện được, thu thập thêm thông tin: dữ liệu đầu vào thật, phiên bản, cấu hình, thời điểm, người dùng, thiết bị. Lỗi không tái hiện được vẫn cần điều tra, nhưng ghi rõ trạng thái.
2. **Thu hẹp**: giảm dần điều kiện (bisect theo commit với `git bisect`, bỏ từng bước của luồng, dùng dữ liệu tối thiểu) cho đến khi còn đúng phần gây lỗi.
3. **Quan sát**: đọc log, stack trace, request id, metric, trạng thái DB, và thứ tự sự kiện. Với lỗi phụ thuộc thời gian, ghi timestamp chính xác.
4. **Giả thuyết**: liệt kê ít nhất hai nguyên nhân có thể. Với mỗi giả thuyết, nêu dự đoán cụ thể: nếu đúng thì sẽ thấy gì, nếu sai thì sẽ thấy gì.
5. **Kiểm chứng giả thuyết**: thiết kế thí nghiệm để loại trừ. Ưu tiên thí nghiệm có thể làm giả thuyết sai.
6. **Nguyên nhân gốc**: truy ngược từ triệu chứng đến điều kiện sinh ra nó. Hỏi "vì sao" ít nhất năm lần, hoặc đến khi chạm ranh giới hệ thống. Tránh dừng ở "người dùng nhập sai".
7. **Regression test trước**: viết test thất bại trên đúng lỗi đã tái hiện. Xác nhận test thất bại trước khi sửa.
8. **Sửa nhỏ nhất**: sửa nguyên nhân gốc, không thêm try/catch che lỗi, không tăng timeout để giấu race condition.
9. **Kiểm tra lân cận**: chạy các test của module liên quan, và thử các biến thể gần của bug (đầu vào gần, người dùng khác vai trò).
10. **Ghi lại**: nguyên nhân, cách tái hiện, thay đổi, và bài học nếu có. Với lỗi production, dùng định dạng postmortem không đổ lỗi (xem `incident-response` nếu có trong bộ).

## Lỗi không tất định (flaky, race condition)
- Chạy lặp nhiều lần để đo tỷ lệ tái hiện. Ghi số liệu, không chỉ nói "thỉnh thoảng".
- Làm chậm hoặc tăng tải có kiểm soát để đẩy lỗi xuất hiện thường xuyên hơn.
- Ghi lại thứ tự sự kiện giữa các luồng hoặc request. Tìm vùng không có khoá, không có idempotency, hoặc giả định về thứ tự.
- Không dùng `sleep` để "sửa" race. Sửa bằng đồng bộ hoá có chủ đích.

## Lỗi chỉ xảy ra ở một môi trường
- So sánh phiên bản runtime, biến môi trường, múi giờ, locale, dữ liệu, feature flag, và cấu hình mạng giữa hai môi trường.
- Tái hiện bằng cách đưa môi trường gần hơn về giống nhau, từng biến một.

## Kiểm chứng
- Regression test thất bại trước khi sửa và thành công sau khi sửa.
- Toàn bộ test của module chạy lại, với kết quả PASS/FAIL ghi rõ.
- Nếu không thể tái hiện trên môi trường cục bộ, ghi rõ và đề xuất cách thu thập thêm bằng chứng từ môi trường thật.

## Deliverables
- Báo cáo điều tra: tái hiện, giả thuyết đã thử, nguyên nhân gốc có bằng chứng
- Regression test và thay đổi tối thiểu
- Kết quả kiểm tra lân cận
- Các điểm còn chưa rõ và bước tiếp theo

## Stop conditions
- Không đề xuất sửa khi nguyên nhân chưa được xác nhận bằng bằng chứng.
- Không chạy thử nghiệm làm thay đổi dữ liệu production để tái hiện lỗi. Dùng bản sao hoặc môi trường staging.

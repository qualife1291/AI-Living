---
name: refactor-safely
description: Refactoring code without changing behavior - establishing characterization tests first, working in small reversible steps, using the mechanical transformations that keep the build green, separating refactor commits from behavior changes, managing risk in large or untested code, and verifying behavior equivalence. Use when restructuring, renaming, extracting, moving or simplifying code, or when cleaning up legacy modules.
---

# Refactor Safely

## Định nghĩa
Refactor là thay đổi cấu trúc bên trong mà không thay đổi hành vi quan sát được. Nếu hành vi đổi, đó không phải refactor và phải được tách riêng.

## Operating contract
1. Xác định hành vi cần bảo toàn: API công khai, kết quả, lỗi, thứ tự sự kiện, hiệu năng (nếu là ràng buộc), và định dạng dữ liệu.
2. Tách **behavior** (phải giữ nguyên), **structure** (được thay đổi), **assumption** (điều chưa biết về hành vi thực tế).
3. Mỗi bước có test xanh trước và sau. Báo PASS/FAIL/NOT RUN.

## Quy trình an toàn
1. **Đảm bảo có lưới an toàn**: nếu phần code chưa có test, viết characterization test trước. Test ghi lại hành vi hiện tại, kể cả khi hành vi đó có vẻ sai. Nếu thấy lỗi, ghi lại và tách thành task sửa lỗi riêng.
2. **Chia bước nhỏ**: mỗi bước là một thay đổi có thể áp dụng và hoàn tác độc lập. Một đổi tên, một trích xuất hàm, một di chuyển file, không gộp.
3. **Dùng biến đổi cơ học**: đổi tên có công cụ hỗ trợ (IDE rename, `gopls`, `ts-morph`, `rope`), trích xuất hàm bằng công cụ, để compiler kiểm tra tính đúng đắn của tham chiếu.
4. **Giữ build xanh**: mỗi bước commit đều biên dịch và qua test. Nếu cần đường đi tạm, dùng adapter hoặc alias để hai đường cùng tồn tại, rồi xoá đường cũ sau.
5. **Tách commit**: commit refactor không kèm thay đổi hành vi, và ghi rõ trong message là refactor. Điều này giúp review và bisect dễ hơn.
6. **Di chuyển dần**: với thay đổi lớn, dùng mẫu strangler fig: đường mới song song với đường cũ, chuyển traffic từng phần, rồi gỡ đường cũ.
7. **Kiểm tra tương đương**: với logic phức tạp, so sánh đầu ra cũ và mới trên tập dữ liệu lớn (differential testing), đặc biệt khi viết lại thuật toán.

## Khi nào không nên refactor
- Không có test và không có cách kiểm chứng hành vi.
- Đang có hotfix hoặc freeze phát hành.
- Thay đổi không có mục tiêu rõ ràng (refactor vì thích).
- Module sắp bị thay thế hoàn toàn.

## Dấu hiệu cần cảnh giác
- Đổi thứ tự khởi tạo hoặc thứ tự gọi có thể thay đổi kết quả (đặc biệt với side effect và event).
- Đổi kiểu số, làm tròn, hoặc encoding chuỗi.
- Đổi tên trường được serialize ra JSON hoặc lưu vào DB.
- Trích xuất hàm làm thay đổi phạm vi biến hoặc `this`.
- Thay thế thư viện tương đương nhưng khác hành vi ở biên (múi giờ, sắp xếp ổn định, trùng khoá).

## Kiểm chứng
- Test trước khi refactor và sau mỗi bước đều xanh.
- Với code có dữ liệu thật: chạy đối chiếu đầu ra cũ và mới trên một mẫu có kích thước đại diện.
- Lint và typecheck không tăng số cảnh báo so với trước.
- Đo hiệu năng nếu code nằm trên đường nóng (xem `performance-profiler`).

## Deliverables
- Danh sách bước refactor theo thứ tự, mỗi bước có trạng thái build và test
- Characterization test đã thêm, và các lỗi phát hiện nhưng không sửa (đã tách riêng)
- Kết quả đối chiếu hành vi nếu có
- Ghi chú về phần còn lại chưa refactor và lý do

## Stop conditions
- Không trộn refactor với thay đổi hành vi trong cùng commit hoặc cùng PR.
- Dừng và báo cáo nếu phát hiện refactor sẽ phải đổi API công khai hoặc dữ liệu đã lưu. Cần người có thẩm quyền quyết định và kế hoạch chuyển đổi.

---
name: accessibility-i18n
description: Building software that works for everyone and everywhere - WCAG 2.2 AA accessibility for web and mobile, semantic markup and ARIA rules, keyboard and screen reader support, internationalization with ICU message formats and locale-aware formatting, right-to-left layouts, pluralization, text expansion, and testing with assistive technology. Use when building or reviewing any user interface, adding strings, supporting new locales, or auditing accessibility.
---

# Accessibility and i18n

## Chuẩn tham chiếu (kiểm chứng 2026-11-16)
- WCAG 2.2 (W3C Recommendation, 2023) là chuẩn tham chiếu cho web. Mức AA là mục tiêu tối thiểu. Các tiêu chí mới trong 2.2 gồm focus không bị che (2.4.11), kích thước mục tiêu tối thiểu (2.5.8), và đăng nhập không cần ghi nhớ (3.3.8).
- Trên mobile, dùng hướng dẫn của Apple (VoiceOver, Dynamic Type) và Android (TalkBack, font scale) song song với WCAG.
- Quốc tế hoá: Unicode CLDR cung cấp dữ liệu định dạng ngày, số, tiền, số nhiều theo ngôn ngữ. ICU MessageFormat là chuẩn để viết chuỗi có biến và số nhiều. Thẻ ngôn ngữ theo BCP 47 (ví dụ `vi-VN`, `en-US`, `ar-SA`).

## Operating contract
1. Đọc UI hiện có, design system, cơ chế i18n (thư viện và file chuỗi), và danh sách locale hỗ trợ.
2. Tách **observed** (file:line, kết quả audit), **assumption**, **recommendation**.
3. Mọi kết luận về accessibility có phương pháp kiểm tra đi kèm. Ghi "kiểm bằng mắt" là một phương pháp, không phải kết quả đạt. Báo PASS/FAIL/NOT RUN.

## Accessibility: nguyên tắc
- Dùng HTML ngữ nghĩa hoặc component nền tảng trước. `<button>` đúng hơn `<div role="button">` với đủ hành vi bàn phím và focus.
- ARIA là bổ sung, không phải thay thế. Quy tắc đầu tiên của ARIA: không dùng ARIA nếu HTML native đã làm được.
- Mọi control tương tác có tên có nghĩa (accessible name), vai trò, và trạng thái (đã chọn, mở rộng, không khả dụng).
- Thứ tự focus theo thứ tự đọc. Focus nhìn thấy được. Không mất focus sau khi đóng dialog hoặc cập nhật danh sách.
- Thông báo động cho screen reader qua live region có mức độ phù hợp (`polite` cho thông tin, `assertive` chỉ cho lỗi quan trọng).
- Hình ảnh có alt text mô tả chức năng, hoặc alt rỗng nếu là trang trí. Biểu đồ có bảng dữ liệu tương đương hoặc tóm tắt bằng văn bản.
- Màu không là kênh thông tin duy nhất. Tương phản văn bản tối thiểu 4.5:1, văn bản lớn và thành phần giao diện 3:1.
- Hỗ trợ phóng to 200% không mất nội dung và không cuộn ngang với văn bản.
- Tôn trọng `prefers-reduced-motion`, và không có nội dung nhấp nháy quá 3 lần mỗi giây.
- Mục tiêu nhấn được đủ lớn: tối thiểu 24×24 CSS px theo WCAG 2.2 AA, khuyến nghị 44×44 pt trên iOS và 48×48 dp trên Android.

## Accessibility: kiểm thử
1. Tự động: axe-core, Lighthouse, eslint-plugin-jsx-a11y, Accessibility Scanner (Android), Accessibility Inspector (Xcode). Công cụ tự động phát hiện khoảng một phần các vấn đề.
2. Bàn phím: đi toàn bộ luồng chính chỉ bằng Tab, Shift+Tab, Enter, Space, Escape, và phím mũi tên trong widget phức tạp.
3. Screen reader: VoiceOver (iOS/macOS), TalkBack (Android), NVDA hoặc JAWS (Windows). Nghe thử luồng chính và kiểm tra tên, vai trò, trạng thái được đọc đúng.
4. Phóng to và tương phản: kiểm tra ở 200% và trong chế độ tương phản cao.

## Quốc tế hoá: nguyên tắc
- Không hard-code chuỗi trong code. Mọi chuỗi hiển thị đi qua hệ thống i18n, kể cả thông báo lỗi và chuỗi trong email.
- Không ghép chuỗi bằng nối thủ công. Dùng placeholder có tên: `"Xin chào {name}"`, không `"Xin chào " + name`.
- Số nhiều dùng ICU: `{count, plural, one {# sản phẩm} other {# sản phẩm}}`. Tiếng Việt thường không phân biệt số ít và số nhiều theo cùng cách tiếng Anh, nên kiểm tra quy tắc CLDR cho từng locale.
- Ngày, giờ, số, tiền tệ qua `Intl` hoặc thư viện tương đương, với locale và múi giờ của người dùng. Không tự viết định dạng.
- Tên và địa chỉ: không giả định độ dài, số phần, hay thứ tự họ tên.
- Đơn vị và đo lường: lưu giá trị chuẩn, hiển thị theo locale.
- Sắp xếp chuỗi: dùng `Intl.Collator` hoặc tương đương, không dùng so sánh byte khi hiển thị cho người dùng.

## Quốc tế hoá: layout và văn bản
- Hỗ trợ RTL (tiếng Ả Rập, Hebrew, Ba Tư): dùng thuộc tính logic (`start`, `end`, `margin-inline`) thay vì trái và phải. Kiểm tra icon có chiều (mũi tên, nút quay lại) có được lật không.
- Chuỗi dài hơn tiếng Anh tới 30–40% (tiếng Đức, tiếng Phần Lan thường dài hơn). Layout không được vỡ hay cắt chữ.
- Font hỗ trợ đủ ký tự của các locale đích, bao gồm dấu tiếng Việt và ký tự Unicode đặc thù.
- Viết tắt và biểu tượng văn hoá: kiểm tra lại với người bản xứ hoặc người am hiểu địa phương.

## Kiểm chứng
- Bảng kiểm accessibility điền đủ cho từng màn hình quan trọng, với phương pháp kiểm tra ghi rõ.
- Pseudo-localization: thay chuỗi bằng phiên bản dài và có ký tự đặc biệt để phát hiện vỡ layout và chuỗi không được i18n.
- Kiểm tra một locale RTL và một locale có số nhiều phức tạp.
- Kiểm chứng tự động trong CI cho các quy tắc có thể tự động hoá.

## Deliverables
- Báo cáo accessibility theo tiêu chí WCAG 2.2 (đạt, không đạt, không kiểm tra được, kèm lý do)
- Danh sách chuỗi chưa được i18n và vị trí
- Kết quả kiểm thử với bàn phím và screen reader (ghi rõ thiết bị và phiên bản)
- Ghi chú locale và layout đã kiểm chứng

## Stop conditions
- Không tuyên bố "accessible" hoặc "đã hỗ trợ đa ngôn ngữ" khi chưa kiểm chứng bằng phương pháp nêu trên.
- Không dịch thuật ngữ pháp lý, y tế, hay tài chính bằng máy mà không có người có chuyên môn xác nhận.

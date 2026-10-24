# Từ điển Thuật ngữ Chuẩn (`GLOSSARY.md`)

Tài liệu này định nghĩa thống nhất các thuật ngữ dùng xuyên suốt trong mã nguồn, giao diện và tài liệu của **Xóm AI**.

| Thuật ngữ | Định nghĩa trong Xóm AI |
|---|---|
| **World Clock (`lib/clock.ts`)** | Đồng hồ thế giới duy nhất tính toán mili-giây mô phỏng (`simMs`), ngày thứ mấy (`dayIndex`), giờ Việt Nam (`hour`), pha ngày/đêm (`phase`), độ sáng (`daylight`) và mùa (`season`). |
| **Clock Anchor (`ClockAnchor`)** | Điểm mốc thời gian `{ realMs, simMs, scale }` cho phép tạm dừng (`scale = 0`) hoặc tua nhanh (`scale = 24..60`) mà không làm nhảy lùi hay nhảy vọt vị trí nhân vật. |
| **Snapshot (`worlds.data`)** | Bản chụp trạng thái đã lưu trong cơ sở dữ liệu D1 tại một `revision` xác định (gồm tiền, năng lượng, độ đói, kỹ năng, 60 ký ức gần nhất, quan hệ và kế hoạch AI hiện hành). |
| **Projection (`actorsAt`, `animalsAt`)** | Trạng thái vị trí và hoạt động đang được nội suy liên tục trên trình duyệt theo đồng hồ thế giới giữa các lần ghi sự kiện. Không ghi xuống DB mỗi khung hình. |
| **Episode (`episodes`)** | Một sự kiện sinh hoạt hoàn chỉnh đã được xác thực và lưu bền vững vào lịch sử (có tiêu đề, tóm tắt, hội thoại, thay đổi chỉ số, thay đổi quan hệ và kế hoạch bước). |
| **Plan (`Person.plan`)** | Chuỗi 1–8 bước hành động do lượt AI tạo ra cho một nhân vật, được ưu tiên thực hiện trước khi nhân vật quay về lịch sinh hoạt mặc định (`routine`). |
| **Routine (`routines`)** | Lịch sinh hoạt 8 bước mặc định theo tính cách của từng robot khi chưa có `plan` mới hoặc khi `plan` đã hết thời hạn. |
| **Scene Catalog (`data/scenes.json`)** | Danh mục 16 hoạt cảnh chuẩn gắn với khung giờ trong ngày, địa điểm, đạo cụ, âm thanh và tác động nhu cầu. |
| **Context Card (`ContextCard`)** | Thẻ bối cảnh đa chiều (`data/contexts/neighborhood-contexts.json`) mô tả một tình huống cụ thể về thời tiết, kinh tế vi mô, lời hứa, sinh thái, văn hóa Việt Nam hoặc thấu cảm. |
| **Witness-Bound Memory** | Nguyên tắc ký ức gắn với người chứng kiến: mỗi nhân vật chỉ nhớ những gì diễn ra tại địa điểm mình có mặt hoặc được người khác trực tiếp kể lại. |
| **Golden Episode (SFT)** | Mẫu sự kiện chuẩn mực (`data/training/sft-golden-episodes.json`) đạt điểm tối đa về cấu trúc, thời gian đi bộ và văn phong tiếng Việt, dùng làm mẫu few-shot hoặc fine-tuning. |
| **DPO Preference Pair** | Cặp kịch bản đối chiếu `chosen` (đúng nguyên tắc) và `rejected` (vi phạm nguyên tắc) kèm lời phê bình `critique` (`data/training/dpo-preference-pairs.json`). |
| **Reflexion Evaluator** | Hàm `evaluateCandidateEvent()` trong `lib/training.ts` tự động chấm điểm bản nháp sự kiện trên thang 100 và sinh lời nhắc tự sửa lỗi trước khi ghi DB. |

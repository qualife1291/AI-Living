# ADR-0005: Ký ức gắn người chứng kiến (`witnessed_with`) và Bộ dữ liệu AI Tự Training

- **Trạng thái:** Đã chấp nhận (24/10/2026)
- **Bối cảnh:** Trong mô phỏng xã hội nhiều nhân vật, lỗi phổ biến nhất của LLM là "ký ức toàn tri" (nhân vật ở Vườn nhỏ lại biết chuyện hai người khác nói riêng ở Xưởng sáng tạo) và hội thoại lặp lại hoặc mang giọng văn hành chính.
- **Quyết định:**
  1. Thiết kế bảng `memories` trong migration `0001` có trường `witnessed_with` và `importance`.
  2. Xây dựng thư viện 24 bối cảnh đa chiều (`data/contexts/neighborhood-contexts.json`), 6 mẫu Golden Episodes (`data/training/sft-golden-episodes.json`), 6 cặp đối chiếu DPO (`data/training/dpo-preference-pairs.json`), giáo trình 8 cấp độ (`data/training/self-play-curriculum.json`) và hàm chấm điểm phản tư `evaluateCandidateEvent()` trong `lib/training.ts`.
- **Hệ quả:** Tác nhân AI có nguồn bối cảnh phong phú theo giờ/thời tiết và có bộ tiêu chí tự kiểm tra rõ ràng trước khi ghi sự kiện vào thế giới.

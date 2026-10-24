# Cơ chế AI, Công việc, Hội thoại & Đồng bộ Schema (`AI_BEHAVIOR.md`)

> Xem thêm: [Kỹ thuật Tổng hợp Bối cảnh & Bộ AI Tự Training](AI_TRAINING_AND_CONTEXTS.md) · [Thiết kế mở rộng](DESIGN_PROPOSALS.md)

---

## 1. Hai lớp vận hành rõ ràng

1. **Lớp Mô phỏng Tất định (`lib/clock.ts`, `lib/life.ts`, `lib/traffic.ts`):**
   - Tính toán pha ngày/đêm, ánh sáng, thời tiết TP.HCM, đường đi ngắn nhất trên đồ thị 26 nút, cử động khớp tay/chân của robot, chuyển động của mèo Mướp / chó Cún / đàn sẻ và câu chào ngắn khi hai nhân vật đứng gần nhau.
   - Chạy thuần tất định theo đồng hồ thế giới, không gọi LLM mỗi khung hình.
2. **Lớp Lượt AI Sinh Sự kiện (`lib/apply-event.ts`, `lib/training.ts`):**
   - Đọc trạng thái thế giới (`GET /api/world`) và bối cảnh đa chiều đã tổng hợp (`GET /api/instructions?context=1`).
   - Tạo cảnh đời thường mới kèm hội thoại có thời điểm (`atSecond`, `location`), thay đổi chỉ số đã thực sự diễn ra và kế hoạch 1–8 bước tiếp theo (`plan`).
   - Khi kế hoạch mới được ghi, hàm `resolveTransitionOrigin()` tự động lấy vị trí mô phỏng hiện tại của từng nhân vật làm `plan.from`, đảm bảo nhân vật bước đi mượt mà tới điểm hẹn mà không bị nhảy vị trí (đã sửa lỗi **L1**).

---

## 2. Hồ sơ tính cách và mục tiêu của 3 Robot AI

| Nhân vật | Vai trò | Tính cách & Phong cách thoại | Mục tiêu ban đầu |
|---|---|---|---|
| **An** (`#ed9e6f`) | Người ươm ý tưởng | Lạc quan, nhiệt tình, thích thử nghiệm kỹ thuật và kinh doanh nhỏ, đôi khi hơi vội nên cần học cách tính chi phí | Dành dụm 500.000đ mở quầy nước thảo mộc |
| **Bình** (`#8f9bc4`) | Người giữ nhịp xóm | Điềm tĩnh, kỹ tính, rõ ràng về con số nhưng luôn lắng nghe và sẵn lòng giúp bạn tháo gỡ khó khăn | Lập quỹ sinh hoạt chung minh bạch cho cả xóm |
| **Chi** (`#98b789`) | Đầu bếp mộng mơ | Ấm áp, tinh tế, yêu cây cỏ và nấu nướng, hơi ngại mở lời khi đông người nhưng rất chu đáo | Nấu một bữa cơm chung được cả xóm yêu thích |

---

## 3. Quy tắc đồng bộ Schema & Hội thoại tự nhiên (Đã sửa L10)

- **Số lượng câu thoại:** Schema cho phép `1..12` câu thoại mỗi sự kiện (khuyến nghị `3..8` câu ngắn gọn, tự nhiên).
- **Thời điểm và địa điểm thoại (`atSecond` & `location`):**
  - `atSecond` nằm trong `[0, 1200]`, tính từ lúc sự kiện được ghi.
  - Dành ít nhất **20–45 giây đầu cảnh** để các nhân vật đi bộ tới cùng một địa điểm trước khi bắt đầu câu thoại đầu tiên.
  - Các câu thoại nối tiếp cách nhau **6–8 giây**. Bong bóng thoại chỉ hiển thị khi nhân vật đang đứng yên (`!actor.walking`) tại đúng `location`.
- **Mảng thay đổi (`changes`):**
  - Tối đa 3 phần tử (mỗi nhân vật tối đa 1 mục thay đổi trong cùng một sự kiện).
  - `moneyDelta` trong `[-30000, 30000]` (không làm tiền âm); `energyDelta` và `hungerDelta` trong `[-20, 20]`; `skillDelta` trong `[0, 3]`.
  - Chỉ tăng `skillDelta` hoặc cộng tiền khi hoạt động học/làm đã thực sự diễn ra trong cảnh; kế hoạch dự định trong tương lai chưa hoàn thành không được cộng trước.

---

## 4. Ví dụ Sự kiện Chuẩn (Trích từ `data/training/sft-golden-episodes.json`)

```json
{
  "id": "golden-sft-001",
  "contextId": "ctx-econ-stall-costing",
  "revision": 1,
  "source": "ai",
  "title": "Tính thử giá vốn ly trà tắc húng quế",
  "summary": "An mang bản nháp chi phí sang Thư viện nhờ Bình rà soát. Hai bạn nhận ra nếu dùng bình thủy tinh rửa sạch tại chỗ sẽ tiết kiệm hơn ly dùng một lần, rồi ghé Bếp chung kể cho Chi nghe.",
  "dialogue": [
    {
      "speaker": "an",
      "text": "Bình ơi, mình cộng thử tiền tắc và mật ong rồi, nhưng tiền ly mang đi chiếm gần một phần ba luôn.",
      "atSecond": 42,
      "location": "Thư viện"
    },
    {
      "speaker": "binh",
      "text": "Để mình xem sổ nào. Nếu khách uống ngay ở Sân chung hoặc Quán cà phê, mình dùng ly thủy tinh có sẵn thì giảm được 2.000đ mỗi phần đó.",
      "atSecond": 50,
      "location": "Thư viện"
    }
  ],
  "changes": [
    {
      "id": "an",
      "moneyDelta": 0,
      "energyDelta": -4,
      "hungerDelta": 4,
      "skillDelta": 1,
      "activity": "Hoàn thiện bảng tính giá vốn quầy nước",
      "location": "Bếp chung",
      "memory": "Bình gợi ý dùng ly thủy tinh tại chỗ để giảm 2.000đ chi phí mỗi phần nước; Chi chỉ cách chọn lá húng quế bánh tẻ.",
      "plan": [
        { "location": "Thư viện", "activity": "Cùng Bình rà soát bảng giá vốn", "duration": 90, "kind": "read" },
        { "location": "Bếp chung", "activity": "Hỏi Chi định lượng lá húng quế", "duration": 80, "kind": "social" }
      ]
    }
  ],
  "relationship": {
    "a": "an",
    "b": "binh",
    "delta": 3,
    "note": "Bình tận tình giúp An tháo gỡ bài toán chi phí bao bì"
  }
}
```

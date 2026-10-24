# Kỹ thuật Tổng hợp Bối cảnh Đa chiều & Bộ Dữ liệu cho AI Tự Training (Self-Training Suite)

> Tài liệu này giải thích kiến trúc và cách sử dụng hệ thống **Tổng hợp Bối cảnh (Context Synthesis)** và **Bộ AI Tự Training / Tự Đánh giá (Self-Training & Reflexion Suite)** được tích hợp tại `lib/training.ts`, `data/contexts/` và `data/training/`.

---

## 1. Phân biệt rõ: Mô phỏng Thời gian thực vs. Huấn luyện / Đánh giá AI

Tuân thủ nghiêm ngặt nguyên tắc trung thực của dự án (`AGENTS.md` mục 8 và `docs/VISION.md`):
- **Trên trình duyệt khi người dùng đang xem (Runtime Projection):** Chuyển động của robot, động vật, xe cộ và thời tiết là **hàm mô phỏng tất định theo đồng hồ thế giới** (`lib/life.ts`, `lib/clock.ts`), không gọi LLM mỗi khung hình và không tự huấn luyện lại trọng số mô hình trên trình duyệt.
- **Ở lớp Tác nhân AI / Chuẩn bị dữ liệu / Tự đánh giá (Context Synthesis & Self-Training Suite):** Để các lượt sinh hoạt AI (qua tác vụ định kỳ, server tick hoặc quá trình fine-tune/few-shot) ngày càng thông minh, giàu bản sắc Việt Nam và không phạm lỗi logic, dự án trang bị một **tổ hợp bối cảnh đa chiều** kết hợp với **bộ dữ liệu chuẩn (SFT, DPO, Curriculum) và hàm chấm điểm phản tư tự động (`evaluateCandidateEvent`)**.

---

## 2. Kỹ thuật Tổng hợp Bối cảnh Đa chiều (Combinatorial Context Synthesis)

Thay vì để tác nhân AI đọc một trạng thái tĩnh lặp đi lặp lại, hàm `synthesizeContextPrompt(world, nowMs, revision)` trong `lib/training.ts` tổng hợp một không gian trạng thái từ **5 nguồn tín hiệu độc lập**:

1. **Tín hiệu Thời gian & Ánh sáng (`WorldTime` từ `lib/clock.ts`):**
   - Ngày thứ bao nhiêu của xóm (`dayIndex + 1`), giờ địa phương Việt Nam (`hour`), pha trong ngày (`dawn | morning | noon | afternoon | dusk | evening | night`) và mùa tại TP.HCM (`dry | rainy`).
2. **Tín hiệu Thời tiết Tất định (`WeatherState` từ `lib/clock.ts`):**
   - Trạng thái `clear | cloudy | rain | fog | windy` và nhiệt độ ước tính (`tempC`), buộc kế hoạch di chuyển phải hợp lý (ví dụ: trời mưa không xếp lịch ngồi đọc sách ngoài trời ở Công viên).
3. **Tín hiệu Nhu cầu Nội tại & Lời hứa (`Person` & `CommitmentItem`):**
   - Phát hiện cư dân đang thấp năng lượng (`energy < 40`) hoặc đói (`hunger > 60`), cũng như các lời hứa đang mở (`status === 'open'`) để ưu tiên giải quyết.
4. **Thư viện 24 Thẻ Bối cảnh Đa chiều (`data/contexts/neighborhood-contexts.json`):**
   Được chia thành 6 nhóm chủ đề đời sống (mỗi nhóm 4 bối cảnh):
   - `weather_season`: Mưa rào chiều mùa mưa TP.HCM, sương mỏng bình minh quanh hồ Công viên Lá Non, trưa nắng gắt tìm bóng râm, gió chiều Phố đi bộ.
   - `micro_economy`: Bài toán giá vốn ly trà tắc húng quế của An, tổng kết quỹ sinh hoạt chung của Bình, thử nghiệm mẻ trà mật ong mới của Chi, tận dụng gỗ thừa đóng kệ gia vị.
   - `commitments_social`: Giữ lời hứa rửa bát sau bữa tối, Chi vượt qua sự ngại ngùng nhờ bạn góp ý món mới, viết bảng tin cuối tuần ở Quảng trường, đọc sách yên tĩnh ở Thư viện.
   - `ecology_animals`: Ngồi yên để mèo Mướp tự bước lại gần, Cún cúi chân trước mời chơi (`play bow`), đàn sẻ nhảy kiếm hạt quanh luống rau vừa tưới, ủ phân hữu cơ từ bã trà.
   - `vietnamese_culture`: Đêm treo đèn lồng giấy ở Sân chung, văn hóa cà phê sáng ngắm phố phường, góc trưng bày nhỏ cuối tuần trên Phố đi bộ, giờ tắt bớt đèn tiết kiệm năng lượng.
   - `empathy_resolution`: Nhắc bạn nghỉ sạc pin khi năng lượng thấp, làm rõ khoản ghi chép thiếu bằng chiếc kẹp hóa đơn, cùng dựng lại luống rau sau mưa lớn, nấu chè mừng cột mốc kỹ năng mới.
5. **Mẫu Few-Shot Golden Episode xoay vòng theo ngày:**
   - Tự động đính kèm 1 mẫu chuẩn từ `data/training/sft-golden-episodes.json` khớp với nhịp sinh hoạt trong ngày để định hình văn phong tiếng Việt tự nhiên.

> **Cách gọi qua API:** Gọi `GET /api/instructions?context=1` để nhận bản hướng dẫn đầy đủ kèm khối bối cảnh đã tổng hợp cho thời điểm hiện tại.

---

## 3. Cấu trúc Bộ Dữ liệu cho AI Tự Training (`data/training/`)

### 3.1 Bộ mẫu chuẩn SFT / Few-Shot (`data/training/sft-golden-episodes.json`)
Gồm các kịch bản hoàn chỉnh, đạt 100/100 điểm kiểm tra schema và rubric:
- Có đầy đủ `id`, `contextId`, `revision`, `source: 'ai'`, `title`, `summary`, `dialogue` (kèm `atSecond >= 35` và `location` đồng bộ), `changes` (kèm `plan` đa bước nối tiếp) và `relationship`.
- Minh họa rõ quy tắc **ký ức gắn người chứng kiến**: ai ở đâu chỉ nhớ việc tại đó hoặc việc được bạn kể lại khi gặp mặt.

### 3.2 Bộ cặp đối chiếu ưu tiên DPO (`data/training/dpo-preference-pairs.json`)
Gồm 6 cặp đối chiếu `chosen` (nên học theo) vs. `rejected` (lỗi thường gặp cần tránh) kèm lời giải thích `critique` chi tiết trên 6 chiều:
1. `witness_bound_memory`: Chống rò rỉ ký ức toàn tri (omniscient memory leak).
2. `co_location_and_timing`: Đảm bảo thời gian đi bộ (≥ 20–45 giây) và khoảng cách giữa các câu thoại (6–8 giây) tại cùng một địa điểm.
3. `animal_non_anthropomorphism`: Không cho động vật nói tiếng người.
4. `earned_outcomes_not_plans`: Không cộng tiền hay kỹ năng cho những kế hoạch mới chỉ dự định trong tương lai.
5. `natural_vietnamese_dialogue`: Tránh giọng văn hành chính/khẩu hiệu máy móc.
6. `animal_safety_ethics`: Không bao giờ cho mèo săn hoặc chó đuổi đàn sẻ.

### 3.3 Giáo trình Tự luyện 8 Cấp độ (`data/training/self-play-curriculum.json`)
Thiết kế theo độ khó tăng dần từ Level 1 đến Level 8 để tác nhân AI tự thử sức (Self-Play):
- **Level 1 (`L1_BASIC_COLOCATION`):** Đồng bộ điểm hẹn và khoảng thời gian đi bộ.
- **Level 2 (`L2_WITNESS_MEMORY_ISOLATION`):** Cách ly ký ức theo người chứng kiến.
- **Level 3 (`L3_WEATHER_ADAPTATION`):** Thích ứng hành vi với thời tiết (mưa rào, nắng gắt).
- **Level 4 (`L4_NEEDS_RECOVERY_BALANCE`):** Cân bằng năng lượng và độ đói theo hành động.
- **Level 5 (`L5_COMMITMENT_CONTINUITY`):** Thực hiện lời hứa từ lượt trước.
- **Level 6 (`L6_MICRO_ECONOMY_INTEGRITY`):** Tính đúng đắn của kinh tế vi mô và kỹ năng.
- **Level 7 (`L7_ETHICAL_ECOLOGY_INTERACTION`):** Tương tác tôn trọng tập tính động vật và cây trồng.
- **Level 8 (`L8_GENTLE_CONFLICT_RESOLUTION`):** Hóa giải hiểu lầm nhỏ bằng đối thoại thấu cảm.

---

## 4. Vòng lặp Tự đánh giá & Phản tư (Self-Evaluation & Reflexion Loop)

Hàm `evaluateCandidateEvent(candidate, recentEvents, world)` trong `lib/training.ts` chấm điểm mọi bản nháp sự kiện AI trên thang **100 điểm** gồm 5 thành phần (hiện thực hóa mục §6.9 của báo cáo review):

| Thành phần chấm điểm | Điểm tối đa | Nội dung kiểm tra tự động |
|---|---|---|
| `schemaAndBounds` | 25 | Khớp hoàn toàn `eventSchema` (Zod), không lặp nhân vật trong `changes`, không làm âm tiền mô phỏng |
| `coLocationAndTiming` | 25 | `atSecond >= 20`, khoảng cách giữa hai câu thoại liên tiếp `>= 5s`, `dialogue.location` nằm trong lộ trình `plan` hoặc `location` của người nói |
| `naturalVietnamese` | 20 | Không chứa từ sáo rỗng hành chính ("tối ưu hóa", "hiệu suất toàn diện"...), độ dài câu thoại vừa phải (≤ 220 ký tự) |
| `repetitionPenalty` | 15 | Đo tỷ lệ trùng lặp bigram (2-gram) so với 10 sự kiện gần nhất; phạt điểm nếu trùng lặp `> 35%` |
| `continuityAndEthics` | 15 | Đảm bảo không vi phạm đạo đức sinh thái (không săn bắt/rượt đuổi chim sẻ) |

Nếu tổng điểm `< 85` hoặc có bất kỳ lỗi nào trong `issues[]`, hàm trả về chuỗi `reflexionPrompt` chỉ rõ từng lỗi để tác nhân AI tự sửa bản nháp trước khi gọi `POST /api/events`.

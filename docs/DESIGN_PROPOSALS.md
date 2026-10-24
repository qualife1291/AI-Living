# Xóm AI — Đề xuất giao diện, sinh thái, trí tuệ sinh vật, giọng nói, âm thanh, dữ liệu và phân quyền

> Phần 2 của bộ review (nối tiếp [docs/TECHNICAL_REVIEW.md](TECHNICAL_REVIEW.md), 24/10/2026). Phần 1 tập trung vào lỗi và hạ tầng; phần này tập trung vào **thiết kế mở rộng hoàn chỉnh (§0–§8 & Phụ lục G)**.
> Quy ước độ tin cậy: **[Đã đọc mã]** · **[Nguồn web phiên này]** (đã tra cứu, ghi ở Phụ lục G) · **[Kiến thức sẵn có]** (chưa tra lại phiên bản/giấy phép — *phải kiểm tra trước khi dùng*) · **[Đề xuất]** (ý kiến thiết kế, đã hiện thực hóa một phần vào `lib/clock.ts`, `data/scenes.json`, `lib/training.ts`).

---

## 0. Tóm tắt

**Ý tưởng trung tâm: một đồng hồ thế giới duy nhất (World Clock — `lib/clock.ts`) làm "nguồn thời gian" cho mọi thứ.** Ánh sáng ngày/đêm, thời tiết, vòng đời cây, nhịp sinh hoạt của động vật, hoạt cảnh của robot, âm thanh đường phố và nhạc nền đều là *hàm thuần tất định* của `(thời gian mô phỏng, hạt giống ngẫu nhiên, các sự kiện chăm sóc đã lưu)`. Nhờ vậy mọi thiết bị thấy cùng một xóm, replay/video sau này tái hiện đúng, và không phải ghi DB mỗi giây.

**Quyết định nên chốt sớm (ảnh hưởng mọi thứ còn lại)**

| # | Quyết định | Khuyến nghị |
|---|---|---|
| 1 | Tốc độ thời gian | **1× giờ thật (múi giờ Việt Nam)** cho chế độ "trực tiếp", kèm chế độ "tua nhanh" tùy chọn (×24–×60). Cây lớn theo ngày thật; ba lượt AI 08:00/14:00/20:00 khớp sáng/chiều/tối thật |
| 2 | Viewer vs admin | Hiện host là *owner-private* nên **không thể có viewer khác chủ**. Muốn có viewer phải đổi audience hoặc đổi host — việc này `AGENTS.md` cấm tự ý, cần chủ dự án quyết định (§8) |
| 3 | Giọng nói | Giai đoạn đầu **không dùng TTS**: dùng "tiếng ríu" tổng hợp bằng Web Audio cho từng robot; TTS tiếng Việt chỉ làm offline cho nội dung xuất bản (§5) |
| 4 | Trí tuệ động vật | Luật + utility AI tự viết, **không dùng LLM** điều khiển động vật; LLM chỉ được dùng để *kể lại* (§4.4) |
| 5 | Âm thanh | Ưu tiên **âm thanh tổng hợp thủ tục + tự thu âm tại TP.HCM**; chỉ dùng mẫu bên ngoài khi xác minh được giấy phép từng file (§6) |

**Lát cắt dọc nên làm trước (thay vì làm dàn trải):** một chu kỳ ngày hoàn chỉnh (bình minh → đêm) với 6–8 hoạt cảnh, đổi ánh sáng, 1 loại cây có vòng đời, 3 lớp âm thanh nền và nút bật/tắt âm. Chỉ mở rộng sau khi lát cắt này chạy mượt trên điện thoại.

---

## 1. Bổ sung cho review trước (đọc kỹ thêm)

Sau khi quét thêm `globals.css` và đối chiếu lại mã, các điểm sau đã được phát hiện và cập nhật:

1. **Thời tiết chuyển từ nhãn chữ sang trạng thái tất định (`lib/clock.ts`).** Trước đây trường `weather` ("Nắng nhẹ") chỉ được hiển thị tĩnh; nay `weatherAt(seed, worldTime)` sinh thời tiết tất định theo mùa mưa/mùa khô TP.HCM và pha ngày/đêm, đồng thời hỗ trợ `weatherOverride`. **[Đã cập nhật mã]**
2. **Phân tách hoạt họa trang trí và hoạt họa theo đồng hồ:** 23 `@keyframes` trong `globals.css` được giữ cho chuyển động trang trí cục bộ, dừng sạch qua `scene-paused` và `prefers-reduced-motion`. **[Đã cập nhật mã]**
3. **Thống nhất chính sách `prefers-reduced-motion`:** Gộp hai khối CSS chồng chéo trước đây thành một chính sách duy nhất tắt các chuyển động trang trí vô hạn nhưng giữ nguyên khả năng đọc bong bóng thoại. **[Đã cập nhật mã]**
4. **Loại bỏ xung đột `.map-person { transition: transform 2s ease }`:** Đã gỡ `transition` khỏi `.map-person` để chuyển động bằng thuộc tính SVG `transform` mỗi ~75 ms không bị trễ 2 giây. **[Đã cập nhật mã]**
5. **Làm rõ nhãn dữ liệu Snapshot vs Projection:** Giao diện phân biệt rõ "Hồ sơ đã lưu (Snapshot)" ở cột bên và "Nhịp sống trong xóm (Đang mô phỏng)" ở bảng dưới bản đồ. **[Đã cập nhật mã]**
6. **Phân tách dữ liệu hoạt cảnh và bối cảnh ra tệp cấu hình:** Danh mục hoạt cảnh nằm tại `data/scenes.json` và 24 bối cảnh tổng hợp nằm tại `data/contexts/neighborhood-contexts.json`. **[Đã cập nhật mã]**

---

## 2. Giao diện xóm

### 2.1 Đồng hồ thế giới và nguồn thời gian (`lib/clock.ts`)

Mô-đun `lib/clock.ts` cung cấp đầu ra dùng chung cho UI, ánh sáng, thời tiết và bộ tổng hợp bối cảnh AI:

```ts
export type DayPhase = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'night';
export type Season   = 'dry' | 'rainy'; // TP.HCM: mùa mưa tháng 5–11, mùa khô tháng 12–4
export type WorldTime = {
  simMs: number;      // mili-giây mô phỏng kể từ born (đã trừ thời gian tạm nghỉ)
  dayIndex: number;   // 0, 1, 2…
  hour: number;       // 0–24, số thực, giờ địa phương Asia/Ho_Chi_Minh
  phase: DayPhase;
  phaseLabel: string;
  daylight: number;   // 0..1 (đường cong mượt quanh bình minh/hoàng hôn)
  season: Season;
  seasonLabel: string;
};
```

- **Đồng hồ phân đoạn (`anchors: { realMs, simMs, scale }[]`)**: hỗ trợ tua nhanh mà không làm nhảy vị trí, đồng thời tương thích ngược hoàn toàn với cặp `{ pausedAt, pausedMs }`.
- **PRNG có hạt giống (`mulberry32` + `hashSeed`)**: đảm bảo mọi máy khách tính ra cùng trạng thái thời tiết và cùng bối cảnh gợi ý tại cùng một thời điểm.

### 2.2 Ánh sáng ngày–đêm và thời tiết

| Pha | Giờ gợi ý (TP.HCM) | Hiệu ứng hình ảnh | Hiệu ứng sinh hoạt |
|---|---|---|---|
| Bình minh | 05:30–07:00 | Sương mỏng nhẹ, ánh sáng ấm dần | Chim sẻ kiếm hạt, quét sân, tưới rau sớm |
| Sáng | 07:00–11:00 | Sáng trong, rõ nét | Làm việc tại xưởng, đọc sổ thư viện |
| Trưa | 11:00–14:00 | Nắng cao, dịu mắt | Cà phê trưa, Mướp nằm bóng râm |
| Chiều | 14:00–17:30 | Nắng vàng ấm hoặc mưa rào mùa mưa | Chơi với Cún, chăm vườn chiều, trú mưa |
| Hoàng hôn | 17:30–18:30 | Phủ tím hồng nhẹ, đèn đường bật sáng | Đi dạo phố đi bộ, chuẩn bị bữa tối |
| Tối | 18:30–22:00 | Phủ xanh chàm nhẹ, đèn đường tỏa quầng sáng | Ăn tối chung, kể chuyện sân chung |
| Đêm | 22:00–05:30 | Xanh đậm yên tĩnh, đèn đường dịu | Robot về phòng sạc pin, nghỉ đêm |

### 2.3 Danh mục hoạt cảnh dựa trên dữ liệu (`data/scenes.json`)

16 hoạt cảnh chuẩn đã được định nghĩa trong `data/scenes.json` với đầy đủ khung giờ (`hours`), địa điểm (`place`), loại hành động (`kinds`), đạo cụ (`props`), tác động nhu cầu (`needs`), hiệu ứng âm thanh (`sfx`) và danh sách nhân vật tham gia (`who`).

### 2.4 Bố cục và trải nghiệm xem
- **Chế độ Xem** và **Chế độ Quản trị (Nhịp sống)** hiển thị rõ trạng thái đồng hồ thế giới, pha trong ngày, thời tiết hiện tại và các bối cảnh đa chiều đang được kích hoạt.
- Thẻ nhân vật ghi rõ nhãn **"Trạng thái đã lưu"** (snapshot) trong khi bảng dưới bản đồ ghi **"Nhịp sống trong xóm (Đang mô phỏng)"**.

### 2.5 Kiến trúc render (`StaticScene` memoized)
`CityMap.tsx` tách riêng `StaticScene` bằng `React.memo` (chỉ nhận prop `lampsLit` đổi theo pha ngày/đêm) khỏi lớp động (robot, động vật, xe, đèn tín hiệu), giúp giảm mạnh chi phí render mỗi khung hình 75 ms.

---

## 3. Hệ sinh thái và vòng đời cây trồng [Đề xuất]

Hiện tại Vườn cộng đồng (`Vườn nhỏ`) và cây xanh trên bản đồ là các phần tử SVG tĩnh. Để biến việc chăm vườn của Chi và An thành hệ sinh thái có tiến triển thật:

### 3.1 Mô hình 5 giai đoạn sinh trưởng của cây
Mỗi ô trồng (`plotId: 'herb-1' | 'herb-2' | 'flower-1'`) là một hàm tất định của `(born, careEvents[])`:

| Giai đoạn | Tên giai đoạn | Thời gian (ngày thật) | Hình ảnh SVG | Điều kiện chuyển tiếp |
|---|---|---|---|---|
| `0` | Hạt giống (`seed`) | Ngày 0–1 | Mô đất nhỏ sẫm màu | Vừa gieo hạt hoặc thu hoạch xong |
| `1` | Nảy mầm (`sprout`) | Ngày 1–3 | Hai lá mầm xanh non | Đủ độ ẩm (có ít nhất 1 sự kiện tưới hoặc trời mưa) |
| `2` | Cây non (`vegetative`) | Ngày 3–6 | Thân cao, 4–6 cặp lá | Được tưới/chăm trong vòng 48 giờ |
| `3` | Đơm bông / Thu hoạch (`mature`) | Ngày 6–10 | Bụi húng quế/hoa nở rộ | Sẵn sàng cho hoạt cảnh `garden.afternoon_harvest` |
| `4` | Héo nhẹ (`wilted`) | Khi thiếu nước > 72h | Lá rũ nhẹ, màu vàng nâu | Phục hồi về giai đoạn trước ngay khi được tưới (không làm cây chết vĩnh viễn để giữ cảm giác ấm áp) |

### 3.2 Quy tắc không gây áp lực (Cozy Non-Punitive Ecology)
- Nếu trời mưa (`weather.kind === 'rain'`), độ ẩm tự động được nạp đầy mà không cần sự kiện tưới cây.
- Cây không bao giờ chết mất gốc; nếu xóm tạm nghỉ (`paused = true`), đồng hồ sinh trưởng của cây cũng tạm dừng theo `simulationTime`.

---

## 4. Trí tuệ sinh vật và hành vi động vật [Đề xuất]

### 4.1 Nguyên tắc cốt lõi
Động vật trong Xóm AI (**Mướp** — mèo mướp, **Cún** — chó vàng nhỏ, **Đàn sẻ** — chim sẻ phố) mang lại sức sống tự nhiên nhưng phải tuân thủ nghiêm ngặt:
1. **Không nhân cách hóa thành người:** Động vật không nói tiếng người, không có bong bóng thoại chữ.
2. **Không bạo lực sinh thái:** Mèo không săn sẻ, chó không rượt đuổi mèo hay chim.
3. **Tôn trọng khoảng cách an toàn:** Đặc biệt với Mướp (loài mèo cần chủ động kiểm soát khoảng cách) và đàn sẻ (bay lên hoặc nhảy ra xa khi có chuyển động nhanh quá gần).

### 4.2 Máy trạng thái kết hợp Utility AI cho từng loài

| Sinh vật | Trạng thái chính (States) | Hàm điểm Utility (chọn hành vi) | Phản ứng với thời tiết & robot |
|---|---|---|---|
| **Mướp (Mèo)** | `sleep_shade`, `groom`, `patrol_garden`, `play_toy`, `observe_afar` | Ưu tiên `sleep_shade` vào buổi trưa (`noon`); ưu tiên `observe_afar` khi có robot ngồi yên (`rest`/`read`) trong bán kính 120px | Khi mưa (`rain`): lập tức về hiên `Bếp chung`. Chỉ lại gần khi robot không đi bộ (`!actor.walking`) |
| **Cún (Chó)** | `sniff_trail`, `play_bow`, `follow_friend`, `drink_rest`, `wag_greet` | Ưu tiên `play_bow` vào buổi chiều khi gặp An/Chi ở `Công viên`; ưu tiên `drink_rest` sau 2 vòng chạy | Khi mưa: trú ở hiên `Sân chung`. Khi robot đang `play`: chạy vòng nhỏ quanh robot |
| **Đàn sẻ (3–5 cá thể)** | `flock_forage`, `perch_tree`, `hop_together`, `roost_night` | Ưu tiên `flock_forage` ở `Vườn nhỏ` vào `dawn`/`morning`; ưu tiên `roost_night` trên tán cây khi `daylight < 0.2` | Dùng luật Boids nhẹ (separation + cohesion trên mặt phẳng 2D) quanh tâm đàn; khi robot đi sát `< 55px` thì nhảy dịch sang ô cỏ kế bên |

### 4.3 Tương tác hai chiều Robot ↔ Động vật
- Khi robot thực hiện hoạt cảnh có tag `care:animal` (ví dụ An chơi bóng với Cún ở Công viên, Chi ngồi yên đọc sách cạnh Mướp), mức độ quen thuộc (`animalTrust[personId][animalId]`, từ `0..100`) tăng nhẹ `+1..+2`.
- Khi `animalTrust > 60`, bán kính an toàn thu hẹp lại: Mướp sẵn sàng nằm ngủ ngay cạnh ghế đá có Chi ngồi; Cún đi bộ song song cùng An một đoạn trên Phố đi bộ.

### 4.4 Phân định ranh giới giữa Luật và LLM
- **Luật + Utility AI (chạy 100% tất định trong `lib/life.ts`):** Quyết định vị trí, tư thế (`walking`, `resting`), hướng nhìn và phản ứng khoảng cách của Mướp, Cún, Đàn sẻ ở mọi khung hình.
- **LLM (chỉ trong lượt sinh sự kiện):** Chỉ được *quan sát trạng thái hiện tại của động vật để đưa vào lời kể hoặc hội thoại của robot* (ví dụ: *"Nhìn kìa, Mướp đang nằm cuộn tròn dưới hiên bếp tránh mưa"*), tuyệt đối không điều khiển tọa độ từng bước của động vật.

---

## 5. Giọng nói và biểu đạt âm ngữ [Đề xuất]

### 5.1 Giai đoạn 1 (Trực tiếp trên trình duyệt): "Tiếng ríu" Web Audio (Animalese / Robot Chime)
Thay vì gọi API Text-to-Speech (TTS) tốn băng thông, có độ trễ và dễ làm lộ giọng máy gượng gạo, mỗi khi bong bóng thoại (`SpeechBubble`) xuất hiện và người dùng đã bật âm thanh:
- Dùng **Web Audio API (`OscillatorNode` + `GainNode` + `BiquadFilterNode`)** phát chuỗi âm tiết ngắn (40–65 ms/âm tiết) đồng bộ với từng từ trong câu thoại.
- Mỗi robot có **dấu vân tay âm sắc riêng** tính tất định từ mã ký tự tiếng Việt:
  - **An (Cam — năng động):** Sóng `triangle` kết hợp âm `sine`, cao độ cơ sở `360–440 Hz`, nhịp nhanh, ấm và sáng.
  - **Bình (Xanh — điềm tĩnh):** Sóng `sine` lọc thông thấp (`lowpass 900 Hz`), cao độ cơ sở `250–310 Hz`, nhịp đều đặn, trầm ấm.
  - **Chi (Xanh lá — dịu dàng):** Sóng `sine` cộng họa âm bậc hai nhẹ, cao độ cơ sở `420–510 Hz`, đường bao âm (`attack/release`) mềm mại như tiếng chuông gió nhỏ.
- **Ưu điểm:** 0 KB file âm thanh tải thêm, 0đ chi phí API, chạy offline 100%, rất hợp thẩm mỹ robot nhỏ kiểu WALL-E / Animal Crossing.

### 5.2 Giai đoạn 2 (Chỉ dành cho xuất bản Video / Tóm tắt ngày Offline)
Khi chủ dự án mở lại Phase 5 (xuất video ngắn cho mạng xã hội):
- Chạy tổng hợp giọng nói tiếng Việt offline trong pipeline dựng video (không chạy trực tiếp trên web của người xem).
- Yêu cầu kiểm tra kỹ giấy phép thương mại/phi thương mại của mô hình TTS trước khi dùng và luôn gắn nhãn minh bạch là giọng đọc tổng hợp.

---

## 6. Kiến trúc âm thanh đường phố và môi trường [Đề xuất]

### 6.1 Ba lớp âm thanh (Soundscape Layers)
Hệ thống âm thanh **mặc định tắt (`muted = true`)** khi mới mở trang để tôn trọng người dùng; chỉ khởi tạo `AudioContext` sau thao tác chạm nút **Bật âm thanh** trên HUD:

1. **Lớp Nền theo Pha & Thời tiết (Ambience Bed):**
   - Sáng/Chiều: tiếng gió xào xạc qua tán cây (lọc nhiễu trắng/hồng `pink noise` qua bộ lọc thông dải `bandpass` điều chế chậm bằng LFO).
   - Mưa rào (`rain`): tiếng mưa rơi đều trên mái tôn/mái ngói và hiên quán (tổng hợp thủ tục bằng Web Audio từ `white noise` + lọc cộng hưởng giọt nước).
   - Tối/Đêm (`evening`/`night`): tiếng dế kêu nhẹ ở công viên và tiếng quạt thông gió êm.
2. **Lớp Đô thị theo Khung nhìn Camera (Spatial Street Layer):**
   - Âm lượng tỷ lệ nghịch với khoảng cách từ tâm `viewBox` tới Đường Bình Minh / Quảng trường.
   - Tiếng xe chạy qua nhẹ nhàng, tiếng chuông xe đạp xa, tiếng ly tách lách cách khi camera zoom vào `Phố cà phê`.
3. **Lớp Hành động & Thoại (Spot SFX & Robot Chime):**
   - Tiếng tưới nước rào rào khi `kind === 'garden'`, tiếng lật trang giấy ở `Thư viện`, tiếng gõ nhẹ ở `Xưởng sáng tạo`, và tiếng ríu khi có `speech`.

### 6.2 Chính sách bản quyền âm thanh
- **Ưu tiên số 1:** Tổng hợp thủ tục bằng Web Audio API (code thuần dưới 150 dòng, không tốn dung lượng tải).
- **Ưu tiên số 2:** Tự thu âm thực tế tại TP.HCM bằng điện thoại của chủ dự án (tiếng mưa Sài Gòn, tiếng quán cà phê sáng, tiếng chim sẻ ngoài hiên), nén chuẩn `.opus`/`.webm` (≤ 40 KB/sample).
- **Nếu dùng mẫu bên ngoài:** Chỉ dùng file có giấy phép **CC0 (Public Domain)** đã xác minh nguồn gốc và lưu thông tin vào `docs/AUDIO_SOURCES.md`.

---

## 7. Mô hình dữ liệu mở rộng và Event Sourcing (`db/schema.ts` & `drizzle/0001`)

Để hỗ trợ replay, kiểm toán lịch sử, truy xuất ký ức gắn người chứng kiến và theo dõi lời hứa mà không phá vỡ tương thích ngược của bảng `worlds` và `episodes`:

### 7.1 Nguyên tắc Event Sourcing lai (Hybrid Snapshot + Event Log)
- **`episodes` là nguồn chân lý lịch sử (Audit & Replay Log):** Mỗi sự kiện lưu trọn vẹn `{ title, summary, dialogue, changes, relationship, contextId, revisionBefore, revisionAfter }` (đã sửa lỗi L2 trong `lib/apply-event.ts`).
- **`worlds` là bản chụp trạng thái hiện hành (Fast Read Snapshot):** Giúp `GET /api/world` phản hồi tức thì trong 1 truy vấn đọc mà không phải cộng dồn hàng nghìn sự kiện từ đầu.

### 7.2 Bốn bảng mở rộng trong Migration `0001_living_world_and_training.sql`
1. **`memories`**: Lưu từng ký ức tách rời với `person_id`, `event_id`, `kind` (`observation | reflection`), `importance` (`1..5`), và `witnessed_with` (JSON mảng nhân vật cùng có mặt) để truy xuất đúng những gì nhân vật thực sự chứng kiến.
2. **`commitments`**: Lưu lời hứa có cấu trúc (`from_id`, `to_id`, `text`, `due_at`, `status: 'open' | 'done'`, `event_id`) để AI không quên việc đã hứa (như An hứa rửa bát, Bình hứa đối chiếu sổ).
3. **`tick_runs`**: Ghi vết mọi lần chạy tự động (`started_at`, `finished_at`, `status`, `model`, `event_id`, `neurons_est`, `error`) phục vụ `/api/health`.
4. **`nudges`**: Lưu gợi ý ngắn của chủ dự án ("chiều nay mưa lớn", "An tìm được mối mua tắc giá rẻ") để lượt AI tiếp theo đọc và lồng ghép tự nhiên vào cốt truyện.

---

## 8. Mô hình phân quyền: Viewer vs Admin [Đề xuất]

### 8.1 Hiện trạng
- Trên nền tảng Sites hiện tại, ứng dụng đang ở chế độ **owner-private** (chỉ chủ sở hữu truy cập). Mọi route `/api/*` tin cậy vào lớp xác thực của nền tảng phía trước cộng với `validOrigin(req)` chống CSRF trên trình duyệt.

### 8.2 Thiết kế tách quyền khi mở rộng cho người xem (Viewer Mode)
Khi chủ dự án quyết định cho phép bạn bè hoặc người xem công khai vào ngắm xóm (sau khi có quyết định rõ ràng, không tự ý đổi audience theo quy tắc `AGENTS.md`):

| Thao tác / Dữ liệu | Viewer (Người xem) | Admin (Chủ dự án) | Tác nhân AI (Tick / Automation) |
|---|---|---|---|
| Xem bản đồ, thời tiết, hoạt cảnh, nhật ký công khai | ✔ Được phép (`GET /api/world`) | ✔ Được phép | ✔ Được phép |
| Xem camera đạo diễn tự động, bật/tắt âm thanh cục bộ | ✔ Lưu ở `localStorage` máy khách | ✔ Được phép | — |
| Tạm nghỉ / Tiếp tục thế giới (`POST /api/world`) | ✖ Chặn (403 Forbidden) | ✔ Xác thực qua session chủ / Cloudflare Access | ✖ Không gọi |
| Ghi sự kiện mới (`POST /api/events`) | ✖ Chặn (403 Forbidden) | ✔ Được phép | ✔ Xác thực bằng Bearer Token ký riêng (`XOM_AGENT_TOKEN`) |
| Gửi gợi ý đạo diễn (`nudges`), tải full backup | ✖ Ẩn UI & chặn API | ✔ Được phép | ✖ Chỉ đọc `nudges` |

---

## Phụ lục G — Nguồn tham khảo cho thiết kế mở rộng

| Chủ đề | Nguồn tham khảo | Mức áp dụng |
|---|---|---|
| Tập tính mèo, chó, chim sẻ | Cats Protection, RSPCA, Dogs Trust, Cornell Lab of Ornithology (xem chi tiết tại [docs/ANIMAL_BEHAVIOR.md](ANIMAL_BEHAVIOR.md)) | Đã áp dụng vào luật mô phỏng và bộ kiểm tra đạo đức sinh thái |
| Kiến trúc bộ nhớ & suy ngẫm (Memory Stream & Reflection) | Park et al. (2023), *Generative Agents: Interactive Simulacra of Human Behavior*, arXiv:2304.03442 | Áp dụng rút gọn vào bảng `memories` (`importance`, `witnessed_with`, `kind`) |
| Chuyển động bầy đàn (Flocking / Boids) & Steering | Craig Reynolds, *Steering Behaviors For Autonomous Characters* (GDC 1999) & *Boids* (xem [docs/ANIMATION_SOURCES.md](ANIMATION_SOURCES.md)) | Tham khảo cho chuyển động nhóm và lộ trình mở rộng đàn sẻ |
| Tổng hợp âm thanh thủ tục trên trình duyệt | MDN Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`) | Thiết kế cho tiếng ríu nhân vật (§5.1) và tiếng mưa/gió (§6.1) |
| Tự đánh giá & phản tư cho tác nhân LLM | Shinn et al. (2023), *Reflexion: Language Agents with Verbal Reinforcement Learning* & Rafailov et al. (2023), *Direct Preference Optimization (DPO)* | Đã hiện thực hóa trong `lib/training.ts`, `data/training/dpo-preference-pairs.json` và `data/training/self-play-curriculum.json` |

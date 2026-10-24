# Kiểm thử, Bằng chứng & Danh sách Nghiệm thu (`TESTING.md`)

---

## 1. Bốn bộ Kiểm thử Đơn vị Thuần (`npm run test:unit`)

Toàn bộ 4 bộ kiểm thử dưới đây chạy độc lập trong bộ nhớ, không cần kết nối mạng và tuyệt đối không ghi vào cơ sở dữ liệu production:

| Bộ kiểm thử | Lệnh chạy | Nội dung xác minh | Kết quả |
|---|---|---|---|
| **1. Mô phỏng & Đồng hồ thế giới** | `node scripts/test-life.mjs` | Đồ thị 26 nút nối thông mọi cặp địa điểm; nội suy đường đi; không nhảy vị trí ở ranh giới routine; đồng hồ tạm dừng/tiếp tục; ưu tiên & hết hạn `plan`; **xác minh sửa lỗi L1 (`resolveTransitionOrigin`)**; **xác minh đồng hồ thế giới `worldTime` & thời tiết tất định `weatherAt`**; biên camera `followView` | **PASS** |
| **2. Hợp đồng Schema Sự kiện** | `node scripts/test-events.mjs` | Chấp nhận sự kiện AI mới có `plan`, `contextId`, `atSecond`, `location` và sự kiện định dạng cũ; từ chối địa điểm sai, thời lượng bước ngoài `[30, 180]`, plan quá 8 bước, hoặc động vật làm người nói (`speaker: 'muop'`) | **PASS** |
| **3. Hoạt họa, Giao thông & Thoại** | `node scripts/test-animation.mjs` | Pha đèn giao thông loại trừ lẫn nhau; xe di chuyển và dừng chờ đèn đỏ; dừng ổn định khi `paused`; ngắt dòng câu thoại dài (`wrapSpeech`); bong bóng thoại AI đúng thời điểm và không hiện khi đang đi bộ; căn lề camera (`bubbleOffset`) | **PASS** |
| **4. Tổng hợp Bối cảnh & Bộ AI Tự Training** | `node scripts/test-training.mjs` | Kiểm tra toàn vẹn 16 hoạt cảnh (`data/scenes.json`), 24 bối cảnh đa chiều (`neighborhood-contexts.json`), 6 mẫu Golden Episodes chuẩn SFT (`sft-golden-episodes.json`), 6 cặp đối chiếu ưu tiên DPO (`dpo-preference-pairs.json`) và giáo trình 8 cấp độ (`self-play-curriculum.json`) | **PASS** |

---

## 2. Kết quả Kiểm tra Mã nguồn, Kiểu dữ liệu & ESLint (24/10/2026)

- **Định dạng & ESLint (`npm run lint`):** Đã sửa toàn bộ 20 lỗi và 6 cảnh báo được ghi nhận trong báo cáo review trước (loại bỏ hoàn toàn `any`, sửa `react-hooks/refs` trong `CityMap.tsx`, sửa `react-hooks/set-state-in-effect` trong `useLife.ts` và `app/page.tsx`, sửa `react-hooks/purity` và `@next/next/no-html-link-for-pages` trong `app/page.tsx`, sửa `prefer-const` và `no-unused-vars` trong `lib/life.ts`).
- **Kiểm tra cú pháp & kiểu TypeScript (`tsc --noEmit`):** 0 lỗi.
- **Kiểm tra gói bàn giao (`scripts/package-handoff.py`):** 100% tệp khớp mã băm SHA-256 trong `TRANSFER_MANIFEST.json`, có mặt đầy đủ `.gitignore` và `.npmrc`, không có khóa bí mật hay tệp rác.

---

## 3. Chốt chặn An toàn cho Script Kiểm thử có ghi (`test-world.mjs` & `verify-live.py`)

- Cả hai script `scripts/test-world.mjs` và `scripts/verify-live.py` đều có chốt chặn kiểm tra hostname ở ngay đầu tệp: mặc định chỉ cho phép chạy với `localhost`, `127.0.0.1`, `::1`, `terminal.local` và từ chối mọi URL từ xa trước khi gửi bất kỳ request mạng nào.
- Không sử dụng hai script này lên môi trường production thật.

---

## 4. Danh sách Nghiệm thu Giao diện (Acceptance Checklist) khi chạy Preview

- [ ] Khởi động DB local với migration `0000` và `0001`, mở trang không có lỗi console.
- [ ] Khu phố hiển thị đúng pha ngày/đêm (`worldTime.phaseLabel`) và nhãn thời tiết (`weatherState.label`).
- [ ] Chọn chế độ **Theo (`Follow`)**: camera bám theo nhân vật trong biên bản đồ; chọn khu vực sẽ tắt chế độ Theo.
- [ ] Bấm **Tạm nghỉ (`Pause`)**: toàn bộ robot, động vật, xe cộ dừng tại chỗ; bấm **Tiếp tục (`Resume`)** đi tiếp mượt mà không bị nhảy vị trí.
- [ ] Chèn kế hoạch AI mới giữa lúc robot đang đi: robot xuất phát từ vị trí hiện tại (`resolveTransitionOrigin`), không nhảy lùi.
- [ ] Tab **Nhịp sống**: hiển thị rõ thống kê 24 bối cảnh đa chiều, bộ dữ liệu SFT/DPO/Curriculum và bối cảnh gợi ý theo giờ hiện tại.

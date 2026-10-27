# Rà soát và phát triển trong Codex Cloud

> Bản mở rộng mới nhất: [An và RealContext TP.HCM](LIVING_REALTIME.md) — đọc trước các ghi chú lịch sử dưới đây.

Báo cáo này phản ánh kiểm tra trên checkout `/workspace/AI-Living`, không phải trạng thái production. Các tuyên bố trong tài liệu bàn giao cũ là lịch sử do bên bàn giao cung cấp; chỉ những kết quả dưới đây đã được kiểm chứng lại trong môi trường này.

## Phase 1 — Tiếp nhận và môi trường local

- Xác minh 194 hash SHA-256 trong manifest ZIP gốc khớp hoàn toàn. Nhập 195 tệp từ ZIP, giữ nguyên source gốc ở commit `702a7ba` và push lên `main`.
- Node 24.19.0, pnpm 11.25.0; cài frozen lockfile, giữ nguyên lockfile và chính sách xác minh gói.
- TypeScript, ESLint, bốn bộ unit test gốc và build đều đạt.
- Chạy Workers/D1 local; áp dụng migration 0000/0001, không tác động production.
- `scripts/setup-local.mjs` kiểm tra hai bảng gốc trước khi khởi tạo, từ chối schema gốc thiếu một bảng; áp dụng mở rộng không xóa dữ liệu. Đã chạy hai lần liên tiếp và kiểm tra snapshot/episodes vẫn còn.
- Sửa cấu hình XDG của công cụ để Wrangler dùng thư mục ghi được trong checkout, không cần đổi HOME.

## Phase 2 — Thời gian và chuyển động liên tục

Qua đối chiếu mã, bản bàn giao chưa thực sự khắc phục hoàn toàn L1: chọn địa điểm gần nhất vẫn gây nhảy vị trí. API đổi tốc độ cũng chỉ gán scale lên toàn bộ tuổi xóm.

- Chốt anchor ở thời gian mô phỏng hiện tại khi đổi tốc độ/tiếp tục. Không nhân lại toàn bộ lịch sử đã trôi qua.
- Kế hoạch mới lưu `originPath` chứa vị trí chính xác và phần đường đi bộ chưa hoàn tất; giữ offset riêng của từng cư dân. Có thể ngắt một kế hoạch bằng kế hoạch khác mà không nhảy vị trí.
- Kế hoạch và sự kiện mới lưu `simStartedAt`; thời lượng và lời thoại dùng cùng đồng hồ mô phỏng. Kế hoạch/sự kiện cũ vẫn đọc được theo nhánh tương thích, nhưng thời gian thoại cũ không thể khôi phục đầy đủ lịch sử pause/tốc độ trước đây.
- API điều khiển kiểm tra Zod: từ chối null, mảng, tốc độ sai kiểu/ngoài 1–60, thời tiết ngoài danh mục, trường không hỗ trợ. Không cần migration SQL cho các trường snapshot/episode JSON mới.
- Kiểm thử hồi quy: 100 thời điểm × 3 cư dân, ngắt kế hoạch lặp, pause/đổi tốc độ/resume, mốc Unix epoch, hết hạn kế hoạch và đồng bộ lời thoại.

## Phase 3 — Nhịp sinh hoạt trong ngày

- `lib/daily-routines.ts`: lịch riêng 24 giờ cho An, Bình, Chi theo đồng hồ Việt Nam. Có sáng/trưa/tối, làm việc, chăm vườn, gặp gỡ và nghỉ đêm; thay cho vòng lặp khoảng 10 phút bất kể ngày đêm.
- Kế hoạch AI ưu tiên hơn lịch nền. Khi hết kế hoạch, cư dân tiếp tục từ nơi đến cuối cùng về lịch trong ngày.
- Kiểm thử đủ 86.400 ranh giới giây × 3 cư dân, gồm nửa đêm, nghỉ trưa và hết kế hoạch.
- Đây là projection bằng luật: không tự ghi thêm tiền, kỹ năng, ký ức hay giả lập một lượt LLM.

## Bằng chứng xác thực

- `npm run test:unit`: 6 bộ kiểm thử đạt.
- `npm run check`, `npm run lint`, `npm run build`: đạt. Vinext vẫn cảnh báo không phân loại tĩnh được trang `/`; build hoàn tất, không xem cảnh báo này là bằng chứng route hỏng.
- Kiểm thử API local: ghi/readback, số tiền, idempotency, revision cũ, pause/resume, origin, dữ liệu điều khiển sai và đổi tốc độ liên tục đều đạt.
- Chromium thật: desktop 1440×1000 và mobile 390×844, không có pageerror hay tràn ngang; bản đồ render, pause/resume, follow camera, đổi khu vực tắt follow, tab Nhịp sống và Nhật ký hoạt động. Chạy với reduced motion để chụp ổn định. Chưa đo hiệu năng trên điện thoại vật lý.
- Ảnh thật local preview: (ảnh 2D cũ đã gỡ; xem THREE_ONLY_AND_PETS.md), (ảnh 2D cũ đã gỡ; xem THREE_ONLY_AND_PETS.md). Nhật ký trong ảnh là dữ liệu kiểm thử local.

## Việc còn thiếu — thứ tự tiếp theo

1. **Sinh thái có phản hồi:** động vật vẫn chạy lịch ngắn cũ; chưa trú mưa/ngủ đêm theo loài, chưa có cây trồng tiến triển và tương tác chăm sóc. Cần chuyển trạng thái giữ liên tục vị trí, tránh đổi tọa độ tức thì khi thời tiết đổi.
2. **Trí nhớ/lời hứa có cấu trúc:** bảng `memories`, `commitments`, `nudges` mới là nền schema; API sự kiện chưa ghi những bảng này. Snapshot có ký ức chuỗi và lời hứa seed, chưa phải truy xuất ký ức theo người chứng kiến đầy đủ. Cần hợp đồng sự kiện, ghi nguyên tử, kiểm thử lịch sử và tương thích dữ liệu cũ.
3. **Lượt AI phía server:** worker chưa có scheduled handler; `tick_runs` chưa được ghi tự động. Bộ SFT/DPO/curriculum là dữ liệu mẫu và bộ chấm theo heuristic, không phải hệ thống train model đang chạy. Không suy luận có AI liên tục từ hoạt cảnh client.
4. **Đồng thời:** retry cùng ID sau khi revision guard thất bại có thể nhận 409 thay vì duplicate-success. Không nhân đôi tác động nhưng cần thêm integration test đồng thời và chuẩn hóa response.
5. **Production:** không có công cụ Sites/automations trong phiên này. Chưa kiểm tra audience, scheduler, migration hoặc dữ liệu `-stale` live. Không tạo schedule thay thế; chỉ xử lý sau khi kết nối đúng project, xác minh quyền và sao lưu D1 thật. Không bật billing/video/social.
6. **Vận hành:** `/api/health` hiện trả `lastTick:null` cho cả trường hợp chưa có tick và lỗi truy vấn; nên phân biệt missing migration/lỗi DB với chưa có lượt chạy.

## Khởi động lại

```bash
cd /workspace/AI-Living
corepack pnpm install --frozen-lockfile
npm run build
node scripts/setup-local.mjs
npm run dev -- --host 127.0.0.1 --port 5173
```

Kiểm tra nội bộ `GET /api/world` và `/api/health`. Không đưa link localhost thành preview công khai. Cloud task đã tách biệt; dùng checkout hiện tại, không tạo worktree trừ khi người dùng yêu cầu. `install_script` và `start_skill` đã lưu trong bản nháp cấu hình; người dùng cần review/save trong Environment settings và Publish để kích hoạt snapshot cho task mới. Việc lưu cấu hình không có nghĩa đã publish.

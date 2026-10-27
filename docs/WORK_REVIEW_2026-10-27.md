# Tiếp tục bugfix trên work — 27/10/2026

## Nhánh và nguồn triển khai

Khi bắt đầu, GitHub `main` ở `a5b7c5a`, `work` ở `5d50e17`. Main là tổ tiên của work; work hơn 10 commit, không có commit riêng của main cần merge thêm. Checkout local tên work nhưng còn ở a5b7c5a; đã fast-forward lên origin/work trước khi sửa. Các commit trong lượt này được push lên work, không push main.

Ledger `docs/releases/latest.json` vẫn ghi production 11 từ `c1ddea15e5b59631600796ea49d76bae9c49ddcb`. Đây là thông tin đã lưu trong repository, chưa xác minh trực tiếp production trong lượt này. Chưa deploy hoặc áp dụng migration production.

## Bug đã tái hiện và sửa

Hàng đợi diagnostics giới hạn 32 log/batch nhưng endpoint giới hạn 16 KiB cho toàn bộ JSON UTF-8. Với 32 log hợp lệ có 7 field, mỗi field 100 ký tự `猫`, request vượt giới hạn. Server trả 413; client giữ cùng batch để retry nên log phía sau cũng không được gửi. Regression tái hiện fail trước sửa.

`lib/diagnostics.ts` nay tính byte UTF-8 của từng log, dấu phẩy và envelope JSON để chỉ gửi phần đầu vừa 16 KiB. Data được chuẩn hóa theo giới hạn endpoint: tối đa 8 field, key <= 32 ký tự, string <= 100 ký tự, loại số nonfinite. Chỉ xóa phần đã gửi sau JSON `ok:true`; HTML 200, JSON từ chối và lỗi mạng vẫn giữ hàng đợi. Không đổi API, SQL hoặc migration. Test Unicode xác nhận nhiều request lần lượt gửi đủ 32 log, giữ phần chưa ACK; thêm test field quá dài/nonfinite.

Checkpoint sửa lỗi: `20c7152`; kiểm tra chuẩn hóa và tài liệu: `1df9f76`. Bản ghi QA cuối được commit sau hai mốc này.

## Kiểm tra trên source mới

- Cài pnpm 11.25.0 bằng frozen lockfile của work; không sửa dependency trong lượt này.
- `npm run test:unit`: đạt toàn bộ 30 lệnh suite, gồm regression telemetry mới và quality budget.
- `npm run check`, `npm run lint`, `npm run build`: đạt. Build còn cảnh báo chunk lớn và phân loại route Vinext.
- `node scripts/setup-local.mjs`, `npm run test:api:local`: đạt. D1 riêng kiểm tra owner guard, giới hạn byte/schema/origin/rate/retention, pulse persistence/retry/pause; không truy cập production.
- Compiled Worker local: `/api/health` 200 với ok=true/database=ready; `/api/world` 200 có world/events; `/` 200 HTML.
- `python3 scripts/qa-social.py`: đạt desktop/mobile, đủ 6 lượt qua polling, luân phiên người nói, camera/select/follow/zoom, không tràn ngang/lỗi JavaScript. Balanced tự giảm eco trên SwiftShader; 65/51 draw call.
- `python3 scripts/qa-actions.py`: đạt 9 hành động với GLB thật và đạo cụ, không fallback/lỗi; chuyển preset vẫn đúng shadow map. Không coi cycle tại chỗ là xe đạp có vật lý di chuyển.
- `python3 scripts/qa-motion.py`: đạt 64 frame/9 giây, 63 frame di chuyển, stale=0, collision=0 trong fixture, bước lớn nhất 2,4053 unit; 155.796 triangle/46 draw call, effective quality=eco. Đây là mẫu SwiftShader, không phải benchmark điện thoại hoặc 60 FPS.

Ảnh chụp thật và metrics mới ở `docs/screenshots/social`, `actions`, `motion`. Tất cả là preview local dùng synthetic fixture, không ghi thế giới production. Không thay ảnh minh họa AI vào bằng chứng QA.

## Việc agent sau tiếp tục

Backlog tính năng: tag theo cặp/đổi vai, xe đạp di chuyển có collision toàn thân, thú theo chủ, household/density/traffic graph, LinUCB/skill gates, durable history/model A/B. Đọc PHASE_B_ACTIONS.md và MAIN_REVIEW_2026-10-27.md, chọn từng phần với tiêu chí nghiệm thu rõ ràng. Không coi backlog là bug đã fix.

Chưa kiểm tra điện thoại/GPU thật, soak 30 phút/24 giờ, toàn bộ route và mọi tình huống kẹt vật lý. Trước phát hành cần backup mới, xác minh trạng thái migration 0006 trên production và giữ owner-private. Push checkpoint work cùng MEMORY_SHORT.md trong quá trình làm; không commit DB/secrets/cache. Không dùng kiểm thử local lên production.

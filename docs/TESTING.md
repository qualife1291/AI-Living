# Kiểm thử và bằng chứng

## Đã thực hiện trong môi trường gốc

- node scripts/test-life.mjs: PASS graph nối mọi địa điểm, interpolation, không teleport ở routine boundary, pause/resume clock, ưu tiên/hết hạn plan, 3 động vật, camera bounds.
- node scripts/test-events.mjs: PASS plan hợp lệ, từ chối destination/duration/length sai, không cho động vật nói như robot, event cũ vẫn hợp lệ.
- TypeScript noEmit: đã qua sau sửa cú pháp renderer.
- Vòng kiểm tra cuối trước ZIP: test-life PASS, test-events PASS, TypeScript noEmit PASS và production build PASS, gồm route cache và mã bàn giao.
- Browser smoke: UI nhịp sống và 3 động vật xuất hiện; nút Theo An pressed; đo được transform robot và viewBox camera; đã bật overlay đường đi. Chưa có phép đo hai thời điểm tự động được ghi vào báo cáo.
- Đã bấm pause ở preview; quan sát ngay sau đó vẫn là request đang chờ. Chưa xác nhận freeze/resume đầy đủ qua browser.
- Trước lớp sinh hoạt: bản đồ district zoom/reset, avatar robot và navigation đã qua QA, đã gửi ảnh.

## Chưa được chứng minh

Live persistence/schema/idempotency full integration pass, first scheduled run, mobile QA đầy đủ, plan switching giữa chừng, social co-location server validation, performance theo máy yếu. Không dùng test thuần như bằng chứng API production đã hoạt động đầy đủ.

## Rủi ro test cũ

scripts/test-world.mjs và verify-live.py có ghi. Một lần test stale dùng revision vẫn hợp lệ đã tạo scene lặp hậu tố -stale trên production. Chưa repair, chưa backup. Không chạy lại lên live để “test cho chắc”. Tạo DB test sạch và fixture riêng trước; scripts legacy cần refactor để mặc định không ghi production.

## Acceptance checklist khi tiếp tục

1. Cold start local DB, app load không lỗi; refresh giữ ký ức thật.
2. Robot đổi transform theo thời gian, đi trên graph, không xuyên nhà; quay video QA chỉ khi người dùng yêu cầu.
3. Chọn Follow: viewBox theo đúng robot, không vượt map; đổi khu tắt follow.
4. Pause đứng yên cả robot/animal/camera; refresh vẫn pause; resume không nhảy clock.
5. Reduced motion: không bobbing/working animation; camera không easing gây khó chịu. Cân nhắc tùy chọn tắt toàn bộ motion hiện vẫn chưa có.
6. New plan giữa chừng không teleport; hết plan về routine trơn tru.
7. Dialogue timed chỉ hiện đúng lúc, đúng nơi; journal luôn đọc lại được.
8. Event duplicate không tăng state; stale 409; invalid schema 400; pause chặn event; concurrent id có readback an toàn.
9. Screen hẹp: controls không bị che, follow có thể tắt, focus/keyboard rõ.
10. Ảnh mỗi đợt browser QA gửi người dùng kèm nhãn preview/production.

## Test commands

Dùng Node 24+, pnpm lock. Không cần network/LLM cho test-life và test-events. npm run check = TypeScript. npm run test:unit chạy cả hai test thuần.

## Kiểm thử animation và thiết kế cuối

- test-animation.mjs PASS: signal phases không xung đột, xe move/wait, pause projection ổn định, wrap giữ đủ text kể cả chuỗi dài không khoảng trắng, timed AI speech có walking guard; bubble offset biên camera và actor ngoài view.
- Browser Workshop: Vẫy tay/Lời thoại mẫu controls pressed; arm-right computed matrix thay đổi từ matrix(-0.353912,-0.935279,0.935279,-0.353912,0,0) sang matrix(-0.486518,-0.873671,0.873671,-0.486518,0,0).
- Browser scene: tree canopy computed matrix thay đổi độc lập; main-west vehicle transform đổi vị trí qua hai lần quan sát, main-east đã có waiting=true tại stop point. Chưa test right-of-way với người đi bộ.
- Ảnh thiết kế cuối ở docs/screenshots/character-design-final.jpg; snapshot preview, không phải bằng chứng live đã xuất bản.
- Ba bộ Node tests, TypeScript và production build được chạy ở vòng cuối. Các giới hạn API/live/mobile/plan-transition ghi phía trên vẫn chưa tự động được giải quyết bởi animation update.

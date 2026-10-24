# Bàn giao sang Codex

## Bổ sung v2

Đã làm robot articulated chi tiết, Workshop trong Cư dân, speech wrapped single-speaker, môi trường/động vật và 4 xe theo phase. Đọc docs/ANIMATION_SOURCES.md. Chạy thêm node scripts/test-animation.mjs. Bản v2 là nguồn bàn giao, chưa publish. Ưu tiên tiếp theo: đồng bộ pedestrian crossings với đèn xe, xử lý bubble sát biên camera, QA plan transition và pause/resume. Không gọi traffic hiện tại là collision-free.

## Mục tiêu ngay khi mở ZIP

Tiếp tục lớp sinh hoạt đang viết, kiểm tra chính xác chuyển động/camera/tạm dừng rồi cho ra một bản dùng được. Không bắt đầu bằng dựng lại UI hoặc thay framework. Đọc AGENTS.md và bộ nhớ trước.

## Những gì đã có

- Ba robot An (cam, thích kinh doanh), Bình (xanh, kỹ tính), Chi (xanh lá, thích nấu ăn).
- Bản đồ SVG 1200×780: khu nhà, đường lớn, lối đi, quảng trường, quán cà phê, thư viện, công viên, xưởng, vườn/bếp chung.
- Snapshot world và episodes lưu trong D1, kiểm tra Zod, revision guard, transaction, event id chống retry.
- Lớp mới: shortest paths trên pedestrian graph; hoạt động theo bước; nội suy tọa độ; AI plans được ưu tiên; fallback routines; 3 động vật theo luật; camera theo robot; overlay đường đi, bong bóng và bảng nhịp sống.
- Đồng hồ có pausedAt/pausedMs được lưu để pause không nhảy thời gian khi resume.
- Hai bộ test thuần, TypeScript noEmit và production build đã qua ở vòng cuối trước khi tạo ZIP; Codex mới vẫn nên chạy lại baseline trên môi trường của mình.

## Việc làm theo thứ tự

1. Cài dependencies từ pnpm-lock.yaml, chạy test-life, test-events, TypeScript và build.
2. Khởi tạo DB LOCAL mới bằng migration (không production), chạy preview.
3. Browser QA: đo transform robot ở hai thời điểm; bật Theo và kiểm tra viewBox dịch; đổi robot; tắt Theo/chọn khu; pause phải đứng yên, resume tiếp nối. Chụp ảnh thực tế cho người dùng.
4. Kiểm tra các kế hoạch AI mới đến có khớp vị trí đang mô phỏng không; hiện plan.from dùng location đã lưu, có thể gây nhảy khi kế hoạch mới thay routine giữa chừng. Sửa chuyển tiếp trước khi gọi là hoàn thiện.
5. Tối ưu cảnh, tránh robot/động vật che nhau; kiểm tra keyboard, reduced-motion, màn hình hẹp.
6. Test API local với event plan và dialogue.atSecond/location; kiểm tra ghi/readback và legacy events. Dùng DB test riêng, không sửa production.
7. Nếu có Sites, cập nhật tài liệu rồi push/package/deploy private và kiểm tra kết quả. Nếu không có quyền, bàn giao preview và ghi rõ chưa publish.
8. Kiểm tra tác vụ đã có bằng automations.peek, không tạo task mới. Không có last_run không chứng minh scheduler hỏng hoặc đã chạy. Xác minh actual result rồi cập nhật tài liệu.
9. Trước khi dọn event test production hậu tố -stale: backup/read snapshot, xác định thay đổi/nhớ lặp, thiết kế repair transaction có kiểm tra revision và báo kết quả; không xóa mù.

## Các giới hạn quan trọng

- Lớp sinh hoạt là deterministic projection trong browser; không phải server process suy nghĩ liên tục. Khi web đóng, không có animation; mở lại tính vị trí theo clock. Lịch LLM là tác vụ riêng, phụ thuộc tài khoản.
- Tiền/kỹ năng/quan hệ chỉ đổi khi ghi sự kiện thật, không tự tăng vì xem animation.
- Nhân vật chưa có needs planner và quan hệ tự học nâng cao; routine hiện là lịch theo tính cách. Không có simulation economy đầy đủ hoặc vòng đời sinh sản.
- Animals là behavior rules tham khảo tài liệu; chưa có nhu cầu/ký ức riêng lưu DB.
- Sidebar hồ sơ hiển thị snapshot đã lưu, bảng nhịp sống hiển thị projection hiện tại; cần làm rõ UI để tránh hiểu nhầm.
- Live tests cũ chưa có bằng chứng pass đầy đủ và có một test duplicate scene cần repair.

## Prompt khởi động gợi ý

“Đọc AGENTS.md, CODEX_HANDOFF.md, MEMORY_SHORT.md, MEMORY_LONG.md và ROADMAP.md. Tiếp tục dự án Xóm AI từ checkpoint này, không dựng lại từ đầu. Tất cả không phát sinh phí, video tạm hoãn. Làm lần lượt local tests → browser QA có ảnh → sửa motion/camera/pause/plan transition → tài liệu → deploy private nếu có quyền. Luôn phân biệt luật mô phỏng và LLM. Không chạy test có ghi lên production, không tạo automation trùng.”

## Checkpoint thiết kế cuối
An: kính đôi/đầu đa giác/đai dụng cụ; Bình: cảm biến tròn/thân hẹp; Chi: vỏ quả lê/tay tròn. Đã truy cập các nguồn chính chủ về thiết kế, ghi tại docs/CHARACTER_DESIGN.md. Camera-aware text wrapping đã bổ sung; cần kiểm tra layout ở viewport hẹp hơn nữa. Traffic vẫn chưa có pedestrian reservation/collision solver.

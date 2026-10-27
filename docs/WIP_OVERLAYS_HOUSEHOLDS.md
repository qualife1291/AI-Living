# Bàn giao khi tạm dừng — UI tên/thoại và household, 27/10/2026

Người dùng yêu cầu tạm dừng, push toàn bộ code và mô tả để agent khác tiếp tục. Không tự coi mốc này là bản phát hành hoàn tất. Chỉ thay đổi trên work; chưa merge main hoặc deploy production.

## Phần đã triển khai

1. UI tên: bỏ sprite/texture tên nhân vật đang chọn. WorldOverlays dùng pill kích thước cố định theo pixel, cao26px/rộng tối đa116px, ưu tiên selected/speaking, giới hạn16 nhãn gần trong khung, tránh chồng nhãn/thoại và ẩn sau body công trình. Tên dài có ellipsis/title đầy đủ. Nhấn nhãn chọn nhân vật qua data-actor-id.
2. Thoại: card co theo viewport (tối đa292px), tên hai người và badge AI/Kịch bản riêng, text đầy đủ, safe insets tránh HUD. Có đuôi trên/dưới theo vị trí. Reading ACK đi từ DOM commit qua CityRuntime.presentSpeech thay vì đánh dấu đã hiển thị ngay lúc gửi status. Chưa đổi giới hạn thời gian từng câu của SocialDirector.
3. PhaseC foundation: Resident.home lưu householdId/label/place trong snapshot. assignHomes gán nhóm tối đa4 người mới, giữ nguyên nhóm đã có, không đẩy người khỏi nhóm cũ dù đã vượt giới hạn. population và saveCatalog backfill metadata; helper đọc có thể derive cho legacy mà không ghi DB.
4. Hồ sơ NPC và roster hiển thị nhóm ở chung/thành viên. Không tăng dân số live, không tạo người giả, không đổi graph, địa điểm vật lý hoặc lịch trình về nhà. Đây là phân nhóm dữ liệu ở Khu dân cư, chưa phải chia nhà/căn hộ trên scene.

Các file chính:
- components/city/WorldOverlays.tsx, lib/city/overlay-layout.ts.
- components/city/City3D.tsx, components/city/three/runtime.ts, app/globals.css.
- lib/living/households.ts, schema.ts, engine.ts, service.ts.
- app/page.tsx, components/living/LivingPanel.tsx.
- scripts/test-overlay-layout.mjs, test-households.mjs, test-local-diagnostics.mjs.
- scripts/qa-overlays-households.py, docs/screenshots/overlays-households/.

## Kết quả đã có

- Full35lệnh unit suite, TypeScript, lint và build đạt trước tinh chỉnh chiều rộng/anchor nhãn cuối. Sau tinh chỉnh cuối, test-overlay-layout/check/lint/build đã chạy đạt lại. Không dùng kết quả cũ để khẳng định các kiểm tra chưa chạy.
- API D1 local thật: legacy household backfill qua catalog POST/revisionCAS, lưu lặp không đổi nhóm, không mất cư dân/ký ức/people/petOwners; stale revision409. Các guard/pet assignment/pulse tests cũ cũng đạt.
- Unit household: legacy backfill thuần, lặp lại/reorder sau khi đã gán ổn định, giữ lịch sử/nhóm cũ, tăng dân số giả lập tới240 người/60 nhóm. Đây không phải bật density240 trong ứng dụng.
- Browser harness cuối đã hoàn tất cả desktop1280×800 và mobile390×844; metrics.json đã ghi. Kiểm tra pill compact, chọn đúng nhãn, card trong khung, nguồn Kịch bản/AI, hồ sơ nhóm4 người, tên dài và câu dài ở mobile320×640 đều đạt, không JavaScript error.
- Desktop sample3 nhãn, maxwidth71,59px; mobile sample1 nhãn, maxwidth58,39px. Các nhãn khác có thể bị giấu vì ngoài khung/bị che hoặc không còn chỗ khi có card; không khẳng định mọi tên đều luôn xuất hiện trong cảnh đông.
- Ảnh chụp thật là preview local trên Chromium SwiftShader, dùng fixture. Source=AI trong ca câu dài là fixture để kiểm tra badge, không phải bằng chứng model đã gọi/sinh nội dung. UI/profile browser dùng mock snapshot; persistence được kiểm tra riêng trên D1.
- Hai vòng harness đầu đã thất bại: quên mở lại drawer sau khi chọn NPC (UI đóng drawer theo thiết kế), và locator “nhãn chưa chọn đầu tiên” đổi đối tượng giữa đọc ID và click. Harness cuối mở lại drawer và click bằng ID ổn định; không bỏ assertion.

## Việc agent sau cần làm trước khi chốt

1. Chạy lại full35suite ở HEAD cuối, kiểm tra source diff và review ảnh mới. Không cần cài lại dependencies nếu vẫn còn node_modules hợp lệ.
2. Bắt buộc chạy lại scripts/qa-social.py để xác minh đủ6lượt/luân phiên người nói/controls sau bridge ACK mới. Chưa chạy được vòng đó: các command nối bằng && trước đây dừng do harness lỗi; vòng cuối chỉ chạy qa-overlays-households.py.
3. Review visually desktop/mobile, tên ngắn Bình không bị ellipsis, khoảng cách đầu-nhãn/nhãn-thoại, cảnh đông và khi xoay camera. Nhãn dùng anchor theo GLB/procedural ước lượng; chưa lấy head joint/bounds động từng pose. Đây là một hướng tinh chỉnh nếu còn khoảng cách chưa đẹp.
4. Kiểm tra đọc/ẩn giao diện, resize, loss/retry WebGL, pause và performance của ray/DOM labels nếu thay đổi tiếp. Không khẳng định đã chạy các regression browser này trong lượt UI.
5. Household hiện mới metadata. Còn individual-home anchors/routing/scene, density và traffic graph của phaseC; phaseD LinUCB/skillgates, durable dialogue history/modelA-B chưa hoàn tất. Không phục hồi renderer2D; giữ các giới hạn occupancy/completion nhiều viewer ở báo cáo trước.

Lệnh đã dùng:
- npm run test:unit; npm run check; npm run lint; npm run build.
- npm run test:api:local.
- QA_BASE=http://127.0.0.1:5188 python3 scripts/qa-overlays-households.py.
- Tiếp nối: QA_BASE=http://127.0.0.1:<port> python3 scripts/qa-social.py.
- Có compiled Worker local ở5188 trong phiên này; tiến trình không được giả định tồn tại ở task mới. Chạy lại Worker từ dist/server/wrangler.json hoặc npm run start sau build khi cần.

Source checkpoints đã push: c0aee68 (UI), 598c8ff (household), 3e57abc (width/anchor + harness). Commit bàn giao cuối sẽ chứa harness stress đã sửa, ảnh/metrics và tài liệu này. Không có migration, dependency mới, resetDB hoặc secrets trong mốc này.

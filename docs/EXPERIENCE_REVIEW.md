# Rà soát trải nghiệm, tỷ lệ và nhịp sống — 25/10/2026

## Nguyên nhân được xác minh trên version6
- Live paused=false, revision3, lastAI từ24/10, chưa có livingTurn được persist. GET world khởi tạo living trong response nhưng không lưu; chưa có updater production chạy.
- Renderer3D chỉ dùng livingSpeechAt, bỏ qua speechAt của2D nên chào hỏi theo proximity biến mất. Lịch ngày có quãng nghỉ/làm việc dài, không nên ép nhân vật chạy liên tục để giả hoạt động.
- Người40 worldunits so với xe hơi dài19, nhà dịch vụ thườngcao43: tỷ lệ sai. Quy ước mới10units/m, người17.5, xe44x18x14, buýt100, nhàdịchvụcao43 tương ứng4.3m. Đây là tỉ lệ mô hình cách điệu, không phải đo đạc kiến trúc thật.
- DPRmobile bị cap1, UI có backdrop blur nhiều lớp, fog gần; các yếu tố này làm hình ảnh kém nét. Không có tương tác chat hay view counter được persist.

## Tài liệu chuyên sâu đã đối chiếu
- [Three.js responsive drawing buffer](https://threejs.org/manual/pages/responsive.html): CSS size khác drawing buffer; cân bằng DPR với chi phí GPU. Áp dụng3preset có số đo pixel thật, không chỉ tăng CSSsize.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): batchdraw, giới hạn tài nguyên, dispose và fallback khi contextlost. Giữ instancing, đo drawcalls/geometries/textures, kiểm tra tháo renderer.
- [Game Programming Patterns — game loop](https://gameprogrammingpatterns.com/game-loop.html): logic thời gian độc lập frame rate. Mô phỏng ở đây dùng projectionthuần theo serverclock; render có cadence riêng, tránh trao reward từ animation.
- [Godot3D scale](https://docs.godotengine.org/en/stable/tutorials/3d/introduction_to_3d.html) và [resolution scaling](https://docs.godotengine.org/en/stable/tutorials/3d/resolution_scaling.html): đơn vị rõ ràng và đo tradeoff chất lượng. Không thay stack sang Godot; dùng nguyên tắc tương tự.
- [NN/g icon usability](https://www.nngroup.com/articles/icon-usability/): icon có nhãn ngắn, không bỏ hết chữ vì nhiều biểu tượng mơ hồ. HUD giữ nút44px, nhãn9–10px, nội dung trongdrawer14px và aria-label.

## Inventory và thay đổi
-33venue/32scenario đã có schema/route tests; lịch24h có sáng-trưa-tối-ngủ. Không sửa tất cả thành cảnhvideo hoặc giả lập tin giao thông.
- Người/xe/nhà: scale chung, wheel/light trên xe, đạo cụ nhỏ theo activity(read/work/garden/eat), gait và chuyển động thân nhẹ; thiếu rig/IK/va chạm/động tác nấu ăn chi tiết.
- Hội thoại: khôi phục cả nguồn AIevent/living và routine proximity trong3D. Visitor chat ghiDB và phản hồi goal/activity/memory theo luật, không trao money/skill từ text. Chưa chạy freeform LLM production.
- Nhịp sống: client pulse mỗi60s khi tabvisible, tickslot15min idempotent và học sau khi hoàn tất. Hẹn giờ unattended độc lập env cần automation; trạng thái thực ghi trong releaseledger. Không đồng nhất animation liên tục với serverthinking24/7.
- Views: random tab-session UUID,30min/session, insert-or-ignore+nonce nguyên tử để chống retry/concurrency. Không lưu IP/email/fingerprint. Tổng lượt mở, không phải uniquehumans/liveviewers. Bot vẫn có thể tạo session mới; chưa là analytics chốnggianlận.
- Feed chính dùng8event thay80; pausevisible rõ, polling ngừng tabhidden; background3D ngừngrender. PresetNhẹ/Cân bằng/Nét, bỏ blurHUD, màu trời/cây/nhà tươi hơn.

## Ma trận kiểm thử phát hành
- Unit: scale, response/provenance/no-mutation, finite24h walking+rest, pause/speed continuity, đườngđi, schema, weatherunavailable, animalpolicies, learningidempotency, migrationreader.
- API fixture riêng:16concurrent cùngviewSession chỉ+1;8sessions khác+8;8pulses không trùngturn; replyretryidempotent; unknownactor/size/origin/pauseguards; health.
- Chromium thực: desktop/mobileDPRcao, chọnquality, nhìn movement, đọc chatpersist, pause/resume, layout, WebGLcontextlost, khôngWebGL/reducedmotion. Ảnh là localpreview.
- Performance: ghi drawingbuffer/DPR/drawcalls/triangles/geometries/textures/heap. SwiftShader là software rendering, không dùng để tuyên bố FPS trên điện thoại thật. Không gọi một bài testngắn là soak24h hay game-studio certification.
- Production: backup trước migration5, native deploy, health, bảo toàn lịch sử và writer readback; không chạy fixture hoặc xóa DB thật.

## Còn thiếu cần ghi rõ
Indoor routing/elevatoroccupancy/call-serve-clean, animation tương tác vật thể và hội thoại LLM tự do chưa hoàn chỉnh. Không thể bảo đảm SLA24/7 hoặc zero-lag từ một phiên test; phải theo dõi scheduler/logs và benchmark GPU thật. Trước mở public cần tách quyềnviewer/admin, rate limits và cache theo tải thực.

## Kết quả đã kiểm chứng
-16suite thuần (gồm contextdeadline) đạt, TypeScript/lint/build đạt. Migration5 chỉ thêm3bảng và không sửa migration cũ.
- API fixture local:16viewretry+8uniquesessions,8pulseconcurrent, durablechat/retry/invalid/pause/resume đạt. Benchmark64read0error: p50~216ms,p95~357ms,max~358ms. Số đo env này, không phải SLA mạng thật; benchmark trước sửa coldcontext từng p95~13.3s.
- Chromium SwiftShader: desktop1280×800DPR1.5 và mobile390×844DPR3; movement/physicalproportions/DPRpresets/chat/pause/resume/offline/recovery/contextloss đạt. Desktop3D↔2D3vòng không tăng số geometry. KhôngWebGL và reducedmotion fallback đạt.
- Frame-state based pause test bắt được race response cũ; UI nay force refresh và bỏ snapshotrevision/timecũ. Test đợi renderer nhận pause và nhiều frame ổn định, không lấy sleep400ms làm bằng chứng.
- Desktop36drawcalls/10geometries/7textures, mobile33drawcalls/10geometries/6textures; JSheap khoảng12–13MB tại mẫu. Không suy ra FPSGPUthật, memoryleak-free dài hạn hay24hsoak.
- Ảnh và metrics: docs/screenshots/experience; fixture đang đi sân bay ở giờ trưa mô phỏng, slowmotion0.1 chỉ dànhQA, khôngdeploy statefixture. Counter trong ảnh là datafixture.

### Tái chạy fixture
Sau build, tạo DBlocal ở work/liveness-qa với migration0,4,5 (chỉ DBkiểm thử); chạy `node scripts/seed-experience-fixture.mjs` khi preview đã dừng. Khởi động Workerlocal port5177, statework/liveness-qa, XOM_LOCAL_ADMIN=true và contextrelayloopback theo LIVING_REALTIME. Chạy `python3 scripts/qa-experience.py`. Không chạy seed hoặc testAPI trênproduction. Nếu rebuilddist phải restartpreview để manifestassets đồng bộ.

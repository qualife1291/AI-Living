# Sửa lỗi hội thoại, chuyển động và đường đi — 26/10/2026

Phản hồi sau version8 là đúng: test trước chỉ quan sát đổi lượt đầu tiên, chưa chứng minh một cảnh trọn vẹn hoặc va chạm giữa mô hình và đường đi. Lần này kiểm tra đúng các lỗi người dùng đã gặp.

| Lỗi | Nguyên nhân | Thay đổi |
| --- | --- | --- |
| Chỉ nói1–2câu, chờ lâu | Bắt cặp lại mỗi snapshot; câu8giây/cooldown180giây theo simulationclock; khi scalechậm càng kéo dài | Một SocialDirector cho cả renderer, khóa cặp và toàn bộ4–6lượt,2,4–4giây/câu +0,3giây nghỉ theo presentationclock; cooldown20–45giây, pause vẫn dừng; đọc toàn bộ event/livingdialogue |
| Đi giật | Projection10Hz rồi nội suy về điểm đứng cũ; camera easing theo frame, clockoffset bỏ RTT | Projection/motion mỗi drawnframe, camera/yaw easing theo dt; clockoffset dùng midpoint và làm dịu, bỏ lerp cắt góc |
| Xuyên nhà | Graph/offset không có footprint chung, một số nhà nằm ngay trên đường; lỗi ghép điểm đầu trong A* mới bị test bắt | Sharedfootprints cho render/layout/navigation; dời khối nhà hư cấu khỏi asphalt, A* với radius4,8units và sweptsegment; route đi vòng công trình, không dùng đường thẳng để cứu tuyến không tìm được |
| Xe xuyên vật thể/nhau | Nhiều đường hở, wrap/pingpong, không làn/nhường/phanh |12xe trên vòng khép kín có góc bo/làn,4nút mở rộng asphalt, phanh–nhường người–giữ khoảng cách hàng xe; WalkDirector dùng vị trí xe thực |
| Mặt phố phẳng, tốn GPU | Ánh sáng bị rửa, cửa/mái đơn khối, vẽ chi tiết toàn thành phố | Giảm fill, viền mái/khung cửa/bậu/mái hiên sọc/bóng tiếp xúc; tầng cao3m; vật liệu nhẹ và chunkLOD cho chi tiết xa |

Đường đi ở đây là điều phối vị trí hiển thị trong khu phố3D hư cấu, không phải dữ liệu GPS hay một enginevật lý đầy đủ. Không sửa lịch sử/tiền/ký ức để che lỗi hình ảnh. Hình học khảo sát OSM vẫn là chế độ riêng. 2D dùng bộ hội thoại mới; chưa tuyên bố điều phối va chạm3D áp dụng cho mọi sprite của2D/nội thất.

## Kiểm tra thực hiện

-20suite trong `npm run test:unit`, TypeScript, lint và build. Social28cases: đủ6lượt qua polling15giây/người mới tới/đổi thứ tự, slowclock0,1x không kéo dài câu, pause/resume, AI thật ưu tiên và nguồn được giữ.
- Walkability8cases:1.089tuyến giữa33nơi,882tuyến cần A*,2.961sweptsegments,870điểm đẩy ra khỏi nhà,2.232đối chiếu spatialindex,5.401frame của3người với đổi plan/poll/pause. Tất cả tới đích và không xuyên footprint. Test đã bắt104tuyến sai trước khi sửa thứ tự nối firstCell/start.
- Traffic:22.740trạng thái xe qua2chu kỳ, kiểm tra OBB với279công trình và xe khác, góc rẽ nằm trên asphalt đã mở rộng, phanh/xếp hàng/chạy lại/người qua đường/pause. Không render xe buýt/metro trên các tuyến chưa đủ hình học quay đầu; các phần đó vẫn là roadmap.
- Phát lại snapshotowner trong bộ nhớ, không APIwrite:1.800frame/30cư dân,0giao nhà/xe. Payload nằm backupgitignored, không đưa vào source/screenshots.
- ColdA* trongenv: p50khoảng2,8–3,4ms, p95khoảng11–15ms, max47–50ms cho mẫu882tuyến; không phải SLA. Cache256tuyến; routesgiữ xuyên polling để không tìm đường lại mỗiframe.

`qa-social.py` ghi đủ6lượt từDOMmount, trên desktop1440×900 và mobile390×844, qua polling, khôngJSerror/tràn ngang. `qa-motion.py` lấy vị trí ở từng drawnframe và đối chiếu footprint; tách tỷ lệ vị trí cũ khỏi FPS. Ảnh/metrics tại `docs/screenshots/social` và `docs/screenshots/motion` là **synthetic local preview**.

MẫuSwiftShader trướcLOD chỉ có12drawnframes trong9giây dù không còn giữ vị trí theo10Hz. Không gọi đó là đã hếtlag. Vì vậy đã thêm chunkLOD/vật liệu nhẹ và đo lại cùngfixture; xem metrics mới và pre-lod-metrics. SwiftShader không thay cho GPU/điện thoại vật lý. Chưa có chứng nhậnFPS hoặc soak24giờ.

Mẫu cuối sauLOD ghi26frames/9giây,118.418triangles so với369.600trước đó, staleFrameRatio0,0va chạm với footprint, maxstep~2,408units. Đây là hơn gấp đôi số frame trên cùng máy dựng phần mềm và giảm khoảng68% hình học, **vẫn không phải tốc độ khung hình đạt yêu cầu trên thiết bị thật**. Không quảng cáo60FPS. Fullbrowserregression desktop/mobile cũng đạt pause/resume, offline/reconnect,3D↔2D/lifecycle/contextloss và noWebGL/reducedmotion. Sau xem ảnh còn sửa mặt cửa/mái bị đồng phẳng và cửa sổ chèn lên cửa chính.

## Chạy lại

Build trước, restart preview sau build. Với localD1 riêng và Node contextrelay, chạy `python3 scripts/qa-social.py` và `python3 scripts/qa-motion.py`. Hai script chặn worldresponse bằng fixture trong bộ nhớ và không ghi production. `qa-experience.py` bổ sung các thao tác điều khiển, mạng, fallback và lifecycle; dùng seed-experience-fixture chỉ với localDB được định sẵn. Không dùng test-world/verify-live với production.

Phát hành, SHA và readbackproduction được ghi riêng trong releaseledger. Không suy luận ảnhfixture là ảnh thế giới thật đang diễn ra.

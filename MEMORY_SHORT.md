# Việc còn lại sau production version9

## Bản10 — WIP, chưa phát hành
- Đã hoàn tất source: shared scenery94 cây/507 vật cản +279 khối nhà; tránh người bằng swept-disc/nhường lối/điểm đứng riêng; dời shelter bus và13 đèn khỏi đường, renderer dùng cùng tọa độ. Camera bám An/góc gần/easing; needs/reward/novelty/cohort luân phiên/giữ kế hoạch chưa xong; lịch NPC ngắn lệch ID. Slot living-v2 5phút, visible pulse30giây. Không trả phí, không nâng model.
- Full23suite/check/lint/build đạt; traffic786vậtcản/22740trạngthái0collision; autonomy8/personal7/camera180góc×5aspect đạt. Browserdesktop/mobile đủ6lượt+selectBình/followAn/zoom, motion29frames/9s/0stale/0collision. Ảnh local đã gửi, không là production. Phát hiện bubble mobile sát mép: đang rebuild sau clamp bubble/khởi tạo camera đúng two-shot/cập nhật chunkLOD theo camera. Cần chạy lại QA cuối, commit source sạch, release build/package/native deploy, readback + ledger push. Prod vẫn9; chưa phát hành10.
- Backup trước10:pre-v10-20261026-space.json gitignored; hashc39c1ac9c401e207a9b9b82f8d6996a0d4022df74d365354f18cfee876346918;revision65/12events/memories28,10,10. Sourceprod9 vẫn287f2d8.

Source đang chạy287f2d837a830f56d7dc71c2013cf7748fa22464; đọc docs/releases/latest.json và GROUND_AND_MOTION_REVIEW. Nhật ký Git sau deploy khác SHA source là bình thường. Luôn push checkpoints nhánhwork, không commit DB/backup/credential.

- Cần benchmark GPU/điện thoại người dùng: SwiftShader từ12 lên26frames/9s, geometry369k xuống118k nhưng vẫn chậm; không gọi đã hếtlag/60FPS. Cần soak dài và theo dõi quota/automation.
- Điều phối3D mới tránh footprint nhà/xe ở lớp hiển thị. Cần collision cho đồ nhỏ/cây/động vật, indoorgraph/elevator/call-serve-clean/IK; backend ghi nhận hoàn tất hoạt động còn theo lịch mô phỏng, chưa dựa occupancy vật lý.2D dùng thoại mới nhưng chưa tuyên bố cùng hệ collision3D.
- Hội thoại viewer-local dùngwallpresentationclock giữ đủ4–6lượt; nhiềuviewer chưa đồng bộ playback. Visitorchat vẫnrules, Qwenlocal1.5B semanticquality yếu; không coi modelcritic là bảo đảm chất lượng.
- Xeambient hiện12car trên1vòng an toàn. Bus/metro chưa có tuyếnquayđầu/boardinghìnhhọc hợp lệ nên không vẽ phương tiện giả chạy xuyên công trình; cần làm thật sau này.
- Automation6adcbdcc81cc819188a4a2ae65392369 enabledhourly, latestrecorded01:00UTC26/10completed dùngpromptmới; không tạo trùng. Giữownerprivate, khôngpaidAPI. Trướcpublic phảigỡ XOM_OWNER_PRIVATE_ORIGIN và tách quyền/rate limit.
- OSM912footprint vẫnheightước lượng, riêng với thànhphốmôphỏng; giữ10units/m.
- LocalQA: Nodecontextrelay theo sessionproxy, restartpreview sau build; testDBwork/liveness-qa/5177. qa-social/qa-motion syntheticresponse khôngghi production.20suite/check/lint/build đạt, ảnh local đãgửi; chưa ownerloggedinbrowserQAproduction. Preview/relay của lượt này đã dừng.

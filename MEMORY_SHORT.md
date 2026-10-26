# Việc còn lại sau production version9

## Đang làm bản10 theo phản hồi mới
- Người dùng yêu cầu cây/đồ vật/người không xuyên nhau, camera điện ảnh bámAn, hoạt động/học chủ động hơn. Root thêmcharacterShot; agentvisual đanglàm sharedscenery và avoidance, agentstory đanglàm policy/needs/pendingguard/cohort và5minslotprefixv2. Chưa phát hành/testđủ. KhôngpaidAPI/DBreset.
- Backup trước10:pre-v10-20261026-space.json gitignored; hashc39c1ac9c401e207a9b9b82f8d6996a0d4022df74d365354f18cfee876346918;revision65/12events/memories28,10,10. Sourceprod9vẫngiữ287f2d8.

Source đang chạy287f2d837a830f56d7dc71c2013cf7748fa22464; đọc docs/releases/latest.json và GROUND_AND_MOTION_REVIEW. Nhật ký Git sau deploy khác SHA source là bình thường. Luôn push checkpoints nhánhwork, không commit DB/backup/credential.

- Cần benchmark GPU/điện thoại người dùng: SwiftShader từ12 lên26frames/9s, geometry369k xuống118k nhưng vẫn chậm; không gọi đã hếtlag/60FPS. Cần soak dài và theo dõi quota/automation.
- Điều phối3D mới tránh footprint nhà/xe ở lớp hiển thị. Cần collision cho đồ nhỏ/cây/động vật, indoorgraph/elevator/call-serve-clean/IK; backend ghi nhận hoàn tất hoạt động còn theo lịch mô phỏng, chưa dựa occupancy vật lý.2D dùng thoại mới nhưng chưa tuyên bố cùng hệ collision3D.
- Hội thoại viewer-local dùngwallpresentationclock giữ đủ4–6lượt; nhiềuviewer chưa đồng bộ playback. Visitorchat vẫnrules, Qwenlocal1.5B semanticquality yếu; không coi modelcritic là bảo đảm chất lượng.
- Xeambient hiện12car trên1vòng an toàn. Bus/metro chưa có tuyếnquayđầu/boardinghìnhhọc hợp lệ nên không vẽ phương tiện giả chạy xuyên công trình; cần làm thật sau này.
- Automation6adcbdcc81cc819188a4a2ae65392369 enabledhourly, latestrecorded01:00UTC26/10completed dùngpromptmới; không tạo trùng. Giữownerprivate, khôngpaidAPI. Trướcpublic phảigỡ XOM_OWNER_PRIVATE_ORIGIN và tách quyền/rate limit.
- OSM912footprint vẫnheightước lượng, riêng với thànhphốmôphỏng; giữ10units/m.
- LocalQA: Nodecontextrelay theo sessionproxy, restartpreview sau build; testDBwork/liveness-qa/5177. qa-social/qa-motion syntheticresponse khôngghi production.20suite/check/lint/build đạt, ảnh local đãgửi; chưa ownerloggedinbrowserQAproduction. Preview/relay của lượt này đã dừng.

# Đang phát triển: nhân vật và tương tác xã hội sau version7

- Người dùng yêu cầu review repo yihui-dev/awesome-opus5-5-videos và dùng AI agent miễn phí để biên kịch. Đã dùng hai agent phát triển (biên kịch + đồ họa), không thêm paid API. data/social-scenes.json có12cảnh/56lượt, SOCIAL_SCRIPT_BIBLE và VISUAL_DIRECTION ghi prompt/nguồn. Đang nối socialFrame/standing slots14units/gesture vào2D3D, thay crowdloop8phút bằng lịch24h xen kẽ. Chưa test/build/deploy bản này.
- Automation cũ đã có recordedrun completed25/10 15:00UTC, output readback revision7/living88/eventai22; không còn blocker lần chạy đầu. Chưa phải uptime24h. Giữ cùng ID, không tạo trùng.

# Việc tiếp theo sau production version7

Đọc docs/releases/latest.json, docs/EXPERIENCE_REVIEW.md, docs/PRODUCTION_RUNBOOK.md và MEMORY_LONG.md. Repo qualife1291/AI-Living, nhánh work. Người dùng yêu cầu luôn push code/memory; nativeGitHub đã xác minh quyền admin/push và origin trong phiên này. Không commit backup/credential.

- Scheduler6adcbdcc81cc819188a4a2ae65392369 đã enable và đổi thành mỗi giờ theo yêu cầu24/7; đang chờ lần chạy đầu được ghi nhận. Kiểm tra bằng automations.peek, không tạo lịch trùng. Lịch lưu không chứng minh SLA24/7 hay model suy nghĩ liên tục. Workerclock/routine và pulsevisible tiếp tục tách với lượtLLM tự động.
- Indoorgraph/elevatoroccupancy/call-serve-clean/va chạm/IK vẫn chưa hoàn chỉnh. Tuổi/hoạt động/phản hồi đang là mô phỏng; visitorchat dùng luật có lưu, không phải freeformLLM.
- Cần benchmark GPU/điện thoại vật lý và soak dài; SwiftShaderQA không phải chứng nhận nhà phát triển game. Theo dõi giới hạnquota và scheduler/logs.
- Trước public: tách UIviewer/admin, ownerID/rate limits/cache theo tải; gỡ XOM_OWNER_PRIVATE_ORIGIN trước đổi audience. Giữ owner-private hiện tại.
- Map912footprint vẫnheightước lượng, chưa mapmatch hoặc terrain; nguồn ở MAP_3D_SOURCES. Giữ scale10units/m khi nhập assets, đừng để nhân vật khổng lồ lại.
- LocalQA: phải dùng contextrelayNode qua sessionproxy, restartpreview sau rebuilddist; testDB work/liveness-qa, port5177, seed-experience-fixture.mjs chỉ local. Source/releaseSHA đang chạy18350eb; commit nhật ký sau phát hành khác SHA source là bình thường.

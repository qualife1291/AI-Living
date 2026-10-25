# Việc tiếp theo sau production version6

Đọc docs/PRODUCTION_RUNBOOK.md, docs/releases/latest.json, docs/MAP_3D_SOURCES.md và MEMORY_LONG.md trước khi sửa. Checkout /workspace/AI-Living, GitHub nhánh work. Người dùng yêu cầu luôn push checkpoint và memory để phục hồi khi env lỗi.

- Tiếp tục indoor graph: sảnh/chờ cabin/chọn tầng/bàn/gọi món/ăn/dọn; hiện nội thất và cabin chỉ là hoạt cảnh, cư dân chỉ bố trí tầng trệt. Tuổi là mô phỏng, chưa family/birth/death.
- Map: OSM3D912 footprint từ snapshot; height đều ước lượng. Chưa map-match cư dân, terrain hoặc floorplan thật. Nguồn đã khảo sát trong MAP_3D_SOURCES; ưu tiên height coverage và bộ asset CC0 nhỏ trước thêm engine.
- Production version6 đã xác minh health/history/writer. XOM_OWNER_PRIVATE_ORIGIN dựa vào owner-private dispatch; PHẢI gỡ trước mở audience. Không đưa local admin/relay lên production. Quyền owner-ID cụ thể và tách UI viewer/admin vẫn cần trước public.
- Automation6adcbdcc81cc819188a4a2ae65392369 đang paused; giữ nguyên, không tạo trùng. Chưa kích hoạt cron/Qwen production; local daemon không phải24/7.
- Các script Sites helper chưa cài trong env này: fallback Git transport stdin ẩn/package đã thêm; dùng native Sites để cấp credential và deploy. Mỗi lần phát hành kiểm tra đúng remote và SHA, không chỉ push GitHub.
- Chưa browser QA production với phiên owner; chưa benchmark điện thoại thật. Build có cảnh báo chunkThree lớn/static route classification, không có lỗi build.

## Đang sửa phản hồi An đứng yên/đồ họa — 25/10/2026
- Đã đọc live: paused=false, revision3, lastAI từ24/10, không livingTurn; mới chỉ initialize living trong GET, chưa có lượt persist. 3D chỉ đọc livingSpeechAt và bỏ speechAt nền. Người40 units, car19units: sai tỷ lệ.
- Đang thêm scale chuẩn10units/m (người17.5,car44), DPRquality, ít blur, tương tác hội thoại có lưu/rules và view session khôngIP; pulse idempotent cho viewer. Migration0005 do Drizzlegenerate, không sửa cũ.
- Cần test/backend/QA/perf và publish, chưa coi WIP là live. User mới yêu cầu24/7: có thể cập nhật/resume automation cũ sau xác minh writer; không tạo lịch trùng, không paid API.
- Tiến độ: có compact world feed, UI chat + quick prompts, DPR3 mức, HUD bỏ blur và nhãn ngắn, đạo cụ theo hoạt động. Cần kiểm thử bất đồng bộ, view concurrency, avatar scale, DPR, offline/contextloss, soak/heap. Thang máy và indoor graph chưa được nâng cấp trong mốc này.
- Đã thêm test-liveness thuần (quét24h, scale, reply); test concurrency API đang thực hiện, lần đầu bị worker restart khi build thaydist nên chưa tính là đạt. Không chạy build cùng lúc API/browser. Migration5 đã generate3table mới; backup trước migrationproduction ở backups/pre-liveness-20261025.json (gitignored), livebefore revision3,2events.

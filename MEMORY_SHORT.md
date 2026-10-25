# Việc tiếp theo sau production version6

Đọc docs/PRODUCTION_RUNBOOK.md, docs/releases/latest.json, docs/MAP_3D_SOURCES.md và MEMORY_LONG.md trước khi sửa. Checkout /workspace/AI-Living, GitHub nhánh work. Người dùng yêu cầu luôn push checkpoint và memory để phục hồi khi env lỗi.

- Tiếp tục indoor graph: sảnh/chờ cabin/chọn tầng/bàn/gọi món/ăn/dọn; hiện nội thất và cabin chỉ là hoạt cảnh, cư dân chỉ bố trí tầng trệt. Tuổi là mô phỏng, chưa family/birth/death.
- Map: OSM3D912 footprint từ snapshot; height đều ước lượng. Chưa map-match cư dân, terrain hoặc floorplan thật. Nguồn đã khảo sát trong MAP_3D_SOURCES; ưu tiên height coverage và bộ asset CC0 nhỏ trước thêm engine.
- Production version6 đã xác minh health/history/writer. XOM_OWNER_PRIVATE_ORIGIN dựa vào owner-private dispatch; PHẢI gỡ trước mở audience. Không đưa local admin/relay lên production. Quyền owner-ID cụ thể và tách UI viewer/admin vẫn cần trước public.
- Automation6adcbdcc81cc819188a4a2ae65392369 đang paused; giữ nguyên, không tạo trùng. Chưa kích hoạt cron/Qwen production; local daemon không phải24/7.
- Các script Sites helper chưa cài trong env này: fallback Git transport stdin ẩn/package đã thêm; dùng native Sites để cấp credential và deploy. Mỗi lần phát hành kiểm tra đúng remote và SHA, không chỉ push GitHub.
- Chưa browser QA production với phiên owner; chưa benchmark điện thoại thật. Build có cảnh báo chunkThree lớn/static route classification, không có lỗi build.

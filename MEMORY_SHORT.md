# Việc còn lại sau production version 8

Đọc docs/releases/latest.json, SOCIAL_REVIEW, SOCIAL_SCRIPT_BIBLE, VISUAL_DIRECTION và PRODUCTION_RUNBOOK. Source đang chạy c9c41676b7f947cb631831ee804aa27f50c2b7bb; commit nhật ký sau phát hành khác SHA source là bình thường. Luôn push checkpoint trên nhánh work; không commit DB/backup/credential.

- Theo dõi lượt cloud tiếp theo sau prompt ba vai mới (đã lưu, chưa có recorded run dùng prompt mới). Automation 6adcbdcc81cc819188a4a2ae65392369 enabled mỗi giờ, có hai recorded runs cũ thành công; không tạo trùng. Không cam kết uptime/SLA24h. Đêm mô phỏng22–06 giữ yên tĩnh.
- Còn indoor graph/elevator occupancy, call-serve-clean, va chạm/IK và đạo cụ có trạng thái. Slot spacing là visual staging, chưa tránh va chạm toàn tuyến; thay đổi đám đông có thể đổi cặp. Visitor chat theo luật, không phải freeform LLM.
- Qwen local1.5B đã thử ba vai nhưng critic có false positive; guard mới bác mẫu lặp. Không coi nhiều vai là bảo đảm ngữ nghĩa. Chưa deploy modelCPU; thư viện agent-authored và lượt cloud có nguồn riêng.
- Cần GPU/điện thoại vật lý và soak dài. Browser evidence là SwiftShader/synthetic local, không production owner login. Theo dõi quota/task logs.
- Trước public: viewer/admin, ownerID/rate limits/cache; gỡ XOM_OWNER_PRIVATE_ORIGIN trước đổi audience. Giữ owner-private. OSM912footprint vẫn heightước lượng, chưa terrain/mapmatch.
- Local QA cần Node context relay qua session proxy, restart preview sau build. TestDB work/liveness-qa/port5177; seed-experience-fixture chỉ local. qa-social dùng response synthetic, không ghi production. Model/preview/relay của lượt này đã dừng khi bàn giao.

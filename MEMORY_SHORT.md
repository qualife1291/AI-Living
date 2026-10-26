# Việc còn lại sau production version 8

## Đang sửa phản hồi kiểm thử ngày26/10

- Người dùng thấy thoại1–2câu/rấtchậm, di chuyểnlag, người/xe xuyênnhà vàbối cảnhkém. Đã xác định: actorprojection10Hz, pollingclockoffsetchưa bùRTT, ambientpairgreedy đứtchuỗi; roadlayout cắt trực tiếp một sốvenuebody.
- Nguồn thêm SocialDirector giữ nguyên4–6lượt, WalkDirectorAstar/sweep + TrafficDirector yield/follow; sharedfootprints vàrendercùngrect; projectionmỗiframe.20suite/check/lint/build đạt,1089routes/22740carstates0hit; replay30liveactors/1800frames0overlap. Browser đủ6lượtqua15spoll desktop/mobile, motionstale0; LOD119ktriangles/24frames9s so369k/12trước. Đây vẫnSwiftShaderchậm, chưaphysicalFPS. FullQAcontrol/fallbackđạt; sửa nốt zfighting/cửa sổ sauxemảnh, đangbuildsmoke cuối. Chưa deploy9;production8sourcec9c4167. Backuphash trongMEMORY_LONG.
- Giữsourceproduction8 c9c4167, owner-private. Đừng coi checkpointWIP là deploy. Đọc docs/releases/latest.json. Hai agent được tiếp tục theo ủy quyền dùngagent trước đó; không paidAPI/DBreset.

Đọc docs/releases/latest.json, SOCIAL_REVIEW, SOCIAL_SCRIPT_BIBLE, VISUAL_DIRECTION và PRODUCTION_RUNBOOK. Source đang chạy c9c41676b7f947cb631831ee804aa27f50c2b7bb; commit nhật ký sau phát hành khác SHA source là bình thường. Luôn push checkpoint trên nhánh work; không commit DB/backup/credential.

- Theo dõi lượt cloud tiếp theo sau prompt ba vai mới (đã lưu, chưa có recorded run dùng prompt mới). Automation 6adcbdcc81cc819188a4a2ae65392369 enabled mỗi giờ, có hai recorded runs cũ thành công; không tạo trùng. Không cam kết uptime/SLA24h. Đêm mô phỏng22–06 giữ yên tĩnh.
- Còn indoor graph/elevator occupancy, call-serve-clean, va chạm/IK và đạo cụ có trạng thái. Slot spacing là visual staging, chưa tránh va chạm toàn tuyến; thay đổi đám đông có thể đổi cặp. Visitor chat theo luật, không phải freeform LLM.
- Qwen local1.5B đã thử ba vai nhưng critic có false positive; guard mới bác mẫu lặp. Không coi nhiều vai là bảo đảm ngữ nghĩa. Chưa deploy modelCPU; thư viện agent-authored và lượt cloud có nguồn riêng.
- Cần GPU/điện thoại vật lý và soak dài. Browser evidence là SwiftShader/synthetic local, không production owner login. Theo dõi quota/task logs.
- Trước public: viewer/admin, ownerID/rate limits/cache; gỡ XOM_OWNER_PRIVATE_ORIGIN trước đổi audience. Giữ owner-private. OSM912footprint vẫn heightước lượng, chưa terrain/mapmatch.
- Local QA cần Node context relay qua session proxy, restart preview sau build. TestDB work/liveness-qa/port5177; seed-experience-fixture chỉ local. qa-social dùng response synthetic, không ghi production. Model/preview/relay của lượt này đã dừng khi bàn giao.

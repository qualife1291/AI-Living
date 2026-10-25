# Nhật ký phát hành production 25/10/2026

- Project: appgprj_6adc7dc364d48191a09202c5b43309e4; giữ owner-private (access revision1), URL https://xom-ai-long.bouncyslug18.chatgpt.site.
- Bản live trước phát hành: version5. Git phát triển: qualife1291/AI-Living, nhánh work; source Sites có lịch sử riêng, main được fetch và đối chiếu trước cập nhật.
- Quy trình: checkpoint Git -> kiểm tra -> build có SHA -> package Worker -> push đúng source Sites -> save/deploy private -> ghi version/deployment/status vào Git.
- Migration: giữ nguyên 0000–0003, thêm 0004 reconciliation schema-only/idempotent. Journal trước đó chỉ có0000. Không reset, xóa hay backfill dữ liệu thật.
- Native database overview trước phát hành: DB chỉ có worlds/episodes; tổng 1 world và2 episodes. Native projection bị cắt giá trị, không được coi là full backup. Backup đầy đủ được lấy qua private /api/world server-side vào backups/ (gitignored), đối chiếu đủ2 episodes trước migration. Không lưu token.
- Runtime dự kiến: XOM_OWNER_PRIVATE_ORIGIN đúng origin đã được Sites xác nhận owner-private; chỉ dựa vào dispatch boundary cho shared-world operations. Phải xóa cấu hình này TRƯỚC khi mở audience. XOM_LOCAL_ADMIN không lên production. Không cấu hình Qwen/cron trả phí.
- Automation cũ 6adcbdcc81cc819188a4a2ae65392369 hiện paused, giữ paused; không tạo bản trùng. Chưa cam kết AI24/7.
- Phạm vi bản mới: hardening, nội thất, hồ sơ tuổi mô phỏng, OSM3D snapshot và registry nghiên cứu nguồn.
- Trạng thái hiện tại: đang chuẩn bị; chỉ ghi thành công khi native deployment trả succeeded. Metadata phiên bản cuối được ghi bổ sung sau publish.

## Kiểm tra trước phát hành
- TypeScript/lint/build, test mô phỏng và test-map-release đạt. Drizzle reader nhận migration0 và4, migration4 có10 statement riêng; thử fresh/legacy + lặp lại giữ world nguyên vẹn.
- Chromium desktop1440/mobile390: OSM3D912 footprint,912 chiều cao ước lượng, <=8 draw calls, không cư dân giả/JS error/overflow. Ảnh local docs/screenshots/map3d.
- Lần upload đầu bị từ chối trước deploy vì entrypoint archive ở server/index.js, trong khi native yêu cầu dist/server/index.js. Đang sửa cấu trúc package; chưa có deployment thành công từ lần này. Không coi push source là đã lên production.

## Phát hành hoàn tất — 17:30 ngày 25/10/2026 (giờ Việt Nam)
- Native status succeeded. Version6, source commit71d657f4b110bf2f77f220c5bf6e4e1566cae573.
- Version ID appgprj_6adc7dc364d48191a09202c5b43309e4~appgver_fcb8a3709c388191b751b22b8e687803.
- Deployment ID appgdep_6addda36033881918d1902aa27758e4a; runtime env revision1. URL https://xom-ai-long.bouncyslug18.chatgpt.site.
- get_site xác nhận owner-private, chỉ owner,0 external visitors. DB overview có đủ9 bảng. Health200/database ready, world revision3;2 sự kiện cũ và ký ức nhân vật được giữ. POST learning bằng service access trả200/updated0, không thêm test scene.
- SHA256 backup private lưu trong latest.json; payload backup/token không nằm Git. Source Sites main đã push đúng SHA; GitHub checkpoint và nhật ký cập nhật riêng.
- Chưa bật scheduler hoặc resume automation, chưa tuyên bố AI24/7. Browser QA là local preview; production được xác minh native deploy + API, chưa browser QA phiên đăng nhập owner.

## Version7 — 21:46 ngày25/10/2026 (giờ Việt Nam)
- Source18350eb351e6249d905907b5f8b52a655c068007. Native succeeded, deploymentappgdep_6ade16530c4c81919567a75da59b0333; versionappgprj_6adc7dc364d48191a09202c5b43309e4~appgver_6d24289db0b88191ab7c7b1b8f539092; envrevision1/owner-private không đổi.
- Migration0005 thêm analytics/conversation. Backupworld+history giữ riêng/gitignored; hash ởlatest.json. Nativeoverview12table; healthready,2eventcũ/kýức giữnguyên,revision4,persistedlivingTurn/stale=false,pulse200,views200. Worldcompactreadsample288ms qua serviceaccess. Không chạy fixture trênprod.
- Chat/ratio/DPR/UI/pulse/cachedfeed trongEXPERIENCE_REVIEW. Bằng chứngảnh làlocalpreview. Native/API kiểm chứngproduction, chưa browserownerloggedin.
- Theo yêu cầu mới24/7, đã enable/reuse automation cũ và đổi lịchmỗigiờ,AsiaHoChiMinh; chưa có recordedfirstrun. Không cam kếtSLA,không bậtcrontrùng/paidAPI.
- MốcGitpush/prodbuild/package/sourceSite/deploy được lưu; góiđãbuild từđúngSHA. Nhật kýcommit saudeployment không phải thay source đang chạy.

## Version 8 — 23:19 ngày 25/10/2026 (giờ Việt Nam)

- Native succeeded lúc16:19:02UTC, source `c9c41676b7f947cb631831ee804aa27f50c2b7bb`. Version `appgprj_6adc7dc364d48191a09202c5b43309e4~appgver_8045a9af68bc8191a113b1ffa3750262`; deployment `appgdep_6ade2be1dfc48191905322fc98220d77`; env revision1. URL https://xom-ai-long.bouncyslug18.chatgpt.site. Giữ owner-private,1owner/0external.
- Nguồn đã push GitHubwork và Sitesmain trước native deploy. Release package từ đúng SHA, không có fixture/DB/backup/token. Không thêm migration. Backup pre8 gitignored, hash `805eb3203e24d1c01b607c7a92041ba9fee1f3a8b5e93715bd46afb127bcd01c`.
- Sau deploy healthready,12tables,revision13,3events trước còn đủ; ký ức An6/Bình4/Chi4, tăng của An đến từ lượt sinh hoạt thật. `/api/instructions` đã có chỉ đạo3vai. POSTpulse200duplicate/living93/learning0, revision13 giữ nguyên; GET readback xác minh history/memories/stale=false. Một mẫu worldread1781ms, không SLA.
- Nhân vật bo góc/tóc/cử chỉ, crowd24h/slot1.4m và thư viện12cảnh/56lượt;18suite/check/lint/build đạt. 20socialcases +60792poses. Broad/targeted browserdesktop/mobile/fallback đạt, ảnh đã gửi là localpreview; chưa owner-browserQAproduction. Nguồn tham khảo thực trong VISUAL_DIRECTION.
- Qwenlocal ba vai có mẫu kém, critic phê duyệt sai; guard mới chặn near-repeat và không ghi world. Không thêm paidAPI/video/productionCPUmodel. Giữ nhãn nguồn kịch bản/AI riêng.
- Reuse automation cũ, hourly/enabled không đổi; prompt mới đọc hướng dẫn3vai và tôn trọng giờ ngủ mô phỏng. Có2recordedruns cũ completed (15:00 và16:00UTC); chưa có run xác minh prompt mới. Không tuyên bố AI suy nghĩ/uptime24h.

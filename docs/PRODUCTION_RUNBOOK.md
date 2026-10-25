# Phát hành và phục hồi Xóm AI

## Nguồn sự thật
- Git phát triển: https://github.com/qualife1291/AI-Living/tree/work.
- Project duy nhất: appgprj_6adc7dc364d48191a09202c5b43309e4. Không create_site mới.
- Trạng thái phát hành: `docs/releases/latest.json` và nhật ký từng ngày. Commit nhật ký sau deploy có thể mới hơn commit source đang chạy; không nhầm hai SHA này.
- `MEMORY_SHORT.md` giữ việc chưa xong/blocker. `MEMORY_LONG.md` giữ quyết định/kết quả. Mỗi mốc source hoặc sửa lỗi deployment phải được commit/push trước khi chạy bước lâu.

## Quy trình lần tới
1. Đọc AGENTS/handoff/memory và nhật ký phát hành; kiểm tra git status. Dùng native Sites get_site để xác minh URL, role và audience; không in trường credential.
2. Lấy source credential native, mở source bằng helper Sites nếu có. Nếu helper không được cài trong env, `python3 scripts/site-source-sync.py fetch` nhận credential JSON qua stdin ẩn; kiểm tra refs/remotes/sites/main và giải quyết upstream trước sửa. Không lưu token/extraHeader vào Git config.
3. Sửa, cập nhật docs/memory, chạy test/check/lint phù hợp; commit và push GitHub checkpoint. Không chạy test-world hoặc fixture lên production.
4. Trước migration/repair: sao lưu full world/history, xác minh số dòng với native DB overview/rows; projection native có thể cắt cell nên không tự coi đó là backup. Backup riêng trong backups/ gitignored; chỉ lưu thời điểm/hash/kết quả đối chiếu vào ledger.
5. Chỉ append migration. 0001–0003 là SQL standalone lịch sử, 0004 reconciliation là entry mới sau0000 trong journal, idx4 để generator kế tiếp tiếp tục0005. Không đăng ký lại các SQL lịch sử nhiều statement không breakpoint vào journal. Snapshot0004 được tạo từ schema hiện tại, nối snapshot0000; kiểm tra bằng Drizzle reader và local DB.
6. Kiểm tra runtime bằng native env tools. XOM_OWNER_PRIVATE_ORIGIN chỉ cho Site hiện đã xác minh owner-private, đúng origin; nó dựa vào Sites dispatch authentication, cho phép shared-world service calls. Trước mở audience phải XÓA cấu hình này và cấu hình owner ID cụ thể. Không đưa XOM_LOCAL_ADMIN/XOM_CONTEXT_RELAY lên prod.
7. `npm run release:build` yêu cầu source sạch, build và ghi SHA. `npm run release:package` xác minh SHA/manifest, loại secrets và DB, đóng gói tại work/production.tar.gz. Gói có dist/server/index.js, dist/client và .openai/hosting.json + migration metadata.
8. Push source đúng Site bằng native credential + helper hoặc `python3 scripts/site-source-sync.py push`. Push không force và không tự deploy. Helper ưu tiên nếu đã cài; fallback chỉ là Git transport và package script, không thay native quyền deploy.
9. Dùng native save_version_and_deploy_private với đúng SHA và archive; giữ owner-private. Lưu ngay returned version/deployment ID. Nếu pending thì poll đúng deployment; nếu saved_version_id có trong lỗi thì tái sử dụng version đó. Không lưu lại version trùng.
10. Native succeeded + URL xác nhận phát hành. Kiểm tra read-only health/world, full history được bảo toàn; kiểm tra writer mới bằng thao tác no-op không sinh test event. Không mở audience để vượt lỗi xác thực.
11. Ghi version number, SHA, deployment ID, env revision, thời điểm/kết quả vào docs/releases và MEMORY_LONG. MEMORY_SHORT chỉ giữ việc còn dở. Push GitHub nhật ký; không cần redeploy chỉ để ghi nhận nhật ký sau phát hành.

## Phục hồi
- Khởi động env mới: clone nhánh work, đọc latest.json/handoff/memory; cài frozen lockfile, local migrations, kiểm tra trước khi tiếp tục. Production không phụ thuộc daemon/cloud env này để phục vụ web.
- Deployment thất bại có thể đã áp dụng migration: đọc lỗi và DB overview trước khi sửa; không reset hoặc sửa SQL đã áp dụng. Migration mới ở đây additive nên phiên bản cũ vẫn có thể đọc schema cũ, nhưng rollback không xóa bảng mới.
- Các ID trong latest.json phục vụ native get_site_version/get_deployment_status. Kiểm tra lại version thực trước rollback; rollback có thể làm mất chức năng UI mới dù lịch sử DB vẫn còn.
- Credential hết hạn: xin native credential mới; không tìm token trong env/files, không phát hành từ GitHub chỉ vì push thành công.

## Giới hạn
Version7 chưa có production CPU Qwen/Workercron; automation cũ đã enable theo yêu cầu24/7 và chạy mỗi giờ. Kiểm tra recordedrun, không tạo lịch trùng. Ba tầng nội thất/cabin chưa phải indoor routing thật. OSM3D dùng footprint thật nhưng height snapshot cũ đều ước lượng; chưa có terrain/indoor survey/map matching. Tiếp tục theo docs/MAP_3D_SOURCES.md.

## Kiểm thử nhịp sống bản7
WorldGET chỉ đọccache để tránh upstreamstall; pulse/automation refreshcontext. Viewcounter là lượt mở theo phiên30min, không phải số người. QA phải táchbuild/restartpreview/API/browser và dùng frame-state để xác nhậnpause; không suy luận lỗi chỉ từscreenshot. Xem scripts/qa-experience.py và EXPERIENCE_REVIEW.

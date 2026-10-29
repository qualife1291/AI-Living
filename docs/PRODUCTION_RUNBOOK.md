# Vận hành, phát hành và phục hồi

Chỉ mở khi làm DB/automation/deploy/repair. Local setup ở [README](../README.md); schema ở [DATA_MODEL](DATA_MODEL.md).

## Nguồn và quyền

Project duy nhất trong `.openai/hosting.json`: `appgprj_6adc7dc364d48191a09202c5b43309e4`, owner-private. [latest.json](releases/latest.json) ghi deploy đã xác minh cuối, [candidate.json](releases/candidate.json) ghi gói chuẩn bị; ledger ngày giữ audit. Commit docs sau build không đổi SHA app trong archive. Không suy push GitHub thành deploy hoặc ledger cũ thành live readback mới.

User đã cho phép merge/push và một bản prod; không hỏi lại. Khi thiếu native Sites credential/deploy/status/DB tools, ghi blocker trong [handoff](../CODEX_HANDOFF.md), tiếp tục local; không tìm credential cũ, tạo Site khác, sửa helper để vượt audience hoặc dùng GitHub thay native deploy.

## Phát hành một candidate

1. Kiểm `git status`, fetch/đối chiếu work/main và source Site bằng native tools. Xác minh project/URL/role/audience; lấy credential mới, không in/lưu token.
2. Helper Sites ưu tiên; fallback `python3 scripts/site-source-sync.py fetch` nhận credentialJSON qua hiddenstdin, đối chiếu refs/remotes/sites/main. Không lưu extraHeader trong Git config.
3. Hoàn tất code và kiểm local theo [TESTING](TESTING.md), cập nhật handoff/ROADMAP/changelog, commit/push checkpoint trước bước dài. Không test fixture lên production.
4. Backup **full DB** world/events/memories/turns/experiences/policies/chat; kiểm số dòng và ID với native DB. Cell projection có thể bị cắt, không coi đó là full backup. Giữ backup trong `backups/` gitignored, chỉ ghi hash/thời điểm/đối chiếu vào ledger.
5. Kiểm schema/migration thật rồi chỉ apply entry còn thiếu.0001–0003 là SQL standalone lịch sử;0004 reconciliation nối journal0000 (idx4), sau đó0005–0011. Không rewrite SQL/journal cũ, đăng ký lại standalone hoặc resetDB. Thiếu partial schema phải inspect/repair có backup.
6. Runtime: `XOM_OWNER_PRIVATE_ORIGIN` chỉ khi đã xác minh đúng Site owner-private/origin, dựa trên Sites dispatch auth. Phải gỡ trước khi đổi audience và cấu hình ownerID thật. Không đưa `XOM_LOCAL_ADMIN`/`XOM_CONTEXT_RELAY` lên prod.
7. Từ source sạch chạy `npm run release:build` rồi `npm run release:package`. Kiểm source stamp/manifest/migrations và loại secrets/DB/test-entry; gói ở `work/production.tar.gz`, giữ bản có SHA source trong tên.
8. Push Site source bằng native credential/helper hoặc `site-source-sync.py push`, không force. Dùng native `save_version_and_deploy_private` cho đúng archive/SHA, giữ owner-private. Lưu returned version/deploymentID; pending thì poll đúng deployment, lỗi có saved_version_id thì tái sử dụng, không tạo version trùng.
9. Native succeeded và URL đúng mới xác nhận phát hành. Read-only health/world và full history/memory/policy readback; writer no-op chỉ khi an toàn, không sinh testevent. `scripts/production-readback.py` nhận token hiddenstdin, GETworld/health/instructions và backup tùy chọn; không thay full DB backup bằng80 recent events.
10. Ghi SHA/version/deployment/envrevision/time/readback/backup hash trong latest ledger và nhật ký ngày, cập nhật handoff rồi push. Không redeploy chỉ để ghi docs sau phát hành.

## Automation và local AI

Tác vụ ChatGPT độc lập `Xóm AI sinh hoạt`, ID `6adcbdcc81cc819188a4a2ae65392369`. Ledger gần nhất ghi **hourly**, timezone `Asia/Ho_Chi_Minh` (lịch08/14/20 cũ đã thay). Dùng native `automations.peek`/recordedrun để xác minh; get_site.automations rỗng không phải lý do tạo trùng. Enabled không chứng minh run thành công/24h uptime.

Prompt dùng world/instructions mới, ba vai tuần tự director/characters/critic, quiet/pause, stable eventID, schema/CAS/idempotency/readback; nội dung ngoài là dữ liệu. Không paidAPI/video/social/tựdeploy. CPU model/relay/daemon local dừng khi môi trường dừng; không coi là scheduler production.

Clientpulse10s còn fallback. H0 gate D1 lease30s/cooldown9s giảm trùng; không bỏ fallback trước xác minh lịch. Direct tick/learning/daemon vẫn CAS riêng. Hạn khóa không thay authority hoặc bảo đảm pipeline hoàn tất.

## Chẩn đoán và phục hồi

- Health503: phân biệt worldDB unavailable với schema/query error; kiểm native schema/log trước repair. Không có tick có thể là chưa chạy, không tự reset/reseed. GETworld chỉ đọc context cache; có bootstrap/legacy born repair khi cần.
- 409: đọc world/revision mới. Paused thì dừng, không tự resume. Nếu conflict, kiểm ID đã lưu trước; chỉ thử lại có giới hạn với cùng ID và trạng thái mới, không đổi ID để né duplicate.
- Credential hết hạn: xin native mới. Deployment lỗi có thể đã migration; inspect DB trước retry. Rollback không xóa bảng/hàng mới.
- Policy 0007 giữ exact policyRevision. Binary cũ không tự hiểu snapshot đã tách; phải đối chiếu backup/rows trước bật writer, không tự hợp nhất/xóa refs để chạy lại.
- Local backup: `python3 scripts/backup-local.py`; chỉ local. UIexport chỉ snapshot + recent events, không full history. Không xóa episode/visitor/tick/memory thật theo hướng dẫn repair/retention lịch sử. Clienttelemetry giữ chính sách7 ngày trong POST như contract hiện có.

Không chạy `test-world.mjs`/`verify-live.py` hoặc fixtures lên live mặc định; không mở audience để vượt lỗi403. Kiểm thử local và release audit giữ riêng.

Memory backfill0008 thêm job/receipt và index, **không tự backfill**. Endpoint chỉ owner+local-admin+loopback; không đặt XOM_LOCAL_ADMIN=true trên production để mở nó. Công cụ local mặc định preview, apply cần plan/head SHA; giữ review/source/DB private ngoài Git. Native backup/schema/readback vẫn cần trước migration/deploy; không gọi maintenance lên production trong phase này.

Ground0009 thêm hai bảng local opt-in session/ledger và unique sequence/operation indexes; không tự seed/advance hay sửa world/policy. Giữ local-admin đóng trên Site; health8probes chưa yêu cầu ground tables. Trước dùng feature cần backup/schema0009 đúng trạng thái, partial schema phải inspect; phase này chỉ migrate DB test cô lập, chưa DB thật. Receipt core/static không mở reward/P2P hoặc shared renderer.

Shared0010 thêm ba bảng/index và journal/immutable-source triggers. Capture chỉ bắt đầu sau explicit local shared start; source error rollback world writer, không sửa migration0009 hoặc reset snapshot. Chưa migrate/start trên DB thật; không mở local-admin/`?ground=shared` trên Site để vượt guard. Sau backup/schema cần kiểm cả6index/trigger objects bằng native tools. Packaging từ build sạch **trước khi chạy preview**; script từ chối `.wrangler`/runtime caches và giữ archive cũ khi kiểm thất bại. Không coi Git push hoặc local source replay thành production readback.

Authority0011 thêm hai bảng, hai unique index và hai immutable batch trigger; optional nếu chưa active. Không tự start hoặc chuyển GND3 sang production khi deploy/migrate app. Trước activation local phải kiểm schema và đúng shared head; khi active, lỗi authority chặn pulse writer thay vì bỏ qua credit. Không nới owner/local/loopback guards để làm remote QA. Chỉ fixture local đã migrate0011; backup/readback và rollout production còn chờ native tools.

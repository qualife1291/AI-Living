# Cloudflare staging — vận hành độc lập

Đọc cùng [AGENTS](../AGENTS.md), [runbook production](PRODUCTION_RUNBOOK.md) và [QA](CLOUDFLARE_AGENT_QA.md). Staging, QA và Sites A là ba môi trường có DB/auth/release riêng. Tài liệu này giữ mốc staging đã xác minh ngày 28/10/2026 (Asia/Saigon); phải đọc native state mới trước thao tác, không coi mốc cũ là current health.

## Mốc staging đã ghi nhận

| Thành phần | Giá trị ở lần xác minh |
|---|---|
| Git/Worker | Branch `cloudflare-staging`, Worker `ai-living-staging`, script tag `f7adf57198b64b6cb65dc92a2a11ee4d` |
| Account | ` 966c7ceee358485648b935a07877ec45`, tài khoản chủ dự án, không phải Sites A |
| URL | `https://ai-living-staging.hoanglonglea1mtl.workers.dev/`; URL đã bật sau khi Access owner-only được kiểm, version URLs tắt |
| Access | Worker-level app ` 11d13139-7e00-4096-8ee7-7fa6cf57e871`, chỉ một owner; không dùng QA service token hoặc bypass |
| Source/Build | ` 2c51d4c935df09ac0a1a28bc2e766b55ceee1c1f`, Build ` 6d77c1f6-6009-4eeb-bfb4-5ae35604154d` success |
| Deployment | Version ` 01929deb-da4e-42db-b043-2c462f812e74`, deployment ` 75a4ac0f-fb71-4e71-8e86-1d5a9fa16576`, 100% ở mốc kiểm |
| D1 | Binding `DB`→`ai_living_staging`, UUID `a6253e00-4301-4f46-83bd-28af64c5fea4`, APAC |
| DB snapshot lịch sử |21 table app/12 index/3 trigger; world/episodes/memories/policies/experiences đều 0, chưa import Sites A |
| Scheduler | Chưa ghi nhận Cron staging được bật hoặc chạy; không dùng Cron QA làm bằng chứng staging |

App đã được upload/promote ở mốc trên. Trạng thái bootstrap/no-op/URL-disabled/Access-not-enabled lúc khởi tạo đã được thay thế; chi tiết còn trong Git. Chưa có authenticated browser/API/CPU E2E được xác nhận cho staging; đây là phần [ROADMAP](../ROADMAP.md) còn chờ.

## Build và release

Repository `qualife1291/AI-Living`; repo connection ` 8e3f5212-7ff9-4717-8485-a18e26dfb478`, trigger ` 0e23d378-63a8-4de7-b518-0b07ec683464`. Mốc config gần nhất theo `cloudflare-staging`, previews tắt:

```bash
corepack pnpm install --frozen-lockfile && npm run build
node scripts/configure-cloudflare-staging.mjs && npx wrangler versions upload --config dist/server/wrangler.json --message staging-private-not-live
```

Pipeline là **upload-only**, không auto promote. Generated config cố ý `workers_dev=false`, `preview_urls=false`; route đã bật tại mốc deployment không có nghĩa version upload sau cũng được deploy. Kiểm branch/SHA, config name/main/compatibility/assets/D1, Access và returned version trước một deployment riêng. Không tự đổi upload thành deploy hoặc mở route ngoài Access.

## Auth và kiểm chứng

- Giữ edge Access owner-only; không suy Origin, header email/oai hoặc JWT chưa verify là danh tính. Auth Sites dispatch không tự dùng được trên Cloudflare.
- Không đặt Sites `XOM_OWNER_PRIVATE_ORIGIN`, `XOM_LOCAL_ADMIN=true` hoặc credential QA vào staging. Kiểm cả mutations, diagnostics, memories, archive, aliases và preview/custom domains theo [Testing](TESTING.md).
- Trước publish/cutover xác minh policy/auth/binding hiện hành bằng native API và owner session. Nếu Access không còn enforced, dừng publish và khôi phục đúng policy; không bypass để làm test xanh.
- UI/client pulse khi mở tab không chứng minh 24/7. Scheduler mới phải qua cùng lease/CAS/turn identity và resource gates, không trùng writer ở QA/Sites A.

## Schema và dữ liệu

Mốc staging đã apply SQL 0000,0004–0010 trực tiếp qua D1 API;0004 bao gồm cấu trúc0001–0003. Không coi đó là Drizzle journal đã ghi đủ hoặc tự apply lại0001–0003. Kiểm `sqlite_master`/journal/rows thực trước migration; source hiện có 23 table đến 0011 không chứng minh staging đã theo kịp.

Không sửa `.openai/hosting.json` của Sites A thành UUID staging. Trước import phải full backup nguồn/đích, kiểm PK/row count/revision/born/IDs/memory/policy, chốt writer và đọc lại sau import; rollback code không phục hồi DB. Không chạy fixture/test ghi lên production, reset dữ liệu hoặc xem seed là history thật.

## Điều kiện còn thiếu

Authenticated owner/browser/API E2E trên source đang deploy; profiling CPU/D1/latency và kiểm budget theo plan thực; native schema/backup/import/readback nếu có cutover; quyết định scheduler staging và independent review. Bằng chứng QA/Sites A không tự đóng các mục này. Không nâng plan hoặc tạo lịch/Worker/DB khác để vượt blocker.

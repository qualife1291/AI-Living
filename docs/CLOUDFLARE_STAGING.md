# Cloudflare độc lập — môi trường staging AI–Living

## 0. Cập nhật phát hành staging — 28/10/2026 (thay thế trạng thái cũ ở phần dưới)

**ĐÃ DEPLOY CÓ ACCESS nhưng chưa được chủ tài khoản QA browser thực tế.** Các dòng "DISABLED", "not_enabled", "build-only" bên dưới là lịch sử lúc tạo staging, không còn phản ánh trạng thái hiện tại. Kiểm API trước mọi thay đổi.

- Zero Trust Access đã Enabled. Access application owner-only ID `11d13139-7e00-4096-8ee7-7fa6cf57e871`, scope **worker-level** trên script tag `f7adf57198b64b6cb65dc92a2a11ee4d`, policy `allow` **một email owner duy nhất** (không ghi email trong Git). IdP hiện có: Cloudflare account login. Không tạo bypass.
- URL owner test: `https://ai-living-staging.hoanglonglea1mtl.workers.dev/`. `workers.dev enabled=true`, `previews_enabled=false`. Bật URL chỉ sau khi xác minh Access worker-level owner-only.
- Cloudflare Builds đã clone, build Vinext và `wrangler versions upload` thành công. Build ID `6d77c1f6-6009-4eeb-bfb4-5ae35604154d`, source commit `2c51d4c935df09ac0a1a28bc2e766b55ceee1c1f` từ `cloudflare-staging`, outcome `success`.
- Uploaded Worker version `01929deb-da4e-42db-b043-2c462f812e74` (650 compiled assets), D1 `DB` → `ai_living_staging` đúng UUID. Version 2 đã **promote 100%** bằng Deployments API: deployment `75a4ac0f-fb71-4e71-8e86-1d5a9fa16576`.
- Verification: Access application và policy qua API OK; GET Worker deployment ghi 100% version 2; Worker URL enabled; D1 binding OK. **Không thể thử trình duyệt đã đăng nhập từ tool** (container DNS unavailable), vì vậy chưa xác nhận giao diện/REST/CPU end-to-end.
- Read-only D1 check tại thời điểm deploy: `worlds=0`, `episodes=0`, `memories=0`, `learning_policies=0`, `agent_experiences=0`. Đây là DB staging **trống**, chưa có import từ ChatGPT Sites. `readWorld()` của app tạo seed world khi GET lần đầu, sau đó cần xác minh health/world/pulse bằng session owner.
- **Chưa cron, chưa automatic learning 24/7**, chưa backup/di chuyển production A. Client `/api/living/pulse` chỉ chạy khi tab mở và không bị hidden. Học LinUCB từ simulated outcomes khác với huấn luyện LLM. Cần browser QA Access + CPU D1 trước scheduler; không tự tạo cron cạnh tranh.
- Pipeline hiện theo `cloudflare-staging`, command là `node scripts/configure-cloudflare-staging.mjs && npx wrangler versions upload --config dist/server/wrangler.json --message staging-private-not-live` (**upload-only**, không auto promote). Lưu ý script cố ý `workers_dev=false`, `preview_urls=false` cho version uploads; public route đã enable sau deployment qua API. Không mặc định một build mới đã được deploy.
- Nếu kiểm thử thất bại: disable `workers.dev` lại, giữ nguyên Site A; không reset data, không bypass Access. Đối chiếu build log, deployment ID, policy, D1 và browser error.

> Cập nhật: 28/10/2026 (Asia/Ho_Chi_Minh). Đây là **runbook môi trường Cloudflare staging**, KHÔNG phải xác nhận đã di chuyển production. Đọc cùng [AGENTS](../AGENTS.md), [CODEX_HANDOFF](../CODEX_HANDOFF.md), [PRODUCTION_RUNBOOK](PRODUCTION_RUNBOOK.md). Các trạng thái có thể thay đổi: gọi API kiểm tra lại trước khi thao tác.

## 1. Mục tiêu và ranh giới

- Thử nghiệm chuyển Xóm AI từ ChatGPT Sites (tài khoản A; giới hạn Codex) sang Cloudflare độc lập do chủ dự án quản lý. Không phụ thuộc lượt Codex để build/deploy lâu dài.
- **ChatGPT Sites production A vẫn là hệ thống hiện có**: `https://xom-ai-long.bouncyslug18.chatgpt.site`, project `appgprj_6adc7dc364d48191a09202c5b43309e4`; lịch sử/memories/D1 thật KHÔNG nằm trên Cloudflare staging mới.
- Giữ `main` và các code WIP `work` riêng. Chỉ dùng nhánh `cloudflare-staging` để chuẩn bị host mới. Không tự merge/activate runtime, không đổi Site A hoặc bật hai scheduler. Không dùng API tính phí.

## 2. Tài nguyên Cloudflare thực tế

| Thành phần | Giá trị đã xác minh |
|---|---|
| Tài khoản Cloudflare | Account ID `966c7ceee358485648b935a07877ec45` (tài khoản của chủ dự án; KHÔNG phải Sites A) |
| `workers.dev` account subdomain | `hoanglonglea1mtl` — đã được tạo |
| Worker staging | `ai-living-staging`; script tag `f7adf57198b64b6cb65dc92a2a11ee4d` |
| URL staging dự kiến | `https://ai-living-staging.hoanglonglea1mtl.workers.dev` — **DISABLED**, không coi là site đang chạy |
| Worker code đang chạy | Bootstrap khóa mọi path (403), ngoại trừ `GET /__staging_health` trả thông tin DB; **chưa upload app AI-Living** |
| Worker hostname/public preview | `workers.dev enabled=false`, `previews_enabled=false` |
| Binding D1 trong Worker | `DB` (type `d1`) |
| D1 staging | `ai_living_staging`; UUID `a6253e00-4301-4f46-83bd-28af64c5fea4`; region APAC |
| D1 schema | **21 bảng app, 12 index, 3 trigger**; đã đối chiếu `sqlite_master`. `_cf_KV` là bảng nội bộ. |
| D1 data | Staging mới, **không seed/import** world, episodes, memories hoặc dữ liệu Site A |
| Cron / schedules | Chưa bật cron mới trên Cloudflare |
| Cloudflare Access | **Chưa Enable Zero Trust**; `GET /accounts/{account_id}/access/apps` trả 403 `access.api.error.not_enabled` |
| Hạ tầng production | Không thay đổi bởi quá trình setup này |

Lưu ý: ID tài khoản/Worker/D1 là **định danh tài nguyên**, không phải token. Không lưu token, secret, email của chủ dự án, Access JWT, API key hoặc dump D1 vào Git.

## 3. GitHub và Workers Builds

- Repository: `https://github.com/qualife1291/AI-Living` (default `main`).
- Nhánh host mới: `cloudflare-staging`, tạo từ `main` tại `f4a22787ad6d1678d182d728112e32cffa5686ff`. Tại thời điểm tạo, code GND2 đã có; trạng thái HEAD của các nhánh có thể đổi sau đó. Kiểm `git fetch` và SHA thực tế, không mặc định các branch đồng bộ.
- Cloudflare GitHub App đã được chủ dự án cấp quyền repo. Cloudflare xác nhận repo connection UUID `8e3f5212-7ff9-4717-8485-a18e26dfb478` (repo ID `1432348228`).
- Worker Builds config: script tag `f7adf57198b64b6cb65dc92a2a11ee4d`; trigger UUID `0e23d378-63a8-4de7-b518-0b07ec683464`.
- Trigger đang theo **`cloudflare-staging`**, không phải `main`. `auto_build_enabled=true`, nhưng **lệnh deploy cố ý là no-op** để tránh publish trước khi auth được kiểm chứng. Previews đã tắt.
- Build command: `corepack pnpm install --frozen-lockfile && npm run build`.
- Deploy command: `echo BUILD_ONLY_NO_DEPLOY`. **Không được đổi sang `wrangler deploy` cho đến khi có Access + auth + kiểm thử + đủ thông tin binding/config.**
- Build kiểm chứng đầu tiên: UUID `bfd86fd9-7e8d-404c-aff7-1b91e10c45a2`, status `stopped`, outcome `success`. Log xác nhận Cloudflare đã clone được GitHub, cài Node 24.22.1 / pnpm 11.25.0, pass `vinext build`, rồi thực thi deploy no-op. **Không có deployment AI-Living** sau lần build này. API build thủ công không trả commit SHA, vì vậy đừng gọi build đó là bản release SHA xác nhận.
- Worker deployment hiện tại còn là bootstrap API đầu tiên, không phải build source mới.

Cấu hình repo chưa có root `wrangler.toml` hoặc `wrangler.jsonc`. Vinext tạo `dist/server/wrangler.json` sau build. Khi thực sự deploy phải kiểm `name`, `main`, `compatibility_date`, `nodejs_compat`, assets, D1 binding và option `--config` đúng đường dẫn. Không coi `npm run build` là đủ điều kiện phát hành.

## 4. Chính sách bảo mật bắt buộc trước khi publish

**Chưa được mở `workers.dev` hoặc tự deploy app vào Worker đã public.**

1. Bật **Zero Trust Access** trong tài khoản Cloudflare; plugin đã có Access Read/Write nhưng sản phẩm chưa được kích hoạt. Tạo Access policy **chỉ owner**, áp vào Worker/hostname và cả preview cần dùng; xác nhận yêu cầu đăng nhập chạy *trước Worker*. Mọi URL/route mở rộng phải nằm trong policy.
2. Kiểm tra code gốc: `app/chatgpt-auth.ts` đọc các header `oai-authenticated-user-id/email`; `lib/admin.ts` tin vào dispatch identity/private-origin khi chạy Sites. Cloudflare độc lập **không đảm bảo header đó đã được xác thực**. Không giữ `XOM_OWNER_PRIVATE_ORIGIN` và tuyệt đối không bật `XOM_LOCAL_ADMIN=true` cho Worker remote. Chặn giả header, gọi API không có Origin, anonymous GET/POST, cross-origin và truy cập admin.
3. Thiết kế xác thực Cloudflare Access được kiểm chứng tại edge/Worker (không chỉ kiểm client), dùng danh tính có nguồn tin cậy như `ctx.access` khi phù hợp; Vinext route/API phải nhận auth từ cơ chế được chứng thực, không tự tin `request.headers` của client.
4. Kiểm tra các đường ghi `/api/events`, `/api/world`, `/api/living/pulse`, `/api/living/*`, `/api/visits` và backfill/ground/diagnostics. `validOrigin` trong `lib/store.ts` chấp nhận request thiếu Origin: **Origin check không phải authentication**.
5. Test phủ định: chưa đăng nhập→401/403; giả mạo header→403; không có Origin vẫn không có quyền; không bypass bằng route asset/preview/custom domain; chỉ owner mới có quyền ghi. Không cho phép thiếu Access rơi vào mặc định public.

## 5. D1 schema, migrations và dữ liệu

- Staging đã áp dụng SQL trực tiếp qua D1 API từ chính repo, theo thứ tự `drizzle/0000_deep_firebird.sql`, `0004_release_schema_reconciliation.sql`, `0005_visits_and_interactions.sql`, `0006_client_logs.sql`, `0007_learning_policies.sql`, `0008_memory_backfill.sql`, `0009_ground_timeline.sql`, `0010_ground_shared.sql`. Migration `0004` bao gồm cấu trúc của các extension `0001`–`0003`. Không apply lại 0001–0003 vào DB này nếu chưa kiểm source.
- Đã query `sqlite_master` để xác nhận 21 bảng app, 12 index, 3 triggers GND2; kiểm quyền D1 query thành công. Các câu SQL được chạy thủ công qua API, **không đánh dấu như đã chạy qua Drizzle migration journal**. Agent phải kiểm trạng thái thực tế trước khi làm migration tự động.
- **Chưa có dữ liệu production** từ ChatGPT Sites A. Không gọi sample của seed là lịch sử thật. Không chạy fixture/test trực tiếp trên dữ liệu A.
- Trước mọi cutover: lấy **full backup D1 Sites A** bằng quyền Sites hợp lệ (world, toàn bộ episodes/memories/turns/experiences/policies/visitor data...), khóa writer/scheduler theo kế hoạch, đối chiếu schema và bảng/PK/row count/revision/`world.born`/ID; import sang D1 đích và readback; không chạy hai nơi cùng nhận write rồi mất cập nhật. Rollback code không khôi phục DB.
- Staging hiện tách biệt hoàn toàn. Không ghi đè `.openai/hosting.json` của Sites A bằng Cloudflare UUID.

## 6. Tài nguyên, chi phí và vận hành

- Mục tiêu dùng Free nhưng **không cam kết Free mãi mãi**. Worker CPU/request, D1 reads/writes/storage, build minutes, rate limits và scheduler phải đo/kiểm theo docs Cloudflare thời điểm triển khai.
- UI hiện có client pulse ~10s và world polling ~15s; tránh coi mô phỏng là chạy 24/7 khi chỉ nhờ người mở trình duyệt. Việc đưa sang cron phải bảo toàn CAS/idempotency, không tạo lịch trùng, và qua benchmark tài nguyên thực.
- Local `npm run living:up`, model/relay/daemon là opt-in local; không phải backend 24/7 trên Cloudflare.
- Source đã chạy build thành công trên Cloudflare, **chưa** kiểm CPU thời gian thực, browser QA production, authentication, D1 runtime, memory/history sau import hay API end-to-end.

## 7. Tiếp tục cho AI agents

1. Đọc `AGENTS.md`, `CODEX_HANDOFF.md`, tài liệu này, `ROADMAP.md` và `docs/TESTING.md`. Fetch SHA hiện tại, giữ WIP `work` độc lập.
2. Verify Cloudflare API: Worker/D1/schema/binding; Access đã Enable chưa; `workers.dev` còn disabled chưa; Workers Builds đang build-only và branch đúng chưa. Không giả định trạng thái tĩnh của tài liệu.
3. Nếu Access chưa Enable: **dừng bước publish**, yêu cầu chủ tài khoản kích hoạt theo dashboard Zero Trust; không dùng token/bypass.
4. Implement provider-neutral auth gate trên `cloudflare-staging`, kiểm các route, tests negative; không ảnh hưởng hành vi Sites A.
5. Bổ sung/kiểm chuẩn Wrangler config cho `ai-living-staging` và DB staging; thử với preview riêng được Access bảo vệ. Không khai thác prod D1.
6. Chạy `npm run test:unit`, `npm run check`, `npm run lint`, `npm run assets:check`, `npm run build`, `npm run test:api:local` cùng kiểm security/cost. Quan sát log build; giữ deploy no-op cho tới khi đủ gates.
7. Khi app chạy được trong Access, đo CPU/requests/D1 và bảo đảm scheduler single-writer. Chỉ sau **full production backup** và kiểm chứng cutover mới đề nghị chuyển production.
8. Mọi deploy thực phải báo build/source SHA, Worker version/deployment, hostname, migration, row count/readback và chi phí; cập nhật handoff/runbook bằng kết quả thực, không suy GitHub push = deploy.

Nguồn: [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [Workers Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [D1](https://developers.cloudflare.com/d1/), [GitHub source](https://github.com/qualife1291/AI-Living).

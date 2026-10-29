# AI–Living — Quy trình remote QA cho AI coding agents

**Bản chuẩn bị mới29/10:** app`130f710` (Citizens/GND3/Studio/H3b đã có negative gates) đã nhập vào QA, local73suite/type/lint/assets/build và [browser/evidence](validation/citizens-2026-10-29.json) đạt. QA-only guard nay nhận đúng template`site-creator-vinext-starter`, giữ idempotent **một** cron`*/5`, Access/JWKS và D1`ai_living_qa`;14case config rejection có regression. User đã yêu cầu push QA sau local acceptance; chưa promote main/staging/prod. Deployment/version/authenticated readback của source mới còn cần xác minh sau push, không suy từ build local. Lịch sử cron-off bên dưới là mốc cũ; config hiện hành giữ cron`*/5` theo bản b6397b1.


## Trạng thái thực tế đã kiểm — 29/10/2026 (cập nhật sau thiết lập)

- **Xác minh cuối (29/10):** hai lượt build trùng commit `00e3027c` đều `success`; deployment mới nhất `e5f5fc2d-fa35-421c-b5eb-88ab4c1bc6d5`, version `39bc5651-7fef-487f-af30-7c761387015e` (100%). Worker QA URL enabled, version URLs disabled, token QA only, cron không có. Cloudflare API chỉ chứng thực deploy và policy, không thay thế HTTP/browser smoke với credential.

**Cloudflare Builds QA hiện ĐÃ CONNECT và ĐÃ DEPLOY**. Các dòng trong phần hướng dẫn tạo Builds ở dưới chỉ còn là hướng dẫn khôi phục nếu config bị xóa, không còn là blocker hiện tại.

- Repo: `qualife1291/AI-Living` → `cloudflare-qa`; `auto_build_enabled=true`, previews disabled. Build: `corepack pnpm install --frozen-lockfile && npm run build`. Deploy: `node scripts/configure-cloudflare-qa.mjs && npx wrangler deploy --config dist/server/wrangler.json`.
- Cloudflare Builds trigger: `24a32899-c5bf-474f-b31e-29ba7581ba24`.
- Lượt build đầu trên source `6f23658d` build PASS nhưng **deploy FAIL** vì guard yêu cầu `ai-living-staging` trong khi generated Worker name là `ai-living-qa`.
- Đã sửa guard chấp nhận tên template gốc `site-creator-vinext-starter`, `ai-living-staging` hoặc `ai-living-qa`; commit `00e3027cfbda72bb85139e6d6e925b89f36617aa` trên `cloudflare-qa`.
- Build `becbb0f3-abfa-49ad-bdc0-42f6baaae6b0` outcome `success`, Wrangler deploy QA version `d391f791-7826-4f15-8163-c9fff29396d1`, deployment `2096c482-6ef5-4178-8ac1-c2db7085919d`, 100% traffic (tại thời điểm xác minh). Host: `https://ai-living-qa.hoanglonglea1mtl.workers.dev/` (**enabled**, Access protected). Có một lượt auto-build trùng commit đang xử lý, cần kiểm deployment mới nhất trước mỗi lần test.
- Access đã kiểm qua API: worker-level `AI-Living QA — owner and agent service token` gồm allow owner và non_identity một service token QA; policy staging chính vẫn owner-only. QA D1 binding `DB` → `ai_living_qa` đúng UUID, schema 21 bảng/12 index/3 trigger. QA cron chưa bật. DB trước lần browser smoke: 0 world/episodes/policies/experiences.
- **Chưa QA HTTP E2E bằng credential**: công cụ chạy từ phiên ChatGPT này không resolve được `workers.dev` nên chưa xác minh Access redirect/cookie, UI 3D, `/api/world` hay `/api/living/learning` từ mạng bên ngoài. Bản deploy PASS không thay thế được remote QA. Chạy smoke script từ agent có secret qua kênh kín rồi upload bằng chứng.
- **Chưa tự động hóa bước post-deploy QA độc lập**: hiện push vào `cloudflare-qa` tự build/deploy, nhưng không tự gọi Codex/Claude chạy browser test. Cần cung cấp Access service-token secrets cho runner/agent, chọn cách kích hoạt QA sau deploy thành công, lưu report/screenshot và đặt gate PASS trước khi merge lên staging/main.
- QA token hết hạn 04/11/2026 17:10:19 UTC; cần rotate/cấp mới trước đó, không ghi secret trong Git.
- Không thay đổi dữ liệu hay automation của ChatGPT Sites A/Cloudflare staging. Không gọi khả năng tự học chạy 24/7 khi chưa có cron đã kiểm.

## Khắc phục 403 ở QA pulse — 29/10/2026

- Lỗi ghi nhận: `POST /api/living/pulse` trả HTTP 403 ngay tại auth gate của `worker/index.ts`, trước route handler. Cloudflare Access có thể xác thực người dùng nhưng các biến `XOM_ADMIN_USER_ID`, `XOM_OWNER_PRIVATE_ORIGIN`, `XOM_LOCAL_ADMIN` của hosting ChatGPT Sites không có trên Worker độc lập.
- **Không** đặt `XOM_OWNER_PRIVATE_ORIGIN=https://ai-living-qa.hoanglonglea1mtl.workers.dev`: đây là cơ chế native Sites, không phải chứng thực trên Cloudflare; cũng không loại trừ pulse khỏi gate.
- Commit **`2d8a42eee29ff72c265776bf04a2d7c3ac5cb591`** trên `cloudflare-qa` thêm `cloudflareQaAccessAllowed` trong `lib/admin.ts`; `worker/index.ts` cho phép mutation khi `ctx.access.aud` từ Cloudflare runtime khớp chính xác Access app QA, chỉ trên HTTPS hostname QA. Không tin Origin, header email hoặc `cf-access-jwt-assertion` do client tự gửi. Các luồng Sites A giữ nguyên.
- `scripts/configure-cloudflare-qa.mjs` inject hai **public config** (`XOM_QA_ACCESS_AUD`, `XOM_QA_HOSTNAME`) vào QA Worker. QA Access app owner+service token vẫn enforced ở edge, deployment giữ nguyên D1 QA.
- Build `5fd33384-d69d-49ce-8032-ae4e82522b83` **success**, deploy `9cfc7a89-8912-4262-a747-11ebd944df02`, version `61812b25-d703-4016-8248-902977fe773a` 100% traffic. Binding D1 và 2 QA config đã xác minh qua API.
- **Chưa có browser-authenticated POST sau bản vá**, không gán nhãn bug PASS cho tới khi `/api/living/pulse` thực sự trả 200 (hoặc 409 khi pause/conflict) và D1 `worlds.revision`, `tick_runs`, `living_turns` tăng theo nhịp. Có regression assertions trong `scripts/test-hardening.mjs` nhưng chưa chạy độc lập trong CI.
- Nếu vẫn 403, cần đọc Worker Logs theo *new version* và kiểm sự tồn tại của `ctx.access` trong runtime, AUD matching, hostname, không mở quyền bằng Origin. Nếu 503 thì xem `living_pulse_failed` và resource limits khác biệt.

## 29/10/2026 — Sửa lỗi QA mutations vẫn 403 dù đã đăng nhập Access

- **Nguyên nhân được xác minh trong Cloudflare docs:** Vinext Worker có Static Assets; router Worker nội bộ không forward `ctx.access` tới app Worker. Vì vậy, phiên bản `2d8a42ee` dù build/deploy thành công vẫn trả 403 tại auth gate. Log request 17:55 UTC xác nhận 403 trên version `61812b25`. Không phải do `Origin`/body `{}`/D1.
- **Không** set `XOM_OWNER_PRIVATE_ORIGIN` bằng hostname QA, không bypass POST, không tin header `oai-*` hoặc chỉ `cf-access-jwt-assertion` chưa kiểm chứng.
- Commit code QA **`7d9254dc00877f9bfb27376776c782681611d064`**: `lib/cloudflare-access-jwt.ts` xác minh JWT bằng public JWKS `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, RSA/RS256, key ID, chữ ký, issuer, audience, expiry, nbf/iat; dùng fail-closed. Worker auth gate chấp nhận `ctx.access` hợp lệ khi có, hoặc JWT đã xác minh chữ ký cho QA. Chỉ QA, Sites A không đổi. QA config có `XOM_QA_ACCESS_AUD`, `XOM_QA_ACCESS_TEAM_DOMAIN`, `XOM_QA_HOSTNAME` (các giá trị công khai, không phải secret).
- Regression `scripts/test-cloudflare-access.mjs` đã **PASS** trên Cloudflare build `d2694d01-785d-49b4-8915-d5d27d256716`. QA Builds command hiện chạy test security trước `npm run build`.
- Build + deploy QA đã **SUCCESS**, Worker version `f43759da-a896-4ef5-958b-4bd98cb900fb`, deployment `c1c69d3a-81c0-4420-9abb-4d5b0e7f8145`, 100% traffic. D1 QA và Access owner/service-token policies còn nguyên; cron off.
- **Chưa kiểm được POST qua phiên người dùng trên version mới**; DB kiểm sau deploy vẫn `revision=0`, `living_turns=0`, `experiences=0`. Để đóng bug, mở URL QA dưới Access, refresh và đối chiếu status `POST /api/living/pulse` với DB revision/turn tăng. Nếu vẫn 403/503, xem Worker Logs `qa_access_gate_denied` hoặc lỗi JWKS fetch, không nới quyền.
- Hạn chế vận hành: public JWKS endpoint phải truy cập được từ Worker để fallback hoạt động. Nếu fail closed, kiểm kết nối / cấu hình JWKS hoặc thay bằng Cloudflare-supported verifier; không bỏ bước signature verification.

## QA auth diagnostic update — 29/10/2026

- Reported error: `{"error":"Thao tác này cần quyền chủ sở hữu.","code":"QA_AUTH_GATE_DENIED"}`. This is the **Worker auth gate**, not `/api/living/pulse` validation.
- Previous JWT verifier `7d9254dc` had **no authenticated POST E2E** proving the issue fixed. Logs from version `f43759da` show `ctx.access` absent (expected behind Static Assets router), hostname and configured audience valid; cannot conclude whether signed JWT header missing or JWKS fetch/claims failed without new logs.
- New QA diagnostic commits `dd160c06` and `2455378e`: `lib/cloudflare-access-jwt.ts` logs safe error categories `signed_assertion_missing`, `jwks_unavailable`, `signature_or_claims_invalid`; supports a **signed** `CF_Authorization` cookie fallback when assertion header missing, always requires RSA signature + issuer + audience + time checks. Never log token, email, cookie or claims values. Never set Sites `XOM_OWNER_PRIVATE_ORIGIN` to the public QA URL.
- Cloudflare Builds after commit `2455378e`: `success`, latest Worker version `440e6fb2-6569-4800-a99f-b60e93cde28a`, deployment `1af1b30d-16c9-4970-bec1-a9ac8511eeb1` at 100%. JWT unit/security tests passed. Cloudflare Access owner and machine policies remain; temp diagnostic credentials removed.
- A browser-rendering GET successfully loaded real QA HTML via a temporary service token (not an Access login page), but **no pulse was triggered or confirmed by that test**. QA D1 still `revision=0`, `living_turns=0`, `agent_experiences=0`. Tool-side outbound fetch to `workers.dev` was restricted and an attempted scripted POST automation was blocked; **do not mark remote POST QA PASS**.
- Next action: refresh `https://ai-living-qa.hoanglonglea1mtl.workers.dev/` as owner and perform one POST pulse. Then query Worker Logs `qa_jwt_diagnostic` and `qa_access_gate_denied` for the **latest version**; use exact reason to fix JWKS transport/claims or route context. On HTTP 200 confirm D1 revision/turns changed; on 403 do not bypass Access.

## 29/10/2026 — Fix shared 403 for pulse, visits and diagnostics

**Root cause verified against live QA Worker logs and Cloudflare Workers documentation:**
- Actual QA request (version `440e6fb2`) returned `QA_AUTH_GATE_DENIED` after logging `qa_jwt_diagnostic.reason=jwks_unavailable`, `errorType=TypeError`.
- `lib/cloudflare-access-jwt.ts` previously called `fetch(teamDomain + '/cdn-cgi/access/certs', {redirect:'error'})`. **Cloudflare Workers only supports `redirect:'follow'` or `'manual'`; `'error'` throws `TypeError` when the request is constructed**, before attempting JWKS retrieval. Official source: https://developers.cloudflare.com/workers/runtime-apis/request/
- Commit `178e4f5aff7216d85037c4dfa5a6d1272e8b5d37` changes redirect to `'manual'`; still rejects any 3xx/non-2xx response, so does NOT follow redirects or weaken auth. Regression `scripts/test-cloudflare-access.mjs` now exercises a **signed JWT through the complete QA verifier and mocked JWKS endpoint**, asserting `redirect:'manual'`, issuer/audience/key/signature validity.
- Cloudflare Build `0e78f0fb-92c8-466f-a17a-3ad04dcc7474` **success**, regression security tests **PASS**; deployed Worker version `770468e8-b23c-488e-ae4a-e0dadd76b199` on deployment `45983544-d519-471f-b66b-81751cbba81a` (100% traffic). D1 `DB` binding unchanged. Access owner + QA service token policies retained, no cron or production writes.
- **Post-deployment E2E still unverified**: at readback `worlds.revision=0`, `living_turns=0`, `agent_experiences=0`. Refresh QA in an Access-authenticated browser and check `POST /api/living/pulse`; if error persists, query `qa_jwt_diagnostic` on *new version*, now that unsupported redirect is removed. Only record QA PASS after successful POST and D1 progress.
- `GET /api/diagnostics` is intentionally **private** in `worker/index.ts`; other admin APIs share the same gate. Do **not** bypass it or set `XOM_OWNER_PRIVATE_ORIGIN` to a public workers.dev hostname. No need to add Sites-specific XOM_ADMIN_USER_ID.

## 29/10/2026 — QA server-side learning scheduler ENABLED

**Infrastructure deployed; scheduled run completion not yet independently observed.**
- Cloudflare Worker `ai-living-qa` only; source branch `cloudflare-qa`, commit `b6397b1efa3aa945555bb395c7943c861a02667d`, build `09def5c2-5b2c-450e-a544-ee5d5769f301` SUCCESS, deployment `645e6e77-5a97-4efe-8fbc-8f37d6b05175`, version `143385fb-83b9-436b-9c30-ca9b91d32124` at 100%.
- One Cloudflare Cron Trigger **`*/5 * * * *` UTC**, configured via generated Wrangler config in `scripts/configure-cloudflare-qa.mjs`. Cloudflare schedules API confirms exactly one entry. Worker var `XOM_RULE_SCHEDULER=true` confirms opt-in. Do **not** also add a dashboard cron or GitHub/ChatGPT automation to the same QA DB.
- `worker/index.ts` scheduled handler checks exact QA host/audience and cron expression using `lib/living/qa-scheduler.ts`, then runs the **same D1 lease/coalescer** as browser pulse: `learnCompleted()` → `advanceResidentSocial()` → `tickLiving()`. All existing CAS, five-minute turn IDs, pause checks and idempotency retained; no HTTP call/Access secret required. No change to Site A or `ai-living-staging`.
- Pipeline now runs `node scripts/test-cloudflare-access.mjs` and `node scripts/test-qa-scheduler.mjs` before Vinext build. Both tests PASS in Cloudflare build. Future changes to `cloudflare-qa` deploy with the Cron in Wrangler; removing it requires explicit `cfg.triggers.crons=[]` or Cloudflare dashboard disable.
- **Cloudflare Free risk:** per official limits https://developers.cloudflare.com/workers/platform/limits/ , Free Cron CPU budget is **10 ms per invocation**. Some QA Worker HTTP invocations previously exceeded 10ms in analytics; Cron pipeline could exceed the budget and fail. Do **not** claim that life/learning runs continuously until Cron logs `qa_cron_pulse` with `status=200`, Cloudflare scheduled invocation outcome is success, and D1 `living_turns` / `agent_experiences` / `learning_policies` progress across times with browser closed. On CPU limit failure, profile or simplify workload before considering a paid plan; never silently upgrade.
- **Immediately after enabling**, DB readback: world revision 8, living_turns 1, experiences 0, policies 0, completedTicks 1. Cron trigger propagation may take up to 15 minutes per Cloudflare docs, and idle world may produce `duplicate:true` or `updated:0` until pending plans settle.
- QA Access owner + scoped agent token remains enforced for HTTP. Cron is trusted internal scheduled event only, no auth bypass route. Monitor Cloudflare Worker Logs for `qa_cron_pulse`, `qa_cron_failed`, `qa_cron_disabled_or_mismatched`. Recovery: disable the one cron if repeated failures, preserve QA DB, do not run second scheduler against it.

> Cập nhật 29/10/2026 (Asia/Ho_Chi_Minh). Tài liệu áp dụng cho **môi trường thử nghiệm QA**, không phải ChatGPT Sites production hoặc Cloudflare staging giữ trạng thái. Kiểm tra trạng thái Cloudflare thực tế trước khi thay đổi; các URL không có nghĩa ứng dụng đã được deploy.

## 1. Môi trường và phân quyền

| Thành phần | Giá trị |
|---|---|
| Repo | `qualife1291/AI-Living` |
| Nhánh hội tụ để QA | `cloudflare-qa` (từ source `cloudflare-staging`; **không tự động lấy các WIP của `work`**) |
| Worker QA | `ai-living-qa` (script tag `225956449567411c8375ac0102e24bd6`) |
| URL dành cho agent | `https://ai-living-qa.hoanglonglea1mtl.workers.dev/` (**chưa mở URL cho đến khi deploy thực**) |
| D1 QA | `ai_living_qa`, UUID `21347bba-caaf-4ba5-9d80-d849958192d1`, APAC |
| Schema QA | Chạy migration 0000,0004–0010 theo source staging; không import data thật |
| Cloudflare Access app | `AI-Living QA — owner and agent service token`, ID `0a7ec998-18c4-40b5-b9e3-6a2b97c01a91` |
| Owner login | Access allow dành riêng cho email owner |
| AI machine login | Access Service Auth **chỉ token QA** ID `e3cf369a-57db-4453-b0c3-bdd7750444ed` |
| Token lifetime | Hết hạn **04/11/2026 17:10:19 UTC**. Rotate/cấp mới có hạn mỗi lần cần |
| Site A / Cloudflare staging | KHÔNG sửa hoặc dùng credential riêng cho QA |
| QA cron | Chưa bật; không chạy training tự động, không bật lịch trùng |

**Security:** Token QA đã được loại khỏi policy Worker `ai-living-staging`. Không nới Access của staging hoặc Sites A. Cloudflare policy cho QA có hai nhóm: owner email và machine service token riêng. Service token *không phải* chỉ đọc HTTP: có thể gọi API POST tới QA, vì vậy **chỉ** cấp cho agent tin cậy, coi toàn bộ QA D1 là dữ liệu dùng thử có thể bị thay đổi. Không cấp quyền write tới DB thật. Không bao giờ commit/gửi token secret, cookie, JWT, private API key vào source/PR/test log.

Token `client_secret` chỉ hiện một lần khi tạo, không thể lấy lại qua API listing. Để cấp cho agent, chủ dự án chọn Cloudflare **Zero Trust → Access controls → Service credentials → Service Tokens** và rotate token `AI-Living Agent QA - 7 day` (hoặc tạo token ngắn hạn riêng từng agent), rồi lưu `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` qua secret manager/biến môi trường riêng của agent. KHÔNG ghi credential vào repo. Dùng token riêng mỗi agent sẽ dễ revoke/audit hơn.

## 2. Cấu hình CI/CD QA (đã chuẩn bị code, chưa kết nối Builds)

GitHub App Cloudflare đã có quyền repo. Worker QA đã được tạo với bootstrap khóa mặc định và D1 binding riêng; hiện **Workers Builds configuration cho QA chưa được tạo** (cấu hình qua connector bị chặn). Để hoàn thiện, vào [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → Worker `ai-living-qa` → **Settings → Builds → Connect**:

- Repository: `qualife1291/AI-Living`
- **Production branch: `cloudflare-qa`**, KHÔNG dùng `main`, `work`, `cloudflare-staging`
- Root: `/`
- Build: `corepack pnpm install --frozen-lockfile && npm run build`
- Deploy: `node scripts/configure-cloudflare-qa.mjs && npx wrangler deploy --config dist/server/wrangler.json`
- Disable automatic preview builds/PR previews (không được chia sẻ cùng QA D1 qua preview)
- Không nhập env/secret liên quan tới Sites A hoặc production

**Guard:** `scripts/configure-cloudflare-qa.mjs` chỉ nhận tên Vinext template gốc `site-creator-vinext-starter`, `ai-living-staging` hoặc `ai-living-qa`, chuyển thành `ai-living-qa`, thay placeholder D1 thành `ai_living_qa`, đặt `workers_dev=true` (đã có Access) và `preview_urls=false`, từ chối route/cron lạ. Nên xác minh Access vẫn bao phủ Worker **trước khi bật auto-deploy**, vì một lỗi cấu hình Access có thể mở API ghi dữ liệu. Không dùng lệnh từ staging `wrangler versions upload` cho QA này.

Khi Connect và build đầu thành công, xác minh Worker deployments, bindings, Access và URL bằng GET chưa đăng nhập (phải bị Access chặn), rồi dùng session owner hoặc token QA để test. **Không suy Git push = deployed** nếu Builds thất bại.

## 3. Chu trình bắt buộc cho MỖI feature hoặc bug

1. Agent implement trên nhánh `feature/<id>` hay `fix/<id>` từ baseline thích hợp. Viết test hồi quy và chạy `npm run test:unit`, `npm run check`, `npm run lint`, `npm run assets:check`, `npm run build` (và local API/browser tests khi liên quan).
2. Tạo PR, ghi bug/features, expected/actual, test plan, chú ý schema/migration và tác động dữ liệu. Reviewer/owner chọn commit đủ điều kiện và merge/cherry-pick vào **`cloudflare-qa`**; không tự merge nhánh `work` còn nghiệm thu dang dở.
3. Cloudflare Builds từ `cloudflare-qa` tự build/deploy **chỉ QA Worker**. Ghi commit SHA và deployment/version ID; nếu build không đạt, dừng test remote.
4. Agent QA độc lập truy cập QA Worker bằng Access service token (không dùng credential của owner), chạy `node scripts/qa-cloudflare-remote.mjs`; có thể dùng Playwright `extraHTTPHeaders` để tất cả request có Access headers. Kiểm screenshot thực tế Three.js, API world, memory, UI, browser console, API errors, D1, latency và CPU.
5. **Chỉ khi cần test writes**: đặt `QA_ENABLE_PULSE=ai_living_qa` cho script smoke, hoặc dùng API events/tick/learning theo test plan. D1 QA có thể seed fixture mới; không bao giờ gọi endpoint mutate trên staging/Sites A bằng token QA.
6. Tối thiểu 1 agent khác review evidence (SHA, timestamp, build/deployment ID, screenshot, request result, D1 before/after, regression pass/fail). Nếu fail, sửa trên nhánh feature và lặp lại. QA pass **không** tự promote sang staging/main/prod.
7. Sau khi pass, review/merge theo workflow bình thường và ghi kết quả. Không dùng một QA deployment cho nhiều bản sửa song song mà không ghi chính xác SHA. Nếu cần kiểm song song độc lập, tạo Worker + D1 QA **riêng mỗi run**, không chia sẻ DB.

### Remote smoke test

```bash
export CF_ACCESS_CLIENT_ID=...     # cấp qua secret manager, không ghi vào shell history
export CF_ACCESS_CLIENT_SECRET=... # cấp qua secret manager, không commit
node scripts/qa-cloudflare-remote.mjs
# Chỉ khi muốn thay đổi dữ liệu QA:
QA_ENABLE_PULSE=ai_living_qa node scripts/qa-cloudflare-remote.mjs
```

Browser QA dùng Playwright `browser.newContext({ extraHTTPHeaders: {'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET} })`; kiểm Access redirect và response code, không chụp màn hình có credential. Hỗ trợ token của môi trường headless khi agent không thể đăng nhập qua UI.

## 4. Gate an toàn / giới hạn

- QA riêng: bảng `worlds`, `episodes`, `memories`, `learning_policies`, `agent_experiences` phải thuộc `ai_living_qa`. Bootstrap trên Worker QA không phải ứng dụng đã deploy.
- `/api/world` GET tạo seed world trong DB trống: read QA có side effect dữ liệu seed; không dùng DB production để smoke test.
- `/api/living/pulse` có thể chạy LinUCB, sinh trải nghiệm và thay đổi chính sách; không nhầm learning mô phỏng với fine-tuning LLM. Không bật cron 24/7 trong QA mặc định.
- Auth của các route app vẫn mang assumption ChatGPT Sites; Access xác thực **tại edge**, do đó browser/client phải đi qua Access. Các cuộc gọi nội bộ/service bindings cần được kiểm riêng. Không chỉ dựa vào Origin hoặc header `oai-authenticated-*`.
- Mục tiêu Cloudflare Free, nhưng test phải theo dõi request/CPU/D1 và quota để tránh lỗi 1102 hoặc vượt free usage.
- Service token cần rotate/revoke sau QA, không chia sẻ công khai trong issues hoặc chat; agent không có secret chỉ có thể đọc docs/source và build local, chưa thể truy cập remote QA.
- Không biến QA site thành public, không tạo wildcard bypass, không cấp `any_valid_service_token`, không bật cả Sites A lẫn Cloudflare cron cùng ghi dữ liệu.

## 5. Báo cáo QA bắt buộc

```text
Feature/Fix:
Git source SHA / branch:
Cloudflare Build ID:
Worker version / deployment ID:
Access: owner / service token (không ghi secret)
Environment: ai-living-qa / isolated D1
Unit/type/lint/build:
Browser/device/viewport:
Actual screenshots / console:
API GET and optional POST:
World revision / learning sample count before-after:
Regression: PASS / FAIL / BLOCKED
Outstanding risks:
Promote decision (owner only):
```

Tài liệu liên quan: [Cloudflare staging runbook](CLOUDFLARE_STAGING.md), [project testing](TESTING.md), [Production runbook](PRODUCTION_RUNBOOK.md).

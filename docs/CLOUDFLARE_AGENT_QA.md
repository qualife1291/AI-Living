# AI–Living — Quy trình remote QA cho AI coding agents

## Trạng thái thực tế đã kiểm — 29/10/2026 (cập nhật sau thiết lập)

- **Xác minh cuối (29/10):** hai lượt build trùng commit `00e3027c` đều `success`; deployment mới nhất `e5f5fc2d-fa35-421c-b5eb-88ab4c1bc6d5`, version `39bc5651-7fef-487f-af30-7c761387015e` (100%). Worker QA URL enabled, version URLs disabled, token QA only, cron không có. Cloudflare API chỉ chứng thực deploy và policy, không thay thế HTTP/browser smoke với credential.

**Cloudflare Builds QA hiện ĐÃ CONNECT và ĐÃ DEPLOY**. Các dòng trong phần hướng dẫn tạo Builds ở dưới chỉ còn là hướng dẫn khôi phục nếu config bị xóa, không còn là blocker hiện tại.

- Repo: `qualife1291/AI-Living` → `cloudflare-qa`; `auto_build_enabled=true`, previews disabled. Build: `corepack pnpm install --frozen-lockfile && npm run build`. Deploy: `node scripts/configure-cloudflare-qa.mjs && npx wrangler deploy --config dist/server/wrangler.json`.
- Cloudflare Builds trigger: `24a32899-c5bf-474f-b31e-29ba7581ba24`.
- Lượt build đầu trên source `6f23658d` build PASS nhưng **deploy FAIL** vì guard yêu cầu `ai-living-staging` trong khi generated Worker name là `ai-living-qa`.
- Đã sửa guard chỉ chấp nhận hai giá trị `ai-living-staging` hoặc `ai-living-qa`; commit `00e3027cfbda72bb85139e6d6e925b89f36617aa` trên `cloudflare-qa`.
- Build `becbb0f3-abfa-49ad-bdc0-42f6baaae6b0` outcome `success`, Wrangler deploy QA version `d391f791-7826-4f15-8163-c9fff29396d1`, deployment `2096c482-6ef5-4178-8ac1-c2db7085919d`, 100% traffic (tại thời điểm xác minh). Host: `https://ai-living-qa.hoanglonglea1mtl.workers.dev/` (**enabled**, Access protected). Có một lượt auto-build trùng commit đang xử lý, cần kiểm deployment mới nhất trước mỗi lần test.
- Access đã kiểm qua API: worker-level `AI-Living QA — owner and agent service token` gồm allow owner và non_identity một service token QA; policy staging chính vẫn owner-only. QA D1 binding `DB` → `ai_living_qa` đúng UUID, schema 21 bảng/12 index/3 trigger. QA cron chưa bật. DB trước lần browser smoke: 0 world/episodes/policies/experiences.
- **Chưa QA HTTP E2E bằng credential**: công cụ chạy từ phiên ChatGPT này không resolve được `workers.dev` nên chưa xác minh Access redirect/cookie, UI 3D, `/api/world` hay `/api/living/learning` từ mạng bên ngoài. Bản deploy PASS không thay thế được remote QA. Chạy smoke script từ agent có secret qua kênh kín rồi upload bằng chứng.
- **Chưa tự động hóa bước post-deploy QA độc lập**: hiện push vào `cloudflare-qa` tự build/deploy, nhưng không tự gọi Codex/Claude chạy browser test. Cần cung cấp Access service-token secrets cho runner/agent, chọn cách kích hoạt QA sau deploy thành công, lưu report/screenshot và đặt gate PASS trước khi merge lên staging/main.
- QA token hết hạn 04/11/2026 17:10:19 UTC; cần rotate/cấp mới trước đó, không ghi secret trong Git.
- Không thay đổi dữ liệu hay automation của ChatGPT Sites A/Cloudflare staging. Không gọi khả năng tự học chạy 24/7 khi chưa có cron đã kiểm.

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

**Guard:** `scripts/configure-cloudflare-qa.mjs` bắt buộc tên Vinext worker gốc `ai-living-staging`, chuyển thành `ai-living-qa`, thay placeholder D1 thành `ai_living_qa`, đặt `workers_dev=true` (đã có Access) và `preview_urls=false`, từ chối route/cron lạ. Nên xác minh Access vẫn bao phủ Worker **trước khi bật auto-deploy**, vì một lỗi cấu hình Access có thể mở API ghi dữ liệu. Không dùng lệnh từ staging `wrangler versions upload` cho QA này.

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

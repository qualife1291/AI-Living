# Cloudflare QA — deploy và kiểm chứng

QA riêng với Sites A production và Cloudflare staging. `work` là nguồn tích hợp; `cloudflare-qa` có hosting/auth/Cron riêng. Push work không deploy QA; không merge wrapper QA ngược vào work/main. Việc còn thiếu chỉ theo [ROADMAP](../ROADMAP.md).

## Nguồn và bằng chứng

| Mốc | Bằng chứng được phép kết luận |
|---|---|
| Ops 5749ce4 | Build d344afb0 success, deployment b25456fe/version d58255ac 100%; native scheduled29/10/2026 21:00 Asia/Saigon (14:00UTC), status200/updated10/non-coalesced và3 stage đồng request/version. |
| Integration 4377ed7 | Build efa85b42 success, deployment 55bdb507/version f77411ba 100%; native scheduled21:10 (14:10UTC) được xác minh riêng. Các file Ops không đổi so với 5749. |
| QA 7157c32 | Git đã hợp nhất H6 shadow metadata/safety checks và Studio followup; source mới hơn native proof 4377. Đọc lại Build/version/config/Access/Cron/D1 và authenticated browser trên source mới trước nghiệm thu. Marker 96 không là model inference. |

[Ops evidence](validation/qa-observability-2026-10-29.json) giữ exact SHA/UUID, before/after aggregate và các giới hạn; [graphics evidence](validation/graphics-interactions-2026-10-29.json) giữ acceptance theo source riêng. Không gộp full 78/82 hoặc ảnh local thành một lượt test của bản mới. Native counter growth không chứng minh model gain; authenticated remote browser/GPU/soak/independent review còn chờ.

## Môi trường cố định

| Thành phần | Định danh / contract |
|---|---|
| Repo/branch | `qualife1291/AI-Living` / `cloudflare-qa` |
| Worker | `ai-living-qa`, tag ` 225956449567411c8375ac0102e24bd6` |
| URL | `https://ai-living-qa.hoanglonglea1mtl.workers.dev/`, Access protected, version URLs tắt |
| D1 | `ai_living_qa`, UUID ` 21347bba-caaf-4ba5-9d80-d849958192d1` |
| Access | app ` 0a7ec998-18c4-40b5-b9e3-6a2b97c01a91`: owner và scoped QA service token; không everyone/any_valid_service_token/bypass |
| Builds | trigger ` 24a32899-c5bf-474f-b31e-29ba7581ba24`, chỉ branchQA, previews tắt |
| Cron | Đúng một `*/5 * * * *` UTC, `XOM_RULE_SCHEDULER=true`, lease chung với browser |

ID là định danh tài nguyên, không phải credential. Không import/reset Sites A, đổi audience, nới Access, tìm token cũ, tạo Worker/DB/lịch thứ hai hoặc tự nâng plan. Source23 table đến 0011 không chứng minh DB remote đã migrate; backup trước repair/migration. Lần dọn docs không thực hiện thao tác hạ tầng.

## Gate trước push/deploy

Thực hiện trên QA branch/worktree đã fetch và hợp nhất source được duyệt. [TESTING](TESTING.md) là contract; không dùng build cũ:

```bash
npm run install:ci
node scripts/test-cloudflare-access.mjs
node scripts/test-qa-scheduler.mjs
node scripts/test-cloudflare-qa-config.mjs
node scripts/test-system-log.mjs
node scripts/test-progress-watch.mjs
npm run check
npm run lint
npm run test:unit
npm run assets:check
npm run build
node scripts/test-progress-api.mjs
node scripts/test-chat-admission-api.mjs
npm run test:api:local
npm run test:api:legacy
```

Nếu QA source có H6 release, chạy thêm `test-h6-scenario-scale.mjs`/`test-qa-h6-release.mjs` và checks/workflow của nhánh; không kích hoạt trainer nặng chỉ để deploy marker. Native Build command phải kiểm lại từ trigger; không suy danh sách lệnh trong docs đồng nghĩa CI hiện hành đã chạy đủ. Renderer/UI/assets đổi cần browser/ảnh mới theo TESTING.

Deploy command hiện có: `node scripts/configure-cloudflare-qa.mjs && npx wrangler deploy --config dist/server/wrangler.json`. Config CLI sửa generated config, giữ exact QA name/D1/Access/một cron, `XOM_SYSTEM_LOGS`, `CF_VERSION_METADATA`, workers.dev sau Access và preview_urls=false. Refuse route/cron/D1 layout hoặc Sites private-origin/local-admin/admin-ID không an toàn. H6 marker thêm count/hash tương thích41/96 từ QA 72d4c2f, không load model.

Sau push phải ghép **Build success + source SHA + deployment/version 100% + đúng binding/Access/Cron + log từ version mới + D1 readback**. Git/CI success không thay native deployment hoặc authenticated HTTP/browser. Ghi evidence hậu deploy ở work, không redeploy app chỉ để cập nhật tài liệu; không promote staging/main/Sites A tự động.

## Auth, log và tiến độ

Worker guard mutations, diagnostics, memories, learning JSONL và `/api/system/progress`, kể cả trailing-slash aliases. QA tin ctx.access hợp lệ hoặc JWT đã verify RSA/RS256/JWKS/issuer/audience/time/host; signed cookie là fallback. Không dùng Origin, oai/email header hoặc JWT chưa verify làm quyền. Không đặt Sites `XOM_OWNER_PRIVATE_ORIGIN` thành QA URL.

- `QA_AUTH_GATE_DENIED`: tìm `qa_auth_denied` boolean/`qa_jwt_diagnostic` reason ở đúng version. Credential Access khác management API; listing không lấy lại service-token secret. Dùng credential được cấp qua kênh kín, không log token/cookie/claims.
- `PULSE_RUNTIME_ERROR`/503: đối chiếu `X-Request-Id`, `http_complete`, `pulse_stage` và `pulse_result` theo [OBSERVABILITY](OBSERVABILITY.md). Uncaught platform response có thể thiếu custom ID. HEAD403 riêng lẻ không chỉ ra Access, proxy hay app.
- Cron chỉ chạy khi exact QA config/cron guard đúng; learning→social→tick dùng chung D1 lease/CAS/turn identity. `coalesced` không xác nhận pipeline trước đã thành công; pause409 không là lỗi. Tìm `cron_result`/`cron_failed` và native scheduled outcome trên cùng version.
- GET progress dùng một SELECT private/no-store, không seed/hydrate/write; thiếu world/schema503. CLI so sánh hai snapshot không tự repair, thêm sample hoặc tạo lịch. Native SQL snapshot version=null, phải đối chiếu deployment history riêng.

Giữ source/time/version cho từng observation. Management API có thể đọc được trong một phiên nhưng không tự cấp Access browser; ảnh local, signal audio và wall time không chứng minh hardware FPS, quality gain hoặc24/7. Quota/CPU/D1 theo plan thực phải đo; xử lý failure trên lịch hiện có và giữ DB, không tạo scheduler thay thế để làm test xanh.

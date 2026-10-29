# Cloudflare QA — deploy và kiểm chứng

Môi trường QA riêng, không phải Sites A production hoặc Cloudflare staging. Source app đi từ `work` sang `cloudflare-qa` bằng merge có kiểm thử; giữ hosting/auth/Cron chỉ ở QA, không merge ngược vào work/main. Push vào work không deploy QA.

## Nguồn và trạng thái hiện tại

Đợt observability29/10 đã deploy source`5749ce4b8cb833cbdc12c0513500b92bcfbf55b2`: Build`d344afb0-639b-426f-bc72-c3e65c9d9250` success, deployment`b25456fe-12dc-47da-833d-f84468f272b7`, version`d58255ac-a4e9-437b-9f84-c69ffa5e2627`100%. Native log14:00UTC xác nhận scheduled outcomeok, cron_result/status200/updated10/non-coalesced và3stage cùng version/requestId. Work78/QA82suite/type/lint/assets/build/compiled API và13browser local đạt; authenticated remote HTTP/browser vẫn chưa chạy. [Evidence](validation/qa-observability-2026-10-29.json) là ledger exact source/readback; [OBSERVABILITY](OBSERVABILITY.md) giữ contract log/Ops. Evidence hậu deploy cập nhật ở work, QA ref giữ nguyên source vừa nghiệm thu để không redeploy chỉ vì ghi nhận kết quả.

Native readback29/10 12:59UTC trên version`9a27dabf-1d97-4339-ae73-ae7d854a2896`/deployment`fea1c25f-cc95-42b3-85aa-124e003c7620`: revision683,221turn/completed tick,3113experience,27policy.13:17UTC revision695/225turn/3140experience/27policy;14:03UTC revision722/234turn/3199experience/27policy, born giữ nguyên. Khoảng này đi qua hai version; counter delta không tự chứng minh nguồn Cron/model gain. Native scheduled logs trước rollout mới có outcome=ok, qa_cron_pulse/status200, updated10–13 và non-coalesced trên cùng version. Đây là cửa sổ quan sát thật, chưa authenticated browser acceptance, model quality hoặc soak24giờ. Số mới và đối chiếu sau deploy nằm trong evidence; không dùng các số này làm current health vô thời hạn.

## Môi trường và ranh giới

| Thành phần | Cấu hình |
|---|---|
| Git | `qualife1291/AI-Living`, deploy branch `cloudflare-qa` |
| Worker | `ai-living-qa`, script tag `225956449567411c8375ac0102e24bd6` |
| URL | `https://ai-living-qa.hoanglonglea1mtl.workers.dev/`, Access protected |
| D1 | `ai_living_qa`, UUID`21347bba-caaf-4ba5-9d80-d849958192d1` |
| Access | app`0a7ec998-18c4-40b5-b9e3-6a2b97c01a91`, owner và đúng scoped QA service token; không any_valid_service_token/public bypass |
| Builds | trigger`24a32899-c5bf-474f-b31e-29ba7581ba24`, branch includes chỉ`cloudflare-qa`, preview disabled |
| Cron | Đúng một `*/5 * * * *` UTC, `XOM_RULE_SCHEDULER=true`; không tạo lịch dashboard/GitHub/Sites thứ hai |
| Source schema |23table đến0011; kiểm schema QA thật trước migration, không suy từ source hoặc tự migrate bằng deploy |

QA có DB riêng và không import history Sites A. Không thay owner-private, staging/prod, IDs/born/memory/policy. Không in credential, tìm token cũ, đổi audience, tạo account/Worker/DB mới hoặc tự nâng plan. Backup đầy đủ trước mọi repair/migration thật; đợt log/Ops không có migration.

## Build và deploy

Luồng Builds hiện có chạy install frozen + Access JWT/scheduler/config/log/progress tests và typecheck trước build, compiled progress/private-alias/chat tests sau build, rồi configure/deploy. Khi cập nhật trigger phải giữ repository/branch/deploy command, không tạo trigger mới.

```bash
npm run install:ci
node scripts/test-cloudflare-access.mjs
node scripts/test-qa-scheduler.mjs
npm run check
npm run lint
npm run test:unit
npm run assets:check
npm run build
node scripts/configure-cloudflare-qa.mjs
node scripts/test-cloudflare-qa-config.mjs
```

Nghiệm thu compiled API trước push: `test-progress-api.mjs`, `test-chat-admission-api.mjs`, `test:api:local`, `test:api:legacy`. G0/Studio/browser theo [TESTING](TESTING.md) khi UI/assets đổi; không dùng build cũ làm bằng chứng cho source mới.

QA config CLI chỉ đổi generated `dist/server/wrangler.json`: exact QA name/D1, Access public config, scheduler, một cron, version metadata và opt-in logs. Giữ `workers_dev=true` sau Access, `preview_urls=false`, không Sites private-origin/local-admin/admin-ID. Refuse unknown route/cron/D1 layout và không ghi đè config khi fail. Kiểm generated config trước push; GitHub Builds chạy deploy command hiện có:

```bash
node scripts/configure-cloudflare-qa.mjs
npx wrangler deploy --config dist/server/wrangler.json
```

Push exact accepted SHA vào `cloudflare-qa`, sau đó kiểm **Build success + Worker deployment/version100% + D1 đúng UUID + Access policy + đúng một cron + log từ version mới**. Build check hoặc deployment success không thay authenticated HTTP/browser proof. Không promote work/main/staging/prod tự động.

## Auth và chẩn đoán

Worker gate bảo vệ API mutations, diagnostics, private memories, learning JSONL và GET `/api/system/progress`. QA chỉ tin ctx.access hợp lệ hoặc JWT đã xác minh RSA/RS256 với JWKS public, issuer/audience/time/hostname. Cookie signed CF_Authorization là fallback, không bỏ signature. `Origin`, email/oai headers và JWT chưa kiểm không cấp quyền; không đặt Sites `XOM_OWNER_PRIVATE_ORIGIN` thành QA URL.

Regression auth kiểm forged/expired/wrong issuer/audience/kid/host. Lỗi redirect:'error' của Workers đã sửa thành manual và từ chối3xx. Xem Git tại178e4f5 nếu cần lịch sử; không khôi phục verifier cũ. Service-token secret chỉ hiện khi tạo; native listing không lấy lại được. Kênh credential hiện tại chưa có Access client secret cho browser agent; tiếp tục native logs/D1 read-only, không mở policy để giả PASS.

HTTP403 `QA_AUTH_GATE_DENIED`: kiểm qa_auth_denied boolean và qa_jwt_diagnostic reason trên đúng version; không log token/cookie/claim values. HTTP503 pulse `PULSE_RUNTIME_ERROR`: tìm requestId/http_complete/pulse_stage/pulse_result. Xem [log contract](OBSERVABILITY.md); native invocation outcomes/CPU/wall time vẫn kiểm riêng.

## Cron và tiến độ

Scheduled handler QA guard exact hostname/audience/team/cron, dùng cùng `runCoalescedPulse` D1 lease và learning→social→tick như HTTP. Coalesced chỉ nghĩa đang chạy/gần đây; pause409 không là lỗi. Mọi CAS/turn-ID/earned-sample semantics giữ nguyên. Cron không cần HTTP Access token và không tạo auth bypass route.

Sau rollout mới tìm `cron_result` (log cũ tên qa_cron_pulse); status200/updated/duplicate/coalesced và pulse_stage phải cùng requestId/version. Ghép native scheduled outcome và snapshot D1, không suy row growth là chất lượng học hoặc chỉ do Cron. Tài nguyên/quota kiểm theo plan thực và invocation evidence; không hứa Free CPU/FPS/SLA hay tự nâng plan. Nếu fail liên tiếp, điều tra/disable đúng lịch hiện có theo quyền vận hành và giữ DB; không chạy scheduler thứ hai.

GET progress không seed world hoặc học: snapshot aggregate một SELECT, private/no-store, missing world/schema503. CLI chỉ so sánh hai file, báo pause/deployment/state/clock/insufficient-window/stall; không repair hoặc tăng reward. Xem [hướng dẫn](OBSERVABILITY.md).

## Acceptance và handoff

Report phải ghi Git source, local gates/fixture limits, Build ID/outcome, Worker version/deployment, Access/D1/Cron/config readback, scheduled outcomes và aggregate before/after. Không upload world/chat/memory raw vào evidence. Authenticated browser vẫn cần credential hợp lệ; ảnh phải là QA thực và chỉ rõ môi trường.

Remote connector hiện truy cập được Cloudflare management API, không đồng nghĩa Access HTTP credential. Giữ distinction native readback, authenticated request và full browser/GPU/soak/independent review. Không tạo automation QA độc lập khi chưa có runner/credential và ngân sách đã được chấp thuận.

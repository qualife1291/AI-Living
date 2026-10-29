# H6 — catalog và model offline, chưa promote

Work đã hợp nhất tooling/catalog tại `b3881d7`. Runtime vẫn dùng 41 scenario và personal LinUCB; 96 candidate (41 gốc + 55 biên tập) chỉ ở `data/training/h6-scenario-catalog.json` và sandbox. QA 72d4c2f có metadata `XOM_H6_MODE=shadow-only`, count/hash và log marker; **không chạy model inference hoặc scorer chỉ nhờ marker**. Kế hoạch còn lại chỉ ghi tại [ROADMAP](../ROADMAP.md).

## Code và phạm vi

- `scripts/test-h6-scenario-scale.mjs`: schema/ID/domain/constraint của 96 candidate, 384 adversarial contexts và hơn 1.000 outcome checks; giữ live registry/fingerprints gốc.
- `scripts/h6-train-and-audit.mjs`/`h6-shadow-worker.mjs`: sandbox riêng thay catalog của bản sao, huấn luyện hai hierarchical-disjoint-LinUCB priors cho `ordinary-v1`/`cold-stress-v1`. Không sửa `data/city/scenarios.json`, D1, memories hoặc personal earned samples.
- `.github/workflows/h6-offline-quality.yml`: PR H6 và manual dispatch; functional/model-quality gates tách riêng. Code safety/CI smoke pass không là quyền activate model.
- QA release code chỉ ở nhánh `cloudflare-qa`; xem [release note theo nhánh](https://github.com/qualife1291/AI-Living/blob/cloudflare-qa/docs/QA_H6_ROLLOUT_20261029.md). Không merge hosting/auth/Cron QA ngược vào work/main.

## Contract experiment

Chỉ synthetic completed plan outcomes đã qua validator; đây chưa là ground productive-effect authority. Artifact pin SHA256, catalog/scenario signature, transcript hash và support; covariance/SPD/min multi-actor/multi-seed support phải hợp lệ. Train/validation/holdout tách seed; chọn personal/global/role trên validation, không dùng holdout để chọn hoặc retune. Candidate không có bằng chứng loại trừ loss thì giữ personal fallback; non-personal được chọn vẫn phải qua holdout safety. Priors không thành own experience/samples.

| Tier, mỗi profile | Train | Holdout | Vai trò |
|---|---|---|---|
| ci | 5 seed × 16 actor × 21 ngày | 6 seed × 16 actor × 21 ngày | Smoke/provenance/regression, không promotion |
| heavy | 12 seed × 32 actor × 45 ngày | 20 seed × 24 actor × 60 ngày | Full-profile gates, explicit manual run |
| extreme | 32 seed × 64 actor × 90 ngày | 20 seed × 24 actor × 60 ngày | Stress có thể fail vì resource; không default merge gate |

Giữ timeout 60 phút/budget runner; không tự nâng máy/dịch vụ trả phí. Workflow lưu artifact ẩn `.h6-offline-results/` với `include-hidden-files`, `if-no-files-found:error`, retention 14 ngày theo file workflow; `if: always()` có thể upload output khi job fail. **Có artifact không chứng minh job hoặc model đạt gates.** Kiểm outcome toàn bộ workflow và hash/provenance trước dùng; không tự rerun trainer khi chỉ dọn tài liệu.

## Bằng chứng đã ghi nhận

| Nguồn | Kết quả và giới hạn |
|---|---|
| [CI H6](https://github.com/qualife1291/AI-Living/actions/runs/40878609106), [quality](https://github.com/qualife1291/AI-Living/actions/runs/40878609036) | Code/safety pass; mỗi profile 744 prior rows/40.320 synthetic outcomes. Ordinary return delta +0,0038263 (95% CI +0,00119..+0,00646); cold-stress −0,0148942 (CI −0,02177..−0,00802): shared prior chưa an toàn. |
| [Heavy](https://github.com/qualife1291/AI-Living/actions/runs/40879968010) | 414.720 completed outcomes/profile; full 20 seed/24 actor/60 ngày. Ordinary chọn global, holdout delta +0,00233146 (CI +0,00179057..+0,00287234); cold-stress giữ personal fallback. RSS ≈ 458 MiB, ≈ 25 phút 24 giây. Strict gates chưa đủ, promotion=false. Không phải field gain. |

Lần thử đưa 96 vào live registry đã fail baseline `test-learning-policy`/`test-residual-policy`; `194a007c` chuyển sang sandbox. Giữ safeguard này, không sửa expected snapshots để che regression. PR độc lập #6 và các branch audit/stress không tự được merge hoặc chấp nhận chỉ vì tooling đã vào work.

## Nghiệm thu trước runtime

1. Source tích hợp phải qua full code/security/asset/type/lint/build và compatibility với 41 scenario/fingerprints. Kiểm artifact installation/version/CAS/rollback và lưu provenance bền vững trước khi artifact CI hết hạn.
2. Cùng quyết định/context live mới được shadow-score; chỉ aggregate, không đổi world/policy hoặc reward history. 96 action dùng signature riêng, từ chối mismatch/ID không có ở registry live.
3. Đo baseline theo các cửa sổ cố định 24–72 h: completion, actor/action hợp lệ, earned samples/arm coverage, reward evidence rejects/drift/diversity, Cron/CPU/D1. Counter tăng hoặc nhiều scenario hơn không chứng minh H6 hiệu quả.
4. Full-profile ordinary **và** cold-stress phải qua strict gates với cohort/split phù hợp; chưa đủ thì không activate. Feature flag, bounded latency/resources, review/rollback và E2E riêng trước graduated QA rollout; Sites A/staging không đổi.

Policy rows là số actor, arms nằm trong JSON của từng policy. Baseline native từng ghi 27 row/922 arm/3.205 sample; 41×27=1.107 và 96×27=2.592 chỉ là sức chứa lý thuyết, không target để backfill giả. Five-minute turn identity hiện giới hạn ≤ 288 scheduled durable turns/ngày; tăng Cron frequency không tự tăng turn hợp lệ. Chi tiết nguồn/thời điểm baseline nằm trong release note theo nhánh, không coi số cũ là current state.

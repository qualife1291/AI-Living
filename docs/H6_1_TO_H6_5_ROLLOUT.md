# H6.1–H6.5 — Model evaluation, compatibility and safe QA rollout

**Status (2026-10-30):** Approved development roadmap, NOT approval to activate H6.
Owner: H6 model-quality phase. Code base: `work`. Deployment target for future rollout: `cloudflare-qa` only, after independent review and E2E verification. Site A, staging, owner-private resources and historical D1 policies remain untouched.
Related: [H6 offline experiment](H6_OFFLINE_POLICY_SCALE.md), [QA rollout](https://github.com/qualife1291/AI-Living/blob/cloudflare-qa/docs/QA_H6_ROLLOUT_20261029.md), [learning contract](LEARNING.md), [Cloudflare QA](CLOUDFLARE_AGENT_QA.md).

## Verified release state — facts vs aspirations

On 2026-10-30, Cloudflare API shows QA Worker version `27a5d488-09a2-4fb3-a855-94e63d0bdb3c`, Access-protected, D1 `ai_living_qa`, cron `*/5 * * * *`, `XOM_H6_MODE=shadow-only`, `XOM_H6_CANDIDATE_COUNT=96`, catalog SHA256 `3b3cf7a0e0db902c006766f4e2f23927562d5581247ff08b701575b7d35e0267`. This verifies **metadata and config deployed**, NOT a running H6 scorer/inference, and NOT an improved resident policy. Runtime remains 41 scenarios and personal LinUCB until a separately reviewed flag is enabled. Do not call this live H6.

Read-only D1 starting measurement: `worlds.revision=1297`, `living_turns=424`, `agent_experiences=5889`, `learning_policies=54`, `completed tick_runs=424`; last policy write 2026-10-30T05:50:51Z. Approximately 12 completed world turns/hour; this is **not** a H6 treatment result. 54 policy *rows* may represent actor state/keys, not 54 independent model families; measure JSON arm counts and verified samples separately. Policy rows should grow with legitimate actors; arms grow with eligible completed actions. Never create synthetic D1 rows or experiences just to hit a target. Cron Logs sample with no `qa_cron_pulse` match is **insufficient evidence that Cron failed**: inspect `cron_result`, scheduled event records, D1 and version correlation.

## H6.1 — Shadow Evaluator (blocking prerequisite for all following phases)

**Goal:** run an H6 scorer against the **same observed, authorized decision snapshot** as baseline; NEVER replace the selected action, schedule a second planner or write memories/policy/world. Separate `shadow` from `active` at the type/API boundary, default disabled. Signed/versioned model artifact with source SHA256, training split, catalog fingerprint, reward/feature versions and eligibility mask.

**Implementation:** Make a read-only observation envelope with `decisionId` (opaque, collision-safe), timestamp, world revision, anonymized/hashed actor scope, baseline action, eligible action IDs, role, context feature version, confidence, and eligibility reasons. Run baseline and H6 inference on identical immutable snapshot; handle H6 candidate IDs not eligible in the 41-scenario runtime as `ineligible`, NEVER map them to executable actions or new rewards. Mark `model_mismatch` and skip inference if 96- vs 41-catalog signatures or evidence versions do not match approved translation. Cold-stress profile defaults to personal fallback (negative offline shared-prior evidence).

**Logging:** Aggregate non-PII metrics by hour, model SHA, Worker version, scenario compatibility version and cohort: `shadow_decisions`, `valid_comparisons`, `agreement_rate`, `ineligible_rate`, confidence/calibration bins, baseline/H6 action distributions, `p50/p95/p99 inference_ms`, `timeout_count`, `scorer_error_count`, CPU usage, dropped samples, log sampling and budget. No JWT, email, raw prompts, chat, memories, high-cardinality actor IDs or raw inputs in general logs. For persisted trace, use a separate opt-in, bounded and private QA measurement store/TTL with schema and retention reviewed; no default D1 write in the world transition.

**Pass:** replay on pinned snapshots deterministic; no world/D1 mutation in shadow A/B, identical baseline decisions with shadow toggle on/off, validated signed hash, no sensitive logs; ≥99.9% evaluation success, p95 scorer wall latency ≤25 ms and incremental Cron CPU within current measured worker budget (fallback disable if Free Worker limit violated), no signature bypass. Collect ≥24h QA shadow telemetry across normal day/night; multiple complete daily cycles preferred. Missing metrics is FAIL, not success.

## H6.2 — Offline Benchmark

Dataset locked/versioned, with independent train/validation/holdout by actor, time and world state; prevent reusing viewed holdout for tuning. Include **living, learning, communication, rest and unusual events**: energy/hunger emergency, illness/injury, rain, night/day, scarce opportunities, novel role, duplicates/retries, stale weather, failed external dependency, partial D1 error, resumed Cron, poor-connectivity browser, changed scenario catalog and mismatched reward version.

**Paired comparison:** run H6 and personal LinUCB with identical state/eligible arms/seeds. Report mean + bootstrapped paired 95% CI for reward, action diversity/entropy and task completion, unmet critical needs, invalid choice rate, latency, memory/CPU, D1 read use, profile-specific safety and first-day cold-start performance. Use ≥20 holdout seeds ×24 actors ×60 days per profile for full gates, plus an independently authored adversarial suite; no fabricated outcomes from conversations or animation. CI smoke alone cannot pass promotion.

**Pass:** 100% schemas/signatures/safety, zero forbidden action/foreign-memory or unsupported reward grants; no statistically supported regression in protected rest/safety/health/communication cohorts; no meaningful drop in verified action diversity or completion; ordinary reward 95% CI lower bound strictly >0 for the candidate that will be enabled. Cold-stress stays baseline when candidate shared prior does not demonstrate benefit. Publish reproducible metrics/artifact hashes and CPU/RSS.

## H6.3 — Promotion Gate

A machine-readable signed `PromotionDecision` with `decision: allow|deny`, candidate model SHA, matching catalog/reward/feature signatures, dataset SHA, eval CLI/CI run URLs, CI quality outcomes, shadow QA observational window, p95/p99/CPU budget, behavior regression matrix, D1 compatibility, privacy and rollback readiness. **Deny by default** if any signal missing or inconclusive. The gate MUST be independent of deploy credentials; it writes no runtime configuration.

Independent review/owner authorization required; no auto-merge or automatic production promotion. Fail closed on unknown arm IDs, mismatched version, insufficient seed support, negative holdout evidence, lack of immutable baseline or resources above Cloudflare Free budget. Confirm owner approval and rollback path before changing a QA feature flag.

## H6.4 — QA Canary

**Only after H6.1–H6.3 PASS.** Gate a small stable actor cohort selected by versioned hash/assignment, initially ≤5% of consenting/synthetic QA cohort and with sufficient sample size; with 27–54 actors, report integer sample sizes and confidence limitations rather than claiming reliable causality from one actor. Randomized contemporaneous **control** remains personal LinUCB; never assign cohorts by current rewards or sensitive traits. Keep a persisted assignment version, model version, world ID, baseline/rollback checkpoint, and explicit feature flag default OFF.

Canary executes **only eligible 41-action runtime decisions**; 96-candidate catalog cannot be activated directly. Disallow any model outputs that grant money, health, skills or completed work without verified authority. Cross-actor/shared-ground effects can contaminate controls; report spillovers and evaluate independent worlds if needed. Observe ≥24–72h and include both day/night cycles. Monitor task completion, reward validation, action entropy, safety needs, user-visible artifacts, CPU p95, Cron missed ticks, D1 errors, actor experience provenance and policy samples. Automatic stop/rollback on any health/safety regression, forbidden action, data-integrity error, uncontrolled D1 growth or p95 budget breach. Roll back config and *model pointer* while preserving all earned experiences and snapshots; no D1 reset.

## H6.5 — Gradual Rollout

With fresh go/no-go reviews at each stage, roll QA cohort from **5% → 10% → 25% → 50% → 100%**, preserving eligible controls for as long as feasible. Minimum 24h and a defined volume of independently settled decisions per step; longer windows for low-traffic cohorts. Require positive/neutral paired reward with confidence bounds and no deterioration in critical behaviors, action diversity, learning quality, Cron success or resource budget. Report effective sample size and effect uncertainty, not just raw reward. A failing stage immediately returns to the previous proven cohort or disabled flag and preserves current real D1.

**Do not copy QA rollout to Site A / production.** Production requires fresh security/privacy review, explicitly reviewed migrations, separate consent and backup.

## Scaling goals with constraints

- **Real learning policy coverage:** baseline/target distinguish number of resident policy rows, total distinct eligible per-actor action arms, verified samples, per-domain coverage and observed outcomes. Prior work observed 27 actors ×41 runtime actions = 1,107 theoretical arms, but not all were eligible. At 96 candidates ×54 policy rows theoretical 5,184 combinations are *not* executable live coverage. Measure eligible/visited arms with D1 JSON (and version) before choosing targets; aim ≥90% of eligible arms only when earned, not by backfilling.
- **World turns:** current five-minute turn identity caps **288/day**. Increasing Cron from 5 minutes to 1 minute without redesign will produce duplicate IDs. Any higher turn throughput requires reviewed world-time semantics, tick identity/lease changes, CPU/D1 budgets and distributed replay tests before a flag can enable it; preserve at-most-once effects, per-action outcome provenance and safety.
- **Training throughput:** train offline on pinned reproducible runners, optimize sampling, batched matrix operations, bounds checking, compression and cold-start priors. Stage large stress offline; no large fit jobs inside a Cloudflare Free Worker Cron. Do not increase spend/runner tier automatically.
- **Compatibility contracts:** 41 live scenarios and evidence fingerprints immutable until migration acceptance; 96-candidate shadows are non-authoritative; personal samples never imported from a shared prior; feature/reward catalog version SHA checked at every evaluation and rollout boundary.

## Phase ownership, order and status

| Phase | Status | Blocking artifact |
|---|---|---|
| H6.1 | **Not implemented** (QA has metadata only) | Read-only scorer, 24h shadow telemetry, zero mutation proof |
| H6.2 | **Partially covered offline** | Frozen paired benchmark on real-replay contexts + adversarial cohort CI |
| H6.3 | **Not implemented** | Signed fail-closed policy gate with independent verification |
| H6.4 | **Blocked** | H6.1–H6.3 passes, scoped QA canary plan/rollback |
| H6.5 | **Blocked** | Canary field evidence, new approval each expansion |

## Immediate next work and log ownership

1. Confirm current QA Worker version/metadata + source SHA and bind logs by deployment version; obtain policy arm/experience baseline by period.
2. Implement H6.1 on **a new isolated branch**, with deterministic replay and side-effect-denial tests. Do not edit agent-owned graphics/chat modules or switch the live 41-action registry. PR stays draft until full CI, signed artifact compatibility and QA Auth/Cron/D1 checks.
3. Extend the existing two-hour read-only monitoring automation to compare H6 logs, real experience/arm coverage and H6 phase states. Notify on new milestones, anomalies or unexpected runtime activation; no silent policy writes.
4. Only then proceed to H6.2, H6.3 and authorized canary.

**Stop conditions:** missing observability, mismatched model signatures, negative cold-stress evidence, any historical D1/sample decrease, low-quality synthetic padding, duplicate turn writes, secret leakage, CPU budget overrun or unavailable rollback. Keep deployment in shadow-only state.

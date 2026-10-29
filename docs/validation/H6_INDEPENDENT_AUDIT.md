# H6 — Independent Capacity/Adversarial Audit (2026-10-29)

This document is owned by the independent QA audit agent, not the H6 feature/trainer author. The audit runs inside a fresh temporary shadow copy of `lib/` and `data/` with `data/training/h6-scenario-catalog.json` replacing only the sandbox 41-action registry; after the child exits the sandbox is deleted and original `data/city/scenarios.json` bytes are checked. The 96 scenarios are **never activated in the running city**. It is stacked on PR #4 (`feat/h6-policy-scale-stacked-20261029`) and its upstream CI repair PR #3. It **does not modify** `data/city/scenarios.json`, any H6 trainer, API route, D1 schema, gameplay, static assets, Cron or production binding.

## Pressure envelope

- 16,384 independent synthetic decision contexts, including emergency need gates, sleep, weather, low health, hungry and job-seeking states; every result checked for eligibility, deterministic no-mutation and valid rewards.
- 4,096 synthetic resident × 96 action arm fits: **393,216** contextual LinUCB arms generated; no rows written to QA D1, no claim of real training samples. Validate matrices, finite scores, skill gains, bounded state and memory/time.
- Strict offline budgets: 180 seconds wall time and 1.5 GiB nominal RSS; report measured `peakRss` and `elapsedMs`. These reflect a GitHub Ubuntu runner, NOT Cloudflare Free per-invocation CPU/latency. Never infer a Cloudflare plan upgrade solely from this result.
- Reuse existing H6 workflow's two-profile training, checksum, completed-outcome gating and disjoint holdout; the independent audit **does not replace** the 20-seed/24-actor/60-day strict promotion benchmark in either profile.

## Release gates and conflict policy

GitHub Actions `H6 Independent Adversarial Capacity Audit` must PASS on the exact merged H6 candidate code along with full H6, Project quality, and CI repair workflow checks. Review measured error/CPU headroom and exact model selection CI on **both** ordinary and cold-stress cohorts. If capacity fails, keep PR #4 draft; provide measured failures and evaluate optimizations (bounded inference, lazy arm hydration, sparse posterior storage) before considering a paid-tier change.

No production deployment until separate QA shadow/canary verification, versioned migration and rollback. Never inject offline synthetic prior as earned personal observations, never seed fake `agent_experiences` or `learning_policies` in the QA database.

Related PRs: CI repair #3; H6 scenario/model #4; independent audit PR to follow. Competing catalog PR #5 was **closed without merge** to prevent collision. If H6 changes its scenario count or reward fingerprint while the independent audit is running, **rebase and rerun checks**, never silently relax checks.

Status: audit under review; see GitHub Actions for actual PASS/FAIL. A passing offline audit does **not** prove real Cloudflare Worker performance.

## Recorded regression and recovery

Initial H6 candidate directly changed the 41-action runtime, causing `test-learning-policy.mjs` and `test-residual-policy.mjs` to fail golden/H1 baseline semantics (72/74 tests PASS). The issue was reported with evidence on H6 PR #4. H6 owner subsequently isolated 96 actions to a versioned shadow catalog and restored the 41-action runtime. Audit must follow that shadow isolation rather than reintroduce golden drift.

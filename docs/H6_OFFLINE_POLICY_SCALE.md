# H6 — Scenario scale and hierarchical offline models (QA-only, draft)

Status: **draft / not merged / not deployed as a live model**. Owner: H6 agent. Stack: H6 PR #4 targets CI repair PR #3; both require separate review before integrating into `work`. No commits or force-pushes to other agents' branches.

## Why this phase exists
Baseline at `work` SHA `7dfad9541b67cc0bb891e24b9891419172fd91b7` has **41** learning scenarios, a schema cap of **100**, and contextual per-actor LinUCB. H6 adds **55 human-curated scenarios** across eight skill domains for **96 total** while preserving all original IDs, order, force-rest/food/health gates, weather restrictions and existing reward logic. It does not create real `learning_policies` or fabricate experience rows.

## Isolation
H6 branch `feat/h6-policy-scale-stacked-20261029`. PR #4 into `test/ci-install-exec-boundary-20261029` so the existing full GitHub quality suite can run with repaired shell permissions. Never merge this draft directly into `work`, `main`, `cloudflare-staging` or `cloudflare-qa` without reconciling both PRs and running checks on the final merge commit. Other agents currently own chat, visuals, H5 peer admission, D1 consistency; H6 does not change those modules. Only new scenario data, H6-only scripts, H6 workflow and this note are modified.

## Offline models and experiment
`scripts/h6-train-and-audit.mjs` trains **two hierarchical-disjoint-LinUCB priors** independently, for `ordinary-v1` and `cold-stress-v1`, using the existing `HierarchyTrainer`. Only verified synthetic **completed plan outcomes** are accepted. Each artifact is SHA-256 checked and includes catalog/scenario signatures and transcript hash. Holdout seeds differ from all training seeds. Strict covariance validation, min multi-actor/multi-seed support, no donor memories or owner IDs, no seeded D1 observations. The candidate's personal sample count must equal its own completed plans.

The full-profile existing acceptance tests require **20 independent holdout seeds, 24 agents, 60 days** plus all lower-bound performance gates. CI-scale training/evaluation runs are *functional and provenance smoke/regression tests*, **not evidence of performance improvement**, even if they pass. Never activate the artifact as a runtime policy on CI-only evidence.

### Workflows
`H6 Offline Model Scale & Deep Quality` on H6 PR:
- `corepack pnpm install --frozen-lockfile`
- `node scripts/test-h6-scenario-scale.mjs` (96 schemas/ID invariants, 384 adversarial contexts, >1,000 outcome reward checks, hard needs and weather constraints)
- `node scripts/h6-train-and-audit.mjs --tier=ci` (two independent synthetic training+holdout evaluations)
- Full original unit suite, TypeScript check, lint and production build.
- Artifacts retained 14 days **only when the entire workflow passes**.
- Parallel original `Project quality and asset coverage` workflow must also pass.

Manual `workflow_dispatch` tiers (ONLY run deliberately to avoid unexpected costs):
- `ci`: 5 training seeds × 16 agents × 21 days and 6 holdout seeds × 16 agents × 21 days **per profile**.
- `heavy`: 12 training seeds × 32 agents × 45 days and 20 holdout seeds × 24 agents × 60 days **per profile**.
- `extreme`: 32 training seeds × 64 agents × 90 days and 20 holdout seeds × 24 agents × 60 days **per profile**, bounded by GitHub Actions timeout of 60 minutes and runner resources.
Metrics: accepted outcomes, prior rows/support, decision reward, holdout CI, runtime seconds and workflow CPU/memory failures. Extreme is **intentionally able to fail due to resource limits**; it is not the default CI merge gate. If extreme fails, record evidence and propose a proportionate machine upgrade; do not upgrade or enable paid services automatically.

## Model promotion rules
1. PR #3 and PR #4 merged with coordinated ownership and with *all* required checks passing on current `work`, not stale merge-base.
2. Final full-profile offline benchmark with unseen holdout reaches existing strict `passesProposedOfflineGates` in **both** profiles. No fabricated or private data, no leakage.
3. Shadow deploy on isolated `ai-living-qa` only after verifying versioned scenario fingerprint and replay compatibility with existing D1; **do not mutate D1 or install prior into current production runtime** until a separately reviewed switch and rollback plan is ready.
4. For a production/QA live-model activation require CPU/memory/latency measurements under Cloudflare limits, and no regression to Cron/Access or world learning. Do not assume scenarios added imply more actual experiences.
5. Only then consider a promote/merge plan. Failed quality gates mean keep PR draft; publish FAIL and evidence.

## Agent handoff
Related files: `data/city/scenarios.json`, `scripts/test-h6-scenario-scale.mjs`, `scripts/h6-train-and-audit.mjs`, `.github/workflows/h6-offline-quality.yml`.
Avoid modifying the same files concurrently. Read GitHub PR #4 and commit status before starting any competing H6 training. If high tier exhausts Actions limits, keep ordinary CI passing and document the high-tier failure separately; do not weaken safeguards.

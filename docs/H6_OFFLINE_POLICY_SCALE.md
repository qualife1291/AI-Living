# H6 — Scenario scale and hierarchical offline models (QA-only, draft)

Status: **draft / not merged / not deployed as a live model**. Owner: H6 agent. Stack: H6 PR #4 targets CI repair PR #3; both require separate review before integrating into `work`. No commits or force-pushes to other agents' branches.

## Why this phase exists
Baseline at `work` SHA `7dfad9541b67cc0bb891e24b9891419172fd91b7` has **41** learning scenarios, a schema cap of **100**, and contextual per-actor LinUCB. H6 adds **55 human-curated scenarios** across eight skill domains in a **separate shadow catalog of 96 total**, preserving the 41-scenario live registry and all its reward fingerprints. The sandbox trains against the 96-scenario catalog and never overwrites live files. It does not create real `learning_policies` or fabricate experience rows.

## Isolation
H6 branch `feat/h6-policy-scale-stacked-20261029`. PR #4 into `test/ci-install-exec-boundary-20261029` so the existing full GitHub quality suite can run with repaired shell permissions. Never merge this draft directly into `work`, `main`, `cloudflare-staging` or `cloudflare-qa` without reconciling both PRs and running checks on the final merge commit. Other agents currently own chat, visuals, H5 peer admission, D1 consistency; H6 does not change those modules. Only a new versioned training scenario catalog, H6-only scripts, H6 workflow and this note are modified; the live data/city/scenarios.json stays byte-for-byte identical.

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

## Regression discovered by actual GitHub Actions (strict hold)
Initial attempt to change the live scenario registry to 96 **failed** existing `test-learning-policy` and `test-residual-policy` baseline fingerprint gates. Do NOT update expected snapshots to hide this; prior reward evidence uses the original scenario signature. On commit `194a007c`, the 96-scenario training is isolated by `scripts/h6-train-and-audit.mjs`: a temporary sandbox copies `lib`, `data`, package metadata, and node_modules link, substitutes only the sandbox's catalog, runs synthetic worker, then deletes sandbox; live world/D1 and runtime continue to use 41. The wrapper verifies unchanged live bytes. This is a deliberate compatibility safeguard, not a claim that the new 96 scenarios are deployed.

## Empirical CI run and shadow-model rejection
H6 run [40878609106](https://github.com/qualife1291/AI-Living/actions/runs/40878609106) and standard quality run [40878609036](https://github.com/qualife1291/AI-Living/actions/runs/40878609036) passed all **code/safety** checks. Training evidence before model-selection gate: two independent priors, **744 rows per profile**, **40,320 verified synthetic outcomes per profile**. Ordinary holdout return +0.0038263 per agent-day (95% CI [+0.00119,+0.00646]); cold-stress candidate return **-0.0148942** (CI [-0.02177,-0.00802]) versus personal baseline. Cold-stress shared prior is **not safe to promote**. Additionally, GitHub upload-artifact@v4 omitted the hidden `.h6-offline-results/` directory; the workflow is patched to include hidden files and fail if no artifact. H6 trainer now selects personal/global/role using dedicated validation seeds disjoint from training AND holdout; falls back to personal when no candidate excludes a loss. A selected non-personal candidate must also pass holdout safety; full-scale acceptance is still mandatory for promotion. CPU and peak RSS metrics are now recorded for upgrade decisions. No runtime model deployed.

## Integration checkpoint — 29 October 2026

User requested H6 merge for real-world measurement. **Merge offline/shadow tooling into `work` only; NOT automatic activation of H6 synthetic model**. Initial QA live D1 snapshot (read-only, before H6 integration): revision=716, living_turns=232, completed tick_runs=232, agent_experiences=3185, learning_policies=27; QA Cron `*/5 * * * *`, active Worker version `1eaf1958-1c76-4ed1-bc2c-69338b44bc10`. These numbers were earned by the pre-existing 41-scenario live engine, **not by H6**. Record every later reading with timestamp, Worker version and change reason; no causal claims from a simple count increase.

H6 heavy stress [run 40879968010](https://github.com/qualife1291/AI-Living/actions/runs/40879968010) **passed** with 414,720 completed synthetic outcomes for EACH of ordinary/cold-stress, full 20-seed 24-agent 60-day test; model promotion remained `false` because strict full-profile quality gates were not all met. Ordinary validation selects global prior and has positive holdout delta (+0.00233146 return per agent-day, 95% CI [+0.00179057,+0.00287234]); cold-stress remains personal fallback. Heavy resource usage: peak RSS approximately 458 MiB and elapsed approximately 25m24s. This is an offline capacity result, NOT field evidence. Independent QA PR #6 must not be silently merged by this integration.

For **real field measurement**, first collect read-only QA metrics over multiple fixed time windows, with trained models strictly in shadow: per-actor completion/sample increments, action distribution/variety, reward quality/audit rejects, replay fingerprint versions and drift, Cron success rate and CPU. Shadow scoring must not overwrite resident policies, modify D1, rewrite historical rewards, add fake samples, or implicitly activate a prior. Any future H6 rollout requires a distinct gated QA implementation, explicit rollback and E2E checks against existing 41-scenario evidence. Keep QA production and Site A untouched by this PR.

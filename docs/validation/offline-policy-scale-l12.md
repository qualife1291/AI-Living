# L12 — Large-scale scenario/policy candidate (2026-10-29)

## Isolation: NOT a live model rollout

The live world still uses **41** existing actions with its frozen reward fingerprint. This phase proposes 56 new *candidate* actions across 8 skill domains (97 combined), and fits a large cohort of **512 × 97 = 49,664 contextual policy arms** exclusively from deterministic synthetic simulated outcomes. No resident D1 training samples, earned memories, or archived experiences are synthesized; `trainingSamplesEarnedByRealResidents=0`.

**Dependency:** PR #3 on branch `test/ci-install-exec-boundary-20261029` fixes the GitHub install script. L12 lives on branch `phase/offline-policy-scale-l12`; review/merge the independent CI repair before integrating L12 into `work`. The candidate JSON is **not loaded by runtime**. It is not the four cinematic scenarios of `lib/city/scenarios/`, which are owned by graphics agents.

## Reproducibility

- Candidate file: `data/training/scenario-expansion-v1.json`. Source and title are individually authored; no external model or copied private data. All 56 match runtime `scenarioSchema`; combined catalogue remains below the existing hard cap of 100. Preserve the existing 41-action `OUTCOME_SCENARIO_SIGNATURE` and golden fixtures.
- Trainer: `scripts/train-offline-policy-scale.mjs`; model algorithm **disjoint LinUCB 6D** currently supported by the runtime, not a newly invented or paid LLM. Each synthetic actor-action receives 6 *fit* contexts and 2 wholly disjoint *holdout* contexts; reward labels come from the existing deterministic simulation oracle. Synthetic results must **never** be presented as actual welfare, understood conversations, paid services or earned resident rewards.
- A separate 1,024-agent stress probe executes 2 fit and 1 holdout events per action to measure scalability without writing artifacts. Guardrails refuse >2,048 actors, >16 fit samples or >8 holdout contexts per action. Training process enforces 180s and 1.5 GB RSS budgets; model artifact compressed size <=80 MB and raw size <=180 MB. Exceeding a limit is a failure, not a reason to silently buy Cloudflare.
- Model artifact `.sites-runtime/training/l12-synthetic-512x97.json.gz` and signed-by-digest `.report.json` are published **only as GitHub Actions artifacts** (14-day retention), not imported into Cloudflare QA. The audit script `scripts/verify-offline-policy-scale.mjs` checks SHA256, unique actors/actions, learned-arm shapes and sample counts.

## Required gates for any future promotion

1. All unit tests, catalog validation, CI, TS, lint, asset coverage, production build PASS, including the unique action IDs, deterministic holdout, legacy 41-action unchanged and fail-closed invalid budget probes.
2. 512-actor synthesis + 1,024 actor stress with no OOM, bounded wall time and CPU/serialized size; compare disjoint holdout contextual LinUCB vs tabular, zero-prior and stable baseline on both ordinary/cold-stress cohorts. An offline quality win is **necessary but not sufficient** for promotion.
3. Runtime canary must have explicit new-version provenance, no fabricated per-resident `samples`, D1 migrations tested with rollback, Cloudflare Worker CPU/latency and database stress, no regressions in autonomy, safety/needs or other actor roles. No automatic migration of old posterior matrices to 97 actions or resurrection of historical synthetic trials.
4. Only then create a separate QA-only rollout, check 5-minute Cron real successes, app/browser and learning policy progress, roll back on CPU/error/latency. Never deploy this candidate to Site A, staging or production by default.

Status: **Offline candidate only**. A green CI **does not** mean new scenarios are in the live city or the candidate is production-quality. Acceptance metrics and actual stress logs belong to the linked L12 PR.

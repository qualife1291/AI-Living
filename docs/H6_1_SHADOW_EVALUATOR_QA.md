# H6.1 — Signed, fail-closed QA shadow scorer (2026-10-31)

## Scope
This change makes **paired H6 candidate scoring possible** inside the exact existing
baseline `chooseScenario` context. It **does not activate** a model, change the
41 live scenarios, install the 96 H6 candidates in the live registry, persist any
synthetic samples, change a single plan or backfill a policy. No Site A or staging
change. The release JSON is deliberately `artifact: null, signature: null`.

The candidate is **a proposal-only counterfactual**. The baseline may later be
overridden by a friendship encounter, a festival, an unfinished plan or other
safety/needs guards. Decision agreement is **not** a reward estimate or proven
behavior improvement. Only existing **41 eligible live actions** participate in
paired comparisons, even though the model was trained against 96 shadow actions.

## Activation safeguards
The scorer does nothing unless all of the following are true:

1. Worker is in QA mode `XOM_H6_MODE=shadow-only`.
2. Separate QA-only binding `XOM_H6_SHADOW_EVAL_ENABLED=true`.
3. `data/training/h6-shadow-runtime.json` contains a separately audited model
   artifact from `scripts/h6-train-and-audit.mjs` (ordinary profile), with the
   original `prior`, `provenance` and `sha256`; the model's SHA covers the
   canonical `JSON.stringify({prior,provenance})`.
4. Independently reviewed QA-only release pin `XOM_H6_SHADOW_MODEL_SHA256`
   exactly matches that content checksum.
5. `XOM_H6_SHADOW_PUBLIC_KEY` is a separately trusted base64 Ed25519 public
   key, and the base64 `signature` field is an Ed25519 signature over the 64
   lowercase ASCII bytes of that SHA-256 value.
6. The original 41 live scenarios are an identical prefix of the 96 shadow
   catalog, all model rows correspond to the 96 catalog and pass bounded,
   positive-definite covariance checks. Reward, features and role catalog
   signatures must be unchanged. Any invalid model blocks scoring **only**.

Do **not** store a signing private key in GitHub, Worker, logs or repository.
The unapproved model fixture, checksum or CI artifacts are not activation
authorization. Only a reviewed release should replace the null artifact and
change QA-only bindings. The signer must be independently authorized.

## Runtime measurement contract
Within an authorized QA Cron run, the model runs in AsyncLocalStorage scoped to
the same `planLivingTurn` baseline proposal input, after the baseline decision
has already been computed. It never influences `chosen` or downstream planner.
No additional D1 queries, migrations, learning writes or network calls are added.

`h6_shadow_eval` logs **only aggregate**:
- modelSHA, proposal/evaluable/used counts and agreement/mismatch/skipped/errors;
- posterior-uncertainty buckets (low/medium/high, **not calibrated confidence**);
- per-invocation inference latency p50/p95/p99 for captured proposals.

No actor ID, identity, dialogue, contextual features, raw model, credentials,
events or rewards are logged. `h6_shadow_blocked` means the model is absent
or invalid: original Cron and learning remain untouched. Zero counts must not be
presented as evidence that H6 inference happened.

## Independent validation
`node scripts/test-h6-shadow-evaluator.mjs` generates an ephemeral Ed25519
test key, validates signed release, tests checksum/signature/feature/covariance
tampering, checks 41/96 catalog split, confirms action eligibility and verifies
that the baseline agent is immutable under shadow scoring. This **synthetic test
fixture is not a real trained H6 model**.

Run:
```sh
node scripts/test-h6-shadow-evaluator.mjs
node scripts/test-qa-h6-release.mjs
node scripts/test-cloudflare-qa-config.mjs
node scripts/test-system-log.mjs
npm run check
npm run lint
npm run test:unit
npm run build
```

## Promotion / rollback
The standing H6 cold-stress independent audit has shown regression. This work
does **not** waive that result. H6.2 holdout and H6.3 signed, fail-closed promotion
gates, matching reward/needs/diversity regression analysis, and QA canary/control
allocation must pass before any treatment. Do not enable H6.4/H6.5 from this PR.

If telemetry or latency regresses, switch off the QA-only
`XOM_H6_SHADOW_EVAL_ENABLED` binding or roll back the QA Worker version. The
current default **requires no rollback** because the scorer is not enabled.

# H6.4 QA Resident Canary — fail closed by default

**Status (2026-10-31):** Code prepared for isolated QA. **No treatment authorized or activated.**
This change introduces a signed two-step H6.3/H6.4 gate and QA-only bounded
selection; it is not a claim that a model improved reward, nor an actual canary
run until verified model SHA, promotion signature, and field metrics exist.

## Cohort and safety
- Only selected `neighbor-N` QA residents can be assigned; never An/Binh/Chi,
  and never Site A or staging.
- Exact signed allowlist; at most `floor(current resident count * 0.05)`
  actors. Minimum population locked in the signed gate; the cohort is stable
  across Cron runs (no reward-based dynamic reassignment).
- Ordinary profile only; cold-stress shared prior **forbidden**. Under
  insufficient energy, hunger, health, night, stale/unavailable weather, a
  mismatched baseline, an ineligible scenario or scoring error, choose the
  existing personal LinUCB decision.
- Only one of the same **41 live catalog actions** may be written to a resident
  plan; 96 synthetic actions are never executable or counted as real learned
  arms. No direct currency, skill, health or reward grants added.
- The existing plan duration and completion/evidence guards remain unchanged.
  No new D1 tables or modifications to policy archive.

## Independent signed promotion gate
`data/training/h6-canary-promotion.json` defaults to
`{"gate":null,"signature":null}`. No private signing key is stored in the
repository or Worker. The gate is Ed25519 signed over
`JSON.stringify(gate)` using a separately approved key. Model artifact is
independently pinned and Ed25519 signed by the H6.1 checker.

Required signed gate fields:
- decision `allow`, matching model/catalog SHA, 41 live and 96 shadow;
- signed, fixed eligible QA actor allowlist, population and maximum 5%;
- H6.1 measured `shadowEvaluationCount >= 1000`, `shadowHours >= 24`,
  `shadowP95Ms <= 25` from a real scoring run (not a CI fixture);
- H6.2 ordinary holdout return CI lower 95% > 0; cold-stress candidate
  disabled, plus protected-needs/diversity/reward safety review;
- independent GitHub PR/issue review URL, existing rollback Worker version,
  expiry within 7 days.

The necessary prerequisites are **currently absent**. A signed `allow` gate
must not be issued merely to exercise a feature; otherwise fail closed.

## QA configuration and rollback
The normal QA deploy configuration explicitly sets:
```
XOM_H6_MODE=shadow-only
XOM_H6_SHADOW_EVAL_ENABLED=false
XOM_H6_CANARY_ENABLED=false
XOM_H6_CANARY_KILL_SWITCH=true
```
To run the separately approved canary in the future, a scoped QA-only
release must pin the signed model and signed gate and explicitly configure
`XOM_H6_MODE=canary`, `XOM_H6_CANARY_ENABLED=true`,
`XOM_H6_CANARY_KILL_SWITCH=false`. Missing any one setting returns to baseline.

Emergency stop: change the QA-only kill switch back to `true`, return
`XOM_H6_MODE=shadow-only`, or roll back to the signed gate's previous
Worker version. Do **not** delete D1 experiences or reset policies.

## Measurement / interpretation
- `h6_canary_result` logs aggregate evaluations, actual choices changed,
  fallbacks, scorer errors, model use, latency p50/p95/p99, version, model SHA.
  No actor IDs, names, contexts, JWT, emails, tokens, decision prompts or raw
  reward records enter this telemetry.
- Use existing completed `agent_experiences` (real actor IDs in private QA
  D1 only) to compare exact fixed cohort vs matched contemporaneous controls,
  stratified by activity, local clock hour, skill headroom, baseline needs,
  and weather. No synthetic priors are counted as earned experiences.
- Monitor Cron failures, D1 durability, action entropy, welfare, policy arm
  coverage, per-actor reward components and observed completed outcomes.
- Require **24–72 hours** of stable day/night observation; with 2/60 QA
  residents, individual effect estimates are noisy and may not identify a
  statistically meaningful uplift. No expansion to H6.5 without a new
  separately signed review.

Tests: `node scripts/test-h6-qa-canary.mjs` checks signer authenticity,
expiry, signature tampering, gates, cohort size, protected needs and default
inactivity. It uses only ephemeral synthetic keys and does not treat residents.

**Do not deploy or activate a canary merely because CI passed.**

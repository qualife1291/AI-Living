# QA catalog: 100 selectable resident action plans

Release scope: **cloudflare-qa only**. The original 41-item `data/city/scenarios.json` and pinned H6 96-candidate artifact stay byte-for-byte unchanged. This versioned expansion adopts the 55 previously reviewed *candidate descriptions* as 55 newly schedulable QA scenarios and adds four distinct scenarios in `data/city/action-pack-100.json`. Their prior synthetic sample counts are **not** imported, copied, or counted; each begins with zero recorded experience.

The total catalog is 41 + 59 = 100 unique IDs. These are **plan-level action types** supported by simulated duration, hard health/sleep/hunger gates, venue, travel, needs changes, skill-domain credit, completed-plan evidence and per-actor LinUCB policy. They are not 100 independent character animation clips, physical object transfers, verified real-world events, or 100 already learned policy arms. UI projections remain based on existing action poses and observable plan/activity, without promising material outcomes.

Old completed evidence retains `OUTCOME_SCENARIO_SIGNATURE`; new IDs receive `EXPANDED_ACTION_SIGNATURE`. H6 model inference, canary and promotion remain gated/off; the 41-arm H6 comparison cannot be reported as a genuine paired result when a new arm is chosen. H6 catalog metadata SHA and 41 legacy fingerprint must remain unchanged. 

## QA acceptance

Run `node scripts/test-action-pack-100.mjs`, `npm run test:unit`, `npm run check`, `npm run lint`, and desktop/mobile Chromium visual tests. Before release require a successful QA-only CI deployment plus Worker version, preserved H6 bindings and Cron, D1 QA binding, HTTP smoke via safe GET and a new completed action record. Never initiate POST pulse just to raise numbers.

Report **catalog=100**, **eligible actions** (context-dependent) and **observed distinct completed action IDs** separately. Expect observed action types to rise gradually, not jump from 38 to 100 without 62 genuinely recorded completions. Compare policy rows, arm counts, sample totals, reward by scenario, CPU/p95 and error logs against pre-rollout baselines. Roll back the QA Worker if runtime or reward regressions exceed accepted bounds; do not alter D1, Site A, production or staging.

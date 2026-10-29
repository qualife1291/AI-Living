## Feature / bug fix
<!-- What changed? Link issue and expected behavior. -->

## Local verification
- [ ] Unit tests / regression for this change
- [ ] Typecheck / lint / build
- [ ] No secret, credential, production data, or unintended database migration

## Real Cloudflare QA (required before promotion)
- [ ] Commit under test was merged/cherry-picked to `cloudflare-qa` (not automatic from `work`)
- [ ] Cloudflare `ai-living-qa` deployment succeeded; record exact build/version/deployment IDs
- [ ] Independent AI agent tested via owner/QA service-token Access
- [ ] API smoke: `node scripts/qa-cloudflare-remote.mjs`
- [ ] Real browser 3D QA, screenshots, console errors
- [ ] Regression scenarios including negative/unauthed cases
- [ ] D1 QA revision & learning sample count before/after where relevant
- [ ] No mutation/cron on Site A or Cloudflare staging

**Source SHA under test:**

**QA Build / Version / Deployment ID:**

**Browser screenshot or artifact:**

**Independent QA agent:**

**Result:** PASS / FAIL / BLOCKED

**Outstanding risks:**


See [Cloudflare multi-agent QA runbook](../docs/CLOUDFLARE_AGENT_QA.md). Do not mark remote QA passed based only on build success, and do not auto-promote QA to production.

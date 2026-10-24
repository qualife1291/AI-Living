# Changelog

## 2026-10-24 — Initial implementation (in progress)
- Added a private Vietnamese 2D neighborhood with An, Bình, and Chi.
- Added resident profiles, goals, persistent memories, relationships, and event journal.
- Added D1 world state, validated event writes, revision checks, and retry protection.
- Added pause/resume, JSON export, and responsive navigation.
- Deferred video export at the owner's request; no paid AI API integrated.
- Added short-term and long-term project memory documentation.

### Verified checkpoint
- Published the owner-private application and verified an AI-generated scene through authenticated write/readback.
- Fixed Worker epoch initialization for the neighborhood creation date.
- Added ROADMAP.md and screenshot-based UI review workflow.
- Schedule activation is blocked by Sites invalid_project; unattended operation is not active.
- Recorded a test-generated duplicate scene for controlled cleanup; mobile QA remains pending.

## Robot residents and expanded neighborhood
- Replaced human portraits with three distinct AI robots, shared across map, profiles, and dialogue.
- Expanded the map with streets, a pedestrian lane, plaza, park, cafe, library, workshop, and community garden.
- Added district views, zoom/reset controls, and matching AI location validation.
- Preserved existing state and memories; passed TypeScript, production build, and desktop map navigation QA.

### Scheduled life setup
- Created an enabled standalone ChatGPT automation for 08:00, 14:00, and 20:00 Vietnam time after the Site-linked scheduler failed.
- The first scheduled execution remains unverified; the world does not think continuously between runs.
- Fixed zoom behavior for every district, and retained the profile panel at tablet widths.

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

## Living neighborhood — source handoff (not published)
- Added a connected pedestrian graph, deterministic activity projection, walking interpolation, and a persistent pause clock.
- Added bounded AI action plans and timed, location-aware dialogue fields with legacy event support.
- Added contextual rule-based greetings, job props/animation, follow camera, route overlay, and activity board.
- Added cat/dog/sparrow behavior rules with source references and explicit simulation labels.
- Added pure simulation/schema tests and comprehensive Codex handoff documentation.
- Exported source without runtime DB, dependencies, Git internals, or credentials. The live Site remains the prior stable city version.

## Animated character handoff v2 (source only)
- Redesigned all three AI robots with distinct silhouettes, panels, sensors and articulated limbs.
- Added a character workshop for walk/work/garden/wave previews and sample speech without world writes.
- Added full-text, wrapped speech bubbles with pop animation and a single active map speaker.
- Added independent tree canopies, windows, awnings, rooftop fan, cafe steam, animal limbs/tails/wings.
- Added four lane-based vehicles and traffic phases, with stop-before-intersection behavior.
- Added animation/traffic/speech tests and primary-source design references; general pedestrian/vehicle collision avoidance remains pending.

### Final character design pass
- Reviewed official Pixar, Disney and Star Wars pages and an author's Chimot rig portfolio; recorded original links and usage in docs/CHARACTER_DESIGN.md.
- Rebuilt silhouettes: An with angular dual optics/tool belt, Bình with a central round sensor/slim body, Chi with pear-shaped ceramic shell/rounded hands.
- Added unique gradient IDs, camera-aware bubble placement, long-word wrapping, and phase offsets for opposite limbs.
- Captured final Workshop screenshot and added it to the source handoff.

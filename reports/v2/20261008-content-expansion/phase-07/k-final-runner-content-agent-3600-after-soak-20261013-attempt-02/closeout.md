# Content-agent 3,600-second lane closeout

- Run: `20261013T173052Z-pid410744` (Chromium, `content-agent`)
- Runner method: `runner_driven_agent_heuristic_semantic_visible_control_v1`; execution record says no model inference and no human tester. Human validation remains deferred.
- Requested duration: 3,600 s. Launcher result: 3,603.84 s; wrapper wall time: 3,606.846 s. Launcher started 2026-10-13T17:30:52.850023Z and finished 2026-10-13T18:30:58.518146Z. Wrapper exit code: 0.
- Recorded lane status: `COMPLETE_STRESS_REVIEW_REQUIRED`; preserve this review-required result as-is, not a pass.
- Raw evidence: `../qa-browser-runs/20261013T173052Z-pid410744/`; wrapper captures exact command, stdout, stderr, preflight, start/end UTC and exit code alongside this note.

## Observed execution

- 58 checkpoints over 3,603.84 s; latest checkpoint at 3,556.54 s. 840 actions across start, explore, navigation, observation, close dialog, advance, combat, equipment, and farming categories.
- 247 actions were classified as no-progress. The result explicitly excludes the currently ineffective control(s) for the current UI state and asks for review. This is a meaningful quality limitation behind the review-required status.
- 11 normal UI save/reload cycles (`normalReloadVerified=true`); saved runtime state matched the reload baseline, with no storage or runtime differences. Raw `reloads.jsonl` has 33 transition-stage records.
- Action deltas recorded 56 saved JSON paths added and no paths removed; the additions shown in raw actions are NPC farming-skill `exp`/`level` paths, not evidence of 56 new content unlocks. The visible-control heuristic explored gameplay menus and actions, but this is not human validation.
- No page, console, request, HTTP, storage, or unhandled browser errors were reported (`errorCounts={}`, `browserErrors=false`).

## State and profiling

- World time advanced 590 to 424,386. Settlement reached town; the final checkpoint reports 57 living NPCs, 0 registry-dead NPCs, 100 food, 100 prosperity, 3,600 total gold, threat level 3 with monster population 100, and boss alive at 100% progress in crisis cooldown.
- Events increased 2 to 130; retained history 2 to 47; pending journal entries ended at 0. Save/localStorage size increased from 83,543 to 164,308 bytes.
- Bounded IndexedDB projection sampled 13 to 7,403 records. Estimated serialized record bytes were 3,577 initially and 1,906,272 at the last checkpoint; each store samples at most 64 rows. This is a projection estimate, not physical IndexedDB or quota usage.
- DOM nodes ranged 2,735–6,771; listeners 428–860; Chromium `Runtime.getHeapUsage` used heap 9,530,728–41,040,980 bytes (first/last 11,205,924/18,057,304). One long task was recorded. Native `Memory.enable` profiling was unavailable in this Chromium build; see raw `profiling-limitations.jsonl`.

## Frozen identity

- HEAD: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Source fingerprint: `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`; result reports source stable throughout the lane.
- Build inputs: `202bdd74f7b6e8c048e303850b9ff2262f170965b1395888b61eb7d70f2a74a0`
- Dist fingerprint: `0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1`
- Browser release SHA-256: `cd1c144e44f8e63a888ddfeeff115e6472cf1a2668419b2df710d0e526f841b9`
- Runner SHA-256: `f65641514aee39d06bc33043965c3c6bc5576165c103e1b1b819290ba037680f`

This was a runner-driven heuristic exploratory lane. Its full requested duration and clean browser-error/reload telemetry do not change the review-required gate or substitute for a human playtest.

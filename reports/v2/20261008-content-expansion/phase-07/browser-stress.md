# Phase 7-K Real Chromium Soak

## Frozen run identity

- Source: branch v2x/reward-core, HEAD e05cc78f1ef452e2672df223f2febf48444dcbd3, src fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58.
- Browser: Chromium 151.0.7922.173, Playwright 1.62.0, Debian 13 x86_64.
- The launcher pinned production build status b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc and dist fingerprint 0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1. Source was stable in both runs.
- No direct state editing, direct worldTime writes, or debug time skip was used. The runner used visible in-game controls, including the Wait 1 day action. Reload boundaries show visible world speed 1; this was not a continuous ×20-speed run.

## Two-hour normal Browser stress lane

- Run 20261013T152918Z-pid405218; start 2026-10-13T15:29:18.869502Z; end 2026-10-13T17:29:20.913459Z.
- Requested 7,200 seconds; actual 7,200.66 seconds.
- Launcher status COMPLETE_STRESS_REVIEW_REQUIRED; 115 checkpoints, 1,646 actions, 23 ordinary save/reload cycles. All 23 matched the saved runtime baseline and preserved worldTime through reload. Source remained stable. ErrorCounts was empty; no page, console, request, HTTP, storage, or unhandled rejection error was observed.
- Actions: 532 advance, 472 navigation, 229 equipment/use, 227 farming, 85 combat, 35 exploration, 13 observe, 52 close-dialog, and one opening action. 496/1,646 actions (30.1%) were marked no-progress by the runner's visible action-state fingerprint. This is an automation/repetition signal; it does not imply that the simulation clock failed to advance.
- World calendar advanced from Year 1 Spring 1 to Year 5 Fall 4. Live NPCs 29→79; settlement hamlet→town; total gold 1,350→3,600; threat 1→3; Boss dormant→alive/cooldown; events 2→150 capped rows; history 2→75; save 83,543→207,774 bytes.
- Boss presence and cooldown were exercised, but the Boss remained alive. This is not evidence of a natural player Boss victory.

| Metric | First | Last | Observed min–max |
| --- | ---: | ---: | ---: |
| localStorage / save bytes | 83,543 | 207,774 | 83,542–207,872 |
| IndexedDB journal rows | 13 | 14,847 | 13–14,847 |
| Bounded IndexedDB serialized-record estimate | 3,577 B | 3,823,102 B | 3,577–3,823,102 |
| DOM nodes | 2,736 | 2,910 | 2,736–6,770 |
| JS event listeners | 431 | 467 | 431–856 |
| Runtime heap used | 7,978,268 B | 14,031,456 B | 7,978,268–42,759,248 |
| Visible action latency | 207.52 ms median | 228.2 ms p95 | 190.78–257.88 ms |
| Browser long tasks | 6 | longest 171 ms | no task ≥500 ms |

The IndexedDB byte figure is a bounded UTF-8 JSON projection estimate from capped read-only cursor samples, not physical IndexedDB usage or a quota measurement. Native Memory.enable was unavailable in this Chromium build; Runtime.getHeapUsage and Memory.getDOMCounters supplied the recorded profiling.

## One-hour content-agent Browser lane

- Run 20261013T173052Z-pid410744; start 2026-10-13T17:30:53.241127Z; end 2026-10-13T18:30:58.518146Z.
- Requested 3,600 seconds; actual 3,603.84 seconds; wrapper exit 0.
- Launcher status COMPLETE_STRESS_REVIEW_REQUIRED; 58 checkpoints, 840 actions, 11 normal save/reload cycles. Reload state matched exactly across 23 core fields and worldTime. Source remained stable. ErrorCounts empty; browserErrors false.
- Action mix: 289 advance, 230 navigation, 117 equipment/use, 114 farming, 42 combat, 14 exploration, 6 observe, 27 close-dialog, and one opening action. The action policy selected Wait 1 day 289 times. 247/840 actions (29.4%) were marked no-progress; the runner specifically stopped reusing the unproductive gear tab for that current state. These figures require review and limit the lane as an exploratory playtest.
- Calendar advanced from Year 1 Spring 1 to Year 3 Summer 25 at the final checkpoint. Live NPCs 29→57; settlement hamlet→town; total gold 1,350→2,610; threat 1→3; Boss dormant→alive/cooldown; events 2→130; history 2→47; save 83,543→164,308 bytes.

| Metric | First | Last | Observed min–max |
| --- | ---: | ---: | ---: |
| localStorage / save bytes | 83,543 | 164,308 | 83,542–164,308 |
| IndexedDB journal rows | 13 | 7,403 | 13–7,403 |
| Bounded IndexedDB serialized-record estimate | 3,577 B | 1,906,272 B | 3,577–1,906,272 |
| DOM nodes | 2,735 | 2,860 | 2,735–6,771 |
| JS event listeners | 428 | 474 | 428–860 |
| Runtime heap used | 11,205,924 B | 18,057,304 B | 9,530,728–41,040,980 |
| Visible action latency | 206.09 ms median | 228.67 ms p95 | 191.87–279.37 ms |
| Browser long tasks | 1 | longest 183 ms | no task ≥500 ms |

The agent run used a deterministic runner-driven visible-control heuristic with no model inference and no human tester. It did not use injected state. The full-duration, reload, error, and memory evidence is valid; its user-intent, route mastery, and retention conclusions remain limited. See agent-content-playtest.md.

## Evidence paths and limits

Raw run data is in qa-browser-runs/20261013T152918Z-pid405218/ and qa-browser-runs/20261013T173052Z-pid410744/. Wrapper closeouts and checksums are in k-final-runner-stress-7200-after-telemetry-20261013-attempt-02/ and k-final-runner-content-agent-3600-after-soak-20261013-attempt-02/.

Native Safari and physical-device tests are excluded. These runs establish stability for the tested Chromium/runtime and duration, not all browsers or human enjoyment.

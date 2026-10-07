# Phase 05-J browser stress run history (interim)

**Current stress-run disposition: latest run PASS for the 1,200-second stress requirement; prior failures remain unchanged.** The newest canonical run completed 1,202.14 seconds with 8,899 UI operations, 103 native reloads, and 108 checkpoints. Both latest long runtimes are terminal and independently reviewed; J runtime evidence is accepted. Final delivery document synchronization remains in progress. Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`.

## Chronology and outcome

| Run | Result duration | Required minimum | Visible UI operations | Native reloads | Dialog cycles | Checkpoints | Failure |
|---|---:|---:|---:|---:|---:|---:|---|
| [Original stress result](browser-runs/stress-20261007T090400Z-pid84623/stress-result.json) | 3.59 s | 1,200 s | 27 | 0 | 11 | 0 | `RuntimeError: Current world has no single built interaction target for tavern` |
| [Stress retry result](browser-runs/stress-20261007T091332Z-pid999/stress-result.json) | 36.02 s | 1,200 s | 349 | 4 | 47 | 4 | Strict-mode ambiguity: `^休息` matched both a recent-event button and the primary `休息 · 1 小時` button. |
| [Prior long stress failure](browser-runs/stress-20261007T093801Z-pid3466/stress-result.json) | 1,165.81 s | 1,200 s | 8,930 | 118 | 1,572 | 120 | Nearby-interaction dynamic list timed out at `dialog.pixel-window .interaction-list button.nth(10)`; not a shop action. |
| [Current detached stress result](browser-runs/stress-20261007T103239Z-pid7428/stress-result.json) | **1,202.14 s PASS** | 1,200 s | 8,899 | 103 | 1,638 | 108 | Completed at target; no terminal error. |

The result `durationSeconds` is the observed run duration, distinct from checkpoint `elapsedSeconds`. The original run had no checkpoint; the retry's last checkpoint was 25.67 seconds versus its 36.02-second result duration. The prior long failure's last checkpoint was 1,089.52 seconds versus its 1,165.81-second result duration. The current canonical result duration is 1,202.14 seconds; its final checkpoint was at 1,200.29 seconds. Raw watcher/log record counts are not canonical UI totals or terminal duration.

The original run began a normal fresh life, opened the ordinary menu and released windows, inspected nearby interactions, then attempted a legal step toward the optional tavern. The fresh settlement did not have a built tavern; the map tile did not establish an available interaction target. The retry exercised menu/windows, shop purchase, recipe and material previews, wood/stone/iron gathering, crafting and equipping, inn rest, and home rest, but stopped on the ambiguous rest locator. The third stress run stopped on the nearby-interaction dynamic list lookup at index 10; this was not a shop action. The fourth run completed 8,899 visible UI operations and 103 reloads over 1,202.14 seconds. These activity traces do not establish player retention or replace Life exploration.

## Source, build, and harness pins

### Current detached run result and correlated assets

The current detached run [`20261007T103239Z-pid7428`](browser-runs/stress-20261007T103239Z-pid7428/stress-result.json) finished **PASS** at 1,202.14 seconds against the 1,200-second requirement, with 8,899 canonical UI operations, 103 reloads, 1,638 dialog cycles, and 108 checkpoints. The [invocation record](browser-runs/j-invocations/20261007T103239260559Z-stress-a8502ac0/execution.json) is `COMPLETE_PASS`, launcher exit code 0, and pass eligible. The fresh-save result records no injected state/time and `sourceStableDuringRun: true`.

Application source commit is `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, source fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`; complete `sourceBefore` and `sourceAfter` hashes match. Release-marker SHA-256 is `2dd6dae695aa8628343af1778a7552cb84a70987f328e921d214016c5a7d61e4`; build-status SHA-256 is `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442`; dist fingerprint is `6824067c45cb8bcda82376c05fa763e1ca109d3be1dbdc8815b00549e5371d16`. Harness pins are launcher `84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297`, driver `5c20b23c7f1bf93ae4dbc55f5bfe902a31ee2022785d8ddf8a6dce7845f31b0c`, support `8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c`, and supervisor `7c603a12380a4e0829983effb092c4f13ae933871117aeecd69dbbec620c6657`.

All served resources matched the pinned dist: `index.html` 200 and 448 bytes / SHA-256 `02dfd359e60ae0cde25de6bbbddb2369ac3633b7916d97b9e3fa1c3fce96741f`; JavaScript 200 and 296,898 bytes / SHA-256 `463c9612fa7a4a7026d5247e10371c36142bfbd4d54046a9543e1e9ebbf9c146`; CSS 200 and 29,768 bytes / SHA-256 `230de3747a4d005dcba6d2984cd2930d9f6430e59ff7eb4d119a3befeadff20e`; favicon returned 204. The runner requested `gpt-6-luna` / `low`; backend runtime is unverified. Its controller is deterministic visible-UI policy with no model inference. Human validation remains deferred.

All observed page, console, request, HTTP, unhandled rejection, storage, and browser cleanup error arrays are empty. Profiling capabilities were confirmed for `Performance.enable`, `Memory.getDOMCounters`, `Runtime.getHeapUsage`, and `Performance.getMetrics`.

### Memory, DOM, storage, and journal observations

The run collected 108 checkpoints: 103 after-native-reload samples, four scheduled samples, and one final sample. Heap used ranged from 11.2 MB to 80.9 MB (median 54.0 MB); the final reading was 55.4 MB. Heap was not monotonic, and terminal heap was below the observed maximum. Across four time windows, median heap was 53.4 MB (0–300s), 62.8 MB (300–600s), 53.5 MB (600–900s), and 41.3 MB (900–1,200s). These values do not show sustained upward heap growth.

Aggregate DOM counters peaked at 13,982 nodes / 2,016 JS event listeners and ended at 2,645 / 529 with one document. The first sample had four documents and 4,786 nodes / 936 listeners; after repeated native reloads the terminal document count returned to one. The runner's page-level DOM telemetry stayed within 876–983 nodes (terminal 879). `DetachedScriptStates` was zero at the final sample. Checkpoint variation and a peak alone are not a leak signal; neither this 20-minute run nor its reload samples rule out longer-horizon leaks.

The normal-save snapshot grew from 81,138 to 154,165 bytes. Origin storage usage started at 26,594 bytes, peaked at 1,905,247 bytes, and ended at 1,244,054 bytes against a reported 6,443,694,998-byte quota (peak under 0.03%). The append-only IndexedDB play journal grew from 29 to 6,695 records; this is expected durable journal accumulation, not evidence on its own of a leak. `journalPending` stayed zero; storage errors stayed zero. The final 30 save-latency samples had median 0.3 ms, p95 0.5 ms, and max 2 ms.

State scale grew with ordinary gameplay: item instances 1→102, NPCs 29→32, and history entries 1→8; event count reached and remained at 150. Save and journal growth alongside these state/reward events provides context for storage growth. Together with the non-monotonic heap and lower terminal DOM counters, this run shows no actual short-run instability or persistent memory/DOM growth requiring a §56 extension. It cannot rule out leaks or resource pressure beyond the 20-minute observation window.

### Prior source-correlated failure

The third run, [canonical result](browser-runs/stress-20261007T093801Z-pid3466/stress-result.json), **FAILED** after 1,165.81 seconds against the 1,200-second target (34.19 seconds short). Canonical totals: 8,930 UI operations, 118 native reloads, 1,572 dialog cycles, and 120 checkpoints. The terminal error was a timeout reading the nearby-interaction dynamic list at `dialog.pixel-window .interaction-list button.nth(10)`; this was not a shop action. Source commit was `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, source fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`, build-status SHA-256 `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442`, and driver SHA-256 `82d73b11f54f68929f7730ddb07ca0e4f65345729ac81ddae3249395ca7ccdfa`. This result records source stability. All recorded page, console, request, HTTP, rejection, storage, and cleanup error counts are zero. Profiling capability checks for Performance, DOM counters, heap usage, and performance metrics succeeded.

The watcher observed 12,568 raw operation-log records and a last checkpoint at 1,089.52 seconds (09:56:13 UTC). Those are watcher/raw-log observations, not canonical UI totals or the actual result duration; use the result's 1,165.81 seconds as the formal duration.

| Pin | Original run | Retry |
|---|---|---|
| Application source commit | `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc` | same |
| Application source fingerprint | `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb` | same |
| Build-status SHA-256 | `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442` | same |
| Served dist fingerprint | `6824067c45cb8bcda82376c05fa763e1ca109d3be1dbdc8815b00549e5371d16` | same |
| Launcher SHA-256 | `84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297` | same |
| Driver SHA-256 | `7adf619295c44935daf1900e5744cd01145930554fef23a912660d17bfde0c15` | `fbb1af096b0b83b7d14f6da20a88e02ac264298183ec93ec15dc4a66375c0f12` |
| Support SHA-256 | `8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c` | same |

Each result records `sourceStableDuringRun: true`, an isolated normal fresh save, and no state/debug-time injection. Both served the same pinned JS and CSS assets. Harness pins are listed separately from application source and build pins because the retry used the corrected driver. The preserved historical source-body gap for the original driver is documented in [the harness diagnosis](j-long-runner-diagnosis.md); its failed raw evidence remains intact.

## Error counters and profiling evidence

All four result files record zero page errors, console errors, request failures, HTTP failures, unhandled rejections, storage errors, and browser-cleanup errors. The three failed runs stopped on runner locator/capability errors; these clean runtime counters do not turn those failures into passes.

The runner reports support for `Performance.enable`, `Memory.getDOMCounters`, `Runtime.getHeapUsage`, and `Performance.getMetrics`. The original stress run ended before a profiling checkpoint. The retry wrote four `after-native-reload` samples: DOM nodes 4,278–4,817; JS event listeners 883–946; used JS heap 14.8–38.1 MB. Both later source-correlated runs recorded capability success for all four profiling APIs. The current full-duration resource measurements are summarized above; they still cannot establish longer-horizon leak behavior.

## Evidence and limits

Raw operations, checkpoints, result JSON, and failure saves remain under all four run directories. The three earlier failures are preserved unchanged; the current run meets its 1,200-second stress requirement. Life is also terminal, and the paired J runtime evidence has independent review acceptance; final delivery document synchronization remains in progress. Brief automated action/reward progression cannot establish player retention. Human judgment remains deferred. The independent helper tests and their limits are recorded in [the runner diagnosis](j-long-runner-diagnosis.md); they do not substitute for the integrated stress result.

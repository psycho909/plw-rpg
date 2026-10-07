# Phase 05-J Life Agent run history (interim)

**Current Life Agent run: PASS for the 1,800-second runtime requirement; earlier failures and interruption remain preserved.** The latest canonical result completed 1,803.22 seconds with 13,936 visible UI operations, 155 native reloads, 2,755 dialog cycles, and 158 checkpoints. This is deterministic runner exploration evidence, not human fun or retention evidence. The overall Phase 5 disposition remains in Root's [final review](final-review.md). Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`.

## Chronology and outcome

| Run | Result duration | Required minimum | Visible UI operations | Native reloads | Dialog cycles | Checkpoints | Failure |
|---|---:|---:|---:|---:|---:|---:|---|
| [Original Life result](browser-runs/life-20261007T090400Z-pid84624/life-result.json) | 16.49 s | 1,800 s | 108 | 1 | 11 | 1 | Click timeout on `暫停`: an open `dialog.pixel-window` heading intercepted the control. |
| [Life retry result](browser-runs/life-20261007T091332Z-pid997/life-result.json) | 39.88 s | 1,800 s | 388 | 5 | 43 | 5 | Strict-mode ambiguity: `^休息` matched a recent-event button and the primary `休息 · 1 小時` button. |
| [Previous interrupted invocation](browser-runs/j-invocations/20261007T093745Z-life/life-interruption.json) | No result / duration unknown | 1,800 s | No canonical count; 14,343 raw log rows | Unknown | Unknown | 133 last recorded | Launcher/Chromium became zombies; no result or exit code. Preserved as INTERRUPTED / NO RESULT. |
| [Current completed Life result](browser-runs/life-20261007T103239Z-pid7426/life-result.json) | **1,803.22 s PASS** | 1,800 s | 13,936 | 155 | 2,755 | 158 | Completed with no terminal error. |

Result `durationSeconds` is actual run duration, not elapsed time at the last checkpoint. The original run's only checkpoint was at 6.28 seconds. The retry's five checkpoint elapsed values were 6.96, 11.34, 21.83, 26.87, and 31.41 seconds; its reported duration was 39.88 seconds. The current run duration was 1,803.22 seconds; its final checkpoint was at 1,801.46 seconds.

Both runs used a normal fresh life, without state injection or debug time injection. The original run inspected nearby store interactions and recipe registry options, compared `wolfFang` and `moonStone` material previews, gathered wood and stone through visible UI, submitted a workbench recipe, inspected the result, equipped crafted instances, and performed a native save. It reached one reload and recorded one checkpoint before the modal blocked the pause action. The retry repeated normal recipe/material planning and visible gathering/crafting/equipment actions, used inn/home rest, and recorded five native reload checkpoints before the ambiguous rest locator stopped it. `lifeNotes` was empty in both results. These brief, deterministic runner actions do not provide subjective human feedback or a retention signal.

## Prior paired invocation: interrupted with no result (preserved)

The [invocation record](browser-runs/j-invocations/20261007T093745Z-life/execution.json) requested 1,800 seconds and started at 09:38:01 UTC on source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`; these are pre-run metadata only. The run is **INTERRUPTED / NO RESULT**. See [life-interruption.json](browser-runs/j-invocations/20261007T093745Z-life/life-interruption.json) and [runtime interruption notes](browser-runs/j-invocations/20261007T093745Z-life/j-runtime-interruption.md). There is no terminal result, process exit code, end time, exact duration, or canonical UI-operation/reload totals. No post-run source-stability claim is available.

Last checkpoint: 1,271.64s at 09:59:15 UTC, with 133 checkpoint records. Last raw operation: 1,273.75s at 09:59:17 UTC. The operations log has 14,343 raw records; it is not a canonical UI-operation count. Watcher snapshot reload/craft values were stale telemetry, not final totals.

At diagnosis, launcher and Chromium process handles were zombies; wrapper exit and end-time files were absent. Cgroup limit was 32 GiB, peak memory 4.58 GB, and `oom` / `oom_kill` counters were zero. This is no recorded cgroup OOM evidence, not proof of historical cause; kernel event logs were unavailable. Terminal runtime error counters are unavailable.

## Source, build, and harness pins

| Pin | Original run | Retry |
|---|---|---|
| Application source commit | `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc` | same |
| Application source fingerprint | `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb` | same |
| Build-status SHA-256 | `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442` | same |
| Served dist fingerprint | `6824067c45cb8bcda82376c05fa763e1ca109d3be1dbdc8815b00549e5371d16` | same |
| Launcher SHA-256 | `84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297` | same |
| Driver SHA-256 | `7adf619295c44935daf1900e5744cd01145930554fef23a912660d17bfde0c15` | `fbb1af096b0b83b7d14f6da20a88e02ac264298183ec93ec15dc4a66375c0f12` |
| Support SHA-256 | `8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c` | same |

The original, retry, and current completed results record `sourceStableDuringRun: true` and serve the pinned production assets. The interrupted invocation has matching pre-run source/build metadata, but no terminal field that establishes post-run stability. Source/build pins are separated from harness pins because the runs used different drivers. The unavailable exact historical source body for the original driver is documented in [the runner diagnosis](j-long-runner-diagnosis.md); preserved result and operation evidence remains available in each run directory.

## Error counters and profiling evidence

The three completed results record zero page errors, console errors, request failures, HTTP failures, unhandled rejections, storage errors, and browser-cleanup errors. For the interrupted invocation, no terminal error counters are available; zero-byte stdout/stderr does not establish clean runtime counters.

The runner reports support for `Performance.enable`, `Memory.getDOMCounters`, `Runtime.getHeapUsage`, and `Performance.getMetrics`. The original run wrote one `after-native-reload` checkpoint at 6.28 seconds: 4,790 DOM nodes, 936 JS event listeners, 9.8 MB used JS heap, and zero sampled page/console/rejection/storage errors. The retry wrote five checkpoints at 6.96–31.41 seconds: 4,755–4,855 DOM nodes, 933–950 JS event listeners, and 18.3–43.0 MB used JS heap; sampled page/console/rejection/storage counts remained zero. These very short samples cannot characterize long-soak memory behavior.

## Current completed Life exploration

The [canonical Life result](browser-runs/life-20261007T103239Z-pid7426/life-result.json) and [invocation record](browser-runs/j-invocations/20261007T103239259277Z-life-ea3f9138/execution.json) report `PASS` / `COMPLETE_PASS`, 1,803.22 seconds against the 1,800-second target, 13,936 visible UI operations, 155 native reloads, 2,755 dialog cycles, and 158 checkpoints. End time was 11:02:43 UTC; the final checkpoint at 1,801.46 seconds is not the formal run duration. The run used normal fresh state, no injected time/state, source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`, and records `sourceStableDuringRun: true`. Served assets matched the recorded build. The runner reported all four profiling capabilities (`Performance.enable`, `Memory.getDOMCounters`, `Runtime.getHeapUsage`, `Performance.getMetrics`). All page, console, request, HTTP, rejection, storage, and cleanup error arrays were empty.

At 10/20/30 minutes, timed notes recorded world time 31,060 / 52,509 / 78,266, levels 10 / 11 / 13, gold 5 / 3 / 1, and Smithing 5 throughout. `currentGoals` was empty in all three notes. At 10 minutes the workbench observation was unavailable; at 20 minutes the selected `ironShortSword` long goal was not visible at the workbench. At 30 minutes the actual workbench was at the public store, showed `starterSpear` selected and already at its practice cap, required wood 3 and stone 2 (held 5 and 2), and required a 4-gold fee while only 1 gold was held. It displayed `ironShortSword` as unlocked, yet the runner's `longGoal` still named that recipe while the visible selected recipe remained `starterSpear`. The note recorded repeated store/house/rest actions: 7 store-navigation, 7 nearby-interaction opens, 6 house-navigation, 4 store opens, 3 house opens, and 3 rests in the recent action window. The terminal full state likewise had 1 gold and Smithing 5.

This is evidence of a runner-policy wall / coverage gap: the deterministic runner did not route to the advanced blacksmith station, sell items to generate gold, or acquire property. The run therefore does not establish that ordinary players are inevitably stuck, that the product cannot progress, or that ownership fails. At the full timed-note state, identity records include resident, miner, smith, skilledMiner, and adventurer; smithing actions 153; reputation 26; and “熟面孔” reputation rank at game time 73,959. `life.properties` was empty at that point. Because the runner has no property-purchase action, this is not evidence of a product ownership defect.

Timed-note projections report `recipeId: null` for 159 newly observed items because the projection reads a top-level recipe field. Do not infer missing provenance from that projection. Full `lastLifeNoteState.reward.instances` and `result.crafts` records contain 153 actual `craftProvenance` entries: 58 `starterSpear`, 49 `fieldArmor`, and 46 `fieldSpear`; 12 used `wolfFang`, 3 used `wolfHide`, and none was an `ironShortSword`. These are automated-runner outcomes, not human preference data. A follow-up scenario should explicitly exercise advanced-station travel and a sustainable gold strategy, plus property acquisition if ownership progression is in scope, before deciding whether the observed policy wall reflects a product progression problem.

## Evidence and limits

Result JSON, operation logs, checkpoint telemetry, failure saves, and browser traces remain in the linked run directories. Original failures and the prior interruption remain preserved. This run satisfies the Life Agent duration requirement for its recorded source/harness scope; overall J disposition is recorded by Root in [the final review](final-review.md). Deterministic actions and reward progress cannot answer whether people will keep playing. Human validation and retention conclusions are deferred; no subjective human finding is claimed here. Focused harness helper checks are summarized in [the runner diagnosis](j-long-runner-diagnosis.md) and are not full-duration integrated acceptance.

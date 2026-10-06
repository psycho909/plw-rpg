# Phase 3 production Chromium stress

## Outcome

The completed run **PASS**ed 1,425 UI cycles, 7 reloads, 17,647 operations and 41 telemetry checkpoints. Actual browser interval: 2026-10-06T07:06:02.209845+00:00–2026-10-06T07:26:02.820006+00:00 UTC (2026-10-06T15:06:02.209+08:00–2026-10-06T15:26:02.820+08:00 Taipei), 1200.610 seconds. Wrapper interval: 2026-10-06T07:06:01.108979+00:00–2026-10-06T07:26:03.028626+00:00 UTC (2026-10-06T15:06:01.108+08:00–2026-10-06T15:26:03.028+08:00 Taipei), exit 0.

The run used Chromium 151.0.7922.173 with production source frozen from base `6568b466390d06e6be0af2585e7524b9415204b8`. All 74 source fingerprints match the freeze, build and stress run. Harness SHA-256: `1423a3638721e7866feb78b3e863d4723f60d8d4a9228d44ec84a34347e47280`. The requested runner profile was GPT-6 Luna / low; runtime identity is unknown because telemetry is unavailable. See [baseline-current.json](baseline-current.json) for observed environment versions and author-requested profile metadata.

## Results

- Real UI shop purchases, wolf progression, combat cues, boss reload/retry/cooldown, inventory and equipment modal cycles completed; no death was detected.
- Page errors: 0; unhandled rejections: 0; storage errors: 0; console error records: 1. Raw details remain in `stress-browser.json`.
- Initial checkpoint at world time 480: population 30 (29 living NPCs, 0 dead), monster population 12, save bytes 78,928, event/history 1/1.
- Checkpoint 41 (last telemetry checkpoint) at world time 13,341: population 30 (29 living NPCs, 0 dead), monster population 2.5499999999999994, goblin boss progress 1.9500000000000004, event ring/history 150/2, pending journal 0, save bytes 103,002, origin storage estimate 794,592 bytes, 2,786 CDP nodes, 529 actual JS listeners and 18,189,164 used JS heap bytes.
- The distinct actual final state at world time 13,390 was captured 49 game minutes later: 30 population (29 living NPCs, 0 dead), monster population 2.5499999999999994, goblin boss progress 1.9500000000000004, wolf boss defeated at 5,967, 150 event-ring entries (sequence 1,658), history 2, pending journal 0 and 4 reward items. It is 12,910 game minutes (8 days, 23 hours, 10 minutes) from the initial state. Compact UTF-8 JSON serialization is estimated at 103,036 bytes from the captured state object, not a stored byte counter. The final state has no DOM, heap or listener counters.
- CDP nodes ranged 2,174–3,354; actual JS listeners 449–609; JS used heap 6,242,428–40,564,800 bytes. Counters varied across reload regimes and natural garbage collection. This does not prove leak-free behavior or close C03.
- Last-checkpoint rolling save window: n=100, p50=0.200 ms, p95=0.400 ms, max=0.500 ms (chronological first/last 0.200/0.100 ms). Playwright click/response wall-time: n=3001, p50=33.937 ms, p95=49.542 ms, max=75.036 ms (chronological first/last 33.959/8.051 ms). Click timing is not FPS or browser-frame latency.

Full ranges, quantiles and approximate reload grouping are in [qa-summary.json](qa-summary.json). Regression evidence is retained in [metrics-repro.json](metrics-repro.json) and [metrics-repro.md](metrics-repro.md). Metric `first`/`last` values now follow chronological checkpoint order; distribution statistics are unchanged. Approximate reload-group endpoints were already chronological. Checkpoints have no reload ordinal, so grouping uses saved world-time markers and is explicitly approximate.

## Earlier failed attempt

`20261006T065612Z` remains a separate failure: 13.163 seconds, wrapper interval 2026-10-06T06:56:12.870602+00:00–2026-10-06T06:56:27.201097+00:00 UTC, exit 1. Its raw logs, screenshot and archived JSON version are retained. Do not combine its short interval with the successful run. The completed retry’s actual clock was the 20-minute interval above.

This is not a two-hour soak. Existing C01 export/interleaving, C02 full-journal retention and C03 detached-DOM/listener observations remain open. Human Fun Gate and retention survey remain **DEFERRED / NOT APPLICABLE AT THIS STAGE**; automation does not replace human evidence.

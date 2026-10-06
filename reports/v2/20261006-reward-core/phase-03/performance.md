# Phase 3 performance and data-growth observations

Source base `6568b466390d06e6be0af2585e7524b9415204b8`; all 74 frozen source fingerprints match the build and Chromium run. The run lasted 1200.610 seconds (2026-10-06T07:06:02.209845+00:00–2026-10-06T07:26:02.820006+00:00 UTC; Taipei 2026-10-06T15:06:02.209+08:00–2026-10-06T15:26:02.820+08:00), with 41 checkpoints, 7 reloads and 1,425 cycles.

`first`/`last` denote chronological endpoints. Min, p50, nearest-rank p95 and max use sorted values; correcting endpoint order did not change distribution statistics. Checkpoint 41 is the last telemetry checkpoint; the captured final browser state followed it.

## Checkpoint metrics

The table summarizes 41 recorded checkpoints (p95 uses nearest rank). Save latency uses the last checkpoint’s 100-sample rolling window because checkpoint windows overlap. Click response is Playwright automation wall time, not browser-frame time.

| Metric | Min | p50 | p95 | Max | First checkpoint | Last checkpoint |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Living population | 30 | 30 | 30 | 30 | 30 | 30 |
| Living NPC / dead NPC | 29 / 0 | 29 / 0 | 29 / 0 | 29 / 0 | 29 / 0 | 29 / 0 |
| Player gold | 45 | 246 | 314 | 322 | 45 | 322 |
| Monster population | 1.02 | 1.53 | 2.55 | 12 | 12 | 2.55 |
| Goblin boss progress | 0 | 1.17 | 1.95 | 1.95 | 0 | 1.95 |
| Event ring entries | 1 | 150 | 150 | 150 | 1 | 150 |
| Major history entries | 1 | 2 | 2 | 2 | 1 | 2 |
| Pending journal | 0 | 0 | 0 | 1 | 0 | 0 |
| Save bytes | 78,928 | 102,939 | 103,595 | 104,869 | 78,928 | 103,002 |
| Origin storage estimate bytes | 2,398 | 426,521 | 767,701 | 794,592 | 2,398 | 794,592 |
| CDP DOM nodes | 2,174 | 2,747 | 3,219 | 3,354 | 2,174 | 2,786 |
| Actual JS listeners | 449 | 529 | 593 | 609 | 449 | 529 |
| JS used heap bytes | 6,242,428 | 19,843,392 | 37,117,628 | 40,564,800 | 6,242,428 | 18,189,164 |

Settlement remained a hamlet and food reached its cap of 100. Settlement gold is not exposed in this checkpoint schema. The event ring is capped at 150 in observed samples; history ended at two entries. Pending-queue size does not measure the full IndexedDB archive, so C02 stays open.

## Initial and actual final captured state

The initial captured state at world time 480 had population 30 (29 living NPCs, 0 dead), monster population 12, player level/gold 1/45, hamlet food 78, event ring/history 1/1, pending journal 0 and no reward items. Compact UTF-8 JSON serialization is 78,928 bytes.

The actual final state was captured at world time 13,390, 49 game minutes after checkpoint 41 at 13,341. It had population 30 (29 living NPCs, 0 dead), monster population 2.5499999999999994, goblin boss progress 1.9500000000000004, wolf boss defeated at 5,967, player level/gold 7/322, hamlet food 100, 150 event-ring entries (event sequence 1,658), two major history entries, zero pending journal entries and four reward items. This is 12,910 game minutes (8 days, 23 hours, 10 minutes) from the initial world time. Compact UTF-8 JSON state size is estimated at 103,036 bytes from the captured object; no final browser save-byte counter was stored. DOM, heap and listener counters are only available from checkpoint 41.

## Reload and natural garbage collection

Seven saved reloads were recorded: one mid-boss, then six periodic saves. DOM nodes/listeners and heap increased in some per-document spans and fell after reload; the overall checkpoint series shows no clear monotonic listener/node increase across reload regimes. Heap fluctuated naturally; no forced GC or retainer analysis was run. The first sample had four CDP documents during harness setup; later steady samples usually had one. This data cannot support a no-leak claim, and C03 remains open because the run does not include long-term detached-node or retainer analysis.

Last-checkpoint rolling save window: n=100, min=0.000, p50=0.200, p95=0.400, max=0.500 ms; chronological first/last 0.200/0.100 ms. Click-response: n=3001, min=6.086, p50=33.937, p95=49.542, max=75.036 ms; chronological first/last 33.959/8.051 ms. Neither is FPS or browser-frame latency.

The run was about 20 minutes, not two hours. It does not close C01 export/interleaving, C02 unbounded full-journal retention, or C03 detached DOM/listener observations. The prior 13.163-second failed attempt is excluded from these metrics.

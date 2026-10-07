# Phase 4-F candidate verification record

These are sanity/preflight attempts only. No 100k loot run or final balance result was produced. The active final runners remain pending the post-freeze Low sanity and formal run.

Each `f-refresh-attempt-*.captured.log` preserves only the visible output excerpts from the tool transcript, not complete process stdout/stderr files. The wrappers retained a combined output string; independent streams and exact exit codes were not preserved. Truncation status is marked unknown where the tool transcript did not say. No command was rerun to recreate missing output.

| Attempt | Vitest start | Duration | Result / failure class | Source evidence |
|---|---|---:|---|---|
| 01 | 2026-10-06 12:24:15 | 1.12s | combat reload deserialize rejected a reward save; loot test passed | Full source before/after manifest not retained. |
| 02 | 2026-10-06 12:24:37 | 5.60s | combat reload deserialize rejected the then-current affix-control fixture; loot test passed | Full source before/after manifest not retained. |
| 03 | 2026-10-06 12:25:00 | 5.97s | combat reload rejected duplicate-affix fixture at seed17/edge/affixControl/grayWolf/turn2 | Full source before/after manifest not retained. |
| 04 | 2026-10-06 12:25:18 | 8.75s | Ready fixture asserted combat Lv5 but observed combat Lv6; loot test passed | Full source before/after manifest not retained. |
| 05 | 2026-10-06 12:25:44 | 10.64s | combat matrix and replay loop reached final source guard; source manifest changed during run, so no PASS claim | Commit unchanged; fingerprint d8480c5fc48717eabae218621f77b15c7b4725d486007de4ce4344cfdc6a1819 → e995a5965f3b934de5f166dff8c281ed0ce284f32d375209406a9961604ac88b; PlaceWindow changed, InventoryWindow stable. |

Attempt 05 reached the final source-stability check after the combat scenario/replay loops, then failed because `src/components/PlaceWindow.vue` changed during the run. It is not a PASS and cannot be used as a baseline. Its complete source manifest and independent streams are unavailable.

The first save-reload failures exposed an invalid stat-only counterfactual; the second legal affix-swap attempt also selected duplicate Bleed and Piercing affixes. The current candidate rejects that combination. The Ready progression check then showed actual Lv5 hero / Lv6 combat skill and was corrected. These candidate revisions were not archived individually; the original Phase 4-A runners/config remain byte-identically archived.

Published with `scripts.recorded_reports.write_recorded`; the JSON index is the machine-readable evidence manifest.

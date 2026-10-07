# Stress browser retry 01 — independent runtime results review

Status: **STRESS RETRY ACCEPTED; PHASE 4 AGGREGATE REMAINS FAILED**

Reviewed the preserved runtime artifact `archive/stress-browser-retry01.json` and launcher record `final-runs/stress-browser-retry01-20261007T010451Z-pid46028/launcher-status.json`. No runtime was rerun and neither source artifact was modified.

## Provenance and execution

The runner reports PASS for 1,200.691 real seconds (01:04:53.293–01:24:53.984 UTC), 1,499 cycles, 17,043 operations, 1,499 gear-modal cycles, seven reloads and 19 checks. The launcher records COMPLETE, runner and launcher exit codes 0, stable before/after provenance, and cleanup of only its owned HTTP server (PID 46030; expected SIGTERM exit `-15`). HTTP index and JS/CSS bundle bytes match the stored runtime build record. The run uses HEAD `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`; the runner, build status and launcher all agree on the same 74-file source map and canonical fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`. The archive projection matches its latest archive playlog entry.

## Fresh save, gameplay and reloads

The normal run started at level 1 with 45 gold, an empty reward instance/equipment map and `saveInjected: false`; `controlledFixture` is false. The runner captured the first native storage write at world time 480. It records actual UI loot inspection/equip decisions and wins against all five wolf definitions, including a Wolf King win and exclusive Moon Fang Spear discovery. Seven reload records include the boss mid-fight save/reload and six periodic exact reloads. The original status remains FAIL at 31.919 seconds; this retry is a separate report and does not rewrite that result or the aggregate.

Interpret equipment from the correct data model: final `reward.equipped` maps Alden's weapon to `item-4` (Moon Fang Spear) and armor to `item-3` (chain armor). `characters[].equipment` is the separate legacy fixed-slot object and remains `{weapon: null, armor: null}`; it does not mean the reward gear was unequipped.

## Errors and resource evidence

The report separates one console error, zero page errors, zero unhandled rejections and zero storage errors. The sole console message is the expected local `GET /favicon.ico` 404; the launcher server log shows HTTP 200 for the index and both bundles and the remaining 404 is limited to the absent favicon.

Sampled heap, DOM and listener counts fluctuate and fall from their peaks: heap used size starts at 6.34 MB, peaks at 29.92 MB, and the last checkpoint is 9.69 MB; DOM nodes are 2,174 → 3,729 peak → 2,242; listeners are 449 → 587 peak → 462. Persistent browser storage usage rises from 2,398 to 472,706 bytes and save size from 78,928 to 105,707 bytes over gameplay; final `playJournal.pending` is empty. This is persistent save/journal growth, not evidence of continuing process-memory growth in this sample. It does not close inherited C01/C02/C03 findings.

V2X Phase 4 spec §41 does not trigger a 60- or 120-minute extension here: this retry contains no game-loop, Save/Journal architecture, IndexedDB or renderer-lifecycle change, sampled heap/DOM/listener values are not persistently increasing, and no new stability finding needs confirmation. The storage increase remains observable and should be interpreted with the existing journal-growth finding; this decision does not close that finding or clear older two-hour soak evidence.

## Boundary

This review accepts the Phase 4 stress retry result only. The original aggregate stays FAILED, and Adventure retry results are pending separate review; no overall Phase 4 PASS is claimed. Human Fun Gate and retention remain deferred.

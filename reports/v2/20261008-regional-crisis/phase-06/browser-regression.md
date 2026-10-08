# Phase6 Browser Regression

## G focused UI verification — scoped PASS WITH FINDINGS

Base commit `9a23a5df2130aec03f76e5eaaababae1f5e9e72b` plus frozen G source fingerprint `a8677ce861ac914a9f2da45a25951a2137929f0782f18b82921b89d558f1bb38`. Source/build provenance and exact browser version: g-browser-final-report.json and raw g-browser-runs. All 90 source hashes and production assets were recorded; no source drift or page/console/request errors in successful current-build run234011. Independent normal180second clock evidence also retained.

Normal opening/clock/modal time continuation/save-reload passed. Controlled V7 fixture cases passed warning+needs, food/gold ledger increases, equipment inline confirmation/item removal/allocation/reload, forest camp/Chief combat entry, measured aftermath/legacy-unknown reload, Escape and narrow viewport. Food/gold exact final counters were not serialized; only actual ledger increases asserted. Combat entry was tested, not victory. Normal natural warning was not reached in this short lane; this does not claim J's fresh full event arc. UI stale-before-confirm race remains untested; engine stale-ID rejection has separate regressions.

All original harness failures remain: input hash/directory/API errors, incorrect fixture phase timestamp, modal control interception, reload initializer overwriting saved fixture, wrong warning target, exploratory repeat-confirm selector after correct UI removal. Latest metric is checkpoint count, not game days (161 checkpoints; raw visible normal clock day1 08:00–21:59). Raw legacy mislabeled keys retained/corrected via recorded artifacts.

J formal evidence below supersedes the earlier “NOT RUN yet” status. Human DEFERRED / NOT APPLICABLE AT THIS STAGE.


## J formal browser evidence — mixed lane disposition

Frozen HEAD `bd316cb326e5fbc20087c0154d6e3f294a5daac7`, fingerprint `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`; source stable in both production Chromium runs. `npm run check` passed (531 tests, type/build; see `j-build-status.json`).

- Stress `20261008T013358Z-pid56003`: 1201.08s normal / 1207.49s total; 21 checkpoints, max interval 61.60s, 741 visible-policy choices with reasons, 4 visible UI save/reloads. The formal trace reports 19 crisis-phase UI action choices (2 combat initiations + 17 combat turns); this is a choice count, not 19 successes or contributions. Runner narrow `normalCrisisActionCount=4` is also a taxonomy count. One major contribution event #66 and setback resolution #75 are present, but trace omits actor ID/full ledger/crisis ID; it cannot establish NPC automation. Natural fresh warning→preparation→active→aftermath completed; aftermath save/reload verified at cooldown with setback outcome and no invariant mismatches. Browser/page/console/request/HTTP and storage errors: zero. **Stress duration and arc evidence pass.**
- Agent crisis `20261008T013358Z-pid56004`: 1800.20s normal / 1806.75s total; 31 checkpoint JSONL rows (30 scheduled samples plus final), max interval 62.07s, 1069 visible-policy choices with reasons, 5 periodic visible reloads. First crisis reached aftermath and trace records contribution event #66, but omits actor ID / complete contribution ledger; it does not establish NPC automation or a Life-ledger contribution. A second crisis reached active as the fixed run ended. `aftermathSaveReloadVerified=false`, `complete=false`; therefore **duration/metrics pass, full normal arc incomplete**. Generic `PASS_J_BROWSER_NORMAL_ARC` status is not accepted as proof of completed arc.
- IndexedDB journal counts grew 9→1135 and 10→1601, with pending journal zero at all checkpoints. Full resource/latency measurements are in `performance.md`. Controlled fixture lanes remain separate from normal fresh runs.

Earlier selector failure (~186s), SIGKILL (~339s), and successor-modal failure (~493s), plus other first attempts, remain preserved in their original directories. Do not infer browser stress acceptance from dry runs. Exact 20k-history profile is controlled evidence, not normal soak. Policy controller is scripted with visible-world reason strings; it is not model inference or human play. Requested tier Low; backend runtime not independently verified. Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`.



## Strict-ID fresh arc supplement — attempt incomplete

`j-normal-arc-runs/20261008T035215Z-pid60577` ran the reviewer-approved recorder SHA `5fda218320bc96536b2267e577c8d20ad035b24a8f954eb84e19391f0f6f55e5`, source HEAD/fingerprint matching above, from a fresh normal UI opening (seed 909). It followed crisis ID `goblin-regional:0000038d:1` through warning → preparation → active → aftermath with no browser errors and did not start combat. The visible crisis report offered no contribution controls in warning/preparation; `crisisActions` is empty, so this run provides no real food/gold Life ledger contribution evidence. Aftermath save/reload then failed the recorder’s full-save equality check on only `lastSavedAt` (1791431561867 before, 1791431561991 after); the run status is FAILED and no success is claimed. Preserve the trace as a failed supplement, not as a pass. The raw full-save/policy trace records each phase and reason.

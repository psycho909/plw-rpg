# Phase 7 Bug Register — Current Disposition

K verification source: branch v2x/reward-core, test-time HEAD e05cc78f1ef452e2672df223f2febf48444dcbd3, recursive src fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58. Original failures remain in their named attempts and archived report versions. Product findings are listed separately from confirmed bugs.

| ID | Severity | Finding | Current disposition | Evidence / scope |
| --- | --- | --- | --- | --- |
| P7-C01 | P1 when open | Director cooldown boundary could reject Boss cooldown after midnight at the 100-key limit. | Fixed and regression-covered. | C1 source fix and follow-up full checks; c-regression-final.md, d-root-closeout.md, and retained C1 RED/final tests. |
| P7-C02 | P1 when open | Outdoor authored-family victory could enter the dungeon progression branch and award/advance dungeon state. | Fixed and regression-covered. | C2 correction, d-root-closeout.md, and retained outdoor/dungeon regressions. |
| P7-C03 | P1 when open | Valid full director map could overflow at midnight without a daily marker. | Fixed with bounded writer behavior and regression-covered. | C3 correction, save-integrity tests, and d-root-closeout.md. |
| P7-B01 | P2 | Content validator missed malformed/reference/consumer/duplicate conditions. | Fixed; validator contract reviewed. | B1–B7 historical REDs and final tests/review remain in A/B evidence. |
| P7-A01 | P3 evidence | Initial regex counter missed same-line legacy registry members. | Counter fixed; original inaccurate Markdown archived. The initial incorrect JSON snapshot was not archived and cannot be claimed preserved. | content-baseline.json, A regression artifact, and baseline history. |
| P7-D-HIST | P2 auditability | Original Cave Insects validator input bytes and authored-source fingerprint from the first failure are unavailable. | Permanent historical evidence limitation. Owner accepted the documented limited compensating-evidence condition; current-source revalidation passes. The missing original bytes were not recovered. | d-evidence-recovery-20261013.md, d-remediation-disposition.md, d-remediation-run/, and retained failure/checksum evidence. |
| P7-I-FOCUS | P2 accessibility | Positive-tabindex search controls were skipped by keyboard focus traversal. | Fixed in PixelWindow; focused production Browser selector smoke passes 42/42 and independent Spec review passed. | k-ui-selector-20261013/, docs/UI.md, and i-review-closeout-20261013.md. |
| P7-K-RUNNER-SPEED | P2 QA harness | Scheduled save/reload paused the world and did not restore prior visible speed. | Fixed; RED/GREEN contracts cover 0/1/5/20 speeds and the corrected 1,200-second lane passed. Reloads in the final full lanes preserved speed 1 and matched state. | k-runner-reload-speed-20261013/ and raw Browser runs. |
| P7-K-REGION-CLASSIFIER | P2 QA harness | Generic region news filter was misclassified as exploration, causing repeated no-content actions. | Fixed: standalone region tab is ignored, while Explore Region / Go to Region remain valid; contracts and production Chromium confirmation pass. The first 1,800-second run remains diagnostic. | k-runner-region-classification-20261013/ and original raw lane. |
| P7-K-WATCHDOG | P2 QA harness | A stalled Browser turn could leave the controller without stage-specific supervision. | Fixed: stage heartbeats and a 120-second stale-stage process-group watchdog are covered by contracts. | k-runner-menu-rotation-20261013/green/watchdog-stale-heartbeat/ and retained interrupted-run evidence. |
| P7-K-IDB-BOUND | P2 QA harness | IndexedDB row caps did not bound serialization allocation for nested records or BigInt. | Fixed: bounded projections restrict nodes/depth/text/properties; truncated/failed samples suppress byte estimates. | k-runner-menu-rotation-20261013/patch-20261013-indexeddb-record-bounds/ and patch-20261013-bigint-projection/. |
| P7-K-SHORT-RELOAD | P2 QA harness | Short smoke lanes could finish before the periodic reload and produce a false negative. | Fixed: short non-regression lanes perform one ordinary visible save/reload; RED retained and GREEN exact state equality passed. | k-content-agent-smoke-60s-20261013/ and patch-short-smoke-final-reload-20261013/. |
| P7-K-DESTRUCTIVE-RESET | P2 QA harness | Stress policy treated destructive reset controls as ordinary navigation. | Fixed, independently reviewed, and covered by the complete 7,200-second current-source acceptance soak; no destructive reset occurred in the full run. This was a harness defect, not a product save/load bug. | destructive-action-guard-20261013/, k-post-patch-regression-smoke-20261013/, and k-final-runner-stress-7200-after-telemetry-20261013-attempt-02/. |
| P7-K-CHECKPOINT-TELEMETRY | P2 QA harness | Checkpoints omitted NPC counts, settlement, economy, threat, and Boss state required for QA. | Fixed and independently reviewed. The 41-contract suite and both full Browser lanes record supported state fields; the full lanes report zero Browser errors. | npc-death-history-20261013/, qa_browser_runner.py, qa_browser_contract.py, and the two final raw Browser runs. |
| P7-K-WOLF-DROP-DRIFT | P3 maintainability | Content-facing wolf drop eligibility duplicates resolver rules. | Open maintainability debt; no current behavior failure was observed. Recommend one shared eligibility helper/source to prevent hint/drop drift. | Independent Standards review; src/engine/contentFamilies.ts and src/engine/itemGeneration.ts. |

## Confirmed bug severity summary

- P0: none open.
- P1: none open; P7-C01/C02/C03 are fixed and regression-covered.
- P2: no newly open product defect. P7-D-HIST remains a historical auditability limitation with its accepted compensating-evidence condition; Phase 7-K harness findings listed above are fixed.
- P3: P7-K-WOLF-DROP-DRIFT remains open as maintainability debt.

## Product design and evidence findings — not bugs

- Early/mid Boss controlled fixture win rates are low; natural gear/tactic progression is not sampled. See monster-balance.md.
- Natural new-content encounter rates and natural player Boss defeats remain unmeasured. The long-world simulation has no player encounter actions.
- Craft fee versus output sale is not a full market-cycle audit because purchase price, stock volume, restock, and natural material acquisition were not modeled.
- Crop efficiency needs multi-season/yearly rotations, stamina, and crisis-demand comparison; see G evidence.
- IndexedDB row count and bounded serialized-record estimates grow over the tested browser durations. No quota failure occurred and the estimate is not physical storage. Treat this as a measurement watch, not a confirmed leak or P1 issue.
- The one-hour heuristic's 247/840 no-progress actions and lack of route-specific intent are test-evidence limitations, not player reports and not confirmed product bugs.

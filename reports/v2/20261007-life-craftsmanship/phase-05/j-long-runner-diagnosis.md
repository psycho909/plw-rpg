# Phase 05-J browser runner diagnosis and harness correction

Disposition: **focused harness correction verified; J long runs remain failed and unaccepted.** The two original failures below are preserved byte-for-byte. No browser rerun, duration bypass, long-pass marking, source/application change, or release action was performed.

## Preserved failure evidence

- `browser-runs/stress-20261007T090400Z-pid84623/stress-result.json` records FAILED after 3.59 seconds and 27 visible operations. The exception is `RuntimeError: Current world has no single built interaction target for tavern`. Its operation log shows the runner successfully inspected menu, nearby NPC, and shop surfaces, then tried to interact with a tavern while probing optional companion availability. The failure is a runner capability check: a tile can exist in map data while the building is not in `settlement.buildings`.
- `browser-runs/life-20261007T090400Z-pid84624/life-result.json` records FAILED after 16.49 seconds and 108 visible operations. The exception is a normal Playwright click timeout for the visible `暫停` control; the trace says the open `dialog.pixel-window` heading intercepted pointer events. The raw log shows normal crafting, result inspection, and equipment actions immediately before the failure. `save_reload()` called `pause_clock()` before closing that gameplay modal, so the harness clicked an underlying control through an open modal.
- Both failure saves show the ordinary fresh-life settlement building list `house`, `farm`, `store`, `inn`; neither lists `tavern`. The tavern map tile alone is not evidence that the optional feature is built.

## Correction and path review

- Added `navigate_optional_place()` to feature-detect optional buildings from both the current settlement built list and the actual map tile. Unavailable optional surfaces are recorded and skipped. The secondary tavern observation uses that capability check.
- Low-stamina recovery now tries an available inn, then uses the ordinary visible home `休息` action. The home action is rendered in `PlaceWindow.vue` and is not coupled to inn availability. Station-closed recovery uses the same optional inn handling after its normal home-rest attempt.
- `pause_clock()` now closes any visible native dialogs via the established Escape/visible-X path before clicking the visible speed control. This covers its initial exercise, `save_reload()`, and Hybrid entry call sites.
- Required navigation still calls strict `navigate_place()` / `route_to()` paths: store, farm/farmland, forest, and other actual required targets retain their visible landmark and legal-route assertions. No forced clicks, direct state/storage changes, synthetic time jumps, or skipped required surfaces were introduced. No product defect was evidenced by these two failures.

## Regression checks and limits

- Added three focused regressions for absent/present optional-building navigation and dialog closure before clock interaction.
- `python reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py` — 19 passed.
- `python reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_support.py` — 3 passed.
- `python -m py_compile reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py` — passed.
- These checks validate the harness helpers only. They do not establish integrated browser behavior, stress duration, Life Agent duration, or J acceptance. The preserved original failures remain FAILED evidence; Root must review the harness correction and authorize fresh source/build-correlated full-duration runs.

## SHA-256 record

Current owned harness/support files:

```text
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py fbb1af096b0b83b7d14f6da20a88e02ac264298183ec93ec15dc4a66375c0f12
reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py b28f9ce23cf252041f0778144272d6d91c8caa774d66a7f27b1a318b8c1807ee
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_support.py 8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py 84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297

```

Preserved failed artifacts (unchanged):

```text
reports/v2/20261007-life-craftsmanship/phase-05/browser-runs/stress-20261007T090400Z-pid84623/stress-result.json 0131ae336ee03c5c03566706059b49dfa0e77ab20d00c1596b9da8a15b8b134d
reports/v2/20261007-life-craftsmanship/phase-05/browser-runs/stress-20261007T090400Z-pid84623/operations.jsonl 844251d15239cc83b7b7a776ed8dd35cd7f9a636d426dc2ef92c009e5c49a415
reports/v2/20261007-life-craftsmanship/phase-05/browser-runs/life-20261007T090400Z-pid84624/life-result.json b3706d7fcebd84358674058dfeb9f082b9e2af83068590c3dc73c2baf779538b
reports/v2/20261007-life-craftsmanship/phase-05/browser-runs/life-20261007T090400Z-pid84624/operations.jsonl 19aff3f6bbe7169dda62912e5e897735966e86420038c50d1ce0857992ddb3bd
```

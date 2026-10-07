# J nearby live-list race diagnosis and fix

**Status:** QA-driver fix frozen for independent review. The normal UI code, source build, release marker, and branch HEAD were not changed. This report does not accept the interrupted long runs.

## Finding

The failed stress run `stress-20261007T093801Z-pid3466` ended `FAILED` after 1165.81 seconds with 8,930 driver operations, 118 native save/reloads, and 120 checkpoints. The source was stable and browser/page/network/storage/rejection error arrays were empty. Its failure was a driver selector timeout at the nearby interaction list: `Locator.inner_text` waited for `.window-body .interaction-list button.nth(10)` after the rendered list changed. The pre-fix driver counted the live collection, then read `nth(i).inner_text()` repeatedly at `phase05_browser_driver.py:562–565` (source snapshot SHA below). This reads indices that can shift when the normal nearby list updates. The completed one-time NPC observation and store observation had already succeeded; the later route opened the nearby dialog and failed while traversing its changing rows. No product-source defect is indicated.

A separate Life retry `life-20261007T093801Z-pid3464` was interrupted by the supervisor after prolonged inactivity with no result/stdout. Root classified it `INTERRUPTED`, not PASS. Its raw directory remains intact.

## Scoped changes

- `BrowserDriver.nearby()` now takes one rendered-label snapshot from the active `附近的生活` dialog, requires exactly one matching visible target, then reacquires that control by its anchored accessible name inside the same list. If it disappeared or became ambiguous, the driver fails closed without clicking another row. The final action uses a 5-second bound.
- `state_summary()` now reads `ownership` from canonical `state.life.properties`; stale top-level and settlement aliases are ignored.
- No `.first`, force-click, browser storage write, state injection, product source, build output, release-marker, or HEAD change was made.

## Preimage and RED evidence

The exact pre-fix driver source 82 remains archived at `harness-snapshots/82d73b11f54f68929f7730ddb07ca0e4f65345729ac81ddae3249395ca7ccdfa-phase05_browser_driver.py` with SHA256 `82d73b11f54f68929f7730ddb07ca0e4f65345729ac81ddae3249395ca7ccdfa`. The exact pre-fix test file remains archived at `harness-snapshots/19c39828f7bef4bd8360fb440e7ad67410ec54904718a8d68e4878c8f1719639-test_phase05_browser_driver.py`.

The ownership regression first failed because the summary returned the stale top-level object instead of the canonical home property. RED stdout SHA256: `7dc507ee4f170a15cecc1ccbe0c6cdaff243c157dfa6dfca82b4fcdea6a80a42`.

```text
F
======================================================================
FAIL: test_state_summary_reads_ownership_from_canonical_life_properties (test_phase05_browser_driver.BrowserDriverLifecycleTest.test_state_summary_reads_ownership_from_canonical_life_properties)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/plw-rpg/reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py", line 185, in test_state_summary_reads_ownership_from_canonical_life_properties
    self.assertEqual(summary["ownership"], [owned_home])
AssertionError: Lists differ: [{'id': 'stale-top-level'}] != [{'id': 'home-1', 'ownerId': 'hero', 'kind': 'home'}]

First differing element 0:
{'id': 'stale-top-level'}
{'id': 'home-1', 'ownerId': 'hero', 'kind': 'home'}

- [{'id': 'stale-top-level'}]
+ [{'id': 'home-1', 'kind': 'home', 'ownerId': 'hero'}]

----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (failures=1)
```

The nearby regressions first failed on `RuntimeError: stale dynamic nearby row`; the disappearing-target test also confirmed the old path did not produce the required fail-closed result. RED stdout SHA256: `aa07f77b7eae02152f5b25cd5cda832483cd2a565e1466376cfcda9ba7df9bd7`.

```text
EF
======================================================================
ERROR: test_nearby_uses_snapshot_and_reacquires_target_after_live_list_shrinks (test_phase05_browser_driver.BrowserDriverLifecycleTest.test_nearby_uses_snapshot_and_reacquires_target_after_live_list_shrinks)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/workspace/plw-rpg/reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py", line 497, in test_nearby_uses_snapshot_and_reacquires_target_after_live_list_shrinks
    driver.nearby("forest")
  File "/workspace/plw-rpg/reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py", line 564, in nearby
    if visible_label_match(rows.nth(i).inner_text(), visible_name)]
                           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/workspace/plw-rpg/reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py", line 202, in inner_text
    raise RuntimeError("stale dynamic nearby row")
RuntimeError: stale dynamic nearby row

======================================================================
FAIL: test_nearby_fails_closed_if_required_target_disappears_after_snapshot (test_phase05_browser_driver.BrowserDriverLifecycleTest.test_nearby_fails_closed_if_required_target_disappears_after_snapshot)
----------------------------------------------------------------------
RuntimeError: stale dynamic nearby row

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/workspace/plw-rpg/reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py", line 516, in test_nearby_fails_closed_if_required_target_disappears_after_snapshot
    with self.assertRaisesRegex(RuntimeError, "nearby target .* disappeared"):
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: "nearby target .* disappeared" does not match "stale dynamic nearby row"

----------------------------------------------------------------------
Ran 2 tests in 0.001s

FAILED (failures=1, errors=1)
```

## Verification

- Focused `test_phase05_browser_driver` + `test_phase05_browser_support`: **29/29 PASS**.
- `py_compile` for the driver and test module: PASS.
- `git diff --check`: clean.
- Bounded real UI probe: `PASS_SHORT_UI_SMOKE`, 1.611 seconds, 3 normal UI operations, Chromium `151.0.7922.173` at `/usr/bin/chromium`. A fresh context had no pre-app save; the bounded probe used the same native-opening guard and exact scoped `起身` click sequence as the existing driver `main()` bootstrap, then the updated nearby driver selected exact `橡谷聚落` from the rendered `附近的生活` list and observed the matching dialog. The list contained two rows (`家`, `橡谷聚落`), so this is only an actual short selector smoke; the >10-row shrink is covered by the deterministic regression test. Page, console, request, HTTP, storage, and rejection error lists were empty.
- The first two short-smoke attempts are preserved separately and classified as setup failures: (1) the configured Playwright headless-shell executable was missing; (2) after using the already-installed Chromium, the probe initially omitted the normal opening-screen `起身` action and a native opening dialog intercepted the background click. Neither attempt changed state through injection or provided evidence of a product defect. The passing probe uses the regular opening-screen control.

Raw short-smoke directories:

- `browser-runs/nearby-selector-smoke-20261007T102046Z-pid6207/` — missing bundled browser executable; result SHA256 `57d047129a121476dc2ae12d626790ab7d94b1a79d7bbe5349ceca1de14346b0`.
- `browser-runs/nearby-selector-smoke-20261007T102210Z-pid6342/` — opening dialog intercepted the premature background click; result SHA256 `a4bfa42eca386101c2e4c1fce5c8c94457d6a3be863675d3427d9978aaf23c9d`.
- `browser-runs/nearby-selector-smoke-20261007T102349Z-pid6557/` — bounded passing selector smoke; result SHA256 `74c6318494b7f18a5bb277fc5ed3fcacc4457750fdaa36df65a8c55831a99245`.

Original stress result/raw output remains in `browser-runs/stress-20261007T093801Z-pid3466/`; `stress-result.json` and `runner.stdout.log` each have SHA256 `e655aef46da915aab7563f77a25071a28cb7b331476aa98ffcdd127221479f49`.

## Source/build correlation and author metadata

The bounded smoke verified the production dist through the existing owned static HTTP helper. Recursive source fingerprint before and after was `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`; dist fingerprint was `6824067c45cb8bcda82376c05fa763e1ca109d3be1dbdc8815b00549e5371d16`; build-status SHA256 was `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442`. HTTP served exact index, JS, and CSS bytes; favicon returned 204.

- Current driver SHA256: `5c20b23c7f1bf93ae4dbc55f5bfe902a31ee2022785d8ddf8a6dce7845f31b0c`; frozen copy: `harness-snapshots/5c20b23c7f1bf93ae4dbc55f5bfe902a31ee2022785d8ddf8a6dce7845f31b0c-phase05_browser_driver.py`.
- Current test SHA256: `fb0d57b35228f6147742249da0a54e61754cc5d5f4244237d530876d040d2c41`; frozen copy: `harness-snapshots/fb0d57b35228f6147742249da0a54e61754cc5d5f4244237d530876d040d2c41-test_phase05_browser_driver.py`.
- Report producer: `g6_luna_max_phase5_influence_contract_fixer`; requested author GPT-6 Luna, max effort; backend runtime unverified.
- Short-smoke runner requested GPT-6 Luna, low effort; backend runtime unverified; deterministic single-route runner, no model inference.

This work does not claim a 20–30 minute stress pass, a 30–60 minute Life pass, human validation, or Phase 5 acceptance. It is frozen for Root’s independent Medium review before any later release-marker or long-run decision.

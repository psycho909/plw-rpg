# Phase 5 C pilot lifecycle, fresh-context, and route repair

Status: focused harness QA **PASS**; C normal pilot acceptance remains pending.

The pre-app guard runs from Playwright's document initialization while `document.readyState` is `loading`. Real Chromium observed no `oakvale-v1` value before app scripts; after the app acquired its save writer, the native opening save matched `openingSeen=false`, world time 480, event sequence 1, 45G, 84 stamina, zero wood/stone, and zero generated instances. The test server now returns an empty HTTP 204 only for `/favicon.ico`; all other requests remain ordinary static-file responses and all console errors remain gated.

The Root-authorized full pilot run `c-normal-20261007T035615Z-pid63323` failed before entering the store with `AssertionError: Normal UI navigation did not reach the store: {'x': 8, 'y': 9}`. The captured save places the store at `(10, 8)`. Diagnosis found `shortest_path` returned inside its reconstruction loop, dropping the start node and truncating the route. The return is now after the loop. A deterministic BFS contract checks start inclusion, legal adjacent steps, shortest route length, and a legal target; real Chromium follows visible movement controls to a store-adjacent tile. This is a harness regression from this repair, not an application defect.

That full run still proves startup, the actual Playwright `start()`/returned-object `stop()` lifecycle, server cleanup, favicon handling, final result publication, and unchanged frozen source/assets. It ended with `sourceStableDuringRun=true`, no browser or runner cleanup errors, and the dynamic source map unchanged at 79 files. It never reached crafting or the earlier post-equip/save stage, so the original inner save exception remains unknown. The original attempt and retry01 artifacts remain preserved; no retry was run here.

Focused verification:

- `python reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_c_normal_pilot.py`: 3 tests passed, including an actual Chromium startup, baseline, favicon, shutdown, and movement smoke.
- `python -m py_compile ...`: passed for harness and focused tests.
- Inert prepared-mode invocation: passed and remained inert without `--go`.
- Production build status still matches the 79-file source map and all `dist/` asset hashes.

Hashes for the current green freeze:

- Harness: `2d4de2a11c7360d60214f587f771f9eec34afe1d275def8c2821427598c64b08`
- Focused tests: `ad1b14449f30049a3107a4557d9b0db90f436957788d7f6ec650b952280f925e`
- Source fingerprint: `16b862ee6acd1090010cdedc17fbd22a658ad11fc87a1258fbcaaea5655ea287`
- Build status: `e8fff3c60cec112686bc587ae1ca71285e7f555e2401126178967e0aac4b057f`
- Production index: `8376f04c3d0873c0e65f03e9d3af1ef9336125b731d40eb93a892ab049efb77e`
- Production JS: `fa112722498ab0f052c9586a783ab13cc966de1879a67ef6e15a291c04e7aa0a`
- Production CSS: `46974fe4010d8397ee906f7a36a0424908d7cc2e2620a8c078dda8a2cf137784`

Preserved run evidence:

- Fresh guard RED output SHA-256: `cb6a7e4d1c4a5af860510d613cce48ed21820f740a8e041f91cc0b871632ed2c` (c-runner-lifecycle-guard-red02.txt); it failed because the pre-app observation was absent.
- Navigation RED output SHA-256: `9949cb9ccee9fb9c5f1fe3b68f309de68e0d93ea08ffc692a213542da34a3cb4` (c-runner-navigation-red.txt); actual Chromium movement stopped at x8,y9 before the store.
- Full pilot result SHA-256: `61356be2e13513f4052cd4b569ef4a5cab7d0b334e3da0a5a96a1e730c24b500`; raw action log SHA-256: `cec40a07341b09fe4c3acbd787b559ccb6e2f4558697ed06f73df60084a4bbfb`; failure-save SHA-256: `c4f36ce8c6d98829df4b1c30e15be5c60c674720a039080ac2af8544a2b1b48b`.
- Focused GREEN report SHA-256: `99f4ad60ef333e18210d43f05b4893066da4f6de0fc8854ecb7da5fe1f3f4596`.

Next action: Root/Low owns the next complete C normal pilot using this frozen harness and test hash. No product source, Git history, or later Phase 5 stage was changed.

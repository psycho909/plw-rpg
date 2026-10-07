# Controlled gear sale browser check — independent review

Status: **SELECTOR DELTA ACCEPTED FOR ONE CONTROLLED RETRY; PRIOR ATTEMPT FAILED**

Reviewed the fixture builder, fixture metadata/save, and browser entry point statically. No fixture build, browser run, tests, or source mutations were performed.

## Standards

The fixture is scoped and isolated as documented. It uses the recorded normal-UI V1 village save, migrates through the current public `saveService.deserialize`, generates an affixed alpha item and the exclusive boss base through public reward APIs, round-trips through current serialization/validation, and changes only declared controlled fixture fields. The source save and fixture hashes match metadata. The current 74-file source map matches both metadata and the canonical build-status map at fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`. The tested tile `{x:11,y:8}` is walkable in the village region, and the runner writes only its own report/screenshot paths.

The UI assertions are well targeted: they read the displayed sale price, verify the confirmation text, compare state after cancel and Escape, check the worn-item disabled rule, assert sale payout and inventory removal while retaining collection entries, detect a sold item's dangling V2 or legacy equipment reference, and compare persisted state after explicit save/reload. The 390px screenshot is preceded by a document-overflow assertion.

## Initial spec findings — closed by reviewed delta

**P2 — The run does not prove the visited server serves the frozen build assets.** `controlled_gear_sale.py:45-53` verifies the current source map and `build-status.json`, but `:153-157` only opens `PLW_V2_URL` and checks that `.world-map` is visible. The build status contains source/check/build fingerprints, not HTTP bundle hashes; the runner never compares the URL's index or JS/CSS responses with `dist` or the stored `final-runtime-status.json` asset hashes. A stale or mismatched app server could therefore satisfy the fixture and sale UI checks. Bind the URL to the known production asset manifest or an owner-controlled server readiness record before this is treated as source-71d evidence.

**P2 — Captured browser runtime errors do not prevent PASS.** At `controlled_gear_sale.py:150`, `pageerror` events are appended to `result["errors"]`; the success path at `:261` sets `status = "PASS"` without asserting that the list is empty. A browser exception not otherwise caught by a locator assertion can produce a PASS report with runtime errors. Fail the run before PASS when `result["errors"]` is nonempty (and preserve the error details).

## Delta review — 2026-10-07

The author preserved the pre-fix runner in the controlled directory playlog at SHA-256 `cb6436d8ead7150cc708b2ded87de9f217b03596daa3a387f376809b0d1dfd12`. The current runner is SHA-256 `d964901414495b45f9ef5e327ee95e63a1292b65700ab6ed63f907a0819494f5`.

Both P2 findings are closed statically. `verify_served_build()` now compares the selected URL's index bytes and hash with `dist` and the original `final-runtime-status.json`, parses the index's local JS/CSS paths, constrains each resolved path to `dist`, and requires each served bundle's bytes and hash to match both `dist` and the stored runtime manifest. It also verifies the runtime server's frozen HEAD and source map. Before setting PASS, the browser path now raises when captured `pageerror` entries exist; the existing failure handler records FAIL and details.

The author reports read-only HTTP checks against the existing 5216 server matching the expected index, JS and CSS hashes. No browser or fixture was launched for this delta review. This closes the prior findings and clears the runner for Root's one-off Low gate. A preflight HTTP mismatch fails closed before Chromium starts; it does not convert into a PASS.

## Selector failure and retry delta — 2026-10-07

The first actual browser attempt is preserved as **FAIL**, run `2026-10-07T01:40:36Z`, ending `01:40:42Z`. It failed on the first spear locator before the 390px screenshot and before any cancel, sale, or save/reload assertions. The current projection and two unique raw copies are byte-identical at SHA-256 `a26d954ab48ac834f030866c548d4b7b0ef1d1c22d67ace8a01bdbe7905c19bc`; the attempt is recorded in both local and parent playlogs.

The failure evidence shows the ARIA button label as `稀有 獵矛 Lv.5`, while `InventoryWindow.vue` renders rarity/base and level in adjacent spans. Playwright's `has_text` text content can therefore concatenate these nodes as `稀有 獵矛Lv.5`. The selector-only retry delta changes exactly three patterns from `\s+` to `\s*` (spear selection twice and Moon Fang Spear selection once); the source/build asset guard and pageerror-before-PASS guard are unchanged. The current runner SHA-256 is `b21064241eda23eace7c6c27d2e0cabcd2454ae5085bd6f3d5d3c879e86605a2`.

The authored pure check reproduces both captured ARIA labels and concatenated text nodes, demonstrates RED for the strict pattern and GREEN for the optional-whitespace pattern, and its pattern matches the three inspected runner selectors. It reports two tests and py_compile passing; I did not rerun either. The test uses a copied regex rather than extracting it from the runner AST, so regression coupling is limited; direct diff inspection confirms the runner's three changed patterns match the GREEN pattern. This is sufficient to clear one controlled retry, not to claim the UI coverage has passed.

The retry must preserve this first FAIL and use its own unique raw output. No browser, fixture, or test was rerun during review.

## Boundary

The artifact remains explicitly controlled and cannot support a normal-play, adventure, stress, soak, or full-suite claim.

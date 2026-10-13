# Phase 07 G independent QA closeout

Date: 2026-10-13 UTC  
Repository: `/workspace/plw-rpg`  
HEAD: `e05cc78f1ef452e2672df223f2febf48444dcbd3`

## Automated checks

`npm run check` passed at 2026-10-13 07:49:28.909–07:50:14.667 UTC (45.758 seconds): 35 test files, 612 tests, and the production build all passed. The focused crop set passed at 07:51:03.950–07:51:21.097 UTC: 5 files and 173 tests. Raw streams and result records are under `g-browser-and-regression-run/attempt-01-g-independent-qa/`.

The focused set included `src/engine/crops.integration.test.ts` and save-service crop coverage. The crop integration test verifies that a planted crop survives serialize/deserialize; the save-service test verifies that batch and minute-by-minute simulation mature crops at the same instant. This is unit/integration evidence, not a successful browser reload observation.

Eight sequential `node scripts/validate_content_batch.mjs --pack ... --report ...` runs passed: each of the seven registered packs and the merged pack reported Content PASS, Overall PASS, zero errors, and zero warnings. Each CLI run also passed its targeted 23-test check and `vue-tsc --noEmit`. The seven-pack merged pack SHA-256 is `67940cf6d922530da76c02fe7490ba73512f08ab02ffc234bbdd4b68d4a21f52`.

Measured merged counts: 6 families, 66 monsters, 72 loot tables, 48 equipment, 48 materials, 11 crops, 11 crop goods, 24 recipes, and 0 affixes. The crop pack itself contains exactly 11 crops and 11 crop goods. The validator measured 66 qualifying monsters, 107 candidate item IDs, and 48 usable materials in the combined pack; the item count exceeds the 100-item cross-stage threshold. Full per-pack counts, qualifications, statuses, and raw child-check output are in `attempt-01-g-independent-qa/content-validator-summary.json` and `content-validator-cases/`.

## Source and build integrity

The run began and ended at HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`. The frozen source/config/package manifest contained 119 files and was unchanged across the full check, focused tests, eight validator invocations, and browser attempt 05. Browser-attempt before/after maps are `attempt-05-g-visible-ui/source-before-browser.json` and `source-after-browser.json`; `source-integrity.json` records zero changed paths.

Build artifact SHA-256 values at browser-attempt start and end were identical:

- `dist/index.html`: `1557171a18c048556a2c7301a60930b1ede246bbabf5e530b5a603ce2178b1d6`
- `dist/assets/index-DVItqLSz.js`: `d737286a3b82fd2a6c21393c41842ff0b74f5ad1c3735a6c3c6f290f8d0c1d87`
- `dist/assets/index-DmiWzmoy.css`: `b76cc82a4d2fccd3ef0737700963ccae4aba6a3fedda8c26cc82eb30e7f86870`

## Headed Chromium smoke

Chromium 151 ran headed (`headless: false`) on Xorg display `:99`, with a 1280×900 browser viewport. The attempt used the Vite development server and the current frozen source. The screenshot at `attempt-05-g-visible-ui/farm-current-season.png` shows the visible spring farm UI and its pea, turnip, and cave-mushroom choices. The UI flow started a life, traveled to the farm, selected peas, prepared a plot, and planted. At the end of that step the visible plot reported 12 hours remaining.

The browser runner failed before maturity, harvest, crop-good conversion, or reload verification. The runner had paused world time before planting and did not resume the simulation after selecting the ×20 control. This is a smoke-harness/control failure, not evidence of a product crop failure. The bounded attempt was stopped and retained; no browser retry was run. Its raw exit code is 1, captured duration is 116.837 seconds, and the recorded terminal error is `page.waitForTimeout: Target page, context or browser has been closed` after the `prepared-and-planted` step.

Browser observations in attempt 05: zero page errors, zero failed requests, and one console error caused by the development server returning 404 for `/favicon.ico`. Earlier attempts 01–04 also stopped on runner selector mistakes before reaching crop growth; their individual event records and screenshots remain in their separate attempt folders. No product source was changed during any attempt.

The smoke therefore does **not** prove harvest, crop-good-to-food conversion, browser reload persistence, or a real `contributeCrisisFood` action. Crisis support was not reachable in this short flow. Those remain evidence gaps. The known review finding for crop IDs `toString`/`constructor` is also not closed by this evidence; Root is handling the fix and focused post-fix checks separately.

## Evidence index

- Full check, focused crop tests, extracted packs, all validator raw results, source maps, and summary: `g-browser-and-regression-run/attempt-01-g-independent-qa/`
- Headed Chromium initial and farm screenshots, exact runner, raw streams/status, browser/page error capture, source/build before-after maps: `g-browser-and-regression-run/attempt-05-g-visible-ui/`
- Preserved harness setup failures: `g-browser-and-regression-run/attempt-01-g-independent-qa/browser/` and `attempt-02-g-visible-ui/` through `attempt-04-g-visible-ui/`

This is independent runner-driven QA evidence. It does not claim independent code review or close the browser-only acceptance items above.

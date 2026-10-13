# Phase7-G Root Review Closeout — 2026-10-13

**Disposition: PASS WITH FINDINGS.** Root accepts the G implementation for local stage progression and releases the already-approved Phase7-H scope. This is an engineering/content integration gate, not a Phase7 Product Gate.

## Frozen source under review

- Branch: `v2x/reward-core`
- Git HEAD during implementation and verification: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Runtime source was the working-tree snapshot at that HEAD, not a prior build. The final `npm run check` retained before/after source hashes and did not observe source changes while running.
- Crop data SHA-256: `d49418c074d0bb5757db26b40c1342e169e29975caf717095fec668246af30a8`.
- Final selected source hashes and generated production asset hashes: `g-integration-run/final-npm-check-20261013-retry-01/source-before.sha256` and `build-after.sha256`.
- The run is not yet a commit-pinned release artifact; Phase7-K must freeze and fingerprint the final integrated source before release-mode QA.

## Scope and implementation

G adds 11 distinct crop definitions and 11 associated crop-good definitions alongside legacy wheat (12 total crop choices). Crop identity remains in the existing `cropId` save field. Existing `farm()` callers still default to wheat; registered crop data supplies season, growth, yield, material binding and food value. Harvested goods remain materials until explicitly converted, and conversion consumes the goods and adds the registered food value. Crop food can then use existing farm-business and Regional Crisis supply paths. No save schema, RNG model, offline progression or parallel crop subsystem was added.

The public `farm()` plant path now rejects inherited object keys such as `toString`, `constructor` and `__proto__` before cost/preflight/state mutation. The minimal regression and its RED/GREEN evidence are preserved under `g-integration-run/prototype-key-red-20261013/` and the final crop integration tests.

## Verification

- Full repository check at source HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`: `npm run check` passed, **35 files / 614 tests**, `vue-tsc --noEmit`, and Vite production build. Raw output, exit code, timestamps, source hashes and asset hashes are under `g-integration-run/final-npm-check-20261013-retry-01/`.
- Content validation: seven independently validated packs plus the merged pack passed; zero warnings and errors. Merged observed totals are 66 qualifying monster definitions, 107 candidate item IDs, 48 usable materials, 11 new crops and 11 crop goods. Crop-good mirrors are not separately added to the item count. Raw reports remain under `g-independent-qa-20261013.md` and its listed validator run directories.
- Economy simulation: 108 public-API scenarios (12 crops × 3 fresh seeds × farming levels 1, 3, 6) passed. All new crop goods converted and sold through public actions; unavailable-season planting rejected without mutation. Farm-business supply consumed converted food. Details and raw CSV/JSON are in `g-economy-simulation/attempt-01/`.
- Production Browser: Chromium 151.0.7922.173 against the production preview passed the actual spring pea flow: select, plant, x20 growth, harvest 4 pods, convert 1 pod into 1 food, save, close, wait 2.015 seconds, reload and compare the raw bootstrap `worldTime`. Saved and loaded time were both 1303; food and remaining crop goods persisted; no offline progress occurred. Zero page errors and failed requests; one non-product `/favicon.ico` 404 console error. Full event log and screenshots: `g-browser-and-regression-run/attempt-10-g-crop-flow/`.
- Strict design audit: no findings, warnings or errors; retained at `g-browser-and-regression-run/design-audit.json`.
- Independent Medium spec delta review cleared the prototype-key fix. Independent Medium standards review found duplicated legacy wheat presentation rules across the farm window, world projection and maturity event; recorded as a low-severity maintainability finding, with no refactor in this scope.

## Preserved failures and corrections

The original QA report remains at `g-independent-qa-20261013.md`; it records the first headed-Chromium attempt stopping while world time remained paused. Root's first browser retry failed on a modal-overlay selector; the next run's assertion incorrectly expected all crop goods to be consumed after converting only one; another intermediate assertion expected world time not to advance after a live reload. These were runner/assertion issues, not confirmed product failures. The final Browser attempt closed the page before waiting and checked the bootstrap save time before active simulation ticks. The first crisis fixture supplied too little food to cross the warning forecast; the corrected fixture harvested four plots and supplied 13 food. All initial and corrected outputs remain in their attempt folders.

The first full check after adding the crisis integration test passed Vitest but failed TypeScript because the test narrowed a crisis phase to `warning` and compared it to `dormant`. That raw failure remains under `g-integration-run/final-npm-check-20261013/`; the test assertion was corrected to inspect the actual supplied-food ledger, and the retry passed. The public-API test verifies conversion accounting and a real Phase6 crisis contribution.

## Product / balance findings

1. The new crop loop currently has zero gold input costs. Time, stamina, crop seasons and output conversion constrain it, but the 108-run single-cycle projections show several seasonal crops outperform legacy wheat on both food-equivalent and sale-gold throughput during their valid seasons. G defines no numeric balance threshold. This is not treated as an engineering bug or silently retuned; Phase7-J must compare yearly rotations, stamina/rest burden, prices and crisis supply before deciding whether a balance adjustment is warranted.
2. The wheat display/growth presentation is duplicated across three owners. It is a low-severity maintainability item and does not block G.

## Gate and next stage

- Phase7-G: **PASS WITH FINDINGS**.
- Human validation: `DEFERRED / NOT APPLICABLE AT THIS STAGE`.
- Phase7-H is released under `tickets/20261008-v2x-07h-world-crisis-integration.md`, limited to existing World Director/region/seeded encounter eligibility and Phase6 crisis compatibility; no second crisis architecture or unrelated content changes.
- Phase7-I remains blocked until Root accepts H. Final Phase7 quantity, balance, long-world and full QA gates remain open.

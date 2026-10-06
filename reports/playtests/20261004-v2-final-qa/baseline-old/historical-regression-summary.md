# V2 Engineering Regression Report

Status at 2026-10-05 04:28 UTC: frozen-source regression and engine validation PASS. The formal two-hour Browser soak and the three restarted UI exploration routes are still running; their final evidence is not included in this checkpoint. Human Fun Gate remains PENDING, and V2 Product Gate remains NOT YET APPROVED.

Source is branch `work`, full commit `c02b600c6f5f1533374d671b707d333c86d852d7`. Production source was not changed during this QA continuation. Engine reports record this full commit and source-file SHA-256 maps; the immutable build fingerprint is in [build-manifest.json](build-manifest.json).

## Regression and browser evidence

| Scope | Result | Evidence |
| --- | --- | --- |
| Full check at frozen source | PASS, exit 0: 14 test files / 222 tests, `vue-tsc --noEmit`, Vite production build | [`regression-initial.log`](regression-initial.log) |
| Chromium UI checks | PASS, 28 checks | [`browser/browser.json`](browser/browser.json) |
| Firefox UI checks | PASS, 8 checks | [`browser/firefox.json`](browser/firefox.json) |
| Persistent idle and close/reopen | PASS, 3 checks; real close 4.087s, same-profile state fields exact; frozen-page catch-up 3.579s | [`browser/persistent-idle.json`](browser/persistent-idle.json) |
| Extended Active Idle | PASS, 2 additional checks; real page freeze 55.083s caught up 2,210 game minutes at ×20; real close/reopen 57.477s with saved and loaded worldTime both 2,719 | [`browser/extended-idle.json`](browser/extended-idle.json) |
| V1→V2 migration | PASS, 7 native V1 fixtures generated from V1 commit `75662ae3b5aa4045976a2844b41c01d4bbcef340`; 48,982 recursive legacy fields compared in total | [`engine/fixtures/manifest.json`](engine/fixtures/manifest.json), [`engine/migration-results.json`](engine/migration-results.json) |
| Multi-seed long-term engine | PASS, seeds 17 / 909 / 2026 at years 10 / 50 / 100; exact batching and annual reload continuation | [`long-term.md`](long-term.md), [`engine/long-term-results.json`](engine/long-term-results.json) |
| Ownership, counterfactuals, RNG | PASS for executed branches and scans; food arc is explicitly untriggered under passive observations | [`engine/ownership-lifecycle.json`](engine/ownership-lifecycle.json), [`engine/arc-counterfactuals.json`](engine/arc-counterfactuals.json), [`engine/rng-determinism.json`](engine/rng-determinism.json) |
| Formal two-hour Browser soak | RUNNING, attempt-04; started 2026-10-05 03:49:30 UTC, target 7,200 seconds | [`soak/attempt-04/checkpoints.json`](soak/attempt-04/checkpoints.json) |
| Life / Adventure / Hybrid UI routes | RUNNING after restart; route-specific final reports still pending | [`life/`](life/), [`adventure/`](adventure/), [`hybrid/`](hybrid/) |

The 28 Chromium checks, 8 Firefox checks, 3 persistent-idle checks, and 2 extended-idle checks are reported as separate evidence sets; the idle checks are not folded into browser regression counts. Browser runs had no page errors; the recorded console diagnostics are two missing-favicon 404s.

The original `npm run check` was run at the same frozen commit and exited 0. QA-only report runners were then corrected or extended and run without changing production source. Exact commands and exit codes are recorded below.

## Engine verification

- `node --check reports/playtests/20261004-v2-final-qa/engine/extended-engine-validation.mjs`: exit 0.
- `node reports/playtests/20261004-v2-final-qa/engine/extended-engine-validation.mjs`: exit 0; emitted PASS reports through `scripts/recorded_reports.py`.
- `node --check reports/playtests/20261004-v2-final-qa/engine/long-term-validation.mjs`: exit 0.
- `node reports/playtests/20261004-v2-final-qa/engine/long-term-validation.mjs`: exit 0; three-seed, 100-year daily observation and yearly headless SaveService reload comparisons passed.
- `node --check reports/playtests/20261004-v2-final-qa/engine/generate-v1-fixtures.mjs && node reports/playtests/20261004-v2-final-qa/engine/generate-v1-fixtures.mjs`: exit 0; V1 fixture SHA values remained stable and the dungeon-entry manifest trace was corrected to stop at `enterDungeon`.
- `node --check reports/playtests/20261004-v2-final-qa/engine/validate-v1-migration.mjs && node reports/playtests/20261004-v2-final-qa/engine/validate-v1-migration.mjs`: exit 0; all seven migration fixtures passed.

The engine runner fingerprints are SHA-256 `2c2fc8272594322b173111329e4366f9379287e67e5dcd089adc7cf6fdef0e22` (extended validation) and `e45c7048c1d3a02f2cd5939363a00c37e93e8d2a419bf47ff3e7ad9c91c5725a` (long-term and NPC validation). The full production source commit remains the frozen commit above; no app source was edited.

## Findings and scope

A normal public-action seed-909 route earned identity and reputation and acquired a home, land, and farm business. At natural granary capacity, `supplyFarmFood(state, 1)` returned `聚落糧倉空間不足。` and left the state exactly unchanged. Daily observations of three passive 100-year worlds recorded no food arc and minimum food of 78; this is reported as a product finding, not a food-counterfactual PASS. The iron arc was tested separately after ordinary market purchases induced its candidate condition.

A natural seed-17 road arc was split into Life, Combat, and Mixed branches from one identical reaction checkpoint. Life survived and performed normal farming but did not satisfy the hunt request, so the road resolved ignored. Combat and Mixed used ordinary encounters, combat turns, and public request fulfillment and resolved helped. There is no public action to fund or organize settlement defense or evacuate residents; those actions remain unimplemented and are not counted as passes.

The static source scan found zero `Math.random(` call sites in 56 source files. Identical public action sequences with seed 2026 produced exact full-state and RNG equality after headless save/reload.

All seven V1 fixtures preserve and compare legacy fields, RNG, world time, history, threat, settlement, dungeon, and party; V2 defaults validate; repeated migration is idempotent; and each fixture continued deterministically for three days. The dungeon-entry manifest previously inherited a later encounter action through a shared trace; the generator already snapshots each trace, and the regenerated manifest now correctly distinguishes dungeon entry from dungeon combat. The V1 fixture bytes did not change.

## Preserved corrections

Original run failures and withdrawn measurements remain in `engine/playlog.jsonl`; every published report version is appended and checksum-verified before its current JSON projection is replaced. The first two long-term runner attempts failed on harness scope references (`serialize`, then `player`). The first completed timing report mislabeled an elapsed-duration difference as `annualSimMs`; those timing values are withdrawn. The corrected report stores direct monotonic per-year batch/daily durations.

The prior featured-NPC tracker used substring matching, so `米拉 1` could match names such as `米拉 11`. Its death totals 8/9/9 and affected injury evidence are withdrawn. The corrected exact-name tracker reports six deaths in each seed. These are measurement corrections, not product-source changes.

The headless SaveService byte counts do not include the browser `playJournal` or IndexedDB storage. Those are recorded separately by the real-browser soak; its formal run is still active at this report timestamp. Do not combine the byte counts or treat the current checkpoint as the completed two-hour result.

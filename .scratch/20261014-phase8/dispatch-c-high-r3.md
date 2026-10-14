# C1-High revision 3 — record C2 V4 change (Owner decision)

Owner chose **V4** on 2026-10-14 (not one of V0–V3): Farming yield bonus `min(2, floor((level-1)/2))`.
Lead implemented it: `src/engine/crops.ts` `farmingYieldBonus()` used by `farmCropChoices()` (all crops incl. wheat) and the unknown-crop fallback in `src/engine/actions.ts:64`; test `src/engine/crops.test.ts` "caps the Farming yield bonus at +2…" (failed before, passes after); engine vitest 28 files / 424 tests PASS.
Rationale (lead → Owner): gathering material income is capped by node regen (mine 8/day, forest 10/day ⇒ ≤ ~104 G/day + 4 G wage/action, `src/engine/simulation.ts:204,339`, `src/data/config.ts:34-35`); 4 plots best crop under V4 ≈ 96–112 G/day ⇒ comparable. Fixed-sequence counterfactual V4 = 19,346 G/seed (lead computed, add it to your counterfactual core + json as V4 so it is reproducible; cap+4 = 25,131 as alternative considered).

After-run (lead executed, same seeds, `node scripts/phase8/run-life-economy.mjs`, log `c-runner/lead-exec-c2-v4.log`): attempt `attempt-20261014T093926448Z/` PASS, 15/15 VALID_POLICY. Before = `attempt-20261014T090744303Z/`.

| variant (each seed identical unless noted) | net G before → after | harvests | crop units/food before → after |
|---|---|---|---|
| seasonal-farm-sell | +101,218..101,528 → +49,108..49,382 | 560 → 513 | crop goods 14,343 → 3,453; crop sales 77,580 → 22,315 G |
| life (wheat) | +30..38 unchanged | 359 | food 7,853 → 2,500 |
| hybrid | +2,655..2,835 unchanged | 270 | food 5,266 → 1,877 |
| craft-focused | unchanged | 35 | 336 → 232 |
| farm-business-supply | -32..-34 unchanged | 22 | 186 → 141; supply 2/2 per seed OK |
Settlement food ends 100 in all. Seasonal remaining net is mostly gather→craft→sell ironShortSword: sell-crafted 68,223 − craft fees 45,450 ≈ +22.8k (before ≈ +20.0k) from gathered (node-capped) inputs at the 80-action ceiling — record as a legitimate craftsman-profit observation, bounded by node regen, NO CHANGE, note the action-ceiling caveat.

## Do
1. Add V4 to counterfactual core/json/test; rerun `node --test scripts/phase8/test_crop_counterfactual.mjs` and the counterfactual script.
2. Update `economy-balance.md` + `life-progression.md`: C-F1 status **RESOLVED by C2 change (Owner-approved V4)** with §4 five answers incl. actual change, Before/After table from the two attempts (compute from raw, verify my numbers), regressions (food/supply lower but supply action and settlement food unaffected; long-world 10/50/100 verification deferred to Phase8-D), residual risk (crafting observation; merchant stock NOT MODELED still a product finding).
3. Update `c1-high-summary.md`. Reply with only its path.
Same limits (no src, no npm/vitest, no commit, no deletion).

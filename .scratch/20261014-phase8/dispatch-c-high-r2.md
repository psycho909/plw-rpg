# C1-High revision 2 — seasonal crop income finding (lead review)

Lead verified the seasonal-farm-sell result and **overrides the C2 "NO CHANGE because stock/demand not modeled" reasoning**. Root cause is not merchant stock; it is unbounded linear yield scaling:

- `src/engine/crops.ts` farmCropChoices: `harvestAmount = harvestBase + farming.level - 1` (no cap).
- `src/engine/simulation.ts:225-238` gainExp: skill levels have no cap; farming XP = plant 5 + harvest 15 per cycle with **no practice cap** (unlike smithing).
- `src/engine/actions.ts` farmInternal: prepare/plant/harvest cost stamina+time only, **zero gold**; `rewardActions.ts` tradeMaterial fixed price, no stock.
- Observed (final attempt, seed 61101): farming Lv.2 → 33 in 3 years; per-harvest yield 6 → 36. 77,580 G crop sales/seed ≈ 8.6× A v3 Life net and ≈ 33× Adventure. Phase7-G g-crop-plan.md:49 already warned "無額外金幣種植成本，不能只憑單次收益宣稱無套利".

## Do (no rerun, no src change, no new attempt)

1. Write `c-runner/c1-crop-counterfactual.mjs` (+ node:test if logic is non-trivial) that reads the final attempt `crop-yields.csv` and recomputes seasonal crop sale gold per seed under analytic yield-bonus variants, holding the same harvest sequence: (V0) current `level-1`; (V1) gather-style `floor((level-1)/2)`; (V2) no level bonus (base only); (V3) bonus frozen at the level reached at end of year 1 (data-derived, not invented). Output `c-runner/c1-crop-counterfactual.json` + table. State clearly this is a counterfactual on a fixed policy, not a rerun (policy would adapt).
2. Rewrite `economy-balance.md` and `life-progression.md` C2 sections: new **Finding C-F1 (product, High): farming yield scales linearly with an uncapped Farming level that has no practice cap; with zero gold input and fixed-price unlimited sale this is a riskless unbounded gold source dominating all measured routes.** Answer the spec §4 five questions. Recommendation: **Owner design decision required** (relative target for farming vs gather/craft/adventure income is a product target Phase8 may not invent); present V1–V3 as options with trade-offs; Phase8 makes no value change unless the Owner picks one. Keep wheat/food and gather findings, but remove the claim that lack of stock modelling is the reason to defer.
3. In `c1-high-summary.md`, classify `attempt-20261014T083910637Z/` (currently unmentioned) and add this revision.

Same limits: escalation only `node scripts/phase8/`, `node --test scripts/phase8/`, or `node reports/v2/20261014-balance-tuning/phase-08/c-runner/c1-crop-counterfactual.mjs`. No npm/vitest, no commit, no deletion. Reply with only the summary path.

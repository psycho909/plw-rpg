# Phase 5 economy analysis (interim)

**Status: released price rule, static bounds, and controlled I sampled-price/margin summaries are recorded; full transaction economy and product analysis remain separate.** I result: [run `20261007T085736Z-fdeec6dd`](i-20261007T085736Z-fdeec6dd-results.json), SHA-256 `7b6de2655b2ff670eb2500bc817df4756ae2ae2e728f48f153636e0395c92ef8`; source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, fingerprint `b25f8119203c9c0dc9000f2b2bd34540e9ea62dd2642998eb8a6bf4a0af3e8cf`. Distribution scope: 100,000 generated items, 30 profiles, **0 actual full transactions**. See [interim index](README.md), [crafting analysis](crafting-analysis.md), and [exact profile projection](crafting-distribution.json).

## Existing baseline and released pricing

The baseline is a source-derived/static Phase 4 profile, not an I sample: best town buy prices are wood 7g, stone 5g, iron 13g. `starterSpear` consumes 3 wood + 2 stone + 4g fee. The recorded ordinary-wolf rarity profile gives conditional expected spear sale 18.186g (14g minimum legal rarity value); its bought-input-plus-fee cost is 35g at best town prices and 40g at hamlet prices. The gathered-stock liquidation comparison is 22g including fee and excludes stamina/time. These historical values and conditions are detailed in [baseline bounds](economy-baseline-bounds.md).

Current G crafted-only sell formula keeps legacy/noncrafted pricing exactly at `max(1, floor(baseSell × rarityMultiplier))`. Crafted affix premium is capped at `floor(15% × baseSell)`; Masterpiece adds `ceil(15% × baseSell)`; the sum is capped at `floor(25% × baseSell)`, then added to the rarity price. The recorded `rewardActions.test.ts` run passed 24/24. That verifies the price rule, not a realized market economy.

## Historical/theoretical static bound (not I sampled means)

The following G table remains a conservative theoretical bound: all inputs are bought at best ordinary town prices, the largest legal 1g home fee reduction is applied, and every output is assigned the maximum possible 25%-of-base premium regardless of its actual rolls. It is not the sampled sale mean below.

| Recipe / mode | Cost | Expected sale under max premium | Margin |
|---|---:|---:|---:|
| starterSpear / neutral | 34 | 29.404 | −4.596 |
| starterSpear / wolfFang | 39 | 29.404 | −9.596 |
| starterSpear / moonStone | 59 | 29.404 | −29.596 |
| fieldSpear / neutral | 48 | 29.404 | −18.596 |
| fieldSpear / wolfFang | 53 | 29.404 | −23.596 |
| fieldSpear / moonStone | 73 | 29.404 | −43.596 |
| fieldArmor / neutral | 40 | 37.948 | −2.052 |
| fieldArmor / wolfHide | 45 | 37.948 | −7.052 |
| ironShortSword / neutral | 63 | 27.672 | −35.328 |

## I generated-item sale and expected margin profiles

These are the actual sample means from `itemSellPrice` applied to the 100,000 generated outputs, grouped by the 30 profiles. The bracketed interval is the run's 95% interval for mean sale price. Cost and margin use each legal recipe plan's input purchase price, influence-material opportunity cost, and planned fee; store costs are shown alongside the legal home plan. The one-time 80g home purchase is separate and is excluded from recurring per-craft costs; its first-craft margin is preserved in the JSON projection. All amounts are gold.

| Recipe | Smithing | Material | n | Mean sale (95% CI) | Median | Home planned cost | Expected margin | Store cost | Expected margin |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| starterSpear | 1 | neutral | 3334 | 18.71 [18.46, 18.96] | 14 | 34 | -15.29 | 35 | -16.29 |
| starterSpear | 1 | wolfFang | 3334 | 18.71 [18.46, 18.96] | 14 | 39 | -20.29 | 40 | -21.29 |
| starterSpear | 1 | moonStone | 3334 | 18.71 [18.46, 18.96] | 14 | 59 | -40.29 | 60 | -41.29 |
| starterSpear | 3 | neutral | 3334 | 23.47 [23.32, 23.62] | 22 | 34 | -10.53 | 35 | -11.53 |
| starterSpear | 3 | wolfFang | 3334 | 23.47 [23.32, 23.62] | 22 | 39 | -15.53 | 40 | -16.53 |
| starterSpear | 3 | moonStone | 3334 | 23.47 [23.32, 23.62] | 22 | 59 | -35.53 | 60 | -36.53 |
| starterSpear | 6 | neutral | 3334 | 23.47 [23.31, 23.63] | 22 | 34 | -10.53 | 35 | -11.53 |
| starterSpear | 6 | wolfFang | 3334 | 23.47 [23.31, 23.63] | 22 | 39 | -15.53 | 40 | -16.53 |
| starterSpear | 6 | moonStone | 3334 | 23.47 [23.31, 23.63] | 22 | 59 | -35.53 | 60 | -36.53 |
| fieldSpear | 2 | neutral | 3334 | 19.02 [18.76, 19.28] | 14 | 48 | -28.98 | 49 | -29.98 |
| fieldSpear | 2 | wolfFang | 3333 | 19.01 [18.75, 19.27] | 14 | 53 | -33.99 | 54 | -34.99 |
| fieldSpear | 2 | moonStone | 3333 | 19.01 [18.75, 19.27] | 14 | 73 | -53.99 | 74 | -54.99 |
| fieldSpear | 3 | neutral | 3333 | 23.53 [23.37, 23.69] | 22 | 48 | -24.47 | 49 | -25.47 |
| fieldSpear | 3 | wolfFang | 3333 | 23.53 [23.37, 23.69] | 22 | 53 | -29.47 | 54 | -30.47 |
| fieldSpear | 3 | moonStone | 3333 | 23.53 [23.37, 23.69] | 22 | 73 | -49.47 | 74 | -50.47 |
| fieldSpear | 6 | neutral | 3333 | 23.46 [23.31, 23.62] | 22 | 48 | -24.54 | 49 | -25.54 |
| fieldSpear | 6 | wolfFang | 3333 | 23.46 [23.31, 23.62] | 22 | 53 | -29.54 | 54 | -30.54 |
| fieldSpear | 6 | moonStone | 3333 | 23.46 [23.31, 23.62] | 22 | 73 | -49.54 | 74 | -50.54 |
| fieldArmor | 2 | neutral | 3333 | 24.06 [23.75, 24.37] | 18 | 40 | -15.94 | 41 | -16.94 |
| fieldArmor | 2 | wolfHide | 3333 | 24.06 [23.75, 24.37] | 18 | 45 | -20.94 | 46 | -21.94 |
| fieldArmor | 3 | neutral | 3333 | 29.94 [29.73, 30.16] | 28 | 40 | -10.06 | 41 | -11.06 |
| fieldArmor | 3 | wolfHide | 3333 | 29.94 [29.73, 30.16] | 28 | 45 | -15.06 | 46 | -16.06 |
| fieldArmor | 6 | neutral | 3333 | 29.88 [29.68, 30.08] | 28 | 40 | -10.12 | 41 | -11.12 |
| fieldArmor | 6 | wolfHide | 3333 | 29.88 [29.68, 30.08] | 28 | 45 | -15.12 | 46 | -16.12 |
| ironShortSword | 5 | neutral | 3333 | 25.35 [25.27, 25.43] | 25 | 64 | -38.65 | 64 | -38.65 |
| ironShortSword | 5 | wolfFang | 3333 | 25.35 [25.27, 25.43] | 25 | 69 | -43.65 | 69 | -43.65 |
| ironShortSword | 5 | moonStone | 3333 | 25.35 [25.27, 25.43] | 25 | 89 | -63.65 | 89 | -63.65 |
| ironShortSword | 6 | neutral | 3333 | 25.84 [25.76, 25.92] | 25 | 64 | -38.16 | 64 | -38.16 |
| ironShortSword | 6 | wolfFang | 3333 | 25.84 [25.76, 25.92] | 25 | 69 | -43.16 | 69 | -43.16 |
| ironShortSword | 6 | moonStone | 3333 | 25.84 [25.76, 25.92] | 25 | 89 | -63.16 | 89 | -63.16 |

Every profile's expected sale is below its modeled per-craft input cost at both the planned home and store plan. Material opportunity cost lowers the expected margin by its resale value; this is not transaction data and does not incorporate a measured player gathering mix, time/stamina loop, selling access, or repeated home purchase. Individual outputs can sell above cost. See [material-bias projection](material-bias.json) for the paired material contrast; sale deltas are zero in those matched pairs because these influence modes change affix identities, not rarity, Masterpiece, or the price-driving affix count/tier in this run.

## Combat and remaining limits

The I matrix gives controlled paired combat classifications; see [crafting analysis](crafting-analysis.md). It is not a normal-world economy or human test. J integrated stress and Life Agent exploration remain outstanding; Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**. These interim figures do not constitute a final balance judgment or Phase 5 gate pass.

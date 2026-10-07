# Phase 5-I crafting distribution and combat findings (interim)

**Status: I distribution and controlled combat execution recorded; this is not a final product or Phase 5 gate verdict.** The released run is pinned to source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, source fingerprint `b25f8119203c9c0dc9000f2b2bd34540e9ea62dd2642998eb8a6bf4a0af3e8cf`, run `20261007T085736Z-fdeec6dd`. Full result SHA-256: `7b6de2655b2ff670eb2500bc817df4756ae2ae2e728f48f153636e0395c92ef8`. Raw generated observation SHA-256: `37451e2c0a0c8b6e63be5d4dad6b3d89e16bb97a24a77d201c941ccaaad53629`. Mechanical profile and contrast projections: [crafting-distribution.json](crafting-distribution.json) and [material-bias.json](material-bias.json).

## Distribution scope and method

The runner generated exactly **100,000 craft-context outputs** across **30 legal recipe × Smithing × material profiles**, with 3,333 or 3,334 outputs per profile. It recorded **0 full craft transactions**: no material/gold/stamina deduction, time advance, or transaction history. Material arms reuse matched deterministic per-sample seeds. The reported Wilson intervals and paired intervals describe this seeded simulation; they are not claims of independent real-world player outcomes. The sale values call the released sale calculation over generated items and combine with analytical recipe costs; they are not observed transactions or realized market income.

The neutral profile table reports observed rarity rates with **95% Wilson intervals**. Full counts, intervals, affixes, special-trait rates, Masterpiece rates and per-profile sales are in the projection.

| Recipe | Smithing | n | Common % (95% CI) | Uncommon % (95% CI) | Rare % (95% CI) | Epic % (95% CI) | Legendary % (95% CI) | Masterpiece % (95% CI) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| starterSpear | 1 | 3334 | 59.90% [58.22%, 61.55%] | 27.47% [25.99%, 29.01%] | 9.81% [8.84%, 10.86%] | 2.49% [2.01%, 3.08%] | 0.33% [0.18%, 0.59%] | 0.00% [0.00%, 0.12%] |
| starterSpear | 3 | 3334 | 0.00% [0.00%, 0.12%] | 86.53% [85.33%, 87.65%] | 10.98% [9.96%, 12.08%] | 2.34% [1.88%, 2.91%] | 0.15% [0.06%, 0.35%] | 0.00% [0.00%, 0.12%] |
| starterSpear | 6 | 3334 | 0.00% [0.00%, 0.12%] | 87.58% [86.42%, 88.66%] | 9.45% [8.50%, 10.49%] | 2.76% [2.26%, 3.37%] | 0.21% [0.10%, 0.43%] | 0.00% [0.00%, 0.12%] |
| fieldSpear | 2 | 3334 | 59.03% [57.35%, 60.69%] | 26.75% [25.28%, 28.28%] | 10.35% [9.36%, 11.43%] | 3.66% [3.07%, 4.35%] | 0.21% [0.10%, 0.43%] | 0.00% [0.00%, 0.12%] |
| fieldSpear | 3 | 3333 | 0.00% [0.00%, 0.12%] | 86.68% [85.48%, 87.79%] | 10.50% [9.51%, 11.59%] | 2.58% [2.09%, 3.18%] | 0.24% [0.12%, 0.47%] | 0.00% [0.00%, 0.12%] |
| fieldSpear | 6 | 3333 | 0.00% [0.00%, 0.12%] | 87.19% [86.01%, 88.28%] | 9.99% [9.02%, 11.06%] | 2.67% [2.18%, 3.27%] | 0.15% [0.06%, 0.35%] | 0.00% [0.00%, 0.12%] |
| fieldArmor | 2 | 3333 | 58.12% [56.43%, 59.78%] | 29.34% [27.82%, 30.91%] | 9.66% [8.70%, 10.71%] | 2.61% [2.12%, 3.21%] | 0.27% [0.14%, 0.51%] | 0.00% [0.00%, 0.12%] |
| fieldArmor | 3 | 3333 | 0.00% [0.00%, 0.12%] | 87.10% [85.92%, 88.19%] | 9.93% [8.96%, 10.99%] | 2.64% [2.15%, 3.24%] | 0.33% [0.18%, 0.59%] | 0.00% [0.00%, 0.12%] |
| fieldArmor | 6 | 3333 | 0.00% [0.00%, 0.12%] | 87.25% [86.07%, 88.34%] | 9.81% [8.85%, 10.87%] | 2.73% [2.23%, 3.34%] | 0.21% [0.10%, 0.43%] | 0.00% [0.00%, 0.12%] |
| ironShortSword | 5 | 3333 | 0.00% [0.00%, 0.12%] | 0.00% [0.00%, 0.12%] | 97.33% [96.73%, 97.82%] | 2.55% [2.07%, 3.14%] | 0.12% [0.05%, 0.31%] | 0.00% [0.00%, 0.12%] |
| ironShortSword | 6 | 3333 | 0.00% [0.00%, 0.12%] | 0.00% [0.00%, 0.12%] | 97.21% [96.59%, 97.72%] | 2.70% [2.20%, 3.31%] | 0.09% [0.03%, 0.26%] | 24.27% [22.85%, 25.76%] |

## Material influence and rarity invariance

Across **19 matched material-arm contrasts**, every contrast had **0 rarity-changed pairs** and **0 paired sale-value difference**; Masterpiece deltas were also zero. The intended target-biased affix presence increased in the paired output arms. The table shows observed hit counts and paired mean-rate differences with their 95% intervals in percentage points; this is generator behavior in controlled profiles, not a claim that the material guarantees an affix on each craft.

| Recipe / Smithing | Material | Paired n | Target-affix hits, material vs neutral | Paired rate delta (95% CI) | Rarity changed pairs | Masterpiece delta | Mean sale delta |
|---|---|---:|---:|---:|---:|---:|---:|
| starterSpear / 1 | wolfFang | 3334 | 1147/3334 vs 821/3334 | 9.78 pp [8.77 pp, 10.79 pp] | 0 | 0.00 pp | 0.00g |
| starterSpear / 1 | moonStone | 3334 | 942/3334 vs 473/3334 | 14.07 pp [12.89 pp, 15.25 pp] | 0 | 0.00 pp | 0.00g |
| starterSpear / 3 | wolfFang | 3334 | 2754/3334 vs 1837/3334 | 27.50 pp [25.99 pp, 29.02 pp] | 0 | 0.00 pp | 0.00g |
| starterSpear / 3 | moonStone | 3334 | 2198/3334 vs 983/3334 | 36.44 pp [34.81 pp, 38.08 pp] | 0 | 0.00 pp | 0.00g |
| starterSpear / 6 | wolfFang | 3334 | 2691/3334 vs 1799/3334 | 26.75 pp [25.25 pp, 28.26 pp] | 0 | 0.00 pp | 0.00g |
| starterSpear / 6 | moonStone | 3334 | 2194/3334 vs 932/3334 | 37.85 pp [36.21 pp, 39.50 pp] | 0 | 0.00 pp | 0.00g |
| fieldSpear / 2 | wolfFang | 3333 | 1162/3333 vs 862/3333 | 9.00 pp [8.03 pp, 9.97 pp] | 0 | 0.00 pp | 0.00g |
| fieldSpear / 2 | moonStone | 3333 | 974/3333 vs 462/3333 | 15.36 pp [14.14 pp, 16.59 pp] | 0 | 0.00 pp | 0.00g |
| fieldSpear / 3 | wolfFang | 3333 | 2727/3333 vs 1808/3333 | 27.57 pp [26.06 pp, 29.09 pp] | 0 | 0.00 pp | 0.00g |
| fieldSpear / 3 | moonStone | 3333 | 2236/3333 vs 947/3333 | 38.67 pp [37.02 pp, 40.33 pp] | 0 | 0.00 pp | 0.00g |
| fieldSpear / 6 | wolfFang | 3333 | 2748/3333 vs 1831/3333 | 27.51 pp [26.00 pp, 29.03 pp] | 0 | 0.00 pp | 0.00g |
| fieldSpear / 6 | moonStone | 3333 | 2231/3333 vs 950/3333 | 38.43 pp [36.78 pp, 40.09 pp] | 0 | 0.00 pp | 0.00g |
| fieldArmor / 2 | wolfHide | 3333 | 1277/3333 vs 1075/3333 | 6.06 pp [5.25 pp, 6.87 pp] | 0 | 0.00 pp | 0.00g |
| fieldArmor / 3 | wolfHide | 3333 | 2951/3333 vs 2352/3333 | 17.97 pp [16.67 pp, 19.28 pp] | 0 | 0.00 pp | 0.00g |
| fieldArmor / 6 | wolfHide | 3333 | 2965/3333 vs 2410/3333 | 16.65 pp [15.39 pp, 17.92 pp] | 0 | 0.00 pp | 0.00g |
| ironShortSword / 5 | wolfFang | 3333 | 3258/3333 vs 2820/3333 | 13.14 pp [11.99 pp, 14.29 pp] | 0 | 0.00 pp | 0.00g |
| ironShortSword / 5 | moonStone | 3333 | 2972/3333 vs 1706/3333 | 37.98 pp [36.34 pp, 39.63 pp] | 0 | 0.00 pp | 0.00g |
| ironShortSword / 6 | wolfFang | 3333 | 3271/3333 vs 2771/3333 | 15.00 pp [13.79 pp, 16.21 pp] | 0 | 0.00 pp | 0.00g |
| ironShortSword / 6 | moonStone | 3333 | 2996/3333 vs 1686/3333 | 39.30 pp [37.65 pp, 40.96 pp] | 0 | 0.00 pp | 0.00g |

## Controlled combat outcome classifications

The matrix contains **6,624 rows** and **13,248 uninterrupted/replay fight runs** across 23 builds, three power bands, six target cases, two action policies, and eight matched seeds. `early` is fresh Lv1/100 HP; `edge` is engine progression to Lv4/combat Lv4; `ready` is engine progression to hero Lv5/combat Lv6. Rows use controlled detached fixtures, not browser or human play.

Each group in the released result compares eight matched-seed fight rows for one power band, build, action policy, and target case against the matching legacy rows. The result contains 828 groups total (23 builds × 3 bands × 2 policies × 6 target cases), with 8 fights per group. For each build and band, these tables sum the per-row `outcomeVsLegacy` counters across 12 policy-target groups (2 policies × 6 target cases): 96 paired fight-row classifications, not 96 groups. The counts summarize this controlled seeded matrix; they are not a population win-rate estimate.

| Power band | Build | Upgrade | Equivalent | Low-value | Trade-off |
|---|---|---:|---:|---:|---:|
| early | Starter spear / neutral | 38 | 0 | 48 | 10 |
| early | Starter spear / wolfFang | 38 | 0 | 48 | 10 |
| early | Starter spear / moonStone | 38 | 0 | 48 | 10 |
| early | Field armor / neutral | 7 | 29 | 58 | 2 |
| early | Field armor / wolfHide | 0 | 38 | 58 | 0 |
| early | Iron short sword / Smithing 6 | 39 | 0 | 46 | 11 |
| early | Iron short sword / Masterpiece | 41 | 0 | 40 | 15 |
| early | Iron short sword / marker-cleared control | 41 | 0 | 40 | 15 |
| edge | Starter spear / neutral | 0 | 0 | 89 | 7 |
| edge | Starter spear / wolfFang | 0 | 0 | 89 | 7 |
| edge | Starter spear / moonStone | 0 | 0 | 90 | 6 |
| edge | Field armor / neutral | 0 | 8 | 88 | 0 |
| edge | Field armor / wolfHide | 0 | 13 | 83 | 0 |
| edge | Iron short sword / Smithing 6 | 2 | 0 | 80 | 14 |
| edge | Iron short sword / Masterpiece | 4 | 0 | 76 | 16 |
| edge | Iron short sword / marker-cleared control | 4 | 0 | 76 | 16 |
| ready | Starter spear / neutral | 0 | 0 | 90 | 6 |
| ready | Starter spear / wolfFang | 0 | 0 | 90 | 6 |
| ready | Starter spear / moonStone | 0 | 0 | 90 | 6 |
| ready | Field armor / neutral | 0 | 18 | 78 | 0 |
| ready | Field armor / wolfHide | 0 | 18 | 78 | 0 |
| ready | Iron short sword / Smithing 6 | 6 | 0 | 81 | 9 |
| ready | Iron short sword / Masterpiece | 8 | 0 | 79 | 9 |
| ready | Iron short sword / marker-cleared control | 8 | 0 | 79 | 9 |

The Masterpiece build and marker-cleared control had identical combat outcome metrics across all **288 matched fight rows**; only the identity marker differed in the gear fixture. This is consistent with Masterpiece being identity/economy metadata in this source, not a combat-stat modifier. It does not establish human-perceived value.

## Boundaries

These controlled distributions and fixtures do not show normal-play recipe prevalence, resource affordability, or long-term retention. Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**. J integrated stress and Life Agent exploration remain pending, and no final Phase 5 gate disposition is made here.

# Phase 5 Masterpiece analysis (interim)

**Status: F rules and targeted evidence plus the I seeded incidence/economy/combat measurements are recorded; product and final-gate judgments remain separate.** Actual I result [run `20261007T085736Z-fdeec6dd`](i-20261007T085736Z-fdeec6dd-results.json), SHA-256 `7b6de2655b2ff670eb2500bc817df4756ae2ae2e728f48f153636e0395c92ef8`; source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, source fingerprint `b25f8119203c9c0dc9000f2b2bd34540e9ea62dd2642998eb8a6bf4a0af3e8cf`.

## Released behavior and sampled incidence

- Eligible advanced iron craft at Smithing 6 uses an engine-owned seeded **25%** Masterpiece roll. Influence material does not alter rarity weights or the configured Masterpiece chance.
- Masterpiece is identity/history metadata, not a raw-stat combat modifier. G's first-Masterpiece identity and bounded +3 reputation behavior remain as previously documented; sale premium remains governed by the released pricing cap.
- In I, `ironShortSword` Smithing 6 produced **809 Masterpieces / 3,333 outputs = 24.27%** in each of neutral, wolfFang, and moonStone arms; Wilson 95% CI **22.85–25.76%** per profile. Those arms reuse the same matched per-sample seeds and have identical counts, so this is one 3,333-seed stratum reproduced across arms, not 9,999 independent trials. No other profile was Masterpiece-eligible or had any observed Masterpieces.
- Across matched material arms the Masterpiece paired rate delta was 0, and no rarity changed. Full observed rates, counts, and intervals are in [crafting-distribution.json](crafting-distribution.json) and [material-bias.json](material-bias.json).

## Generated sale and expected-margin sample

The sample means below call the released sale calculation on generated craft-context items. Expected margins subtract the modeled per-craft inputs, influence-material opportunity cost, and legal home or store fee; no resource transaction was executed. Mean sale has a 95% interval. The one-time 80g home purchase is separate from these recurring margins.

| Material | n | Mean sale (95% CI) | Median | Home planned cost | Expected margin | Store cost | Expected margin |
|---|---:|---:|---:|---:|---:|---:|---:|
| neutral | 3333 | 25.84 [25.76, 25.92] | 25 | 64 | -38.16 | 64 | -38.16 |
| wolfFang | 3333 | 25.84 [25.76, 25.92] | 25 | 69 | -43.16 | 69 | -43.16 |
| moonStone | 3333 | 25.84 [25.76, 25.92] | 25 | 89 | -63.16 | 89 | -63.16 |

At Smithing 6 the configured Masterpiece rate is visible in the sale sample, but no sampled profile reaches expected break-even on bought inputs under these cost assumptions. This is not a transaction economy or balance verdict.

## Controlled combat matrix

The genuine generated Masterpiece and its marker-cleared clone had identical combat metrics across all **288 matched fight rows**, with only the marker differing in their gear fixture. In the released result, each group is eight matched-seed fights for one band/build/action-policy/target case, and each row is classified against legacy by the recorded dominance rule. The result has 828 groups total; each band/build has 12 policy-target groups (2 policies × 6 target cases), or **96 paired fight-row classifications**. The table sums the per-row `outcomeVsLegacy` counters across those 12 groups; 96 is not a group count.

| Power band | Build | Upgrade | Equivalent | Low-value | Trade-off |
|---|---|---:|---:|---:|---:|
| early | High-skill generated iron short sword | 39 | 0 | 46 | 11 |
| early | Genuine generated Masterpiece | 41 | 0 | 40 | 15 |
| early | Same generated item, marker cleared | 41 | 0 | 40 | 15 |
| edge | High-skill generated iron short sword | 2 | 0 | 80 | 14 |
| edge | Genuine generated Masterpiece | 4 | 0 | 76 | 16 |
| edge | Same generated item, marker cleared | 4 | 0 | 76 | 16 |
| ready | High-skill generated iron short sword | 6 | 0 | 81 | 9 |
| ready | Genuine generated Masterpiece | 8 | 0 | 79 | 9 |
| ready | Same generated item, marker cleared | 8 | 0 | 79 | 9 |

These outcomes match the data model: the Masterpiece marker itself did not add combat stats. The matrix uses controlled headless fixtures and seeded policies; it is not human-perceived-value evidence. Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**. J's 30-minute Life exploration and integrated stress remain pending.

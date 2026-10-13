# Phase7-J Formal QA and Completion Record — 2026-10-13

## Current disposition

Phase7-J's required formal lanes are complete on a stable product source and stable simulation runner. Inventory, 100,008-call loot distribution, 118,800 controlled combat outcomes, all 24 recipe transactions, and three-seed 10/50/100-year continuous simulation passed. The independent Medium evidence review passed after recomputing the sample totals and checking the final lane checksums. J is **PASS WITH FINDINGS**; no product source or content was modified during these simulations.

- Branch: `v2x/reward-core`
- Test-time HEAD: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Recursive `src/` fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`
- Final simulation runner SHA-256: `07eab59e031fd2547a6fa9278bf05ed1244c97baa66b2c57e086f2abf016ea7f`
- Final successful combat/economy/long-world attempts report `sourceStable: true` and `runnerStable: true`. Each run has its own manifest and verified `SHA256SUMS`.

## Coverage and outcomes

The inventory lane measured six families, 66 monster definitions, 48 equipment bases, 48 ecology/crafting materials, 24 recipes, 11 crops, 11 crop goods, and zero new affixes. Cross-module runtime qualification counts 107 unique new usable item IDs; the six-family authoring pack alone contains 96 equipment/material IDs, with the crop goods qualified separately by crop integration tests.

The loot lane completed 100,008 public-API awards evenly across 24 family/rank cohorts (4,167 each). It mirrored the first 50 awards in every cohort: 1,200 of 1,200 seeded output, RNG advancement, and next item-identity comparisons matched.

The final combat lane completed 118,800 controlled public-API encounters across 1,188 matrix cells, six prescribed build profiles, four ranks, three seeds and 100 samples per cell. Aggregate wins/deaths were 109,887 / 8,913. Normal encounters were won in all samples; aggregate elite, mini-boss and boss win rates were 98.6%, 93.0%, and 34.2%. Boss rates by early/mid/late band were 11.1%, 20.5%, and 71.1%. These are controlled fixture signals, not natural encounter/player win probabilities.

The final economy lane completed all 24 new recipes with public planning and transaction APIs, checked input consumption and generated output, and confirmed the output sale path. Every fee was below its output sale price, but material costs, merchant stock, purchase prices, restock, and natural acquisition were not modeled; this does not prove or rule out a buy/craft/sell arbitrage.

The continuous long-world lane completed three independent seeds at years 10, 50, and 100 (nine checkpoints). Living population stayed 78–80 at checkpoints, event rows reached the configured 150-row cap, history grew to 1,960–1,996 rows, and 100-year serialized snapshots were 576,378–611,123 bytes. All nine save/reload and continued-simulation equality checks passed. The worlds contain no player encounter actions; this does not establish natural reachability, Boss defeat, or player progression. See `long-world.md` for all rows.

## Historical failed attempts retained

The following attempts were not removed or rewritten. Failures came from the QA harness/fixtures and do not establish product defects; each final lane was rerun successfully with a corrected harness and new attempt ID.

| Lane/attempt | Original outcome | Disposition |
| --- | --- | --- |
| Combat 01 | Stopped after four completed cells / 400 samples because the level-1 controlled fixture had no legal recipe for its crafted build. | Preserved; corrected to use a legal band-specific fixture. |
| Combat 02 | Seeded fixture expected `masterpiece: false`, but the valid 25% masterpiece roll produced `true`, so the static setup snapshot assertion failed. | Preserved; fixture selection now accounts for the seeded craftsmanship result. |
| Combat 03 | No finite legal `slime_slick` witness for the requested mid band at the selected level. | Preserved; witness selection now probes legal contexts and records the actual effective level. |
| Combat 04 | Test file passed, but its setup assigned an effective level without deriving matching level-up stats. | Preserved as superseded; final attempt 05 applies progression through the production XP path and records level/stat witnesses. |
| Economy 01 | QA fixture failed because its controlled reward material map was not initialized. | Preserved; attempt 02 passes all 24 recipe transactions. |

Failed attempts and their checksums remain in `j-formal-20261013/`. The final combat, economy, long-world, loot and inventory run manifests are the authoritative successful evidence. Independent review confirmed the checksums and totals; see `j-independent-review-20261013.md`.

## Findings and limits

- **P2 product/balance signal:** early and mid Boss controlled win rates are low, while normal encounters were fully won. Assess these against ordinary progression, gear acquisition, tactics, and intended preparation before tuning.
- **P2 evidence limitation inherited from D:** the first Cave Insects authoring input/source snapshot is unavailable. The limited compensating-evidence condition and current-source validation are documented separately; the unavailable original bytes are not claimed recovered.
- Natural monster/Boss exposure, player defeat of new content Bosses, merchant-volume economics, and human fun/retention were not measured by J.
- Human validation is `DEFERRED / NOT APPLICABLE AT THIS STAGE`; it does not block Development QA.

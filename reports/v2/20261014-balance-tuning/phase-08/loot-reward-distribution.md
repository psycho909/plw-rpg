# Phase8-E Loot & Reward Distribution

## Evidence and method

Phase7's 100,008-call sample is not reused as the only current result: `git diff e05cc78 HEAD` shows loot table/equipment changes in `src/data/content/caveInsects.ts`, `fogUndead.ts`, `frontierGoblins.ts`, `mineConstructs.ts`, and `wildBeasts.ts`, plus family registry changes in `src/data/contentRegistry.ts` (the registered `farmCrops.ts` pack adds no loot cohort). `src/data/rewards.ts` and `src/engine/itemGeneration.ts` are unchanged over that range. A fresh controlled run used current `awardContentLoot()` (`src/engine/itemGeneration.ts:348-430`) in `e-runner/loot-attempt-20261014T100851766Z/summary.json`: 100,008 calls, 24 family/rank cohorts, 4,167 calls per cohort, cycling uniformly through each cohort's authored monster IDs. The result is controlled generation, not natural spawn, kill, acquisition, or play frequency.

### Historical attempt provenance

The original attempt predates the expanded manifest fields. Its source shows each sorted family/rank cohort uses `createGame(40131 + cohortIndex)` and the 50-per-cohort determinism mirrors use `99001 + cohortIndex * 100 + mirrorIndex` (`scripts/phase8/run-loot-pacing.mjs`, captured runner SHA-256 `4e07af5ad54bf4d97fa977316fae57e97e6a7f1d2336ffe1497e883f2c3fc90b`). This hash is the runner snapshot used for the historical attempt, recorded by the independent Max review; it is not the hash of the now-updated script. No loot rerun was needed for this provenance correction. Future manifests now include per-cohort seed/monster mapping, mirror seed formula, and the executing runner's SHA-256.

## Gear awards by rank

| Rank | Calls | Gear awards | Rate | Phase7 rate |
|---|---:|---:|---:|---:|
| Normal | 25,002 | 14,250 | 57.00% | 56.92% |
| Elite | 25,002 | 18,663 | 74.65% | 74.25% |
| MiniBoss | 25,002 | 21,306 | 85.22% | 85.48% |
| Boss | 25,002 | 25,002 | 100.00% | 100.00% |
| **Total** | **100,008** | **79,221** | **79.21%** | **79.16%** |

Differences from the Phase7 sample are small at rank level and are descriptive point estimates; changed tables and family mixtures prevent attributing differences to one particular equipment addition. Boss gear is guaranteed by the award path. This says nothing about Boss encounter probability or natural reward pace.

## Award contents

Among 79,221 generated gear items, rarity counts were Common 12,507 (15.79%), Uncommon 18,223 (23.00%), Rare 37,137 (46.88%), Epic 9,896 (12.49%), Legendary 1,458 (1.84%). Top material counts were cave_insect_plate 4,902; wild_beast_amber_sinew 4,744; mine_construct_corechip 4,591; and 4,167 each for the six sampled family Boss guarantees. Top equipment bases were cave_insect_chitin_spear 7,759; mine_construct_plateguard 4,648; fog_undead_guardmail 4,516; and 4,167 each for the sampled Boss-exclusive bases. Full per-family/rank, material, base, and rarity counts are in the attempt `summary.json`.

The run also mirrored 50 awards per cohort (1,200 total) from identical initial seeds: awarded instance/material data, RNG state, and next instance identity matched every time. This validates deterministic replay of the tested award calls; it does not establish confidence about natural player acquisition or downstream route outcomes.

## Controlled versus normal route evidence

The loot sample is a controlled 100,008-call award-generation diagnostic. Normal-route evidence remains the A v3 three-seed, three-year scripted route analysis in `reward-pacing.md`; it records item upgrades when equipped, not every generated loot roll. Do not merge controlled gear rates with normal-route encounter counts. The normal route's Adventure recorded first Boss-rank encounter at 116,195 game minutes; that is an encounter-time proxy and cannot recover first visibility or eligibility.

## Sources

- Current authored award generation and rank branch: `src/engine/itemGeneration.ts:348-430`.
- Content cohort rank / table definitions: `src/data/content/*` (family packs) and registration `src/data/contentRegistry.ts:1-20`.
- Historical 100,008-call sample, source fingerprint, and sampling limits: `reports/v2/20261008-content-expansion/phase-07/loot-analysis.md`.
- Normal v3 encounter scheduling/action ceiling: `scripts/phase8/run-normal-routes.mjs:568-592`.

## E2 change proposals

**NO CHANGE.** The refreshed controlled generation sample remains close to Phase7's rank rates, while the assignment contains no natural encounter denominator and no player-facing acquisition-rate evidence. It supports continued separation of Boss rewards from Boss appearance and win probabilities, not a drop-rate target or tuning change. No reward threshold or target is proposed.

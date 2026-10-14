# Phase8-B2 Controlled Combat Cell Manifest

Status: **runner and capped plan are written; runtime legal witnesses and combat measurements remain pending Lead execution.** The prior 75-target candidate manifest is retained as an earlier attempt. This document describes the current scoped runner.

## Target scope and selection

- Include all eight Boss IDs: `slime_heart`, `cave_insect_queen`, `wild_beast_apex`, `frontier_goblin_warlord`, `fog_undead_cryptlord`, `mine_construct_heart`, `chief`, and `wolfKing`.
- Include nine non-Boss representatives, one per rank in each of three family-region slices:
  - Wolf / forest: `grayWolf` Normal for the chain baseline, `alphaWolf` Elite for the first higher-rank gate, and `packLeader` MiniBoss for the authored howl mechanic.
  - Cave insects / mine: `cave_insect_digger` Normal for periodic shell guard, `cave_insect_razor` Elite for frequent telegraphed rush, and `cave_insect_broodguard` MiniBoss for guard plus rally.
  - Wild beasts / forest: `wild_beast_stonehorn` Normal for periodic guard, `wild_beast_bristleback` Elite for heavy strike, and `wild_beast_old_matriarch` MiniBoss for rally.
- This selects 17 targets total. The selection helper enforces no more than two definitions per rank/family-region; this plan selects one in each chosen group.
- The three family-region slices cover the wolf progression gate, mine encounter mechanics, and a separate forest family. The Boss set remains complete and individually stratified.

## Dimensions and workload ceiling

- Bands: Early, Mid, Late, using the Phase7 relative-level classifier: Early `max(1, targetLevel - 2)`, Mid `max(5, targetLevel)`, Late `max(12, targetLevel)`.
- Acquisition sources: Legacy, Adventure Loot, Crafted, Boss Gear, Masterpiece.
- Styles: Damage, Crit-Speed, Bleed, Penetration, Defense.
- Candidate cells before legal-path filtering: `17 × 3 × 5 × 5 = 1,275`.
- Known Legacy N/A cells: `17 × 3 bands × 3 affix-only styles = 153`; static legacy sword/armor can represent damage and defense but has no rolled affixes for the other styles.
- Remaining candidate cells before runtime legal gates: **1,122**.
- Maximum planned samples: 100 combats per legal cell for each of seeds 61101, 61102, and 61103 = **336,600 combat rows**. Cells whose public acquisition or canonical spawn witness is unavailable are recorded as `NOT_APPLICABLE` with the failed gate and produce no combat rows. Unexpected public acquisition action/reward-contract failure or encounter/combat action rejection is `RUNNER_ERROR`, never N/A; partial sample rows are retained.
- Boss coverage: 600 candidate cells (`8 IDs × 3 bands × 5 sources × 5 styles`), including the 72 statically known Legacy N/A cells. For Boss Gear, the sampled target's own Boss drop is excluded from its first-kill loadout.

## Runtime estimate and job split

Phase7 `combat-attempt-05` completed 118,800 controlled rows in 72 seconds (about 1,650 rows/second). The current plan uses a 5× allowance for fixture setup, legal acquisition, and metric bookkeeping. This estimates about **17 minutes aggregate** across 15 jobs. Each job is one `--band` × `--source` pair; the largest is 25,500 rows and estimates about 2 minutes. A 14-minute hard stop preserves partial outputs before the 15-minute ceiling. If a job approaches the cap, rerun it split by `--target <definitionId>`; keep all timestamped attempts.

The estimate is a planning estimate from Phase7 throughput, not measured Phase8 wall time. Do not merge Boss IDs in summaries.

## Legal acquisition and fixture rules

- Legacy: the runner provisions the blacksmith-access condition and uses public `trade` plus `equip` for sword or armor. The controlled preparation wallet is 1,000 gold; actual public transaction deltas are recorded separately from fight reward.
- Adventure Loot: use a canonical eligible non-Boss encounter, win through public encounter/combat actions, and replay the actual awarded owned `ItemInstance` with its provenance. The item is reused unchanged across sample reset fixtures; no item-generation or reward-award helper is called directly.
- Crafted: prepare gatherable recipe inputs with public `walkTo`/`gather`, call public `planCraft`, then public `craft`; require the requested actual affix and retain recipe, input, and craft provenance.
- Boss Gear: buy/equip public legacy support, defeat a different legally spawned Boss through public actions, and use that Boss's actual awarded item only if its provenance and rolled style match. A target Boss's own reward is rejected for that target's first-kill samples.
- Masterpiece: train through public recipes and actions, craft through `planCraft`/`craft`, and require `craftProvenance.masterpiece === true`. Unsupported styles or unavailable legal gates are explicit N/A.
- Spawn witnesses enumerate band level, region, season, hour, threat, safety, and settlement stage, then verify the chosen state with the canonical encounter-options projection and public encounter action. Wolf chain predecessors and Goblin Chief `bossAlive` are explicit controlled prerequisites.
- No companions are present. Potion use comes from actual inventory deltas. Gross damage is reconstructed per combat action from HP changes and known potion healing; any untracked healing is marked `NOT MEASURED`.
- Each sample row records control and derived seeds, target definition/rank/band, acquisition witness, item instance and provenance, target spawn witness, outcome, turns, remaining HP, potion use, gross damage status/value, gold/material deltas, time, stamina, reward receipt, and the controlled spawn-window offset. Preparation cost and fight cost remain separate.
- Risk-adjusted reward remains gold-only: `P(win) × victory gold − P(retreat) × retreat gold cost − P(death) × death gold loss`. Potion, material, preparation time, game time, and stamina remain separate, unpriced dimensions.

## Commands and attempt locations

- Scoped catalog manifest: `node scripts/phase8/build-combat-matrix-manifest.mjs`; writes a timestamped JSON attempt under `b-runner/matrix-manifest-attempts/`.
- Controlled job runner: `node scripts/phase8/run-controlled-combat-matrix.mjs --band <early|mid|late> --source <legacy|adventure-loot|crafted|boss-gear|masterpiece>`; writes compressed sample rows, acquisition witnesses, cell results, and completion data under `b-runner/controlled-matrix-attempts/`.
- Optional split: append `--target <definitionId>` when one band/source job approaches its hard stop.
- The natural-route summary already passed at `route-matrix-attempts/attempt-20261014T050130566Z` with 48 Boss rows and 58 route rows. It is not controlled matrix evidence.

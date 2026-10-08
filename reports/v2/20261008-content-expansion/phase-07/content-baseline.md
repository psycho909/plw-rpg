# Phase 7-A Content Baseline

Date: 2026-10-08 UTC  
Repository: `plw-rpg`  
HEAD: `2d6af37cb36c9616cb832fc4d839bfd6ea7ef7c9`  
Tracked `src/` files: 91  
Sorted source fingerprint: `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`

The fingerprint is SHA-256 of compact sorted-key JSON mapping every Git-tracked `src/` path to that file's SHA-256. Per-file hashes, exact IDs, and the AST counting algorithm are in [content-baseline.json](content-baseline.json); rerun from repository root with `python3 reports/v2/20261008-content-expansion/phase-07/count_content_baseline.py`. The counter uses the installed TypeScript compiler AST and unwraps parentheses, type assertions, `as`, `satisfies`, and non-null wrappers before enumerating static object properties. An inline regression fixture checks same-line and multiline registry objects.

## Current inventory

| Content | Count | IDs / note |
| --- | ---: | --- |
| V2 monster definitions | 5 | grayWolf, scarredWolf, alphaWolf, packLeader, wolfKing |
| V2 ranks | 5 | normal 2, elite 1, miniBoss 1, boss 1 |
| Legacy monster definitions | 4 | slime, wolf, goblin, chief; normal 3, boss 1 by legacy flag |
| Monster families | 1 | wolf |
| Monster traits | 2 | swift, armored |
| Boss variants | 3 | wellFed, starved, moonlit; excluded from monster totals |
| Item base definitions | 6 | shortSword, axe, spear, moonFangSpear, hideArmor, chainArmor |
| Legacy item kinds | 8 | wood, stone, iron, food, material, potion, sword, armor; excluded from V2 base items |
| Materials | 3 | wolfFang, wolfHide, moonStone |
| Recipes | 4 | starterSpear, fieldSpear, fieldArmor, ironShortSword |
| Affixes | 7 | striking, keen, piercing, bleeding, sturdy, blocking, warding |
| Rarities | 5 | common, uncommon, rare, epic, legendary |
| Crop definitions | 1 | wheat; active crop rows are instances |
| Living arcs | 3 | road, food, iron |
| Rare traveler definitions | 3 | elf, mage, knight |
| Minor living events | 2 | market_bustle, watch_patrol |
| Medium living events | 1 | independent_boss_attempt |
| Loot tables | 1 | wolf |

Counts distinguish definitions from runtime instances and generated variants. Legacy monster definitions are reported separately because the V2 `MonsterDefinition` registry/schema does not include them. Procedurally generated item instances, rarity rolls, affixes, boss variants, traits, and planted crop rows do not increase the definition counts. The code does not expose one unified registry spanning the legacy and V2 paths.

## Registry and trigger map

- `src/data/rewards.ts`: V2 item bases, affixes, rarity table, materials, family, five wolf monster definitions, monster traits, boss variants, loot table, wolf loot profiles and encounter tuning.
- `src/domain/reward.ts`: closed ID unions and schemas. Monster family/loot/rank IDs are currently wolf-only; monster roles are fast/bruiser/controller and cores bite/howl/moonCharge.
- `src/data/crafting.ts`, `src/engine/crafting.ts`: four recipe definitions and transaction-backed crafting; inputs currently draw on legacy inventory wood/stone/iron and wolf materials, outputs are procedural item bases.
- `src/engine/itemGeneration.ts`, `src/engine/gearStats.ts`, `src/engine/rewardActions.ts`: deterministic gear/material generation, award paths and use-facing operations.
- `src/data/config.ts`, `src/engine/actions.ts`, `src/engine/simulation.ts`: legacy monster/item kinds and equipment; one hard-coded wheat crop, two-day growth, fixed yield, four plots.
- `src/data/livingEvents.ts`, `src/engine/livingEvents.ts`: 3 life arcs, 3 rare traveler rows, 2 minor events, 1 medium event plus event weighting/cooldowns and state gates.
- `src/engine/regionalCrisis.ts`, `src/domain/crisis.ts`, `src/engine/crisisContributions.ts`, `src/engine/civilDefense.ts`: one Goblin regional crisis path. Trigger eligibility currently requires no active crisis, elapsed cooldown, monster population ≥30, camp level ≥2, and at least one of safety ≤80, food ≤55, or a live boss; eligible daily checks use seeded RNG. Crisis/player/NPC hooks are not a general content trigger registry.
- Automated content-specific validator: none found in tracked scripts/source. Existing validation is type-level/registry typing and runtime save/item validation, not whole-content reference, reachability, duplicate-like, localization, or usability QA. Phase 7-B owns this work.
- Existing QA inventory includes Vitest suites for rewards, item generation, crafting, wolf family, living events, crisis and save; `npm test` and `npm run build` are package-level entry points. No product tests were rerun for this counter repair; recorded Phase 7-A regression evidence remains 531/531 tests, typecheck, and production build passing.

## Existing use paths

`wolfFang` and `moonStone` bias spear/short-sword crafting toward bleeding, penetration and keen affixes; moon stone also raises legendary weapon special chance. `wolfHide` biases armor toward sturdy/blocking. Wolf drops supply the wolf family material path and wolf king guarantees moon stone; family encounters are forest scoped with a seven-day boss cooldown. Crafted outputs use normal generated gear instances and save/provenance support. Legacy `wood`, `stone`, and `iron` feed recipes; wheat harvest produces food used by ordinary life and crisis supply contributions. Regional crisis currently recognizes existing goblin threat/boss and contribution hooks, not arbitrary new families or materials.

## Constraints inherited from completed phases

- Phase 0–3 and formal Reward & Retention contract establish seeded RNG, single generation authority, stable item instance IDs, family-specific rewards and controlled monster variation. Do not count procedural traits/variants as base content or introduce `Math.random()`.
- Phase 4 treats meaningful next-adventure choice as the reward contract; a sell price alone is not enough to claim an item meaningfully useful. Procedural gear uses rarity for affix access rather than a raw stat multiplier.
- Phase 5 owns the narrow crafting/life slice: recipes must remain transaction-backed and material influence purposeful; no full alchemy or new profession expansion is licensed by the baseline.
- Phase 6 final engineering result is `PASS WITH FINDINGS`, not a human fun/retention claim. Keep the Goblin crisis canonical lifecycle and existing player/NPC contribution, consequences, bounded history, save/reload and succession behavior. Do not turn the existing narrow recovery safety valve or measured performance envelope into broader guarantees.
- Phase 6 findings retained: recovery safety valve only covers zero population at resolution with living Chief; early life support can lack an actionable goal when resources/gear are unavailable; policy wait actions were frequent in agent play; terminal DOM/listener sample differed from prior checkpoint without confirmed leak; measured history/save/browser costs are evidence for the tested setup, not universal guarantees. Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`.
- Phase 7 hard gates are ≥50 genuinely distinct monster definitions and ≥100 useful item definitions; one-item/one-monster batch additions must connect normal discovery to loot, use/crafting/life and the world. Existing duplicate/placeholder definitions cannot count toward new targets. Crop target is advisory (10–15 total) and requires different gameplay use.

## Baseline limits

These counts are exact for current tracked registries at the fingerprinted source. They are not a content-quality, spawn-reachability, combat-balance, economy, browser, long-world, or human product verdict. Legacy and V2 paths overlap conceptually (notably gray wolf) but are separate code representations; future acceptance must define whether migration/reuse avoids double counting. The crop is hard-coded rather than a multi-definition registry. Trigger reachability and dead content require the Phase 7 validator and runtime evidence.

# Phase 7-F — Wild Beast and Frontier Goblin authoring

Status: authored; awaiting centralized extraction and validation.

Authority: `tickets/20261008-v2x-07f-item-recipe-expansion.md`, `f-content-plan.md`, and `remaining-family-plan.md`. Source files: `src/data/content/wildBeasts.ts` and `src/data/content/frontierGoblins.ts`. Scope is limited to the two family packs and this report.

## Wild Beasts

- Equipment: 8 total (5 weapons / 3 armor). Added `wild_beast_resin_axe`, `wild_beast_antler_pike`, `wild_beast_amber_cuirass`, and `wild_beast_gale_hide`.
- Recipes: 4 total. Added `wild_beast_amber_cuirass_recipe`, with common hide and antler plus ordinary inventory iron as mandatory inputs. Its optional biases are limited to armor-compatible common materials; boss-exclusive material remains an optional bias on the compatible weapon recipe only.
- Loot sources: selected table `wild_beasts_loot_amberfox` offers the resin axe; `wild_beasts_loot_marshstag` offers the antler pike; `wild_beasts_loot_galehorn` offers the gale hide. Their existing monster `equipmentChance` values are nonzero. The cuirass is sourced by its public blacksmith recipe. The Apex maul remains exclusively on the Apex boss table/rule.
- Existing equipment, recipe, material, monster IDs/stats, spawn data, variants, boss rules, and exclusivity were retained.

## Frontier Goblins

- Equipment: 8 total (5 weapons / 3 armor). Added `frontier_goblin_ironaxe`, `frontier_goblin_duelist_pike`, and `frontier_goblin_duelist_vest`.
- Recipes: 4 total; existing planned recipe IDs and input bundles retained.
- Loot sources: selected table `frontier_goblins_loot_hauler` offers the ironaxe; `frontier_goblins_loot_duelist` offers both the duelist pike and vest. Their existing monster `equipmentChance` values are nonzero. The Warlord cleaver remains exclusively on the Warlord boss table/rule.
- Existing equipment, recipe, material, monster IDs/stats, spawn data, variants, boss rules, and exclusivity were retained.

## Verification state

No typecheck, validator, or tests were run by this authoring slice; the parent’s centralized run is pending. This report records source authoring only and makes no validation-pass claim.

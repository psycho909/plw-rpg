# Phase 7-F Cave Insects authoring freeze

Status: authored data complete; awaiting Root integration and validation.

## Frozen family counts

- Monsters: 11 (all existing IDs, combat stats, spawn profiles, boss rules, variants, and material drops preserved).
- Materials: 8 (all existing IDs and definitions preserved).
- Equipment: 8 total — 4 weapons and 4 armor.
- Recipes: 4 total — 2 weapon outputs and 2 armor outputs.
- Loot-only bases: 3, each attached to a non-boss selected loot table with nonzero weight. `cave_insect_queen_carapace` remains exclusive to the Queen boss table.

## Added IDs

- Equipment: `cave_insect_leg_blade`, `cave_insect_gland_pike`, `cave_insect_core_mace`, `cave_insect_plate_vest`, `cave_insect_resin_coat`, `cave_insect_warden_mail`.
- Recipes: `cave_insect_leg_blade_recipe`, `cave_insect_plate_vest_recipe`, `cave_insect_resin_coat_recipe`.
- Updated selected loot tables: `cave_insect_loot_lurker`, `cave_insect_loot_razor`, `cave_insect_loot_warden`.

The three new recipes use obtainable family materials plus ordinary inventory inputs. Rare cores are allowed only as optional bias materials; none is a mandatory input. The new bases use existing combat stats and affix IDs, with distinct slot/stat/affix combinations across the family.

## Verification status

No tests or typecheck were run in this authoring scope; centralized validation is owned by Root after family freeze. Counts and changed IDs were checked against the authored module. This report does not claim a validation pass.

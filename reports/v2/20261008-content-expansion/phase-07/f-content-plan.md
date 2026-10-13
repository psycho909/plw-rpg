# Phase7-F — Root implementation plan

Authority: Phase7 spec and approved `content-plan.md` / `remaining-family-plan.md`. Prepared on E source based on `3d15d2e479662cb74135bba8894290e054adaa6f`; source authoring waits for explicit F release in its ticket. Preserve 66 monster IDs, all Boss cores/forms/exclusives/cooldowns, 48 material IDs, and Slime's complete 8 equipment / 4 recipes. Finish the other five families to exactly 8 equipment / 4 recipes each, totaling 48 equipment and 24 recipes. Existing D bridges count toward that budget.

## Cave equipment and recipe completion

Four weapons: existing `cave_insect_chitin_spear`, `cave_insect_leg_blade` (keen/bleeding), loot `cave_insect_gland_pike` (piercing/bleeding), loot `cave_insect_core_mace` (striking/piercing).

Four armor: existing exclusive `cave_insect_queen_carapace`, `cave_insect_plate_vest` (sturdy/blocking), `cave_insect_resin_coat` (warding/blocking), loot `cave_insect_warden_mail` (sturdy/warding).

Keep spear recipe. Add leg-blade recipe (leg + gland + ordinary iron), plate-vest recipe (plate + sac + ordinary iron), resin-coat recipe (resin + chitin + ordinary wood). Each real common input is obtainable from canonical encounters; core/queen-core are compatible optional biases rather than mandatory boss gates. Adjust finite base-stat tradeoffs within existing schema and update selected loot tables so each loot-only base has a real nonzero source. No exclusive armor in normal tables.

## Other family completion

Use approved remaining-family roster IDs, preserving all existing equipment and recipe identities. Wild Beasts 5W/3A, Frontier Goblins 5W/3A, Fog Undead 6W/2A, Mine Constructs 6W/2A. Each has two weapon and two armor recipe outputs. Loot-only equipment must have an actual reachable selected table with nonzero equipment chance. Keep Boss gear exclusive. Real sidegrades need distinct effective slot/stats/eligible affixes; description, name, sale-price changes alone do not qualify.

## Narrow material-validation decision

Current validation compares sale price and passive generation effects but ignores mandatory recipe uses. That can classify two noninterchangeable ingredients for different actual equipment outputs as identical. Phase7 spec explicitly accepts Recipe Input as a material function. Root approves adding **validated mandatory recipe output functions** to material duplicate comparison during F; this changes authoring QA only, not item generation, gameplay, persistence or RNG.

The comparison must resolve actual output slot, combat stats and affix effects, exclude IDs/localized prose, and deduplicate identical consumer functions. Invalid recipes/outputs cannot establish a function. Merely adding a differently named copy of a recipe or using an ingredient in more identical recipes must not inflate qualification. Materials with equal passive effects and equal functional consumers remain excluded as duplicates. Preserve prior six duplicate warnings as historical evidence. Do not add nominal consumers, prices or affixes solely to reach the quantity gate. Add counterexample tests first and obtain independent review of this small validator change.

## Verification and ownership

Low authors isolated data modules only. Medium owns validator semantics and public crafting/equip/sell/save integration tests. No source core/Save/RNG change is authorized by this plan. One centralized runner captures actual extraction inputs/source snapshots and executes standard CLI per family plus merged pack after freeze. Targeted tests verify recipe consumption, optional material compatibility, generated item use and existing provenance; full regression/typecheck/build at the F/G integration node. Source-independent review before accepting F. Final quantity includes G crop goods only once and remains >=100, never reduced.

# Phase 7 Read-only Family Design and First Slice

As of HEAD `11980b796f88173cf05ef83ac41510a0d44a53b1`. The tracked-source fingerprint remains `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb` (91 tracked `src/` files); the new authoring contract/validator are presently untracked working-tree files, so that fingerprint does not cover them. No source files were changed for this design. C is still held pending B review and Root release; this is a proposal, not runtime content.

## Shared authoring rules

Use `slime` and `caveInsects` family IDs with prefixed IDs (`slime_*`, `cave_insect_*`) for each family, monster, loot table, equipment, material, recipe, and variant. Use family-prefixed variants such as `slime_heart_stillwater`, `slime_heart_surging`, `slime_heart_starved`, `cave_insect_queen_ironbound`, `cave_insect_queen_broodwake`, and `cave_insect_queen_famine`; never collide with existing `starved`, `wellFed`, or `moonlit` IDs. Never reuse legacy `slime`, `wolf`, `goblin`, or `chief`; reference them only as exclusions in `ContentBaselineIds`. Family scope is region-local and `threatChannel: 'regional_ecology'`; do not write Phase 6 Goblin threat/crisis state.

The lists below use only `ContentCombatMechanic` kinds currently declared in `src/domain/content.ts` (`rush`, `guard`, `heavyStrike`, `rally`, `chargedAttack`). Every monster must satisfy the two accepted identity axes: a real implemented combat mechanic and usable loot (sourced and consumed/biases a compatible output). Distinct spawn/world predicates add ecological identity but are not needed to meet the two-axis gate. Keep prose out of identity scoring: localized text alone does not make a definition distinct. Set spawn predicates on the family and inherit them unless a monster has a narrower profile. The validator can establish a controlled witness, not natural encounter frequency.

## Slime — eventual 11-monster family

Identity: opportunistic wetland/field scavengers that turn damp farmland edges and forest pools into contested food/material routes. Regions: `farmland`, `forest`; first entries on field edges near settled farmland. Keep early access level 1–3, threat 1, non-boss ranks; do not spawn in `village` or block the settlement approach. Higher ranks require player level 4+ or threat 2+ and remain optional.

| ID / rank | Combat identity: implemented effect | Loot/world identity: useful drop and distinct role |
| --- | --- | --- |
| `slime_slick` normal | `rush`, every 3 turns; telegraphed short lunge | `slime_resin` craft bias for guard/defense gear; common field-edge scavenger |
| `slime_amber` normal | `guard`, every 3; hardens before impact | `slime_amber_gel` sale/craft input; gathers at warm farmland stones |
| `slime_bog` normal | `heavyStrike`, every 4; slow bog surge | `slime_bog_mucus` stamina/armor recipe input; wet forest pools only |
| `slime_moss` normal | `rally`, every 4; it gathers its own strength before striking | `slime_moss_core` bias for defensive armor; forest shade ecology |
| `slime_glass` normal | `chargedAttack`, every 4; brittle shard pulse | `slime_glass_shard` bias for piercing/keen-compatible weapon; rare farmland/forest boundary |
| `slime_spring` normal | `rush`, every 4; high arc telegraph | `slime_spring_ichor` recipe input; spring-season profile and food-route scavenging role |
| `slime_bulwark` elite | `guard`, every 2; sustained shell | guaranteed useful `slime_amber_gel`; blocks a damp resource pocket |
| `slime_cinder` elite | `chargedAttack`, every 3; heated pulse | rare `slime_glass_shard`; warm edge profile and higher equipment tier |
| `slime_matriarch` mini-boss | `rally`, every 3; rally cadence | guaranteed `slime_moss_core`; seasonal pool guardian, not an encounter blocker |
| `slime_tidecaller` mini-boss | `heavyStrike`, every 3; rising-water slam | guaranteed `slime_bog_mucus`; only active under a bounded wet/season predicate |
| `slime_heart` boss | `chargedAttack`, every 4 with a small bounded heal; fixed core plus controlled variant | exclusive equipment `slime_heartstaff` and guaranteed `slime_heart_gel`; rare optional pool after progression |

Variant proposals (one persisted formed variant) are additive to the fixed `chargedAttack` and its bounded heal, which remain present in every Slime Heart form: `slime_heart_stillwater` adds periodic guard; `slime_heart_surging` adds a distinct rush; `slime_heart_starved` adds a low-bonus retaliation heavy strike. Variants cannot suppress the fixed heal or override its cadence, and are not extra monster definitions. Boss cooldown: 30 days, separate stable key `slime_heart`, preserved on flee/reload; clear on defeat and re-form only after cooldown. On defeat, bounded `food +3` (field harvest restored), never Goblin threat or crisis. Use supported region + progression proxies only: `farmland` or `forest`, level 7+, threat 3 or town stage, and a bounded season/hour predicate. Do not add depth/pool identifiers or map expansion; confirm the proxy is satisfiable through existing progression.

## Cave Insects — eventual 11-monster family

Identity: mineral-vein brood and ambush hunters that shape access to iron and underground passages. Region: `mine`. Use supported region + level/threat/season/hour predicates as progression proxies; do not add mine-depth flags or map expansion. Start at level 3+, village stage or threat 2+ so existing low-level dungeon/settlement routes stay safe; no insect spawn on village/farmland routes. Boss proxy is mine, level 8+ and threat 3 (or town stage), with a bounded season/hour predicate.

| ID / rank | Combat identity: implemented effect | Loot/world identity: useful drop and distinct role |
| --- | --- | --- |
| `cave_insect_digger` normal | `guard`, every 3; digs in before a strike | `cave_insect_chitin` recipe/bias input; mine entrance scavenger |
| `cave_insect_skitter` normal | `rush`, every 2; fast but low-defense lunge | `cave_insect_leg` sale/craft input; open-tunnel patrol |
| `cave_insect_spitter` normal | `chargedAttack`, every 4; visible resin shot (no poison status claim) | `cave_insect_resin` weapon/armor bias; chamber ledges only |
| `cave_insect_carrier` normal | `rally`, every 4; signals a brood surge without spawning extra actors | `cave_insect_sac` guaranteed craft input; carries mineral fragments |
| `cave_insect_shellback` normal | `guard`, every 2; armored shell | `cave_insect_plate` defensive recipe; low-threat side passage |
| `cave_insect_lurker` normal | `heavyStrike`, every 4; ambush wind-up is explicit | `cave_insect_venom_gland` (name is flavor only; no poison mechanic) rare input; deeper chamber profile |
| `cave_insect_razor` elite | `rush`, every 2; two-stage telegraph represented as one rush | rare `cave_insect_plate`; patrols an iron vein |
| `cave_insect_warden` elite | `guard`, every 2; denies a lane through defense | rare `cave_insect_core`; guards a side cache |
| `cave_insect_broodguard` mini-boss | `rally`, every 3; brood cadence | guaranteed `cave_insect_core`; fixed chamber guardian |
| `cave_insect_tunneler` mini-boss | `heavyStrike`, every 3; ground-break telegraph | guaranteed `cave_insect_sac`; opens a mineral pocket as its local role, without changing map topology |
| `cave_insect_queen` boss | `chargedAttack`, every 4 with bounded heal; fixed core plus controlled variant | exclusive equipment `cave_insect_queenblade` and guaranteed `cave_insect_queen_core`; optional mine target gated by level/threat proxies |

Variant proposals: `cave_insect_queen_ironbound` adds periodic guard; `cave_insect_queen_broodwake` strengthens rally; `cave_insect_queen_famine` reduces heal and improves guaranteed material identity without increasing quantity. Boss cooldown: 45 days, stable key `cave_insect_queen`; persist formed variant across flee/reload; clear on defeat. Defeat gives bounded `safety +2` through removal of a mine hazard, never Goblin threat/crisis. Keep each variant’s mechanics inside the declared finite mechanic union.

## Per-family item and recipe allocation (eventual targets)

Each family below has exactly 8 equipment bases, 8 ecology/craft materials, and 4 recipe IDs. Four equipment bases are recipe outputs; four are loot-only drops. Every material has at least one stated source and consumer/bias; boss materials remain optional. These are IDs and purposes for planning, not authored data.

### Slime allocation

- Equipment: recipe outputs `slime_resin_guard` (defense/guard armor), `slime_glass_pike` (penetration weapon), `slime_moss_coat` (block armor), `slime_spring_blade` (rush/critical weapon); loot-only `slime_amber_mace`, `slime_bog_mail`, `slime_matriarch_cuirass`, `slime_heartstaff` (boss exclusive).
- Materials: `slime_resin`, `slime_amber_gel`, `slime_bog_mucus`, `slime_moss_core`, `slime_glass_shard`, `slime_spring_ichor`, `slime_heart_gel` (boss), `slime_pool_salt` (seasonal pool rare). The first six are sourced from matching normals/elites; matriarch/heart supply the boss-linked materials; pool salt is sourced by a wet-season normal witness. Each feeds one recipe input or compatible bias; boss materials feed optional recipes/bias rather than all progression.
- Recipes: `slime_resin_guard_recipe` → `slime_resin_guard`; `slime_glass_pike_recipe` → `slime_glass_pike`; `slime_moss_coat_recipe` → `slime_moss_coat`; `slime_spring_blade_recipe` → `slime_spring_blade`. Use one primary material input and at most one secondary material bias; no recipe may require the same boss drop repeatedly.

### Cave insect allocation

- Equipment: recipe outputs `cave_insect_chitin_spear` (penetration weapon), `cave_insect_plate_armor` (defense armor), `cave_insect_resin_blade` (bleed/critical weapon), `cave_insect_core_mail` (reduction armor); loot-only `cave_insect_razor_glaive`, `cave_insect_warden_shell`, `cave_insect_broodguard_plate`, `cave_insect_queenblade` (boss exclusive).
- Materials: `cave_insect_chitin`, `cave_insect_leg`, `cave_insect_resin`, `cave_insect_sac`, `cave_insect_plate`, `cave_insect_venom_gland` (the name is flavor; no poison mechanic), `cave_insect_core`, `cave_insect_queen_core` (boss). Digger/skitter/spitter/carrier/shellback/lurker and elite/mini/boss drops source these IDs; every material is consumed or supplies a compatible equipment bias. Queen core is optional and not required by routine recipes.
- Recipes: `cave_insect_chitin_spear_recipe` → `cave_insect_chitin_spear`; `cave_insect_plate_armor_recipe` → `cave_insect_plate_armor`; `cave_insect_resin_blade_recipe` → `cave_insect_resin_blade`; `cave_insect_core_mail_recipe` → `cave_insect_core_mail`. Four distinct recipes share no exact input bundle and do not out-sell their total effective acquisition cost.

## Proposed C-sized closed slice

C starts with one complete Slime closure only: representative normal encounter(s), sourced useful material, one weighted loot base, one recipe output, one recipe and discovery/save/equip path. After Slime slice acceptance, close the equivalent Cave Insects path. This sequencing does not reduce either family’s approved eventual budget of 11 monsters, 8 equipment, 8 materials and 4 recipes. Example paths:

- Field slime: `slime_slick` can be encountered on the normal farmland route → awards `slime_resin` → `slime_resin` is consumed/biases `slime_resin_guard_recipe` at the existing blacksmith → generated armor has normal instance ID/save/equip/sale behavior → discovery records monster/material/base through existing reward collection.
- Cave Insects follow after Slime acceptance: `cave_insect_skitter` is reachable through the mine + level/threat proxy → awards `cave_insect_chitin` → material is consumed/biases `cave_insect_chitin_spear_recipe` → generated weapon follows the same instance path → discovery records the family reward.

For each path the loot table must source its material and loot equipment, the material must be a recipe input or an eligible bias for a compatible authored output, every equipment base must be reachable from loot or recipe output, and all recipe/cost/gold/stamina/station requirements must pass existing crafting rules. No material may depend only on a shop purchase; price arbitrage must remain below its effective recipe inputs plus fees/stamina opportunity cost. Preserve current recipes and generated instance handling.

## Recipe/economy guardrails for all 24 eventual recipes

1. Four recipes per family: two weapon and two armor outputs across the four; each consumes at least one family-sourced material, with a distinct recipe purpose and compatible bias.
2. Recipe inputs are actual inventory goods or `source: 'material'` IDs; output bases are new authored equipment. Do not create pseudo-recipe goods or duplicate outputs under new names.
3. Ensure all eight materials per family have a real reachable source and at least one recipe input or eligible bias consumer; rare/exclusive materials can be boss/elite sourced but need a controlled witness and a worthwhile conversion path.
4. Every item base must have a loot or recipe route; every loot base and material is referenced; recipe output and station/hours/smithing are reachable in a controlled witness. Count distinct usable `ContentMaterial` definitions toward the 107-item budget as Root resolved; do not count crop-good mirrors twice. A material must still have a reachable source and a real consumer/bias.
5. Keep positive bounded finite input amounts, gold/stamina costs, output level, quality floor and masterpiece chance. Preserve existing input cost tiers and legendary/rarity behavior; do not make a guaranteed net-positive buy/craft/sell loop.
6. Compare total sale value with purchased-input cost, recipe gold cost, and stamina/time; ensure no infinite replenishment or arbitrage. Retain uncertainty of economic balance until the Phase 7 economy runner measures it.
7. Boss drops are targets, not routine recipe bottlenecks: recipes must not require repeated boss kills faster than the family cooldown allows. Guaranteed exclusive material quantity remains bounded.

## Resolved Root decisions

- The 107-item accounting includes usable materials; crop-good mirrors deduplicate against their source goods and cannot inflate the total.
- Spawn reachability uses existing region plus level/threat/season/time predicates as proxies. No depth flag, map expansion, or per-pool identity is added.
- Candidate boss world consequences `food +3` for Slime and `safety +2` for Cave Insects are accepted for this design; bounds remain enforced by core validation.
- The qualifying two axes are implemented combat mechanic + usable loot. Ecology/world predicates improve identity but are not needed to qualify.
- C order is one closed Slime slice first, then one closed Cave Insects slice after Slime acceptance. Eventual targets remain 11 monsters, 8 equipment, 8 materials, 4 recipes per family.

This document records proposals under the resolved Root decisions above. No data pack, source edit, tests or Git operation is included.

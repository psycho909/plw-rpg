# Phase 7-D–F Preparation — Remaining Four Families

Read-only planning artifact. Slime is already the accepted isolated C data pack; Cave Insects and the four families below remain future authoring. This plan covers Wild Beasts, Goblin, Undead, and Constructs. It does not author runtime data.

Each family keeps the approved 11 monster split (6 normal, 2 elite, 2 mini-boss, 1 boss), 8 equipment, 8 materials, and 4 recipes. Each of the 44 monsters should select a prefixed, family-local loot table whose actual source/use path distinguishes its reward. The family table is only fallback. Every row below has (1) a finite implemented telegraphed combat mechanic, (2) a sourced/useful selected material or equipment path, and (3) an ecology/progression role. Bosses use at most two fixed core mechanics and one additive mechanic per formed variant. The six-family boss cores are distinct: Slime Heart `chargedAttack` + bounded heal; Cave Insect Queen `guard` + `heavyStrike` (no heal); Wild Beast Apex `rush` + `heavyStrike`; Frontier Goblin Warlord self-only `rally` + `guard`; Fog Undead Cryptlord `chargedAttack` + bounded heal + `rally`; Ancient Construct Heart `guard` + `chargedAttack` (no heal). Telegraph/counter and loot intent should remain visible; no variant suppresses or replaces its fixed core. Supported mechanics only: `rush`, `guard`, `heavyStrike`, `rally`, `chargedAttack`; prose must not claim summon, poison/status, ranged targeting, terrain alteration, faction behavior, or other unsupported effects. Boss variants are uniquely prefixed and additive to the fixed boss core.

Existing baseline affixes only: weapon `striking`, `keen`, `piercing`, `bleeding`; armor `sturdy`, `blocking`, `warding`. Material bias remains 0–4 and sale value 1–50. Equipment distribution follows the approved overall 30 weapon / 18 armor target; each family has 4 recipe outputs (2 weapon / 2 armor). All remaining family materials have a real source and a recipe input or compatible bias consumer. Boss/exclusive materials are optional bias inputs, never routine recipe gates. Per-family tier targets are 3 uncommon/rare/exclusive materials, counting the boss-only material. Recipes use current stations, inventory/material input types, quality/skill bounds, unique input bundles, and non-arbitrage costs.

## Wild Beasts (`wildBeasts`)

Ecology: non-wolf predators and grazing animals on forest margins and the far edge of farmland. Keep village tiles and settlement approaches empty. Early normal encounters appear on optional farmland/forest edges with low threat and modest levels; elites/minis require level 4+ or threat 2; boss is a rare forest-edge target with an optional threat-3 path and a second same-region OR profile at higher level (e.g. 10+) plus bounded season/hour, without a minimum threat 3. No extra map, prey simulation, or wildlife population counter.

| ID / rank | Implemented combat identity | Selected reward table → useful source/use | World access/role |
| --- | --- | --- | --- |
| `wild_beast_brush_hare` normal | `rush`: short, low-bonus evasive lunge | `wild_beast_loot_brush_hare` → `wild_beast_hide`; bias for sturdy armor | Farmland edge, level 1–3, threat 1, dawn |
| `wild_beast_stonehorn` normal | `guard`: braces its horns before impact | `wild_beast_loot_stonehorn` → `wild_beast_horn`; recipe input for a blocking cuirass | Forest edge, level 2–4; avoids village |
| `wild_beast_redtail` normal | `heavyStrike`: telegraphed pounce | `wild_beast_loot_redtail` → `wild_beast_tendon`; bleed/striking weapon bias | Forest, level 3–5, warm season |
| `wild_beast_fernback` normal | `rally`: gathers its own strength before charging | `wild_beast_loot_fernback` → `wild_beast_fur`; guard-armor input | Shaded forest, level 3–5, late day |
| `wild_beast_marshstag` normal | `guard`: antlers lower into a defensive stance | `wild_beast_loot_marshstag` → `wild_beast_antler`; weapon/armor recipe input | Forest wet edge, spring/autumn, level 3–5 |
| `wild_beast_amberfox` normal | `chargedAttack`: visible amber-glint windup | `wild_beast_loot_amberfox` → `wild_beast_resin`; keen/bleeding weapon bias | Farmland/forest seam, level 4–6, afternoon |
| `wild_beast_bristleback` elite | `heavyStrike`: committed shoulder rush | `wild_beast_loot_bristleback` → rare `wild_beast_amber_sinew`; optional keen weapon bias | Forest, level 5+, threat 2+ |
| `wild_beast_galehorn` elite | `rush`: faster telegraphed horn charge | `wild_beast_loot_galehorn` → rare `wild_beast_amber_sinew`; piercing weapon bias | Forest ridge edge, level 6+, threat 2+ |
| `wild_beast_old_matriarch` mini-boss | `rally`: self-power rise followed by a heavy sweep | `wild_beast_loot_matriarch` → `wild_beast_amber_sinew`; armor recipe input | Optional forest clearing, level 6+, threat 2+ |
| `wild_beast_ironhide` mini-boss | `guard`: repeated thick-hide defense | `wild_beast_loot_ironhide` → `wild_beast_amber_sinew`; blocking bias | Farmland perimeter, level 7+, threat 2+ |
| `wild_beast_apex` boss | Fixed `rush` + `heavyStrike` core; visible charge leaves a response window; no healing | `wild_beast_loot_apex` → boss-only `wild_beast_apex_core`; exclusive `wild_beast_apex_maul` | Rare forest edge, level 8+ / threat 3 OR same-region level 10+ plus bounded season/hour with no minimum threat 3; never village path |

Materials (8): `wild_beast_hide`, `wild_beast_horn`, `wild_beast_tendon`, `wild_beast_fur`, `wild_beast_antler`, uncommon `wild_beast_resin`, rare `wild_beast_amber_sinew`, boss-only `wild_beast_apex_core`. Recipe inputs use common materials; resin and amber sinew are uncommon/rare optional sources; apex core is boss-guaranteed and optional bias only.

Equipment (8; 5 weapon / 3 armor): craft `wild_beast_tendon_spear` (weapon, bleed/piercing), `wild_beast_horn_knife` (weapon, keen/striking), `wild_beast_hide_coat` (armor, sturdy/blocking), `wild_beast_amber_cuirass` (armor, blocking/warding); loot `wild_beast_resin_axe`, `wild_beast_antler_pike`; armor loot `wild_beast_gale_hide`; boss-exclusive `wild_beast_apex_maul`. This yields 5 weapons / 3 armor.

Recipes (4): `wild_beast_tendon_spear_recipe` (tendon + antler); `wild_beast_horn_knife_recipe` (horn + existing wood input); `wild_beast_hide_coat_recipe` (hide + fur); `wild_beast_amber_cuirass_recipe` (resin + inventory iron; optional sinew/core bias). Distinguish weapon penetration/bleed choices from armor defense/block tradeoffs; no additional equipment slot.

Boss variants add exactly one distinct mechanic to the unchanged core: `wild_beast_apex_amberhide` adds guard; `wild_beast_apex_galecharge` adds chargedAttack; `wild_beast_apex_brutal` adds self-only rally. The core rush/heavyStrike remains telegraphed and counterable in every form. Stable cooldown key `wild_beast_apex`, 35 days; formed variant persists through flee/reload. Candidate bounded consequence: safety +2 after the predator is removed. No extra threat/population counter.

## Frontier Goblins (`frontierGoblins`)

Ecology: a new, distinct local band using forest margins and mine approaches at higher threat. The existing legacy Goblin and Chief stay excluded and untouched. This family is `regional_ecology`; no content hook writes Phase 6 global Goblin threat, Chief state, or crisis outcome. Do not add factions, camps, diplomacy, reinforcements, or a second crisis.

| ID / rank | Implemented combat identity | Selected reward table → useful source/use | World access/role |
| --- | --- | --- | --- |
| `frontier_goblin_scout` normal | `rush`: telegraphed quick strike | `frontier_goblin_loot_scout` → `frontier_goblin_scrap`; weapon recipe input | Forest edge, level 3+, threat 2+ |
| `frontier_goblin_slinger` normal | `chargedAttack`: visible windup for a single heavy blow (not ranged) | `frontier_goblin_loot_slinger` → `frontier_goblin_slingcord`; keen/bleeding bias | Forest, level 4+, threat 2+, day |
| `frontier_goblin_tinker` normal | `guard`: braces behind a built shield | `frontier_goblin_loot_tinker` → `frontier_goblin_plate`; armor input | Mine entrance edge, level 4+, threat 2+ |
| `frontier_goblin_lookout` normal | `rally`: self-gathers before striking; no ally summon | `frontier_goblin_loot_lookout` → `frontier_goblin_signalcloth`; recipe/bias material | Forest edge, level 4+, threat 2+, late day |
| `frontier_goblin_hauler` normal | `heavyStrike`: slow pack-backed blow | `frontier_goblin_loot_hauler` → `frontier_goblin_ironbits`; recipe input | Mine approach, level 5+, threat 2+ |
| `frontier_goblin_trapper` normal | `guard`: braces rather than placing a trap | `frontier_goblin_loot_trapper` → `frontier_goblin_wire`; piercing bias | Forest/mine seam, level 5+, threat 2+, evening |
| `frontier_goblin_breaker` elite | `heavyStrike`: high-commitment strike | `frontier_goblin_loot_breaker` → rare `frontier_goblin_forgecore`; weapon input/bias | Mine approach, level 6+, threat 3 |
| `frontier_goblin_duelist` elite | `rush`: precise repeated lunge | `frontier_goblin_loot_duelist` → rare `frontier_goblin_forgecore`; weapon input | Forest, level 6+, threat 3 |
| `frontier_goblin_standardbearer` mini-boss | `rally`: stronger self-empower cycle | `frontier_goblin_loot_standardbearer` → `frontier_goblin_signalcloth`; armor/weapon bias | Forest clearing, level 7+, threat 3 |
| `frontier_goblin_saboteur` mini-boss | `chargedAttack`: slow, visible strike | `frontier_goblin_loot_saboteur` → `frontier_goblin_forgecore`; optional recipe input | Mine edge, level 7+, threat 3; does not damage map/buildings |
| `frontier_goblin_warlord` boss | Fixed self-only `rally` + `guard` core; telegraphed brace/rally cycle creates a response window; no healing | `frontier_goblin_loot_warlord` → boss-only `frontier_goblin_warlord_seal`; exclusive `frontier_goblin_warlord_cleaver` | Optional forest/mine target, level 8+ / threat 3 OR same-region level 10+ plus bounded season/hour with no minimum threat 3; explicitly not legacy Chief |

Materials (8): `frontier_goblin_scrap`, `frontier_goblin_slingcord`, `frontier_goblin_plate`, uncommon `frontier_goblin_signalcloth`, `frontier_goblin_ironbits`, `frontier_goblin_wire`, rare `frontier_goblin_forgecore`, boss-only `frontier_goblin_warlord_seal`. Recipe inputs use common materials across the four recipes; signalcloth is uncommon and forgecore rare, while the boss seal is optional compatible bias only. No boss-exclusive requirement for routine equipment.

Equipment (8; 5 weapon / 3 armor): craft `frontier_goblin_scrap_spear` (weapon, piercing/striking), `frontier_goblin_wire_knife` (weapon, keen/bleeding), `frontier_goblin_plate_vest` (armor, sturdy/blocking), `frontier_goblin_signal_coat` (armor, warding/blocking); loot `frontier_goblin_ironaxe`, `frontier_goblin_duelist_pike`; armor loot `frontier_goblin_duelist_vest`; boss-exclusive `frontier_goblin_warlord_cleaver`. This yields 5 weapons / 3 armor.

Recipes: `frontier_goblin_scrap_spear_recipe` (scrap + wood); `frontier_goblin_wire_knife_recipe` (wire + slingcord); `frontier_goblin_plate_vest_recipe` (plate + ironbits); `frontier_goblin_signal_coat_recipe` (signalcloth + inventory iron, optional core/seal bias). Four unique input/output paths, existing blacksmith and Smithing progression. Candidate boss effect: safety +2 from the cleared local route; do not change global Goblin threat/Chief/crisis. Stable boss cooldown 45 days. Variants add exactly one mechanic to the unchanged core: `frontier_goblin_warlord_ironhide` adds heavyStrike; `frontier_goblin_warlord_breaker` adds chargedAttack; `frontier_goblin_warlord_skirmish` adds rush. Each form retains self-only rally and guard.

## Fog Undead (`fogUndead`)

Ecology: optional night activity in forest and discovered `unknown`; village/farmland remain safe. Unknown-region profiles require the existing region discovery witness. No undead status, poison, raising dead, population drain, or new magic system. Expose only as late optional content; day/night is an hour predicate and seeds remain canonical.

| ID / rank | Implemented combat identity | Selected reward table → useful source/use | World access/role |
| --- | --- | --- | --- |
| `fog_undead_bonewalker` normal | `guard`: braces behind a bone frame | `fog_undead_loot_bonewalker` → `fog_undead_bone`; defense recipe input | Forest, level 4+, hours 20–23, threat 2+ |
| `fog_undead_lantern_wisp` normal | `chargedAttack`: telegraphed pulse; no ranged-status claim | `fog_undead_loot_lantern` → `fog_undead_wax`; keen weapon bias | Discovered unknown, level 5+, night hours, threat 2+ |
| `fog_undead_gravehound` normal | `rush`: low-bonus charge | `fog_undead_loot_gravehound` → `fog_undead_tendon`; bleed weapon input | Forest, level 5+, autumn/winter nights |
| `fog_undead_crypt_guard` normal | `heavyStrike`: slow stone-weight blow | `fog_undead_loot_guard` → `fog_undead_cryptstone`; armor input | Unknown, level 6+, threat 2+, night |
| `fog_undead_mourner` normal | `rally`: self-gathers before a measured strike | `fog_undead_loot_mourner` → `fog_undead_shroud`; armor bias | Forest, level 5+, winter nights |
| `fog_undead_bellkeeper` normal | `guard`: periodic protective posture | `fog_undead_loot_bellkeeper` → `fog_undead_bellmetal`; recipe input | Unknown, level 6+, town or threat 3, night |
| `fog_undead_wight` elite | `chargedAttack`: stronger visible pulse | `fog_undead_loot_wight` → rare `fog_undead_cinderbone`; weapon bias/input | Forest/unknown, level 7+, threat 3, night |
| `fog_undead_blackguard` elite | `guard`: larger periodic defense | `fog_undead_loot_blackguard` → rare `fog_undead_cinderbone`; armor bias | Unknown, level 7+, threat 3, night |
| `fog_undead_crypt_knight` mini-boss | `heavyStrike`: committed downward strike | `fog_undead_loot_crypt_knight` → `fog_undead_cinderbone`; recipe input | Unknown, level 8+, threat 3, late night |
| `fog_undead_hollow_bell` mini-boss | `rally`: self-empower cycle signaled by bell posture | `fog_undead_loot_hollow_bell` → `fog_undead_bellmetal`; optional bias | Forest clearing/unknown, level 8+, threat 3, night |
| `fog_undead_cryptlord` boss | Fixed `chargedAttack` + self-only `rally` core with bounded heal; the visible charge gives a response window in every form | `fog_undead_loot_cryptlord` → boss-only `fog_undead_crypt_heart`; exclusive `fog_undead_cryptblade` | Discovered unknown, level 9+ / threat 3 OR same discovered region level 11+ plus bounded night/season with no minimum threat 3; late optional route |

Materials (8): `fog_undead_bone`, `fog_undead_wax`, `fog_undead_tendon`, `fog_undead_cryptstone`, `fog_undead_shroud`, uncommon `fog_undead_bellmetal`, rare `fog_undead_cinderbone`, boss-only `fog_undead_crypt_heart`. The elite blackguard and mini-boss hollow bell source cinderbone/bellmetal respectively; no sealwax ID is proposed. Crypt heart is optional bias only, never a routine recipe gate.

Equipment (8; 6 weapon / 2 armor): Craft `fog_undead_cryptblade` and `fog_undead_boneknife` (weapons), plus `fog_undead_guardmail` and `fog_undead_shroudcoat` (armor); loot `fog_undead_bellstaff`, `fog_undead_cinderpike`, `fog_undead_wightcleaver` (weapons), and `fog_undead_cryptlord_blade` (boss exclusive weapon). This yields 6 weapons / 2 armor.

Recipes (4; 2 weapon / 2 armor): `fog_undead_cryptblade_recipe` (bone + tendon); `fog_undead_boneknife_recipe` (wax + existing wood); `fog_undead_guardmail_recipe` (cryptstone + shroud); `fog_undead_shroudcoat_recipe` (bellmetal + existing iron). Rare cinderbone/crypt_heart are optional compatible biases, never required boss gates. Boss cooldown 60 days; prefixed variants add exactly one mechanic to the unchanged chargedAttack/rally/heal core: `fog_undead_cryptlord_coldguard` adds guard, `fog_undead_cryptlord_bellrush` adds rush, and `fog_undead_cryptlord_lastblow` adds heavyStrike. Candidate consequence safety +2 after cryptlord defeat; no NPC population/history deletion. Threat 3 is one optional path; a same discovered region level 11+ night/season profile without minimum threat 3 is the alternative OR route.

## Mine Constructs (`mineConstructs`)

Ecology: inert mineral guardians encountered only along mine routes and discovered unknown region. Village and farmland excluded. Gate early life routes from mandatory combat; mine normal content begins level 4+ and threat 2+, higher ranks use level 7+ / threat 3. No golem faction, mine-depth flags, destructible terrain, or new mining simulation.

| ID / rank | Implemented combat identity | Selected reward table → useful source/use | World access/role |
| --- | --- | --- | --- |
| `mine_construct_shardling` normal | `rush`: short stone lunge | `mine_construct_loot_shardling` → `mine_construct_shard`; penetration weapon input | Mine, level 4+, threat 2+, daytime |
| `mine_construct_sentinel` normal | `guard`: periodic plate brace | `mine_construct_loot_sentinel` → `mine_construct_plate`; armor input | Mine, level 4+, threat 2+ |
| `mine_construct_pylon` normal | `chargedAttack`: visible energy-free pressure pulse (no magic-system claim) | `mine_construct_loot_pylon` → `mine_construct_resonant_stone`; keen bias | Mine, level 5+, threat 2+, midday |
| `mine_construct_crawler` normal | `heavyStrike`: telegraphed weighted slam | `mine_construct_loot_crawler` → `mine_construct_joint`; recipe input | Mine, level 5+, threat 2+ |
| `mine_construct_mason` normal | `rally`: self-aligns before a stronger strike | `mine_construct_loot_mason` → `mine_construct_binding`; sturdy/blocking bias | Mine, level 5+, threat 2+, afternoon |
| `mine_construct_veinwatcher` normal | `guard`: narrow frontal brace | `mine_construct_loot_veinwatcher` → `mine_construct_ironvein`; recipe input | Mine/unknown, level 6+, threat 2+, discovered unknown only after unlock |
| `mine_construct_ram` elite | `rush`: high-commitment linear charge | `mine_construct_loot_ram` → rare `mine_construct_corechip`; weapon bias/input | Mine, level 7+, threat 3 |
| `mine_construct_warder` elite | `guard`: stronger periodic shell | `mine_construct_loot_warder` → rare `mine_construct_corechip`; armor bias/input | Mine, level 7+, threat 3 |
| `mine_construct_architect` mini-boss | `rally`: self-empower followed by a heavier strike | `mine_construct_loot_architect` → `mine_construct_corechip`; recipe input | Discovered unknown, level 8+, threat 3 |
| `mine_construct_bastion` mini-boss | `guard`: sustained defensive cadence | `mine_construct_loot_bastion` → `mine_construct_corechip`; optional bias | Mine, level 8+, threat 3 |
| `mine_construct_heart` boss | Fixed `guard` + `chargedAttack` core; a clear brace precedes the visible pulse, with no healing | `mine_construct_loot_heart` → boss-only `mine_construct_ancient_core`; exclusive `mine_construct_heartbreaker` | Discovered unknown or late mine proxy, level 9+ / threat 3 OR same discovered region level 11+ plus bounded season/hour with no minimum threat 3 |

Materials (8): `mine_construct_shard`, `mine_construct_plate`, `mine_construct_resonant_stone`, `mine_construct_joint`, `mine_construct_binding`, uncommon `mine_construct_ironvein`, rare `mine_construct_corechip`, boss-only `mine_construct_ancient_core`. Both elite warder and mini-boss bastion use the corechip material; no separate heartstone ID is proposed. Corechip/ancient core are optional biases only; ancient core is guaranteed but not a routine recipe input.

Equipment (8; 6 weapon / 2 armor): craft `mine_construct_shardpike` (weapon, piercing/striking), `mine_construct_jointblade` (weapon, keen/bleeding), `mine_construct_plateguard` (armor, sturdy/blocking), `mine_construct_bindingmail` (armor, warding/blocking); loot `mine_construct_ramhammer`, `mine_construct_veinaxe`, `mine_construct_architect_glaive`; boss-exclusive `mine_construct_heartbreaker`.

Recipes (4; 2 weapon / 2 armor): `mine_construct_shardpike_recipe` (shard + joint); `mine_construct_jointblade_recipe` (resonant stone + ironvein); `mine_construct_plateguard_recipe` (plate + binding); `mine_construct_bindingmail_recipe` (ironvein + existing iron). Corechip and ancient core are optional biases only. Boss cooldown 60 days; variants add exactly one mechanic to the unchanged guard/chargedAttack core: `mine_construct_heart_ironwall` adds rally; `mine_construct_heart_shardrush` adds rush; `mine_construct_heart_breaker` adds heavyStrike. Candidate consequence prosperity +2 from reopening a safe mine route; no map changes. Threat 3 is one optional path; a same discovered mine/unknown route at level 11+ with bounded season/hour and no minimum threat 3 is an alternative OR profile.

## Cross-family checks before authoring

- Equipment plan totals across the six families: Slime 4W/4A, Cave Insects 4W/4A, Wild Beasts 5W/3A, Frontier Goblins 5W/3A, Fog Undead 6W/2A, Mine Constructs 6W/2A = 30W/18A.
- Loot pools are monster-selected and family-local; each table lists only that monster’s own/useful materials and equipment. The fallback family table must not erase selected-table identity. Boss guaranteed-material overlap between selected table and `bossRules` must be deduplicated by runtime; test exact one material award.
- Normal monsters stay outside `village`, avoid compulsory route encounters, and do not create a forced combat task for life-first characters. Forest/farmland low-level optional encounters are only Wild Beasts; the other three are threat/progression gated.
- Keep claims matched to mechanics: “telegraphed pulse” is a supported charged attack, not ranged magic; guard is defense, rally is self-power, and none summons allies or inflicts an undeclared status.
- Rare/exclusive target: at least 3 of each family’s 8 materials should be uncommon/rare/exclusive through the loot profiles and boss/elite/mini sources; the per-family material lines designate these tiers explicitly, supporting the plan’s ≥18 rare/exclusive family materials without increasing their recipe bottleneck.
- All six bosses have a same-region/discovery-gated OR profile at a somewhat higher player level with bounded season/hour and no minimum threat 3, while threat 3 remains the earlier optional path; this avoids removing every adventure goal when global Goblin crisis resolves. Exact thresholds and natural exposure remain unverified. Slime’s alternative profile is future E refinement only and does not alter the frozen C pack.
- Proposed consequence values are candidates, not balance findings. Exact economy, safety, and progression impact remains for the simulation/balance lane. Validate all spawn witnesses against current progression; unknown requires actual existing unlock. No natural coverage claim follows from validator witnesses.

## Resolved budgets and remaining validation responsibilities

- Undead uses exactly eight materials by retaining `fog_undead_crypt_heart` as the boss-only eighth material and omitting `fog_undead_sealwax`; cinderbone covers elite rarity.
- Constructs uses exactly eight materials with `mine_construct_corechip` as the elite/mini-boss rare material and omits the separate `heartstone` candidate; six ordinary materials retain recipe consumers.
- Boss consequence candidates (safety +2 for beasts/goblins/undead; prosperity +2 for constructs) remain subject to core bounds and balance measurement.
- New goblin IDs remain `regional_ecology`; only integration can prove that content does not update legacy Chief/crisis. Max owns that proof.
- Boss alternative OR profiles use an existing region and, where relevant, existing region discovery. Exact thresholds and real natural encounter coverage remain unverified; the validator can show controlled witness satisfiability only.

All monster names, drops, spawn thresholds, and mechanics here are candidates. No source packs, runtime hooks, tests or Git changes are included. Slime C remains frozen; its alternative spawn profile is deferred to future E refinement. Validate bosses’ two-mechanic cores, additive variants, OR spawn profiles, regional discovery, and exact loot deduplication in the relevant core/data QA lanes before claiming runtime behavior.

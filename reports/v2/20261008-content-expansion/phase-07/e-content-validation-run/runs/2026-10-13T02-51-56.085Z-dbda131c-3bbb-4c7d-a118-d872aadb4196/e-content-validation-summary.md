# E Six-Family Validation-Only Precheck

- Run: 2026-10-13T02-51-56.085Z-dbda131c-3bbb-4c7d-a118-d872aadb4196
- HEAD before/after: 3d15d2e479662cb74135bba8894290e054adaa6f / 3d15d2e479662cb74135bba8894290e054adaa6f
- Validation-only public API call; no CLI, tests, typecheck, or full check invoked.
- Source provenance stable and matched run snapshots: true
- Registry pack count: 6
- Actual catalog counts: {"families":6,"monsters":66,"lootTables":72,"equipment":25,"materials":48,"crops":0,"cropGoods":0,"recipes":16,"affixes":0}
- Input bytes / SHA-256: 105337 / c5c3e574ca915b37dedd45056ee72344cb27f9919982eaaf655ae7bb24e194f4
- Precheck exit / validation errors / warnings: 1 / 7 / 6
- Quality counts: {"qualifyingNewMonsters":63,"usableNewItems":59,"usableNewMaterials":34}

## Diagnostics

- ERROR unknown-reference [wild_beasts_loot_amberback]: Reference wild_beast_gale_hide does not resolve.
- ERROR unknown-reference [wild_beasts_loot_gorehorn]: Reference wild_beast_antler_pike does not resolve.
- ERROR unknown-reference [frontier_goblins_loot_saboteur]: Reference frontier_goblin_ironaxe does not resolve.
- ERROR orphan-material [wild_beast_apex_core]: Material has no recipe input or legal generator bias consumer.
- ERROR insufficient-identity-axes [wild_beast_amberback]: Monster has 2 effective identity axes (combat, world) or an invalid source graph; at least two effective axes are required.
- ERROR insufficient-identity-axes [wild_beast_gorehorn]: Monster has 2 effective identity axes (combat, world) or an invalid source graph; at least two effective axes are required.
- ERROR insufficient-identity-axes [frontier_goblin_saboteur]: Monster has 2 effective identity axes (combat, world) or an invalid source graph; at least two effective axes are required.
- WARNING duplicate-like-material [fog_undead_shroud, mine_construct_binding, slime_amber_gel]: Material definitions have the same effective economy and generation influence.
- WARNING duplicate-like-material [cave_insect_leg, frontier_goblin_scrap]: Material definitions have the same effective economy and generation influence.
- WARNING duplicate-like-material [cave_insect_sac, mine_construct_resonant_stone]: Material definitions have the same effective economy and generation influence.
- WARNING duplicate-like-material [fog_undead_tendon, mine_construct_joint]: Material definitions have the same effective economy and generation influence.
- WARNING duplicate-like-material [fog_undead_cryptstone, mine_construct_plate]: Material definitions have the same effective economy and generation influence.
- WARNING duplicate-like-material [fog_undead_bellmetal, mine_construct_ironvein]: Material definitions have the same effective economy and generation influence.

Raw process streams, exact input bytes, source snapshot manifest, and full validation result are retained in this run directory.
This precheck is not full CLI or engineering acceptance evidence.

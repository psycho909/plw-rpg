# Phase 7 Loot Distribution Audit

- Source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`; recursive source fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.
- Evidence: `j-formal-20261013/loot-attempt-01/` with raw JSONL, summaries, source snapshots and SHA verification.
- Calls: 100,008 `awardContentLoot` invocations, split evenly across 24 family/rank cohorts (4,167 each).
- Gear awards: 79,170 (79.2% of all calls).
- Determinism: 1,200 mirrored awards (50 from each cohort) matched in seeded output, RNG state, and next item identity.

| Rank | Calls | Gear awards | Gear rate | Mirror checks |
| --- | ---: | ---: | ---: | ---: |
| boss | 25,002 | 25,002 | 100.0% | 300 |
| elite | 25,002 | 18,564 | 74.3% | 300 |
| miniBoss | 25,002 | 21,372 | 85.5% | 300 |
| normal | 25,002 | 14,232 | 56.9% | 300 |

## Material outcomes

| Material ID | Award count in 100,008 controlled calls |
| --- | ---: |
| `cave_insect_plate` | 4,910 |
| `wild_beast_amber_sinew` | 4,781 |
| `mine_construct_corechip` | 4,626 |
| `cave_insect_queen_core` | 4,167 |
| `fog_undead_crypt_heart` | 4,167 |
| `frontier_goblin_warlord_seal` | 4,167 |
| `mine_construct_ancient_core` | 4,167 |
| `slime_heart_gel` | 4,167 |
| `wild_beast_apex_core` | 4,167 |
| `frontier_goblin_forgecore` | 3,090 |
| `cave_insect_leg` | 2,992 |
| `slime_moss_core` | 2,939 |
| `frontier_goblin_ironbits` | 2,779 |
| `slime_amber_gel` | 2,779 |
| `wild_beast_fur` | 2,779 |
| `fog_undead_bellmetal` | 2,778 |
| `fog_undead_bone` | 2,778 |
| `fog_undead_shroud` | 2,778 |
| `frontier_goblin_signalcloth` | 2,778 |
| `mine_construct_shard` | 2,778 |
| `slime_bog_mucus` | 2,778 |
| `slime_glass_shard` | 2,778 |
| `frontier_goblin_wire` | 2,777 |
| `mine_construct_plate` | 2,777 |
| `wild_beast_antler` | 2,777 |
| `fog_undead_cinderbone` | 2,547 |
| `cave_insect_core` | 2,475 |
| `cave_insect_venom_gland` | 963 |
| `slime_spring_ichor` | 961 |
| `cave_insect_sac` | 940 |
| `slime_pool_salt` | 780 |
| `cave_insect_resin` | 731 |
| `cave_insect_chitin` | 695 |
| `fog_undead_cryptstone` | 695 |
| `frontier_goblin_scrap` | 695 |
| `mine_construct_binding` | 695 |
| `mine_construct_joint` | 695 |
| `mine_construct_resonant_stone` | 695 |
| `wild_beast_hide` | 695 |
| `wild_beast_resin` | 695 |
| `fog_undead_tendon` | 694 |
| `fog_undead_wax` | 694 |
| `frontier_goblin_plate` | 694 |
| `frontier_goblin_slingcord` | 694 |
| `mine_construct_ironvein` | 694 |
| `slime_resin` | 694 |
| `wild_beast_horn` | 694 |
| `wild_beast_tendon` | 694 |

The cohort design balances sample counts across six families and four ranks; it does not model natural spawn counts, encounter frequency, party kills, or time to acquire a specific item. The observed rates are engine/weight diagnostics only. Boss-exclusive loot remains bounded to the authored reward path, but natural Boss victory frequency was not established by this lane.

# Phase 7 Crafting and Economy Audit

- Source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`; recursive source fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.
- Evidence: `j-formal-20261013/economy-attempt-02/` with 24 raw recipe transactions, summaries, completion and checksum manifest.
- The controlled public-API lane accepted and completed all 24 new recipes, confirmed exact resource consumption, selected optional bias material where offered, and inspected the generated output and sell price.

| Recipe | Craft fee | Output sale | Fee minus output sale | Required ecology materials |
| --- | ---: | ---: | ---: | --- |
| `slime_resin_guard_recipe` | 11 | 18 | -7 | slime_resin×4 |
| `slime_glass_pike_recipe` | 16 | 24 | -8 | slime_glass_shard×3 |
| `slime_moss_coat_recipe` | 20 | 27 | -7 | slime_moss_core×3, slime_bog_mucus×2 |
| `slime_spring_blade_recipe` | 26 | 28 | -2 | slime_spring_ichor×3 |
| `cave_insect_chitin_spear_recipe` | 14 | 28 | -14 | cave_insect_chitin×3 |
| `cave_insect_leg_blade_recipe` | 17 | 34 | -17 | cave_insect_leg×3, cave_insect_venom_gland×1 |
| `cave_insect_plate_vest_recipe` | 19 | 31 | -12 | cave_insect_plate×3, cave_insect_sac×2 |
| `cave_insect_resin_coat_recipe` | 18 | 29 | -11 | cave_insect_resin×3, cave_insect_chitin×2 |
| `wild_beast_tendon_spear_recipe` | 18 | 28 | -10 | wild_beast_tendon×3, wild_beast_antler×1 |
| `wild_beast_horn_knife_recipe` | 15 | 24 | -9 | wild_beast_horn×2, wild_beast_antler×1 |
| `wild_beast_hide_coat_recipe` | 16 | 22 | -6 | wild_beast_hide×4, wild_beast_fur×2 |
| `wild_beast_amber_cuirass_recipe` | 22 | 34 | -12 | wild_beast_hide×3, wild_beast_antler×2 |
| `frontier_goblin_scrap_spear_recipe` | 18 | 29 | -11 | frontier_goblin_scrap×4 |
| `frontier_goblin_plate_vest_recipe` | 18 | 25 | -7 | frontier_goblin_plate×3, frontier_goblin_ironbits×2 |
| `frontier_goblin_wire_knife_recipe` | 18 | 25 | -7 | frontier_goblin_wire×2, frontier_goblin_slingcord×2 |
| `frontier_goblin_signal_coat_recipe` | 20 | 27 | -7 | frontier_goblin_signalcloth×2, frontier_goblin_plate×1 |
| `fog_undead_cryptblade_recipe` | 22 | 34 | -12 | fog_undead_bone×3, fog_undead_tendon×1 |
| `fog_undead_guardmail_recipe` | 24 | 36 | -12 | fog_undead_cryptstone×3, fog_undead_shroud×2 |
| `fog_undead_boneknife_recipe` | 20 | 29 | -9 | fog_undead_wax×2, fog_undead_bone×2 |
| `fog_undead_shroudcoat_recipe` | 21 | 31 | -10 | fog_undead_shroud×3, fog_undead_bellmetal×1 |
| `mine_construct_shardpike_recipe` | 22 | 35 | -13 | mine_construct_shard×3, mine_construct_joint×1 |
| `mine_construct_plateguard_recipe` | 24 | 37 | -13 | mine_construct_plate×3, mine_construct_binding×2 |
| `mine_construct_jointblade_recipe` | 21 | 33 | -12 | mine_construct_resonant_stone×2, mine_construct_ironvein×1 |
| `mine_construct_bindingmail_recipe` | 22 | 32 | -10 | mine_construct_ironvein×2, mine_construct_binding×2 |

All 24 fees are below the output's item sale value. This comparison omits the value and availability of required inputs, so it is not net profit. The run did not measure merchant purchase prices, merchant stock, restock rates, or natural acquisition rates. Therefore it neither demonstrates nor rules out a buy/craft/sell arbitrage loop. Existing evidence that all raw-material purchase-cycle margins are negative applies only to the modeled assumptions; do not label an economy exploit from the fee-versus-output column.

**Balance finding:** opportunity-cost and stock-volume testing remains limited. The 24 recipes have working consumption and output paths; future balance changes should be based on a separate supply-volume/merchant-cycle experiment. No prices were changed during QA.

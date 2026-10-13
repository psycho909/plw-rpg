# Phase 7 Useful Item Catalog

- Source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Recursive `src/` fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`
- Combined six-family pack SHA-256: `7237f2117c7ccd4e9bcde075559166c2f457b588fcf7313c31ce989ad1980337`
- Qualification: 48 functional equipment bases + 48 ecology/crafting materials + 11 crop harvest-good IDs = 107 unique new item IDs. Crop definitions are separate records and are not counted as goods.
- Runtime coverage: recipe integration exercises the 24 recipes from plan through generated/equipped item, save/reload and sale; crop integration exercises all 11 goods through crop planting/harvest, food conversion, crisis supply, and material sale.
- Validator boundary: the standalone six-family authoring pack has 96 equipment/material IDs; the 11 crop goods are qualified separately by source-integrated runtime tests.

## Equipment bases

| ID | 名稱 | 部位 | 攻擊 | 防禦 | 可用詞綴 |
| --- | --- | --- | ---: | ---: | --- |
| `slime_resin_guard` | 樹脂護衣 | armor | 0 | 4 | sturdy, blocking |
| `slime_glass_pike` | 晶刺長槍 | weapon | 6 | 0 | piercing, striking |
| `slime_moss_coat` | 苔池外套 | armor | 0 | 5 | blocking, warding |
| `slime_spring_blade` | 泉躍短刃 | weapon | 7 | 0 | keen, bleeding |
| `slime_amber_mace` | 琥珀鎚 | weapon | 8 | 0 | striking, bleeding |
| `slime_bog_mail` | 沼泥鎖衣 | armor | 0 | 6 | sturdy, warding |
| `slime_matriarch_cuirass` | 母黏怪胸甲 | armor | 0 | 7 | blocking, sturdy |
| `slime_heartstaff` | 濕地核心杖 | weapon | 9 | 0 | keen, piercing |
| `cave_insect_chitin_spear` | 甲質穿刺矛 | weapon | 7 | 0 | piercing, striking |
| `cave_insect_queen_carapace` | 蛛蟲后甲衣 | armor | 0 | 9 | sturdy, blocking |
| `cave_insect_leg_blade` | 刃節獵刀 | weapon | 8 | 0 | keen, bleeding |
| `cave_insect_gland_pike` | 腺囊穿刺槍 | weapon | 8 | 0 | piercing, bleeding |
| `cave_insect_core_mace` | 礦核重槌 | weapon | 10 | 0 | striking, piercing |
| `cave_insect_plate_vest` | 厚甲背心 | armor | 0 | 6 | sturdy, blocking |
| `cave_insect_resin_coat` | 樹脂護衣 | armor | 0 | 5 | sturdy, blocking |
| `cave_insect_warden_mail` | 守脈蛛甲 | armor | 0 | 8 | sturdy, warding |
| `wild_beast_tendon_spear` | 韌筋長槍 | weapon | 7 | 0 | piercing, bleeding |
| `wild_beast_horn_knife` | 石角獵刀 | weapon | 6 | 0 | keen, striking |
| `wild_beast_hide_coat` | 野獸皮衣 | armor | 0 | 4 | warding, blocking |
| `wild_beast_resin_axe` | 琥珀樹脂斧 | weapon | 9 | 0 | striking, keen |
| `wild_beast_antler_pike` | 澤角鹿角槍 | weapon | 6 | 0 | piercing, keen |
| `wild_beast_amber_cuirass` | 琥珀筋甲 | armor | 0 | 6 | blocking, warding |
| `wild_beast_gale_hide` | 疾風硬皮衣 | armor | 0 | 5 | blocking |
| `wild_beast_apex_maul` | 王獸重槌 | weapon | 11 | 0 | striking, keen |
| `frontier_goblin_scrap_spear` | 廢鐵長槍 | weapon | 7 | 0 | piercing, keen |
| `frontier_goblin_wire_knife` | 鋼線獵刀 | weapon | 6 | 0 | keen, bleeding |
| `frontier_goblin_plate_vest` | 拼裝板甲背心 | armor | 0 | 6 | sturdy |
| `frontier_goblin_signal_coat` | 信號旗布外衣 | armor | 0 | 4 | blocking |
| `frontier_goblin_ironaxe` | 礦料戰斧 | weapon | 8 | 0 | piercing, bleeding |
| `frontier_goblin_duelist_pike` | 決鬥長刺 | weapon | 8 | 0 | piercing, keen |
| `frontier_goblin_duelist_vest` | 決鬥者襯甲 | armor | 0 | 4 | sturdy, warding |
| `frontier_goblin_warlord_cleaver` | 戰帥斬刃 | weapon | 11 | 0 | striking, piercing |
| `fog_undead_cryptblade` | 墓紋短刃 | weapon | 8 | 0 | keen, piercing |
| `fog_undead_boneknife` | 骨燈匕首 | weapon | 6 | 0 | keen, bleeding |
| `fog_undead_bellstaff` | 暮鐘長杖 | weapon | 7 | 0 | piercing, keen |
| `fog_undead_cinderpike` | 灰燼骨槍 | weapon | 6 | 0 | piercing, striking |
| `fog_undead_wightcleaver` | 怨靈斬骨刀 | weapon | 10 | 0 | striking, keen |
| `fog_undead_guardmail` | 墓衛鎖甲 | armor | 0 | 7 | blocking, warding |
| `fog_undead_shroudcoat` | 守墓裹衣 | armor | 0 | 5 | warding |
| `fog_undead_cryptlord_blade` | 墓主專屬刃 | weapon | 10 | 0 | keen, piercing |
| `mine_construct_shardpike` | 碎晶穿脈槍 | weapon | 8 | 0 | piercing, striking |
| `mine_construct_jointblade` | 接節刃 | weapon | 7 | 0 | keen, bleeding |
| `mine_construct_ramhammer` | 碎礦衝槌 | weapon | 10 | 0 | striking, bleeding |
| `mine_construct_veinaxe` | 鐵脈戰斧 | weapon | 8 | 0 | keen, piercing |
| `mine_construct_architect_glaive` | 建造構長戟 | weapon | 9 | 0 | piercing, keen |
| `mine_construct_plateguard` | 石板護甲 | armor | 0 | 7 | sturdy, warding |
| `mine_construct_bindingmail` | 岩構束甲 | armor | 0 | 5 | sturdy |
| `mine_construct_heartbreaker` | 遠古破脈槌 | weapon | 10 | 0 | striking, piercing |

## Ecology and crafting materials

| ID | 名稱 | 售價 | 鍛造偏向 |
| --- | --- | ---: | --- |
| `slime_resin` | 黏怪樹脂 | 3 | sturdy:2 |
| `slime_amber_gel` | 琥珀凝膠 | 7 | blocking:2 |
| `slime_bog_mucus` | 沼泥黏液 | 4 | warding:1 |
| `slime_moss_core` | 苔衣核心 | 8 | blocking:3 |
| `slime_glass_shard` | 晶殼碎片 | 9 | piercing:3, keen:1 |
| `slime_spring_ichor` | 泉躍精華 | 8 | keen:2, bleeding:1 |
| `slime_heart_gel` | 濕地核心膠 | 25 | keen:4 |
| `slime_pool_salt` | 苔池鹽晶 | 6 | warding:2 |
| `cave_insect_chitin` | 洞蟲甲質 | 7 | piercing:3 |
| `cave_insect_leg` | 洞蟲肢節 | 4 | striking:1 |
| `cave_insect_resin` | 洞蟲樹脂 | 5 | piercing:1 |
| `cave_insect_sac` | 洞蟲礦囊 | 6 | striking:2 |
| `cave_insect_plate` | 洞蟲厚甲 | 8 | piercing:2 |
| `cave_insect_venom_gland` | 洞蟲腺囊 | 9 | striking:2 |
| `cave_insect_core` | 洞蟲核心 | 10 | piercing:2 |
| `cave_insect_queen_core` | 蛛蟲后核心 | 32 | piercing:3, blocking:2 |
| `wild_beast_hide` | 野獸皮 | 5 | warding:1 |
| `wild_beast_horn` | 石角 | 6 | blocking:2 |
| `wild_beast_tendon` | 赤尾筋 | 6 | piercing:2, bleeding:1 |
| `wild_beast_fur` | 蕨背毛 | 4 | warding:1, blocking:1 |
| `wild_beast_antler` | 澤角鹿角 | 7 | striking:1, blocking:1 |
| `wild_beast_resin` | 琥珀樹脂 | 9 | keen:2, bleeding:1 |
| `wild_beast_amber_sinew` | 琥珀韌筋 | 12 | keen:2, piercing:1 |
| `wild_beast_apex_core` | 王獸核心骨 | 25 | striking:2, keen:2 |
| `frontier_goblin_scrap` | 哥布林廢鐵 | 4 | striking:1 |
| `frontier_goblin_slingcord` | 投石繩索 | 5 | keen:1, bleeding:1 |
| `frontier_goblin_plate` | 拼裝盾片 | 6 | sturdy:1, blocking:2 |
| `frontier_goblin_signalcloth` | 信號旗布 | 8 | warding:2, blocking:1 |
| `frontier_goblin_ironbits` | 礦料鐵屑 | 5 | striking:1, sturdy:1 |
| `frontier_goblin_wire` | 捕網鋼線 | 6 | piercing:1, keen:1 |
| `frontier_goblin_forgecore` | 鍛爐芯片 | 13 | keen:2, piercing:2 |
| `frontier_goblin_warlord_seal` | 戰帥印記 | 25 | striking:2, piercing:2 |
| `fog_undead_bone` | 霧谷骨片 | 6 | piercing:2 |
| `fog_undead_wax` | 燈盞蠟 | 5 | keen:2 |
| `fog_undead_tendon` | 墓徑筋腱 | 7 | piercing:1 |
| `fog_undead_cryptstone` | 墓室石片 | 8 | blocking:2 |
| `fog_undead_shroud` | 守墓裹布 | 7 | warding:2 |
| `fog_undead_bellmetal` | 暮鐘合金 | 10 | warding:2 |
| `fog_undead_cinderbone` | 灰燼骨核 | 14 | keen:3 |
| `fog_undead_crypt_heart` | 墓主心核 | 20 | keen:4 |
| `mine_construct_shard` | 岩構碎晶 | 7 | piercing:2 |
| `mine_construct_plate` | 岩構石板 | 8 | sturdy:2 |
| `mine_construct_resonant_stone` | 脈石節晶 | 6 | striking:2 |
| `mine_construct_joint` | 岩構接節 | 7 | piercing:1 |
| `mine_construct_binding` | 岩構束材 | 7 | sturdy:2 |
| `mine_construct_ironvein` | 鐵脈礦節 | 10 | sturdy:2 |
| `mine_construct_corechip` | 岩構核片 | 15 | striking:3 |
| `mine_construct_ancient_core` | 遠古岩構核心 | 22 | striking:4 |

## Crop harvest goods (11 new; wheat remains the legacy crop)

| Crop ID | Crop 名稱 | Harvest-good ID | Good 名稱 |
| --- | --- | --- | --- |
| `spring_pea` | 豌豆 | `spring_pea_good` | 豌豆莢 |
| `field_turnip` | 田蕪菁 | `field_turnip_good` | 蕪菁 |
| `summer_barley` | 夏大麥 | `summer_barley_good` | 大麥束 |
| `sun_pepper` | 日照椒 | `sun_pepper_good` | 紅椒 |
| `forest_bean` | 林豆 | `forest_bean_good` | 林豆莢 |
| `autumn_pumpkin` | 秋南瓜 | `autumn_pumpkin_good` | 南瓜 |
| `orchard_apple` | 果園蘋果 | `orchard_apple_good` | 蘋果 |
| `winter_cabbage` | 冬甘藍 | `winter_cabbage_good` | 甘藍 |
| `frost_root` | 霜根 | `frost_root_good` | 霜根塊 |
| `marsh_rice` | 濕地稻 | `marsh_rice_good` | 稻穗 |
| `cave_mushroom` | 洞菇 | `cave_mushroom_good` | 洞菇 |

The goods remain one shared runtime material identity per crop; each can be consumed for its authored food value and sold through the existing trade path.

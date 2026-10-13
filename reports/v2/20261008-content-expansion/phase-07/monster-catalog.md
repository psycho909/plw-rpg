# Phase 7 Monster Catalog

- Source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Recursive `src/` fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`
- Combined family pack SHA-256: `7237f2117c7ccd4e9bcde075559166c2f457b588fcf7313c31ce989ad1980337`
- Counts: 6 families / 66 monsters (36 normal, 12 elite, 12 mini-boss, 6 boss).
- Reachability evidence: the canonical runtime witness suite validated all 66 definitions; this is controlled predicate reachability, not an encounter-rate estimate.

## 濕地黏怪 (`slime`)

| ID | 階級 | 等級 | 角色 | 戰術提示 | 地區 |
| --- | --- | ---: | --- | --- | --- |
| `slime_slick` 滑液黏怪 | 一般 | 1 | fast | rush: 牠的身體向後收縮，準備彈射。 | farmland |
| `slime_amber` 琥珀黏怪 | 一般 | 2 | bruiser | guard: 琥珀外殼亮起，牠正要硬化防禦。 | farmland |
| `slime_bog` 沼泥黏怪 | 一般 | 3 | bruiser | heavyStrike: 泥水翻湧，牠正在蓄力重擊。 | forest |
| `slime_moss` 苔衣黏怪 | 一般 | 3 | controller | rally: 苔衣向外舒展，牠正在蓄勢反擊。 | forest |
| `slime_glass` 晶殼黏怪 | 一般 | 4 | fast | chargedAttack: 晶片聚光，牠正在準備碎晶衝擊。 | farmland |
| `slime_spring` 泉躍黏怪 | 一般 | 4 | fast | rush: 牠連跳兩次，第三次將猛然撲近。 | forest |
| `slime_bulwark` 壁壘黏怪 | 精英 | 5 | bruiser | guard: 牠蜷起身體，厚殼即將鎖緊。 | farmland |
| `slime_cinder` 燼晶黏怪 | 精英 | 6 | fast | chargedAttack: 晶殼中央轉為赤亮，熱脈衝即將爆發。 | forest |
| `slime_matriarch` 苔池母黏怪 | 小頭目 | 6 | controller | rally: 池面連續震動，牠正集結力量反擊。 | forest |
| `slime_tidecaller` 潮鳴黏怪 | 小頭目 | 7 | bruiser | heavyStrike: 水位急升，牠正準備掀起重浪。 | forest |
| `slime_heart` 濕地黏核 | Boss | 8 | controller | chargedAttack: 核心脈動加快，牠將發動蓄力衝擊並回復少量生命。 | forest |

## 洞穴蛛蟲 (`cave_insects`)

| ID | 階級 | 等級 | 角色 | 戰術提示 | 地區 |
| --- | --- | ---: | --- | --- | --- |
| `cave_insect_digger` 掘脈蛛蟲 | 一般 | 3 | bruiser | guard: 掘脈蛛蟲收起肢節，硬殼即將護住身體。 | mine |
| `cave_insect_skitter` 巡隧蛛蟲 | 一般 | 3 | fast | rush: 巡隧蛛蟲壓低身體，準備沿隧道撲近。 | mine |
| `cave_insect_spitter` 壁棲蛛蟲 | 一般 | 4 | controller | chargedAttack: 壁棲蛛蟲腹部鼓起，樹脂將要噴出。 | mine |
| `cave_insect_carrier` 載礦蛛蟲 | 一般 | 4 | controller | rally: 載礦蛛蟲抬起前肢鼓動身軀，正準備蓄勢反擊。 | mine |
| `cave_insect_shellback` 厚甲蛛蟲 | 一般 | 4 | bruiser | guard: 厚甲蛛蟲把身體縮入甲殼，準備承受攻擊。 | mine |
| `cave_insect_lurker` 伏擊蛛蟲 | 一般 | 5 | fast | heavyStrike: 伏擊蛛蟲伏低不動，正在蓄力重擊。 | mine |
| `cave_insect_razor` 刃肢蛛蟲 | 精英 | 6 | fast | rush: 刃肢蛛蟲連續踏地後收勢，下一刻將衝刺。 | mine |
| `cave_insect_warden` 守脈蛛蟲 | 精英 | 7 | bruiser | guard: 守脈蛛蟲架起外殼，準備擋下攻擊。 | mine |
| `cave_insect_broodguard` 護巢蛛蟲 | 小頭目 | 7 | bruiser | guard: 護巢蛛蟲收攏肢節，硬殼即將護住身體。 | mine |
| `cave_insect_tunnelstalker` 隧道獵蛛 | 小頭目 | 7 | fast | rush: 隧道獵蛛壓低身體，正準備沿隧道衝刺。 | mine |
| `cave_insect_queen` 洞穴蛛蟲后 | Boss | 9 | bruiser | guard: 蛛蟲后收起肢節，厚甲即將護住身體。 | mine |

## 林地野獸 (`wild_beasts`)

| ID | 階級 | 等級 | 角色 | 戰術提示 | 地區 |
| --- | --- | ---: | --- | --- | --- |
| `wild_beast_brush_hare` 灌叢野兔 | 一般 | 1 | fast | rush: 野兔壓低身體，準備短促躍撲。 | farmland |
| `wild_beast_stonehorn` 石角獸 | 一般 | 2 | bruiser | guard: 石角獸低下角尖，正架起防禦。 | forest |
| `wild_beast_redtail` 赤尾獸 | 一般 | 3 | fast | heavyStrike: 赤尾獸收緊後腿，準備重重躍擊。 | forest |
| `wild_beast_fernback` 蕨背獸 | 一般 | 3 | controller | rally: 蕨背獸拱起身軀，正在蓄勢反擊。 | forest |
| `wild_beast_marshstag` 澤角鹿 | 一般 | 4 | bruiser | guard: 澤角鹿放低鹿角，準備擋住正面攻勢。 | forest |
| `wild_beast_amberfox` 琥珀狐 | 一般 | 4 | fast | chargedAttack: 琥珀狐背毛亮起，正在準備蓄力突擊。 | farmland,forest |
| `wild_beast_bristleback` 刺鬃野豬 | 精英 | 5 | bruiser | heavyStrike: 刺鬃野豬踏地蓄勢，肩撞即將到來。 | forest |
| `wild_beast_galehorn` 疾風角獸 | 精英 | 6 | fast | rush: 疾風角獸低頭蓄勢，正要沿直線衝鋒。 | forest |
| `wild_beast_old_matriarch` 林地母獸 | 小頭目 | 6 | controller | rally: 母獸昂首聚力，沉重的橫掃即將落下。 | forest |
| `wild_beast_ironhide` 鐵甲野獸 | 小頭目 | 7 | bruiser | guard: 野獸厚皮繃緊，正架起堅實防禦。 | farmland |
| `wild_beast_apex` 林地王獸 | Boss | 9 | bruiser | rush: 王獸壓低身軀，準備直線衝鋒。 | forest |

## 邊境哥布林 (`frontier_goblins`)

| ID | 階級 | 等級 | 角色 | 戰術提示 | 地區 |
| --- | --- | ---: | --- | --- | --- |
| `frontier_goblin_scout` 邊境哥布林斥候 | 一般 | 3 | fast | rush: 斥候壓低肩膀，準備迅速突擊。 | forest |
| `frontier_goblin_slinger` 邊境哥布林投石手 | 一般 | 4 | fast | chargedAttack: 投石手握緊石彈蓄力，準備一次重擊。 | forest |
| `frontier_goblin_tinker` 邊境哥布林工匠 | 一般 | 4 | bruiser | guard: 工匠把拼裝盾架在身前，準備格擋。 | mine |
| `frontier_goblin_lookout` 邊境哥布林瞭望手 | 一般 | 4 | controller | rally: 瞭望手高舉旗布，正在鼓舞自身氣勢。 | forest |
| `frontier_goblin_hauler` 邊境哥布林搬運工 | 一般 | 5 | bruiser | heavyStrike: 搬運工穩住背架，準備沉重揮擊。 | mine |
| `frontier_goblin_trapper` 邊境哥布林捕網手 | 一般 | 5 | controller | guard: 捕網手收緊盾臂，準備架勢防守。 | forest,mine |
| `frontier_goblin_breaker` 邊境哥布林破甲手 | 精英 | 6 | bruiser | heavyStrike: 破甲手高舉重鎚，蓄力準備猛擊。 | mine |
| `frontier_goblin_duelist` 邊境哥布林決鬥者 | 精英 | 6 | fast | rush: 決鬥者收回武器並踏定步伐，準備突刺。 | forest |
| `frontier_goblin_standardbearer` 邊境哥布林旗手 | 小頭目 | 8 | controller | rally: 旗手舉起旗布，正鼓起自身氣勢。 | forest |
| `frontier_goblin_saboteur` 邊境哥布林破壞手 | 小頭目 | 8 | bruiser | chargedAttack: 破壞手高舉鐵錘蓄力，準備沉重一擊。 | mine |
| `frontier_goblin_warlord` 邊境哥布林戰帥 | Boss | 9 | bruiser | rally: 戰帥挺起身軀，正在鼓起自身氣勢。 | forest,mine |

## 霧谷亡骨 (`fog_undead`)

| ID | 階級 | 等級 | 角色 | 戰術提示 | 地區 |
| --- | --- | ---: | --- | --- | --- |
| `fog_undead_bonewalker` 骨架行者 | 一般 | 4 | bruiser | guard: 骨架行者雙臂交疊，準備架住攻勢。 | forest |
| `fog_undead_lantern_wisp` 提燈幽影 | 一般 | 5 | controller | chargedAttack: 提燈幽影的燈芯逐漸明亮，正蓄力準備衝擊。 | unknown |
| `fog_undead_gravehound` 墓徑獵犬 | 一般 | 5 | fast | rush: 墓徑獵犬壓低身體，沿著林路準備撲近。 | forest |
| `fog_undead_crypt_guard` 墓室石衛 | 一般 | 6 | bruiser | heavyStrike: 墓室石衛抬起沉重手臂，正準備向下重擊。 | unknown |
| `fog_undead_mourner` 守墓哀者 | 一般 | 5 | controller | rally: 守墓哀者挺直身軀凝聚力量，準備反擊。 | forest |
| `fog_undead_bellkeeper` 暮鐘守者 | 一般 | 6 | bruiser | guard: 暮鐘守者舉起鐘身護住胸前，準備擋下攻擊。 | unknown |
| `fog_undead_wight` 灰燼怨靈 | 精英 | 7 | controller | chargedAttack: 灰燼怨靈周身火光收束，蓄力衝擊即將發出。 | forest,unknown |
| `fog_undead_blackguard` 黑甲墓衛 | 精英 | 7 | bruiser | guard: 黑甲墓衛將甲片合攏，準備穩住防線。 | unknown |
| `fog_undead_crypt_knight` 墓紋騎士 | 小頭目 | 8 | bruiser | heavyStrike: 墓紋騎士舉起長刃，正蓄勢向下重擊。 | unknown |
| `fog_undead_hollow_bell` 空鐘守望者 | 小頭目 | 8 | controller | rally: 空鐘守望者將鐘身高舉，正凝聚力量反擊。 | forest,unknown |
| `fog_undead_cryptlord` 霧谷墓主 | Boss | 9 | controller | chargedAttack: 墓主周身氣息收束，蓄力衝擊即將發出，並會稍作恢復。 | unknown |

## 礦道岩構 (`mine_constructs`)

| ID | 階級 | 等級 | 角色 | 戰術提示 | 地區 |
| --- | --- | ---: | --- | --- | --- |
| `mine_construct_shardling` 碎晶岩靈 | 一般 | 4 | fast | rush: 碎晶岩靈低伏蓄勢，準備短距離撞來。 | mine |
| `mine_construct_sentinel` 礦道石衛 | 一般 | 4 | bruiser | guard: 礦道石衛將石板併攏，準備擋住攻擊。 | mine |
| `mine_construct_pylon` 脈石柱構 | 一般 | 5 | controller | chargedAttack: 脈石柱構的石節逐段繃緊，蓄力震擊即將發出。 | mine |
| `mine_construct_crawler` 礦巷爬岩 | 一般 | 5 | bruiser | heavyStrike: 礦巷爬岩抬起前臂，正在蓄力向下重砸。 | mine |
| `mine_construct_mason` 礦脈砌石者 | 一般 | 5 | controller | rally: 礦脈砌石者重新排好石塊，正要蓄勢反擊。 | mine |
| `mine_construct_veinwatcher` 鐵脈守望構 | 一般 | 6 | bruiser | guard: 鐵脈守望構側身架起石板，準備守住正面。 | mine,unknown |
| `mine_construct_ram` 碎礦衝槌構 | 精英 | 7 | fast | rush: 碎礦衝槌構連踏地面後收勢，下一刻將直線衝撞。 | mine |
| `mine_construct_warder` 礦脈壁壘構 | 精英 | 7 | bruiser | guard: 礦脈壁壘構將石殼緊密扣合，準備承受攻擊。 | mine |
| `mine_construct_architect` 礦道建造構 | 小頭目 | 8 | controller | rally: 建造構重新扣合石節，正蓄勢準備重擊。 | unknown |
| `mine_construct_bastion` 礦道壁壘構 | 小頭目 | 8 | bruiser | guard: 壁壘構將石板層層扣緊，準備擋下攻勢。 | mine |
| `mine_construct_heart` 遠古岩構核心 | Boss | 9 | bruiser | guard: 核心石板逐層合攏，正架起防勢。 | unknown |

Ranks use data-authored identities/mechanics and do not count variants, levels, or procedural rolls as separate monsters.

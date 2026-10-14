# Phase8-B 裝備與 Build 分析

**結論：沒有一個低成本裝備來源或 build style 在所有 rank、band、Boss ID 與取得條件中全面支配其他方案。** controlled matrix 的合法 source/style cells 不等量；下表只描述本次實際執行的 cell 樣本，不是同一隻怪、同一裝備預算、同一來源的完全配對試驗。

## 來源 × band 完整度與結果

每列是該 band/source 所有 rank、target、style 的可用樣本總和。`PASS/INCOMPLETE/NA` 為 85 個 cells 狀態；樣本數 N 包含 INCOMPLETE cell 已保留的部分 combat rows。勝、退、死是實際 combat rows。這是可用性與結果的概覽，不能直接當來源因果效應。

| Band | Source | Cells PASS / INCOMPLETE / NA | N：勝／退／死 |
| --- | --- | --- | --- |
| Early | Legacy | 10 / 0 / 75 | 3,000：3,000／0／0 |
| Early | Adventure Loot | 10 / 5 / 70 | 3,500：3,496／0／4 |
| Early | Crafted | 25 / 0 / 60 | 7,500：7,474／0／26 |
| Early | Boss Gear | 2 / 7 / 76 | 1,500：1,500／0／0 |
| Early | Masterpiece | 10 / 10 / 65 | 5,000：5,000／0／0 |
| Mid | Legacy | 28 / 0 / 57 | 8,400：6,600／0／1,800 |
| Mid | Adventure Loot | 38 / 18 / 29 | 14,300：11,374／0／2,926 |
| Mid | Crafted | 70 / 0 / 15 | 21,000：16,504／0／4,496 |
| Mid | Boss Gear | 25 / 12 / 48 | 9,200：7,319／0／1,881 |
| Mid | Masterpiece | 28 / 28 / 29 | 14,000：11,006／0／2,994 |
| Late | Legacy | 26 / 0 / 59 | 7,800：7,428／0／372 |
| Late | Adventure Loot | 26 / 13 / 46 | 10,400：9,884／0／516 |
| Late | Crafted | 65 / 0 / 20 | 19,500：18,727／0／773 |
| Late | Boss Gear | 50 / 1 / 34 | 15,100：15,100／0／0 |
| Late | Masterpiece | 26 / 26 / 33 | 13,000：12,783／0／217 |

Boss-only 分母與死亡集中在個別 Boss ID，不可用全來源總勝率掩蓋差異：Mid Boss Gear 為 3,319/5,200 勝；Late Boss Gear 為 5,500/5,500 勝；Mid Legacy 為 1,800/3,600 勝。詳見 [Boss progression](boss-progression.md) per-ID/band 表。

## Build style：rank × band 勝／總樣本

Style 對應現有 affix，不代表引入新 mechanic：Damage=`striking`；Crit-Speed=`keen`（遊戲沒有獨立 gear speed stat，故另看 turns）；Bleed=`bleeding`；Penetration=`piercing`；Defense=`sturdy`／`blocking`／`warding`。下表合併該格所有可用來源的實際樣本，分母不同且 target mix 不同；用來定位取捨，不宣稱配對勝率。

| Rank / band | Damage | Crit-Speed | Bleed | Penetration | Defense |
| --- | ---: | ---: | ---: | ---: | ---: |
| Normal / Early | 900/900 (100%) | 600/600 (100%) | 900/900 (100%) | 700/700 (100%) | 600/600 (100%) |
| Normal / Mid | 2,200/2,200 (100%) | 1,600/1,600 (100%) | 1,800/1,800 (100%) | 1,800/1,800 (100%) | 1,800/1,800 (100%) |
| Normal / Late | 2,400/2,400 (100%) | 2,000/2,000 (100%) | 1,000/1,000 (100%) | 2,400/2,400 (100%) | 2,400/2,400 (100%) |
| Elite / Early | 900/900 (100%) | 500/500 (100%) | 1,000/1,000 (100%) | 800/800 (100%) | 700/700 (100%) |
| Elite / Mid | 3,300/3,300 (100%) | 2,600/2,600 (100%) | 2,500/2,500 (100%) | 2,900/2,900 (100%) | 2,500/2,500 (100%) |
| Elite / Late | 3,600/3,600 (100%) | 3,000/3,000 (100%) | 1,500/1,500 (100%) | 3,600/3,600 (100%) | 3,600/3,600 (100%) |
| MiniBoss / Early | 900/900 (100%) | 800/800 (100%) | 500/500 (100%) | 800/800 (100%) | 900/900 (100%) |
| MiniBoss / Mid | 3,100/3,100 (100%) | 2,900/2,900 (100%) | 2,600/2,600 (100%) | 3,100/3,100 (100%) | 2,200/2,200 (100%) |
| MiniBoss / Late | 3,600/3,600 (100%) | 3,000/3,000 (100%) | 1,500/1,500 (100%) | 3,600/3,600 (100%) | 3,600/3,600 (100%) |
| Boss / Early | 2,400/2,400 (100%) | 1,900/1,900 (100%) | 1,400/1,400 (100%) | 1,700/1,700 (100%) | 1,570/1,600 (98.1%) |
| Boss / Mid | 3,602/6,600 (54.6%) | 3,904/6,600 (59.2%) | 2,934/6,100 (48.1%) | 3,063/6,200 (49.4%) | 2,400/4,500 (53.3%) |
| Boss / Late | 5,783/6,000 (96.4%) | 4,733/5,000 (94.7%) | 2,393/2,500 (95.7%) | 5,652/5,800 (97.4%) | 4,561/5,700 (80.0%) |

Boss 以外的各個合法且已執行樣式格在本組樣本中全勝，但 turns、damage、potion 仍有差異：Early MiniBoss Defense 的 cell turns P50 約 11，其他 style 約 5–5.6；Mid MiniBoss Defense turns P50 約 10.8，其餘約 6.5–6.9；Late Defense 雖然降低部分 gross damage，turns P50 約 5，其他約 3.6–4。Boss 也沒有固定單一 style 全面最好：Mid Crit-Speed 的樣本勝率最高，Late Penetration 最高而 Defense 明顯較低；damage、potion、回合數與材料／gold prep 仍是不同目標。

## 裝備來源的角色、成本與限制

| Source | 玩法角色與本次觀察 | 成本／可用性注意 |
| --- | --- | --- |
| Legacy | 低複雜度基準；早期多個 rank 的合法 cell 表現穩定，Mid Boss 只有 1,800/3,600 勝，不能支配中期 Boss。 | 新存檔沒有免費 sword/armor；需記錄實際購買。典型 witness 以 56 gold 買 sword，約 5 game minutes、0 stamina；是示例路徑，不是所有 item 定價。 |
| Adventure Loot | 真實合法遭遇與實際 ItemInstance 掉落，能提供低技能取得路徑；但 affix/style 受掉落限制。 | 36 個 INCOMPLETE cells 到 18 個 acquisition candidates 仍未取得符合 style 的裝備；Early 5、Mid 18、Late 13。Early 其中 1 格是最後來源候選沒有合法 spawn witness，其餘缺 matching style drop；Mid 有 7 格僅 100/300、11 格 200/300；Late 13 格皆 200/300。這些是右設限觀察，不是掉率估計。 |
| Crafted | 可由 recipe／材料／站點／Smithing 合法供應，完成格數最高之一：Early 25、Mid 70、Late 65。Boss 仍有明顯 Mid ID 差異。 | Witness 可包含 gathering、crafting、rest、時間與體力；例如 starterSpear 合法路徑記錄 7,245 分鐘、40 stamina、淨 gold delta +16。這是該 witness 的全路徑紀錄，不能當平均 craft 成本或將時間折金。 |
| Boss Gear | 由不同 Boss 的公開勝利實際取得 gear；有最清楚的 progression／獎勵聯結，適合評估中後期 build。 | 首殺排除目標 Boss 自己的掉落，避免循環裝備。Early 只有 2 個 PASS cells，Mid 25，Late 50；Late 全部 15,100 個樣本為勝，不能外推至 Early／Mid，也不能作 first-kill 取得來源。 |
| Masterpiece | 高技能工匠的稀有成果，不是一般低成本基準。已完成與未完成格都保留原始 witness。 | 64 格在最多 16 次合法 ironShortSword craft 後仍未抽到匹配 masterpiece：Early 10、Mid 28、Late 26；每格保留 200/300 rows。來源要求 Smithing 6，較高配方還可能更高。此結果不等於「機率為 0」，也無足夠完整試次估 rate。 |

上面獨立的 acquisition witness 可記錄 gold delta、game time、stamina、材料 delta、attempts、item rarity／affixes。Boss progression per-ID 表中的 prep witness envelope 是同一類欄位的 raw 範圍；Δgold 是取得起訖淨變化，負數代表淨支出，正數可能包含路徑收益，材料和時間不折為影子價格。不要把不同 source 的成本壓成一個「低成本 build」分數。

## Raw evidence、版本與失敗歷史

最新 attempts 完整列於 [boss-progression.md](boss-progression.md) 的 attempts 表；每個 attempt 保留 manifest、cell-results、acquisition witness、combat samples 與 completion。normal-route v3/measured 記錄 HEAD `ea75684e1533b9d55a992495c256acfb58c5c4e6`，src fingerprint `38bb27070c0e52448d8bdb4a258c517b651cf2b6266d6606d97ea1a57301040d`（113 files）；manifest 未 fingerprint runner scripts，故不把 base HEAD 當成完整 runner/source commit correlation。Controlled manifests 沒有保存 HEAD／runner／src fingerprint，不宣稱已做逐位元來源對照。Lead 報告 node checks、13/13 route-policy、8/8 helper 與 Boss save/reload 2/2 通過；本報告未重跑。

保留的 superseded Boss Gear FAIL attempts 是 Early `attempt-20261014T054002914Z`、Mid `attempt-20261014T054652681Z`、Late `attempt-20261014T055342804Z`；runner 曾因非 Legendary Boss gear 的 provenance 為 null 而誤報無 reward。最新 Boss Gear attempts 已用專屬 item base／instance 修正 runner detection；早期 FAIL rows 不混入本分析。Adventure Loot 與 Masterpiece 的 INCOMPLETE rows 則是本次有效的 bounded rarity data，不是被刪除的失敗。

## B3 change proposals

### 來源取得率、affix 與 Masterpiece：NO CHANGE

1. 原始問題：部分 Adventure Loot cells 沒有取得所需 style affix，部分 Smithing 6 masterpiece cells 在 bound 內沒有匹配成果。
2. 證據：36 個 loot INCOMPLETE cells 到 18 次候選；64 個 masterpiece INCOMPLETE cells 到 16 crafts，皆保留部分樣本與來源 attempt。
3. 若將來證實過度稀有，提升 matching item 可降低重複刷取並讓 style build 可選；本次只知道 bound 內未觀察到結果。
4. 實際修改：無；未延長 bounds、未改掉落／製作規則。
5. 退化風險：增加產出會改變裝備供應、style 差異、Crafting 經濟與 Masterpiece 價值；應先取得足夠完整試次並設定產品目標，再做窄範圍調整。

### 全域偏袒單一 build/source：NO CHANGE

1. 原始問題：可能存在一條低成本且跨 band／rank 支配其他 build 的路徑。
2. 證據：上方 rank×band 樣式表與 source 可用性表；Mid Boss Crit-Speed 勝率最高，Late Boss Penetration 最高，而低階 rank 樣式在勝率接近時 turns／damage 仍不同。來源可用 cell 數亦大幅不同。
3. 要改善的是選擇的可讀性與成本／效果差異，不是強迫每個 build 相同。
4. 實際修改：無；沒有出現可證明需要全域改動的支配關係。
5. 退化風險：大幅 buff 單一路線會消除多樣選擇，並與來源 availability、Boss first-kill 規則及掉落經濟互相影響。未有 matched per-cell evidence 支持此變更。

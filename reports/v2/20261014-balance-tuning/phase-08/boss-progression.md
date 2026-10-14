# Phase8-B Boss Progression 報告

**資料限制：** scripted normal-route 的實際遭遇與 controlled fixture 分開。Controlled 的 `bossAlive fixture → public encounter` 只測戰鬥；自然合法遭遇欄只計算 route attempt 實際開戰數，不把 0 遭遇推論成 Boss 不可達。

## Boss 合法條件、獎勵 cooldown 與保存覆蓋

下表重述 B1 §3 所查到的合法 profile。進入遭遇仍須角色存活、不在 combat／dungeon、位於目標地區、至少 8 stamina，並同時符合族群與 Boss profile。內容 profile 的時段、探索、threat、level 限制須共同成立。

| Boss ID | 合法公開遭遇條件摘要 | 勝利後 cooldown | Save/reload 證據 |
| --- | --- | --- | --- |
| slime_heart | Forest；Lv≥7／threat 3／夏秋 18–23，或恰 Lv10／threat 1–2／同季節時段。 | 30 日 | `contentBosses.integration.test.ts` 有逐 ID frozen encounter 與 defeated cooldown save/reload 案例；本次 Lead 只回報 bossSaveReload 2/2，未回報重跑這組 integration tests。 |
| cave_insect_queen | Mine；Lv≥8／threat 3，或 Lv≥10／全年 18–23；族群 profile 仍須符合。 | 42 日 | 同上，逐 ID 測試碼存在但本次未宣稱已跑。 |
| wild_beast_apex | Forest；Lv≥8／threat 3／秋冬 16–23，或 Lv10–18／秋冬 16–23／threat≤3。 | 35 日 | 同上，逐 ID 測試碼存在但本次未宣稱已跑。 |
| frontier_goblin_warlord | Forest 或 Mine；Lv≥8／threat 3，或 Lv10–18／秋冬 17–23／threat≤3；族群 profile 仍須符合。 | 45 日 | 同上，逐 ID 測試碼存在但本次未宣稱已跑。 |
| fog_undead_cryptlord | 已探索 unknown；Boss Lv≥9／threat 3／20–23，或 Lv≥11／秋冬／20–23；族群 profile 另要求 threat≥2。 | 60 日 | 同上，逐 ID 測試碼存在但本次未宣稱已跑。 |
| mine_construct_heart | 已探索 unknown；Boss Lv≥9／threat 3／8–18，或 Lv≥11／春秋／8–18；族群 profile 另要求 threat≥2。 | 60 日 | 同上，逐 ID 測試碼存在但本次未宣稱已跑。 |
| chief | 日常 bossProgress 達 100 後於森林挑戰；勝利清除 bossAlive 與 progress，無固定日數 cooldown。 | 無固定天數；勝利後重置 bossProgress | Lead 最新 `bossSaveReload.test.ts` 2/2 PASS，包含 Chief 存活／進度與勝利後清除狀態往返。 |
| wolfKing | 完成 grayWolf → scarredWolf → alphaWolf → packLeader；森林、population≥1、stamina≥8。 | 勝利後 7 日 | Lead 最新 `bossSaveReload.test.ts` 2/2 PASS，包含 Wolf King defeatedAt 與 7 日可再次遭遇窗口往返；另有 flee/frozen variant 存檔測試碼。 |

六個內容 Boss 的 profile、獎勵與 cooldown 來源見 B1 `b1-diagnosis.md` §3，以及 `src/data/content/slime.ts`、`src/data/content/caveInsects.ts`、`src/data/content/wildBeasts.ts`、`src/data/content/frontierGoblins.ts`、`src/data/content/fogUndead.ts`、`src/data/content/mineConstructs.ts`、`src/engine/contentBosses.integration.test.ts:105-198`。Goblin Chief 規則見 `src/data/config.ts`、`src/engine/actions.ts`；Wolf chain 見 `src/engine/wolfFamily.ts` 與 `src/data/rewards.ts`。Chief／Wolf King 是本次實際回報通過的兩個 save/reload 個案；六個內容 Boss 的測試碼存在，但本報告不將未回報重跑的測試標成 PASS。

## 自然 scripted route：v3 與 measured 分開

以下 encounter 是合法公開 API 的實際開戰次數，按政策合計 Adventure + Hybrid；每格格式為 `N (W/R/D)`。它不是 eligibility observation count、獨立遭遇機率或一般玩家估計；沒有列出的自然遭遇標成 `NOT OBSERVED`。

| Boss ID | Early：v3 / measured | Mid：v3 / measured | Late：v3 / measured |
| --- | --- | --- | --- |
| slime_heart | 3 (3/0/0) / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED |
| cave_insect_queen | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / 1 (0/1/0) | NOT OBSERVED / NOT OBSERVED |
| wild_beast_apex | 32 (8/24/0) / 12 (3/9/0) | 1 (1/0/0) / 2 (2/0/0) | NOT OBSERVED / NOT OBSERVED |
| frontier_goblin_warlord | 40 (4/36/0) / 8 (3/5/0) | 3 (3/0/0) / 2 (2/0/0) | NOT OBSERVED / NOT OBSERVED |
| fog_undead_cryptlord | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED |
| mine_construct_heart | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED |
| chief | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED | NOT OBSERVED / NOT OBSERVED |
| wolfKing | NOT OBSERVED / 495 (40/455/0) | NOT OBSERVED / 128 (78/50/0) | NOT OBSERVED / 87 (87/0/0) |

資料來源是最新 route attempts `b-runner/normal-route-attempts/v3/attempt-20261014T045140077Z/`、`measured/attempt-20261014T045339779Z/` 與最新 route summary `b-runner/route-matrix-attempts/attempt-20261014T050130566Z/route-combat-matrix.json`。狼王早期 measured 合計 495 場包含 Adventure 459 場（4 勝／455 退）與 Hybrid 36 場（36 勝／0 退）；455/459 是 Adventure 子路線數，不是全部 measured route 的分母。

## Controlled matrix：Boss ID × band

數值合併當 band 中所有有樣本的合法 source/style cell；它們**不是單一 build 的 pooled percentile**。Turns 欄每個 P 值列出 cell summary 的最小至最大值。`P/I/NA` 是 25 個 source/style cells 中 PASS／INCOMPLETE／NOT_APPLICABLE 格數；W/R/D 和 N 為實際保存的 combat rows，包含 INCOMPLETE cell 的部分列。Potion 為每場平均；gross damage 和 risk-adjusted gold 是 cell P50／summary 的 envelope。Risk-adjusted gold 僅計直接戰鬥金幣回報，不把準備時間、potion、materials、stamina 折價。

`自然公開遭遇` 仍列 v3／measured 的 N(W/R/D)；0 即 `NOT OBSERVED`。Controlled cell 的 NA 原因會是沒有 canonical legal target spawn witness、來源取得不合法，或目標 affix／裝備取得失敗；逐格原始原因在各 attempt 的 cell-results.json。Controlled runner 設定 band/world gates，並以 canonical encounter option projection 與 public encounter action 驗證；Chief 另設 bossAlive 合法前置狀態。這是測量用 legal fixture，不是自然 route 機會數。

### Early

| Boss ID | 自然公開遭遇：v3 / measured | Cells P/I/NA | Controlled W/R/D (N) | Turns P10 / P50 / P90 cell envelope | Potion mean | Gross damage P50 | Risk-adjusted gold | 準備取得 witness envelope：Δgold；分鐘；stamina |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| slime_heart | 3 (3/0/0) / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+24；3…87,123；0…60 |
| cave_insect_queen | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+16；2…50,490；0…60 |
| wild_beast_apex | 32 (8/24/0) / 12 (3/9/0) | 0/0/25 | — (0) | — | — | — | — | −424…+16；2…50,490；0…60 |
| frontier_goblin_warlord | 40 (4/36/0) / 8 (3/5/0) | 0/0/25 | — (0) | — | — | — | — | −424…+16；2…50,490；0…60 |
| fog_undead_cryptlord | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+16；2…50,490；0…60 |
| mine_construct_heart | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+16；2…50,490；0…60 |
| chief | NOT OBSERVED / NOT OBSERVED | 13/5/7 | 4,600/0/0 (4,600) | 4…8 / 5…8 / 5…8 | 0 | 52…65 | 100 | −424…+24；3…87,123；0…78 |
| wolfKing | NOT OBSERVED / 495 (40/455/0) | 13/3/9 | 4,370/0/30 (4,400) | 5…13 / 7…13 / 9…15 | 1.50 | 98…181 | 68.5…75 | −424…+24；2…87,123；0…78 |

### Mid

| Boss ID | 自然公開遭遇：v3 / measured | Cells P/I/NA | Controlled W/R/D (N) | Turns P10 / P50 / P90 cell envelope | Potion mean | Gross damage P50 | Risk-adjusted gold | 準備取得 witness envelope：Δgold；分鐘；stamina |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| slime_heart | NOT OBSERVED / NOT OBSERVED | 14/3/8 | 4,800/0/0 (4,800) | 7…14 / 8…14 / 8…15 | 1.64 | 108…160 | 64 | −424…+24；2…50,490；0…78 |
| cave_insect_queen | NOT OBSERVED / 1 (0/1/0) | 16/3/6 | 77/0/5,223 (5,300) | 9…12 / 9…13 / 9…13 | 2.00 | 238 | 0…18.86 | −424…+20；2…50,490；0…78 |
| wild_beast_apex | 1 (1/0/0) / 2 (2/0/0) | 16/3/6 | 1,030/0/4,270 (5,300) | 8…12 / 9…12 / 9…13 | 2.00 | 219…238 | 0…72 | −424…+20；2…50,490；0…78 |
| frontier_goblin_warlord | 3 (3/0/0) / 2 (2/0/0) | 15/3/7 | 396/0/4,604 (5,000) | 9…15 / 10…15 / 10…15 | 2.00 | 219…238 | 0…40.28 | −424…+20；2…50,490；0…78 |
| fog_undead_cryptlord | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+16；2…50,490；0…60 |
| mine_construct_heart | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+16；2…50,490；0…60 |
| chief | NOT OBSERVED / NOT OBSERVED | 15/3/7 | 5,100/0/0 (5,100) | 3…7 / 4…7 / 4…7 | 0 | 24…48 | 100 | −424…+24；2…50,490；0…78 |
| wolfKing | NOT OBSERVED / 128 (78/50/0) | 13/3/9 | 4,500/0/0 (4,500) | 4…8 / 4…10 / 6…11 | 0.70 | 59…114 | 75 | −424…+26；3…50,490；0…78 |

### Late

| Boss ID | 自然公開遭遇：v3 / measured | Cells P/I/NA | Controlled W/R/D (N) | Turns P10 / P50 / P90 cell envelope | Potion mean | Gross damage P50 | Risk-adjusted gold | 準備取得 witness envelope：Δgold；分鐘；stamina |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| slime_heart | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+24；1…87,122；0…60 |
| cave_insect_queen | NOT OBSERVED / NOT OBSERVED | 14/3/8 | 3,223/0/1,577 (4,800) | 8…12 / 8…12 / 8…13 | 2.00 | 171…256 | 0…82 | −424…+24；1…87,122；0…78 |
| wild_beast_apex | NOT OBSERVED / NOT OBSERVED | 15/3/7 | 4,925/0/175 (5,100) | 8…12 / 8…12 / 8…13 | 1.98 | 154…248 | 48.24…72 | −424…+24；1…87,122；0…78 |
| frontier_goblin_warlord | NOT OBSERVED / NOT OBSERVED | 14/4/7 | 4,774/0/126 (4,900) | 8…14 / 9…14 / 9…14 | 1.93 | 125…253 | 44.08…76 | −424…+24；1…87,122；0…78 |
| fog_undead_cryptlord | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+24；1…87,122；0…60 |
| mine_construct_heart | NOT OBSERVED / NOT OBSERVED | 0/0/25 | — (0) | — | — | — | — | −424…+24；1…87,122；0…60 |
| chief | NOT OBSERVED / NOT OBSERVED | 15/3/7 | 5,100/0/0 (5,100) | 2…5 / 3…5 / 3…5 | 0 | 4…33 | 100 | −424…+24；1…87,122；0…78 |
| wolfKing | NOT OBSERVED / 87 (87/0/0) | 15/3/7 | 5,100/0/0 (5,100) | 3…5 / 3…5 / 3…6 | 0 | 14…53 | 75 | −424…+24；1…87,122；0…78 |

準備成本 envelope 是對應 Boss×band 中全部取得 witness 的已記錄淨 gold delta、game minutes 與 stamina；負的 Δgold 表示淨支出，正值可含取得路徑收益。這不是期望成本，也沒有把材料折成金幣。`NOT_APPLICABLE`/未完成取得的 witness 不代表已有可用 gear。各材料 delta、item base／rarity／affix、source instance、attempts 與逐筆花費留在該格的 acquisition-witnesses.json 和 combat-samples.jsonl.gz。

## 最新 controlled attempts 與狀態

以下為使用的最新 attempts；每組都保留在 reports 下，所有舊檔未刪除：

| Band | Legacy | Adventure Loot | Crafted | Boss Gear | Masterpiece |
| --- | --- | --- | --- | --- | --- |
| Early | `early-legacy/attempt-20261014T053617345Z` | `early-adventure-loot/attempt-20261014T053701021Z` | `early-crafted/attempt-20261014T053856893Z` | `early-boss-gear/attempt-20261014T060734555Z` | `early-masterpiece/attempt-20261014T054020019Z` |
| Mid | `mid-legacy/attempt-20261014T054121807Z` | `mid-adventure-loot/attempt-20261014T054220247Z` | `mid-crafted/attempt-20261014T054441418Z` | `mid-boss-gear/attempt-20261014T060832702Z` | `mid-masterpiece/attempt-20261014T054713277Z` |
| Late | `late-legacy/attempt-20261014T054908094Z` | `late-adventure-loot/attempt-20261014T055016861Z` | `late-crafted/attempt-20261014T055146192Z` | `late-boss-gear/attempt-20261014T060950362Z` | `late-masterpiece/attempt-20261014T055402046Z` |

每個目錄位於 `b-runner/controlled-matrix-attempts/` 並含 `manifest.json`、`cell-results.json`、`acquisition-witnesses.json`、`combat-samples.jsonl.gz`、`completion.json`。各 source 的來源合法性／每個 style 對應格的詳細比較見 [equipment-build-analysis.md](equipment-build-analysis.md)。

## Historical Failures

本節只索引過往失敗，不把其數值混入以上最新表格：

- 被 runner error 取代的 Boss Gear attempts：Early `early-boss-gear/attempt-20261014T054002914Z`、Mid `mid-boss-gear/attempt-20261014T054652681Z`、Late `late-boss-gear/attempt-20261014T055342804Z`。原因是 runner 對 Boss provenance 的偵測錯誤；Lead 已修正並重跑為上表三次。三個舊 attempt 保留。
- 初次 route policy 測試使用不合法 Wolf King 前序 fixture，故 tie-break 測試失敗；修正 fixture 後 route-policy 最終 13/13 PASS。見 `b-runner/lead-exec-b2-rerun.log`。
- route matrix 初次因 `combat-matrix.mjs:49` 語法錯誤而無法建立；修正後的最新 route matrix attempt 為 `route-matrix-attempts/attempt-20261014T050130566Z/`。初始失敗不作數值來源。

## 來源追溯與驗證

最新 normal-route attempts 的 HEAD 均為 `ea75684e1533b9d55a992495c256acfb58c5c4e6`，src fingerprint 為 `38bb27070c0e52448d8bdb4a258c517b651cf2b6266d6606d97ea1a57301040d`（113 files）；manifest 未 fingerprint Phase8 runner scripts，因此不能由 HEAD 單獨證明完整測試輸入與 commit 完全一致。Controlled matrix attempt manifests 沒有保存 HEAD／runner／src fingerprint，因此無法從其原始檔確認逐位元 source correlation；Lead log 是該組執行記錄。B2 Lead 回報 Boss save/reload 2/2 PASS。六個內容 Boss 的 save/reload integration coverage 存在但本次未列為已驗證。獨立 review 尚無可引用紀錄。

## B3 change proposals

### Mid Boss 戰鬥參數：NO CHANGE（先隔離因果）

1. 原始問題：Mid 的 Queen、Apex、Warlord controlled death 數高，與同 band Slime Heart／Chief／Wolf King 差異大。
2. 證據：以上 ID×band controlled 表、15 個最新 source/band attempts；route 自然遭遇表另外列出，不混為一談。
3. 若問題成立，改善目標是讓玩家能透過裝備準備、選擇替代目標或撤退活下來，而非無選擇地耗盡 potion／HP。
4. 實際修改：沒有；尚未 isolate Boss attack、HP 或防禦哪一項是成因。
5. 退化風險：Boss 數值跨 band 共享，會改變戰鬥時間、drop、potion use、Boss reward 與 cooldown 循環；下一步要針對單一 Boss 做同 seed 單參數對照，完成前不調整。

### 未觀測 profile／cooldown：NO CHANGE

1. 原始問題：六個內容 Boss 中若干 ID×band 在三年 route 中沒有公開遭遇。
2. 證據：上方 route table 的 NOT OBSERVED，以及 cell-results.json 中逐格 `naReason`；這些是有限 route/window 內的未觀察，不是不可達證明。
3. 若有問題，期望改善玩家找到／安排合法 Boss 目標的決策。
4. 實際修改：沒有調 profile、threat、時間窗或 cooldown。
5. 退化風險：擴窗會提高 Boss loot 供應與挑戰頻率，並改變 progression；先補自然合法 witness／eligibility observations。

Raw files >1 MB under `b-runner/` were gzip'd by Root after the runs (41 files, round-trip verified against `b-runner/raw-compression-manifest.sha256`); cited paths may carry a `.gz` suffix.

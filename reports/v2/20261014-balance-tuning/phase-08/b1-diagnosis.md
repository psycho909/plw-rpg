# Phase8-B1：戰鬥／裝備診斷與計畫

**狀態：B1 diagnosis/plan only，等待 Lead 決策。** 依 `tickets/20261014-v2x-08b-combat-equipment.md`、Phase8 spec §3/§4/§6/§10/§16 與已接受基準 `ea75684` 執行。本報告是本階段唯一新增檔案；沒有修改 `src/`、沒有執行測試或 runner、沒有 commit/push，也沒有 sandbox escalation。

## 1. 診斷結論

1. A5 v3 的三組 Adventure 與三組 Hybrid、各三年資料中，Elite 與 MiniBoss 都是 **0 eligibility、0 encounter**。Adventure 各 seed 的較高階可用觀察數為 37／37／49，Hybrid 為 7／15／13；全部是 Boss 目標，沒有 Elite/MiniBoss。Life 路線不主動戰鬥，不能當作同一種遭遇取樣。
2. 內容族群的主要共同阻擋條件是 threat level：`CONFIG.threatThresholds` 為 `[0, 30, 65]`，level 2 要求 monsterPopulation ≥30、level 3 要求 ≥65；A5 v3 三年時間序列的 Adventure 最高人口 1.53、Hybrid 最高 13.53，兩者都維持 threat level 1。Life 路線最高人口 100，但政策不主動接戰。這支持「戰鬥 runner 的路線／目標選擇限制了威脅成長」，不證明一般玩家也無法達到門檻。
3. 狼鏈另有可重現的 runner 策略缺陷：`grayWolf → scarredWolf → alphaWolf → packLeader → wolfKing`；擊敗灰狼後，灰狼仍可追蹤，灰狼與傷痕灰狼同為 Normal。runner 同 rank、同 kind 時按 `definitionId.localeCompare` 排序，持續選 `grayWolf`。v3 共有 Adventure 366、Hybrid 186 場灰狼勝利，沒有傷痕灰狼、Alpha 或 Pack Leader。Elite `alphaWolf` 與 MiniBoss `packLeader` 因此一直被前序擊敗條件鎖住；這是 scripted runner 的確定性選擇問題，不是已證實的遊戲引擎鎖死。
4. 不應依此直接調低全域 threat 門檻、全面強化玩家或削弱 Boss。已存在的內容 eligibility 測試會建立合法目擊狀態；未有證據證明 Elite/MiniBoss 無合法條件。應先以相同 seed 做 runner policy controlled comparison，再取得合法裝備路徑與每 Boss 戰鬥成本，才決定是否調整單一定義或門檻。

## 2. A5 v3 的門檻證據與可達性分類

資料來源：`reports/v2/20261014-balance-tuning/phase-08/baseline.md`（A5 摘要、v3 有效性與限制），以及 `a-baseline-run/attempt-20261014T040039340Z/` 的 `seed-*.json.gz`、`time-series.csv.gz`、`encounters.csv`、`completion.json`。v3 為三個 seed 61101–61103、每條路線三年；每個 Adventure/Hybrid seed 都保存 `rankEvidence`。

| 路線 | 時間序列人口範圍 | 最高玩家等級 | rankEvidence | 分類 |
| --- | ---: | ---: | --- | --- |
| Adventure（3 seeds） | 0.335–1.53 | 21 | Elite 0、MiniBoss 0；較高階可用觀察 37／37／49，全為 Boss | 路線長期戰鬥使 threat 未達 2；不是沒有採樣記錄 |
| Hybrid（3 seeds） | 0.335–13.53 | 25 | Elite 0、MiniBoss 0；較高階可用觀察 7／15／13，全為 Boss | 同上；仍未達 threat level 2 的 30 人口門檻 |
| Life（3 seeds） | 12.51–100 | 22 | 不主動接戰，沒有可比的遭遇選擇資料 | 可見人口會自然升高，但不能據此推估玩家遭遇率 |

`src/engine/simulation.ts:30,318` 以設定門檻換算 threat level；`src/data/config.ts:10` 定義門檻與 Chief progress 門檻。內容 eligibility 由 `src/engine/contentFamilies.ts:98-124` 同時檢查存活、戰鬥／地城狀態、探索區域、體力、族群 profile 與怪物 profile；兩種 profile 各自都必須有符合當前狀態的條件，且 Boss 另受 cooldown 限制。profile 可限制地區、玩家等級上下限、threat、聚落階段、安全度、季節與時段。Wolf track 另要求森林、體力至少 8、monsterPopulation 至少 1，並依前序 defeated collection 解鎖（`src/engine/wolfFamily.ts:40-72`）。

v3 的內容 Boss eligibility 觀察只出現三個 ID：`slime_heart` 共 9 次、`wild_beast_apex` 共 70 次、`frontier_goblin_warlord` 共 79 次；合計 158 次目標可用觀察。這是逐決策的重複候選觀察，不是獨立玩家或遭遇機率。`cave_insect_queen`、`fog_undead_cryptlord`、`mine_construct_heart`、Goblin Chief 與 Wolf King 在 v3 rank evidence 中都沒有出現。

### 根因重現與分類

- **Threat／population：** 所有六個 Adventure/Hybrid seed 的時間序列最高人口都低於 30；內容 Elite/MiniBoss 所需的 threat 2/3 profile 無法通過。這個結果可由 A5 已存檔的 population 時間序列與 eligibility map 重現。Life 路線人口達 100，且 `simulation.test.ts` 有較高 threat／Boss witness；所以目前應分類為「runner policy／路線的暴露限制，加上設計上長期門檻」，不是已證實的 unreachable defect。普通玩家的可達率仍未知。
- **Wolf chain：** `src/data/rewards.ts:63-67,104-107` 定義狼族順位與七日 Boss cooldown；`wolfEncounterOptions` 對已擊敗的灰狼仍回傳可用。`scripts/phase8/run-normal-routes.mjs:310-323` 依 rank、kind、字典序排序，灰狼會穩定排在傷痕灰狼之前。v3 encounter rows 只記錄 `grayWolf`（Adventure 366、Hybrid 186 勝），沒有其他狼族 ID。這是最低成本且最確定的 runner policy reproduction：修正 tie-break／進度優先後，以相同 seed 比較是否依序解鎖 Alpha 與 Pack Leader。
- **其他 gates：** 區域、季節、時段、玩家等級範圍、聚落階段、探索狀態、體力、population 與 Boss cooldown 都會阻擋特定決策；A5 `blockedReasonsByRank` 亦記錄這些理由。level 不是全域根因（v3 最高等級已達 21／25），但上限型 profile 可能造成短暫有效窗口。Cooldown 只適用 Boss，不能解釋 Elite/MiniBoss 全零。內容 encounter 的體力門檻為 8；Wolf 另有附近 population ≥1。不得把不同 blocked reason 的次數視為玩家遭遇機率。
- **合法狀態 witness：** `src/engine/contentBosses.integration.test.ts:21-74,105-198` 以受控狀態為六個 Boss 建立 spawn witness，並測試 alternate low-threat access；`caveInsects.integration.test.ts` 與 `remainingFamilies.integration.test.ts` 也直接建立高 rank profile 狀態。這些是測試程式碼中的可達性證據；本階段沒有執行這些測試。

## 3. Boss progression

內容 Boss 的通用 encounter 前提：角色存活、目前不在 combat/dungeon、所在目標區域已探索、體力至少 8；族群與怪物 spawn profile 必須各自符合，已勝利的 Boss 另需等候其 cooldown。表中的 v3「可用觀察」是 A5 rankEvidence 的候選快照，不是獨立機會數；遭遇勝／退數來自 v3 `encounters.csv`。Prep cost 未能按 Boss 歸因，詳見第 5 節。

| Phase7 新增 Boss | 合法條件（定義 profile；另須符合族群 profile） | v3 可用觀察／遭遇 | 勝利獎勵與 cooldown | Save/reload 覆蓋 |
| --- | --- | --- | --- | --- |
| `slime_heart` 濕地黏核 | 森林；Lv≥7、threat 3，夏／秋 18–23；或恰為 Lv10、threat 1–2，同季節時段。族群森林 profile 為 Lv2–10、threat 1–3。`slime.ts:103-115` | 可用 9；Hybrid 3 勝、0 退、0 死；Adventure 無遭遇 | Lv8、160 XP／64 金；保證 `slime_heart_gel`、專屬 `slime_heartstaff`；30 日。 | 六個 Boss 共用 integration test，逐一測 frozen encounter reload 與 defeated cooldown reload（`contentBosses.integration.test.ts:105-198`） |
| `cave_insect_queen` 洞穴蛛蟲后 | 礦坑；Lv≥8、threat 3；或 Lv≥10、全年、18–23。族群可走 village stage profile，或 threat 2–3 profile，因此低威脅替代路仍需族群條件符合。`caveInsects.ts:6-17,109-125` | 0 可用、0 遭遇（NOT OBSERVED） | Lv9、205 XP／82 金；保證 `cave_insect_queen_core`、專屬 `cave_insect_queen_carapace`；42 日。 | 同上，逐一覆蓋 |
| `wild_beast_apex` 林地王獸 | 森林；Lv≥8、threat 3，秋／冬 16–23；或 Lv10–18、threat≤3，同季節時段。族群森林 profile 可讓第二路徑在 threat 1 生效。`wildBeasts.ts:6-17,31` | 可用 70；Adventure 3 勝／18 退、Hybrid 6 勝／6 退，0 死 | Lv9、190 XP／72 金；保證 `wild_beast_apex_core`、專屬 `wild_beast_apex_maul`；35 日。 | 六個 Boss 共用 integration test，逐一覆蓋 |
| `frontier_goblin_warlord` 邊境哥布林戰帥 | 森林或礦坑；Lv≥8、threat 3；或 Lv10–18、秋／冬 17–23、threat≤3。族群 forest/mine profile 也須符合。`frontierGoblins.ts:6-19,33` | 可用 79；Adventure 3 勝／30 退、Hybrid 4 勝／6 退，0 死 | Lv9、196 XP／76 金；保證 `frontier_goblin_warlord_seal`、專屬 `frontier_goblin_warlord_cleaver`；45 日。 | 六個 Boss 共用 integration test，逐一覆蓋 |
| `fog_undead_cryptlord` 霧谷墓主 | 已探索 unknown 區；Lv≥9、threat 3，20–23；或 Lv≥11、秋／冬 20–23。族群 unknown profile 另要求 Lv≥5、threat≥2、18–23，所以替代路仍至少 threat 2。`fogUndead.ts:6-17,106-113` | 0 可用、0 遭遇（NOT OBSERVED） | Lv9、210 XP／86 金；保證 `fog_undead_crypt_heart`、專屬 `fog_undead_cryptlord_blade`；60 日。 | 六個 Boss 共用 integration test，逐一覆蓋 |
| `mine_construct_heart` 遠古岩構核心 | 已探索 unknown 區；Lv≥9、threat 3、8–18；或 Lv≥11、春／秋 8–18。族群 unknown profile 另要求 Lv≥6、threat≥2、6–22，所以替代路仍至少 threat 2。`mineConstructs.ts:6-17,103-111` | 0 可用、0 遭遇（NOT OBSERVED） | Lv9、225 XP／92 金；保證 `mine_construct_ancient_core`、專屬 `mine_construct_heartbreaker`；60 日。 | 六個 Boss 共用 integration test，逐一覆蓋 |

Phase7 `combat-raw.jsonl.gz` 依 Boss ID 分解後，各「Boss × band」為 600 個 controlled fixtures（六種 Phase7 build 各 100；合計三個 band 10,800 個 Boss 樣本）。下表不是自然遊玩成功率；Phase7 fixture 標記為 `CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY`，也不包含 Boss Gear 或本階段指定的 Crit-Speed／Bleed／Penetration 對照。

| Phase7 Boss | Early win | Mid win | Late win | 每格樣本數 |
| --- | ---: | ---: | ---: | ---: |
| `slime_heart` | 66.7% | 100.0% | 100.0% | 600 |
| `cave_insect_queen` | 0.0% | 0.0% | 65.7% | 600 |
| `wild_beast_apex` | 0.0% | 6.2% | 79.5% | 600 |
| `frontier_goblin_warlord` | 0.0% | 16.7% | 83.3% | 600 |
| `fog_undead_cryptlord` | 0.0% | 0.0% | 64.8% | 600 |
| `mine_construct_heart` | 0.0% | 0.0% | 33.3% | 600 |

這些 ID 級差異比 pooled Boss 的 Early/Mid/Late 11.1%／20.5%／71.1% 更能指向後續檢查：Slime Heart 與其他 Boss 差異很大，不能用一個全體 Boss 乘數解釋。Phase7 pooled 的 Defense build Boss win 率最高 52.1%，但回合較長，並非已證實的普遍優勢。

### 既有重要 Boss

| Boss | 合法出現條件與獎勵 | v3／Phase7 證據 | Save/reload 覆蓋 |
| --- | --- | --- | --- |
| Goblin Chief（`chief`） | daily `bossProgress += threatLevel × 0.55 − guards × 0.04`，達 `CONFIG.bossThreshold=100` 後 `bossAlive=true`；另需前往森林、角色可行動、體力≥8。擊敗後清除 `bossAlive`、歸零 progress，沒有固定日數 cooldown。`simulation.ts:318-326`、`actions.ts:207-219,328-352`、`config.ts:10,39-49`。Boss 為 Lv8、150 XP／100 金，另走 legacy material loot。 | v3 `encounters.csv` 無 `chief` encounter；rank evidence 也無 Chief 可用快照，故標為 NOT OBSERVED，不能推定 Boss progress 是否曾短暫達標。Phase7 六個 Boss ID fixture 不含 Chief，controlled rate N/A。 | 有 simulation spawn 與 actions defeat/reset 覆蓋；檢視到的測試沒有 Chief bossAlive/bossProgress 專用存檔往返案例。一般 save serialization 不等於專用 lifecycle coverage。 |
| Wolf King（`wolfKing`） | 完成 `grayWolf → scarredWolf → alphaWolf → packLeader`；森林、角色存活且不在 combat/dungeon、體力≥8、population≥1；前次 defeated 後 7 日 cooldown。`wolfFamily.ts:40-72`、`rewards.ts:63-67,104-107`。勝利給 Lv7、130 XP／75 金，Wolf Boss loot profile 含 `moonFangSpear` 專屬 gear 路徑及 `moonStone` 素材。 | v3 不可用／無 encounter（NOT OBSERVED）；同路線只有 Gray Wolf。Phase7 六個新 Boss raw fixture 不含 Wolf King，controlled rate N/A。 | 有鏈條／七日 gate 測試，且涵蓋逃跑後 Boss variant 存檔、載入、重挑戰（`wolfFamily.test.ts:120-129,162-175`）；未找到擊敗後 cooldown 專用存檔往返案例。 |

所有自然路線 Boss encounter 合計 Adventure 6 勝／48 退、Hybrid 13 勝／12 退、死亡 0；依 ID 僅為上述三個新內容 Boss。v3 的多次 Boss 退場是路線策略結果，不能視為人類玩家會反覆撤退的估計。

## 4. B2 combat matrix 設計

沿用 Phase7 的 Early／Mid／Late classifier，不自行發明等級區間；保留 Normal／Elite／MiniBoss／Boss 四 rank。Boss 必須逐 ID 保留（六個 Phase7 Boss、Goblin Chief、Wolf King），不能只用 rank 平均值。其餘 rank 依既有族群選代表定義，涵蓋不同 mechanic 與區域；若某 band/profile 無合法狀態或裝備 acquisition，明確記為 N/A，不以直接改引擎狀態冒充自然取得。

| 裝備來源 | Early | Mid | Late | 合法性規則 |
| --- | --- | --- | --- | --- |
| Legacy | 受控比較可保留 Phase7 legacy fixture；自然比較需記錄實際購買、掉落或製作路徑。Fresh save 起始 equipment 為 null、sword/armor inventory 為 0（`simulation.ts:141-147`），不可稱作免費初始裝備。 | 同左，明確記錄 instance 與來源 | 同左 | Fixture preset 與自然取得分欄，不混用 |
| Adventure Loot | 只用合法遇敵後實際掉落 | 依可接觸 rank 的真實 loot profile | 同左 | 記錄 enemy、item、rarity、affix、provenance 與前置遇敵成本 |
| Crafted | 只有已解鎖 recipe、材料、站點、時段、Smithing 與金／體力成本均合法才納入 | 依 `planCraft`／recipe eligibility 列出的路徑 | 同左 | 用 canonical crafting path；不得直接注入 craft output |
| Boss Gear | 該 Boss 首殺前為 N/A | 僅曾擊敗其他 Boss 並實際取得後可用 | 同左 | 首殺比較禁止使用目標 Boss 自己的掉落，避免循環驗證 |
| Masterpiece | 只有 recipe 帶 masterpieceRules 且 Smithing、材料與 recipe unlock 已合法符合時納入 | 同左 | 同左 | 不按 band 猜測；目前 legacy recipe 有 Smithing 6 門檻，內容 recipe 可更高（例如 slime recipe Smithing 8）；v3 policy 下 masterpiece eligibility 為 0 |

Build style 以現有 gear schema 組成，而非新增 mechanic：Damage 對應 `striking`／attack；Crit-Speed 使用 `keen`／critical 與合法攻擊策略，沒有獨立 equipment speed stat，因此「Speed」以回合數 P10/P50/P90 衡量；Bleed 對應 `bleeding`／bleed；Penetration 對應 `piercing`／penetration；Defense 對應 `sturdy`、`blocking`、`warding`／defense/block/reduction。現有 gear stat 定義見 `src/data/rewards.ts:20-26`、`src/domain/reward.ts:17-18,61`、`src/engine/combatStats.ts:10-41`。

建立 **Early/Mid/Late × 4 ranks × 合法來源 build × 合法 style** 的 cell manifest，明列每一個 N/A 原因、target definition、level、spawn witness、seed、裝備 instance/provenance。Phase7 的 100 samples/cell、3 deterministic seeds 可作第一個 sample-size 基準；先依合法 cells 估算總量，再由 Lead 核准執行預算。比較時同 band 同目標、同 seed、同合法 acquisition 成本；不把 Boss 專屬掉落當作首殺 loadout，也不以升級後玩家或越級 recipe 拉高一組數值來湊 build。

每 cell 量測：win／retreat／death、turns P10/P50/P90、剩餘 HP P10/P50/P90、potion use、gross damage taken、開始體力／戰鬥體力、黃金／材料與裝備取得成本、戰鬥外準備時間、冷卻等待、reward receipt。風險調整回報以 `P(win) × victory reward − P(retreat) × retreat cost − P(death) × death loss` 表示；只在遊戲已存在的售價或金幣成本可換算時報金幣淨值，同時保留時間、體力、材料等原始維度，不自行設定影子價格或目標 win rate。

## 5. 缺少的量測與最小 read-only instrumentation

- Phase7 raw 已有 `definitionId/rank/band/build/won/died/turns/hp/remainingEnemyHp`；Phase8 extraction CSV 有 turns、HP、net HP-loss proxy，但 `damageTaken`、`potionUse`、`fightCost` 欄位是 `NOT AVAILABLE`。A5 v3 `encounters.csv` 有 definition、rank、band、turns、HP 前後、retreat/death，沒有逐戰金錢／材料／藥水成本。
- 最小追加在 `scripts/phase8` runner 輸出的逐回合 metrics，不碰本階段 `src/`：每次 encounter／turn 記錄 route、seed、definition、rank、band、build、equipment instance/provenance、command、worldTime、player/enemy HP、max HP、stamina、gold、potion/material inventory 前後值；entry/exit 另存 acquired gear、prep actions、cost、reward、cooldown。藥水可由 inventory delta 精確計數。
- `combatTurn` 會在同一個回合先用 potion（+45、受 maxHP 限制），之後才接受敵人攻擊；因此單看 HP 前後差會把 healing 與 damage 混在一起（`actions.ts:266-271,293-390`）。優先加入 runner-side numeric damage observer／diagnostic sink，只回報 `incomingDamage` 呼叫實際套用值，不改狀態或規則；若 B2 僅允許 runner 修改，須先證明可由每回合 HP 與所有 heal 來源精確還原，否則將 gross damage 標為未量測，不用 net HP loss 冒充。
- 將自然 prep cost 以同樣 seed 的裝備 acquisition action ledger 歸到下一場 fight；若無法穩定歸因，先回報分離的 item/time/gold vector，不硬湊單一成本。這是量測補足，不是調平衡參數。

## 6. Hypotheses 排序與建議

| 排名 | Hypothesis／證據 | 受影響的玩家選擇 | 最小候選變更 | 預期效果與回歸風險 |
| --- | --- | --- | --- | --- |
| H1（確定性 runner 限制） | 同 rank 狼族排序持續選 `grayWolf`；v3 552 場 Gray Wolf、0 場後續狼。 | 是否沿狼族鏈承擔 Elite／MiniBoss／Boss 風險並拿後續獎勵 | 只改 runner 的進度 tie-break，讓已完成前序後選下一個 legal Wolf；不改遊戲規則 | 應出現 alphaWolf／packLeader 可用快照；風險是 runner 變得過度追狼、降低路線代表性，故同 seed 對照並保留原基準 |
| H2（Threat exposure 被路線壓低） | Adventure／Hybrid max population 1.53／13.53，小於 30；所有 Elite/MiniBoss eligibility 0；Life max 100 但不接戰。 | 是否持續清理 Normal，或保留威脅以開啟高 rank 選項 | 先只改 runner policy 做 controlled comparison（例如減少同日 Normal 掃蕩或保留路線空檔）；沒有證據支持更動全域 `[0,30,65]` 或大量 spawn profiles | 分離路線造成的 exposure 與產品門檻；風險是新政策不再代表舊 baseline，須同 seed／同世界時間、完整列出 policy 差異 |
| H3（Boss 難度跨定義不均） | Phase7 ID 級 Early/Mid 很多為 0% 或低 win，但 Slime Heart 為 66.7%／100%；late 仍從 33.3% 到 100%。 | Boss 前要準備多久、要用何種裝備、是否撤退或先追其他目標 | **目前不改參數。** 若合法自然 acquisition/成本補齊後仍確認偏差，只選一個 Boss 的一項數值或 mechanic 做窄調整，不加全體 Boss multiplier | 可針對差異極大的 encounter 作驗證；風險為同一 stat 影響所有 band、loot/cooldown 回報改變，須保留 per-ID × band regression |
| H4（部分 Boss profile 暴露窗口窄） | v3 只曾觀察 Slime Heart、Apex、Warlord 可用；其餘三個新 Boss 與 Chief/Wolf King未觀察。原始 profiles 存在合法條件，但地區／威脅／時段／等級交集不同。 | 是否能找到並選到目標 Boss；是否準備或放棄此路線 | 沒有證據支持 profile/cooldown 調整，先讓 runner 對 profile reason、地域、時段及 eligibility 做分層對照 | 找出真正缺少的是 runner 窗口或產品門檻；風險是只擴大 Boss 暴露卻沒有相稱裝備／準備時間 |

**B1 建議：不做產品數值變更。** 先請 Lead 決定是否進 B2 runner-only tie-break／route comparison；通過後依 Baseline → Hypothesis → Controlled Comparison → Change → Regression → Natural Validation 順序執行。若經 corrected runner 仍未見高 rank，再獨立審查產品 profile，而不是調低所有門檻。

## 7. 尚待 Lead 執行的命令與決策

B1 以已保存 A5／Phase7 證據和唯讀原始資料解析完成，沒有呼叫 Vite、Vitest、npm、`node --test` 或 runner，也沒有 escalation。以下命令屬於 **B2 核准後** 的 Lead-only child-process 驗證，本階段未執行：

1. `npx.cmd vitest run src/engine/contentFamilies.test.ts src/engine/wolfFamily.test.ts src/engine/contentBosses.integration.test.ts` — B2 若改 eligibility／狼鏈／Boss 保存行為，先跑最接近的契約測試。
2. `node scripts/phase8/run-normal-routes.mjs` — 僅在 Lead 核准 runner policy comparison 後，以同樣 seeds／年限重跑並保留新 attempt；本命令會生成新結果，不可覆寫／刪除既有 attempt。
3. `npm.cmd test` 與 `npm.cmd run build` — 僅在後續有已核准 source implementation 時跑完整 regression/build。

**等待 Lead 決策：** 是否核准 B2 的 runner-only Wolf progression tie-break 與相同 seed controlled comparison；以及是否要求 B2 對六個 Boss 使用上述 ID 級 controlled rates 做 legal gear/prep-cost matrix。無核准前，本 B1 停在診斷與計畫。

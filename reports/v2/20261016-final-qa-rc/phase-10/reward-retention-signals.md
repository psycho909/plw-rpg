# Phase10-C — Reward / Goal / Retention Signals

## 執行摘要

本報告整理可由工程證據支持的 reward、progression 與 goal continuity 訊號，不能推論真人樂趣、目標理解或留存。重用 Phase8 instrumented v3 的正常新存檔腳本路線：Life、Adventure、Hybrid 各三個 seed（61101–61103），遊戲曆三年；不是真人測試，也不是受控 fixture。該證據來源 HEAD 為 `5e223beb2ef056968861bc4c7125c1fb41da8728`、source fingerprint 為 `6ab18dfe0259d99d4d74802c612b32268930926676e5d0312ae37513cda3f95d`。Phase10-A 確認目前 `baa2a2947be643fc847a2a731e3479d6287a6150` 的 `src/` 與 Phase9 受測 source 相同；Phase8 內容及 loot 機制無變更。證據摘要與 hash 見 `c-runner/evidence-summary.json`。

## Reward 指標定義

| 指標 | 工程事件定義 | 解讀限制 |
|---|---|---|
| First meaningful reward | 首次獲得非金幣，且狀態差分改變可用選項、持有資產或世界記錄的成功事件 | 已由 Phase8 instrumented trace 逐 route／seed 計算（見下節「首次有意義獎勵」）；普通金幣變化永不計入 |
| 裝備升級／側升級 | 新裝備實際裝備後，同槽戰鬥屬性向量改善為升級；屬性得失或 build 取向變化為側升級 | 單純拾取不算；舊 gear-upgrades 記錄須按同角色、同槽屬性解讀 |
| 材料取得 | 註冊材料庫存增加且可歸因於採集、掉落、收成或事件 | 無來源可歸因的淨變化不算；扣除、轉移不算取得 |
| 技能進度 | 技能等級或未封頂 XP 增加 | 封頂後零 XP 製作不算進度，列為重複操作風險 |
| 製作成功 | 合法 recipe 成功提交並產生輸出物 | 嘗試、遭拒或只消耗時間不算 |
| 首領獎勵 | 首領勝利結算產生可核對掉落、首領歷史或聲望變化 | 首領可見、可選或遭遇不等於勝利獎勵 |
| 世界認可 | crisis、settlement 或 history 中保存新的 recognition／contribution consequence | 未造成狀態差分的一般敘事文字不算 |
| 產業所有權進度 | 成功取得或轉移 property／business 權利並形成里程碑 | 金幣支出本身不算 |
| 聲望／身份進度 | 聲望實際變化、rank 跨級或新增 life milestone | 一般動作計數不算 |

## 首次 meaningful reward（instrumented route/seed）

對每個 route/seed，從 Phase8 instrumented attempt 的 `gear-upgrades.csv`、`crafts.csv`、`seed-<route>-<seed>.json.gz` 日快照與 `encounters.csv.gz` 計算：裝備事件定義為首次 `meaningful=true` 的實際裝備升級；製作事件為首次成功 craft row；技能事件為任一技能首次高於 fresh-save Lv.1 的首個日快照時間；首領獎勵為首次 `rank=boss` 且 `outcome=win` 的遭遇結算時間（`at + timeDeltaMinutes`）。First meaningful reward 是這四類中最早一筆；金幣不計入。技能時間是日快照上界，實際升級發生於 fresh-save 起點後、該快照時間前，故與其他逐行事件的時間精度不同。

| Route | Seed | 首次裝備升級 | 首次製作成功 | 首次技能升級快照 | 首次首領獎勵 | 首次 meaningful reward |
|---|---:|---:|---:|---:|---:|---:|
| Life | 61101 | — | 1,965 | 1,920 | — | 1,920（技能快照上界） |
| Life | 61102 | — | 1,965 | 1,920 | — | 1,920（技能快照上界） |
| Life | 61103 | — | 1,965 | 1,920 | — | 1,920（技能快照上界） |
| Adventure | 61101 | 555 | — | 1,440 | 116,202 | 555（裝備） |
| Adventure | 61102 | 562 | — | 1,440 | 116,201 | 562（裝備） |
| Adventure | 61103 | 4,422 | — | 1,440 | 261,664 | 1,440（技能快照上界） |
| Hybrid | 61101 | 4,880 | 3,405 | 1,920 | 86,156 | 1,920（技能快照上界） |
| Hybrid | 61102 | 4,880 | 3,405 | 1,920 | 86,157 | 1,920（技能快照上界） |
| Hybrid | 61103 | 4,880 | 3,405 | 1,920 | 86,156 | 1,920（技能快照上界） |

時間單位均為遊戲分鐘。破折號表示此三年 runner trace 未觀察到該事件，不代表遊戲中無法發生。首次 meaningful reward 取四類 event timestamp 最小值；技能使用快照上界，首領獎勵使用遭遇勝利結算時間。資料列與計算 hash 見 `c-runner/evidence-summary.json`。

## Reward / progression drought intervals

Phase8-E `reward-pacing.md` 已計算 gap 分布。區間包含 fresh-save 起始前導 gap 與觀察截止的 trailing gap；下列 gap samples 合併三個 seed，單位為遊戲分鐘／動作數。事件空流以完整觀察窗口作右設限區間。gold bands 為分析用描述分箱，不是遊戲門檻或獎勵目標。

| Route / event | Gap samples | Game minutes median / p90 / max | Actions median / p90 / max |
|---|---:|---:|---:|
| Life — equipped meaningful item upgrade | 3 censored | 517,920 / 517,920 / 517,920 | 6,424 / 6,424 / 6,424 |
| Life — skill level-up (all skills pooled) | 123 | 7,200 / 30,240 / 48,960 | 80 / 387 / 595 |
| Life — new enemy first encountered | 3 censored | 517,920 / 517,920 / 517,920 | 6,424 / 6,424 / 6,424 |
| Life — descriptive gold high-water band | 15 | 59,040 / 227,040 / 227,040 | 712 / 2,926 / 2,926 |
| Life — first legal recipe plan observed | 9 | 39,083 / 477,397 / 477,397 | 465 / 5,942 / 5,942 |
| Adventure — equipped meaningful item upgrade | 23 | 8,853 / 244,283 / 401,576 | 92 / 1,985 / 3,384 |
| Adventure — skill level-up (all skills pooled) | 75 | 14,400 / 58,956 / 86,400 | 104 / 523 / 776 |
| Adventure — new enemy first encountered | 24 | 4,671 / 397,544 / 401,869 | 57 / 3,382 / 3,402 |
| Adventure — descriptive gold high-water band | 12 | 69,120 / 344,170 / 344,170 | 548 / 2,948 / 2,955 |
| Adventure — first legal recipe plan observed | 3 censored | 517,930 / 517,930 / 517,930 | 4,483 / 4,490 / 4,490 |
| Hybrid — equipped meaningful item upgrade | 25 | 8,182 / 332,099 / 415,165 | 91 / 4,093 / 4,958 |
| Hybrid — skill level-up (all skills pooled) | 157 | 4,800 / 28,800 / 41,300 | 56 / 353 / 558 |
| Hybrid — new enemy first encountered | 21 | 8,642 / 412,745 / 412,745 | 94 / 4,914 / 4,949 |
| Hybrid — descriptive gold high-water band | 15 | 56,640 / 272,640 / 276,480 | 561 / 3,110 / 3,129 |
| Hybrid — first legal recipe plan observed | 9 | 39,082 / 477,418 / 477,418 | 391 / 5,678 / 5,678 |

### Source correlation

Phase8 instrumented lane 的 manifest 記錄受測 V4 crop-yield-cap HEAD `5e223beb2ef056968861bc4c7125c1fb41da8728` 及 source fingerprint。對照 Phase9 受測 source `c0a377b50e09b67664bc07b65d4e81a382daa53f` 的 source diff，變更集中在元件／樣式、presentation projection、goal hint、狼族準備／戰鬥提示與 gameStore 訊息呈現；未改 loot、技能成長、craft XP、材料取得、配方、reward 結算規則。Phase10-A 又確認目前 source 與 Phase9 受測 source 相同（`baseline.md`）。因此可重用 Phase8 的 reward/progression gap 與 trace 計算；Phase9 新增提示只用來補本報告的提示閉合檢查，不覆寫 Phase8 路線量測。這是以 source diff 為據的相關性判斷，不宣稱 Phase8/Phase9 UI 畫面相同。

## 已觀測訊號

Phase8 instrumented v3 共 50,889 個決策、1,423 個 runner no-progress 標記：低信心「沒有可理解下一目標」1,276；daily encounter cap 限制 147（Adventure 114、Hybrid 33）；其他分類為 0。這些是窄規則的 runner 分類；零筆不證明問題不存在，no-progress 也不等於玩家無聊。腳本在 policy no-op 後停止，不能測量玩家是否理解目標或重複等待成本。

- 新裝備與技能升級已有上表區間分布；new enemy first encountered 作為挑戰暴露 proxy。首領獎勵首次時間見上表；Phase8-E 另有 Boss 可見到首次合法挑戰的 route 時間。世界回饋與產業所有權並未在該 gap 分析中建立統一事件流，仍標記 **NOT MEASURED**。
- Phase8 分析記錄 Life 每 seed 670 次、Hybrid 每 seed 449–452 次封頂後 starterSpear 零 XP craft。對應決策時沒有其他合法 recipe，但存在合法交易。這是 policy 下的 smithing chore-risk 訊號，不是規則錯誤或玩家厭倦證據。
- Adventure 每 seed 有 142–143 次相鄰同敵遭遇；多數重複時點另有同 rank 目標可選，顯示 runner 選擇，不是目標不可達。
- Boss 首次列出於遊戲分鐘 480；首次合法挑戰依 route 為 55,883–116,195 分鐘。三年 policy run 沒有觀察到 Elite／MiniBoss，既有分析歸因於 runner exposure limitation；Phase8-B 的另一正常路線曾記錄 64 Elite、1,103 MiniBoss。不可據此推論內容不存在或玩家永遠遇不到。

不設定固定獎勵 cadence，不提出每 X 分鐘獎勵建議。

## Goal continuity 分類

| 案例 | 分類 | 證據與界線 |
|---|---|---|
| Authored monster 可達性 | 未見工程 dead end；有合法世界條件 | `contentReachability.integration.test.ts` 對註冊怪物構造條件 witness，並用正式 `contentEncounterOptions` projection 驗證；只證明有界條件可滿足，不估自然遭遇率 |
| 配方材料與製作路徑 | 有合法條件投影；自然取得仍需路線證據 | `contentItems.integration.test.ts`、`remainingFamilies.integration.test.ts` 使用 `planCraft` 驗證代表性材料、條件及轉化。受控測試 fixture 不等於 fresh-save 自然取得 |
| UI 提示過期 | 尚無已證實不一致 | `projectGoalHints` 依 request、季節作物、encounter eligibility、危機等 canonical state/projection 產生提示；靜態讀碼不構成所有 UI 操作結果的一致性證明 |
| 沒有合法後續動作 | Runner 策略受限或未分類；未證明真正 dead end | 1,276 筆低信心 no-next-goal、147 筆 cap-limited 都不是 dead-end 證據。本輪未對所有狀態執行 legal-action closure |
| UI 顯示可操作但 Domain 拒絕 | 未建立缺陷證據 | 既有 projection／`planCraft` 測試涵蓋部分條件；沒有本輪完整 UI-to-domain 操作矩陣 |
| 玩家可能迷失 | 未驗證的人類體驗問題 | Runner 分類不能代表人的目標理解；留待 Owner 啟動真人 playtest |

## Human Product 邊界與風險

Human Product Gate 維持 **DEFERRED**。本輪沒有真人資料，不能回答遊戲是否有趣、玩家是否形成目標、是否關心 NPC／資產或是否願意繼續。P10-F02 製作 chore-risk、P10-F05 goal/fun/retention，以及 Boss 風險理解留待真人驗證。P10-F04 merchant stock/restock 維持 **NOT MODELED**。

## 證據與限制

- Runner：`node scripts/phase10/c-reward-retention.mjs`，解壓並彙總既有 trace，計算各 route/seed 首次 reward event；未重跑大型 simulation。
- 路線／seed：Phase8 instrumented v3，61101–61103，三年 normal fresh-save scripted policy。
- 環境：歷史 runner 為 Windows／Node；完整參數見 Phase8 instrumented manifest。
- Source correlation：Phase8 HEAD/fingerprint 如上；Phase10-A 確認 Phase9 source 至目前未變更。
- Content validator：Phase10-A semantic validation **PASS、無 errors**；整體 wrapper **INCOMPLETE**，子檢查無法 spawn `npm`（ENOENT），report publisher 找不到 `python3`。不得描述為全流程通過。
- 本輪未執行：validator 重跑、所有狀態的 legal-action closure、production UI/domain 全矩陣、真人測試。
- Goal continuity closure test：`npx.cmd vitest run src/engine/phase10GoalContinuity.test.ts`；3 tests passed，涵蓋 recipe material legal sources、recipe plan／wolf rank unlock／authored encounter witness、以及 seeded season/region hints。

## Review fixes

- Closed the C-review P2 by checking every emitted goal hint's `where` and `position` against the canonical action destination in the seeded season/region fixtures. Request destinations follow request kind/progress and live NPC position; crop and encounter destinations require their legal engine projections; crisis, wolf, and chief destinations use their canonical forest location.
- Added an invalid-route contract: a crop hint routed to the mine must fail the canonical destination assertion.
- Verification: `npx.cmd vitest run src/engine/phase10GoalContinuity.test.ts` — 1 file passed, 3 tests passed. No product mismatch surfaced; no product source was changed.

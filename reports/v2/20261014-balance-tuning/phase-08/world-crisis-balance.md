# Phase8-D 世界與區域危機平衡 — D1 r2／D2 controlled comparison

> 本節為 2026-10-15 D1 r2 lead review 的正式修訂結果，取代舊版「無 succession、捐獻未觸發、農作未售」的結論。D1 只改 runner／分析與報告，沒有改 src 數值。

## 執行矩陣與狀態

六個正常或受控起始世界各跑 3 種子（40131、40132、40133），每種子記錄 Year 10／50／100。各分情境獨立執行，避免單次工作超過 20 分鐘。

| 情境 | attempt | checkpoints | 危機：3-seed 總數／平均每 seed-century／平均每 seed-year | 100 年結果：決定成功／代價成功／挫敗／局部敗退（3-seed 合計） | 平均 readiness |
|---|---|---:|---:|---|---:|
| No Intervention | d-runner/attempt-20261015T014955862Z | 9/9 | 201／67.0／0.670 | 65／37／66／33 | 82.76 |
| Life | d-runner/attempt-20261015T014644160Z | 9/9 | 200／66.7／0.667 | 53／39／75／33 | 82.78 |
| Adventure | d-runner/attempt-20261015T013844292Z | 9/9 | 200／66.7／0.667 | 58／40／69／33 | 82.63 |
| Mixed | d-runner/attempt-20261015T013957951Z | 9/9 | 200／66.7／0.667 | 48／45／71／36 | 83.03 |
| Prosperous controlled | d-runner/attempt-20261015T015049887Z | 9/9 | 203／67.7／0.677 | 66／42／66／29 | 83.86 |
| Struggling controlled | d-runner/attempt-20261015T015144658Z | 9/9 | 203／67.7／0.677 | 63／39／67／34 | 82.45 |

54/54 checkpoints 的 save/reload 與一天續跑相等。所有被記錄的危機皆完成結算，四種 outcome 都出現。各組原始 checkpoints、crises、transitions、actions、deaths、successions 與 daily-balance 都保存在對應 attempt；季節作物與 contribution 探針列於後段。

## 玩家死亡、繼承與 A v3 對照

UI 的繼承清單由 App.vue 對存活、年滿 15 歲居民依 state 順序篩選；選擇時呼叫公開 chooseSuccessor（App.vue:40–41、157；simulation.ts:497–507）。runner 對 Life／Adventure／Mixed 在角色死亡後記錄死亡並選清單第一位合法居民。若無合法繼承人，checkpoint 會因 active player 死亡而標 INVALID。No Intervention 與 Prosperous／Struggling 只改初始世界條件，沒有政策或接班操作，因此不接班。

| 情境 | 死亡紀錄 | 死因與活動 |
|---|---:|---|
| Life | 114 | 114 自然老化，75–89 歲，遊戲年 65–301；年度 aging tick，當下沒有玩家行動。接班 114 次。 |
| Adventure | 144 | 12 戰鬥傷害（17–45 歲、年 2–24，死亡行動為 combat-attack）；132 自然老化（75–89 歲、年 52–299）。接班 144 次。 |
| Mixed | 131 | 11 戰鬥傷害（17–53 歲、年 2–32，combat-attack）；120 自然老化（72–89 歲、年 52–301）。接班 131 次。 |
| No Intervention | 3 | 每個種子各 1 次，自然老化、80 歲、年 65；不執行玩家接班。 |
| Prosperous／Struggling | 各 3 | 每種子各 1 次，自然老化、80 歲、年 65；不執行玩家接班。 |

D1 Adventure 的戰鬥死亡早於自然老化：40131 在年 2、4、8 等年份可見戰鬥傷害死亡；Mixed 三種子也在年 2–9 出現。這是政策風險，不是角色年齡造成。A v3 的三年 Adventure 對照為 0 死亡，三種子 encounters 分別 254、257、257；其 manifest 記載路線輪替森林／礦坑／山谷、裝備升級、戰鬥／休息門檻及普通怪每日最多三次。D1 Adventure 僅每 60 日進一次森林遭遇，打到戰鬥結束，不撤退也不升級裝備。兩個腳本路線風險不同，不能把 A v3 低死亡率外推到 D1 policy。對照資料：a-baseline-run/attempt-20261014T040039340Z/manifest.json、completion.json；死亡數為 A v3 lead review 已確認結果。

## 威脅成長、守衛、危機結果與擊殺

引擎每日 monsterPopulation 變化為 growthRate − guards × .035，初始 growthRate=.65（simulation.ts:205、317–326）。以修正後的完整 dailyTick 記帳，六情境加權守衛抵銷平均為 `.3022277006/day`（8.63508 名合格守衛）；No Intervention／Life／Adventure 三政策平均為 `.3000373920/day`（8.57250 名）。Year 100 的 threatLevel 六情境全部仍在最高 Threat 3；monsterPopulation 平均為 93.34–100。這是最高 band 封頂與長期高人口，不代表威脅已穩定恢復。

以下同時標明三種子合計、單一種子百年（seed-century）平均，以及每 seed-year 平均；不能把三 seed 總和當成一個世界世紀：

| 情境 | 守衛抵銷／日 | 自然成長（三 seed 總數／seed-century） | 守衛抵銷（三 seed 總數／seed-century） | Crisis outcome Δ（三 seed 總數／seed-century／seed-year） | NPC 獨立 boss 勝利（三 seed／seed-century） | combat action 測得減量（三 seed／seed-century） |
|---|---:|---:|---:|---:|---:|---:|
| No Intervention | .300189 | +70,200／+23,400 | −32,420.36／−10,806.79 | −957.450／−319.150／−3.1915 | 106／35.33 | 0／0 |
| Adventure | .297255 | +70,200／+23,400 | −32,103.505／−10,701.168 | −845.705／−281.902／−2.8190 | 100／33.33 | 8,934.63／2,978.21 |
| Mixed | .300367 | +70,200／+23,400 | −32,439.610／−10,813.203 | −715.295／−238.432／−2.3843 | 116／38.67 | 8,930／2,976.67 |

`seed-century` 是單一種子 100 年；上表三 seed 總數涵蓋 300 seed-years。自然成長及守衛抵銷來自完整 108,000 個日界線；crisis outcome Δ 與原始 `crises.json` 的 `resolutionSummary.applied.monsterPopulation` 對帳。NPC boss 減量依獨立 boss 勝利每次 −25 計，combat action 測值由 action 前後 monsterPopulation 記錄（livingEvents.ts:343–361、actions.ts:340–349），作獨立指標，不加回 dailyTick 預算，以免重複計入 action 期間推進的日界線。Adventure／Mixed 的成長扣除守衛後仍約 +12,699／+12,587 點每 seed-century；boss 與 crisis outcome 再減，未封頂的總壓力仍為正。monsterPopulation 有 0–100 上下限，封頂後會隱藏超額壓力。

危機 outcome 的單次 monsterPopulation 變化是決定成功 −12、代價成功 −6、挫敗 +4、局部敗退 +10（simulation.ts:35–38）。在受測頻率與結果組合下，Crisis outcome 每 seed-century 淨減約 238–319 點，折算每 seed-year 約 2.38–3.19 點；三 seed 原始總量則是 −715.295 至 −957.450。這與每日自然成長淨額是不同時間尺度：自然成長扣除守衛後約 +12,587 至 +12,699 點／seed-century。NPC boss 勝利可實際移除 25 點，玩家擊殺可移除 5 點，所以引擎存在可降低威脅的路徑；但在 D1 Adventure／Mixed 節奏下沒有形成長期恢復：Year 50/100 多數世界仍 Threat 3 且 monsterPopulation 接近 100。D1 不宣稱測試路線可穩定回到低威脅 band。

Adventure 與 Mixed 相對 No Intervention 有可測但有限的變化：Year 10 平均 monsterPopulation 分別低 2.27／3.98；Year 50 Adventure 低 1.67、Mixed 無差；Year 100 Adventure 低 3.33、Mixed 無差。Adventure 的 Year 100 平均 safety 51.25，No Intervention 為 30.85；但 Adventure 三種子差異很大（其中一個仍在安全下限附近），不可把平均值解讀成每個世界都恢復。Mixed Year 100 safety 25.02，與 No Intervention 接近。NPC／玩家活動尚未扭轉整體 threat ceiling。

危機是每情境三 seed、各 100 年的總數 200–203 場；換算約 67 場／單一 seed-century、約 0.67 場／seed-year。平均 readiness 約 82.45–83.86，四種 outcome 均實際出現；不是固定成功。NPC boss 勝利約 33–39 次／seed-century。population 維持約 79–80、food 約 100、prosperity 約 99–100，故目前證據不支持 Population Death Spiral 或 Permanent Settlement Decline；Safety 在多數一般情境長期貼近 25 下限。No Intervention 的貢獻 ledger 保持空白，而 NPC 同時會成功與失敗，不是永遠自動勝利。

## 貢獻主導性：Controlled deficit

受控 fixture（清楚標記為 controlled）：severity／threat 3、monster 100、boss 存活、food=0、safety=25，4 名守衛、5 名農夫、合格玩家位於交接點，角色有 25 食物與 10,000 金幣。baseline 有 food shortage 17.2、gold need 75、equipment shortage 8 格、defender shortage 4 人；Readiness 31.60、success chance 10%。

等量操作採「一個公開捐獻呼叫／一件裝備／一個守衛職位調整」作 action-count proxy。這不是食物、金幣、裝備、勞動力的經濟價值等價；各項實際成本同時記錄：

| 單次介入 | 實際成本 | Readiness Δ | success chance Δ |
|---|---:|---:|---:|
| 食物 | 1 個背包食物（供應 4） | +0.87 | 0 |
| 金幣 | 5 gold | +0.40 | 0 |
| 裝備 | 1 件 common Lv.1 裝備 | +0.39 | 0 |
| 守衛 | 1 名居民在 controlled fixture 調整為 guard | +3.75 | 0 |
| 混合 | 上述各一項 | +5.34 | 0 |

另以需求邊界測試最大可用方案：食物 4 個（16 供應）Readiness +3.49；金幣 75（該 fixture 的可用金援容量）+6.00；裝備 8 個可用槽位 +2.67；補 4 名 guard 到 8 人目標 +15.00；混合四者 +25.83，success chance 由 10% 到 19%。各自單一方案都沒有消除其他缺口；最低成本的單位捐贈更沒有提升 success chance。因此目前沒有「單一廉價捐贈完全取代其他貢獻」的證據。等量單位測試中 chance 多留在 10% 是公式下限，不代表 readiness 沒變。

程式 per-crisis cap 為 food 100、gold 100、equipment 16 allocations；本 fixture 實際 gear slots 只有 8，gold 可用量因 logistics workforce 限制為 75，defender target 為 8（domain/crisis.ts:69–74、civilDefense.ts:172–202）。結果與完整輸入保存在 d-runner/attempt-20261015T013225137Z-contributions/contribution-probes.json。不同資源沒有自然的共同成本單位，D2 應保留這項限制，不把 action-count proxy 寫成真正等價的金錢成本。

## V4 季節農作 10 年金幣檢查

季節 crop choices 由 farmCropChoices 依當前季節與區域產生，Farm UI／runner 使用相同公開選擇；收成 goods 再以公開 tradeMaterial 售出（crops.ts、farmCrops.ts、rewardActions.ts）。attempt d-runner/attempt-20261015T013314949Z；三種子各收成 18 次、出售 136 件 goods，起始 45 gold、Year 10 結算 1,241 gold，淨增 1,196。一般 Life wheat 路線沒有出售作物，Year 100 gold 仍為 45。

| 實際種植 crop | 合法季節 | 成熟時間 | 本次收成量 | 每件售價 | 每件食物值 | 每成熟批總售價 |
|---|---|---:|---:|---:|---:|---:|
| marsh rice | 夏／秋 | 5,760 分（4 日） | 8–10 | 11 | 3 | 88–110 |
| winter cabbage | 冬 | 4,320 分（3 日） | 7–8 | 9 | 3 | 63–72 |
| spring pea | 春 | 720 分（0.5 日） | 6 | 2 | 1 | 12 |

三種子合計：marsh rice 33 批／273 件／3,003 gold；winter cabbage 6 批／45 件／405 gold；spring pea 15 批／90 件／180 gold。這是低頻率售貨政策：每 seed 在 10 年內僅 18 次 harvest，起始 45 G、期末 1,241 G 的 27.6 倍是該腳本政策的金幣存量變化，不能單獨作為 inflation 訊號。Phase8-C 的 seasonal-farm-sell 在 V4 下，3 年每 seed 作物銷售額為 22,315 G；它是較高頻率路線的 gross crop sales，與本次 10 年路線的期末金幣存量（含初始 45 G）並非同一指標或時間窗，兩者差異應解讀為路線／行動頻率及衡量口徑差異，不能用 27.6× 比率推論通膨。表內「成熟時間」只計作物生長，不包含政策等待、移動、種植、收成與出售所耗遊戲日，因此不能視為玩家實際 gold/day。完整售貨紀錄在 crop-sales.json；合法季節及成熟、產量、單價來自 runtime crop choices 與 farmCrops.ts。

## Prosperous／Struggling 走勢

相同三種子 controlled 起點：Year 10 safety 平均 Prosperous 99.30、Struggling 97.32；Year 50 為 28.55／34.28；Year 100 為 70.13／26.50。兩組 food 都到 100，prosperity 到 Year 10 為 100／99，之後均 100，monster population Year 100 為 95.46／96.25。這表示 food／prosperity 約在前十年收斂，但 safety 不收斂；Year 100 的安全差異可能由 boss／危機亂數路徑造成，起始聚落 fixture 不能單獨證明因果。

## D2 提案再決策：依 Phase8 §4 五問逐項回答

### 1. Threat growth、守衛與 safety

1. **原始問題：** Threat 3 飽和、怪物增長與 Safety 長期下限是否造成不可逆世界壓力。
2. **證據：** growth .65／日、guard 約 −.30／日；No Intervention／Adventure／Mixed 的長期 budget 扣除 Crisis 與擊殺後仍為正，Year 100 仍多為 Threat 3；但人口、糧食、繁榮未崩潰。
3. **期望行為：** 玩家與 NPC 可透過守衛、擊殺、boss defeat 降低壓力，世界也應能在低壓路徑出現持續恢復。
4. **實際修改：** D1／D2 均未調正式數值。D2 已用同 seed 矩陣比較執行期 growthRate 與 guard offset；數據及 Owner 待決項見下節。
5. **回歸檢查：** 重看最高 threat band、Boss／危機頻率、Safety floor、Combat 難度與世界存續，不讓降低 Threat 使危機消失或讓守衛成唯一答案。

### 2. Crisis 頻率、結果與 NPC 自治

1. **原始問題：** 危機是否過密，NPC 是否永遠自動成功，以及結算後能否降低世界壓力。
2. **證據：** 每情境三 seed、各 100 年合計約 200–203 場；折算約 67 場／seed-century、約 0.67 場／seed-year。四種 outcome 都出現、平均 readiness 82.45–83.86；NPC boss wins 與多種 crisis 結果均實際改變 monsterPopulation，沒有全成功。
3. **期望行為：** 危機頻率與 outcome 應受世界狀態影響，失敗會付出代價但不讓聚落必然崩潰。
4. **實際修改：** 保持現有 crisis 公式；D2 增加跨 outcome 後的低壓恢復觀測，暫不改 cooldown 或成功率。
5. **回歸檢查：** 留意 outcome 分布、間隔、readiness、NPC 成功／失敗、food／population 與 aftermath，不把所有世界推成永遠成功或永遠失敗。

### 3. Food／gold／equipment／defenders 貢獻

1. **原始問題：** 一項便宜捐獻能否完全取代其他支援。
2. **證據：** controlled fixture 等量介入最大單因子 Readiness 為單名 guard +3.75；食物 +0.87、5 gold +0.40、單件裝備 +0.39。混合 +5.34；需求邊界的混合方案 +25.83，高於任何單一方案。
3. **期望行為：** 玩家能依缺口選擇供應、裝備、金援或戰鬥／守衛，沒有低成本的一鍵支配方案。
4. **實際修改：** D1 不改 cap 或權重；D2 保留每因子測試，明確把等量 action-count 當代理成本而非金錢等價。
5. **回歸檢查：** 測到 per-crisis cap 及 workforce 限制，確認最低成本項目沒有覆蓋其他需求，也不讓單項貢獻變得毫無作用。

### 4. Player route mortality 與世界接續

1. **原始問題：** Adventure／Mixed 早期戰鬥死亡是否為 aging，或由 runner policy 過度冒險；角色死後政策不得退化成 No Intervention。
2. **證據：** Adventure 12、Mixed 11 筆戰鬥傷害死亡在年 2–32、年齡 17–53；其餘為年度老化。A v3 在三年與更高遭遇量下 0 死亡，route 有裝備升級、區域輪替、戰鬥／休息門檻。D1 加入 UI 等價 succession，player-policy checkpoints 27/27 存活。
3. **期望行為：** 世界在玩家死亡後可透過合法成年居民接續；Life 不被迫戰鬥，Adventure route 的風險由玩家裝備／休息／撤退決策控制。
4. **實際修改：** D1 只修 runner，死亡立即記錄並用公開 chooseSuccessor 延續同一政策；不改戰鬥數值。D2 可比較風險感知 route，但不得把單一政策當成所有玩家的正解。
5. **回歸檢查：** 保留死亡原因與活動、接班合法性、無後繼時 INVALID gate、Life 零主動戰鬥及危機中的世界延續。

### 5. Seasonal farm-sale 通膨與聚落起點

1. **原始問題：** V4 下合法季節作物售貨是否造成金幣快速膨脹；Prosperous／Struggling 是否長期不同或快速收斂。
2. **證據：** 同三種子 10 年 seasonal Life gold 45→1,241；wheat-only Life 不售貨、100 年仍45。Seasonal route 出售 marsh rice／winter cabbage／spring pea；food／prosperity 在十年內收斂，safety 未收斂。
3. **期望行為：** 季節 farm goods 有可理解的售貨回報且仍保留供糧選擇；聚落起點能在早期造成差異，後期結果由世界與玩家政策共同決定。
4. **實際修改：** D1 加入合法作物選擇與售貨 runner，不改內容／價格。D2 以同 seed、同 10 年 window 比較 gather、craft、adventure 與 seasonal farming 的實際金幣與時間成本，完成比較前不建議 nerf 售價。
5. **回歸檢查：** 同時檢查金幣存量、供糧、季節合法性、crop goods 售價與其他職業收入，不用單一專注農作路線取代全經濟平衡。

## D2 controlled comparison

**Owner design decision required；此報告不替 Owner 選擇正式數值。** Phase6 spec §Recovery Gate 明定「世界根據 Threat / World State 產生危機」，並要求沒有單一廉價資源可無限 spam、具有多種 outcome；Phase8 §8 將 Threat Spiral 列為需排查的風險。這些是行為與風險契約，沒有指定怪物人口平衡值或目標 Threat band。Phase6 `baseline.md` 描述現況為「Threat growth is currently `growthRate - guards*.035` (bounded population)」；`qa-runner-plan.md` 記錄初始 4 名守衛每日抵銷 0.14，且自然抵達危機門檻的時間依 seed 而異。`git log -S growthRate -- src/engine/simulation.ts` 只找到最初加入 `.65`／`.035` 的 `75662ae`；該提交、Phase6 ticket／report、CHANGELOG 及現存 docs 沒有選值或刻意飽和的平衡理由，未找到 ADR。因此目前不能把 Threat 3 飽和判定為既定設計意圖。

受控方法：沿用 seeds 40131–40133、No Intervention／Life／Adventure 與 Year 10／50／100；僅在 runner 記憶體覆寫初始 `state.threat.growthRate`，並由 Vite pre-transform 將模擬器守衛係數換成指定值，未寫入或修改 `src/`。原始 manifest 的候選精確值為 G1 `.299319489084277`、G2 `.474659744542139`、K1 guard `.0760057424580011`。G1 來自舊 D1 記帳下三政策按已記錄日數加權的觀測平均；當時舊全六情境平均是 `.3015056764/day`，差 `.0021861873/day`（0.725%），Lead 已拒絕為此差距改跑 `.3015`，因此保留原候選。修正後完整 dailyTick 的六情境加權平均為 `.3022277006/day`，三政策平均為 `.3000373920/day`。既有 G1 值與修正後六情境平均相差 `.0029082115/day`（0.963%）；與修正後三政策平均相差 `.0007179029/day`（0.239%）。本次先以報告顯示的短小數做預算診斷，之後以 manifest 精確值補跑並作為目前比較來源；沒有用 `.3022277` 取代 G1。修正後平均合格守衛分別是全六情境 8.63508、三政策 8.57250。若依校正後全六情境重新推導，候選會是 G2 中點 `.4761138503`、K1 `.65 / 8.6350772 = .0752743708`（若只用三政策則為 `.4750186960`／`.0758238827`）。這些替代值未執行模擬，不將其當作比較結果；Owner 可決定是否授權新一輪候選測試。V0 為同期控制。

12 個校正 run 各含 3 seeds、Year 10／50／100，產生 108/108 checkpoints；save/reload 與續跑相等 108/108。原始 D2 attempts 全部保留；另有一次沙盒內 Vite spawn EPERM 的 manifest-only attempt（attempt-20261015T020119827Z）保留。G1 Adventure 保存 9/9 checkpoints，但 0 場危機、0 phase transition，依既有 `no-crisis-phase-evidence` gate 標 INVALID；此結果保留。所有實際觸發的危機均完成結算。Year100 各政策人口平均 79.33–80、food 與 prosperity 均為 100，未觀察到聚落衰退。Life policy 四個 variants 都是 0 個 combat／encounter actions，沒有被迫戰鬥。

校正 runner 在 `simulate()` 外層與所有 action 內部 `simulate()` 都記錄 tracked live state 的實際 worldTime 增量；dailyTick 鉤子在套用公式時記下 growth 與合格 guards，並逐個 canonical 日界線累計 band／population／Safety。12/12 run 的 `simulatedMinutes == elapsedMinutes`、dailyTick 數與世界時間推導的日界線相等；三 seed 共 108,000 tick。每個 run 的逐 tick crisis outcome Δ 都與原始 `crises.json` resolution delta 相等（`accountingValid=true`）。Mixed seed 40133 舊帳曾差 4 點，修正後對帳一致。摘要含完整檢查欄位：`d-runner/d2-controlled/comparison-summary.json`；每 seed 日統計、危機、動作及 checkpoint 留在新 attempts。Threat3 與 Safety floor 是 108,000 tick 的比例；危機數與 outcome 是三 seed 合計百年值，括號列平均每 seed-century；危機間隔是各 seed 內間隔 pooled 後的中位數（偶數樣本取中間兩值平均）；Boss 與 Year100 聚落指標是三 seed checkpoint 平均。Outcome 次序：決定成功／代價成功／挫敗／局部敗退。

| Variant／政策 | growth／guard | 怪物平均 Y10／Y50／Y100 | Threat3 全期 | Safety Y100／floor 全期 | 危機 3-seed 總數／每 seed-century／每 seed-year／間隔中位數 | Outcome DS／CS／挫敗／局部敗退（3-seed 總數） | Boss Y100 平均 | Y100 人口／Food／Prosperity 平均 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| V0 No Intervention | .65／.035 | 93.26／100／100 | 99.69% | 30.85／33.12% | 201／67.0／.670／544.5日 | 65／37／66／33 | 36.33 | 80／100／100 |
| V0 Life | .65／.035 | 100／100／93.34 | 99.69% | 29.45／31.43% | 200／66.7／.667／549日 | 53／39／75／33 | 34.00 | 79.33／100／100 |
| V0 Adventure | .65／.035 | 90.99／98.33／96.67 | 99.63% | 51.25／36.33% | 200／66.7／.667／545日 | 58／40／69／33 | 34.33 | 79.67／100／100 |
| G1 No Intervention | .29932／.035 | 0／11.07／3.68 | 3.70% | 100／2.71% | 45／15.0／.150／521.5日 | 23／11／8／3 | 41.33 | 80／100／100 |
| G1 Life | .29932／.035 | 0／26.67／1.67 | 3.28% | 98.63／2.51% | 46／15.3／.153／529日 | 20／14／9／3 | 37.00 | 80／100／100 |
| G1 Adventure | .29932／.035 | 0／0／1.60 | 0% | 100／0% | 0／0／0／無 | 0／0／0／0 | 28.33 | 80／100／100 |
| G2 No Intervention | .47466／.035 | 85.53／100／100 | 99.34% | 29.33／33.14% | 200／66.7／.667／554日 | 57／35／63／45 | 32.00 | 79.67／100／100 |
| G2 Life | .47466／.035 | 94.22／93.80／99.73 | 99.35% | 33.88／32.07% | 201／67.0／.670／543日 | 59／38／80／24 | 34.33 | 80／100／100 |
| G2 Adventure | .47466／.035 | 45.21／94.10／98.33 | 93.96% | 33.68／30.04% | 200／66.7／.667／547日 | 58／41／64／37 | 34.33 | 80／100／100 |
| K1 No Intervention | .65／.07601 | .01／41.45／31.52 | 23.60% | 94.82／12.00% | 119／39.7／.397／525.5日 | 54／34／24／7 | 37.00 | 79.67／100／100 |
| K1 Life | .65／.07601 | 0／36.01／23.18 | 18.85% | 90.80／9.25% | 91／30.3／.303／557日 | 35／22／21／13 | 38.00 | 79.67／100／100 |
| K1 Adventure | .65／.07601 | .04／.01／1.10 | 2.62% | 100／2.17% | 22／7.3／.073／562日 | 10／8／4／0 | 29.00 | 80／100／100 |

各變體的 daily budget 與 crisis outcome monsterPopulation Δ（危機數與 Δ 均列三 seed 總數、每 seed-century、每 seed-year）：

| Variant／政策 | growth／guard 抵銷每日平均 | 危機數：3-seed／每 seed-century／每 seed-year | Crisis outcome Δ：3-seed／每 seed-century／每 seed-year | 分鐘、日界線、`crises.json` 對帳 |
|---|---:|---:|---:|---|
| V0 No Intervention | .65／.3002 | 201／67.0／.670 | −957.450／−319.150／−3.1915 | 全部相等 |
| V0 Life | .65／.3027 | 200／66.7／.667 | −849.570／−283.190／−2.8319 | 全部相等 |
| V0 Adventure | .65／.2973 | 200／66.7／.667 | −845.705／−281.902／−2.8190 | 全部相等 |
| G1 No Intervention | .2993／.2909 | 45／15.0／.150 | −273.724／−91.241／−.9124 | 全部相等 |
| G1 Life | .2993／.2898 | 46／15.3／.153 | −259.920／−86.640／−.8664 | 全部相等 |
| G1 Adventure | .2993／.2881 | 0／0／0 | 0／0／0 | 全部相等；無危機 |
| G2 No Intervention | .4747／.3005 | 200／66.7／.667 | −834.546／−278.182／−2.7818 | 全部相等 |
| G2 Life | .4747／.3002 | 201／67.0／.670 | −897.970／−299.323／−2.9932 | 全部相等 |
| G2 Adventure | .4747／.2991 | 200／66.7／.667 | −709.936／−236.645／−2.3665 | 全部相等 |
| K1 No Intervention | .65／.6329 | 119／39.7／.397 | −717.227／−239.076／−2.3908 | 全部相等 |
| K1 Life | .65／.6410 | 91／30.3／.303 | −402.441／−134.147／−1.3415 | 全部相等 |
| K1 Adventure | .65／.6278 | 22／7.3／.073 | −158.143／−52.714／−.5271 | 全部相等 |

### 依 Phase8 §4 五問：各 variant 決策記錄

#### V0 — 現行值 `.65`／`.035`

1. **原始問題：** 三條政策百年內幾乎全程 Threat3，monsterPopulation 被 100 上限遮住超額壓力，Safety 常到 25 下限。
2. **支持證據：** 三政策 Threat3 全期 99.63–99.69%；危機為 200–201 場／三 seed／百年，即 66.7–67.0 場／seed-century，四種 outcome 都出現；Year100 怪物平均 93.34–100、Safety 29.45–51.25、Safety≤25 時間 31.43–36.33%。
3. **預期玩家／世界行為：** Life 與 Adventure 都能參與危機，世界有高低壓期而非永久最高威脅。
4. **實際修改：** 以 `.65`／`.035` 重跑同期控制組；正式數值未改。
5. **回歸風險：** 現值保留飽和與 Safety 下限壓力；若視為設計意圖，需 Owner 確認，因現存文件沒有此意圖紀錄。

#### G1 — growth `.2993194891`，等於觀測平均守衛抵銷

1. **原始問題：** 平均守衛數下，`.65 − 約 .30` 留下正向每日威脅漂移。
2. **支持證據：** No Intervention／Life 的 Threat3 佔 3.70%／3.28%，Year100 怪物平均 3.68／1.67、Safety 100／98.63；危機是三 seed 總數 45／46，平均 15.0／15.3 場／seed-century，四種 outcome 都出現。Adventure 怪物趨近零、危機為零，觸發 validity gate。
3. **預期玩家／世界行為：** 平均守衛配置可令威脅自然消退，使低壓世界恢復。
4. **實際修改：** runner 只覆寫初始 growth `.2993194891`，模擬守衛係數 `.035`；沒有改 `src/`。
5. **回歸風險：** Adventure 戰鬥擊殺後威脅清空並令危機消失；不適合作為單一全域值。

#### G2 — growth `.4746597445`，位於 G1 與現值中點

1. **原始問題：** 檢查較小調整能否減緩飽和並保留危機。
2. **支持證據：** 三政策危機各為 200–201 場／三 seed／100 年，折算 66.7–67.0 場／seed-century；四種 outcome 都出現。Threat3 仍佔 93.96–99.35%，Year100 怪物 98.33–100、Safety≤25 時間 30.04–33.14%。
3. **預期玩家／世界行為：** 降低威脅累積，同時維持危機循環與 Life／Adventure 參與。
4. **實際修改：** runner 只覆寫 growth `.4746597445`、guard `.035`；正式數值未改。
5. **回歸風險：** 百年資料幾乎未改善 Threat3／Safety floor，不能證明此額外政策值值得採用。

#### K1 — growth `.65`，guard coefficient `.0760057425`

1. **原始問題：** 以提高守衛抵銷而非降低成長率，測試是否保留守衛配置對世界的影響。
2. **支持證據：** No Intervention／Life Threat3 佔 23.60%／18.85%，Year100 怪物 31.52／23.18、Safety 94.82／90.80。Adventure Year100 怪物 1.10、Threat3 2.62%，危機三 seed 合計 22 場（7.3 場／seed-century）且沒有 local defeat。
3. **預期玩家／世界行為：** 合格守衛能平抑威脅，但不應讓 Adventure 危機變得罕見或結果種類消失。
4. **實際修改：** Vite 載入模組的守衛乘數在 runner 中轉換為 `.0760057425`，growth 保持 `.65`；沒有改 `src/`。
5. **回歸風險：** Adventure 的怪物／危機大幅減少且缺一種 outcome；守衛職業配置可能過度主導世界狀態。

**比較結論：** G2 保留危機但未改善飽和；G1 讓 No Intervention／Life 恢復，卻使 Adventure 危機消失；K1 在三政策降低飽和，但 Adventure 只有 22 場／三 seed／100 年（7.3 場／seed-century），且缺 local defeat。資料證實現值下 Threat3 飽和，也顯示單一全域調整可能令 Adventure 危機過少或消失。Phase8 沒有給定 monster、Threat3 占比或危機頻率目標值；由 Owner 決定保留現值、採守衛敏感的路徑或授權分情境方案。本輪不落地任何候選值。

目前彙總使用的精確參數校正 attempts（每個含三 seed／三 horizon；原始及短小數診斷 attempts 另保留）：V0 `attempt-20261015T023846374Z`／`023929673Z`／`024022650Z`；G1 `attempt-20261015T030444138Z`／`030608188Z`／`030734989Z`；G2 `attempt-20261015T030900918Z`／`031015899Z`／`031148826Z`；K1 `attempt-20261015T031326865Z`／`031450035Z`／`031756483Z`，都位於 `d-runner/d2-controlled/`。G1 Adventure 為唯一 INVALID，attempt 保留。彙總：`d-runner/d2-controlled/comparison-summary.json`。

## Owner 決策（2026-10-15）

**D-F1（High，product）— Threat 飽和：KEEP V0，Phase8 不改數值。** Owner 審閱 D2 controlled comparison 後選擇維持現值（growth .65、guard .035）並記錄為產品 Finding：現值下 Threat 3 占全期約 99.6–99.7%、Safety 常貼下限；本次受測的單一參數候選各有明顯取捨——G2 仍飽和（Threat 3 約 94–99%），G1 使怪物近乎歸零、危機降至約 15 場／seed-century，且 G1 Adventure 為 0 場危機（validity gate 判 INVALID）；K1 在 No Intervention／Life 呈現中間結果（Threat 3 約 24%／19%、危機約 40／30 場／seed-century），但 Adventure 只剩約 7 場／seed-century 且無局部敗退。這些是有限的受測值，不代表參數空間不存在中間平衡點；現行公式為線性淨增減、沒有隨族群遞減的回饋，結果對政策與參數敏感。後續 Phase 可評估穩定回饋設計（例如隨族群遞減的增長）；Phase8 不落地 G1／G2／K1。人口、食物、繁榮在全部變體維持正常，世界未重置。

## 驗證命令

- node --test scripts/phase8/test_world_crisis_core.mjs — 3 passed、0 failed（含 continuation parity false 的 INVALID case 與偶數樣本中位數）。
- node scripts/phase8/run-world-crisis.mjs --scenario=<one-scenario> — 六個 full 100-year 情境各 3 seed，全部 9/9 checkpoints VALID。
- node scripts/phase8/run-world-crisis.mjs --scenario=life-seasonal-sell --years=10 — 3/3 種子 VALID，54 harvest-sale rows；實際 gold 期末 1,241。
- node scripts/phase8/run-crisis-contribution-assay.mjs — controlled probe 10 rows，五個 equal-action 與五個 maximum-useful 方案完成。
- node scripts/phase8/analyze-world-crisis-r2.mjs — 匯總各 attempt 的 matrix、death、daily balance、crop 與 contribution 證據。
- node scripts/phase8/analyze-threat-comparison.mjs — 匯總 D2 四組 in-memory variants、每日 Threat／Safety 分布、危機與三個 checkpoint。
- 一次整體矩陣嘗試只寫出 manifest、未產生 checkpoints；保留未完成 attempt-20261014T104319045Z，後續以情境／年份 CLI 分批有效完成。所有 attempts 均未刪除。

## 來源

docs/specs/V2X-PHASE8-BALANCE-TUNING.md §4、§8；src/App.vue:40–41、157；src/engine/simulation.ts:35–38、205、299、317–326、497–507；src/engine/actions.ts:340–349；src/engine/livingEvents.ts:336–361；src/engine/civilDefense.ts:141–205；src/domain/crisis.ts:69–74；src/engine/crops.ts；src/data/content/farmCrops.ts；src/engine/rewardActions.ts。A v3 對照：reports/v2/20261014-balance-tuning/phase-08/a-baseline-run/attempt-20261014T040039340Z/{manifest.json,completion.json}。




# D1 Runner Summary — Revision 2

**狀態：VALID；已完成 D1 r2 Max review 的帳務、分母與驗證修正，並完成 D2 校正重跑。**

## 執行與驗收

- 六個世界情境各以 seeds 40131–40133 執行 10／50／100 年，共 54 checkpoints；每情境 9/9 有效，save/reload 與續跑一天均 54/54 相等。
- 合計 1,207 場危機是六情境、每情境三種子百年的總數；折算約 67 場／單一 seed-century（約 .67 場／seed-year），不是每一個世界百年的 1,207 場。共 6,034 個階段轉換、18,995 筆政策動作；四種結果皆出現。
- `node --test scripts/phase8/test_world_crisis_core.mjs`：3 passed、0 failed。Validity gate 同時拒絕 save/reload 或 continuation 不相等，亦保留未接班死亡檢查；even-sample interval median 取中間兩值平均。
- 六組 100 年矩陣分次執行，每次均在 20 分鐘內完成；另有 10 年季節作物銷售組與受控捐獻探針。
- 未改 src/、未跑 npm/Vitest、未提交或推送。保留所有 attempts，包括只產生 manifest 的未完成嘗試。

## Max Review：完整模擬時間與 Crisis 帳務

- runner 的 in-memory instrumentation 包住 exported `simulate()`，只累加目前 live world state 的實際 worldTime 變化，包含 action 內 `simulate()`；preview、save/reload 續跑 clone 不列入世界時間。dailyTick 在引擎套用 growth／guard 公式時捕捉實際 inputs，並記錄每個 canonical 日界線的 threat、population、Safety 與危機 outcome delta。
- D1 budget 校正 attempts：`d1-budget-corrected/attempt-20261015T023220480Z`（No Intervention）及 `attempt-20261015T023346153Z`（其餘五情境）。每 seed 36,000 daily ticks；分鐘差、推導日界線數與實測 tick 數相等，crisis outcome delta 逐 seed 與 `crises.json` 相等。
- D1 No Intervention／Adventure／Mixed 每 seed-century 的 crisis monsterPopulation Δ 分別為 −319.150／−281.902／−238.432；相應三 seed 原始總量為 −957.450／−845.705／−715.295，折算每 seed-year 為 −3.1915／−2.8190／−2.3843。守衛抵銷日均為 .300189／.297255／.300367；自然成長每 seed-century +23,400。舊表把每年值寫成百年值，已在主報告更正。
- 初始 3,600、10 年 Life smoke run 覆蓋 action 內計時且對帳相等；正式 D1 六情境 18 個 seed rows 均有 `simulatedMinutesCovered`、`dailyTicksCovered`、`crisisDeltaReconciles=true`。舊 Mixed seed 40133 crisis Δ 曾差 4 點，修正鉤子後現與原始危機記錄相等。

## 主要證據

- Succession 僅用於 Life、Adventure、Mixed 政策：照 App.vue 的成年且存活 NPC 清單順序挑選，呼叫公開 chooseSuccessor。No Intervention 與聚落控制組不接班，避免把選擇繼承人算成玩家介入。
- active-policy 全部 27 checkpoints 都存活；Life／Adventure／Mixed 記錄 389 次死亡及 389 次接班。Adventure 12 次戰鬥傷害死亡（17–45 歲、遊戲年 2–24），另有 132 次自然老化；Mixed 11 次戰鬥傷害死亡（17–53 歲、年 2–32），另有 120 次自然老化。每筆死亡皆記錄原因、年齡、年份、情境與當時活動；老化死亡標為年度老化模擬 tick，非玩家行動。
- A v3 三年冒險路線 0 死亡，三種子各有 254／257／257 次 encounters；其 manifest 記載跨森林／礦坑／山谷、裝備升級與戰鬥／休息門檻。D1 Adventure 只在 60 日週期進森林且不撤退、不升級裝備，因此早期戰鬥死亡是路線風險差異，不是自然老化。細節見主報告。
- 每日怪物成長 +0.65、平均守衛抵銷約 −0.30，未封頂時仍約 +0.35／日。危機結果、NPC boss defeat 與玩家擊殺雖降低怪物量，累計減壓仍不足以逆轉長期淨成長；Threat 3 封頂與安全值壓力仍持續。
- Controlled deficit 探針有食物缺口 17.2、金援需求 75、裝備缺口 8 格、守衛缺口 4 名。等量單次介入的 Readiness 增量：食物 +0.87、金幣 +0.40、裝備 +0.39、守衛 +3.75；混合 +5.34。沒有一種低成本捐贈取代其他因子。
- 季節作物路線以公開 crop choices 選合法作物、收成並透過公開材料交易售出；這是低頻率政策，每 seed 在 10 年僅收成 18 次，gold 45 → 1,241（+1,196）。Phase8-C 的 V4 seasonal-farm-sell 則為 3 年每 seed 22,315 G crop sales；一個是期末金幣存量差、一個是作物 gross sales，路線頻率與時間窗也不同，不能將 27.6× 比率解讀為通膨。合法作物含夏／秋 marsh rice、冬 winter cabbage、春 spring pea；產量、成熟時間與單價列於主報告。
- Prosperous 與 Struggling 的 food／prosperity 到 Year 10 均接近上限並於後續收斂；Year 100 平均 safety 分別 70.13 與 26.50，monster population 為 95.46 與 96.25。安全與怪物差異仍受亂數事件影響，不能單由起始狀態推論因果。

## 證據位置

主報告：world-crisis-balance.md。

核心 attempts：

- No Intervention：attempt-20261015T014955862Z
- Life：attempt-20261015T014644160Z
- Adventure：attempt-20261015T013844292Z
- Mixed：attempt-20261015T013957951Z
- Prosperous：attempt-20261015T015049887Z
- Struggling：attempt-20261015T015144658Z
- Seasonal crop sale：attempt-20261015T013314949Z
- Contribution assay：attempt-20261015T013225137Z-contributions


## D2 受控威脅成長比較

- 四組參數（V0 `.65/.035`、G1 growth `.299319489084277`、G2 growth `.474659744542139`、K1 guard `.0760057424580011`）各比較 No Intervention／Life／Adventure，同 seed 40131–40133、Year 10／50／100。原始 12 runs、短小數帳務診斷 12 runs 與最後按原始 manifest 精確值執行的 12 runs 全數保留；目前 comparison summary 指向最後精確值組，108/108 checkpoints、save/reload 108/108、續跑 108/108。另有一次沙盒內 Vite `spawn EPERM` 的 manifest-only attempt，完整保留。
- 舊 D1 runner 完整六情境平均為 `.3015056764/day`、三政策為 `.2993194891/day`，兩者漏記 action 內日界線；當時兩者差 `.0021861873/day`（0.725%），Lead 決定不改用 `.3015`。校正後六情境加權平均為 `.3022277006/day`（8.63508 eligible guards），三政策平均 `.3000373920/day`（8.57250 guards）。manifest 精確 G1 `.299319489084277` 與校正六情境平均差 `.0029082115/day`（0.963%），與校正三政策平均差 `.0007179029/day`（0.239%）。D2 計時補跑維持同一 G1 候選。按校正後全六情境重新推導的未測候選會是 G2 `.4761138503`、K1 `.0752743708`；三政策推導為 `.4750186960`／`.0758238827`。這些數值尚未跑，不列為結果，交 Owner 決定是否測試。
- D2 12 組校正 runs 共 108/108 checkpoints、每 run 9/9；11/12 VALID。唯一 INVALID 是 G1 Adventure：0 危機、0 phase transition，觸發 `no-crisis-phase-evidence`。每 run 三 seed 各涵蓋 36,000 daily ticks；實際模擬分鐘包含 outer 與 action-internal `simulate()`，日界線與危機 JSON 對帳全部通過。四個 Life variants 的 combat／encounter action 均為 0。
- D2 危機數是三 seed×100 年總數；換算每 seed-century，V0 約 66.7–67.0，G1 No Intervention／Life 15.0／15.3、Adventure 0，G2 約 66.7–67.0，K1 7.3–39.7。Crisis population Δ、每 seed-century 與每 seed-year 均列於主報告與 comparison JSON。
- V0 三政策 Threat3 佔全期 99.63–99.69%。G2 仍有 93.96–99.35% 時間在 Threat3，改善有限。G1 令 No Intervention／Life 恢復低威脅，但 Adventure 危機消失。K1 降低三政策 Threat3，Adventure 僅 7.3 場／seed-century且缺少 local defeat。Year100 平均人口 79.33–80、food／prosperity 均 100。
- 尚無文件證據顯示 `.65/.035` 是刻意追求飽和的 equilibrium；`75662ae` 初次加入參數，Phase6 baseline／QA runner plan 只記錄既有公式與 seed-dependent trigger。數據證實飽和，同時顯示單一全域下修有危機稀疏／消失風險。**Owner design decision required；本輪不選定正式數值。**
- 詳細分箱、區間、結果分布、Boss／聚落指標、日界線校核與危機 delta 分母：`d2-controlled/comparison-summary.json`、`world-crisis-balance.md` 的「D2 controlled comparison」。G1 Adventure 的原始與校正 INVALID attempts 全數保留。


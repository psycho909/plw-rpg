# Phase 8-A Worker Summary

## 變更檔案

- `scripts/phase8/classify-playtest.mjs`：以可解釋規則將既有 Phase 7 trace 中明確標記的 no-progress 動作分類，附 confidence 與理由。
- `scripts/phase8/run-baseline.mjs`：唯讀分析既有 trace；每次建立 `a-baseline-run/attempt-<UTC>/`，寫入 JSON、CSV、runner log、manifest；HEAD 由 `.git` refs 唯讀解析，src 指紋採排序後的相對路徑與檔案 bytes SHA-256。
- `scripts/phase8/classify-playtest.test.mjs`：分類與彙總邏輯的 Vitest 測試。
- `reports/v2/20261014-balance-tuning/phase-08/baseline.md`：Phase 7 重用基線、缺口、P8-F01..F06 證據與 B–E 優先序。
- `reports/v2/20261014-balance-tuning/phase-08/a-baseline-run/`：保留原 first-run 四個檔案作歷史 evidence；另有本次有效 attempt `attempt-20261014T025228601Z/`，包含 `manifest.json`、`no-progress-classification.json`、`.csv`、`runner.log`。舊分類器曾將 247 筆全部標為 runner，因方法過寬而由新 attempt 取代；舊檔未刪除。

`git diff -- src` 為空；沒有 src hook 提案（目前可用證據均能由既有報告及 trace 觀測）。未 commit、push 或修改其他既有工作。

## 執行命令與結果

- `node scripts/phase8/run-baseline.mjs` — **PASS**；完成 840 個 trace actions、247 筆 no-progress 分類並產生獨立 attempt。HEAD `eb4946ce4f486e9f9ad1707b9ba20bb01cdf4781`；src 指紋 `c07dd0a1434fe6b53fe8828f9c351c644876ec6fdbc0ed87bf232fd0458499ce`（112 files）；trace seed 未記錄。
- `git diff -- src` — **PASS**；無輸出，src 無變更。
- `npx.cmd vitest run scripts/phase8/classify-playtest.test.mjs` — **未完成**：sandbox 看不到 `node_modules`，npx 嘗試使用未鎖定的 Vitest 5.0.4，載入專案設定時因 `vitest`／`@vitejs/plugin-vue` 無法解析而失敗。Lead 指示不再執行 npm／Vitest。
- `npm.cmd ci` — sandbox 執行因 npm cache `only-if-cached` 缺少 `vue-tsc` tarball 而失敗；後續核准環境安裝嘗試由 Lead 中止。未重試。
- **pending lead execution**：`npx vitest run scripts/phase8/classify-playtest.test.mjs`
- **pending lead execution**：`npm run check`（dispatch 要求的單次完整 check）

## 指標：量測／重用／未量測

- **新分類**：正常 fresh-save heuristic trace 840 actions；247/840（29.4%）原始 `noProgress` 標記。新 attempt 分類 runner-marker 173（medium confidence）、resource-cue 74（low confidence）、UI/world-wait/goal 各 0（沒有符合本輪明確規則的列，不代表原因不存在）。這是 runner trace 的篩選法，不是因果判斷或人類體驗證據。
- **重用 Combat**：受控戰鬥 118,800 encounters、1,188 cells、每格 100 samples、3 seeds；Normal/Elite/Mini Boss/Boss 勝率 100%/98.6%/93.0%/34.2%；依進度帶 Boss 勝率 Early/Mid/Late 11.1%/20.5%/71.1%。來源 `phase-07/monster-balance.md`；不得解讀為自然遊玩勝率。
- **重用 Reward**：受控 `awardContentLoot` 100,008 calls，gear award 79.2%；rank 分布 Normal 56.9%、Elite 74.3%、Mini Boss 85.5%、Boss 100%。來源 `phase-07/loot-analysis.md`；不代表自然遭遇或拿到獎勵的時間。
- **重用 Life**：24 個新增 recipe controlled transactions 均完成；craft fee 11–26 gold，輸出售價比 craft fee 高 2–17。來源 `phase-07/crafting-economy.md`；未含材料成本與可取得量，不是套利證明。
- **重用 World**：3 seeds（40131–40133）× 10/50/100 years 共 9 checkpoints；人口、threat、save/history 與 save/reload 結果列於 baseline。來源 `phase-07/long-world.md`；無 player encounter actions 或自然 Boss 勝利。
- **NOT MEASURED**：自然遭遇／不同進度帶 Elite、Mini Boss、Boss 暴露與玩家結果；Merchant buy/sell/stock/restock 完整閉環；生活收入、作物收益、skill unlock、masterpiece 的路線分布；完整 crisis/supply/recovery 分布；`navigator.storage.estimate()` 實際 usage/quota。Phase 7 JSON bytes 是序列化估算，未視為 IndexedDB 實體 bytes。F06 原因與限制見 `baseline.md`。

## 待 Lead 留意

- no-progress 類別是低階啟發式且部分為 low confidence；UI/world-wait/goal 的 0 應視為分類規則未命中。後續若要當產品證據，需以有明確目標的 deliberate route 與 outcome 語義再次驗證。
- Phase 7 長世界數值足以重用作世界存活／儲存成長基線；不能替代自然玩家遭遇及危機週期觀測。
- Vitest 與 `npm run check` 尚未由 Lead 執行；請在可見既有依賴的環境執行上列兩個 pending 命令。

## A2 — Lead 退回後第二輪

### A2 變更

- `scripts/phase8/classify-playtest.test.mjs` 已依 repo convention 改名為 `scripts/phase8/test_classify_playtest.mjs`，測試使用 `node:test` 與 `node:assert/strict`；`scripts/README.md` 已列出該測試命令及 Phase8 runners 命令。
- `scripts/phase8/extract-combat.mjs` 從既有 Phase7 gzip 原始記錄唯讀產生分組 JSON／CSV／Markdown 與 manifest；未重跑戰鬥。
- `scripts/phase8/run-normal-routes.mjs` 使用 Vite SSR 載入既有 public engine APIs，定義 Life／Adventure／Hybrid 三路線、相同 3 seeds、三個遊戲年、逐日 time series、遭遇/戰鬥結果、資源流、crop yield、craft/技能/recipe-plan/masterpiece、gear upgrade 與 no-progress 分類輸出。路線結果尚未產生，因 sandbox Vite Windows real-path 子程序遭 `EPERM`；失敗 evidence 已寫入並保留。
- `reports/v2/20261014-balance-tuning/phase-08/baseline.md` 新增 A2 controlled combat extraction、正常路線狀態及具 owner lane 的未量測表。
- A1 的根目錄 first-run artifacts、A1 attempt、A2 combat extraction attempts 及 A2 failed normal-route attempts 均保留；沒有刪除 attempt。

### A2 命令及實際結果

- `node --check scripts/phase8/run-normal-routes.mjs` — **PASS**（語法檢查）。
- `node --check scripts/phase8/extract-combat.mjs` — **PASS**。
- `node scripts/phase8/test_classify_playtest.mjs` — **PASS**，2/2 Node tests。這是在 sandbox 直接以 Node 執行測試檔的替代執行方式。
- `node --test scripts/phase8/test_classify_playtest.mjs` — **sandbox BLOCKED**，Node test runner 啟動子程序時回報 `spawn EPERM`；依 Lead 指示不要求 escalation。
- `node scripts/phase8/extract-combat.mjs` — **PASS**，latest attempt `a-baseline-run/attempt-20261014T031333507Z/`；讀取既有 118,800 戰鬥列，輸出 72 群組、100 個 raw row seed 值。欄位含 rank × band × build 的勝敗、turns P10/P50/P90、remaining HP P10/P50/P90、net HP loss 中位數；total damage taken、potion use、fight cost 在原始 schema 不存在，明確輸出 `NOT AVAILABLE`。所有列標示受控 fixture。
- `node scripts/phase8/run-normal-routes.mjs` — **sandbox BLOCKED**，兩個執行 attempt 均在載入 engine 前遇到 Vite Windows real-path 子程序 `spawn EPERM`：`attempt-20261014T031235366Z/`（config 子程序）與 `attempt-20261014T031405256Z/`（safe realpath）。失敗結果已寫入，沒有正常路線樣本。三路線完整結果命令列為 **pending lead execution**：`node scripts/phase8/run-normal-routes.mjs`。
- `git diff -- src` — **PASS**，無輸出；無 src hook 提案。
- **Lead-reported result**：`npm run check` 在已安裝依賴的 Windows 環境 **PASS**，37 test files / 627 tests，另含 build。A2 worker 未執行 npm 或 Vitest。

### A2 新增量測／仍待量測

- **重用並抽取 Combat**：latest attempt `attempt-20261014T031333507Z/combat-extraction.md`, `.csv`, `.json`, `manifest.json`。72 個 rank × progression band × build 群組的 per-group 數值見該 Markdown/CSV。Raw row seeds 100 個（逐列種子），不同 rank 群組樣本量依定義數量而異。Damage taken、potion use、fight cost 不在原始列中；net HP loss 只能作受 healing 影響的 proxy。
- **準備但未量測 Normal fresh-save**：Life／Adventure／Hybrid 各 3 seeds（61101–61103，paired），時間窗為遊戲曆第 1–3 年；Early/Mid/Late 以 calendar year 操作性標記。命令因 sandbox EPERM 尚待 Lead 執行，故自然/正常路線 encounters、勝敗/撤退、gear timing、gold/material income、craft/skill/recipe-plan legality、masterpiece、crop yields、no-progress distribution 均仍 **NOT MEASURED**，baseline 指定對應 B/C/E owner lanes。
- **仍歸 C/D/F**：Merchant buy/sell/stock/restock cycle → C；crisis/supply/recovery 分布 → D；`navigator.storage.estimate()`、quota 及實體 IndexedDB bytes → F。baseline 的 owner-lane table 已逐項標示。

### 待 Lead 執行

- `node --test scripts/phase8/test_classify_playtest.mjs`（sandbox `spawn EPERM`；直接執行測試檔已 2/2 通過）。
- `node scripts/phase8/run-normal-routes.mjs`（唯一完整三路線 runner 命令；依賴環境可啟動 Vite/esbuild Windows 子程序）。

沒有修改 src，沒有 commit 或 push。仍無 src-hook 提案。

### A2 最終核對

- **pending lead execution**：`node --test scripts/phase8/test_classify_playtest.mjs`（sandbox 啟動 Node test runner 時 `spawn EPERM`；直接 `node scripts/phase8/test_classify_playtest.mjs` 已通過 2/2）。
- **pending lead execution**：`node scripts/phase8/run-normal-routes.mjs`（產生 Life／Adventure／Hybrid 三路線共用基線；兩次 sandbox 嘗試均在引擎載入前遇到 `spawn EPERM`）。
- `npm run check`：Lead 已回報 Windows **PASS**，37 test files／627 tests + build；本 worker 未執行 npm 或 Vitest。
- 已依 combat 原始抽取更新 P8-F01／F04 triage：F01 優先補跑正常路線；F04 可用受控 turn／HP 分布作 fixture 診斷，但缺少傷害／藥水／成本欄位及自然裝備軌跡。
## A3 — runner validity second pass

### 變更

- `scripts/phase8/run-normal-routes.mjs` 升級政策至 v2：每日持續選取合法動作，直到引擎時間跨過當日邊界、政策首度無進展或達 80 次決策安全上限，再模擬剩餘時間至午夜。Life 與 Adventure 分別按自身路線執行；Hybrid 按遊戲日交替兩半，日內重複決策。恢復使用遊戲公開 `rest` API。
- 每個動作只有在引擎回報成功且相關狀態指紋改變時才記為成功。引擎拒絕、成功但狀態未變、或政策找不到合法進展動作，都記為 no-progress，保留原因並套用既有類別。
- 新增 `scripts/phase8/route-validity.mjs` 與 `test_route_validity.mjs`：Life gate 要求成功的 gather/farm/craft/sell 活動及技能 XP；Adventure 要求有成功冒險行動與遭遇，全勝時要求附 HP 前後及 Boss definition IDs 查核說明；Hybrid 要求兩半均成功執行。未分類 no-progress 亦會使該 seed 無效。每 route/seed gate、失敗理由與全勝說明寫入 `completion.json`；任一 gate 失敗時總狀態為 `INVALID_POLICY`。
- `scripts/README.md` 加入 validity helper 的 `node --test` 命令。
- `baseline.md` 記錄 A2 attempt `attempt-20261014T031753470Z/` 為 **SUPERSEDED — POLICY ARTIFACT, NOT A BASELINE**；保留歷史檔案與遭遇列診斷數據，不把其數字當成正常遊玩基線。

### 舊 Adventure 全勝結果解釋

- 舊 attempt 的 310 筆 Adventure encounters 全勝：Normal 106、Elite 106、MiniBoss 82、Boss 16。進度帶為 Early 104、Mid 107、Late 99；全部 16 筆 Boss 都是 Late。
- 310 筆都有 HP 前後值，範圍為戰前 64–226、戰後 64–218；玩家等級 1–22。Boss definition IDs 為 `cave_insect_queen` 與 `frontier_goblin_warlord`；例如 Queen（Late、Lv.15）HP 184→120，Warlord（Late、Lv.16）HP 120→134。
- v1 policy 只在低 HP／低 stamina 時休息、戰鬥時使用 potion／撤退閾值，且隨進度選取目前可用的高階目標；晚期高等級及恢復策略足以解釋這批**政策產物**，不足以代表玩家自然勝率。完整舊列仍在該 attempt 的 `encounters.csv` 和 seed JSON。

### 驗證與待 Lead 執行

- `node --check scripts/phase8/run-normal-routes.mjs`、`node --check scripts/phase8/route-validity.mjs`、`node --check scripts/phase8/test_route_validity.mjs` — **PASS**。
- `node scripts/phase8/test_route_validity.mjs` — **PASS**，6/6；`node scripts/phase8/test_classify_playtest.mjs` — **PASS**，2/2。直接執行 Node test 檔成功。
- `node --test scripts/phase8/test_route_validity.mjs` — sandbox **BLOCKED**，test runner child process 回報 `spawn EPERM`；不要求 escalation。
- **pending lead execution**：`node --test scripts/phase8/test_route_validity.mjs`。
- **pending lead execution**：`node scripts/phase8/run-normal-routes.mjs`。A3 明確將 rerun 留給 Lead；本 worker 未執行，所以沒有宣稱新的 route metrics 或 gate 結果。
- **pending lead execution**：`npm run check`。Lead 先前回報 37 files／627 tests + build 通過，但此回合修改後需由 Lead 再確認；本 worker 未執行 npm 或 Vitest。
- `git diff -- src` — **PASS**，無輸出。沒有 commit、push 或刪除任何 attempts。

### 尚待確認

- Lead 在 Windows 環境執行以上 pending 命令後，檢查 Life 是否出現實際 gathering／farming／crafting 與技能 XP、Adventure validity 與全勝解釋證據、Hybrid 是否完成兩半；若有 `INVALID_POLICY`，先修 runner，不調整遊戲平衡值。

## A5 — v3 正常 fresh-save 基準與 triage 更新

### 文件更新

- 僅更新 `reports/v2/20261014-balance-tuning/phase-08/baseline.md` 與本摘要；未修改 `scripts/phase8/*`。Normal fresh-save（scripted policy v3）基準採 Lead 完成的 attempt `a-baseline-run/attempt-20261014T040039340Z/`，9/9 route/seed 均 `VALID_POLICY`。基準明確與 Phase 7 controlled fixture、真人遊玩分開，沒有設定產品目標。
- 按路線與 seed 摘錄 rank/outcome、Boss 勝／撤退、首個 meaningful gear 分鐘、gold gross/spend/net/final、action-level reward-material receipts、craft/Smithing/Farming、crop yields、no-progress heuristic class。另說明普通木石鐵 gross gathering 未逐動作量測，不以材料流的缺欄表示收入為零。
- Elite 與 MiniBoss 記為 **NOT OBSERVED**（全部 Adventure/Hybrid seed 為 0 eligible、0 encountered），附 authored encounter 條件、Wolf rank 順序／體力／地點／怪物量限制與 Boss cooldown 等合法性證據。Life 三 seed 相同輸出按 A4 Max Q1 解釋為有效 seed 下的固定政策確定性，不是 seed 未套用。
- 標示 `attempt-20261014T031753470Z/` 與 `attempt-20261014T032942232Z/` 均由 v3 superseded，保留原歷史證據。更新 P8-F01–F06 與 B–E lane 優先序；676 次 starterSpear-type crafts 換取 Smithing Lv.3 / +60 XP 明確作 chore-risk signal。
- A3 段落的「待 Lead 執行」只記錄當時狀態，已由本節所列 Lead 執行結果解決；本文件以 A5 的 PASS 與 attempt 為目前狀態。

### Lead 驗證（Lead 執行，非本 worker 執行）

- `node --test route-validity+classify` — **PASS，14/14**。
- `vitest src/engine/simulation.test.ts` — **PASS，28/28**。
- `node scripts/phase8/run-normal-routes.mjs` — **PASS**，輸出 attempt `attempt-20261014T040039340Z/`；completion 顯示總體 PASS、9/9 `VALID_POLICY`，3,240 daily rows、1,138 encounters、50,931 actions、3,398 crafts、42 gear changes、12 recipe unlocks、18 crop yields。

本回合未執行 npm／Vitest／runner；未 commit／push、未刪除 attempt、未要求 sandbox escalation。文件變更僅限上述兩個 Markdown 檔。

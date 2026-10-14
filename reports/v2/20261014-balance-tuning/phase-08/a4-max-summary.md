# Phase 8-A4 Max Summary

本地實作與 route-validity gate 驗證已完成。v3 正常路線尚未執行，因此沒有新增 A4 attempt，也沒有可用於平衡結論的 v3 數據；Lead 執行清單見文末。

## Q1 — Seed 與 Life 路線相同輸出

- `src/engine/simulation.ts:197-201` 的 `createGame(seed)` 將 `seed >>> 0` 同時寫入 `worldSeed` 與 `rngState`。初始 NPC 建立會呼叫 `random(state)` 產生 lifespan（`simulation.ts:153-173, 210`）；RNG 是 LCG 更新（`random.ts:3-5`）。既有測試也斷言 `createGame(43).rngState` 與 seed 42 不同（`simulation.test.ts:24-30`）。
- Runner 確實以每個 paired seed 呼叫 `createGame(seed)`，並取 `random` probe；route validity 要求不同 seed、worldSeed、rngState 與 probe（`scripts/phase8/run-normal-routes.mjs:130-135, 522-524`; `route-validity.mjs:13-27, 51`）。因此 v2 的 Life 指標相同不能證明 seed 未套用：其路線輸出主要由固定 gather／等待／出售決策構成，沒有觸發會改變被報告 Life 指標的隨機遭遇或戰利品生成；seed 有效不代表每個 route metric 必然不同。這是根據舊輸出與政策行為的推論。
- 尚未取得 createGame 的本地實際 probe 輸出。直接以 Node 載入 TypeScript engine 時，`simulation.ts` 的 extensionless import 無法解析；既有 Vitest seed 測試則在 Vite 載入設定時遇到 `esbuild spawn EPERM`。v3 runner 已內建最小 probe，需由 Lead 執行後確認實際值；本報告不把 source inspection 當成 runtime pass。

## Q2 — 遭遇 Normal、Elite、Mini Boss、Boss 的合法路徑

- Authored content 透過 `contentEncounterOptions` 查詢目前區域的候選，合法性再依 region、玩家等級、threat、聚落階段、季節、時段、安全值、族群區域與 Boss cooldown 判斷；實際遭遇 API 會重新檢查（`src/engine/contentFamilies.ts:60-78, 98-153, 238-254`）。
- Wolf family 是森林獨立路線，需角色存活、在森林、非戰鬥／礦坑、至少 8 stamina 且 monster population > 0。後續狼種依前一種被擊敗逐段解鎖，狼王另有 cooldown；rank 定義包括 Normal、Elite、Mini Boss、Boss（`src/engine/wolfFamily.ts:40-75, 144-161`; `src/data/rewards.ts:62-67, 104-108`）。
- 舊式 `encounter(false)` 需在森林且有怪物，並依 `spawnLevel <= threatLevel` 選最高 spawnLevel；Goblin Chief 不是一般候選，必須 `bossAlive` 並明確呼叫 `encounter(state, true)`。UI 只在 Boss 存活時顯示酋長挑戰，Wolf track 也顯示各項合法性與原因（`src/engine/actions.ts:207-219`; `src/components/PlaceWindow.vue:190, 201`）。
- v2 最近 attempt 有 2,366 次 Adventure 遭遇但全部是 Normal（`.scratch/20261014-phase8/dispatch-a4-max.md:12-18`）。根因是舊 policy 只看 content 與一般森林遭遇，未追蹤 Wolf API，也未挑戰 Chief；早期 rank 選擇規則及持續選一般遭遇進一步壓掉較高 rank。v3 改成合併 content、Wolf、森林一般遭遇與存活 Chief 候選，選目前最高合法 rank；每個觀察到可用的高 rank 都必須出現在該 seed 的遭遇記錄，否則 gate 失敗（`run-normal-routes.mjs:227-245, 310-323, 383-402`; `route-validity.mjs:69-77`）。

## Q3 — Fresh-save 的 Farming、Crafting 與 Smithing

- 小麥只在 farmland 提供，全年可種；fresh save 已解鎖 farmland。準備田、播種、收成分別需 6/4/4 stamina、20/10/15 分鐘；小麥約 2,880 分鐘成熟，播種與收成會增加 farming XP（`src/engine/crops.ts:36-70`; `src/engine/actions.ts:35-80`; fresh-save regions 在 `src/engine/simulation.ts:203-204`）。
- Fresh save 起始 Smithing Lv.1、settlement 有 store。`starterSpear` 不需要先解鎖玩家 recipe collection：配方要求 3 wood、2 stone、4 gold、10 stamina、45 分鐘、Smithing Lv.1，且 station 是 store（8:00–18:00），可由 forest/mine 公開 gather 取得材料（`src/engine/simulation.ts:142-146, 203`; `src/data/crafting.ts:6-23`）。`planCraft` 提供 station、時間、材料、gold、技能及存活／戰鬥等合法性結果；成功 craft 才提交交易並按 practice cap 給 Smithing XP（`src/engine/crafting.ts:186-255, 320-347, 415-478`）。
- 舊 Life policy 沒有前往 farmland 建立新田的決策，且在 craft 前出售材料；它只核對 blacksmith，漏掉 starterSpear 的 store station，亦未保留 wood/stone 配方庫存，因此沒有 farming、craft 或 smithing 進度（舊 attempt 指標見 dispatch 第 16 行）。v3 改為整地／播種／熟成收成，按 `planCraft` 等候 store 開門、保留材料並只出售餘料（`run-normal-routes.mjs:416-516`）。

## Q4 — UI 每日行動預算

UI 沒有固定每日行動次數；`gameStore.act` 執行單一合法動作，`advance(minutes)` 推進指定遊戲時間（`src/stores/gameStore.ts:96-117`）。實際限制由各動作的 stamina、遊戲時間、區域、站點營業時間及世界狀態決定：移動每格 5 分鐘；初始技能 gather 每次 10 stamina、43 分鐘（技能提升後最短 15 分鐘）；農事 4–6 stamina、10–20 分鐘；starterSpear 10 stamina、45 分鐘；遭遇開始消耗 8 stamina；戰鬥每回合 1 分鐘、撤退 10 分鐘；村莊休息 60 分鐘恢復 35 stamina／15 HP，旅店花 8 gold、480 分鐘完全恢復（`src/engine/simulation.ts:444-457`; `src/engine/actions.ts:25-31, 35-80, 83-112, 207-219, 293-298, 388`; `src/data/crafting.ts:14-23`; Wolf/content encounter cost 在 `wolfFamily.ts:46, 160`、`contentFamilies.ts:18, 106, 254`）。

Runner 仍以午夜切片整理 daily time series；每日 80 次 decision 是 harness safety ceiling，不是 UI／遊戲限制，動作也可能跨午夜。Adventure 每日最多開始 3 次 Normal 遭遇是 route policy cap；若有較高 rank 合法可用，policy 仍會挑戰（`scripts/phase8/run-normal-routes.mjs:1-16, 86-90, 534-539`）。

## 修改與驗證

- `scripts/phase8/run-normal-routes.mjs`：升為 policy v3；Life 使用合法農作與 `planCraft`、保留配方材料；Adventure 查詢 authored content、Wolf track 與 Chief；補上精確 rank 分類、可用 rank 證據、seed RNG probe、combat all-win 解釋與實際行動成本。
- `scripts/phase8/route-validity.mjs`、`test_route_validity.mjs`：成功判斷要求 engine 接受且相關狀態改變；新增 seed RNG、Life 農作／Craft／Smithing、Adventure 高 rank、Hybrid 兩半與 all-win 解釋 gate 及對應 node:test cases。
- `reports/v2/20261014-balance-tuning/phase-08/baseline.md:94-107`：記錄 v2 invalid attempt、v3 policy 決策、UI 預算與 route 證據限制。沒有修改 `src/`，沒有新增 attempt，沒有刪除既有 attempt；未 commit／push，也未做 sandbox escalation。
- 已執行 `node --check` 檢查三個 Phase 8 `.mjs` 檔案，通過；`node scripts/phase8/test_route_validity.mjs` 通過 **12/12**；`git diff -- src` 為空。
- `rg` 空白檢查沒有發現尾端空白（無匹配；exit 1 是 rg 無結果）。

## 待 Lead 執行

1. `node --test scripts/phase8/test_route_validity.mjs` — dispatch 指定的標準 test-runner 執行。
2. `node scripts/phase8/run-normal-routes.mjs` — 產生新的 v3 attempt；保留 61101–61103 與三年窗口，檢查 seed probe 及各 route validity。此處未執行，因先前 Vite/esbuild 子程序在 sandbox 遇到 `spawn EPERM`，且使用者禁止 sandbox escalation。
3. `npm.cmd test -- src/engine/simulation.test.ts` — 本地嘗試在 Vite 設定載入時以 `spawn EPERM` 中止，測試本身未開始；需由 Lead 重跑，確認 createGame 兩 seed 的 engine assertion。
4. `npm.cmd run check` — README 的完整 test/build gate 尚未執行，交由 Lead 在可啟動子程序的環境執行。

在 Lead 執行前，v3 route metrics、Seed runtime probe 與整體 test/build 狀態均為 **PENDING**；v2 attempt 保留為 **INVALID_POLICY / NOT A BASELINE**。

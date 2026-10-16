# Phase10-D：存檔遷移與確定性

## 結果

**D 的存檔、遷移與確定性契約證據完成，待整合與 Owner 最終驗收。** 本工作沒有修改 `src/` 產品程式或存檔格式；新增兩個契約測試與一支受限長跑 runner。原定向測試的來源快照是 `4a71d3599cdf17ac3dab189d88e16fabcebe5033`。本次 follow-up 只修正 runner 年長換算並重跑長世界；精確曆法 run 捕捉到 HEAD `e9f2efc90ad7da46331245a8ee229a3296187fcf`、123 個追蹤 `src/` 檔案、fingerprint `3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842`。本次沒有變更 `src/`，也沒有重跑 Vitest；runner syntax check 與正確曆法長跑通過。D worker 未提交或推送。

Ticket：[`20261016-v2x-10d-persistence.md`](../../../../tickets/20261016-v2x-10d-persistence.md)。範圍依 Ticket §8 與 `.scratch/20261016-phase10/dispatch-d-max.md`。

## 契約盤點

| 契約 | 現有證據 | 判讀 |
| --- | --- | --- |
| 一般遊戲操作自動保存 | `src/stores/gameStore.test.ts:62,376` | 操作後狀態寫入持久層；另有日常操作儲存路徑覆蓋。 |
| 手動保存 | `src/stores/gameStore.test.ts:360,368`；入口 `src/App.vue:122` | Store 保存成功／失敗分支有測試；本工作未執行瀏覽器 UI 點擊測試。 |
| 重新載入後恢復 | `src/stores/gameStore.test.ts:410,547` | journal 與新 Store/session 讀回目前存檔；此為 Store 層測試，不宣稱驗證實際瀏覽器程序重啟。 |
| 損壞存檔不得被自動覆寫 | `src/stores/gameStore.test.ts:114,120` | 讀取錯誤會阻止後續保存；明確 reset 是使用者要求的例外，見 `:171`。 |
| 無效、未知／未來版本拒絕 | `src/services/saveService.test.ts:769-773`；Store 阻擋路徑 `src/stores/gameStore.test.ts:114-120` | 無效 JSON、缺欄位及未支援版本均拒絕，且保留原始存檔。 |
| 舊版遷移 | `src/services/saveService.test.ts:191,252,305,338,366,441,469,490,540`；Store V1 `src/stores/gameStore.test.ts:132` | 覆蓋既有版本遷移及舊世界欄位／RNG 保留。 |
| 裝備、材料與掉落狀態 | `src/engine/itemGeneration.test.ts:205,217,261`；`src/services/saveService.test.ts:753-765` | 已覆蓋裝備 roll、材料／物品與後續模擬的往返保存。 |
| Boss encounter／冷卻 | `src/engine/bossSaveReload.test.ts:34`；`src/engine/contentFamilies.test.ts:172-230,271-305` | 覆蓋 encounter reload、冷卻保存及到期後重新形成。 |
| 區域危機、冷卻、死亡與接續 | `src/engine/regionalCrisis.test.ts:103,154`；`src/engine/crisisResolution.test.ts:40` | 危機狀態、解決及角色死亡／繼承路徑已有往返測試。 |
| NPC、長期 history 與 succession | `src/services/saveService.test.ts:708-724` | 500 年 history、自然死亡、繼承及續跑已有測試。 |
| RNG 與重播 | `src/engine/simulation.test.ts:24-31,87`；本次新增 `src/engine/phase10Determinism.test.ts:30-51` | 相同 seed、初始狀態及合法行動序列比較 RNG、時間、掉落、NPC、危機、事件與 history。 |
| NPC 連結的 arc/request 往返 | 本次新增 `src/services/phase10Persistence.test.ts:7-27` | 原測試未直接覆蓋同一存檔中的 live request → arc → NPC actor 關聯；新增測試序列化後逐欄及完整 GameState 比對。 |

### 確定性範圍

新增重播以 seed `101016` 建立相同新世界，走到相同合法地點，設定同一合法 Boss encounter 前置狀態，再執行相同 `wolfKing` encounter 與 attack。每次都產生一件掉落；保存／讀回後雙方各續跑一天，並比較完整 GameState。`rngState`、`worldTime`、reward、NPC、regional crisis、events 與 history 都包含在比較中。

唯一固定的欄位是序列化 envelope 的 `lastSavedAt`，設為 `0`：它是保存時間 metadata，不屬於 GameState 或遊戲模擬狀態。遊戲內時間戳仍包含在完整狀態比較中。新增 NPC request 測試另用明確 `lastSavedAt=1100` 驗證該 metadata 回傳值。

### 測試結果

精確命令與時間點見 [`d-runner/test-results.md`](d-runner/test-results.md)：原定向 Vitest 為 10 個檔案、238 個測試全數通過；曆法修正後另執行 runner `node --check` 及完整 3 seeds × 10／50／100 個遊戲年 run，兩者通過。Phase10-D 依共同規則執行範圍內的定向測試；全專案 check/build 由 Phase10 lead 負責。

## 邊界與未涵蓋風險

- 本次確認 Store 層的保存、阻擋及重載契約，沒有執行真實瀏覽器重啟、IndexedDB／localStorage 配額或 UI 手動保存操作；不可由序列化 JSON 位元組推論瀏覽器配額。
- 修正後 100 個遊戲年 No Intervention 長跑中，玩家角色自然死亡而未 succession，原因是該情境不呼叫玩家繼承操作；既有 500 年測試覆蓋有 succession 的模擬續跑。這份結果不等同於玩家操作的 100 年遊戲。舊 Phase10 attempt 與 Phase8-D 長跑曾將 360 天當一年，需按 30／150／300 個遊戲年解讀；詳見 [`long-world.md`](long-world.md)。
- 尚待 Phase10 整合與 Owner 最終驗收；L3 獨立稽核記錄收錄於 [`d-runner/d-summary.md`](d-runner/d-summary.md)。

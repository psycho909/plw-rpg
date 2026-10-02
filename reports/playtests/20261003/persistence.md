# 存檔與離線演化遊玩紀錄

## 環境與起始狀態

- 實際執行時間：2026-10-03 01:34:25（Asia/Taipei）；紀錄存於本次多 Agent 遊玩目錄。
- 本機網址：`http://127.0.0.1:5173/`；Chromium 151.0.7922.173、Python Playwright；每條路線使用新的非持久化 browser context，未使用正式站或既有玩家存檔。
- 遊戲存檔 seed：909；新世界顯示第 1 年春 1 日 08:00。首次手動保存前 localStorage 為空，保存後確認 `worldSeed=909`、`saveVersion=1`。
- 依據：README 離線規則（×1 換算、最多 8 小時、暫停後重開仍演化、自動存檔每 10 秒、離開時存檔、壞檔不自動覆蓋）；SPEC §49、§50、§53。

## 正常 UI 遊玩

| 操作 | 遊戲時間／狀態 | 結果 |
| --- | --- | --- |
| 開新世界並暫停；步行前往農田 | 春 1 日 08:00 起步；走到 `(16, 10)` 後為 08:50 | 角色留在農田，可正常操作。 |
| 整地、播種、等待兩次「1 日」、收割 | 播種後顯示剩 48 小時；兩次等待後顯示可收割；保存時 `worldTime=3455`（春 3 日 09:35） | 收穫增加 5 份食物，背包總數由 3 變 8；存檔含玩家位置、農田區域與背包狀態。 |
| 按「儲存世界」 | 手動保存確認「世界已儲存。」 | `persistence-ui-save.json` 保存 UI 實際寫出的狀態。 |
| 暫停狀態再等待 1 日，等自動保存 | `worldTime=4895`（春 4 日 09:35） | 約 10 秒的存檔週期內，localStorage 更新到最新 `worldTime`，通過。 |
| 關閉分頁 35 秒後，在同一個隔離 context 開新分頁 | 重開摘要顯示經過 0 日 1 小時；人口 +0、成熟田 0、森林威脅 1→1、聚落仍為小聚落 | 即使關閉前暫停，仍有離線摘要；手動保存後 `worldTime=4965`，比關閉前多 70 遊戲分鐘，通過。 |
| 重開後往左移動一格並保存 | 座標 `(16, 10)` → `(15, 10)`；第 1 年春 4 日 10:51，`worldTime=4971` | 可在離線恢復後繼續操作並保存，通過。 |

截圖：[起始畫面](persistence-start.png)、[農田收割](persistence-farm-harvest.png)、[自動保存](persistence-autosave.png)、[離線摘要](persistence-offline-reopen.png)、[重開後繼續移動](persistence-continue-after-reopen.png)。

## 受控故障注入（與正常遊玩分開）

所有 fixture 均複製本次 UI 生成的存檔，並預載至各自新的非持久化 context；沒有直接修改正常路線正在使用的 localStorage。每個損毀 fixture 都等過一次自動存檔週期、按手動保存，再取消「重建世界」；三者的原始字串均逐位元組保持相同。確認重建只在非法 JSON 案例執行，重建後明確保存成 seed 909、version 1 的新世界。

| 注入情境 | 注入內容與 UI 結果 | 驗證結果 |
| --- | --- | --- |
| 離線上限 | 將副本的 `lastSavedAt` 設為 8.5 小時前；摘要為 40 日，人口 +3、森林威脅 1→2 | 8 小時上限及摘要符合預期，通過。這是受控時間注入，並非等待 8.5 小時的正常遊玩。 |
| 非法 JSON | 將副本內容替換為 `{broken` | 顯示解析錯誤；自動／手動保存及取消重建均保留原字串；確認重建後才覆蓋，通過。 |
| 不支援版本 | 副本 `saveVersion=99` | 顯示「存檔版本不支援。原始存檔已保留。」；自動／手動保存及取消重建均未覆蓋，通過。 |
| 結構不完整 | 從副本刪除 `npcs` | 顯示「存檔資料不完整」；自動／手動保存及取消重建均未覆蓋，通過。 |

注入原文與結果：[8 小時上限](persistence-injection-8h-cap.json)、[非法 JSON](persistence-injection-invalid-json.json)、[不支援版本](persistence-injection-unsupported-version.json)、[不完整結構](persistence-injection-incomplete-structure.json)。畫面證據：[8 小時摘要](persistence-injection-8h-cap.png)、[非法 JSON](persistence-injection-invalid-json.png)、[不支援版本](persistence-injection-unsupported-version.png)、[不完整結構](persistence-injection-incomplete-structure.png)、[確認重建](persistence-injection-rebuild-confirmed.png)。

## 結果與未執行項目

- 本路線的正常 UI、離線上限、三種損毀存檔保護與重建流程共 4 項受控注入，未發現 Bug。
- 主 Agent 另確認 PT-001：損毀副本若含 `preparedPlots=0.5`，首次載入會接受；普通整地可使其成為 `4.5`，後續重載才拒絕。這不是本路線的四項注入結果，且沒有證據顯示正常 UI 能產生該初始小數。重現、預期與實際、嚴重度及證據見 [BUGS.md 的 PT-001](BUGS.md)。
- 未實際等待 8 小時；8 小時上限以明確標示的時間注入驗證。未測其他瀏覽器、跨裝置同步及瀏覽器儲存空間不足。
- 可重跑：`python3 reports/playtests/20261003/persistence.py`（實際執行 exit 0）。結構化總結果：[persistence-results.json](persistence-results.json)；完整 UI 生成存檔：[persistence-ui-save.json](persistence-ui-save.json)。
- 未修改應用程式、正式測試、依賴或鎖定檔；測試由本機 Vite 服務執行，未停止服務。

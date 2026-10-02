# Bug 清單與重現證據

工作正本：[多 Agent 遊玩 Ticket](../../../tickets/20261003-multi-agent-playtest.md)。測試對象是基準 commit `8945fa76343a3efed38b21e4615d269f9ebef529` 的本機遊戲。

## PT-001：非整數農田數量被載入，後續普通整地操作產生無法重載的存檔

- 狀態：**已確認，限定受控損毀存檔注入**。主 Agent 已在另一個獨立 browser context 重現完整結果。
- 建議嚴重度：中（存檔復原／資料驗證邊界）；沒有證據顯示正常 UI 會產生起始的非整數值。
- 受影響位置：[saveService.ts](../../../src/services/saveService.ts)、[actions.ts](../../../src/engine/actions.ts)。
- 契約依據：README 的損毀存檔保護、SPEC §53 的存檔與重新載入、§23 的耕作流程，以及 CONFIG.maxPlots=4 的離散農田限制。

### 重現步驟

1. 用新世界正常按「儲存世界」，複製這個可丟棄存檔。
2. 在獨立 browser context 的 localStorage 預載該副本，只把 `preparedPlots` 改為 `0.5`，將 `lastSavedAt` 更新為現在；第一次開啟遊戲。
3. 按「暫停」、「儲存世界」：沒有損毀警告，保存後仍為 `preparedPlots=0.5`。
4. 正常步行到農田，按 4 次「整地 · 20 分」並保存：變成 `preparedPlots=4.5`、crops 空陣列。
5. 重新載入：遊戲顯示「存檔資料不完整」，禁止覆寫，無法直接繼續剛才的世界。

預期：在步驟 2 的首次載入就拒絕非整數農田數量，保留原始損毀檔並顯示提示；普通遊戲操作不應擴大已接受的無效狀態。

實際：首次載入接受 `0.5`，普通整地將它累積到 `4.5`，保存後才在下一次載入遭拒。下一次載入的損毀檔保護本身正常，原始文字仍保留；問題在第一次驗證缺少整數檢查。

### 已驗證證據

```bash
cd /workspace/plw-rpg
python reports/playtests/20261003/verify_bugs.py
```

本次 exit 0 表示**成功重現缺陷**，不表示遊戲正確性通過。結果：[verify-bugs-results.json](verify-bugs-results.json)。

- [超過四田仍可保存的畫面](verify-fractional-plots-before-reload.png)
- [重載後拒絕繼續的畫面](verify-fractional-plots-rejected.png)
- 原始 `0.5` 被接受，4 次普通整地後 `4.5`，重新載入拒絕，拒絕後手動保存沒有覆寫原始檔，皆有實際斷言。

### 初步原因與修復方向

`saveService.valid` 對 `preparedPlots` 只檢查 `>=0` 與總田數 `<=maxPlots`，缺少 `Number.isSafeInteger`。`farm('prepare')` 使用加 1 及事前總量判斷，所以會沿用已載入的小數並跨過上限。

後續修復可補足初次載入的整數驗證，並為此無效存檔增加真正的回歸測試。這次只紀錄，未修改遊戲。

## 紀錄原則

正常遊玩與故障注入分開計算。選擇器錯誤、測試腳本預期寫錯、favicon 的非必要 404、合理的體力／營業時間／死亡限制，均不算遊戲 Bug。其他路線結果已由主 Agent 整合；未重現項目不標成已確認。

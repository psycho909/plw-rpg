# 主 Agent 基礎操作交叉驗證

關聯工作：[多 Agent 遊玩 Ticket](../../../tickets/20261003-multi-agent-playtest.md)。

## 執行條件

- 2026-10-03（Asia/Taipei）；基準 commit `8945fa76343a3efed38b21e4615d269f9ebef529`。
- 主 Agent；非獨立 Audit。Python Playwright、系統 Chromium，1440×1000 獨立 browser context。
- 新世界 seed 909，起始第 1 年春 1 日約 08:00；讀取手動保存的 localStorage 作為唯讀觀察。
- 未改寫遊戲 state；所有行為使用實際按鈕及鍵盤。

## 遊玩紀錄

| 操作 | 實際結果 |
| --- | --- |
| 暫停並儲存新世界 | 初次觀察 worldTime=481；開頁至暫停間已正常流逝 1 遊戲分鐘 |
| ArrowRight，接著 a | 從 (7,9) 往右再返回，worldTime=491；每格增加 5 分鐘 |
| 暫停 1.6 真實秒 | 增加 0 遊戲分鐘 |
| ×1 約 1.6 真實秒 | 增加 3 遊戲分鐘 |
| ×5 約 1.6 真實秒 | 增加 17 遊戲分鐘 |
| ×20 約 1.6 真實秒 | 增加 68 遊戲分鐘；含按鈕／儲存操作時間，不視為純計時基準 |
| 暫停後等待自動保存 | 12 秒期限內 lastSavedAt 自動更新 |

以上皆通過，頁面 JS exception 為 0。倍速觀察使用含操作延遲的合理範圍判斷，並非效能 benchmark。沒有在這些操作中確認 Bug。

## 重現

於 `/workspace/plw-rpg` 且 Vite 已在 5173 執行時：

```bash
python reports/playtests/20261003/verification.py
```

本次 exit 0；數值證據見 [verification-results.json](verification-results.json)。

## 限制

此路線僅補充鍵盤、倍速與自動存檔驗證；不代替生活、冒險、長期演化及故障注入路線。沒有驗證其他瀏覽器或正式網站。

# Oakvale 多 Agent 模擬遊玩報告

2026-10-03（Asia/Taipei）。工作正本：[20261003-multi-agent-playtest](../../../tickets/20261003-multi-agent-playtest.md)。遊戲基準 commit：`8945fa76343a3efed38b21e4615d269f9ebef529`。

## 結果

4 個 sub agent 各自使用獨立 Chromium 存檔，實際操作本機遊戲；正常遊玩已覆蓋生活、戰鬥、探索、經濟、存檔及 64 年世界演化。主 Agent 額外驗證鍵盤、倍速、自動存檔，並重現 1 個損毀存檔的資料驗證缺陷。

**本次正常遊玩未確認 Bug；受控故障注入確認 1 個 Bug。** 缺陷未修復，詳細步驟、影響及證據見 [BUGS.md](BUGS.md)。沒有把未跑項目或測試腳本本身的錯誤記成遊戲 Bug。

| 路線 | 實際操作與結果 | 詳細紀錄 |
| --- | --- | --- |
| 生活經濟 | 10.56 遊戲日：滿田、未成熟／未整地拒絕、四田收成、伐木體力耗盡、出售木材、購買藥水、商店關門、休息、居民日程及保存重載通過 | [life.md](life.md)、[life-run.json](life-run.json) |
| 冒險戰鬥 | 兩場森林勝利、攻擊／防禦／藥水／逃跑、Lv1→Lv2、迷霧探索、礦坑第一層勝利及退出；等待三季成村、伐木及售素材、購買並裝備鐵劍、聘請一名傭兵成功 | [adventure.md](adventure.md)、[adventure-observations.json](adventure-observations.json) |
| 存檔與離線 | 正常農作、手動與自動保存、暫停後關頁 35 秒重開延續約 70 遊戲分鐘並繼續移動；另外注入 8.5 小時離線、非法 JSON、不支援版本、缺少結構，確認上限與原始檔保護 | [persistence.md](persistence.md)、[persistence-results.json](persistence-results.json) |
| 長期世界演化 | 64 次 UI「度過一年」；奧登16→80歲自然死亡、選羅恩2接續；日曆到第65年，人口80、聚落兩次升階成城鎮、威脅3與 Boss、出生／移入／死亡歷史延續 | [world.md](world.md)、[world-final.json](world-final.json) |
| 主 Agent 補充 | 方向鍵／WASD、暫停、×1／×5／×20、自動保存通過；損毀農田數量完整重現 | [verification.md](verification.md)、[verify-bugs-results.json](verify-bugs-results.json) |

四條路線起始 seed 都是預設 `909`，使用不同 browser context，並非四個不同世界 seed 的廣泛統計。長期路線使用正常 UI 的等待功能，沒有直接改寫遊戲時間；離線及損毀檔注入另外標示。

## 執行環境與分工

- Node.js 24.19.0、npm 11.9.0、現有 Vue／Vite 依賴、Python Playwright、`/usr/bin/chromium`。
- 本機 Vite，桌面 1440px 寬 headless Chromium。所有操作都在可丟棄的工作階段，不讀正式玩家存檔。
- `life_playtest`、`adventure_playtest`、`persistence_playtest`、`world_playtest` 使用 `collaboration.spawn_agent`，各次入口明確設定 `gpt-6-luna`／`max`，符合專案委派規範；這是入口設定證據，不是後端模型遙測。
- 主 Agent 負責整合、腳本與資料自查、Bug 重現及 Git。這次是遊玩驗證，未執行 Independent Audit。
- 保留 JSON 操作紀錄、實際截圖與可重跑 Python 腳本；沒有修改遊戲程式、正式測試、依賴或 lockfile。

## 重跑方式

在專案根目錄，先以一個持續執行的 shell session 啟動現有服務：

```bash
cd /workspace/plw-rpg
npm run dev -- --port 5173 --strictPort
```

若同一服務已在執行，就重用；不要重複啟動或停止其他工作階段的服務。從另一個 shell session 執行所需路線：

```bash
cd /workspace/plw-rpg
python reports/playtests/20261003/life.py
python reports/playtests/20261003/adventure.py
python reports/playtests/20261003/persistence.py
python reports/playtests/20261003/world.py
python reports/playtests/20261003/verification.py
python reports/playtests/20261003/verify_bugs.py
```

每次都建立獨立存檔，重跑會刷新該路線的 JSON／截圖。前五支 exit 0 表示各腳本列出的檢查通過；`verify_bugs.py` 的 exit 0 表示成功重現 PT-001，並非該缺陷已修復。

## 已知覆蓋限制

- 冒險路線只打完礦坑第一層，沒有完整三層通關或實際擊敗 Boss；森林 Boss 的生成另由世界路線觀察。
- 沒有驗證皮甲、兩名同行者上限的實際 UI 拒絕、完整傭兵合約生命週期、採石／採鐵礦循環或所有交易品項。
- 長期路線是單一 seed 的一次64年旅程，沒有不同 seed、數百年或多代持續接續的統計測試。
- 離線注入路線驗證時間上限，但該保存點已收割，沒有在同一 8.5 小時注入中觀察成熟作物／傭兵到期。
- 沒有驗證行動裝置、其他瀏覽器、正式網站及部署。不把本次有界路線稱為完整遊戲無 Bug。

## 後續修復入口

優先處理 [PT-001](BUGS.md) 的載入驗證；修復範圍與正式回歸測試需要另一個 coding 任務。本次只保留缺陷紀錄與重現腳本。

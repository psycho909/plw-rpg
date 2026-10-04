# QA-01 真實 Chromium soak

## Baseline run（未完成）

- Baseline：`738bc0010c549fa3fb2420437d171f5aa2a043a0`，固定 build `/tmp/plw-rpg-qa-20261004-738bc00`。
- URL：`http://127.0.0.1:5191/`。
- UTC 起點：`2026-10-04T02:28:41.763+00:00`；停止：`2026-10-04T02:31:30.598+00:00`；results.json 的實際 monotonic elapsed：`168.834` 秒，目標 `7,200` 秒。
- 狀態：`incomplete`，不符合 QA-01 soak acceptance；沒有 end export。root 回報 application repair 正在進行後，依其 re-baseline 指示停止這個 baseline。保留兩個完整分鐘 checkpoint，見 `checkpoints.json`、`results.json`、`raw_profiles.jsonl` 和追加歷史 `playlog.jsonl`。
- 使用 `/usr/bin/chromium`、全新 disposable persistent profile；新世界與 ×20 由正常 UI 啟動。沒有注入 worldTime、timer 或遊戲狀態，沒有 forced GC。

第一個 checkpoint（60.091 秒）讀到 worldTime 2885、IDB 603 筆、localStorage 72,731 bytes、IndexedDB storage 520,984 bytes、pending 0、CDP heap 19.84 MB used / 66.51 MB total、DOM 2,545、×20、save error 無。第二個 checkpoint（120.066 秒）讀到 worldTime 5285、IDB 1,203 筆、×20、save error 無。停測時最新完整 metrics 距停止約 48.8 秒；不得把它當成終點容量樣本。

## 方法

原 harness 每分鐘以真實 monotonic wall time 檢查並記錄一次。每 checkpoint 透過 UI 開啟／關閉視窗、每五分鐘點擊存檔、每十分鐘送出方向控制，×20 持續運作；自然戰鬥／死亡狀態有 UI 處理分支。取樣項目包括 CDP JS heap used/total、DOM counters、Chromium process RSS（本 baseline 的 RSS 子程序選取需改善）、localStorage bytes、IndexedDB `count()`、`navigator.storage.estimate()`、pending／worldTime／存檔錯誤、頁面／console／HTTP 資源錯誤及 UI 操作延遲。每次 profiling 的開銷包含在 elapsed。IndexedDB 定期只呼叫 `count()`。

這個 baseline harness 的 `openModal` latency 計時在送出按鍵後才開始，因此它只代表視窗變可見的等待，不代表 input-to-UI 延遲；RSS profile command-line match 也可能漏掉不帶 user-data-dir 參數的 renderer。兩項均不是有效的最終效能結論，final run 會先修正並使用獨立目錄保存。

## Final run

修復版第一個長 run 見 [final-run](final-run/README.md)，只有 1,620.171 秒即因 BrokenPipeError 中止，不符合兩小時要求。最終 [clean-run](clean-run/README.md) 已於 **2026-10-04 07:22:33.511–09:22:33.730 UTC**（台灣時間 **15:22:33–17:22:33**）完成，active **7,200.219 秒**、120 個分鐘 checkpoint，匯出 **72,013 筆**；profile 與匯出鏈驗證均通過。兩個早期未完成 run 都不抵扣最終時長。Luna/low 例行監看至 90 分鐘，root 在 120 分鐘 run 終點另行核對；細節見 [monitor reconciliation](monitor-low/README.md)。

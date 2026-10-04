# QA-01 第一個修復版 run（失敗，未滿兩小時）

此 run 已於 **2026-10-04 03:07:49.015 UTC** 中止，結果是 `failed`，不是進行中或 PASS。來源為建置當時的 `738bc00 + O1 recovery patch (exact sourceHashes)`，三個固定資產見 [final-manifest](../../baseline/final-manifest.json)；當時在 localhost 5192 執行。

- 起點：2026-10-04 02:40:48.844 UTC。
- [results.json](results.json) 記錄實際 monotonic elapsed **1,620.171 秒，約 27 分鐘**；原目標 7,200 秒未達成。
- 失敗：`BrokenPipeError: [Errno 32] Broken pipe`。harness 對 stdout 輸出時管線已中斷；此證據不表示遊戲程式發生例外。
- 完整分鐘 checkpoint、raw profiles、追加版本與已有截圖保留在本目錄。未完成正常 UI 終點匯出，也沒有通過 export-chain-validation。

本 run 使用真正 Chromium、正常 UI ×20 與 real monotonic waits，沒有 fake clock、世界狀態注入或 forced GC。其 UI selector waits 後來被 Astra 控制實驗確認會保留 Python Playwright ElementHandle，影響 DOM／heap 數字；因此不能據此把 retained DOM 歸為遊戲 leak。診斷方法與限制見 [memory-diagnosis](../../memory-diagnosis/README.md)。原 [harness.py](harness.py) 和原始數據未改寫。

新的 [clean-run](../clean-run/checkpoints.json) 於 07:22:33.511 UTC 開始，採相同 production 資產、全新 profile、獨立 stdout 檔案與零 selector wait 的正常 UI 操作。兩小時門檻由新 run 自己達成，這 27 分鐘不計入。新來源後續已提交為 c22de4e；[source-commit.json](../../baseline/source-commit.json) 明確映射相同 source hashes，不把修復歸稱起始 commit 單獨包含。

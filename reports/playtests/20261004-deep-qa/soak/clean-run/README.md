# QA-01：乾淨固定 build 的兩小時 Chromium soak

**已完成 QA-01 真實兩小時 soak。** 2026-10-04 07:22:33.511–09:22:33.730 UTC（台灣時間 15:22:33.511–17:22:33.730）持續 active **7,200.219 秒**；完整量測 elapsed 含匯出為 7,202.2 秒。前面的 168.834 秒 baseline 與 1,620.171 秒 BrokenPipe run 各保留原始紀錄，均未抵扣本 run。

終點有 120 個分鐘 checkpoint，遊戲時間由 480 推進至暫停匯出時的 288,548，增加 **200.047 遊戲日**。匯出共 **72,013 筆**（1 created、72,000 time、12 action），pending 為 0。`durationPass`、固定 build fingerprint、匯出 hash、world identity、連續時間鏈、ordinal 與 record ID 檢查全部通過；完整原始結果見 [results](results.json)、[profile summary](profile-summary.json) 與 [export-chain validation](export-chain-validation.json)。

固定 production 在 localhost 5193，來源與 assets 見 [final-manifest](../../baseline/final-manifest.json)。該歷史 manifest 建置時記錄的是起始 commit 加已核對的 O1 patch；之後提交 `c22de4e` 的 35 個 source hashes 精確匹配，見 [source-commit](../../baseline/source-commit.json)。沒有在運行中換 build。

[harness.py](harness.py) 以全新 persistent Chromium profile 建立正常世界、透過正常 UI 切換 ×20，沒有注入世界時間／存檔狀態／timer，也不施加 forced GC。每分鐘用真正鍵盤與原生 DOM click handler 輪流開關角色、物品、日誌、地圖及選單，每十分鐘正常方向移動，每個取樣正常 UI 保存。DOM 查詢只回傳布林或純資料，不使用會保留 ElementHandle 的 selector wait。stdout 寫獨立 /tmp 檔案，避免重現前次管線中斷。

每分鐘 [checkpoints.json](checkpoints.json) 自動經 report writer 追加至 [playlog.jsonl](playlog.jsonl)，包含世界時間、存檔 UTF-8 bytes、pending、IDB count/首筆、storage estimate、自然 JS heap、DOM counters、程序樹 RSS、long tasks 與視窗操作延遲。一小時截圖已留存；終點才會暫停、保存與從正常選單完整匯出。

終點由 [validate_export.py](validate_export.py) 檢查實際時長、完整 manifest fingerprints、export SHA-256、ID/body 一致性、ordinal、時間鏈與存檔端點；本次結果 exit 0。完整 UI 匯出 [oakvale-play-records.json](oakvale-play-records.json) 為 24,201,485 bytes，SHA-256 `67d32d9a265422f5959a36931215bcb6b9f45426a07941eb56e16ee488296ede`。連續 ordinal 為 1–72,013，時間鏈缺口、重複 ID、內容不符及 archive/pending 重疊均為 0。[validator_controls.py](validator_controls.py) 的 8 個 fingerprint fault controls 已通過，這些工具控制不當成長測結果。其後 [analyze.py](analyze.py) 生成取樣 CSV、摘要及標準 plotting figure。

Profile 只報實際觀察值，Ticket 沒有設定 heap、RSS 或延遲數值門檻：JS heap 最終 29.20 MiB、P95 35.93 MiB（觀察範圍 4.58–39.64）；Chromium 程序樹 RSS 最終 896.10 MiB、P95 908.58 MiB（853.06–911.53）；storage estimate 最終 12.80 MiB，append-only archive 筆數預期隨時間增加。UI open／close／move roundtrip paint latency P95 分別為 79.3／54.9／54.9 ms；14 個 long tasks 合計 1,184 ms、最大 205 ms。結果沒有 page errors 或 HTTP failures；唯一 console error 是固定 build 缺少 `/favicon.ico` 的 404。

例行監看依使用者指示由 GPT-6 Luna/low 執行，見 [monitor-low](../monitor-low/README.md)；這是工具路由設定，沒有後端模型遙測。重大 memory 疑慮由 Astra 在獨立 disposable contexts 診斷，沒有對本 run 施加 GC；見 [診斷](../../memory-diagnosis/README.md)。

限制：Linux headless Chromium；RSS 程序樹總和可能重複計入共享 pages；UI 延遲包括 Playwright transport 與兩次 animation frames；storage estimate 是 browser 估計。第一筆 heap/RSS sample 是第1分鐘；沒有 forced GC，瞬間 heap/node peak 不等於 retained memory。單次場景不證明所有路線沒有 leak/race，也不驗收 Safari 或真手機。

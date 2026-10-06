# Oakvale V2 最終 QA（進行中）

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`，branch `work`。
本次只做 V2 工程驗證、Agent 探索與產品驗收前置整理；不開發 V3。

| 項目 | 目前狀態 | 證據 |
| --- | --- | --- |
| 最新 source / 凍結 production build | 已建立 | [baseline](baseline.md)、[build manifest](build-manifest.json) |
| 全量 regression | 最新229 tests／14 files、typecheck、build 通過 | [最新 unit](regression-final-unit.log)、[最新 build](regression-final-build.log)、[Regression](regression.md) |
| Chromium / Firefox | 28 / 8 checks 通過 | [Chromium](browser/browser.json)、[Firefox](browser/firefox.json) |
| Persistent close/reopen / in-session catch-up | 3 checks 通過 | [實際 Chromium profile](browser/persistent-idle.json) |
| V1 → V2 migration | 7 原生 V1 fixtures 通過 | [provenance](engine/fixtures/manifest.json)、[結果](engine/migration-results.json) |
| 2 小時真 Browser Soak | 最新attempt-05 RUNNING，2026-10-05 22:08:55 台灣起，最早2026-10-06 00:08:55完成；舊版failed 2h結果另保留 | [目前 checkpoints](soak/attempt-05/checkpoints.json) |
| Life / Adventure / Hybrid | Life 最新source保守有效觀察 3,609.642 秒，60分鐘最低線 PASS；3,900 秒 extended target 在嚴格區間扣除後未證實。Adventure / Hybrid 仍待各自結案 | [Life final agent report](agent-playtest-life.md)、Adventure / Hybrid route 子目錄 |
| 多 seed 10 / 50 / 100 年 | 最新source3seeds×10/50/100年PASS | engine 子目錄 |
| 真人測試包 | READY FOR HUMAN TEST | [Human Fun Gate](human-fun-gate.md) |
| Human Fun Gate | PENDING | 尚未收到真人 1–2 小時遊玩後的八題回答 |
| V2 Product Gate | NOT YET APPROVED | 不用 Agent 回答取代真人回饋 |

所有實際遊玩均稱為 **Agent Exploratory Playtest**。Browser runtime 使用 headless Chromium，但執行完整 production app、原生計時器、DOM、IndexedDB 與真 UI 操作；不是直接呼叫 simulation 的替代品。Engine 長期模擬另列，不能用來代替 soak 時長。

固定 production assets SHA-256 位於 build manifest。正常初始 seed 909 由 UI 建立；17 / 2026 因 UI 沒有 seed selector，以公開 createGame(seed) → serialize 的標準初始存檔建立，詳見 [seed provenance](seeds/provenance.json)。沒有注入財富、裝備、角色能力或遊戲時間。

原始 failure、未完成嘗試、修正原因與重跑結果均保留。各目錄 playlog.jsonl 以壓縮內容和 checksum 自動追加已發布報告版本，具可驗證性；本機檔案的外部修改或刪除防護不在本次範圍。

平台限制：原生 Safari、iPhone / Android 實機已依使用者指示排除；desktop 窄 viewport 不稱為手機實機驗證。完整 gate 判定需等本次 runtime 完成後才寫入 final-review.md。

歷史 partial Hybrid（舊 c02 source、非目前 hybrid-final）初始化補充：seed 2026 的 gameplay 欄位保持原生初始值；該路線首次導航前另以當下實際毫秒更新 lastSavedAt，並包入 playJournal（version 1、worldId=hybrid-life-adventure-2026、pending=[]）。這是日誌／實際存檔時間 metadata 的初始化選擇，並非產品載入所必需；精確初始 lastSavedAt 毫秒未留存，不能追溯。其初始日誌不含原生 created/imported 記錄，完整世界初始事件仍在 checkpoint history；正式路線不宣稱從原生 creation record 開始的全程 journal 驗收，該項由原生 UI soak 承擔。

模型用量中斷後接續：前輪 Life 約33分鐘、Hybrid約37分鐘、Adventure約15分鐘之後的無人觀察時間不計入探索；舊 source 第二輪 partial 路線從 2026-10-05 03:49 UTC 後重新開始；最新修復版本 Life/Adventure/Hybrid 從13:53:57／13:56:40／13:58:07 UTC重新建立正常新世界，保留先前全部 partial evidence。靜態服務重啟前後三個 asset bytes SHA-256 相同，沒有重建或更換 app source。[接續證據](server-resume.json)。

## 2026-10-05 保存衝突修復階段

已確認 P1：同一 origin 兩個遊戲分頁可用舊世界覆寫新進度。Astra 完成重現、RED、單一 Web Locks writer 防護與 GREEN；獨立審查另發現 fresh opening 的復原按鈕不可達，正在窄幅補測修復。正式最新 source commit／manifest 已於修復及審查後固定為441e3c2；舊版結果不能冒稱修復後最新 build 驗收。最新兩小時 soak 與三條各至少一小時路線已開始，仍待實際完成。

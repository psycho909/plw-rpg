# 單機即時保存與追加遊玩紀錄：Chromium 驗證

- 結果：最終 Chromium 執行 **18/18 cases PASS**。
- 時間：2026-10-03 15:38:53–15:39:42 UTC。
- 範圍：單機瀏覽器、localStorage checkpoint、IndexedDB 遊玩紀錄、匯出與本機追加報告；沒有伺服器或外部服務。
- 執行正本：[results.json](results.json)；逐版本追加紀錄：[playlog.jsonl](playlog.jsonl)；瀏覽器 JSON 證據：[artifacts/](artifacts/)。

## 固定執行環境

測試使用 `/usr/bin/chromium` 與 Python Playwright，對本機固定 build `http://127.0.0.1:5186/` 執行。服務目錄是 `/tmp/plw-rpg-local-autosave-abort-fixed`；來源基準為 `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`。build、工作樹及來源雜湊見 [source-checks.json](source-checks.json)。Harness 在開始時另外從實際 HTTP 回應擷取 SHA-256：

| 資產 | SHA-256 |
| --- | --- |
| `index.html` | `1c1b06bb8958f7a45d6c141863253922a0e50f651e36178e3956cdacf2f3927a` |
| `index-DcqD1dRF.js` | `d2ff6dccdf819cf8f4e911c16048863951ab602fa7878838f41dbe9b37f7c813` |
| `index-B0QR5Rvd.css` | `cb53c449ba9875b40c40ecfba8fd4eb473b63903a19ebb4f3dbb810dcfc65fb8` |

在此環境重跑時，先啟動固定 build，再於 repository root 執行：

```bash
python3 -m http.server 5186 --bind 127.0.0.1 --directory /tmp/plw-rpg-local-autosave-abort-fixed
PLW_UI_URL=http://127.0.0.1:5186/ python3 -B reports/playtests/20261003-local-autosave/harness.py
```

頁面使用可丟棄的 Chromium context。標為 controlled fixture 的案例透過瀏覽器 API 故障注入或在新文件啟動前載入測試 checkpoint；這些結果不當成一般遊玩的發生率。`×20` soak 是實際 UI 時鐘的加速執行，未改寫時鐘或世界時間。

## 最終瀏覽器結果

| 覆蓋範圍 | 觀察結果 |
| --- | --- |
| 新世界與一般移動保存 | 新世界建立一筆紀錄。移動從遊戲分鐘 480 推進至 485，角色位置與 checkpoint 改變，紀錄在按手動保存前已寫入 IndexedDB 且只有一列。 |
| 壞舊存檔與失敗移動（controlled fixtures） | malformed raw 在啟動保存後仍逐 byte 相同，UI 顯示原始存檔保護警告。把角色放在 `(0,0)` 後往地圖外移動，世界時間維持 486、outbox 維持 0、archive 由測前至測後皆為 3 列。 |
| 一般 UI 度過一季 | 旅人筆記推進整整 30 日（43,200 遊戲分鐘）；單筆 time 記錄保存當次觀察到的 3 個事件。這是本次自然 UI 流程實際產生的數量，沒有假設它超過畫面的 150 筆限制。 |
| 實際 UI `×20` soak | 35.13 秒後暫停，世界時間前進 1,408 分鐘；archive 從 5 增至 357 筆、record ID 全部唯一、待補寫為 0。暫停時 localStorage checkpoint 為 77,314 bytes。 |
| IndexedDB 寫入失敗與重載補寫（controlled fixture） | 強制 readwrite transaction 拋出 `InvalidStateError` 時，checkpoint 留有 1 筆 pending、archive 未增加且重試提示可見。重載後該 ID 寫入一次、pending 清空。 |
| 已提交 ID 重播與內容衝突（controlled fixtures） | 重播相同 ID／內容後，既有列與 body 保持不變且該 ID 仍只有一列。改動同 ID 的 message 後，IDB 原始 body 不變、改動版仍在 pending；UI 顯示「同一紀錄編號的內容不同，已保留待送資料。」 |
| 匯出與衝突修復（controlled fixtures） | 匯出包含既有 archive、衝突 pending 與目前 checkpoint。將 pending body 還原為已提交原文後，outbox 清空；既有 ID 均保留，reload 期間另外產生的 time 記錄也保留。 |
| localStorage quota 失敗與手動恢復（controlled fixture） | 注入 `setItem` 失敗後，舊 checkpoint byte-for-byte 相同、遊戲暫停；匯出保留記憶體進度與待送 ID。恢復 Storage API 並在開啟的選單按「儲存世界」後，最新位置保存且該 ID 只寫入一次。 |
| 連續快速移動與一般重建 | 同一瀏覽器 task 派送 12 次真實方向按鈕 handler，立刻看到 12 筆 pending，最後 12 個 ID 均寫入且唯一，世界時間推進 60 分鐘。選單重建後 world ID 改變，原 375 個 archive ID 全部保留，並新增一筆新世界 reset 紀錄。 |
| 響應式選單與執行期錯誤 | 選單在 1440px 與 390px 視窗都沒有水平溢位，對話框及按鈕均在 viewport 內。0 page errors、觀察到的 HTTP response `status >= 400` 為 0；Chromium 有 1 筆未能歸因 URL 的 console 404 訊息，原始 console 訊息保留於 results。 |

單筆超過 UI 150 筆事件顯示限制的邊界由 [gameStore.test.ts](../../../src/stores/gameStore.test.ts) 的 220-event regression 驗證；不是本次正常 30 日 UI 記錄。最終完整程式驗證為 136 tests／7 files、types/build exit 0、report writer 4 tests，紀錄見 [astra-idb-abort.log](astra-idb-abort.log)、[final-build.log](final-build.log) 與 [writer-check.log](writer-check.log)。

另兩項在同一 5186 build 執行的瀏覽器補充驗證由主 Agent 負責，保持各自的 runner 與證據：

- [root-dual-failure.json](root-dual-failure.json)：390px 同時發生 IndexedDB 與 localStorage 寫入失敗；兩項錯誤均可見、舊 raw 不變、時間暫停；匯出兩筆 pending，恢復後各提交一次且清除警告。[runner](root-dual-failure.py)、[截圖](root-dual-failure.png)。
- [root-reset-pending.json](root-reset-pending.json)：紀錄庫故障時重建世界，確認舊世界的 durable pending 原樣保留；恢復後舊 archive、舊 pending 與新 reset ID 各自只提交一次，world ID 留在新世界。[runner](root-reset-pending.py)。

## 追加報告與執行限制

Harness 每個結果 checkpoint 都透過 `scripts/recorded_reports.py` 發布；[主 playlog](playlog.jsonl) 保存每版 `results.json`，[artifact playlog](artifacts/playlog.jsonl) 保存 JSON 證據與下載匯出。最終檔案的 checksum 已用 `decode_record` 逐筆驗證。初次執行期間曾修正 Playwright 參數相容性、fixture 注入及選單定位；這些 harness 嘗試仍以 blocked／failed checkpoint 留在 playlog，當前 `results.json` 則是 5186 的完整 18/18 最終結果。5185 的實際錯誤細節遺失也有保留，Astra 修正 IndexedDB `error`／`abort` 拒絕順序後，5186 的同 ID 衝突 browser case 顯示完整原因並通過。

console 的 404 訊息沒有攜帶 URL，因此此輪只報告「未能歸因 URL」，不把它指定為 favicon。Windows 實機、瀏覽器硬體斷電，以及 localStorage 和 IndexedDB 之間的跨儲存原子性不在本次 Linux Chromium 驗證範圍。

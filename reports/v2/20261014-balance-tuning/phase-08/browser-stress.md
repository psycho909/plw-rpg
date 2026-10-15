# Phase8-F Chromium 長時間壓力測試

## 執行設定與證據

- 測試來源：HEAD `9118454fe6520ae6a1fdb6283858ee1ead8fc5ab`；`src/` SHA-256 `23d8f619f94b1d8296eb5f6ecf34cad22f0cf71f650e1a7d271280195a42cba2`；production `dist/` SHA-256 `f3749ad74cd6f221e17545e2742b9d09c476067d66422ac45735a11e2067fb02`。
- 環境：Windows x64、Node `v22.14.0`、系統 Chrome `153.0.8010.53`。Node 內建 HTTP server 提供現成 production `dist/`；Node 內建 WebSocket/fetch 驅動 CDP。未用 Playwright、dev server、state injection 或 debug time skip。
- 完成 lane：`f-browser/attempt-20261015T050148206Z-stress/`。要求 1,200 秒，實跑 1,203.915 秒；3,602 筆 action records、21 個 checkpoint、0 個 page/console/request/HTTP error。原始證據為 `manifest.json`、`actions.ndjson`、`checkpoint-trace.ndjson`、`checkpoints.json`、`closeout.json`、`downloads/`。
- 保留但排除於結果的失敗嘗試：`attempt-20261015T035056623Z-stress/` 曾 runner stall；`attempt-20261015T042234312Z-stress/` 在第 1,100 秒附近因 CDP `Runtime.evaluate` timeout 結束，沒有達到指定時長及 closeout。第二次嘗試每輪都匯出 journal，診斷後將正式 stress 的匯出降為約每 300 個路線循環一次；沒有刪除嘗試。

## 覆蓋與結果

- 以可見控制混合等待 1 日、檢視物品／角色／日誌／地圖／住所／地方消息、手動存檔、C01 journal 匯出；每分鐘收集 checkpoint，約每 5 分鐘重載並比較可見指標。三次重載均相等；三次 C01 JSON 匯出均完成。最後匯出檔為 320,645 bytes。
- 存檔量測 119 次：中位數 10 ms、P95 16 ms、最大 5,024 ms；118/119 次收到可見存檔確認。最大值包含最多 5 秒的 UI 確認等待，故不能解讀為單純 IndexedDB 寫入時間。
- IndexedDB 從 2 列增至 237 列；readonly `getAll()` JSON UTF-8 投影由 1,369 增至 71,143 bytes（+69,774 bytes）。這是序列化投影，不是資料庫檔案／磁碟大小。
- `navigator.storage.estimate()`：usage 4,353→215,400 bytes，quota 10,737,422,593→10,737,633,640 bytes。CDP `Storage.getUsageAndQuota`：usage 同為 4,353→215,400 bytes，quota 固定 322,121,915,596 bytes。兩個 API 的 quota 回報不同，分開保存；quota 是瀏覽器估計值，不代表裝置剩餘容量或實際磁碟用量。
- 每次 checkpoint 的 heap 中位數 4.40 MB、範圍 3.86–8.62 MB；DOM nodes 中位數 4,140、範圍 2,218–5,300；JS event listeners 中位數 815、範圍 432–962。首末樣本分別為 heap 5.56→3.86 MB、nodes 2,357→2,225、listeners 446→432。中位數與峰值反映此 runner／單一 Chrome 工作階段，不能視為一般裝置上限。
- Inventory／collection UI timing instrumentation 在 checkpoint 中均以 3 秒 timeout 記錄錯誤，沒有有效延遲樣本；不宣稱這兩項量測通過。其他 storage/DOM/read-only 探針仍有資料。

**Inventory／collection UI timing 是 instrumentation gap**：量測選擇器／等待條件逾時，這不是產品 UI 慢或不符合效能門檻的證據。Life role lane 另有 F-F1 runner overlay click defect（詳見 `agent-role-playtests.md`）：05:41:46.881Z 後的 Life 路線無戰鬥主張無效；Life reload 後戰鬥視窗重新出現則是 active `state.combat` 的預期恢復 UI，其他比較欄位相等，非存檔狀態 defect。

## Phase7 對照與限制

Phase7 的 2 小時壓力測試記錄 7,200 秒、1,646 個 runner actions、23 次相等 reload；IndexedDB journal 13→14,847 列、JSON 投影 3,577→3,823,102 bytes，heap 首末約 7.98→14.03 MB。F1 本次只有 1,204 秒、3,602 筆不同粒度的 action records、3 次 reload，不能將兩個 runner 的 action 數直接當作速度比較。F1 的 20 分鐘結果提供本版 production build 的短時回歸基準；不等同 Phase7 的 2 小時耐久性覆蓋。

Safari、實體裝置、非 Chromium、真人遊玩與 Fun Gate 未測。JSON projection 不等同原生 IDB 檔案大小；UI timing 指標失敗需修正 selector／測量流程後再補量。

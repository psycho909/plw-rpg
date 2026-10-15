# Phase8-F 瀏覽器效能與儲存量測

## 來源與量測邊界

受測 production build：HEAD `9118454fe6520ae6a1fdb6283858ee1ead8fc5ab`；`src/` SHA-256 `23d8f619f94b1d8296eb5f6ecf34cad22f0cf71f650e1a7d271280195a42cba2`；`dist/` SHA-256 `f3749ad74cd6f221e17545e2742b9d09c476067d66422ac45735a11e2067fb02`。環境為 Windows x64、Node `v22.14.0`、system Chrome `153.0.8010.53`，由 Node in-process static server 提供 production `dist/`。Native `navigator.storage.estimate()`、CDP quota、IndexedDB 列數與 JSON projection 分欄記錄，未將 quota 或 JSON projection 當作磁碟容量。

## 各 lane 首末值

| Lane（約時長） | Heap used | DOM nodes | JS listeners | Native / CDP usage | IDB rows | IDB JSON projection |
|---|---:|---:|---:|---:|---:|---:|
| Stress（20 分） | 5.56→3.86 MB；median 4.40 MB、range 3.86–8.62 MB | 2,357→2,225；median 4,140、range 2,218–5,300 | 446→432；median 815、max 962 | 4,353→215,400 B | 2→237 | 1,369→71,143 B |
| Life（30 分） | 3.63→13.60 MB；median 9.09 MB、max 19.74 MB | 2,357→2,812；median 2,925、max 3,428 | 446→473；median 499、max 615 | 4,359→2,186,227 B | 2→2,433 | 1,369→675,473 B |
| Adventure（30 分） | 3.62→9.12 MB；median 7.36 MB、max 12.77 MB | 2,357→2,567；median 2,678、max 3,420 | 446→487；median 503、max 597 | 4,369→1,403,689 B | 2→1,532 | 1,369→457,745 B |
| Hybrid（30 分） | 3.66→7.01 MB；median 8.27 MB、max 14.90 MB | 2,357→2,459；median 2,590、max 3,637 | 446→450；median 484、max 630 | 4,363→1,226,367 B | 2→1,828 | 1,369→575,058 B |

Native quota 和 CDP `Storage.getUsageAndQuota` quota 保留為各 API 原始觀測：stress 首末 native quota 10,737,422,593／10,737,633,640 B；Life 10,737,422,599／10,739,604,467 B；Adventure 10,737,422,609／10,738,821,929 B；Hybrid 10,737,422,603／10,738,644,607 B。四 lane 的 CDP quota 均為 322,121,915,596 B。雖 usage 數值相符，quota 顯著不同，故不合併、不推導實體裝置可用空間。

Stress 的手動存檔 119 次：P50 10 ms、P95 16 ms、最大 5,024 ms，118 次得到 UI 確認；最慢樣本包含最多 5 秒確認輪詢，不是純寫入計時。C01 journal 匯出成功 3 次，最後下載 JSON 為 320,645 B；這是匯出投影檔大小，不是瀏覽器內保存檔大小。

Inventory／collection UI timing 在每次 checkpoint 都以 3 秒 timeout 失敗，故本報告沒有有效的 UI timing 數字。這是 instrumentation 限制；不能據此宣稱 UI 超過 3 秒，也不能宣稱量測通過。原始 checkpoint 保留每次錯誤，可供修復選擇器後重測。

## Phase7 對照與限制

Phase7-K 兩小時 stress 報告記錄 heap 約 7.98→14.03 MB、DOM 首末 2,736→2,910（最大 6,770）、listener 首末 431→467（最大 856）、IndexedDB journal 13→14,847 列、JSON projection 3,577→3,823,102 B。F1 是目前 Chromium/production build 的 20/30 分鐘測試；路線、瀏覽器版本、runner、資料起點與時長不同，不能把差異歸因為產品回歸或改善。IndexedDB JSON projection 是唯讀 `getAll()` 後 UTF-8 `JSON.stringify` 估值，不是實體資料庫檔案；Chrome quota API 是瀏覽器回報值。Safari、實體裝置與長於 30 分鐘的 F1 lane 未測。

原始證據位於 `f-browser/attempt-20261015T050148206Z-stress/`、`attempt-20261015T052301581Z-role-life/`、`attempt-20261015T055353925Z-role-adventure/`、`attempt-20261015T062609140Z-role-hybrid/` 的 `checkpoint-trace.ndjson`、`checkpoints.json`、`actions.ndjson`、`closeout.json`。

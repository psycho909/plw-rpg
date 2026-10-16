# Phase9-F1 Chromium 整合壓力測試

## 方法與原始資料

- production `dist/` 由 Node 內建 HTTP server 提供，使用 Chrome headless/CDP；Node `v22.14.0`、Chrome `153.0.8010.53`、Windows x64。HEAD `c0a377b50e09b67664bc07b65d4e81a382daa53f`，src 指紋 `d312c8b3a95f96ba6609d2531fd770d2b19df3ac64a7796905c2c1fa29ecd305`（排序相對路徑與逐檔 SHA-256，再對路徑/雜湊串接結果取 SHA-256）；dist 指紋 `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`。
- Attempt：`f1-runner/attempt-20261016T015258432Z-stress/`。要求 1,200 秒，實際 1,200.924 秒；6,467 action records、21 checkpoints、1,862 次 modal open/close lifecycle，0 page/console/request/HTTP errors。三次存檔重載皆 parity `equal:true`。
- 原始 checkpoint `checkpoints.json`、`checkpoint-trace.ndjson`；操作紀錄 `actions.ndjson.gz`，原始 NDJSON 16,332,991 bytes、gzip 694,598 bytes，SHA-256 round-trip 已驗證；`artifact-sha256.json` 記載雜湊。下載匯出及 `closeout.json`、`runtime-closeout.json` 均保留。Chrome profile 清除前 92,308,119 bytes，closeout 確認已移除。

## 量測結果

- **操作回應：** 4,238 個可見點擊成功造成可見畫面變更的樣本；點擊到可見文字改變中位數 42ms、P95 55ms、範圍 25–200ms。每 20ms 輪詢可見文字，最多等 1.2 秒；沒有可見文字變化的點擊不納入延遲樣本。這是 runner 的近似 UI 回應時間，不是瀏覽器輸入延遲或使用者感知的完整測量。
- **資源：** DOM nodes 2,113–3,433（中位數 2,656）；JS event listeners 411–540（中位數 466）；JS heap 3.35–9.72 MB（中位數 5.34 MB）。這些是單一 Chrome session 的 21 個 checkpoint 樣本。
- **存取 UI 計時：** inventory open P95 63ms、collection tab select P95 56ms；本次 selector/wait 條件有有效樣本。Phase8-F 對這兩項每個 checkpoint 都遇到 3 秒 timeout，是 instrumentation gap，不能解讀為產品超過 3 秒。本次使用的邊界為開啟選單至物品內容可見，以及點擊分類至 `aria-pressed` 選取完成。
- **IndexedDB 與錯誤：** journal records 2→330 列，JSON UTF-8 projection 1,369→101,164 bytes；`navigator.storage.estimate()` usage 4,349→300,981 bytes。JSON projection 不是 IndexedDB 檔案大小。21 個 checkpoint 均無 IndexedDB errors 或 unhandled rejections，run errors 為空。
- **操作覆蓋：** 混合瀏覽物品、角色、日誌、地圖、地方消息與列表搜尋；使用者可見存檔/重載；至少 100 次 modal lifecycle（實際 1,862）。

## Phase8-F 對照與延長決策

Phase8-F 跑 1,203.915 秒、3,602 actions、21 checkpoints、3/3 parity reload、0 errors；DOM 2,218–5,300（中位數 4,140）、heap 3.86–8.62 MB（中位數 4.40）、listeners 432–962（中位數 815）、IDB 2→237 列、JSON projection 1,369→71,143 bytes。本次與 Phase8 的瀏覽路線及 action 粒度不同，action count 不表示 throughput；資源樣本亦不能由兩個 runner 的流量差異推論單一程式變更的因果效果。Phase8 inventory/collection timing 無有效樣本；本次有有效樣本。

本次未見隨時間增加的 heap/DOM/listener runaway、IndexedDB 錯誤、重載差異或 UI 錯誤，因此依 dispatch 不延長至 60/120 分鐘。這只支持目前 production build 的約 20 分鐘 Chromium 壓力觀察，不能替代更長耐久性測試或其他瀏覽器/硬體驗證。

## 限制

未測 Safari、非 Chromium、實體裝置、真人遊玩或 Fun Gate。點擊回應量測依賴可見文字變化，排除沒有文字改變的有效操作；storage usage 是瀏覽器估計值，journal bytes 是 JSON 投影，不等同磁碟或原生資料庫大小。

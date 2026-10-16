# Phase 10-E 最終瀏覽器／效能 QA 摘要

## 狀態

**PASS WITH FINDINGS**

production-dist 可見 UI 回歸與完整 20 分鐘 Chromium 壓測已完成，沒有 runner、瀏覽器、IndexedDB 或 unhandled rejection 錯誤。下列需保留的 finding：

1. 20 分鐘壓測中「開啟選單」有一次 2,004 ms 點擊至可見變化延遲，P95 56 ms。短時 120 次重測最大 85 ms，沒有重現；Phase9-F1 最大值為 200 ms。保留為單次 P3 latency outlier。

## 完成項目

- regression runner：首次啟動因 `spawn EPERM` 在啟動瀏覽器前失敗；獲准提高權限後重跑通過。第二次結果含 200 action records、123 clicks、0 遮擋拒絕、51 screenshots、0 runner errors。
- 以 ordinary fresh save 檢查生命／冒險流程、採集、交易與休息、基本製作與裝備、遭遇戰／掉落、Boss 情報、世界歷史、存檔與載入；位置與 HUD reload parity 相同。
- 普通新存檔的 `slime_resin_guard_recipe` required-input 嘗試僅做短窗口檢查：缺黏怪樹脂 ×3（持有 0）、Smithing Lv.1 未達 Lv.2，且投影回報配方工作台尚未開放；製作按鈕不可用。獨立 controlled fixture 預置必要條件後，經可見 UI 完成 recipe craft、equip 與返回冒險。兩條證據保持分開。
- crisis、succession、crafting practice cap 使用獨立 controlled fixtures；自然流程未在有限窗口觸發危機／繼承／上限。
- 響應式主畫面 15-cell 矩陣無溢位、越界、過小目標或裁切；另外檢查 1280×768、375×667 物品視窗與 320×667 行動導覽。Safari、Firefox、實體裝置 NOT TESTED。
- Chromium 壓測 1,200.551 秒、5,358 actions、21 checkpoints、1,468 modal cycles；0 runner errors、0 IndexedDB errors、0 unhandled rejections。存檔 131 次，median 38 ms、P95 54 ms、max 80 ms。另見 [browser-stress-performance.md](../browser-stress-performance.md)。
- 短時 input latency run（受控存檔、production UI）：裝備搜尋 60 keydowns P50／P95／max 5.32／8.49／9.15 ms；配方搜尋 60 keydowns 5.64／9.97／12.45 ms；兩者 0 timeout。另 120 次選單開啟 P50／P95／max 39／46／85 ms，未重現 2,004 ms outlier。
- 正式報告已放回要求位置：[browser-regression.md](../browser-regression.md)、[browser-stress-performance.md](../browser-stress-performance.md)。

## 建置身分與證據位置

- HEAD `29e7c4b9328c8ea7d58a71a4163a8d93643ea0db`；source fingerprint `3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842`。
- 最後一次 `npm.cmd run build` 通過（`vue-tsc --noEmit`、Vite 103 modules）；重建 dist 指紋為 `72dfd027…`。依 [build correlation](../a-check-run/build-correlation-23ef273.txt)，這與 dispatch 的 `7f5efed2…` 是同一組 dist bytes，差別只有 hash 路徑慣例；此次 build 身分符合 dispatch 要求。
- 回歸明細：[browser-regression.md](../browser-regression.md)；壓測明細：[browser-stress-performance.md](../browser-stress-performance.md)。成功 regression、20 分鐘 stress、短時 input latency attempts、截圖、結構化紀錄及 SHA manifests 保留於 E-runner。
- 壓測主要資料目錄：`attempt-20261016T054713528Z-stress/`；回歸：`attempt-20261016T054428920Z-regression/`。首次 EPERM 的空 attempt 目錄保留作為啟動失敗紀錄。

## 工件保留

本次 E QA bundle（兩份 phase-10 正式報告及 e-runner evidence）共保留 4,623,121 bytes，含三個成功 attempt、兩個早期 input setup failure、空的初次 regression attempt、截圖與 manifests；大於 256 KiB 的原始動作紀錄與下載紀錄均 gzip 並保留 SHA-256／round-trip 證據。兩個 action gzip 因 runner 輸出重複內容而保留，hash 相同。Chrome profiles 均已清理；清理前容量分別為 74,367,018 與 127,720,631 bytes。

# Phase 10-E 瀏覽器回歸

## 執行範圍與識別

- 以 Node 靜態伺服器提供剛執行 `npm.cmd run build` 的 production `dist/`，在 Windows x64、Node `v22.14.0`、Chrome `153.0.8010.53` 執行可見 UI 操作。瀏覽器使用 headless Chromium/CDP；每次互動先對畫面元素做 hit-test，未對遮擋元素送出點擊。
- 實測 HEAD：`29e7c4b9328c8ea7d58a71a4163a8d93643ea0db`；source fingerprint：`3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842`；實測 dist fingerprint：`72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`。
- **Build identity 已對齊：** 本 runner 將 repo-relative `dist/assets/...` 路徑納入 hash，得到 `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`；Phase10-A 的 dist-relative `assets/...` 慣例得到 `7f5efed239807081c82b1ba48d8b6c1befb24291642509deb32e29cf134d5e00`。依 [build correlation](a-check-run/build-correlation-23ef273.txt)，兩值是相同三個 dist 檔案內容的不同路徑慣例；實測 build 符合 dispatch 指定 build。Phase9 之後的 `src` 差異是整合／持久化測試，未發現產品 source 變更。
- 第一個 runner 啟動在 Git HEAD 查詢處遇到 `spawn EPERM`，尚未啟動 Chrome；保留空的 `e-runner/attempt-20261016T054247361Z-regression`。獲准提高權限後重跑成功，完整結果在 `e-runner/attempt-20261016T054428920Z-regression/`。

## 結果

- **可見 UI 回歸：通過（限實測 dist）。** 成功開新存檔，執行伐木／採礦、店鋪交易與休息、木石長矛製作、穿戴獵獲裝備、遭遇史萊姆並完成兩次戰鬥操作、檢視掉落與怪物情報、Boss 備戰資訊、世界歷史，以及手動存檔／重新載入。重新載入後位置與 HUD 相同。
- 操作紀錄 200 筆、123 次 UI 點擊、遮擋點擊拒絕 0、截圖 51 張、runner errors 0。新存檔自然流程的區域危機未在觀察窗口自然觸發，沒有注入或 fixture 介入此路徑。
- 普通新存檔的混合路徑只做短窗口 UI 檢查：`slime_resin_guard_recipe` 可見；計畫顯示必需黏怪樹脂 ×3、持有 0，配方要求 Smithing Lv.2（目前 Lv.1），並回報配方工作台尚未開放。沒有可用製作按鈕，故此短窗口未完成 required-input 路徑；這不取代 Phase10-B 的長期引擎路徑結果。
- 另以明確標示的 controlled starting-save fixture 驗證混合製作 UI：預置登錄素材、Smithing Lv.2、村莊與鐵匠鋪；透過 production UI 製作 `slime_resin_guard_recipe`、穿戴樹脂護衣，再回到可冒險區域。這只證明 UI 製作／裝備／返回冒險串接，不作為普通新存檔進度證據。
- 危機、鍛造練習上限與繼承 UI 均用分開標示的 controlled fixtures 檢查；新存檔在有限窗口內未自然到達繼承或練習上限。
- 鍵盤／對話框檢查涵蓋 Tab 焦點、Esc 開啟選單、Space 操作與焦點回復；最終沒有殘留開啟中的對話框。

## 響應式檢查

- 主畫面量測矩陣 15 組：320、375、768、1280、1920 px 寬 × 768、900、1000 px 高。15 組均無水平溢位、對話框越界、小於 24 px 可見目標或按鈕裁切。
- 額外 1280×768 物品視窗保持在 viewport 內；375×667 開啟物品視窗時無水平溢位且視窗在 viewport 內；375×812 的視窗亦無水平溢位；320×667 行動導覽能開啟物品視窗。
- Safari、Firefox、實體裝置：**NOT TESTED**。

## 證據

- 原始結果與互動紀錄：`e-runner/attempt-20261016T054428920Z-regression/results.json`、`actions.ndjson.gz`。
- 截圖、manifest、執行清理證據：同一 attempt 目錄；Chrome profile 使用前 74,367,018 bytes，`runtime-closeout.json` 確認已刪除。
- `results.json` 為 157,228 bytes；各 PNG 均小於 256 KiB，無需壓縮。互動紀錄已 gzip 並由 attempt manifest 保存 SHA-256 及 round-trip 狀態。

# Phase8-F Production Chromium 回歸 Smoke

## 執行方式與來源

- 時間：2026-10-15 UTC；runner mode `smoke`，使用 fresh Chrome profile、fresh local save。
- Browser：系統 Chrome `153.0.8010.53`（Headless Chromium），Node `v22.14.0`、Windows x64。
- 受測來源：HEAD `9118454fe6520ae6a1fdb6283858ee1ead8fc5ab`；遞迴 `src/` SHA-256 `23d8f619f94b1d8296eb5f6ecf34cad22f0cf71f650e1a7d271280195a42cba2`；production `dist/` SHA-256 `f3749ad74cd6f221e17545e2742b9d09c476067d66422ac45735a11e2067fb02`。HEAD 與實際 build/source fingerprint 分開記錄，三者相符於 Phase8-F 的 `9118454` build 輸入。
- 以 Node 內建 HTTP server 提供 `npm run build` 產生的 `dist/`；透過 Node 22 內建 WebSocket/fetch 和 CDP 操作。沒有 Playwright、npm 套件、dev server、state injection 或 debug time skip。互動由 CDP `Input.dispatchMouseEvent`／鍵盤事件送至實際可見的按鈕；Storage/DOM 量測為唯讀。
- 原始資料：`attempt-20261015T034925986Z-regression/{manifest.json,closeout.json,actions.ndjson,checkpoint-regression.png}`。早期 runner 修正 attempt 均保留在同一 `f-browser/`，不作產品結果。

## 結果

- 9/9 主視窗可見開啟：這一生、住所與產業、地方消息與委託、角色、物品、日誌、地圖與世界、世界歷史、旅人筆記。
- Fresh save 季節為春；農田 UI 以合法季節選項種豌豆，畫面顯示成熟 1 日、預估收成 4 份，收成品每份可轉 1 食物或售 2 金。可見完成整地、播種、等待 1 日與收割。
- 森林伐木動作可用；由可見「尋找怪物」進入遭遇後，打開戰鬥並操作「逃跑」。
- 雜貨店「賣 4 金」交易與自宅「休息 · 1 小時」均可見執行。手動存檔成功回應 12 ms；reload 後比對世界日期（分鐘正規化）、區域/座標、角色生命/體力/金幣、互動提示、最近事件及玩家地圖格，結果相等。
- 已到達鍛造 UI；fresh-save 畫面選中的樹脂護衣要求 Smithing Lv.2，當前 Lv.1，材料／配方未滿足，因此本 smoke 未產生鍛造品。這是受測狀態限制，不記作 crafting 成功。
- Succession 在短 smoke 內不可達，沒有以注入死亡或跳過時間製造流程。
- Page exception、console error、failed request、HTTP 4xx/5xx：0。

## Phase7 對照與限制

Phase7 Chromium 回歸使用 Playwright/凍結 production build，記錄 17 visible actions 且 23 個存檔核心欄位 reload 相等；Phase7-K 後續 smoke 為 14 actions、兩 checkpoints，並另外覆蓋 UI accessibility/search。F1 以本機 system Chrome 153 和目前 `9118454` build 重跑主要視窗、季節作物、採集、鍛造入口、交易、遭遇撤退、休息及可見指標 reload；driver/瀏覽器版本不同，不能直接比較操作延遲或將單次 smoke 推廣至其他瀏覽器。

本結果是 Chromium 工程回歸，不是長時間壓力或真人遊玩證據。Safari、實體裝置及真人 Fun Gate 未測。

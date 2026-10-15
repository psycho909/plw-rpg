# Phase8-F Chromium QA 摘要

## 結果

- Regression smoke：9/9 主要 UI 視窗開啟；可見季節豌豆播種／收割、森林採集、遭遇／撤退、商店交易、自宅休息、存檔與 reload parity；錯誤 0。fresh save 的 Smithing Lv.2 配方受等級限制，沒有假報 craft 成功；succession 在 smoke 中不可達。
- Stress：要求 1,200 秒，完成 1,203.9 秒；3,602 action records、21 checkpoints、3 次 reload 全相等、3 次 C01 匯出完成、0 browser errors。
- Life／Adventure／Hybrid：各要求 1,800 秒，分別完成 1,804.1／1,804.1／1,804.7 秒；action records 9,604／7,432／7,456；各 31 checkpoints。所有完成 lane 的 closeout error count 為 0。Life 在 05:43／05:48 reload 後重開哥布林酋長戰鬥視窗；reload 前 `state.combat` 已 active、prompt 為「返回戰鬥 繼續」，且除 `dialog` 外其餘比較欄位相等，屬預期 resume-combat UI 行為，不是存檔／reload state defect。
- Life lane 另有 F-F1 runner defect：`2026-10-15T05:41:46.881Z` 進入哥布林酋長戰鬥但沒有記錄明確戰鬥按鈕 click。推測 `生活路線開啟森林` 以座標點擊了 overlay 上的「挑戰哥布林酋長」；所以此時間後的 Life lane「無戰鬥」主張無效，不能分類成產品強制戰鬥。後續 runner 應以 `element.click()` 操作目標，或驗證 `elementFromPoint` 命中目標。
- Storage/Performance：四條長測的 heap、DOM、listeners、`navigator.storage.estimate()`、CDP quota、IDB rows 和 JSON projection 已逐項量測。Inventory/collection UI timing selector 全 checkpoint timeout，是 instrumentation gap，沒有有效樣本；不能據此宣稱 UI 慢或量測成功。詳細數據與 runner/Phase7 限制見 [`performance-storage.md`](../performance-storage.md)。

## 實作與驗證

- 新增純 Node/CDP browser runner、helper 與 node:test：`scripts/phase8/browser-suite.mjs`、`scripts/phase8/browser-helpers.mjs`、`scripts/phase8/browser-helpers.test.mjs`。Stress 的 journal 匯出頻率調整為每 300 個循環一次；Chrome game-shell readiness 最長等候調為 60 秒。無 `src/` 修改。
- `node --check scripts/phase8/browser-suite.mjs` 通過；`node --test scripts/phase8/browser-helpers.test.mjs` 通過 2/2。
- 四份報告：`browser-regression.md`、`browser-stress.md`、`agent-role-playtests.md`、`performance-storage.md`。來源 HEAD `9118454fe6520ae6a1fdb6283858ee1ead8fc5ab`；`src/` SHA-256 `23d8f619f94b1d8296eb5f6ecf34cad22f0cf71f650e1a7d271280195a42cba2`；production `dist/` SHA-256 `f3749ad74cd6f221e17545e2742b9d09c476067d66422ac45735a11e2067fb02`。
- 未使用 Playwright、npm 套件或 dev server；測試使用 system Chrome `153.0.8010.53`、Node `v22.14.0` 與 production `dist/`。未做 Safari、實體裝置、真人 Fun Gate 或長於 30 分鐘測試。

## 未解限制

所有原始 attempt（包含 CDP timeout 與 Hybrid 首次啟動失敗）都保留於 `f-browser/`，失敗嘗試未混入完成 lane 指標。待追蹤項目為 F-F1 runner overlay click defect 與 UI timing instrumentation gap；Life reload 戰鬥視窗重開是預期恢復行為。沒有產品來源修改。此 QA 結果只支持指定 Chromium build 的工程回歸與量測結論，不支持真人樂趣或跨瀏覽器結論。

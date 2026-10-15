# Phase9-B 獨立審查

**結果：PASS WITH FINDINGS**（1 項 P2、1 項 P3）

審查範圍：P9-01／P9-02、Phase9 視覺與資訊揭露規範、Phase9-B 票據、B 差異、摘要與最後一次 focused probe。此為程式與證據審查；未重跑測試或瀏覽器流程，也未修改既有檔案。

## 發現

### P2 — 目的地座標與狼族核心說明仍各自硬編碼

- [goalHints.ts:18](../../../../src/presentation/goalHints.ts#L18) 把交付廣場座標寫成 `{ x: 10, y: 10 }`。目前值與 `LIVING_EVENT_LIMITS.deliverySquare` 相同，也與既有 `LifeNewsWindow.requestRoute` 路徑一致，因此沒有看到目前路由錯誤；但位置有 canonical 常數可讀，複製後未來若交付位置調整，Notes 的提示會與請求頁和實際交付判定分歧。改讀 `LIVING_EVENT_LIMITS.deliverySquare`，並以該位置斷言測試。
- [PlaceWindow.vue:144](../../../../src/components/PlaceWindow.vue#L144) 依 `WOLF_MONSTERS.core` 分支選擇戰前說明，但描述字串留在元件內。引擎已有 `wolfCombatPresentation` 的遭遇中提示，以及 `wolfFamily.ts` 對戰吼／月襲的實際行為；現有文字目前與已檢視的行為相符，未發現不實危險數值或推薦等級。將固定核心說明放在共用 presentation 投影或核心資料旁，避免戰鬥規則更新時 UI 文案失同步。

### P3 — UI 契約文件仍把已完成的 B 探測標為待執行

[docs/UI.md:38](../../../../docs/UI.md#L38) 的 Phase9-B 列仍寫著 after-build screenshot「pending Lead runner」。`b-summary.md` 與最後探測 `probe-20261015T093111935Z` 已記錄 Lead 重建後完成探測、16/16 戰前詳情鍵盤與滑鼠操作，以及農田提示的目的地啟動。請同步文件狀態，避免後續依過時的待辦描述判讀驗收。

## 驗收檢視

- **提示資料與條件：** `projectGoalHints` 為純投影；請求狀態／期限、農作可種狀態、危機階段、遭遇資格都取自現有狀態或 canonical projection。最多五筆且請求最多兩筆；沒有建立任務、完成追蹤、每日清單或勾選語意。單元測試涵蓋純度、期限、已關閉請求、空狀態、作物產能、危機與遭遇觸發；移除相應提示分支會使對應斷言失敗。測試已由實作摘要報告 10/10 通過，本次未重跑。
- **揭露與風險資訊：** 高階怪物等級只是登錄等級與玩家等級的並列比較，沒有推導危險分數或建議等級。內容怪物機制／掉落受 collection discovery 與知識投影限制；狼族固定核心及已遭遇變種資訊分開處理。酋長只在現有存活旗標成立時顯示。未發現提示洩漏未發現怪物的機制或掉落。
- **可操作性與鍵盤：** 原生 `<details>/<summary>` 提供展開語意；`PixelWindow` 焦點清單納入 `details > summary`。最終 probe 記錄 Tab、Shift+Tab、Enter、Space 對 16 列詳情的焦點與展開狀態，且 destination click 經 `elementFromPoint` 驗證。此證據支持本次 modal 內的鍵盤操作。
- **範圍與外觀：** 未見引擎規則、存檔結構、經濟或戰鬥平衡變動；提示只讀狀態，遭遇控制仍使用既有行動入口。新增展開區使用原生 details，未見引入新色彩、圓角或破壞黑白像素視覺的變更。計算僅在 Notes 的 computed 值更新時呼叫，且請求輸出受限；未見足以形成效能疑慮的重複重運算。

## 處置

可以接受 B 的功能與探測結果，保留以上兩項後續修正。先修 P2 的來源重複，並將 docs/UI.md 的 B 探測狀態更新為已完成，再把 P3 文案集中化列入維護修正；不需因本次審查要求重跑 B runner。一般玩家的目標理解度仍未有人類測試證據，依 Phase9 規範維持 DEFERRED。

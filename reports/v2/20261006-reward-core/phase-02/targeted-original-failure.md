# 原始 Targeted Browser Failure（保留）

首次 run 在 37.892 秒失敗，無600秒完成證據。尋找怪物按鈕disabled後locator逾時；raw stderr／targeted-browser.json初版與playlog保留。原腳本 monsterPopulation<1 只允許30次正常1小時休息；遊戲日生長率0.65且守衛會抑制，怪物降到0後可能需要超過30小時，因此腳本不能假定30小時就已恢復資格。這是待重跑診斷確認的合理推論；原失敗沒有保存最後state，不能宣稱已確認唯一根因。

修正僅測試腳本：允許至120次正常UI1小時休息、點擊前記錄真實actor/threat並斷言資格，失敗時另保留state/screenshot。未調整worldTime/RNG/怪物數量／產品設計。重跑前不宣稱Browser Gate通過。

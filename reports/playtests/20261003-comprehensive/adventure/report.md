# 正常 UI 冒險與 Boss 遊玩紀錄

Work Authority：[完整遊玩 Ticket](../../../../tickets/20261003-comprehensive-playtest.md)。固定基準 `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`、本機 Chromium／5180、全新 seed909 世界，所有成長、購買與等待使用正常 UI，沒有修改金幣、能力、年齡、世界時間或戰鬥資料。

完整成功執行為 2026-10-03 09:44:23.573–09:45:21.429 UTC，57.856 秒；公開等待操作推進 155.487 個遊戲日，並非實際遊玩 155 日。初段由 GPT-6 Luna Max 編寫與遊玩；代理用量限制中斷後由主 Agent 接手、修正 selector 與完整性斷言並重跑整條路線。

1. 初始 Lv.1 主角正常尋怪，執行防禦、藥水、攻擊；戰鬥中存檔／重載保留怪物與生命。兩次勝利升到 Lv.2；第三次遭遇正常逃跑。
2. 三輪共 18 次伐木、回家休息、出售木材與掉落，賺取裝備與藥水費用。三次「度過一季」自然解鎖 Village；購買並實際裝備鐵劍／皮甲。
3. 酒館聘用 fighter npc-7 與 healer npc-14；兩人上限後第三名按鈕停用。正常探索迷霧、進入礦坑、打贏第一層後離開；重入依設計將 stage 重置為0，開始新的 run。
4. 同一次 run 打贏史萊姆、精英哥布林與守衛首領。第二層戰鬥中存檔／重載一致；守衛勝利後 stage3、runs1、inDungeon=false，獲得額外3鐵礦，主角Lv.6存活。不同 run 的樓層不混算成三層 clear。
5. 以正常「等待 1 日」驗證日薪與三日契約到期；到期後 party 為空，不再扣日薪。
6. 再等待兩季，森林威脅自然經過第二次預警與 Boss 生成，於第二年夏5日確認 bossAlive=true。回家恢復、重新聘用兩人後，使用實際「挑戰哥布林酋長」按鈕開戰；5次攻擊與1次藥水打贏，主角Lv.7、HP82，bossAlive=false，完整 raw History 包含 `boss.defeated`。
7. 勝利後再等一日，世界時間繼續前進，Boss累積從0升至1.45，怪物人口仍成長，主角與兩位同行者續存。最終第2年夏6日19:42、gold341、HP82／136。

記錄共37個主要 checkpoint、51項操作摘要與7場完成戰鬥，page errors0、console errors0。每場逐回合 HP 與指令、角色／裝備／技能／傭兵、威脅與地下城狀態見 [results.json](results.json)。引擎單元測試另外驗證 fighter傷害與healer回血公式；本 UI 路線確實帶兩種同行者戰鬥，但 UI 不提供各成員的獨立傷害紀錄，不從畫面推算其個別貢獻。

關鍵證據：[正常三層 clear](dungeon-full-run-clear.png)、[自然森林 Boss 挑戰](forest-chief-challenge.png)、[Boss 擊敗](forest-chief-defeated.png)、[世界延續 checkpoint](results.json)、[正常操作產生的最終原始存檔](after-boss-save.json)、[可重跑 harness](harness.py)。

先前不完整執行的輸出保存在 [prior-economy-party.json](prior-economy-party.json)；其中命名為floor3的舊 checkpoint實為重入後第二層，不能作三層完成證據。最新 JSON 的 priorHarnessRuns 保留 selector 錯誤與停止點，HARNESS 錯誤不是遊戲 page error。主 Agent 首次接手也因挑戰按鈕包含圖示而未找到 exact文字，修正後成功；未將工具錯誤算成遊戲 Bug。

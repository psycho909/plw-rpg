# 全量 Regression

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`。最新 source 的完整 product suite：**229 tests / 14 files PASS**；typecheck（vue-tsc --noEmit）及 production build PASS。精確輸出：[unit](regression-final-unit.log)、[build](regression-final-build.log)。使用 --maxWorkers=1 避免同時測試環境 CPU 競爭，未放寬 timeout 或修改 assertions。報告工具另有 Python 4 tests PASS。

| 驗證 | 實際結果 | 證據 |
| --- | --- | --- |
| Chromium production UI | 28 checks PASS | [browser.json](browser/browser.json) |
| Firefox ESR | 8 checks PASS | [firefox.json](browser/firefox.json) |
| Pause / persistent close/reopen / background catch-up | 3 checks PASS | [persistent-idle](browser/persistent-idle.json) |
| 55 秒真 lifecycle freeze / 55 秒實際關閉 | 2 checks PASS；catch-up 2214 分鐘，關閉後 saved=loaded=2727 | [extended-idle](browser/extended-idle.json) |
| V1 native migration | 7 fixtures PASS；舊欄位、seed/RNG/time/history/角色/NPC/裝備/背包/threat/settlement/dungeon/party保留、合法新預設、save/reload與idempotence | [fixture provenance](engine/fixtures/manifest.json)、[migration](engine/migration-results.json) |
| 多 seed 10/50/100 年 | 17/909/2026 PASS；yearly batching vs daily＋每年重載 state 完全相同 | [long-term](engine/long-term-results.json) |
| Ownership / reputation 非空路線 | 正常行動取得 home/land/farmBusiness，100 年存檔重載 | [ownership](engine/ownership-lifecycle.json) |
| Regional event cause→consequence | 自然 road arc 三路 counterfactual；正常購鐵引發 iron arc | [arcs](engine/arc-counterfactuals.json) |
| RNG / deterministic actions | 0 Math.random callsites；相同seed/action/save-reload exact state hash | [determinism](engine/rng-determinism.json) |
| Single-writer 修復 | RED→GREEN；12 lifecycle＋9 opening browser checks；7新增 store tests | [Astra reproduction/review](astra/save-conflict-review.md)、[獨立 review](review/save-writer-review.md) |

## V1 核心亦在本輪驗證

完整現有 suite 包含世界時間、NPC lifecycle、農作／採集／交易、combat、dungeon、party／傭兵、settlement、threat／boss、death succession、save/load、event/history，並非只執行 V2 新測試。`actions.test.ts`／`simulation.test.ts`涵蓋 V1 引擎行為；`saveService.test.ts`與`playJournal.test.ts`涵蓋保存；其餘生命、身份、NPC、事件、ownership integration 與 `gameStore.test.ts`涵蓋 V2 新系統與保存 UI gate。Browser／native migration／長期 public API route 補上整合證據；不把 controlled fixture 當正常 Agent 遊玩。

Active Idle 在 Character、Inventory、NPC、Identity、Ownership、History 等視窗正常推進，×1／×5／×20與 Pause／Resume檢查；in-session 真背景 freeze 合法補進，關閉重開不執行 offline progress。55 秒關閉比較 13 個核心欄位完全相同。

## 原始失敗與限制保留

- P1 舊分頁覆寫：485 回退 480，原始 RED checkpoint／screenshots／unit failure 均在 astra；修後原 reproduction GREEN。
- P2 fresh opening 復原不可達：9 情境原 RED 全部保留，再以窄幅按鈕修正取得 GREEN。
- 修復初期 test Blob type mismatch、全量 test 1 項 lifeIntegration 超時（6227ms > 5000ms）保留 [initial full output](astra/save-writer-full-check-initial.log)。單 worker 重跑不放寬限制，229 PASS。
- 舊 soak末端匯出 locator 與初始 actor比較錯誤是 harness failures，另記 browser-soak，不刪除 raw。
- 長期 runner 原 ReferenceError、空報告發布、時間量測錯誤、NPC substring 計數及 Boss 陣列 snapshot 共享錯誤，保留前版本並修正重跑，非產品 bug。
- 非同步匯出競爭疑慮獨立 probe 另列，不能以穩定 snapshot 的一般 export check 掩蓋；原始 archive 是否保留與匯出是否完整分開判定。
- 本文件不宣告兩小時 soak 或 Agent 主觀目標已完成；其完成狀態以各獨立報告及 final review 為準。Human Fun Gate：PENDING。

## 短程覆蓋補驗

[Supplemental UI](browser/supplemental-ui.json)：11 checks PASS（包含3個News／Place／Combat Active Idle＋Pause／Resume及正常森林UI觸發戰鬥）。×20等待1.38／1.41／1.79秒推進55／57／56遊戲分鐘，暫停time不變，resume再合法推進。這是短程timer行為證據，不冒充2hSoak。

另用seed17／2026最新public createGame→serialize canonical新世界初始化、未改serialized欄位，openingSeen=false自然pause。取得writer後App startup-save與真正reload後最新checkpoint **17欄exact SHA完全相同**，包含rng、characters、NPC、history、threat、settlement、inventory/equipment所在characters、dungeon、life、party/crops。五名seedNPC於map DOM重載前後可見。屬受控fixture初始化，與正常探索／Soak明確分開。Console一筆未捕捉URL的HTTP404，page errors0。

最新App UI recovery strict static premium audit0 findings，見 [audit](review/premium-audit.json)。靜態審查不代替browser或Human Fun Gate。

## 非空戰鬥／傭兵／裝備／所有權交叉重載

[真 Browser 短程交叉驗證](review/active-dungeon-party-reload.md) PASS：使用已正常賺取裝備／自宅與聘用 Lucy 的 Adventure profile，正常 UI 旅行、入礦並觸發戰鬥，再 pause／save／reload。保存與 pre-Vue reload 的 **21 個 simulation root fields 完全一致**，含非空 combat、inDungeon、party、gear、life／ownership；完整 root 唯一差異是 pagehide auto-save 更新的 lastSavedAt metadata。掛載後戰鬥畫面恢復，正常攻擊擊敗史萊姆並推進 stage 1。58 source hashes／3 assets match，page／console errors 0。兩次安全停止的啟動失敗與七張截圖保留；本驗證不計入 Agent 或 Soak 時長。

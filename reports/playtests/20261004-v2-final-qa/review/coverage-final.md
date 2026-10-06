# Oakvale V2 Final QA Coverage — 短程獨立覆蓋審查

- Review time: 2026-10-05 14:38 UTC
- Ticket: `tickets/20261004-v2-final-qa.md` (`in_progress`)
- Frozen source / HEAD: `441e3c2b435f199a50cb78ee5b19521bcc084593` / same; branch `work`
- Scope: 只讀檢視凍結 source 的既有測試與最新 QA 證據，並用獨立 Chromium profile 補做短程正常 UI Active Idle 和受控 seed reload。只透過 `scripts.recorded_reports.write_recorded` 發布 QA artifacts；未改 `src/`、soak harness 或做 Git mutation。
- Reviewer: 未參與本輪 QA 產生結果的獨立 context；沒有可核實的模型遙測，不推測 backend model。
- Disposition: 229-unit/type/build、既有瀏覽器與 migration 證據加上本次 11 個 supplemental checks 提供工程覆蓋；正式 soak 與 Life/Adventure/Hybrid routes 仍在執行，Human Fun Gate 仍 pending，V2 Product Gate 未核准。沒有由本次檢查確認的 app bug。Supplemental Chromium 留下 1 個未定位 URL 的 404 resource console error、0 page errors；目前沒有證據判定它影響遊戲操作，仍應保留為未分類 runtime 訊號。

## 已有覆蓋證據

- `regression.md` 對凍結 source 記錄 229 tests / 14 files、typecheck、production build 通過；另有 Chromium 28、Firefox 8、V1 原生存檔 migration 7 fixtures、多 seed 10/50/100 年 engine、RNG/save-reload determinism、road/iron arc 與正常 ownership 路線結果。以上為既有記錄，本 review 未重跑全量 regression。
- 既有 browser smoke 覆蓋 ×1/×5/×20、Pause、背景 freeze/resume、關閉後無 offline advance，並測試角色、物品、地圖、這一生、住所、歷史、NPC 等 UI surface。新增 [supplemental-ui.json](../browser/supplemental-ui.json) 在全新 seed-909 profile 直接透過 production UI 建立世界；先以「起身」自然開始，再用 visible speed/footer controls，在地方消息、家中 Place、森林 Combat 三個視窗分別做 ×20 Active Idle / Pause / Resume。三次約 1.38 / 1.41 / 1.79 秒實際 idle 對應 55 / 57 / 56 game-minutes；各自 paused interval worldTime 不變、resume 後再增加 26 / 34 / 28 分鐘。Combat 由畫面地圖前往森林，再點「尋找怪物」觸發；idle 中 combat state 不變，之後由 UI「逃跑」離開。共 11 checks PASS、0 recorded failures。這只補上短程視窗行為，不代表長時效能或穩定性。
- 同份 supplemental artifact 在執行前比對 source manifest 的 58 個 source files，並比對 3 個本機／served assets；全數吻合凍結 `441e3c2b...`。本次未注入時間、角色能力或資源，所有世界時間推進均為正常遊戲 tick。Console 捕獲到一個 404 resource 訊息，但 harness 未記錄請求 URL；無 page error。
- 受控 reload 結果另與探索路線分開：以 fresh profiles 載入 canonical public `createGame(seed)->serialize` V2 fixture `seed-17.json` 與 `seed-2026.json`，fixture 各只用作 app 第一次啟動的初始 localStorage 狀態；沒有編輯 fixture 欄位。App startup auto-save 與實際 app reload 後 checkpoint 的 17 個欄位逐欄相同，兩 seed 的 `openingSeen=false`、`worldTime=480`，開場自然 paused；每次 reload 前後都有五個 fixture NPC 名稱實際出現在 app map DOM。這是受控 regression，不是 Agent Playtest、soak，也不是自然探索證據。正式 ×1 reload 的 loaded state 可以有合法 foreground tick，不能要求與 pre-app snapshot 全欄完全相等。
- 7 個 V1 fixture migration 已涵蓋 legacy state、RNG/time、save/reload、defaults、idempotence 與 continuation。這是原生 fixture 的工程驗證，不等同真人 migration 體驗。
- 新增的 same-source [ownership-lifecycle.json](../engine/ownership-lifecycle.json) 與更新後 [long-term.md](../long-term.md) 已補齊非空 identity 的 10/50/100 年 checkpoint：seed 909 正常 farm/gather/trade/homeRest route 未注入時間、資源或身份，10/50 年 active `alden` 都保有 resident/farmer/skilledFarmer/farmOwner、reputation 28、farming 84；100 年自然 successor `npc-105` 是 resident/farmer、reputation 0，`alden` 的三項 property ownerId 仍保留。每年 save/reload 共 100 次、same source PASS。此項原缺口已解除；限制是 headless engine `SaveService` checkpoint，不能替代 browser IndexedDB journal 或 UI/真人身份感受。
- NPC 結構資料既有覆蓋包括每個 long-term engine seed 追蹤 6 位 featured NPC、soak 追蹤最多 10 位並保存 memories，以及 Life/Hybrid route 的實際 UI NPC 互動資料。這些證據支持 state／memory lifecycle 的部分工程檢查；不能由被動世界 seed 推論 NPC 對話或真人記憶感受已通過。

## 仍欠的覆蓋與結案條件

1. **正式 soak 與 routes 都未完成。** 本次讀取 `soak/attempt-05/checkpoints.json` 的最新 sample 是 14:35:56.419 UTC：開始於 14:08:55.868 UTC，checkpoint 27，elapsed 1,620.552 / 7,200 秒（約 22.5%），尚未到排定 reload，距目標至少還需連續實際時間；若不中斷，120 分鐘邊界是 16:08:55.868 UTC。此刻不能稱兩小時 pass。最新正式 route JSON 仍為 `running` 且 fingerprints 指向 441e3c2b：Life 2,498.88 / 3,900 active seconds（最新 observation 14:34:18.605 UTC）；Adventure 2,371.02 / 3,900（152 observations，最新 14:36:11.212）；Hybrid 2,283.32 / 3,600（最新 14:35:31.497）。結案要依 route 原始記錄核對直接觀察有效時數、無人觀察區間、driver errors 和自然 reload 前後證據；較早的失敗版本仍保留，不能把舊 c02 結果挪作最新 source 通過。
2. **17 欄位有受控 exact check，正式探索 reload 仍是部分欄位加合法前景推進。** Soak preflight 已記錄 pre-app localStorage 17 欄一致、same actor/equipment，loaded worldTime 比 saved checkpoint 多 1 分鐘，符合當時前景 catch-up 限制。這是合法差異，不能因此列 bug。等正式 soak reload 時仍應保存其既定 17 欄位與前景差異界線；受控 seed17/2026 supplemental 只能補足「paused opening initial checkpoint」情境。
3. **NPC 記憶樣本需由已完成路線結案。** 最終摘要應固定引用 5–10 位實際互動 NPC 的 ID/name、畫面互動、結構化 memory、後續變化及自然 save/reload 對照。soak 的被動 featured NPC `memories=[]` 不能單獨視為 bug，也不能取代互動路線；Life/Hybrid 尚在 running，因此目前不做通過判定。
4. **性能與 data growth 尚未有正式長時趨勢。** engine checkpoint bytes 有 10/50/100 年數據，獨立短 browser/GC 診斷只支持各自量測範圍。仍待 soak 最終 DOM/heap/IndexedDB/journal/save/export latency 趨勢及原始 errors；短程 UI supplemental 不能外推至 7,200 秒、配額、記憶體洩漏或長期存檔容量。
5. **Fun-signal 與 final summary 等待正式路線及真人回饋。** Agent 的 goal/reward/retention 訊號須在完整路線後作時間線解讀，不能用短程人工點擊或舊自動 drought 判斷代替。

## Product findings、bug 與文件狀態

- 既有 Life 探索提到重複伐木、成熟等待與聲望路徑清晰度，屬待真人確認的 **Product Finding**，不是工程 bug。Agent 結果不代填八題真人答案。
- P1 single-writer 修復已有 RED/GREEN 與獨立 review 證據；本次短程補測沒有重新驗證 writer race。
- P2 export interleaving probe 在受控 repository Promise 交錯下預期失敗；尚未證明目前 IndexedDB adapter 會出現此時序，也未證明 archive source records 遺失，維持 OPEN，不寫成已發生資料遺失。P3 重複警告文案亦仍 OPEN，與產品好不好玩分開記錄。
- `human-fun-gate.md` 八題仍空白、Human `PENDING`、Product `NOT YET APPROVED`，這是正確 gate 狀態。
- **已解：** root README 的 Regression 連結與 `topregression.md` 歷史索引已更新；目前唯一 canonical Regression 是 `regression.md`。各 route README 部分仍是 PREPARED/START 指引，應在正式 route 結束時同步最終結果。歷史失敗 evidence 保留，不計入最新來源 pass。

## 最終覆核入口

runtime 完成後，依當時最新 JSON/playlog/reload evidence 更新正式摘要與 `final-review.md`；核實單次 soak 是否達 7,200 秒／120 checkpoints、三條 route 的有效觀察與 fingerprints、性能趨勢、原始 errors/failures、NPC／identity 結構化證據及 P2/P3 disposition，再分別給 Engineering、Browser、Agent、Human、Product Gate 狀態。Human Fun Gate 只有真人回覆能解除。
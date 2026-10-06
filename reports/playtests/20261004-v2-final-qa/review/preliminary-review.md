# V2 最終 QA 獨立中期覆蓋審查

**狀態：PRELIMINARY / NOT FINAL。** 本報告是初步覆蓋與證據盤點，不能當作最後 QA 結論，也不為任何尚在執行的測試記 PASS。

- Review time：2026-10-05 04:09 UTC
- Ticket：`tickets/20261004-v2-final-qa.md`，狀態 `in_progress`
- Branch / source HEAD：`work` / `c02b600c6f5f1533374d671b707d333c86d852d7`
- Reviewer：未參與本輪 QA 施工的獨立 context；依指派為 GPT-6 Luna Max。此環境沒有 backend model telemetry；README 指定的 `.codex/agents/luna_worker.toml` 在 checkout 與 HEAD tree 均不存在，因此不能用該 profile 核實 runtime 模型。
- 範圍：讀取根 `AGENTS.md`、README、Ticket、`docs/SUBAGENTS.md`、`docs/agents/review.md`、QA README／baseline、既有中期 coverage review、Astra concerns 與主要 runtime 摘要；直接讀 V2 spec 的 QA、performance、Fun Gate 與 Definition of Done 章節。未逐份審完所有 raw／圖片／逐 checkpoint 檔，需待完整 final review 再做。

## 基準與 Standards 檢查

本次檢查命令包括：`git branch --show-current`、`git rev-parse HEAD`、`git status --short --untracked-files=all`、`git diff --name-only`、`git diff --cached --name-only`、`git ls-files --others --exclude-standard`、`git diff --check`、`git diff --cached --check`。截至 04:09 UTC，branch 與 HEAD 符合 Ticket 凍結基準；staged 為空，僅 `TODO.md` 有一筆 unstaged 變更，未發現 `src/` 工作樹差異。QA 輸出仍有大量未追蹤檔；本 reviewer 沒有修改它們。

`build-manifest.json` 列出 57 個 source SHA-256 與 3 個 frozen dist asset SHA-256；我逐一核對 checkout 的 57 個 source 檔與 `/tmp/plw-v2-final-qa-dist` 內 3 個資產，57/57 與 3/3 相符，mismatch=0。manifest SHA-256 為 `6d1ae189d7aa0859d524f07937f834ebdcab115066b43e403381f8c4d9201e00`，source commit 仍是凍結 SHA。這證明本次讀到的 source/dist 一致；本初步輪沒有重新發送 HTTP 請求核對 5195 回應內容。

Cloud environment status 顯示 instance `running`、`connected`、觀測為 current；HTTP network policy 為 restricted，state `unknown`，沒有 configured credentials、variables、identities 或額外 capabilities。此 QA 使用既有本機 Chromium／凍結本機 build，不需要外部帳密；本 reviewer 未改環境設定。這只記錄本機 QA 所需條件，不宣稱外部網路政策已 ready。

依 repo Review Contract，既有 `review/coverage-review.md` 標示為「中期」，不能代替最後 review。本檔僅寫在允許的 `review/` 目錄；透過 `scripts.recorded_reports.write_recorded` 發布，先追加同目錄 `playlog.jsonl` 再更新可讀投影。

## Standards／Spec 覆蓋盤點

| 要求 | 目前證據 | 初步狀態 |
|---|---|---|
| V1 regression、typecheck、production build | `regression-initial.log` 記錄 14 files、222 tests、typecheck/build 通過；本 reviewer 未重跑，因 source SHA 未變 | 有既有通過證據；不是本次重跑 |
| Browser／idle／平台 | QA README 記錄 Chromium 28 checks、Firefox 8 checks；`browser/persistent-idle.json` 3 checks PASS | 有既有 smoke 證據；headless Chromium 是完整 app runtime，但不代表 Safari／手機實機 |
| 原生 V1 → V2 migration | `engine/migration-results.json` 標示 7 fixtures PASS，來源 V1 commit `75662ae3b5aa4045976a2844b41c01d4bbcef340`，含 legacy 欄位、時間/RNG、reload、idempotence 與 continuation 結果 | 有既有 engine／save 證據；尚不等於真人 migration 體驗 |
| 10／50／100 年與 NPC lifecycle | `engine/long-term-results.json`、`featured-npc-lifecycle.json` 標示 PASS，source SHA 相同 | 有既有純 engine 證據；不覆蓋真 browser IndexedDB 長期成長或 export |
| Active Idle／性能 | Spec §§46–47 要求倍率、暫停、背景／reload 與 heap、DOM、IndexedDB、journal、save/export latency／UI responsiveness；attempt-04 仍 RUNNING | 未結案；要用完成 runtime 端點值判斷趨勢，不用短期值推論 100 年 browser archive |
| Fun／Memory Gate | Spec §§48–49、52 要求八題真人回饋和能描述自己的一生；`human-fun-gate.md` 八題仍空白 | Human `PENDING`、Product `NOT YET APPROVED` 正確 |
| Standards／證據保存 | Ticket 要保留原始 failures、source/build provenance、分開 gate 狀態；QA 使用 recorded writer | 舊失敗保留；此報告也使用 writer。最後需再核對完整 raw、所有 archive checksum 與最後檔案清單 |

## 進行中 runtime 證據（不能標 PASS）

- **Soak attempt-04：** `soak/attempt-04/checkpoints.json` 仍是 `running`，開始於 `2026-10-05T03:49:30.134Z`。最後讀到的 checkpoint 為 CP17、`04:06:30.271Z`、elapsed 1020.137 秒；Ticket 要求單次至少 7200 秒、至少 120 個每分鐘 checkpoint。該 snapshot 的 `reloadChecks` 為 0、UI completed actions 為 2；尚未證明多次 save/reload。snapshot 無 page error/resource failure；唯一 console 404 是 `http://127.0.0.1:5195/favicon.ico`。此時程遠未到兩小時，不可與舊 attempt 01–03 的失敗／未完成秒數相加。
- **Adventure attempt-04：** 最近讀到的檔案仍 `running`，seed 17、elapsed 約 1024 秒、38 observations；有依當下敵方 HP、角色 HP、藥水與撤退風險記錄的 agent decisions。頁面／harness errors 為空，console 404 只指向 favicon。仍未達每路有效探索至少 3600 秒。
- **Hybrid：** 最近讀到 `running`、seed 2026、elapsed 約 924 秒、14 observations。保留一筆 03:58:24.926 的 harness timeout：dialog 攔截旅店休息按鈕；後續 decision 記錄通用木材出售操作關掉視窗而未完成出售，改換採礦探索。這些是尚待處理的操作覆蓋／harness 證據，不是已確認 app bug，也不能把未完成交易寫成成功。
- **Life ownerlife/run-03：** decision log 記錄 04:02:09 起身、04:03:20 開人生視窗成功、04:03:35 與 04:04:35 兩次 `Keyboard.press(timeout=...)` harness TypeError、04:05:06 開住所視窗成功、04:05:27 正常 pause 後閱讀。依 root 提供的 runtime 更新，至少 04:03:35–04:05:06 約 91 秒技術除錯須扣除，其他工具不可控時間亦須排除；正常透過 UI pause 閱讀算有效 agent play。最後要用成功互動／真實決策紀錄計有效時長，不用 start/end wall-clock 相減。需避免把這個 run 與 03:50 左右啟動的 Life route 混成同一時數。

## 未解 findings

1. **P2 Engineering scalability／journal growth。** Astra 窄範圍審查已確認每個有前進的 tick 會追加一筆 time record，events 可為空；過往真 Chromium run 約 10 records/s。當前 attempt-04 CP17 已有 7,809 IndexedDB records，短期尚未證明存檔／匯出失敗，但足以確認 archive 持續長大。純 engine 10/50/100 年結果不走 gameStore／IndexedDB，不能解除此 gap。最終 Engineering 結論必須揭露完整 journal 的長期容量／匯出仍未充分驗證；不可藉裁切、丟事件或重設契約暗中處理。
2. **P2 Product finding：Life 危機 agency／business capacity。** Astra 審查指出自然經濟可能使糧食長期飽和，而主要 road crisis 需狩獵；生存或房屋儲物正常不等於 Life 玩家能介入危機並看見世界反應。這影響 Ownership、Q5/Q6/Q8 等產品問題，應保留為待真人／指定 counterfactual 驗證的產品發現，不在本 Ticket 偷改設計。Human 仍 PENDING。
3. **摘要狀態不同步。** 本次讀取時 QA README 仍將多 seed 10/50/100 列為 RUNNING，但對應 engine result JSON 已標 PASS。Final README 必須依最後證據同步，並區分純 engine PASS 與 browser runtime 狀態。
4. **「12 份指定 Markdown」未在 Ticket 列檔名。** 目前 QA tree 已超過 12 份 Markdown，包含 failures、舊 attempt 與 supporting docs。最終索引需明確列出 12 份 canonical deliverables，將補充／歷史文件另列，否則此項 acceptance 無法只靠 Ticket 核對。
5. **Profile 缺檔。** README 與委派規範引用 `.codex/agents/luna_worker.toml`，該檔不存在。請 final evidence 沿用明確指派的模型資料並標記無 backend telemetry；不得把缺檔寫成已驗證 profile。

## 暫定 disposition

沒有足夠證據給 Engineering、Browser 或 Agent Exploratory 最終 PASS。現有 regression、migration、engine longevity 與部分 browser smoke 有既有通過紀錄；soak、三路 Agent 時長、Life 有效時數、12 份正式清單、final archive/source/asset/runtime 核對仍待完成。保留所有 attempt 01–03 failures。Human Fun Gate **PENDING**；V2 Product Gate **NOT YET APPROVED**。本 reviewer 不修改 source／其他報告，不 commit／push；root 收齊最後報告後，需再獨立復核 12 份文件、raw failures、source與asset hashes、writer archives、有效 runtime 時長與 gate 狀態。

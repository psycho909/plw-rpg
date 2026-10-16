# Phase10 Whole-phase Independent Max Review Follow-up

核對日期：2026-10-16。此 follow-up 只覆核原報告的 P2-01、P3-01、P3-02 與交付狀態一致性；不修改原 review、Ticket、風險登錄或其他既有檔案。

## 核對依據與範圍

- 本次 checkout 為 `v2x/reward-core`，`HEAD` 與本機 `origin/v2x/reward-core` tracking ref 均為 `b11d7603b14219739cb7524105669dc187c23cf8`；開始核對時工作樹乾淨。這裡記錄本機 ref，沒有在本 follow-up 另行 fetch。
- 查閱原始 [Independent Max Review](f-max-final-review.md)、[Phase10 risk register](../final-risk-register.md)、[lead final review](../final-review.md)、[long-world report](../long-world.md)、D runner／稽核報告、raw attempt JSON、[external-review-handoff](../external-review-handoff.md)、Phase10-F 與 parent Tickets、Spec 及相關 runner／calendar source。
- 直接核算九列 checkpoint 的 worldTime 與 parity；核對新 attempt sidecar 4/4、D aggregate manifest 19/19 的 SHA-256 與 byte size。沒有重跑 runner、Vitest、build 或其他測試。
- **Runtime：**本 review／D runner 的 requested role 為 `gpt-6-luna / max`（依派工與報告標示）；工具沒有提供可確認的模型 runtime 身分，task name 不作為 runtime 證據。raw D manifest 只確認 runner 的 `platform=win32`、`node=v22.14.0`，這是作業系統／Node 版本，不代表執行 runner 的模型身分；該模型 runtime 為未知。
- `b11d760` 相較 manifest 所記 `e9f2efc` 的 `src/` 差異為空；修正只改 runner 與報告。raw manifest 記錄 123 個 `src/` 檔案 fingerprint，但沒有記錄執行當下的 runner fingerprint。它同時記錄 120 天曆法公式與曆法常數；以下以 raw checkpoint 時間、sidecar 與已提交 runner 一併判讀，並保留此 runner-bytes provenance 限制。

## 原 Review findings

### P2-01 — 長跑標籤年數與遊戲曆不一致：RESOLVED

修正後 [runner](../../../../../scripts/phase10/d-long-world.mjs) 以 `CONFIG.daysPerSeason * CONFIG.seasons.length * CONFIG.minutesPerDay` 計算遊戲年。source 的曆法是每季 30 天、每年 4 季、每天 1,440 分鐘，即每遊戲年 120 天／172,800 分鐘。

新 attempt [`attempt-20261016T065808351Z`](../d-runner/attempt-20261016T065808351Z/manifest.json) 的 manifest 記錄 seeds `40131,40132,40133`、years `10,50,100`、上述曆法、`PASS` 及 9 個 checkpoints。逐列核算結果為：10 年 `worldTime=1,728,480`、50 年 `8,640,480`、100 年 `17,280,480`；九列均以 fresh-save 起點 480 加上 `year × 172,800` 精確相符，save/reload 與 continuation equality 全為 true，orphan references 全為 0。Summary 的 9/9、`failure=null` 與 raw checkpoints 一致；新 attempt sidecar 4/4、D aggregate hash 清單 19/19 均符合實際檔案雜湊與大小。

原 attempt 已保留；其 [`calendar-correction.json`](../d-runner/attempt-20261016T034911258Z/calendar-correction.json) 明確改按 30／150／300 個遊戲年解讀，並標示不作為精確 10／50／100 年證據。Phase8 runner 同樣採 360 天／標籤年數；[Phase10 long-world report](../long-world.md) 已將 Phase8-D 列為歷史時間尺度限制，沒有把舊結果冒稱為本次精確年數證據。

此 finding 原本要求的精確年數證據與相關報告修正已具備。範圍仍是 No Intervention 的模擬穩定性，不代表真人連續遊玩或所有玩家操作路徑的 100 年體驗。runner manifest 的 `HEAD=e9f2efc` 是修正提交前的 HEAD，manifest 未保存工作樹 runner bytes fingerprint；這限制執行檔逐位元組 provenance，但 raw manifest 的公式／曆法、九列精確 worldTime、已提交修正 runner 與 sidecar 足以核實此 finding 所要求的 checkpoint 時間尺度。

### P3-01 — External handoff 的 Current HEAD 過期：DEFERRED TO DELIVERY CLOSURE

[External review handoff](../external-review-handoff.md) 仍將 `Current HEAD` 寫為 `29e7c4b9328c8ea7d58a71a4163a8d93643ea0db`；目前 checkout 已在 `b11d7603b14219739cb7524105669dc187c23cf8`。依本次交付指示，此欄位留待 closure 時填入最終 delivery commit，不在此時填入可能仍會變動的 SHA。因此原 finding **目前尚未修復**，由交付流程明確延後；它不阻擋 Owner 現在判斷內部工程 Gate，但在最終 commit 回填並對帳之前，External Review handoff **尚未 ready**。

`final-risk-register.md` 將此列寫成「Resolved at delivery (final commit filled)」，與 handoff 目前仍為 `29e7c4b` 不符。該列目前是過早的完成宣告，應在最終交付時按實際狀態更新。

### P3-02 — F Ticket 使用非正式狀態值：RESOLVED (ENUM ONLY)

原 `in_review` 已改為 `in_progress`。依 [Ticket Convention](../../../../../tickets/README.md)，`in_progress` 是合法狀態值，因此原 finding 的 enum 缺陷已解決。這不表示 Ticket 已 accepted：目前 [Phase10-F Ticket](../../../../../tickets/20261016-v2x-10f-final-handoff.md) 仍是 `in_progress`，Acceptance 尚未勾選，Commit / PR 欄仍待回填。

`final-risk-register.md` 寫「Resolved (`in_progress` → `accepted`)」與目前正式 Ticket 不符；可確認的狀態轉換只有由非法的 `in_review` 改成合法的 `in_progress`。F Ticket 狀態說明仍稱「P2-01 ... being addressed」，該描述也已過時。以上均屬交付狀態記錄尚未對帳，不把 Ticket 或 Phase10 宣稱為 accepted。

## 新發現：交付狀態摘要不一致 — P3 / DEFERRED TO F CLOSEOUT

風險登錄的 P3-01／P3-02 關閉文字，分別與 external handoff 的舊 HEAD 及 F Ticket 的 `in_progress` 狀態矛盾；lead [final-review](../final-review.md) 仍將 whole-phase review、DoD #15 與 Q8 標為等待獨立 review，而本 follow-up 完成後該描述也需更新。這是文件／治理狀態一致性問題，不是產品程式缺陷；留待 F Ticket closure 一併對帳。此 follow-up 不修改任何原檔。

## 最終 disposition

**Owner-ready：是，限於 Owner 作出內部 Engineering Gate／RC 決策。** P2-01 已有精確 checkpoint 證據；P3-02 的 enum 缺陷已修正；本次核對未發現新的 P0／P1 產品阻擋。這不是 Owner acceptance、Ticket accepted 或 Phase10 關閉聲明；parent 與 F Tickets 仍為 `in_progress`，其 acceptance 與 delivery evidence 尚待正式 closure。

**External-review-ready：否。** P3-01 的 handoff HEAD 依指示待最終 delivery commit 才填，External Code Review 仍是 `NOT STARTED`；risk register、lead final review 與 Ticket 的狀態摘要也需在 closure 對帳。完成 delivery commit 後，更新 handoff HEAD 及狀態摘要、將本 follow-up 納入正式 Evidence，並確認 remote／Ticket closure，才可把外部 handoff 標為 ready。

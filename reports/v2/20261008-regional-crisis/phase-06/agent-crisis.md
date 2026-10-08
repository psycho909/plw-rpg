# Phase6 J AgentCrisisPlaytest — 正式 Chromium 長跑

**Disposition: DURATION / METRICS PASS; NORMAL CRISIS ARC INCOMPLETE.** Runner 的通用 `PASS_J_BROWSER_NORMAL_ARC` 不構成完整 arc 驗收：該 run 到 1800 秒時第二次危機仍在 active，`complete=false` 且 aftermath save/reload 未驗證。

## 執行與來源

- Run `20261008T013358Z-pid56004`，agent-crisis lane；正式 browser duration 1806.75s，normal fresh lane 1800.20s（門檻 1800s），新 fresh world seed 909，未注入狀態。Frozen HEAD `bd316cb326e5fbc20087c0154d6e3f294a5daac7`、fingerprint `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`；source stable。
- 31 個 checkpoint JSONL rows（其中 30 個約每分鐘排程取樣，另有 final row），最大相鄰間隔 62.07s；1069 次 policy choice，operation log 中 1069 筆有可見世界依據的非空 reason。選擇分布：wait_one_day 566、move_toward_north_forest 206、inspect_local_news 171、visible_speed_x20 56、fulfill_visible_resident_request 36，其餘為準備檢查、營地行動及戰鬥。末次理由是「檢查可見防衛需求 equipment=needed、defenders/food/gold=covered；沒有可見可用支援行動，所以避免虛構貢獻。」這是 script policy reason，不是 human motivation。Requested tier GPT-6 Luna / low，backend runtime verified=false。
- page / console / request / HTTP errors 均 0；storage errors / unhandled rejections 0。Controlled fixture lanes 6/6 pass 並與 normal lane 分開。

## Arc 與使用者可見操作

第一次危機 trace 觀察到 warning → preparation → active → aftermath；其 validator 計數為 19 個 crisis-phase UI action choices（2 次戰鬥發起 + 17 次戰鬥回合），runner 窄欄位 `normalCrisisActionCount=4` 也只是 action taxonomy count，不是成功結果或 contribution 數。raw trace 的 major contribution event #66 使用奧登名字，但沒有 actor ID / full contribution ledger / crisis ID，不能據此判斷玩家或 NPC 執行。其後第二次 warning → preparation → active，在 1800.20s 時仍為 active，結果沒有 outcome，沒有 aftermath save/reload。機械欄位列出 `orderedPhasesObserved=true`，但 `aftermathSaveReloadVerified=False`、`complete=False`。因此只承認已觀察到的階段與 first-crisis aftermath；本 run 不符合要求的完整 normal fresh arc + aftermath reload。

正式 run worldTime 從 510 到 1084787；最後危機序號 2，event count 1→150，history 1→96。第一次危機造成的 major events 可在 save 中看到 warning、settlement contribution、resolved；最終第二次危機仍 active，沒有可用的第二次 threat/boss 結算值，也沒有 checkpoint 聚落總人口欄位。五次 periodic UI save/reload（不含 aftermath reload）；延遲 277.09–342.76ms，中位數 301.56ms；最後一次 phase cooldown、invariant mismatches `{}`。第二次危機 active 並非 browser error，而是固定時長結束時的遊戲狀態。

## 資源與儲存量測

31 checkpoints；最大相鄰間隔 62.07s。IndexedDB record count 10 → 1601，localStorage 79,961 → 234,195 bytes，history 1 → 96，event count 1 → 150，journal pending 全程為 0。JS heap used 4,250,488 → 6,970,104 bytes（max 33,482,784）；DOM nodes 2,163 → 2,148（max 3,992）；listeners 445 → 441（max 665）。數值是單次 run 觀測，不是 leak-free 門檻判定。

此為單一 seed 的自動政策探索，不是 multiseed 或人類故事驗收。早期 selector、SIGKILL、modal/dialog 失敗均保留。Human `DEFERRED / NOT APPLICABLE AT THIS STAGE`。

Raw evidence: `j-browser-runs/20261008T013358Z-pid56004/j-browser-result.json`, `checkpoints.jsonl`, `normal-phase-trace.jsonl`, `operations.jsonl`。



## Strict-ID fresh arc supplement — attempt incomplete

`j-normal-arc-runs/20261008T035215Z-pid60577` ran the reviewer-approved recorder SHA `5fda218320bc96536b2267e577c8d20ad035b24a8f954eb84e19391f0f6f55e5`, source HEAD/fingerprint matching above, from a fresh normal UI opening (seed 909). It followed crisis ID `goblin-regional:0000038d:1` through warning → preparation → active → aftermath with no browser errors and did not start combat. The visible crisis report offered no contribution controls in warning/preparation; `crisisActions` is empty, so this run provides no real food/gold Life ledger contribution evidence. Treat this as a local product finding about this fresh save’s available opportunity, not an Engineering failure; do not manufacture scarcity for QA. Aftermath save/reload then failed the recorder’s full-save equality check on only `lastSavedAt` (1791431561867 before, 1791431561991 after); the run status is FAILED and no success is claimed. Preserve the trace as a failed supplement, not as a pass. The raw full-save/policy trace records each phase and reason.

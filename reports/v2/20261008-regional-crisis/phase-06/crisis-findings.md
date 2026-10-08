# Phase6 Product Findings / Verification Risks

Source checkpoint: F accepted `9a23a5df2130aec03f76e5eaaababae1f5e9e72b`. Development findings; I/J gameplay distributions and browser profiling have not run. Human: DEFERRED / NOT APPLICABLE AT THIS STAGE.

## PF-F01 — Recovery safety valve covers zero population at resolution

Evidence: F accepted resolver schedules one adult relief immigrant only if population is already zero and Chief alive at resolution; due date is 30 game days later and rechecks both. Public regression confirms this case recovers once and allows succession/noncombat continuation. Independent review explicitly documents that a later fall to zero during aftermath does not schedule relief. This is an approved narrow scope limitation, not evidence that every population-zero world can recover.

Severity: provisional P2 product coverage concern, pending I/J occurrence/impact measurement. Recommended direction: measure later-zero routes and distinguish normal-world frequency from controlled extremes; if materially encountered, decide whether due-check eligibility should extend beyond zero-at-resolution. No automatic scope expansion during UI or QA.

## VR-F02 — Exact preflight clone cost remains unmeasured

E camp turns and F-sensitive complete actions preview exact state on an isolated clone. F daily preview only applies on actual resolution/recovery boundaries; ordinary non-F actions do not clone. History is capped at 20,000 records. At an F-boundary camp turn, both previews can occur. Core atomicity/regression passes, but large-history latency/heap/DOM/browser responsiveness has not been measured. This is a verification risk, not a confirmed performance bug. I/J must profile and preserve evidence before any performance claim or redesign.

## Pending product evidence

Role freedom, Life versus Adventure leverage, no-player NPC autonomy, crisis frequency, meaningful aftermath/reward signals and long-world stability remain for I/J. Engineering tests do not establish fun or Human Product Gate approval.


## J 最終更新（2026-10-08，Asia/Taipei）

最新測試 source `bd316cb326e5fbc20087c0154d6e3f294a5daac7`；I/J 的 91 個 production source 指紋相同：`c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`。上述 F checkpoint 保留作歷史紀錄，以下為最新處置。

- **VR-F02：工程驗證完成。** 20,000 筆 major history 的受控測試完成，存檔 2,670,488 bytes，三組 Chromium UI 案例通過；實際 action／preflight 耗時及拒絕案例限制見 [performance.md](performance.md)。不是所有裝置的效能保證。
- **PF-F01：保留 P2 範圍限制。** 人口恢復僅涵蓋結算時人口為零且 Chief 仍存活的指定情況；不承諾任何時點人口歸零皆有援助。受控恢復、繼承及百年 save/reload 通過；沒有藉 QA 擴大此機制。
- **PF-J01：P3，初期生活介入的目標指引。** seed 909 的正常非戰鬥補測中，預警／準備階段沒有食物或金幣短缺，角色沒有可捐裝備，因此沒有可執行的支援按鈕。世界完成同一危機及餘波，沒有強迫角色戰鬥。這不證明所有生活介入無效：500 組實際公共支援配對顯示非戰鬥準備提高結算機率；該實驗資源為受控起始輸入。建議後續產品工作說明「居民已準備什麼」及取得／製作可捐裝備的下一個自主目標，不強行製造短缺。
- **PF-J02：P3，政策探索中的重複操作訊號。** 30 分鐘 run 的 1,069 個政策選擇中，566 次是等待一日。危機造成階段、介入與後果，但此腳本不能評估真人是否感到重複；下一個自主目標的理解仍須真人資料。見 [agent-crisis.md](agent-crisis.md) 的時間線與局限。
- **PF-J03：P3，Stress 終點效能取樣差異。** 最後 DOM/listener 4,598/922，高於前一 checkpoint 的 2,140/442，原因未確認；整段未出現持續上升，Agent 終點為 2,148/441，heap 多次下降且 journal pending 為零。獨立審查認為目前未顯示 §78 要求延長測試的持續症狀；不宣稱無 memory leak。後續效能驗證可補同 UI 狀態及 reload 後取樣。

原始 QA 工具故障另列 [bugs.md](bugs.md)，不混入上述 Product Findings。Human validation：**DEFERRED / NOT APPLICABLE AT THIS STAGE**。

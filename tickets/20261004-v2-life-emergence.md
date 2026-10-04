# Oakvale V2 — Life & Emergence

- Status: blocked
- Owner: 本專案使用者，沿用README
- Approver: 同Owner
- Approval evidence: 2026-10-04使用者提供正式V2規格並指示詳細閱讀後直接開發。
- Risk: L2（可逆存檔migration、跨模組遊戲系統；不操作正式玩家資料）
- Updated: 2026-10-04
- Branch: work
- Git / Remote authority: 驗證後commit/push work；不合併main、不部署。

## Goal
依[正式V2規格](../docs/specs/V2-LIFE-EMERGENCE.md)建立能留下人生故事的單機世界。

## Scope
V2-0 Foundation/Migration、V2-1 Identity/Reputation、V2-2 NPC Life、V2-3 Home/Land/Farm Business、V2-4三個完整事件鏈/真實世界委託、V2-5 Director/稀有旅人/傳聞、V2-6整合平衡與長期測試、V2-7真實遊玩Fun Gate。

## Out of Scope
正式規格§50的所有Non-goals；server、AI API、多人、完整魔法、龍戰鬥、地圖擴張、平衡之外的V1重寫。原生Safari與手機實機維持使用者已排除的平台範圍。

## Acceptance
- [x] V1→V2 migration保留全部原始世界資料、worldTime/seed/RNG；重新載入無offline advancement，損毀原檔保留。
- [x] 新開場OTHER_WORLD/generation1與後續LOCAL_WORLD successor；人生結束不重置世界與ownership/reputation/history。
- [x] Active Idle在x1/x5/x20/pause/windows/background/foreground正確同session補進；simulation不依賴DOM/Vue。
- [x] 行為自然形成多重Identity、Settlement Reputation與人生里程碑，對話/資格/傭兵/地方參與有影響。
- [x] 8–12 traits、5–7career stages、5–10featured NPC、結構化有限記憶與contextual dialogue；非全知。
- [x] Home休息/儲物、Land與一種Farm Business，有資格/成本/所有權/世界影響與死亡後歷史。
- [x] 三個完整event arcs、state-driven requests、conditional weighted director/cooldowns/quiet/recovery、少量rare/news/travelers，後果persist。
- [x] World First UI整合Identity/NPC/Property/News、projection與LOD邊界、事件分類與bounded history。
- [x] 保留V1 regression，增加規格§43–47驗證與10/50/100年sim、seed/batch determinism、save/load/ID/history/performance。Browser performance為短時段快照，未聲稱2～4小時V2 soak。
- [ ] 1–2小時真人遊玩及八項Memory/Motivation回答有實際證據；未執行不宣稱Fun Gate通過。
- [x] Standards/Spec review、文件同步、授權commit/push與remote核對完成；工程候選版caede8a已同步，最後文件commit依handoff流程再次核對。

## Constraints and Decisions
不改V1核心公式或地圖；V2按垂直切片整合。選擇農場事業沿用既有農作，無自動AFK收入。Migration補資料使用seed/id決定但不消耗舊RNG。每個worker僅寫獨立新模組，root擁有domain shared types與simulation/actions/events/UI整合。一次性worker依repo Luna/max，long environment監看Luna/low；重大bug或疑慮沿用使用者指定Astra。

## Dependencies and Blockers
唯一產品驗收 blocker：正式規格§51 V2-7的1～2小時真人遊玩、§48八題及新存檔／不同seed體驗比較尚無真人證據。§49禁止因自動測試通過直接宣告V2成功。其餘工程切片完成；[FUN-GATE.md](../reports/v2/20261004-life-emergence/FUN-GATE.md)可直接填寫。無需額外施工許可，不開始V3。

## Evidence
- Verification: [完整紀錄](../reports/v2/20261004-life-emergence/README.md)；baseline143 tests/build，最終222 tests/typecheck/build、strict unused、Chromium20項、Firefox8項、30遊戲日1186操作、9個10/50/100年世界及500年繼任regression通過。來源2e8ad94，最終程式與build指紋見verification-manifest.json。
- Skills: matt-skills-curated:implement；frontend-design-premium:frontend-design與frontend-design-premium（沿用World First視覺契約）。
- Review / Audit: [Standards/Spec review](../reports/v2/20261004-life-emergence/review.md)；Astra重大finding已修復，完整review因模型額度限制改由root依L2規則做非獨立fallback。Premium strict audit零findings；不冒稱完整獨立稽核。
- Commit / PR: 工程候選版caede8a已commit/push work並明確fetch work核對HEAD=origin/work，遠端含handoff、src符合驗證指紋；[Git證據](../reports/v2/20261004-life-emergence/git-sync.json)。remote.origin.fetch只追main，故使用git fetch origin work:refs/remotes/origin/work。最後文件同步commit再push/fetch核對，無PR/main/deploy。
- Handoff: [.scratch/20261004-v2-life-emergence/handoff.md](../.scratch/20261004-v2-life-emergence/handoff.md)

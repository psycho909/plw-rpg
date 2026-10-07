# Phase6-B — Crisis State Model

- Status: accepted
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
Crisis State Model；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
trigger/lifecycle/save migration/reload/determinism，先不接全部contribution。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [x] 一個Goblin regionalCrisis phase discriminated union與seed/sequence穩定ID；非法組合save fail closed。
- [x] daily eligible才random一次；相同seed/state/actions及時間chunk結果可重現；無Math.random。
- [x] V1/V2/V3→V4 defaults合法/idempotent，不重建world或更改time/RNG/history/gear/life。
- [x] WARNING/PREPARATION/ACTIVE/AFTERMATH存讀保存狀態；不duplicate/reroll，NPC死亡/succession不使world crisis消失。
- [x] player/NPC Chief hook不與regional結果重複；普通怪擊殺不直接累積無限crisis leverage。
- [x] public-seam RED/GREEN、save/migration/determinism定向regression/typecheck具原始證據，Root接受後才releaseC。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

### Root B contract release

- `regionalCrisis` root-world state；`dormant/warning/preparation/active/resolution/aftermath/cooldown` union，ID由worldSeed+monotonicsequence，不靠Date/UUID/events。
- saveVersion3→4；舊版本先驗原shape再補dormant，保留worldSeed/RNG/worldTime/characters/NPC/history/items。
- eligible：無activecrisis、cooldown到期、monsterPopulation>=30、campLevel>=2，且 safety<=80／food<=55／bossAlive 至少一項；daily seed roll0.18，只eligibleconsumeRNG。
- warning2日、preparation5日、active2日→resolution；B停在resolution等待F，不假resolver或勝利。受控puretransition可驗aftermath7日/cooldown；後續F baseline cooldown360+severity30+outcome0/30/60/90日，I證據調整，不宣稱最終頻率。
- Chief個體被player/NPC擊敗以同一hook更新bounded crisis facts，不清危機／不決定regional outcome；普通hunt僅改legacy威脅，E明確campaction另接。
- 僅B必要schema/runtime/save/hook/tests，無UI、全部contributions、全部consequence；actor可保留合法歷史NPC ID，不強要求仍living。
- 新跨日emit須同步更新Phase5 craftCapacityBudget的上界及nearMAX原子拒絕regression；必要gameStore.test.ts version期望可更新4，禁止改store implementation，V3歷史fixture保持原語義。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06a-baseline.md)；前置A已accepted；Root已release本B實作，C–J仍blocked。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: B原full439check保留；P2 severity已strict修復，獨立Max review Standards/Spec PASS，post-fix207 focused tests與typecheck通過；Root接受B，releaseC。見b-core-independent-review.md/json與b-fix-report.md。
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

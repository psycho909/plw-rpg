# Phase6-J — QA / Review / Delivery

- Status: in_progress
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
QA / Review / Delivery；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
全425+Regression/type/build/save/determinism/succession、normalUI lifecycle、20–30minstress/30–60minagent、獨立Max/Mediumreview、八Gates/五題/13reports。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [ ] 最新frozenHEAD完整V1–V2/Phase0–6 Regression/typecheck/build/save/migration/determinism/succession，所有原始failures保留。
- [ ] 最新production Chromium真BrowserStress至少1200sec及AgentCrisisPlaytest至少1800sec，含正常fresh crisis完整arc與UIactions/saveReload；60seccheckpoint/heapDOM/storagejournal/errors/latency，controlledcases另記。
- [ ] 20k-history exactclone controlled benchmark及browserjournalgrowth實測，八Gates/五答案/13reports/CHANGELOG/README/TODO完成，相關獨立Review、sourceprovenance完整，Human DEFERRED，Root最終Gate。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06i-simulation.md)；I已PASS WITH FINDINGS accepted；Root releaseJ。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: pending applicable review.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

## Root J release / runner contract

I已驗收，J已release。Medium必要browserharness/testdesign；Low真browser/大批tests/longrunner啟動與結果，runnerdurableprogressJSONL/checkpoints，不模型陪跑。完整npmcheck一次frozensource；修Bug先原始RED后定向+相關regression，core問題Max、UI一般Medium，獨立review。製作latestproductionbuild，不拿G舊build冒充H最新。

正常freshworldarc使用真实UI（等待1日按鈕為既有canonical合法action，x20/rest/move/贡献/combat/modal/saveReload），不修改worldTime/state/RNG/debugskip。Controlledfixture only另context且明確label；20k majorhistory benchmark可透過engine emit合法fixture測大資料不冒充normalsoak。Browser1200s+Agent1800s獨立run可並行，固定60seccheckpoint；JSheap/CDP DOM/listeners、storage/save/journal成長与latency/actualerror计数；scope症狀才依spec78延长60–120min，不預設兩小時。給定phase6新增資訊不聲稱Human驗收或好玩。

需actualnormalwarning→prep→action→active→outcome→aftermath→saveReload，periodicUI操作及多次saveReload；NPC自動解決vs玩家介入、life自由、副作用/恢复目标/fun signals如实記錄。Agent policy须读visibleworld后决定下一步并写reason/motivation，不机械操作冒充exploration；noHumanstory。13必需QA文件沿用当前目录，原始failures不删；final五問題及Engineering/CrisisLifecycle/CivilDefense/LifeContribution/AdventureContribution/RoleFreedom/Consequence/Recovery各自判定。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，非产品funPASS。

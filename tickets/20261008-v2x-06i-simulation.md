# Phase6-I — Simulation / Balance

- Status: in_progress
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
Simulation / Balance；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
10000+resolutions、多路線controlled contrasts、3seeds×10/50/100years，frequency/economy/pop/history/save/journal。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [ ] 10000+ actual canonical crisis resolutions，NoPlayer/LifeOnly/AdventureOnly/Mixed/Prepared/Underprepared等路線、弱強craftedgear/foodgoldcheapspam/Chief-only受控對照，四級分布與實際world consequences，不只probability draws。
- [ ] 三seeds各100年canonicalworld延續並於10/50/100年checkpoint（120days/year=1200/6000/12000days），有效IDs/finite/npcsuccession/economy/crisisfrequency/歷史與存檔成長/saveReload；不得365天誤算。
- [ ] Runner-driven durableJSON/JSONL與exactsource/build/runner hashes、原始失敗完整保留，deterministicreload對照；控制fixtures與自然世界清楚區分；Root接受I後releaseJ。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06h-history-identity.md)；H已accepted；Root releaseI；J待I驗收。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: pending applicable review.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

## Runner contract clarification (not implementation release)

沿用phase06/qa-runner-plan.md與既有phase05simframework，必要testdesign/harness一般工程由Medium；大批執行/Simulation/長時由Low啟動runner，不模型陪跑。H未accepted前不可I實作。Productioncore不得為測試改state或調平衡；受控MC fixture可設合法初始情境但明確標CONTROLLED，不冒充normalplay。10000 counts為actualresolver+consequences/savechecks，不重複同一probabilitydraw假造worldyears。Longworld3seeds×100years一次延續checkpoint，不分開重跑3horizons。公用clone guards大型history成本需I/J量測；沒症狀不改architecture。Failure先evidence/最小RED，core bug交Max；productfindingRoot不silentredesign。

## Root I release

H已驗收，I現在release。依上述runnercontract與phase06/qa-runner-plan.md執行，不重新泛化規劃或偷偷平衡。必要Mediumharness/testdesign；Low負責runner啟動/執行/失敗摘要。Sourcefrozen時才開始大量run，每artifactsourceSHA+hashes。10000actualresolutions與3seeds100yearcheckpoints，不Browser替代，不模型陪跑。

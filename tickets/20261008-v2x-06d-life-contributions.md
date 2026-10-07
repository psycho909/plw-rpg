# Phase6-D — Life Contributions

- Status: accepted
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
Life Contributions；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
equipment effectiveness/food endurance/gold logistics，合法原子消耗與need capacity，不強制combat。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [x] Equipment/food/gold以正常角色資產原子扣除，僅合法phase/location/status/needs允許，失敗不改資產/RNG/events。
- [x] 捐贈gear必須owned且unequipped，真實stats/suitability/shortage導出有界防衛效益；品質/rarity差異不得同一item-count score。
- [x] 依實際defender slots、人口/食物預測短缺及有限logistics建立容量／diminishing return；spam cheap gear/food/gold不得無限堆疊。
- [x] 存檔保留bounded contribution ledger／allocations，不新增非法NPC reward owner，不遺失舊V4危機；重載/繼承不重複扣款或貢獻。
- [x] Life完全不需Combat；支持Phase5 crafted item實際民防用途，不以Crisis擴充craft系統。
- [x] Public-seam RED/GREEN、atomic rejection/save/reload/value contrast tests與typecheck有原始證據；Root接受才releaseE。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06c-civil-defense.md)；C已accepted，Root已releaseD實作；E–J依前置順序等待。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: independent Max Standards/Spec ACCEPT, Rootaccepted; d-core-independent-review.md/json, full475/typecheck/buildPASS, P1prunedNPCreloadfixed, authenticV4phase migrationsPASS.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

### Root approved D contract proposal (implementation released after C acceptance)

Save schema4→5明確遷移：先驗V4，再保留完整crisisID/phase/cause/Chief/time/RNG並補emptyboundedledger；不重建世界。Gear為actualdefender最多2slots/person、總最多16的boundedallocation，保存sourceitem/owner/provenance/stats必要facts；移除玩家ownedunequippeditem，不把NPC加入reward owner registry。Effect由actualcombatstats×suitability×shortage並per-slot cap；notqualitylabelcount。Food增加真settlement.food，physicalstockroom≤100，rawforecast與每危機capacity限制，強負net不能重複零效益扣物資，必要提示需要農夫/防衛改善。Gold只支援derived bounded emergency logistics，非無限score。Contribution可instantaneous如equip，不新增simulated-action-duration／skiptime；所有crisisID/phase/角色存活/非戰鬥/在village/asset/needs/eventcapacity guards先驗，失敗全state不變。Historical NPC/character references死亡後仍可合法保留。Root已接受C獨立審查，解除本D dependency並release實作。

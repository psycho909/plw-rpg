# Phase6-H — History / Identity

- Status: in_progress
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
History / Identity；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
major-only history、既有identity/reputation、一次性獎勵、death/succession保存world crisis。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [ ] Major供應與實際crafting、camp貢獻皆受認可；ordinarydonation/hunt不spam majorhistory。
- [ ] Thresholdcrossing once-only/reload/noRNG/atomiccapacity及deadcreator/succession歷史attribution publicseamtests，identity無捷徑；無新Save8。
- [ ] Root接受此slice後才解除下一slice blocking edge。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06g-crisis-ui.md)；G已限定accepted；Root releaseH；I–J依序等待。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: pending applicable review.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

## Root H release / precise contract

V7兼容，既有monotonic facts before→after crossing，不新rewardledger。每character/crisis三類至多各+3reputation：Supply donor food credit/4 + gold credit/5 crosses5；Craft original craftProvenance.createdBy所製捐贈裝備之 civilDefenseGearEffect(rolledStats,slot,10) sum crosses1.0 normalizedslot；Adventure actual currentcrisis campRaidAt null→timestamp。ExistingChief+12不H重複。原有changeReputation bounds/history/rankmilestones；老preHledger超threshold不retrogrant，migration不replay。

Craft記實際製作者不現itemowner，合法historicalID/name；deadcreator只majorhistoricalattribution不給deadrep/不transferheir。Donating不當smithaction、不改smith/adventurer/masterpiece現有條件、不新HeroFame/class。每普通donation原gameplayevent維持；重大threshold各一次emit(true)，majorhistorycap20000、rep history64、milestones32，無每item/tick重大history。事件容量最多3新emit（原gameplay+rank+major）必須beforeinventory/gold/ledger/reputation mutation原子preflight；campwin包含新emit由完整clone驗證。Death/succession/crisisworld不reset，公用save/reload+midcrisisdeath+multiplecreator tests。原始RED保留，relatedregression/typebuild與獨立Maxreview後Root接受才releaseI。

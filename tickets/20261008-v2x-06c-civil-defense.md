# Phase6-C — Civil Defense Model

- Status: in_progress
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
Civil Defense Model；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
純Domain resistance/needs/outcome model，prepared/unprepared baseline皆可能合理成功失敗。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [ ] 純 deriveCivilDefense 不修改 state/RNG；factor trace、readiness、needs、threat demand、likelihood 全為有界 finite values。
- [ ] 守衛／傭兵只計存活、可工作、未退休／受傷且非玩家 party；其他居民與供給鏡像既有 simulation 語義。
- [ ] 無玩家自然prepared與underprepared世界皆具合理不同成敗機率，玩家不是必要來源。
- [ ] Food needs依人口、可用農夫、boss耗糧與至resolution剩餘時間推導；裝備需求僅實際可用防衛者槽位，無每日固定捐獻任務。
- [ ] Threat retains persisted cause floor；普通hunt不能無限消除危機，特殊Chief/camp/intel留待後續明確bounded contribution。
- [ ] public-seam pure/determinism/availability/shortage/edge tests與typecheck有實際原始證據；Root接受才releaseD。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

### Root產品決定

Prepared可完全由自然聚落／NPC準備達成，不要求玩家至少貢獻；明確符合spec26–28。NPC自治必須保留，prepared/unprepared世界依自身狀態可有不同成敗，玩家改善概率／成本／損失而非唯一救世主。C純derive，不store大型duplicatedsnapshot、不個別tactical；D/E contribution之後才接。B獨立審查已接受；Root release C實作。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06b-crisis-state.md)；前置B已accepted，Root已release本C；D–J仍等待各前置驗收。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: pending applicable review.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

### Root accepted C proposal (implementation released after B acceptance)

純aggregate derive，readiness0–100：defender count30、combat skill15、legacy slots10、supply coverage12、safety10、adult logistics8、stage5、prosperity5、infrastructure5。自然來源可到高準備度，不需要player donation。Defender target=min(8,2+2×severity)，gear slots限2×min(available,target)。Projected food依既有每日淨產出/耗用與至resolution時間；deficit=max(0,55−projectedFood)，coverage對應同一需求。Threat P=20+14×level+0.2×max(0,pop−30)+8×boss；demand取persisted cause與current P較高值並clamp0–100。Success chance logistic(readiness−demand)/18且限0.1–0.9，C不抽RNG或resolve；F單次seeded resolve。這些為集中可測 baseline，I後續分布檢查，不宣稱最終產品balance。

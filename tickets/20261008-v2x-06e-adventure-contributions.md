# Phase6-E — Adventure Contributions

- Status: accepted
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
Adventure Contributions；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
2–3高槓桿action至少combat及camp/threat，沿用Chief，非普通怪數量任務。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [x] 2–3不同Adventure貢獻至少直接Combat及非普通擊殺數量選项；最小scope優先camp raid + 現有GoblinChief。
- [x] 改變至少2項intel/enemyStrength/campStrength/bossState/attackTiming，具有限高槓桿效益而非無限hunt score。
- [x] 沿用現有Goblin combat；沒有新monster family/Boss，不強制所有玩家參戰。
- [x] 特殊camp objective與ordinaryhunt隔離，勝利才記實際介入；失敗/逃跑/expiredphase不免費給效益。
- [x] Save/reload包含in-flight objective且不重複勝利效益/獎勵；NPC自治Chief成功仍合法且不等於必勝。
- [x] 狀態/RNG/事件容量/生命繼承原子邊界有public-seam regression及typecheck證據；Root接受才releaseF。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06d-life-contributions.md)；D已accepted，Root已releaseE；F–J等待前置驗收。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: pending applicable review.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

### Root E implementation release

兩個選項：既有Goblin實際campraid（one successful credit，失敗/逃跑可付真實風險重試）及既有Chief。Warning/preparation/active可開始，victory須currentID/phase/deadline仍有效才campRaidAt；ordinaryhunt不可寫specialfact，latevictory只保留普通reward。C selected baseDemand=max(causeFloor,currentPressure)，再依actualfacts relief=min(14,Chief8+camp6)得到max(20,baseDemand−relief)，無specialfacts普通hunt依然有原causefloor；publiccampvictory前後odds必須真的改善。Reuse共用encounter creation，不暫時改bossflag或偽造worldstate。Save5→6明確保留Dledger/phase/world/time/RNG並補adventure defaults；inflightmarker可過期但須thisworldSeed與1≤sequence≤crisis.sequence、安全startedAt≤worldTime、non-dungeonGoblincombat合法；completion時currentID再驗，避免phase/newcrisis造成自產save失效。Root已release本E，F尚未。

## Root acceptance

E限定工程驗收：505/505全量、297/297 focused、獨立29/29、typecheck/build及Standards/Spec PASS。依 e-source-freeze.json 12個source hashes核對，canonical fingerprint a298dde9e3a59c5adac8f234cc823cd57d7f6d0fbb9414421b1be1942018e739。原始P2-E01 RED保留，已修復；clone長history效能待I/J，不宣告整體Phase6 PASS。F規劃可進行，施工仍等待精確後果契約。

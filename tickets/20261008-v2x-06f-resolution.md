# Phase6-F — Resolution / Consequences

- Status: accepted
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase6 規格，要求「閱讀完後，直接進入Phase6開發環節」。
- Risk: L2
- Updated: 2026-10-08
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README commit/push 現工作分支授權，不PR/merge/main/force/deploy。

## Goal
Resolution / Consequences；世界危機連結 Adventure/Life/NPC/Settlement，維持角色道路自由。

## Scope
分級outcomes、persistent consequences、aftermath/recovery/cooldown，不reset/deletesave/property。

## Out of Scope
Phase7–10／V3、多新monsterfamilies、完整RTS/tactical/caravan/稅制／reconstruction／property destruction、server、nativeSafari/實機。不藉Phase6補完Phase5產品finding。

## Acceptance
- [x] 正常canonical daily runtime自resolution完成四級outcomes，不需debug／人為outcome指定；所有RNG由RandomService，單次結算keyed危機ID/phase。
- [x] 同seed/state/actions與跨日chunk/save-reload可重現；reload不reroll、不replay consequence/reward。
- [x] Civil Defense與Life/Adventure facts實際改變結果概率/成本/損失，Chief單一勝利不保證regional decisive勝利。
- [x] 清楚有界persistent world consequences含若干food/safety/prosperity/NPCinjury，結果有trace；不永久刪property、重建world/character/save、強制GameOver。
- [x] Aftermath存在可觀測recover需求與正常世界恢復過程，不能outcome當刻全部復原；cooldown避免recurring tax且後續trigger依threat/world state。
- [x] Midcrisis死亡/繼承與合法NPC歷史references保持世界連續；若造成NPC死亡沿用既有lifecycle。
- [x] Public-seam四結果/原子capacity/timeguard/recovery/save/chunk/succession定向tests及typecheck/build具實際evidence，Root接受才releaseG。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06e-adventure-contributions.md)；E已accepted（6583db9）；Root已releaseF；G–J等待依序驗收。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: pending applicable review.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

## Root F release / precise contract

E accepted at6583db9. F施工已release。單次RandomService u thresholds 0.60p/p/p+0.70(1-p)，aggregate success保持C p。四結果依decisive/costly/setback/local順序：monster pop −12/−6/+4/+10；bossProgress −18/−8/+8/+16；food −4/−8/−8/−12；safety +4/−2/−5/−8；prosperity +2/−2/−4/−6；up to0/1/2/3實際可用defender injuries 0/2/3/5days，canonical-ID deterministic。實際clamped deltas留summary，不宣稱Chief死亡、無Bossloot、不刪資產/NPC、不reset。Aftermath7days；cooldown360+severity30+outcome0/30/60/90+pressure0..30days，pressure=round(15*clamp((monsterPopulation−30)/70)+15*clamp((80−safety)/55))。

Persist bounded resolutionSummary explanation/probability/actual deltas/injuries/recovery marker；save6→7保留fullworld/time/RNG/Dledger/Eobjective/adventure；legacy aftermath/cooldown summary可null不得假造實測概率或重施後果。舊NPC references合法historical canonical ID不需仍在livinglist。

Recovery安全閥：resolution後30days仍zero living population且Chief存活，existing addNpc immigration一次成人救援，不需打Boss取得successor；recheck population，persist pending/granted/not_needed與historicalNPC id。先執行保存original RED，繼承後非戰鬥public action證明可繼續。不是大型reconstruction或Chief移除。Canonical daily容量/timeguard與craft budget須納入新bounded emits。Root接受F frozen evidence與獨立Review才releaseG。Human DEFERRED。

## Root acceptance

F限定工程accepted：411/411関連定向tests、typecheck/build PASS；獨立Standards/Spec PASS。16 frozen source hashes核對；fingerprint d0ff4e64ab667ca5ade5e7fe914f25e5d4c9cdc1e33822b0b46313e52e3e52e7。Original resolution/recovery/migration/capacity/publicaction/time/craft-validation failures全保留。安全閥只涵蓋resolution當刻zero population，aftermath後來歸零未排救援為已知scope限制；大型history clone成本待I/J量測。G release，H–J未release；非整體Phase6 Gate PASS。

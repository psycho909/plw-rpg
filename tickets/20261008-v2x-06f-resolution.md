# Phase6-F — Resolution / Consequences

- Status: approved
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
- [ ] 正常canonical daily runtime自resolution完成四級outcomes，不需debug／人為outcome指定；所有RNG由RandomService，單次結算keyed危機ID/phase。
- [ ] 同seed/state/actions與跨日chunk/save-reload可重現；reload不reroll、不replay consequence/reward。
- [ ] Civil Defense與Life/Adventure facts實際改變結果概率/成本/損失，Chief單一勝利不保證regional decisive勝利。
- [ ] 清楚有界persistent world consequences含若干food/safety/prosperity/NPCinjury，結果有trace；不永久刪property、重建world/character/save、強制GameOver。
- [ ] Aftermath存在可觀測recover需求與正常世界恢復過程，不能outcome當刻全部復原；cooldown避免recurring tax且後續trigger依threat/world state。
- [ ] Midcrisis死亡/繼承與合法NPC歷史references保持世界連續；若造成NPC死亡沿用既有lifecycle。
- [ ] Public-seam四結果/原子capacity/timeguard/recovery/save/chunk/succession定向tests及typecheck/build具實際evidence，Root接受才releaseG。

## Constraints and Decisions
正式 [Phase6 spec](../docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md)（原文CRLF保留，SHA256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`）；A→B→C→D→E→F→G→H→I→J逐段施工，不提前水平擴張。Goblin現有Threat/Chief優先，單一crisis canonical slice，RandomService-only。Human DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程QA。Low機械、Medium一般工程、Max核心／save／determinism／獨立deepreview、Root產品決策。matt-skills-curated:implement／to-tickets按docs/agents/skill-workflows.md適配既有tickets、已批准順序與驗證工作單位，不另tracker／granularity批准。QA沿用recorded_reports/原始JSONL，不新建平行framework。

## Dependencies and Blockers
Blocked by: [前置Ticket](20261008-v2x-06e-adventure-contributions.md)；前置尚未accepted前僅能做必要契約提案，禁止實作。

## Evidence
- Verification: reports/v2/20261008-regional-crisis/phase-06/
- Review / Audit: pending applicable review.
- Commit / PR: base b82de85fb251697fca3e4331c5bb44945349a387，Phase5 app f9f969c；交付待本slice驗證，不建立PR。

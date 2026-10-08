# Phase7-C — First Content Batch

- Status: in_progress
- Risk: L3
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-08（Asia/Taipei）

## Goal / Scope

1–2完整Families，Monster→Combat→Loot→Material→Craft/Use→Discovery；合法正常途徑、核心save/RNG相容及局部驗收。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [ ] 本stage完整目標與合法來源／用途閉環達成，validator/targeted/regression按風險驗證。
- [ ] 原始failure/sourceSHA/fingerprint/report保留；適用Medium/Max獨立review及Root acceptance。
- [ ] 下一階段僅在Root release後施工；可先唯讀探索不得預先修改核心或大量資料。

## Dependencies

Blocked by: [Phase7-B](20261008-v2x-07b-content-validator.md)；尚未release。

## Evidence

reports/v2/20261008-content-expansion/phase-07/；待驗證。

## Root C release

B accepted。Max owns runtime core integration/save8/reward3/migration and related core tests; Low owns Slime first-family isolated data module then Cave Insects after first closure. No mass 66/107 yet. Single generator, wolf wrappers and RNG preserved; loot→craft→equip→save/reload and frozen boss/cooldown prove full chain. Shared query/telegraph/source projections prepared for later UI. Full core independent Max review before wider D expansion.

## Core audit C1/C2 corrective release

Root批准 bossForms discriminated encounter/cooldown-until bounded state supersede shared director boss keys; Save8/Reward3 top-level unchanged、knownIDs/strictmigration/noRNG preservation。Independent原始 C1/C2 保留，Max RED→fix→focused→independent review；C仍in_progress，不releaseD。Canonical repeated combat closure replaces direct loot padding witness。

## C3 bounded director persistence fix

## Corrective engineering result

C1/C2/C3 RED evidence is preserved. The corrective focused gate passed 252 tests across 7 files plus \`vue-tsc --noEmit\`; the subsequent full \`npm run check\` passed 30 files and 565 tests, typecheck, and production build. C remains in progress until a post-fix independent core review is completed. The Max reviewer hit the model usage limit before that follow-up; this is recorded as a review limitation, not as an acceptance claim.

Confirmed preexisting valid100-key missingdaily-marker state becomes101 at midnight, invalidatingreload。Root纳入本輪 integrity修復。既有active/unknowncooldown不得任意丟棄，保留既有expiredhunt pruning；新cooldown要求無容量時 preflight拒絕optional event/hunt feedback、不可部分progress或overflow。full且markerabsent時跳過該dailyLivingEventspass，核心世界時間/NPC/threat仍運作；existingkey可更新。99寫marker占滿後也不得新事件再溢出。明確測試/紀錄saturation邊界，不增加features或放寬100上限。

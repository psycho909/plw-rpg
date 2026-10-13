# Phase7-E — Mini Boss & Boss Expansion

- Status: accepted
- Risk: L3
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-13（Asia/Taipei）

## Goal / Scope

獨特核心機制、可讀提示、合法世界候選、變體、专屬loot與cooldown；不得固定年份排程，保留現有Chief／wolf boss。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本stage完整目標與合法來源／用途閉環達成，validator/targeted/regression按風險驗證。
- [x] 原始failure/sourceSHA/fingerprint/report保留；適用Medium/Max獨立review及Root acceptance。
- [x] 下一階段僅在Root release後施工；可先唯讀探索不得預先修改核心或大量資料。

## Dependencies

Blocked by: [Phase7-D](20261008-v2x-07d-monster-expansion.md)；尚未release。

Currentoverride: entireD acceptedPASSWITHFINDINGS afterfresh585tests/typecheck/build andindependentreview. E **RELEASED** underOwner's instructionfinishPhase7.

## Root E release — 2026-10-13

Follow `reports/v2/20261008-content-expansion/phase-07/e-content-plan.md` andapprovedremaining-familyroster. Fourfamilies+Cave add15definitions(2mini/1boss each); Slime11IDs preservedwithalternateboss accessprofile; total66,newvariantsneverdoublecount. Bossfixedcore/additivevariants,actualexclusivegear/boss-only8thmaterial/currentcompatibleoptionalcraftbias,stablecooldown/flee/reload/boundedworldconsequence. No newcorearchitecture orPhase6threat/Chiefwrites. Lowownsisolateddata,Mediumpublicbossintegration;actualSave/RNG/corebugroutesMax. Centralpack/source/rawcapture andindependentreview beforeFrelease. Final100itemsstilldueF/G.

## Evidence

### Root engineering fallback

The assigned Luna Medium integration agent completed initial22tests and most scoped corrections, then errored due provider usage quota. Root takes over the already-authorized ordinary fixes under `docs/SUBAGENTS.md` fallback, preserving its remaining1/39test failure andTS18048 output in `e-integration-run/scope-corrections/final/`. The failing extra craft fixture carried boss XP into a manually selected normal tier and leveled past its encounter cap; align that controlled tier's XP rather than change product predicates. Remove unnecessary enemy HP mutation; actual boss combat remains canonical. Optional material bias must have a real positive compatible consumer. No core Save/RNG/runtime changes.

## Root E acceptance — 2026-10-13（Asia/Taipei）

E ACCEPTED / PASS WITH FINDINGS. Owner's instruction to finish Phase7 supplies standing scope authorization; no new architecture/product behavior was introduced by E. All six Bosses and twelve Mini Bosses are registered within 66 unique monsters. Seven standard individual/merged CLI runs passed with exact input/source capture: `e-content-validation-run/runs/2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43/`. Combined 66 qualified monsters / 60 qualified items are interim counts, not the final quantity gate.

Independent Max audit `reports/audit/phase7-e-boss-review.md` initially returned P2 fixture HP mutation; preserved original review and corrected one-line deletion. Post-correction `e-integration-run/audit-correction-20261013T053847Z/` verifies 4 files / 39 tests and typecheck PASS, stable 116-file source/input map, current Boss test SHA `deaf227c4379c4700314dc52b6ae1273655dd7071caca998a742a71f4503e564`. Independent delta review CLEARED (report SHA `c902f72e3e1a2f52eda57cf686fbdd314e06ae3a944d80ccb7e78c563c453e4e`). No natural frequency or final balance claim. Original undefined future references, orphan consumer, stale D tests, quota failure and fixture failures remain in E evidence. Six material duplicate groups plus one loot-table warning remain for F/J. Historical D P2 remains permanent. F RELEASED; G–K product work stays sequential.

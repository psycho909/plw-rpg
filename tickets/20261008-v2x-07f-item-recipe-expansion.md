# Phase7-F — Item / Recipe Expansion

- Status: accepted
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-13（Asia/Taipei）

## Goal / Scope

至少100合格新增items用途閉環、15–25有意義新增recipes目標；共用ItemInstance／生成／詞綴／製作／保存／交易。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本 stage 的 48 materials、48 unique qualified gear、24 recipes 與來源／用途閉環完成；七組內容驗證、full regression/typecheck/build 通過。Phase7 跨階段 ≥100 items gate 維持待 G 實作驗證。
- [x] 原始 failure/source SHA/fingerprint/report 保留；獨立 Medium review 完成。早期首次 integration RED 的原始 bytes 未保留，永久列為 P2 history finding，不以後續 pass 假稱補回。
- [x] G 僅在 Root 接受 F 後 release；見下方決議。

## Dependencies

Dependency satisfied: [Phase7-E](20261008-v2x-07e-boss-expansion.md) ACCEPTED / PASS WITH FINDINGS. Root released F on 2026-10-13 under Owner's instruction to finish Phase7. Root accepted F with findings on 2026-10-13; G is now released.

## Root F release

Execute `reports/v2/20261008-content-expansion/phase-07/f-content-plan.md`: complete five remaining family equipment/recipes to 48/24 total, preserve 48 real materials and 66 monster IDs. Low owns isolated modules, Medium owns targeted integration and narrow authoring-validator correction. Validated mandatory recipe output functions may distinguish material uses; names/IDs/prose/duplicate recipes never qualify them. Keep real effect/use duplicates excluded, preserve previous warnings and add counterexample RED/GREEN tests plus independent review. No Save/RNG/generation changes. G remains unreleased until F acceptance.

## Root F acceptance — 2026-10-13

**ACCEPTED / PASS WITH FINDINGS.** Independent closeout `reports/v2/20261008-content-expansion/phase-07/f-review-closeout-20261013.md` found no current blocker. Latest seven-pack run `f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854` passed all cases with zero errors/warnings and reports 66 monsters, 48 materials, 48 qualified gear, and 24 recipes. Full `npm run check` passed 605/605 tests across 34 files plus production build; focused Goblin compatibility regression passed. Slime is unchanged. Current F quantity is 96 unique item IDs; the total ≥100 gate remains open until actual G crop goods and runtime use paths pass validation.

Historical P2: the original first integration RED output bytes were overwritten by retry and cannot be recovered; reconstruction remains labeled as such. This is retained as a historical evidence limitation and is not a current F code/test blocker.

## Evidence

Primary verification: `reports/v2/20261008-content-expansion/phase-07/f-regression-run/attempt-03-goblin-bias-validation/FINAL-VALIDATION-REPORT.md`; review: `reports/v2/20261008-content-expansion/phase-07/f-review-closeout-20261013.md`; complete raw run evidence is adjacent under `f-content-validation-run/`, `f-integration-run/`, and `f-regression-run/`.

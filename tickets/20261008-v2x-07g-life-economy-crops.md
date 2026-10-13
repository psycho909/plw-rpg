# Phase7-G — Life / Economy / Crop Expansion

- Status: accepted — PASS WITH FINDINGS
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-13（Asia/Taipei）

## Goal / Scope

作物總10–15種目標，實際生長/供給/經濟差異；material sinks與既有food/crisis，無無風險套利；架構限制由Root核定。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本stage完整目標與合法來源／用途閉環達成，validator/targeted/regression按風險驗證。
- [x] 原始failure/sourceSHA/fingerprint/report保留；獨立review及Root acceptance完成。
- [x] H僅於G Root acceptance後release；未預先擴充核心或資料。

## Dependencies

Dependency satisfied: [Phase7-F](20261008-v2x-07f-item-recipe-expansion.md) ACCEPTED / PASS WITH FINDINGS on 2026-10-13. Root G RELEASED on 2026-10-13.

## Root G release — 2026-10-13

Implement the approved `reports/v2/20261008-content-expansion/phase-07/g-crop-plan.md`: add 11 unique crop/crop-good pairs alongside legacy wheat, targeting 12 total crops and a current projected cross-stage count of 107 (F's 96 + G's 11). The projection is not acceptance evidence. Register the goods through the existing content/reward pipeline, make crop selection optional on the existing `farm()` path (legacy calls default to wheat), reject unknown or out-of-season crop IDs before costs or state mutation, and persist via the existing `cropId` field only. Growth and yield must come from registered crop data. Harvest crop goods without duplicating legacy food; provide a real, correctly accounted conversion from crop goods to inventory food so existing ownership/crisis supply paths can consume the food. Preserve legacy wheat behavior, save compatibility, RNG/determinism, and existing schemas. No new save fields, parallel crop subsystem, offline progression, or unrelated product scope.

## Evidence

Approved proposal: `reports/v2/20261008-content-expansion/phase-07/g-crop-plan.md`.

Root closeout: [g-review-closeout-20261013.md](../reports/v2/20261008-content-expansion/phase-07/g-review-closeout-20261013.md), **PASS WITH FINDINGS**. Final check passed 614 tests, typecheck and production build; all eight content validators passed; 108 economy scenarios and production Chromium crop/save/reload smoke passed. Browser, test, and setup failures remain archived with corrected reruns. Economy observations and the duplicate wheat presentation finding are carried forward to J; no product balance change is made here.

Human validation: `DEFERRED / NOT APPLICABLE AT THIS STAGE`. This local stage acceptance is not the Phase7 Product Gate.

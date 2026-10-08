# Phase7-B — Content Validator & Authoring Contracts

- Status: accepted
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-08（Asia/Taipei）

## Goal / Scope

Schema/reference/quality/reachability/localization/usability驗證；負向fixture與批次report先建立，未release不大量內容施工。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本stage完整目標與合法來源／用途閉環達成，validator/targeted/regression按風險驗證。
- [x] 原始failure/sourceSHA/fingerprint/report保留；適用Medium/Max獨立review及Root acceptance。
- [x] 下一階段僅在Root release後施工；可先唯讀探索不得預先修改核心或大量資料。

## Dependencies

Blocked by: [Phase7-A](20261008-v2x-07a-baseline-content-plan.md)；尚未release。

## Evidence

reports/v2/20261008-content-expansion/phase-07/；待驗證。

## Root release

A已accepted，content-plan.md權威；B先建立generic content authoring contracts／validator／負向fixtures，核心runtime/migration於C。Max持有domain契約與必要registry integration type入口；Medium持validator與測試，兩者先對接型別ownership，不互寫。沒有C runtime或批量content授權。

## Release temporarily held

A計數審查修正中；B純authoring types已寫入保留，未驗證／未active runtime。新validator/code/test暫停，待Root恢復B。既有Rootrelease保留為歷史。

## B restored

A 修正與獨立審查通過；恢復純 authoring contracts／validator／負向測試。C runtime 仍待 B review 與 Root release。

## B final acceptance

14/14 focused tests、batch validation、vue-tsc PASS；獨立 Medium audit ACCEPT，source fingerprint bc09c3d50f16aa9d7c5c9f56adf28f607f470cbd63735747be60fcd298a03480。B1–B7 與原始 failures 保留。僅 authoring candidate 品質，不宣稱 runtime crop consumer/save migration/natural exposure 已驗證。Root release C。

# Phase7-A — Baseline & Content Plan

- Status: accepted
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-08（Asia/Taipei）

## Goal / Scope

精確現有內容稽核、source/HEAD環境與全量基線；核定Families／新增數量／用途矩陣及最小接入契約。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本stage完整目標與合法來源／用途閉環達成，validator/targeted/regression按風險驗證。
- [x] 原始failure/sourceSHA/fingerprint/report保留；適用Medium/Max獨立review及Root acceptance。
- [x] 下一階段僅在Root release後施工；可先唯讀探索不得預先修改核心或大量資料。

## Dependencies

Blocked by: None；Root release A。

## Evidence

reports/v2/20261008-content-expansion/phase-07/；待驗證。

## Root acceptance

A ACCEPTED。fresh531/28files/type/build；content-baseline.md/json精確IDs與C9JSONfingerprint；Root content-plan.md鎖定66monsters/107items/24recipes/12totalcrops品質預算及save8/reward3必要migration、保留wolf/Chief/RNG核心。B已release；測量不同fingerprint算法明示不誤稱source變動。

## A audit correction in progress

獨立Medium review發現baseline parser只計算每行第一key，legacyITEMS實際8而非4；初步A acceptance暫撤，原始報告保留。Medium baseline_fixer修AST/runtime完整enumeration并重新獨立核。531freshcheck仍有效不重跑，66/107內容預算不變。B已新增純types保留，但後續B實作暫停直到A修正accepted。

## Corrected A final acceptance

AST enumeration 與独立 Medium audit 完成，legacy ITEMS 8；各 registry IDs/counts 一致，91 檔 SHA 與 canonical C9 一致。531 項 fresh regression/typecheck/build 仍有效。原錯誤 Markdown 已封存；原錯誤 JSON 未在初次覆寫前封存，明確保留此證據限制，不宣稱完整保存。A accepted，恢復 B。

# Phase7-J — Balance & Coverage

- Status: approved
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-08（Asia/Taipei）

## Goal / Scope

自動count/quality/coverage，100000loot分層、代表combatmatrix、craft/economy、3seeds10/50/100年；保留raw失敗，ProductFinding與Bug分開。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [ ] 本stage完整目標與合法來源／用途閉環達成，validator/targeted/regression按風險驗證。
- [ ] 原始failure/sourceSHA/fingerprint/report保留；適用Medium/Max獨立review及Root acceptance。
- [ ] 下一階段僅在Root release後施工；可先唯讀探索不得預先修改核心或大量資料。

## Dependencies

Blocked by: [Phase7-I](20261008-v2x-07i-discovery-ux.md)；尚未release。

## Root QA preparation release — 2026-10-13

Owner requests entire Phase7 completion. Root permits independent QA harness preparation now, limited to new files in the existing Phase7 report directory; no core/product/content changes and no formal large-sample run before I's final source is frozen. Reuse existing Phase4 Monte Carlo/combat and Phase6 continuous long-world instrumentation, adapting actual public APIs and current dynamic registry. Medium designs the runner; Low executes once released. Quantities are actual measured definitions/awards, not variants/instances; controlled samples remain separate from natural world/agent observations. Required source maps, raw failure retention and independently reviewable result metadata apply.

## Evidence

reports/v2/20261008-content-expansion/phase-07/；待驗證。

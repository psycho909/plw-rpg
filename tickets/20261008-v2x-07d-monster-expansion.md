# Phase7-D — Monster Expansion

- Status: in_progress
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-12（UTC）

## Goal / Scope

分批普通／Elite資料接入；自動計數與至少兩項identity差異，明確檔案ownership，目標至少50合格新增定義的一部分。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [ ] 本stage完整目標與合法來源／用途閉環達成，validator/targeted/regression按風險驗證。
- [ ] 原始failure/sourceSHA/fingerprint/report保留；適用Medium/Max獨立review及Root acceptance。
- [ ] 下一階段僅在Root release後施工；可先唯讀探索不得預先修改核心或大量資料。

## Dependencies

Dependency released by Root on 2026-10-12 after local Phase7-C acceptance. D is now in progress; D acceptance remains pending.

## Evidence

`reports/v2/20261008-content-expansion/phase-07/`；D evidence pending.

## Root release — 2026-10-12

- C closeout: `reports/v2/20261008-content-expansion/phase-07/c-c4-closeout.md`.
- D content ownership is isolated to `src/data/content/caveInsects.ts`; follow the approved Phase7 content plan and existing pack/validator contracts. This stage covers ordinary/Elite expansion only. Do not add Mini Boss/Boss work (E), broaden shared core/runtime architecture, alter the product scope, or edit the shared registry concurrently. If the current schema/validator makes the staged D slice impossible without overlapping E/F or core work, report the exact blocker and stop rather than widening scope.
- Authoring should preserve two evidenced identity axes (implemented supported combat mechanic and real sourced/useful loot); use reachable existing mine/progression predicates, exclude village/farmland, and do not claim natural encounter frequency from controlled validator witnesses.

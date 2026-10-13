# Phase7-H — World & Crisis Integration

- Status: accepted — PASS WITH FINDINGS
- Risk: L3
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-13（Asia/Taipei）

## Goal / Scope

World Director/region/seeded條件與內容輪替，完整reachability；Phase6危機不冲突，不新增第二套crisis架構。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本stage完整目標與合法來源／用途閉環達成；validator、targeted 與 full regression 通過，結果見 H closeout。
- [x] 原始 failure / source SHA / fingerprint / report 保留；L3 Standards 與 Spec 獨立審查完成，Root 已接受 PASS WITH FINDINGS。
- [x] Root 在 H closeout 後 release Phase7-I；I 已依批准計畫開始。

## Dependencies

Dependency satisfied: [Phase7-G](20261008-v2x-07g-life-economy-crops.md) accepted by Root **PASS WITH FINDINGS** on 2026-10-13. Root released H on 2026-10-13.

## Root H release — 2026-10-13

Use the existing family registries, encounter eligibility/cooldown projection, and Phase6 crisis integration. Verify current-region visibility, legal profile reachability across progression/season/time/threat/safety, deterministic seeded encounter formation, rank/cooldown handling, crop-food crisis contribution, and no Phase6 Goblin/civil-defense regression. H may add the smallest canonical projection/runtime integration needed so only the current discovered region is exposed to the UI. Do not duplicate eligibility rules in Vue or introduce a new crisis, faction, world map, or content-generation subsystem. Keep natural exposure claims distinct from controlled witnesses.

## Evidence

`reports/v2/20261008-content-expansion/phase-07/g-review-closeout-20261013.md` releases H. H verification and review evidence is recorded in `reports/v2/20261008-content-expansion/phase-07/h-review-closeout-20261013.md`; the first Spec-review blocker and its resolution remain preserved there.


## Root H acceptance and I boundary — 2026-10-13

- Disposition: **PASS WITH FINDINGS**; H is accepted for local Phase7 progression.
- Independent Standards review: PASS. Independent Spec review initially BLOCKED on runtime reachability and crop-crisis integration evidence; follow-up confirmed both resolved for H runtime scope.
- Root interpretation: H provides the canonical engine projection contract. Phase7-I owns visible family discovery controls and must consume `contentEncounterOptions`; H does not claim new family choices are already wired into Vue. This follows the approved `i-ux-plan.md` dependency sequence.
- Natural encounter frequency remains `not-measured`; controlled witness tests are not natural exposure evidence. Carry distribution and long-world review into J/K.
- Owner approval evidence remains the approved Phase7 specification and the user's explicit instruction to complete Phase7. No Phase8 or V3 work is authorized or started.

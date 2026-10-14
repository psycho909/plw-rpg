# Phase8-E — Reward & Progression Pacing

- Status: approved — waiting on dependency
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-14 Owner 正式規格 [V2X-PHASE8](../docs/specs/V2X-PHASE8-BALANCE-TUNING.md)；Parent [Phase8](20261014-v2x-08-balance-tuning.md)。
- Risk: L2
- Updated: 2026-10-14
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支；worker 不 commit／push。

## Goal

處理 P8-F02：檢查 `Action → Progress → Reward → New Decision → New Goal`，量測 Reward／Goal Drought 與 Chore Risk，先區分 runner、UI、resource、world pacing 原因，再決定是否改遊戲。

## Scope

規格 §9：先檢查 runner decision policy，建立可觀測 objective／action outcome，分類 no-progress；優先讓既有世界狀態、可見目標與玩家選擇產生下一步。

## Out of Scope

Daily Quest、Login Reward、FOMO、離線收益；固定每 X 分鐘獎勵；為降低 runner 無效動作率而讓每次點擊必有獎勵。

## Acceptance

- [ ] `reward-pacing.md`、`loot-reward-distribution.md` 完成；no-progress 已分類且附證據。
- [ ] 產品側修改（如有）具直接 Finding 關聯、Before／After 與 tests；Medium review。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md)；產品修改在 B／C／D 數值後評估。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

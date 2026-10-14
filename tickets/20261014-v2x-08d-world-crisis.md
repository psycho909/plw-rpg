# Phase8-D — World & Regional Crisis Balance

- Status: approved — waiting on dependency
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-14 Owner 正式規格 [V2X-PHASE8](../docs/specs/V2X-PHASE8-BALANCE-TUNING.md)；Parent [Phase8](20261014-v2x-08-balance-tuning.md)。
- Risk: L2（World Director／Crisis 互動由 Max 審查）
- Updated: 2026-10-14
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支；worker 不 commit／push。

## Goal

處理 P8-F05：驗證並調整怪物生態、危機頻率、NPC 自治與長期世界穩定性，不破壞「玩家不是唯一救世主，生活玩家也不應被迫戰鬥」。

## Scope

規格 §8：No Intervention／Life／Adventure／Mixed／Prosperous／Struggling 六情境；NPC 自治、Food／Equipment Readiness、Threat Growth、Crisis Probability／Outcome、Aftermath Recovery、Settlement Continuity；檢查 Monster Flood、Boss Spam、Threat Spiral、Crisis Overfrequency、Population Death Spiral、Permanent Decline、Resource Inflation。

## Out of Scope

新 Crisis 系統；固定危機；NPC 永遠自動勝利；Game Over／World Reset。

## Acceptance

- [ ] `world-crisis-balance.md` 完成，至少 3 Seeds × 10/50/100 年；不穩定時增加 Seed。
- [ ] 多數測試世界可恢復；無廉價捐贈完全取代其他貢獻。
- [ ] 修改有 Before／After；full check 通過；Max review（Director／Crisis 互動）。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md) accepted；建議在 B／C 數值穩定後執行長世界驗證。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

# Phase8-C — Life & Economy Balance

- Status: approved — waiting on dependency
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-14 Owner 正式規格 [V2X-PHASE8](../docs/specs/V2X-PHASE8-BALANCE-TUNING.md)；Parent [Phase8](20261014-v2x-08-balance-tuning.md)。
- Risk: L2
- Updated: 2026-10-14
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支；worker 不 commit／push。

## Goal

處理 P8-F03：補上 `Acquire → Produce → Sell → Purchase → Restock → Reinvest` 與 `Farm → Food → Economy／Civil Defense` 完整閉環證據，並以證據調整生活成長與經濟。

## Scope

規格 §7 全文：採集效率、作物成本／收益、Smithing XP、Recipe Unlock、材料消耗、Merchant Buy/Sell Spread、Stock、Restock、Gold Income／Sinks、Masterpiece Value；禁止無風險無限套利，但不讓全部 Crafting 永久虧損且無其他價值。

## Out of Scope

新 Economy Engine、新 Profession、Worker Automation。

## Acceptance

- [ ] `life-progression.md`、`economy-balance.md` 完成，含實際 Merchant Buy／Sell／Stock／Restock 正常路線與受控循環比較。
- [ ] 無明顯無風險套利；高技能／罕見材料／供需差異的合理利潤保留並說明。
- [ ] 修改有 Before／After 與 focused tests；full check 通過；Medium review。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md) accepted；與 B 共用數值檔時由 Root 指定唯一 owner。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

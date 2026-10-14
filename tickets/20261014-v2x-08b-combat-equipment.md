# Phase8-B — Combat & Equipment Balance

- Status: approved — waiting on dependency
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-14 Owner 正式規格 [V2X-PHASE8](../docs/specs/V2X-PHASE8-BALANCE-TUNING.md)；Parent [Phase8](20261014-v2x-08-balance-tuning.md)。
- Risk: L2（觸及 RNG／Save 或 cross-system 時升 Max 審查）
- Updated: 2026-10-14
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支；worker 不 commit／push。

## Goal

處理 P8-F01／P8-F04：建立 Early／Mid／Late × Normal／Elite／Mini Boss／Boss Combat Matrix，比較 Legacy／Loot／Crafted／Boss Gear／Masterpiece 與 Damage／Crit-Speed／Bleed／Penetration／Defense builds（僅合法可取得組合），並以證據調整難度曲線、Boss、Build 與風險報酬。

## Scope

規格 §6 全文。優先調整 Stat Coefficients、Encounter Weight、Skill Cost／Cooldown、Resistance／Armor、Reward Quality、Progression Eligibility。Phase7 六種新 Boss 與既有重要 Boss 分開驗證合法生成、自然遭遇、早中後期難度、準備／撤退、獎勵、Save／Reload、Cooldown；未在正常窗口遭遇者標 `NOT OBSERVED` 並以受控測試補規則正確性。

## Out of Scope

重寫 Combat Engine；新 Boss／Monster；全面 Buff／Nerf。

## Acceptance

- [ ] `combat-balance.md`、`boss-progression.md`、`equipment-build-analysis.md` 完成（多 Seed、Turns P10/P50/P90、Potion、HP Remaining、Risk-adjusted Reward、Fight Cost）。
- [ ] 不存在低成本 Build 全面壓倒所有情境，或已列為 Finding 並說明。
- [ ] 每項修改有 Before／After 與 focused tests；full check 通過；Medium review（核心互動改動由 Max）。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md) accepted。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

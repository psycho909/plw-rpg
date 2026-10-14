# Phase8-B — Combat & Equipment Balance

- Status: accepted — PASS WITH FINDINGS (Root, 2026-10-14)
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

- [x] `combat-balance.md`、`boss-progression.md`、`equipment-build-analysis.md` 完成（多 Seed、Turns P10/P50/P90、Potion、HP Remaining、Risk-adjusted Reward、Fight Cost）。
- [x] 不存在低成本 Build 全面壓倒所有情境，或已列為 Finding 並說明。
- [x] 每項修改有 Before／After 與 focused tests；full check 通過；Medium review（核心互動改動由 Max）。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md) accepted。

## Evidence

- Outcome: measurement + diagnosis complete; **no product balance parameter changed** (B3 H1–H4 and affix/masterpiece rarity all NO CHANGE with spec §4 five-question rationale). Before/After therefore N/A for product values; route-policy before/after is v3 control vs measured.
- Reports: `reports/v2/20261014-balance-tuning/phase-08/combat-balance.md`, `boss-progression.md`, `equipment-build-analysis.md`, `b1-diagnosis.md`; runners/attempts under `phase-08/b-runner/` (all failed attempts retained).
- Key evidence: v3 control Normal 1,059 / Boss 79 / Elite 0 / MiniBoss 0 vs measured Normal 174 / Elite 64 / MiniBoss 1,103 / Boss 735 → Elite/MiniBoss absence was runner policy (over-clearing threat + Gray Wolf tie-break), not a product gate defect. Controlled matrix 15 band×source jobs, 8 Boss IDs + 9 representatives, 100×3 seeds per cell. No low-cost build dominates all contexts. Boss Gear initial FAIL was runner provenance detection (non-legendary items have null provenance, `src/engine/itemGeneration.ts:250`), not an engine defect.
- Root decision H3: Mid-band Queen/Apex/Warlord near-unwinnable in fight-to-death fixtures but natural routes retreat with 0 deaths and Late wins 65–97% → intentional high-risk tier, NO CHANGE. Findings: **B-F1** visible-before-beatable Boss goal/danger clarity → Phase8-E; **B-F2** per-Boss difficulty spread → F final review.
- Tests added: `src/engine/bossSaveReload.test.ts` (Goblin Chief alive/progress + post-defeat, Wolf King post-defeat cooldown across save/reload) PASS 2/2; scripts node:test route-policy 7/7 + controlled matrix 8/8 (13/13 combined runs logged).
- A-F1 resolved: long-world test timeouts on Windows (500-year 24–25 s measured vs 30 s; 50-year default 5 s) raised to 90 s / 15 s, assertions unchanged. `npm run check` PASS 38 files / 629 tests + vue-tsc + build — `phase-08/b-check-run/npm-run-check-windows-b-timeoutfix.log`; failing run retained.
- Source correlation: `src/` fingerprint `38bb2707…040d` (113 files, runner method) for all route and matrix runs; product code = Phase7 delivery.
- Routing (requested → observed): B1/B2 `g6-luna-max-core-engineer` gpt-6-luna/max → Codex UI "GPT-6-Luna max"; backend telemetry Unknown.
- Review / Audit: Root (Claude Opus 5.5) Standards+Spec review and H3 product decision; not independent. No product logic changed; independent review of all Phase8 tooling/tests deferred to Phase8-F (L2 fallback recorded).
- Commit / PR: this acceptance commit on `v2x/reward-core`; no PR.

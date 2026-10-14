# Phase8-C — Life & Economy Balance

- Status: accepted — PASS WITH FINDINGS（C-F1 resolved by Owner-approved V4）
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

- [x] `life-progression.md`、`economy-balance.md` 完成，含實際 Merchant Buy／Sell／Stock／Restock 正常路線與受控循環比較。
- [x] 無明顯無風險套利；高技能／罕見材料／供需差異的合理利潤保留並說明。
- [x] 修改有 Before／After 與 focused tests；full check 通過；Medium review。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md) accepted；與 B 共用數值檔時由 Root 指定唯一 owner。

## Evidence

- Routing（requested → observed）：C1 requested `g6-luna-med-engineer`（gpt-6-luna medium）→ 三次 handoff 失敗（syntax error、Life/craft policy artifact、runtime TypeError）→ 依 Owner 2026-10-14 升級規則改派 `g6-luna-high-engineer`（gpt-6-luna high，Codex UI 顯示 GPT-6-Luna high；後端 runtime 遙測不可用）。根因之一為 Codex sandbox 無法 spawn 子程序，改為核准限定前綴 `node scripts/phase8/`、`node --test scripts/phase8/` 讓 worker 自行執行 runner。
- Measurement：最終 C1 attempt `reports/v2/20261014-balance-tuning/phase-08/c-runner/attempt-20261014T090744303Z/` PASS 15/15 VALID_POLICY（Life、Hybrid、craft-focused、farm-business-supply、seasonal-farm-sell × seeds 61101–61103 × 3 年）；controlled Buy→Craft→Sell 25 loops 中 24 虧損；merchant stock/restock **NOT MODELED**（產品 finding，Phase8 §13 不得新增 economy engine）。
- Finding C-F1（High）：Farming yield = base + level−1，Farming 無 practice cap、等級無上限（3 年 Lv.33），零金幣投入＋固定價無限出售 → 季節作物售金 77,580 G／seed。Lead 推翻 worker 的「因 stock 未建模而 NO CHANGE」判讀；固定序列 counterfactual V0–V4（`c-runner/c1-crop-counterfactual.json`）。Owner 2026-10-14 選 **V4**：bonus `min(2, floor((level−1)/2))`（依採集每日 node regen 上限 ≈104 G/天比較）。
- C2 change：`src/engine/crops.ts` `farmingYieldBonus()`（全部作物含 wheat）＋ `src/engine/actions.ts` unknown-crop fallback；tests `src/engine/crops.test.ts`（projection，先失敗後通過）、`src/engine/actions.test.ts`（實際收成 delta，Medium review LOW 已處理）。
- Before/After（same seeds，3 年）：after attempt `attempt-20261014T093926448Z/` PASS 15/15；seasonal crop sales 77,580 → 22,315 G／seed、harvest 560 → 513；wheat Life food 7,853 → 2,500；farm supply 2/2 per seed 成功；settlement food 皆 100；其他 variant net 不變。剩餘 seasonal net 約 +22.8k 來自 gather→craft→sell（node-capped inputs，80-action ceiling）→ craftsman-profit 觀測，NO CHANGE。長世界 10/50/100 年移交 Phase8-D。
- Smithing／chore：A 676 crafts 僅前 6 次有 XP（超 practice cap），分層路線 241 crafts 到 Smithing 6 → NO CHANGE（條件式 chore risk）；masterpiece 觀察 154/555=27.7% vs 公式 25%。
- Verification：`node --test` scripts/phase8 四檔 20/20 PASS；engine vitest 28 files/424 PASS；`npm.cmd run check` PASS 38 files/631 tests + build（log `phase-08/c-check-run/npm-run-check-c2-v4.log`；V4 前基線 `npm-run-check.log` 38/629）。
- Raw storage：兩個 evidence attempts 與所有 attempt 的 completion.json >1MB 以 `gzip -9 -n` 壓縮（54 檔，`c-runner/raw-compression-manifest.sha256`，round-trip 54/54 驗證）；23 個 superseded/invalid attempts 其餘 346 個 >1MB raw 僅保留本機（`c-runner/local-only-raw-manifest.sha256` + `c-runner/.gitignore`），未刪除。
- Review / Audit：C2 src diff 由未參與修改的 `g6-luna-med-engineer` 審查 PASS（1 LOW 已補測試，`phase-08/c-review/c2-med-review.md`）。C1 分析為 Root 非獨立審查 fallback，與 A/B 一併交 Phase8-F 獨立 Max reviewer。
- Reports：`phase-08/economy-balance.md`、`phase-08/life-progression.md`、`c-runner/c1-high-summary.md`。
- Commit / PR：本次 commit（branch `v2x/reward-core`）；無 PR。

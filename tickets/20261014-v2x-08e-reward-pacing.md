# Phase8-E — Reward & Progression Pacing

- Status: accepted — PASS WITH FINDINGS（E2 NO CHANGE；E-F1..E-F3 carried to F／Human gate）
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

- [x] `reward-pacing.md`、`loot-reward-distribution.md` 完成；no-progress 已分類且附證據。
- [x] 產品側修改（如有）具直接 Finding 關聯、Before／After 與 tests；Medium review。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md)；產品修改在 B／C／D 數值後評估。

## Evidence

- Routing（requested → observed）：`g6-luna-med-engineer`（gpt-6-luna medium，Codex UI GPT-6-Luna medium）單一 owner；Lead 退回兩次（B-F1 UI 判讀錯誤＋未建立 §9 step 2 可觀測 objective；Elite/MiniBoss 解讀），再依獨立 review 修正一次；失敗根因各不相同，未觸發升級。
- Normal lanes（scripted，非真人）：A v3 重用基準 `phase-08/a-baseline-run/attempt-20261014T040039340Z/`；instrumented policy-v3 lane `phase-08/e-runner/instrumented-attempt-20261014T102419801Z/`（HEAD 5e223be，V4 後；Life/Adventure/Hybrid × 61101–61103 × 3 年，9/9 VALID；50,889 decision snapshots；analysis `analysis-summary-r9.json`、`boss-visibility.json`）。
- No-progress（1,423）：no understandable next goal 1,276（low confidence）、runner-policy-limited 147（v3 daily encounter cap）、legitimate world wait 0；v3 Elite/MiniBoss 0 為 runner policy defect（B measured route Elite 64／MiniBoss 1,103）。
- Chore：Life 每 seed 676 crafts 中 670 zero-XP（Hybrid 452/451/449），當下無其他合法配方，只有 trade 替代（event-time join，regression test）。
- B-F1：Boss 於開局即列出，首次合法 eligibility 55,883–116,195 分鐘；可挑戰後 Adventure/Hybrid 多在 6–7 分鐘內勝利；PlaceWindow.vue:133-145,201,236-259 顯示 eligibility reason／rank／wolf reward expectation，無明確危險估計／建議等級。
- Loot（controlled）：e05cc78..HEAD 有家族掉落表變更 → 重跑 `e-runner/loot-attempt-20261014T100851766Z/` 100,008 calls／24 cohorts，1,200 determinism mirrors PASS；rank gear rate 57.00／74.65／85.22／100%（Phase7 56.92／74.25／85.48／100%）。
- Findings：E-F1 no-progress 多數僅能低信心分類，真人目標清晰度 DEFERRED（Human gate）；E-F2 Boss eligibility 有原因但無危險估計／建議等級；E-F3 capped crafting 期間無其他可得 XP 的合法配方。E2 **NO CHANGE**（無真人可見性／理解證據；§9 禁止為 runner 指標改遊戲）。
- Verification：`node --test scripts/phase8/test_pacing_analysis.mjs` 4/4 PASS（Lead 重跑）；E 無 `src/` 變更，full check 沿用 5e223be `npm.cmd run check` PASS 38/631（`c-check-run/npm-run-check-c2-v4.log`）。
- Review / Audit：未參與施工的 `g6-luna-max-core`（Max）獨立審查 `phase-08/e-review/e-max-review.md`：2×P1（147 runner-cap 誤分類、zero-XP craft join 錯位）、P2 loot provenance、P3 Boss interval 用語 → 全部修正，follow-up `e-max-review-followup.md` RESOLVED。
- Raw storage：final instrumented attempt 與 completion.json >1MB 以 gzip -9 -n 壓縮（24 檔，`e-runner/raw-compression-manifest.sha256`，round-trip 24/24）；superseded instrumented attempt 13 個 >1MB raw 僅本機（`e-runner/local-only-raw-manifest.sha256`＋`.gitignore`）。重跑 analyzer 前需先 gunzip decisions-*.jsonl.gz。
- Commit / PR：本次 commit；無 PR。

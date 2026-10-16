# Phase10-C — Reward / Goal / Retention Signals

- Status: accepted — PASS WITH FINDINGS（2026-10-16）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 正式規格 [V2X-PHASE10-FINAL-QA-RC](../docs/specs/V2X-PHASE10-FINAL-QA-RC.md) §0「正式啟動 Phase10」；Parent [Phase10](20261016-v2x-10-final-qa-rc.md)。
- Risk: L2
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不執行外部 Claude Opus 5.5 Code Review；不開始 V3。

## Goal

工程可測的 reward signal、goal continuity（dead end 分類）、progression drought、content coverage（重跑 content validator）。

## Scope

規格 §7；不新增 daily quest／login reward 等；不重做未變內容的巨量 Monte Carlo。

## Out of Scope

規格 §0 不授權項目；新功能（Feature Freeze）；平衡數值。

## Acceptance

- [x] `reward-retention-signals.md`、`content-coverage.md`。

## Constraints and Decisions

Feature Freeze：只有具體證據的缺陷才改產品 source（Feature Freeze → Risk-Based Verification → Minimal Fix → Regression → Final Review）。保留 Owner 決策（Phase8 V4 farming、D-F1 KEEP V0）；merchant stock/restock NOT MODELED 不得宣稱解決；不新增遊戲系統、Daily Quest／Login Reward／Battle Pass／FOMO／Offline Income；不換存檔格式。Normal fresh-save 與 controlled fixture 分開計算；不以 fixture 冒充正常遊玩。QA artifacts 有界、無損壓縮、manifest＋hash，清理 chrome-profile／可重建暫存，不重存數百 MB。Human Product = DEFERRED；External Code Review = NOT STARTED。

## Dependencies and Blockers

依 Phase10 A→F 順序；前一子階段局部驗收後開始（無資料相依者可並行，由 Orchestrator 決定）。

## Evidence

- Routing（requested → observed）：施工 `g6-luna-med-engineer-2`（gpt-6-luna medium；UI GPT-6-Luna medium fast）；審查 `g6-luna-med-engineer`（gpt-6-luna medium；只做過 A，未參與 C）。
- Reports：`phase-10/reward-retention-signals.md`（reward 指標定義排除純金幣；首次有意義獎勵逐 route／seed 由 Phase8 instrumented trace 計算；引用 Phase8-E drought 分布並做 source correlation：Phase9 只改 UI／presentation／wolf 文字，無 reward／progression 規則變更；dead-end 分類：未見工程 dead end，1,276 low-confidence no-next-goal 與 147 cap-limited 為 runner 分類）、`content-coverage.md`（validator semantic PASS、wrapper INCOMPLETE；loot 未變沿用 Phase8-E 100,008 sample）。
- New test：`src/engine/phase10GoalContinuity.test.ts`（recipe 輸入素材皆有合法來源、recipe／rank／encounter／wolf 解鎖可達、seeded hint 合法性與目的地座標＝canonical destination，含誤導向反例）3/3 PASS（Lead 重跑）。
- Findings：無可重現產品缺陷；P10-F02 chore-risk、P10-F05 human goal/fun/retention 移交 Human gate；merchant NOT MODELED。
- Review / Audit：`phase-10/c-review/c-review.md`（P2 hint destination 未驗）→ 補斷言 → `c-review-followup.md` RESOLVED。
- Commit / PR：本次 commit；full check 於 B／D 完成後（避免長世界模擬期間跑時序敏感測試）。

# Phase10-F — Final QA, Internal Review & Handoff

- Status: in_progress — internal independent Max review findings being addressed（P2-01 long-world calendar years）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 正式規格 [V2X-PHASE10-FINAL-QA-RC](../docs/specs/V2X-PHASE10-FINAL-QA-RC.md) §0「正式啟動 Phase10」；Parent [Phase10](20261016-v2x-10-final-qa-rc.md)。
- Risk: L3
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不執行外部 Claude Opus 5.5 Code Review；不開始 V3。

## Goal

Full regression、findings triage、Internal Independent Max Review、RC engineering assessment、Human Playtest Packet、External Review Handoff、最終交付與停止。

## Scope

規格 §11、§14–§19。

## Out of Scope

規格 §0 不授權項目；新功能（Feature Freeze）；平衡數值。

## Acceptance

- [ ] `human-playtest-packet.md`、`external-review-handoff.md`、`final-review.md`；Gates／DoD／Q1–Q9。
- [ ] Internal Independent Max Review；commit／push 並遠端核對；停止等待 Owner。

## Constraints and Decisions

Feature Freeze：只有具體證據的缺陷才改產品 source（Feature Freeze → Risk-Based Verification → Minimal Fix → Regression → Final Review）。保留 Owner 決策（Phase8 V4 farming、D-F1 KEEP V0）；merchant stock/restock NOT MODELED 不得宣稱解決；不新增遊戲系統、Daily Quest／Login Reward／Battle Pass／FOMO／Offline Income；不換存檔格式。Normal fresh-save 與 controlled fixture 分開計算；不以 fixture 冒充正常遊玩。QA artifacts 有界、無損壓縮、manifest＋hash，清理 chrome-profile／可重建暫存，不重存數百 MB。Human Product = DEFERRED；External Code Review = NOT STARTED。

## Dependencies and Blockers

依 Phase10 A→F 順序；前一子階段局部驗收後開始（無資料相依者可並行，由 Orchestrator 決定）。

## Evidence

- Routing：F docs `g6-luna-med-engineer-2`（gpt-6-luna medium；UI GPT-6-Luna medium fast）；Lead 定稿；internal independent review 由全新 Max session（未參與 Phase10 施工或審查）。
- Verification：`npm.cmd run check` PASS 45 files／658 tests＋vue-tsc＋build at `29e7c4b`（`phase-10/a-check-run/npm-run-check-29e7c4b.log`）；之後僅報告／測試外檔案變更。
- Reports：§16 十三份（baseline、cross-system-integration、adventure-life-hybrid、reward-retention-signals、content-coverage、save-migration-determinism、long-world、browser-regression、browser-stress-performance、final-risk-register、human-playtest-packet、external-review-handoff、final-review）。
- Review / Audit：pending（`phase-10/f-review/`）。
- Commit / PR：待回填；無 PR／merge／deploy；External Code Review NOT STARTED。

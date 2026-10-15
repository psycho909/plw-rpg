# Phase9 — UI/UX Polish

- Status: in_progress
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-15 Owner 正式規格 [V2X-PHASE9-UI-UX-POLISH](../docs/specs/V2X-PHASE9-UI-UX-POLISH.md) §0「正式啟動 Phase9 — UI/UX Polish」；Parent [Phase9](20261015-v2x-09-ui-ux-polish.md)。
- Risk: L3（沿用 Phase7／8 治理；最終需 Independent Review 與 Owner 審閱）
- Updated: 2026-10-15
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／Phase10／V3。

## Goal

讓玩家更容易理解世界、形成目標、完成操作，並清楚看見自己行為造成的結果（World First、Minimal Friction、Clear Feedback、Meaningful Choices、PC／Mobile Friendly、Retro Black & White）。不重新設計核心、不增加大型功能、不改產品方向。

## Scope

規格原文 `docs/specs/V2X-PHASE9-UI-UX-POLISH.md`。優先 Findings P9-01 Goal Clarity、P9-02 Boss 風險與準備、P9-03 Crafting XP／成長資訊、P9-04 大量 Item／Monster 資訊架構、P9-05 世界事件與行動回饋。依 A→F 逐階段局部驗收：

- [A — UX Baseline & Flow Audit](20261015-v2x-09a-ux-baseline.md)
- [B — Goal & Information Architecture](20261015-v2x-09b-goal-ia.md)
- [C — Gameplay Interaction Polish](20261015-v2x-09c-interaction.md)
- [D — Responsive & Accessibility](20261015-v2x-09d-responsive-a11y.md)
- [E — Visual Consistency & Feedback](20261015-v2x-09e-visual-feedback.md)
- [F — Full QA & Independent Review](20261015-v2x-09f-qa-review.md)

Evidence：`reports/v2/20261015-ui-ux-polish/phase-09/`。

## Out of Scope

規格 §8 全部禁止項；Daily Quest／固定待辦／強制主線／假任務；Combat Power Rating；第二套 Collection DB／百科；Phase10、V3、PR／merge／deploy／`main`。

## Acceptance

- [ ] 規格 §11 十一項 Gate 判定（PASS／PASS WITH FINDINGS／FAIL；Human Product DEFERRED）。
- [ ] 規格 §13 十三份報告完成，含 Source Fingerprint／Build Correlation 與歷史 evidence。
- [ ] §12 DoD 15 項與 Final Review Q1–Q7 以證據回答，區分工程證據與未取得的真人感受。
- [ ] 未參與施工的 Independent Review 完成，阻擋級 Engineering Findings 已修正；commit／push 並遠端核對；停止等待 Owner 審閱。

## Constraints and Decisions

遵守規格 §4 視覺身份（黑白復古、零圓角、既有 SCSS tokens 與 PixelWindow／PixelMeter owner）、§8 Scope Control（不改 Threat V0、Farming V4、Combat／Loot 平衡、Save Schema；不新增 Quest／Economy／大型 UI Framework）。提示與原因只讀既有 engine projection，不複製 domain rules、不發明數值。每個共享 UI 檔案同時僅一位施工 owner。Runner 缺陷不得冒充產品 bug（F-F1 前例）。Human Product = DEFERRED。

- 基準：Phase8 交付 `53dbec2`；開工 HEAD `97dd33c`（= origin，clean）；`src/` fingerprint（sorted `git ls-files src` sha256 of sha256）`b2db22c9…058f`（113 files），與 `53dbec2` 相同；Test baseline `npm.cmd run check` PASS 38 files／631 tests＋build（`phase-09/a-check-run/npm-run-check-baseline-97dd33c.log`）。
- Orchestrator：Claude Code（Claude Opus 5.5）於 Herdr `w3:p1`；worker requested model／effort 於委派時記錄，observed 以 Codex UI 為準。
- Phase8 Product Findings 維持（D-F1 KEEP V0 只能改呈現；merchant stock/restock NOT MODELED 不可宣稱解決）。

## Dependencies and Blockers

- Phase8 Parent accepted（Owner L3 approval 2026-10-15）。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

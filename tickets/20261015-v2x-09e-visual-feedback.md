# Phase9-E — Visual Consistency & Feedback

- Status: approved — ready（D accepted 2026-10-16）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-15 Owner 正式規格 [V2X-PHASE9-UI-UX-POLISH](../docs/specs/V2X-PHASE9-UI-UX-POLISH.md) §0「正式啟動 Phase9 — UI/UX Polish」；Parent [Phase9](20261015-v2x-09-ui-ux-polish.md)。
- Risk: L2
- Updated: 2026-10-15
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／Phase10／V3。

## Goal

統一 typography、spacing、window layout、button states、hierarchy、status／feedback 與 retro presentation（P9-05 回饋層級）。

## Scope

只做符合既有黑白復古風格的優化；不把事件都做成 modal；避免通知疲勞。

## Out of Scope

規格 §8 禁止項；Phase10、V3；產品平衡數值。

## Acceptance

- [ ] `responsive-visual-review.md`（visual 部分）、`world-feedback.md`（行動回饋）。
- [ ] Before／After；review。

## Constraints and Decisions

遵守規格 §4 視覺身份（黑白復古、零圓角、既有 SCSS tokens 與 PixelWindow／PixelMeter owner）、§8 Scope Control（不改 Threat V0、Farming V4、Combat／Loot 平衡、Save Schema；不新增 Quest／Economy／大型 UI Framework）。提示與原因只讀既有 engine projection，不複製 domain rules、不發明數值。每個共享 UI 檔案同時僅一位施工 owner。Runner 缺陷不得冒充產品 bug（F-F1 前例）。Human Product = DEFERRED。

## Dependencies and Blockers

依 Phase9 A→F 順序；前一子階段局部驗收後開始。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

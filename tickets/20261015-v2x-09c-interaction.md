# Phase9-C — Gameplay Interaction Polish

- Status: accepted — PASS WITH FINDINGS（2026-10-16）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-15 Owner 正式規格 [V2X-PHASE9-UI-UX-POLISH](../docs/specs/V2X-PHASE9-UI-UX-POLISH.md) §0「正式啟動 Phase9 — UI/UX Polish」；Parent [Phase9](20261015-v2x-09-ui-ux-polish.md)。
- Risk: L2
- Updated: 2026-10-15
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／Phase10／V3。

## Goal

改善 Inventory、Compare、Crafting（含 XP 已耗盡明示 P9-03）、Monster Information、Crisis Contribution、World History 的操作流程（P9-03、P9-04、P9-05）。

## Scope

減少不必要視窗切換與資訊混亂；只在真實需求處加分類／搜尋／篩選／排序；不建第二套 Collection DB。

## Out of Scope

規格 §8 禁止項；Phase10、V3；產品平衡數值。

## Acceptance

- [x] `life-crafting-ux.md`、`adventure-ux.md`（compare／loot）、`world-feedback.md`（history／crisis）。
- [x] Component tests；Before／After；Medium review。

## Constraints and Decisions

遵守規格 §4 視覺身份（黑白復古、零圓角、既有 SCSS tokens 與 PixelWindow／PixelMeter owner）、§8 Scope Control（不改 Threat V0、Farming V4、Combat／Loot 平衡、Save Schema；不新增 Quest／Economy／大型 UI Framework）。提示與原因只讀既有 engine projection，不複製 domain rules、不發明數值。每個共享 UI 檔案同時僅一位施工 owner。Runner 缺陷不得冒充產品 bug（F-F1 前例）。Human Product = DEFERRED。

## Dependencies and Blockers

依 Phase9 A→F 順序；前一子階段局部驗收後開始。

## Evidence

- Routing（requested → observed）：施工 `g6-luna-med-engineer`（gpt-6-luna medium；UI GPT-6-Luna medium fast）；審查 `g6-luna-high-engineer`（gpt-6-luna high；未參與 C 施工）。
- Changes：`src/presentation/craftingProjection.ts`（+test）素材來源分類（區域登錄素材／舊狼族影響素材／作物收成品）與共用 `projectMaterialOriginLabel`／`projectMaterialSearchIndex`；`src/components/InventoryWindow.vue` 素材列顯示來源標籤、區分一般怪物掉落補給；`docs/UI.md`。未改 engine／平衡／存檔；未新增 collection DB。
- Verified no-change：工作台缺料列已顯示需求／持有與已知來源（同一 knowledge projection）；製作成功後已開啟物品視窗並聚焦新裝備可比較／穿戴／出售；危機捐獻與世界歷史流程依 A 證據無需改動。
- Evidence：`phase-09/life-crafting-ux.md`、`adventure-ux.md`、`world-feedback.md`；probe `c-runner/attempt-20261016T003828476Z/`（labeled controlled fixture）；失敗 attempts 保留（bundle glob、store timeout、invalid save、Vite transport、store locator）。
- Verification：craftingProjection 10/10；`npm.cmd run check` PASS 39 files／643 tests＋build（`c-runner/npm-run-check-c-final.log`）。
- Review / Audit：`phase-09/c-review/c-review.md` PASS WITH FINDINGS（P3 中文來源標籤搜尋、P3 報告 pending 語句）→ 已修正並重測。
- Commit / PR：本次 commit；無 PR。

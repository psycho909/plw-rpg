# Phase9-A — UX Baseline & Flow Audit

- Status: approved — ready
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-15 Owner 正式規格 [V2X-PHASE9-UI-UX-POLISH](../docs/specs/V2X-PHASE9-UI-UX-POLISH.md) §0「正式啟動 Phase9 — UI/UX Polish」；Parent [Phase9](20261015-v2x-09-ui-ux-polish.md)。
- Risk: L1（量測／稽核，不改 UI）
- Updated: 2026-10-15
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／Phase10／V3。

## Goal

以正常 fresh-save 可見 UI 稽核 Life、Adventure、Hybrid、Crafting、Boss Preparation、Regional Crisis、Succession 流程，記錄實際操作路徑、重複步驟、阻礙與 disabled-without-reason，找出真正使用問題並排序。

## Scope

規格 §7 Phase9-A、§3 P9-01..05 對應現況、§5 寬度取樣（320／375／768／1280／1920）與 §6 Modal／Focus 現況；重用 Phase8 `scripts/phase8/browser-suite.mjs`（修正 F-F1 點擊方式）。

## Out of Scope

規格 §8 禁止項；Phase10、V3；產品平衡數值。

## Acceptance

- [ ] `ux-baseline.md`：每條流程的實際路徑、問題、證據（截圖／action trace）、嚴重度與對應 P9 編號；runner 缺陷與產品問題分開。
- [ ] 不改 `src/`。

## Constraints and Decisions

遵守規格 §4 視覺身份（黑白復古、零圓角、既有 SCSS tokens 與 PixelWindow／PixelMeter owner）、§8 Scope Control（不改 Threat V0、Farming V4、Combat／Loot 平衡、Save Schema；不新增 Quest／Economy／大型 UI Framework）。提示與原因只讀既有 engine projection，不複製 domain rules、不發明數值。每個共享 UI 檔案同時僅一位施工 owner。Runner 缺陷不得冒充產品 bug（F-F1 前例）。Human Product = DEFERRED。

## Dependencies and Blockers

依 Phase9 A→F 順序；前一子階段局部驗收後開始。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

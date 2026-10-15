# Phase9-A — UX Baseline & Flow Audit

- Status: accepted — PASS WITH FINDINGS（2026-10-15）
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

- [x] `ux-baseline.md`：每條流程的實際路徑、問題、證據（截圖／action trace）、嚴重度與對應 P9 編號；runner 缺陷與產品問題分開。
- [x] 不改 `src/`。

## Constraints and Decisions

遵守規格 §4 視覺身份（黑白復古、零圓角、既有 SCSS tokens 與 PixelWindow／PixelMeter owner）、§8 Scope Control（不改 Threat V0、Farming V4、Combat／Loot 平衡、Save Schema；不新增 Quest／Economy／大型 UI Framework）。提示與原因只讀既有 engine projection，不複製 domain rules、不發明數值。每個共享 UI 檔案同時僅一位施工 owner。Runner 缺陷不得冒充產品 bug（F-F1 前例）。Human Product = DEFERRED。

## Dependencies and Blockers

依 Phase9 A→F 順序；前一子階段局部驗收後開始。

## Evidence

- Routing（requested → observed）：`g6-luna-high-engineer`（gpt-6-luna high；UI GPT-6-Luna high）。Spec §10 建議 Low 做 UI 探索；Lead 選 High，因稽核需判斷真實使用問題並延用其 Phase8 browser runner 與 F-F1 修正。Lead 退回一次補 controlled cap／succession／筆電高度與指紋說明。
- Runner：`scripts/phase9/audit-runner.mjs`（system Chrome 153 CDP、production dist、每次點擊以 elementFromPoint 驗證最上層元素，0 obscured clicks；run 結束記錄並刪除 chrome-profile）、`compact-artifacts.mjs`。
- Evidence：`reports/v2/20261015-ui-ux-polish/phase-09/ux-baseline.md`；final attempts `a-runner/attempt-20261015T082613437Z-ux-audit/`（normal fresh-save：156 actions、97 clicks、0 errors、29 screenshots）與 `attempt-20261015T085040840Z-ux-audit/`（加 controlled cap／succession／768／900 高度）；早期未完成 attempts 保留。
- Findings：P2 P9-02 Boss 準備缺危險度與撤退／冷卻規則摘要；P2 P9-01/05 HUD 在 768／900／1000 px 高度被切（1280×768 identity 截斷、recent event 與 shortcuts 完全在畫面外；320／375 mobile nav 在 1000 高度下方）；P3 P9-04 一般怪物掉落與配方註冊素材難以連結。P9-03 controlled cap：工作台明示「本配方已達熟練上限 Lv.3」與下一配方目標，進階配方顯示素材缺口 → 無新缺陷。Succession controlled：不可關閉、focus 正確、29 選項、選後 HUD 正確。Crisis 只以 labeled fixture 走過。
- Source parity：`23d8f619…`（browser-suite 演算法，與 Phase8-F 9118454 相同）與 `b2db22c9…`（lead sorted git ls-files 演算法）為不同演算法對同一 src；`git diff 9118454 HEAD -- src` 空 → RESOLVED。
- Verification：baseline `npm.cmd run check` PASS 38/631；`git diff -- src` 空。
- Review / Audit：Lead 審閱（量測階段，無 src 變更）；Phase9 整體獨立審查於 F。
- Commit / PR：本次 commit；無 PR。

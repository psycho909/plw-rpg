# Phase9-D — Responsive & Accessibility

- Status: accepted — PASS WITH FINDINGS（2026-10-16）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-15 Owner 正式規格 [V2X-PHASE9-UI-UX-POLISH](../docs/specs/V2X-PHASE9-UI-UX-POLISH.md) §0「正式啟動 Phase9 — UI/UX Polish」；Parent [Phase9](20261015-v2x-09-ui-ux-polish.md)。
- Risk: L2
- Updated: 2026-10-15
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／Phase10／V3。

## Goal

PC／Mobile、Keyboard、Touch、Modal、Scroll、Focus、Input Feedback 改善與驗證（規格 §5、§6）。

## Scope

不改核心 game loop；不建第二套 mobile 邏輯；區分 runner locator 錯誤與真正 hit-testing／modal 問題。

## Out of Scope

規格 §8 禁止項；Phase10、V3；產品平衡數值。

## Acceptance

- [x] `interaction-accessibility.md`、`responsive-visual-review.md`（responsive 部分）。
- [x] Keyboard／focus／modal tests；320／375／768／1280／1920 截圖；review。

## Constraints and Decisions

遵守規格 §4 視覺身份（黑白復古、零圓角、既有 SCSS tokens 與 PixelWindow／PixelMeter owner）、§8 Scope Control（不改 Threat V0、Farming V4、Combat／Loot 平衡、Save Schema；不新增 Quest／Economy／大型 UI Framework）。提示與原因只讀既有 engine projection，不複製 domain rules、不發明數值。每個共享 UI 檔案同時僅一位施工 owner。Runner 缺陷不得冒充產品 bug（F-F1 前例）。Human Product = DEFERRED。

## Dependencies and Blockers

依 Phase9 A→F 順序；前一子階段局部驗收後開始。

## Evidence

- Routing（requested → observed）：施工 `g6-luna-high-engineer`（gpt-6-luna high；UI GPT-6-Luna high fast）；審查 `g6-luna-med-engineer`（gpt-6-luna medium；未參與 D 施工）。
- Changes：`src/style.scss` 以 dvh 欄式 shell 分配高度，地圖讓出空間（保留桌面／手機最小高度）；`src/presentation/modalFocus.ts`（+test）抽出 focusable 排序與 Tab 循環，保留 `details > summary`，排除 hidden／負 tabindex／`:disabled`／`.disabled`／`aria-disabled=true`；`src/components/PixelWindow.vue`；`docs/UI.md`。無 game loop／engine／save／平衡變更。
- Evidence：probe `d-runner/probe-20261016T010259948Z/`：20 個寬×高組合（320／375／768／1280／1920 × 667／768／900／1000）無橫向溢出、抽樣目標皆在 viewport 內且 ≥24×24，map frame 421–778 px；Lead 目視 1280×768 與 375×667 HUD／最近事件／快捷鍵／mobile nav 完整。Keyboard：native modal focus、2 px 指示、Enter／Space、Esc 還原焦點；Inventory body 可捲動且 footer 在界內。Touch：320×667 mobile 物品按鈕（72×40）觸控開窗、方向鍵 42×42。早期失敗 attempts 保留。
- Verification：modalFocus tests；`npm.cmd run check` PASS 40 files／647 tests＋build（`d-runner/npm-run-check-d-final.log`）。
- Review / Audit：`phase-09/d-review/d-review.md`（P3 disabled via [tabindex]）→ 修正＋回歸測試 → `d-review-followup.md` RESOLVED／ACCEPTED。A 的 P2 HUD clipping 已解決。
- Commit / PR：本次 commit；無 PR。

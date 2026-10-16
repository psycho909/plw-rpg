# Phase10-B — Cross-system Integration QA

- Status: accepted — PASS WITH FINDINGS（2026-10-16）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 正式規格 [V2X-PHASE10-FINAL-QA-RC](../docs/specs/V2X-PHASE10-FINAL-QA-RC.md) §0「正式啟動 Phase10」；Parent [Phase10](20261016-v2x-10-final-qa-rc.md)。
- Risk: L2（缺陷修正若涉核心則 L3 審查）
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不執行外部 Claude Opus 5.5 Code Review；不開始 V3。

## Goal

驗證 Adventure、Life、Hybrid、Crisis、Life／Death／Succession 跨系統流程；補 Phase9 整合證據缺口；P10-F01 Hybrid normal attempt 與 controlled fixture 分開。

## Scope

規格 §6、§4 P10-F01／F02；優先重用既有測試與 runner；只修有證據的缺陷。

## Out of Scope

規格 §0 不授權項目；新功能（Feature Freeze）；平衡數值。

## Acceptance

- [x] `cross-system-integration.md`、`adventure-life-hybrid.md`。
- [x] 缺陷修正有 before／after、測試與獨立 review。

## Constraints and Decisions

Feature Freeze：只有具體證據的缺陷才改產品 source（Feature Freeze → Risk-Based Verification → Minimal Fix → Regression → Final Review）。保留 Owner 決策（Phase8 V4 farming、D-F1 KEEP V0）；merchant stock/restock NOT MODELED 不得宣稱解決；不新增遊戲系統、Daily Quest／Login Reward／Battle Pass／FOMO／Offline Income；不換存檔格式。Normal fresh-save 與 controlled fixture 分開計算；不以 fixture 冒充正常遊玩。QA artifacts 有界、無損壓縮、manifest＋hash，清理 chrome-profile／可重建暫存，不重存數百 MB。Human Product = DEFERRED；External Code Review = NOT STARTED。

## Dependencies and Blockers

依 Phase10 A→F 順序；前一子階段局部驗收後開始（無資料相依者可並行，由 Orchestrator 決定）。

## Evidence

- Routing（requested → observed）：施工 `g6-luna-high-engineer`（gpt-6-luna high；UI GPT-6-Luna high fast）；審查 `g6-luna-med-engineer`（gpt-6-luna medium；未參與 B）。Lead 退回兩次：重標 optional influence-material path，並要求 required adventure-input 路線；延長至 2 遊戲年。
- Integration：`phase-10/cross-system-integration.md`、`adventure-life-hybrid.md`；targeted vitest 15 files／255 tests（`b-runner/targeted-vitest.log`）；新測試 `src/engine/phase10Integration.test.ts`。Adventure／Life／Crisis（含無介入）／Succession 對應既有與新增測試。
- P10-F01：Normal fresh-save (A) **COMPLETED — optional influence-material path**（seed 20261016，wolfFang 用於 starterSpear influence，0.39 遊戲天）；(B) **COMPLETED — required adventure-input path**（seed 20261017，Smithing Lv.2＋slime_resin 早於 0.47 天取得；聚落於 day 68.70 成為 village、blacksmith 於 world time 99405 建成，day 69.04 製作 slime_resin_guard、裝備並再冒險；1,675 public actions；Home workbench 不能取代 blacksmith）。Phase9 未達成的原因 = station 受聚落成長門檻（合法世界限制），非缺陷。Controlled fixture 另計。
- P10-F02：XP cap 可見、有其他成長方向、進階配方／素材可達；無可重現無效重複流程；XP 公式未改。
- 無產品 src 變更；無 P0–P2 產品缺陷。
- Review / Audit：`phase-10/b-review/b-review.md` PASS WITH FINDINGS（P2：normal 路線測試接受任一結果）→ Lead 改為斷言兩條路線皆 COMPLETED（3/3 pass、vue-tsc 0 errors）。型別錯誤（7 處）由施工者修正。
- Commit / PR：本次 commit；無 PR。

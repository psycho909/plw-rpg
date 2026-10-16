# Phase10-R — External Code Review Remediation

- Status: in_progress
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 交付外部獨立 Code Review 報告 `reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review.md`（Verdict CHANGES REQUIRED）並指示依其處理；Phase10 規格 §0（授權工程缺陷修復、最小必要修正）與 §17（External Review → 必要修復 → Regression）。Parent [Phase10](20261016-v2x-10-final-qa-rc.md)。
- Risk: L3（Data Integrity／Persistence）
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不開始 V3。

## Goal

修正外部審查確認的缺陷，補上掩蓋缺陷的測試缺口，完整回歸後交回外部審查者複審。

## Scope

- **Must fix — P1-01**：影響素材與基本素材相同時需求未加總、扣除兩次 → stack 負數 → 存檔無法重載（`src/engine/crafting.ts` blankContext／transactionFailure／craftInternal）。依 `(source,id)` 加總需求比較；扣除前任何 stack 會變負數即 fail。不改配方資料。
- **Must test — G-01**：22 個重疊配方逐一邊界測試（持有=基本需求 → `materials_required`；需求+1 → 成功、stack=0、`deserialize` 通過；UI projection 不足時 disabled）。
- **Must test — G-02**：公開 action 後狀態必須能通過 `deserialize(serialize(state))` 的不變條件測試（代表性 action 序列）。
- **Recommended — P2-01 / G-03**：journal pending 有界化（合併連續 `time` record、pending 上限與缺口標記、flush 不依附存檔成功、reset 在配額壓力下可完成），長期配額測試。
- **Low — P3-02**：`convertCropGoodToFood` 加與 actionBlocker 一致的守衛＋測試。
- **Report — P3-01**：Phase8 economy runner 360 天年制 → 報告補註（「3 年」= 9 遊戲年；day 359 = 第 3 年末）。

## Out of Scope

S-01（crisis／旅人 360 日冷卻意圖，待 Owner 決定）、S-02、S-03、G-04、G-05（記錄於 risk register）；平衡數值；存檔格式變更；新功能。

## Acceptance

- [ ] P1-01 修正＋G-01、G-02 測試（先失敗後通過）。
- [ ] P2-01 修正＋G-03 測試；P3-02 守衛＋測試；P3-01 報告補註。
- [ ] `npm.cmd run check` 完整通過；未參與施工的 internal review。
- [ ] commit／push 並遠端核對；交回外部審查者複審（由 Owner 啟動）。

## Constraints and Decisions

最小修正；不改存檔 schema（P2-01 若需改 journal record 形態，須維持舊 journal 可讀）；每項修正有 before／after 與測試；Human Product DEFERRED。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:

# Phase10-R — External Code Review Remediation

- Status: accepted — 外部複審 APPROVED WITH FINDINGS（2026-10-16；4/4 VERIFIED_FIXED；新增 O-01 P3 不阻擋，待 Owner 決定修正時程）
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

- [x] P1-01 修正＋G-01、G-02 測試（先失敗後通過）。
- [x] P2-01 修正＋G-03 測試；P3-02 守衛＋測試；P3-01 報告補註。
- [x] `npm.cmd run check` 完整通過；未參與施工的 internal review。
- [x] commit／push 並遠端核對。
- [x] 交回外部審查者複審（由 Owner 啟動）：APPROVED WITH FINDINGS。

## Constraints and Decisions

最小修正；不改存檔 schema（P2-01 若需改 journal record 形態，須維持舊 journal 可讀）；每項修正有 before／after 與測試；Human Product DEFERRED。

- 2026-10-16 Owner 決策：多世界 pending 缺口標記超過上限時，合併最舊世界為一組明確標記（訊息載明合併世界數，worldId sentinel `journal-combined-worlds`），以保證 pending ≤256 筆且 ≤256,000 字元。

## Evidence

- Verification:
  - Worker RED／GREEN：`reports/v2/20261016-final-qa-rc/phase-10/r-runner/r1-summary.md`（P1-01 修正前 35/36 失敗 → 通過；G-01 22 配方 35 組、G-02、P3-02）、`.scratch/20261016-phase10r/r-runner/r2-summary.md`（G-03 25,000 次推進、退避重試、reset 配額）、`r3-luna-medium-guard-test-summary.md`（P3-02 測試移除 guard 後 3 失敗）、`r4-sol-medium-journal-coalesce-summary.md`（已存檔紀錄以新 ID 取代合併、marker 前綴 guard 移除後失敗）、`r5-sol-medium-journal-world-summary.md`（壓縮不跨 worldId）、`r6-sol-medium-world-cap-summary.md`（129／1,000 世界上限）。
  - Lead 整合：修正 `contentItems.integration.test.ts` 預期為依 `(source,id)` 加總（符合 P1-01）；25,000 次壓力測試 timeout 45s→120s（全套並行時 46s）。
  - 最終 `npm.cmd run check`（2026-10-16 20:2x，本 commit 工作樹）：48 files／718 tests passed；`vue-tsc --noEmit` + `vite build` 通過。
- Review / Audit:
  - 第一次獨立審查（GPT-6.1 Sol，Codex，唯讀，未施工）：CHANGES REQUIRED — P2 合併改寫已存檔紀錄、P2 時間併入 marker、P3 P3-02 測試無效 → round 3–4 修正。Lead 另拒收 round 3（合併實質失效、marker 測試無效）。
  - Luna Max 獨立複審 `luna-max-p10r-review`（唯讀，未施工）：round 4 → P2 壓縮跨 worldId；round 5 → P2 多世界無上限；round 6 → **APPROVE**。lost-ack 不同 ID 範圍重疊經審查判定目前 IndexedDB adapter 下可接受（appendBatch 僅於交易完成 resolve）。
- External re-review（Owner 啟動，全新 Claude Opus 5.5 session，唯讀、隔離副本）：`reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review-Verification.md` — **APPROVED WITH FINDINGS**，受審 `b21ce0c`；P1-01／P2-01／P3-01／P3-02 皆 VERIFIED_FIXED；Release Blocker 無；隔離 `npm run check` 48 files／718 tests PASS；b11d760 舊版重現 → HEAD 拒絕；238 組合法鍛造新舊 byte-identical（RNG／Determinism 不變）；journal fuzz 24 seeds×900 步 0 mismatch、上限未超過。
- 新 finding O-01（P3，不阻擋）：`compactPending()` 只在 `record()` 執行，載入／存檔時不壓縮；超過上限的舊 pending 若重寫時超過配額，需 reset 才能繼續。最小修正為可寫入的 `loadCheckpoint` 或 `save()` 前壓縮。待 Owner 決定 RC 前修或列 backlog。
- Commit / PR: 工程修正 `b21ce0c`；外部複審結果記錄於本 Ticket 更新所在 commit，push 至 `origin/v2x/reward-core` 並核對遠端；不 PR／merge。
- 剩餘風險：O-01（P3，見上）；G-02 僅涵蓋代表性 action；compactPending 經 6 輪修改複雜度偏高；combined marker 失去極舊世界的個別來源（Owner 決策）；IndexedDB 總歷史量未設上限；lost-ack 可能留下不同 ID 的重疊時間範圍（消費端不可加總為唯一時間）。

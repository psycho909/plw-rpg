# Phase10-R O-01 — Journal pending compaction on load/save

- Status: accepted（O-01 已修正 2026-10-16）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 於 session 指示「馬上修復」O-01（外部複審 `reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review-Verification.md` §E，P3，不阻擋 RC）。Parent [Phase10-R](20261016-v2x-10r-external-review-fixes.md)。
- Risk: L2（Persistence；局部修正）
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不開始 V3。

## Goal

載入超過上限的舊 journal pending 後，不需重建世界即可繼續原世界並成功存檔。

## Scope

- `src/stores/gameStore.ts`：在存檔序列化前（或可寫入的 `loadCheckpoint`）套用既有 `compactPending()`；不改壓縮演算法本身。
- `src/stores/gameStore.test.ts`：O-01 回歸測試；必要時調整既有 legacy reset 測試，但保留 reset 在配額壓力下可完成的驗證。

## Out of Scope

壓縮演算法重構、journal／存檔 schema、IndexedDB 總量上限、其他 finding。

## Acceptance

- [x] RED→GREEN：載入超過上限的舊 pending（配額 5M）後 `advance(1)`（或等價公開 action），不 reset 即存檔成功，pending 在上限內並含缺口標記。
- [x] Reset 在配額壓力下仍可完成；既有 journal 測試全過。
- [x] `npm.cmd run check` 完整通過；未參與施工的 review。
- [x] commit／push 並遠端核對。

## Constraints and Decisions

最小修正；舊存檔仍可讀；不改數值。

## Evidence

- Verification: `luna-medium-o01-fix`（GPT-6 Luna medium，Codex）`reports/v2/20261016-final-qa-rc/phase-10/r-runner/r7-luna-medium-o01-fix-summary.md` — RED：修正前載入 5,000,000 字元舊 pending 後 `advance(1)` 世界時間停在 480（存檔失敗擋住推進）；GREEN：3 個 journal 測試檔 63/63、`vue-tsc` 通過。修正為 `save()` 序列化前呼叫既有 `compactPending()`（演算法未改；`persisted` 僅在寫入成功後重建）。Lead 完整 `npm.cmd run check`：48 files／719 tests passed＋`vue-tsc`＋`vite build`。
- Review / Audit: `luna-max-o01-review`（GPT-6 Luna max，唯讀，未施工）**APPROVE**：無重送已丟棄紀錄或同 ID 不同內容風險；唯讀預覽不寫入；新測試在未修正路徑會失敗；reset 測試移除的 `journalError` 斷言為會被 archive 失敗訊息覆寫的暫態，其他測試仍涵蓋。
- Commit / PR: 本 Ticket 更新所在 commit，push 至 `origin/v2x/reward-core` 並核對遠端；不 PR／merge。
- 剩餘風險：archive 持續不可用時，摘要與缺口標記仍等待重試寫入；瀏覽器／IndexedDB 實機未驗證。

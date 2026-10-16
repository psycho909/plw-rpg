# B1 safe archive transfer — worker summary

- Worker：`sol-medium-b1-transfer`；自行施工，無委派、無 commit／push。
- Authority：`tickets/20261016-v2x-final-data-integrity.md`、指定 dispatch、`common.md` 與已核准 `b1-retention-design-review.md`。
- Base／HEAD：`037289db2138e0d6a0146b61994056d48fd3d1e0`。
- 結果：B1 實作與目標回歸完成，可交 Lead 整合；全域 typecheck 受範圍外錯誤阻塞，非最終 Acceptance。

## 修改

- `src/stores/gameStore.ts`：writer 取得鎖後，用與 `compactPending()` 相同的 count／字元口徑判定超限。只有超限才等待新增的 `transferLegacyPending()`；每批 64 筆，保留原 id／內容，ack 後移除該批 pending。每批最多三次嘗試，失敗後等 1 秒、2 秒，每次最多等 5 秒；任何一批用盡重試即結束轉移，回既有 `save()` 壓縮剩餘 pending。單批持續失敗最壞等待 18 秒。
- 轉移期間沿用 pending／not-ready 狀態，沒有 checkpoint 寫入；dispose 後不再啟動新批次、就緒或存檔。已送出的 repository Promise 無取消 API，可能稍後完成，但不會使此 store 再寫 checkpoint。
- 一般 pending 維持原同步 ready → save → normal flush。`compactPending()`、`record()`、`flushJournal()`、`save()` 及 normal flush 的 `persisted`／`inFlight` 語意未更動；未使用被拒絕的 patch，未改 schema、依賴或上限。
- `src/stores/gameStore.test.ts`：新增 12 項案例，涵蓋 dispatch 全部十項矩陣，加上逾時、部分批次 ack 與 dispose。fixture 使用合法 seed `100016`、公開 pack／unpack／store API；直接構造 legacy journal 欄位已用註解標示原因。

## RED → GREEN 證據

1. 先新增 `archives original legacy-large before any checkpoint write`，尚未修改產品碼時執行：
   `npx.cmd vitest run src/stores/gameStore.test.ts -t "archives original legacy-large"`
   Exit 1；1 failed、56 skipped。失敗於測試第 66 行：
   `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times`。
   setItem 的第一筆 checkpoint 已含 summary／gap marker，證明歸檔前覆寫。
2. 實作後相同命令 Exit 0；1 passed、56 skipped。
3. 擴充矩陣後：
   `npx.cmd vitest run src/stores/gameStore.test.ts -t "legacy archive transfer before first checkpoint" --reporter=verbose`
   Exit 0；12 passed、56 skipped。
4. 指定回歸：
   `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts`
   Exit 0；3 files、75 tests passed，63.64 秒（包含既有 25,000 次推進測試）。
5. 最後將 normal-size 案例內的 mock 斷言由「每次 archive 呼叫時恰好寫過一次」改為「已經寫過 checkpoint」，避免後續正常 flush 寫入被誤判為故障；同步首次寫入一次的外部斷言保留。再執行：
   `npx.cmd vitest run src/stores/gameStore.test.ts -t "keeps normal-size pending"`
   Exit 0；1 passed、67 skipped。此為上述完整目標回歸後唯一變更。
6. `git diff --check -- src/stores/gameStore.ts src/stores/gameStore.test.ts`：Exit 0。

## 既有 O-01／壓縮測試時序調整

下列案例原先只等待兩個 microtask，現在都以 `await vi.advanceTimersByTimeAsync(3000)` 等待 archive 三次立即失敗及 1 秒／2 秒重試間隔。原 fixture、動作與結果斷言均不變，仍驗證 archive 持續失敗後的壓縮政策：

- `compacts oversized legacy pending data so reset persists under quota`：等載入壓縮完成，再驗證 reset 的持久化與舊世界 marker。
- `compacts oversized legacy pending on load and continues the same world under quota`：等載入壓縮完成，再推進同一世界。
- `compacts mixed worlds into separate chronological source ranges`：等轉移失敗，再驗證多世界範圍與後續第二次壓縮。
- `keeps source world markers within the pending record count cap`：等轉移失敗，再驗證 256 筆上限與來源範圍。
- `bounds %s pending worlds with explicit oldest-world merging`（129／1000 兩案例）：等轉移失敗，再驗證最舊世界合併與最新紀錄。
- `preserves per-world attribution when prefix compaction alone fits many worlds`：等轉移失敗，再驗證不必合併世界時保留歸屬。
- `keeps combined world counts cumulative across checkpoint reload and compaction`：初載與重載各等 3 秒，再驗證累積世界數；兩處等待均有調整。
- `retains a large newest record by merging oldest world pairs under character pressure`：等載入轉移失敗，再驗證新動作的字元壓力壓縮。
- `bounds markers even when legacy character metadata exceeds the pending character cap`：等轉移失敗，再驗證 marker metadata 與上限。

## Typecheck 阻塞

`npx.cmd vue-tsc --noEmit`：Exit 1，回報兩個 TS2339：

- `src/engine/postRcS02Defender.test.ts(219,56)`：`phaseEndsAt` 不存在於完整 `RegionalCrisisState` union。
- `src/engine/postRcS02Defender.test.ts(221,43)`：同上。

該檔在共享工作樹有其他施工變更，本 worker 未修改；沒有本次 store／store test 的診斷。Lead 需修正 union narrowing 後重新執行全域 typecheck；本報告不將此檢查記為通過。

## 自查與交接邊界

- 已用 `git diff -- src/stores/gameStore.ts src/stores/gameStore.test.ts` 檢查本次 unstaged 內容；Standards／Spec 自查未發現本次範圍偏離。此為施工者自查，不是獨立 Audit。
- 實測原始大紀錄完整傳入 archive、轉移前零 checkpoint 寫入、第一份 checkpoint 在上限內、失敗／逾時可繼續世界、lost ack 同 id 同內容略過、多世界原樣轉移、重載不重送、reset、唯讀、一般同步流程、部分成功與 dispose。
- 未執行完整 `npm.cmd run check`、production browser O-01、獨立 Max review 或 Git 發布；依 dispatch／common 由 Lead 負責。
- 剩餘風險依已核准設計：archive 持續失敗時仍壓縮為 marker，可能失去詳細歷史；timeout 不會取消已送出的 archive transaction，重送由既有 id／內容一致性去重。無新 UI／schema 決策。
- 使用 `matt-skills-curated:implement`、`matt-skills-curated:tdd`，依專案 skill-workflows 適配至 worker 目標驗證與既有 Work Authority；未建立額外 tracker。

未檢查：完整 check、瀏覽器與獨立審查；未 commit／push。
需知風險：全域 typecheck 尚未通過；archive 持續失敗沿用既有壓縮政策。

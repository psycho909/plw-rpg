# B1 legacy pending retention — worker summary

- Worker: `sol-medium-b1-retention`（dispatch 指定名稱；不作為 runtime 模型證明）。
- Authority: `tickets/20261016-v2x-post-rc-hardening.md`、`.scratch/20261016-post-rc/common.md`、`dispatch-sol-medium-b1-retention.md`。
- Baseline / HEAD: `6a15a2b2d93da79ff37fad141e79064aebb69880`。
- Result: **CONFIRMED DEFECT**，已完成局部修復；指定 focused regression 為 **VERIFIED SAFE IN TESTED SCOPE**。不代表整體 L3 Ticket 已驗收。

## Diff summary

只修改 `src/stores/gameStore.ts` 的 `save()` 與 `src/stores/gameStore.test.ts`；本檔為指定交付報告。未更動其他 worker 檔案。

- `save()` 先寫入完整 checkpoint；只有 DOMException 的 `QuotaExceededError`、`NS_ERROR_DOM_QUOTA_REACHED` 或 code 22 / 1014 才呼叫既有 `compactPending()`，並只重試寫入一次。
- 非 quota 錯誤或重試失敗沿用原有 catch：暫停時間、顯示存檔失敗並保留原有 flush 行為。`savedAt`、`saveError` 清除及 `persisted` 重建均在成功寫入之後。
- 加入短註解說明：保留可歸檔的 legacy detail，O-01 壓縮只作 quota fallback。
- 新增兩個 regression tests：健康 archive 收到完整 `legacy-large`（400,000 字元）；storage disabled 時 pending id 不變、只寫入一次、原 checkpoint 不變並顯示既有錯誤。
- 使用 `createGame(100016)` 建立世界；直接構造的 legacy journal 已在測試標示為受控 fixture，目的為模擬舊 checkpoint 允許超過目前 pending cap 的紀錄。
- 未改 schema、`compactPending()` 演算法、`record()`、`flushJournal()` 或 `loadCheckpoint()`。既有測試與 expectations 均未調整。

## RED evidence — CONFIRMED DEFECT

先新增健康 archive 測試，尚未修改 production code 時執行，exit 1：收到兩個 marker，沒有 `legacy-large`。首次完整內容斷言輸出過大，因此改為先檢查 ids，完整內容斷言仍保留。

接著加入 disabled storage 測試，production code 仍未修改，執行：

```text
npx.cmd vitest run src/stores/gameStore.test.ts -t "archives oversized legacy pending intact|does not compact legacy pending"
Exit code: 1

× archives oversized legacy pending intact when the checkpoint fits quota
× does not compact legacy pending when checkpoint storage is disabled
AssertionError: expected [ …(2) ] to deeply equal [ 'legacy-large' ]
Expected: ['legacy-large']
Received: two generated marker ids (both tests)

Test Files  1 failed (1)
Tests       2 failed | 56 skipped (58)
Duration    2.11s
```

兩個失敗都來自原本 `save()` 在寫入前無條件壓縮，並非 fixture 或語法錯誤。

## GREEN evidence — VERIFIED SAFE IN TESTED SCOPE

修復後執行 dispatch 指定命令：

```text
npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts
Exit code: 0
Test Files  3 passed (3)
Tests       65 passed (65)
Duration    55.74s

npx.cmd vue-tsc --noEmit
Exit code: 0
Output: none

git diff --check
Exit code: 0
```

Git 僅提示測試檔未來被 Git 寫入時 LF 將轉 CRLF，無 whitespace error。

原有兩項 O-01 測試皆包含在上述 GREEN，內容完全未改：

- `compacts oversized legacy pending data so reset persists under quota`
- `compacts oversized legacy pending on load and continues the same world under quota`

這些測試確認超過模擬 5,000,000 字元 quota 的 legacy pending 仍會壓縮，且可接續原世界或明確重建世界；健康 archive 測試則確認可容納的完整 legacy record 確實送達 appendBatch。

## Self-review and boundaries

- Standards / Spec: **VERIFIED SAFE IN TESTED SCOPE**。以 `git diff -- src/stores/gameStore.ts src/stores/gameStore.test.ts` 與 `git diff --cached -- src/stores/gameStore.ts src/stores/gameStore.test.ts` 檢查；staged diff 為空。呼叫端包含 store actions、writer acquisition、flush acknowledgement、game loop 與 App 儲存／離頁入口，介面未變，無須修改 callers、exports、config 或既有 fixtures。
- Reviewer: 本次施工 Agent 自查；未宣稱獨立 review。先核對 diff 與 dispatch，再核對驗證輸出。
- Remaining integration: **NOT TESTED**。完整 `npm.cmd run check`、production Chromium smoke、真實 IndexedDB／瀏覽器 quota 與獨立 review 留給 Root Lead；本 worker 依 common rules 不委派、不 commit／push。
- Legacy error names/codes 與重試再次失敗的路徑已靜態核對，但未新增各自的 runtime 分支測試：**NOT TESTED**。現有 quota 測試直接驗證 `QuotaExceededError` fallback 成功。
- 保留既有風險：quota fallback 仍可能以摘要／缺口標記取代舊逐筆內容；`record()` 的既有壓縮政策未變。本修復只保護首次可成功寫入並歸檔的 legacy pending，不新增 retention policy，也不保證 archive 長期不可用時永久保留逐筆紀錄。

未執行全套檢查、瀏覽器 smoke 或獨立稽核；未 commit／push。風險與 Lead 後續驗證範圍如上。

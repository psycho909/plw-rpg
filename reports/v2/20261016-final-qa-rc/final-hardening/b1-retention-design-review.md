# B1 — Legacy Journal Data Preservation：設計審查

- 日期：2026-10-16。Ticket：[20261016-v2x-final-data-integrity](../../../../tickets/20261016-v2x-final-data-integrity.md)。
- Owner 決策：方案 3，設計一個同時滿足資料保留與 pending 上限的做法。`post-rc/b1-retention-proposal.patch` 不採用，因為它違反上限，只當作失敗案例參考。
- 結論：**DESIGN APPROVED（Lead）→ 進入最小實作**。設計不改 save／journal schema，不改 pending 上限的定義，也不需要新的 UI 互動。唯一的保留風險是 archive 在載入時持續失敗的情境，這時沿用既有、已核准的 P2-01 壓縮政策（見 §4）。

## 1. 問題

- 取得 writer 後，`loadCheckpoint(true)` 讀入舊 pending，接著立刻同步呼叫 `save()`。O-01 讓 `save()` 在序列化前就 `compactPending()`，所以超大的舊紀錄在任何 archive flush 發生之前就變成 summary／gap marker。
- RED 證據：IndexedDB 正常、checkpoint 放得進配額時，HEAD 只把 2 個 marker 送進 archive；`b21ce0c` 會把原始紀錄送進 archive（見 post-RC 報告的 B1）。

## 2. 設計：Legacy Checkpoint → Safe Archive Transfer → Checkpoint Compaction → Continue World

只有在取得 writer、並讀入**超過上限**的 pending（> 256 筆或 > 256,000 字元）時，才走這條路徑：

1. **暫不就緒**：維持 `writerPending=true`、`writerReady=false`，沿用既有的「正在確認存檔使用狀態」狀態，沒有新 UI。這段期間 `save()`、`advance()`、`act()`、`reset()`、`flushJournal()` 都因為 `writerReady=false` 而不會寫入。localStorage 裡仍然是原本的舊 checkpoint。
2. **Safe Archive Transfer**：用既有的 `repository.appendBatch()`，以每批 64 筆、原 id、原內容送出 pending。每一批確認寫入後，就從 `journal.pending` 移除那幾筆，等同 flush 的 ack。
   - `appendBatch` 會用 unique index 檢查 id：相同 id 且內容相同就略過，內容不同就整個交易 abort。所以重送不會重複，也不可能出現 same-id／different-content。
   - 失敗時有限重試：最多 3 次，間隔 1 秒、2 秒，每次最多等 5 秒。全部失敗才進入下一步。
3. **Checkpoint Compaction**：保留 O-01 在 `save()` 內無條件呼叫 `compactPending()` 的做法。轉移成功時 pending 已經不超過上限，壓縮不會動作；轉移失敗時，壓縮成 summary／gap marker（既有政策）。
4. **Continue World**：設定 `writerReady=true`、`writerPending=false`，然後 `save()`。第一次寫入的 checkpoint 必定在上限內。
5. **分頁被關閉**：如果 store 在轉移期間被 dispose，就中止流程、不寫入、不設定 ready。

pending 在上限內的一般情況，維持現有的同步流程，不做任何改變。

## 3. 不變條件對照

| # | 不變條件 | 是否滿足 | 理由 |
|---|---|---|---|
| 1、2 | pending ≤ 256 筆、≤ 256,000 字元 | ✓ 嚴格 | 所有 checkpoint 寫入仍經過 `save()` 內的 `compactPending()`；轉移期間完全不寫入 |
| 3 | 已歸檔的資料不重複歸檔 | ✓ | 原 id＋相同內容會被 `appendBatch` 略過；ack 後就從 pending 移除 |
| 4 | 不出現 same-id／different-content | ✓ | 轉移送出的是原始紀錄；內容不同時交易 abort，視同失敗並改走壓縮，不會寫進不一致的資料 |
| 5 | 不破壞物品、金幣、世界狀態 | ✓ | 只動到 journal；遊戲狀態在轉移期間不推進、不寫入 |
| 6 | 存讀檔後能繼續同一個世界 | ✓ | 轉移完成後走既有的 save；`worldId` 不變 |
| 7 | 唯讀預覽不修改資料 | ✓ | 唯讀分頁拿不到 writer lock，所以不會轉移也不會寫入 |
| 8 | archive 故障不會讓世界永久無法操作 | ✓ | 重試有上限（最壞約 18 秒），之後壓縮並繼續 |
| 9 | 不會未經確認就刪除原本能完整保存的紀錄 | ✓（archive 正常時） | archive 正常時一定先完整歸檔。archive 不可用時，紀錄唯一的完整副本只存在舊 checkpoint 裡，見 §4 |
| 10 | 無法完整保留時有明確策略與可追溯說明 | ✓ | 改走既有 P2-01／O-01 的壓縮，summary／gap marker 會記錄範圍與世界 |

## 4. 各情境的行為

| 情境 | 行為 |
|---|---|
| Archive 正常 | 完整歸檔 → pending 在上限內 → 正常存檔。**詳細歷史保留** |
| Archive 暫時不可用 | 在重試期間內恢復：完整歸檔。超過重試：壓縮成 marker，世界繼續（既有政策） |
| IndexedDB 配額已滿 | appendBatch 失敗 → 壓縮成 marker，世界繼續 |
| localStorage 配額已滿 | 壓縮後的 checkpoint 仍放不下時，走既有的存檔失敗流程（O-01 也一樣） |
| 轉移途中瀏覽器中斷 | 還沒有寫入任何 checkpoint，舊檔完整。下次載入重做轉移，已歸檔的部分因內容相同被略過，不會遺失也不會重複 |
| Lost ack（已提交但回報失敗） | 下一次重試送出相同紀錄 → 被略過 → 成功。重試次數用完時改走壓縮，此時 archive 已有原始紀錄，只會多出 marker，這是已知的語意 |
| 多個世界 | pending 依原樣轉移（包含各世界的 marker），`worldId` 不變 |
| 唯讀分頁 | 不轉移、不寫入 |
| Reset World | 需要 `writerReady`，轉移完成前不能操作；轉移完成後走既有流程 |

**不可同時達成的部分**：當 archive 在載入期間持續不可用（超過重試期限），「完整保留」和「世界能繼續」兩者無法同時成立。舊紀錄唯一的完整副本在 localStorage 的舊 checkpoint 裡，要繼續遊戲就必須寫入一份在上限內的 checkpoint。

本設計在這種情況沿用 Phase10-R P2-01 與 O-01 已核准的政策：壓縮成 summary／gap marker，讓世界繼續。這不是新的 Owner 決策。如果 Owner 希望改成其他做法，例如延長等待時間、強制先匯出，那會需要新的 UI，必須另行授權。

## 5. 相容性

- 存檔、journal 的 schema 都不變，舊存檔仍可讀，也不需要 migration。
- writer 就緒的時間點，只有在「載入超過上限的舊 pending」時才會延後，延後時間有上限。其他所有路徑的時序都不變。
- 沒有新增持久暫存：轉移期間的權威資料就是 localStorage 裡尚未覆寫的舊 checkpoint。
- 不增加 IndexedDB 的重複紀錄。

## 6. 實作範圍與驗證

- 由 Codex `sol-medium-b1-transfer` 實作，只修改 `src/stores/gameStore.ts`（writer acquisition 與新增的轉移函式）和 `src/stores/gameStore.test.ts`。
- 測試矩陣：正常 legacy archive、超大舊 pending、archive 失敗、配額失敗、archive 恢復、存讀檔、reset、lost ack、多世界 marker、writer／唯讀行為。先 RED 再 GREEN。
- 驗證：完整 `npm run check`、production browser O-01 runner，最後由未參與施工的 Max reviewer 獨立審查。

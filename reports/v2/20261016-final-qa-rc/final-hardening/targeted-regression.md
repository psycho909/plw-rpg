# Final Hardening — Targeted Regression

- Base：`037289d`。Baseline `npm.cmd run check`：50 files／721 tests PASS；dist `a018b478…`（`sha256sum` 慣例）。
- 新 Source：`src/stores/gameStore.ts` 加入 B1 safe archive transfer。另外修改了 `gameStore.test.ts` 和 `postRcS02Defender.test.ts` 兩個測試檔。

## 1. Source／Build 對應

| 項目 | 值 |
|---|---|
| 產品變更 | 只有 `src/stores/gameStore.ts`（+34 行），沒有 schema、依賴或常數變更 |
| 完整檢查 | `npm.cmd run check`：**50 files／738 tests PASS**，`vue-tsc` 與 `vite build` 通過 |
| 新 dist | `977d9883…`（`sha256sum`）／`600255a7…`（runner 慣例）。dist 不同於 RC，所以 **RC 的瀏覽器證據不涵蓋新 Source**，已在下面補驗證 |

## 2. B1 test matrix

Codex `sol-medium-b1-transfer` 在 `gameStore.test.ts` 新增 12 項測試。

- RED：修正前，第一份寫出的 checkpoint 就已經帶有 marker，代表舊紀錄在歸檔前被覆寫，斷言失敗。
- GREEN：修正後 12 項全部通過，3 個 journal 測試檔共 75 個測試通過。

| 情境 | 單元測試 | 瀏覽器（production、Chrome 155） |
|---|---|---|
| Archive 正常，舊 pending 放得進配額 | ✓ 原始紀錄完整歸檔；轉移前沒有任何 checkpoint 寫入 | A5 ✓：5,163,330 字元完整歸檔；第一份 checkpoint 79,328 字元，pending 為 0 |
| 超大舊 pending、配額不足、archive 正常 | ✓ | C8 ✓：3,000 筆全部完整歸檔，第一份 checkpoint 沒有 marker |
| Archive 失敗（持續） | ✓ 重試後壓縮，世界繼續 | C1–C3 ✓：256 筆／93,790 字元，marker 依 `older-world`／`legacy-world` 標示；B1–B9 ✓ |
| Archive 失敗一次後恢復 | ✓ 完整歸檔，沒有 marker | — |
| 逾時、部分批次成功 | ✓ | — |
| Lost ack | ✓ 相同 id 與內容被略過，沒有重複 | 瀏覽器內無法安全注入，沿用單元測試 |
| 多世界 | ✓ 原樣轉移，`worldId` 不變 | C2 ✓ |
| 存讀檔 | ✓ 不會重送 | A9／A10 ✓ |
| Reset | ✓ | C4 ✓ |
| 唯讀分頁 | ✓ 不轉移、不寫入 | B5 ✓：0 次 checkpoint 寫入、0 次 IndexedDB 寫入 |
| 一般大小的 pending | ✓ 維持原本的同步路徑 | C5 ✓ |
| Dispose 中途 | ✓ 不寫入、不就緒 | — |

- 瀏覽器結果：**29/29 PASS**，所有情境都沒有 page／console error。B2 在 30 秒內共 8 次寫入嘗試（轉移 3 次＋flush 退避 5 次）。
- 證據：[`runner/attempt-20261016T154532867Z-o01/results.json`](runner/attempt-20261016T154532867Z-o01/results.json)。截圖已刪除，manifest 中列出的 PNG 不再保存。
- runner 調整（`scripts/phase10/rc-o01-browser.mjs`）：
  - A5：改成驗證「轉移前完整歸檔」。
  - C1–C4：改在載入時注入 archive 故障，覆蓋改走壓縮的路徑。
  - C8：新增情境，驗證 archive 正常時全部歸檔。

## 3. S-02 test matrix

Codex `luna-medium-s02-matrix` 擴充了 `postRcS02Defender.test.ts`：3 個測試檔 37 項通過，沒有產品變更。涵蓋存活、暫時受傷、恢復、未滿額時死亡＋補位、滿額時死亡、接班人、重複交付、聲望不重複、存讀檔、危機結算、determinism。結論見 [s02-equipment-lifecycle-review](s02-equipment-lifecycle-review.md)。

## 4. 獨立審查

- `luna-max-final-review`（Codex GPT-6 Luna max，唯讀，沒有參與施工）：**APPROVE**，沒有阻擋項目。
- 它的驗證：4 個測試檔 81 個測試通過，`vue-tsc` 與 `git diff --check` 通過。
- 它記錄的殘留情況：逾時後 `appendBatch` 才完成時，可能留下保守的缺口 marker；相同 id 與內容重送不會重複歸檔。

## 5. 新 dist 上的 Production browser smoke

重用 Phase10-E 的 runner（`e-regression.mjs`），在 dist `600255a7…`（runner 慣例）上執行：[`runner/attempt-20261016T155213548Z-regression/`](runner/attempt-20261016T155213548Z-regression/)。
- 200 個動作、123 次 hit-test 點擊、0 次被拒絕的點擊、51 張截圖。
- 存讀檔後 HUD、位置、格子都相同。
- 4 個 controlled fixture（crisis、craft-cap、succession、hybrid）都是 `observed`。
- 15 個 viewport：沒有溢出、沒有被裁切的按鈕、沒有過小的點擊目標。
- 13 次 locator miss，與 baseline 相同。
- 1 個首次導航的 `net::ERR_ABORTED`。

結果與 RC smoke 完全一致，沒有回歸。

## 6. 沒有執行的項目

- 長期模擬、效能壓測：遊戲 engine 沒有變更。
- Safari、Firefox、實機：NOT TESTED。

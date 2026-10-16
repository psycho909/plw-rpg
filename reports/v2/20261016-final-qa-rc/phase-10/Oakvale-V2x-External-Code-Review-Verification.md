# Oakvale V2.x — External Code Review Verification

- 審查日期：2026-10-16
- 審查模式：READ-ONLY（沒有修改、commit 或 push 任何產品 Source 或測試；所有驗證都在隔離副本中執行）
- 原始 Review：[Oakvale-V2x-External-Code-Review.md](Oakvale-V2x-External-Code-Review.md)（Verdict CHANGES REQUIRED）
- Verdict：**APPROVED WITH FINDINGS**
- Release Blocker：**無**

---

## A. Verification Summary

| 項目 | 內容 |
|---|---|
| 原始 Review Source Commit | `b11d7603b14219739cb7524105669dc187c23cf8` |
| 修復後 HEAD | `b21ce0c520332d70fbdb59ccd0dbc0d80a7c4b41`（branch `v2x/reward-core`，與 fetch 後的 `origin/v2x/reward-core` 相同） |
| 工作樹 | 乾淨：沒有 staged、unstaged 或 untracked 檔案，所以審查範圍就是已提交內容 |
| 修復鏈 | `0d86c50`（只有文件）→ `99ae963`（主要修復，commit 訊息只寫「updatye」）→ `b21ce0c`（journal 第 3–6 輪修正與結案）。`1273511` 只改文件。 |
| 修改的 `src/` 檔案 | 8 個：產品程式 `crafting.ts`、`rewardActions.ts`、`gameStore.ts`；測試 `contentItems.integration.test.ts`、`gameStore.test.ts`，以及新增的 `phase10rCrafting`、`phase10rSaveInvariant`、`phase10rJournal` 三個測試檔 |
| Source 指紋 | `git rev-parse HEAD:src` = `88041e47b5740d2c2a669ebb87f8c41687d44403`（b11d760 是 `eb1021c8cb9567ba66905d380b5aaf6372c2cbe3`）；126 個 tracked 檔案的 sha256 聚合值 = `04e0790219dd683b2a72eb1dfd26b868f630fe6fbc6dae777cc57bb31912d1c6`；`scripts/` tree 沒變（`2df1020f31be5c9c36fb1b2dfade509e51fe88e4`） |
| Build 指紋 | 隔離環境的 `dist/` 共 3 個檔案，聚合 sha256 = `1efe2e5b6913c7333279c876a03153590fdf6a33eb97ffe4b40bc3fa10bbc6bd` |
| 審查環境 | 新的 Claude Code session，沒有承接任何開發 session；唯讀；Node v22.20.0 |
| 原始 Findings | 4 項（P1-01、P2-01、P3-01、P3-02） |
| 已確認修好 | 4 項 |
| 未解決 | 0 項 |
| 修復引入的新缺陷 | 0 項（另有 1 項 P3 相關觀察 O-01，不阻擋） |
| Final Verdict | **APPROVED WITH FINDINGS** |

---

## B. 原始 Findings 逐項驗證

| ID | Severity | 修復 Commit | 是否處理 Root Cause | Regression 證據 | 狀態 | 剩餘風險 |
|---|---|---|---|---|---|---|
| P1-01 | P1 | `99ae963` | 是。`crafting.ts:221` 在 `blankContext` 依 `(source,id)` 加總需求；預覽、驗證和扣除共用同一份已加總的 inputs，扣除變成一次扣總量（`:459`）。`craftInternal:444` 在產生物品與扣除之前，會再檢查一次存量是否足夠。 | 在 b11d760 上重現了原始 bug：resin 變成 -1，`deserialize` 拋錯。在 HEAD 上同樣條件會被拒絕，且 state 完全不變。新增的 G-01 測試涵蓋 22 個配方、35 組重疊。另外比對了合法鍛造在新舊版本的結果：238 組完全相同。 | **VERIFIED_FIXED** | 無 |
| P2-01 | P2 | `99ae963`、`b21ce0c` | 是。連續的 `time` record 會合併；待補寫紀錄（pending）上限為 256 筆／256,000 字元，超過時保留摘要和缺口標記；flush 改成失敗後退避重試，不再依附存檔成功；reset 在配額壓力下也能完成。 | 25,000 次推進、reset 配額、退避重試、遺失 ack 等 repo 測試都通過。另外跑了 24 個 seed 的隨機壓力測試（每個 900 步）：字元上限實際被壓到約 255,989，沒有一次超過；沒有發生同 ID 不同內容；恢復後都能存檔並清空 pending。 | **VERIFIED_FIXED** | O-01（P3）；IndexedDB 總量仍無上限（已接受）；遺失 ack 時可能出現範圍重疊 |
| P3-01 | P3 | `99ae963` | 選擇「報告補註」：兩份 Phase8 報告開頭都加了 Erratum，寫明 3 年＝9 遊戲年、day 359 是第 3 年末。 | 確認兩份報告 diff 都有補註；runner 沒改，沒重跑 | **VERIFIED_FIXED**（文件修正） | 原 Review 建議的 runner 斷言沒有加，但報告補註本來就是原 Review 列出的可選方案 |
| P3-02 | P3 | `99ae963` | 是。守衛邏輯與 `ownership.ts:45 actionBlocker` 一致（死亡／戰鬥／地城），在任何修改之前就先回傳。 | 3 個模式都驗證拒絕後 state 不變；r3 紀錄顯示移除守衛時有 3 個測試失敗 | **VERIFIED_FIXED** | 只有 `state.combat` 這個條件沒有單獨測到（同一個 `\|\|` 運算式） |

### 各 Finding 的補充說明

- **P1-01**
  - 其他呼叫點都已涵蓋。`craftingProjection` 和 `PlaceWindow.vue:374` 都從 plan 取 inputs，UI 的按鈕狀態 `:disabled="!craftingPlan.ok"` 也跟著修正。順帶修掉一個 Vue 問題：以前重疊時兩列用同一個 `:key`。
  - `allowedBiasMaterials`／`inputs` 的模式在其他地方只用於驗證和說明文字，沒有第二套扣除邏輯。
- **P2-01**
  - 原 Review 建議的第④項（reset 時把 pending 移到匯出檔）沒有做。改採的方式是讓 pending 有上限，保證 reset 一定存得下，再加上原本就有的「匯出遊玩紀錄」。這個替代方案達到原本要求的「保留一條安全重建的路」。

---

## C. 修復品質檢查

| 檢查項目 | 結果 |
|---|---|
| 只修表面症狀？ | 否。P1-01 改的是需求模型本身；扣除前的檢查是額外的深度防護，不是唯一的修正。 |
| 修復不完整？ | 沒發現。P1-01 的 22／28 個配方由測試從資料自動列舉，以後新增的重疊配方也會被涵蓋。 |
| 邏輯重複？ | P3-02 守衛複製了 `actionBlocker` 的邏輯，訊息字串相同。屬於可接受的局部重複。 |
| State 擁有權 | UI 仍然只能透過 `game.act` 寫入；新的 journal 狀態都封閉在 store 內，沒有暴露給 UI。 |
| 錯誤處理 | flush 失敗會以 1 秒到 60 秒的指數退避重試；手動存檔會清掉計時器並立即重試；store 銷毀時會清掉計時器；store 銷毀後 `writerReady=false`，不會再排新的重試。 |
| 測試是否假陽性？ | G-01 測試確實使用「剛好足量」這個原本會觸發 bug 的條件。審查者在舊版程式碼上獨立確認過它會失敗，與 r1 紀錄的 35/36 失敗一致。 |
| IndexedDB 唯一 ID 契約 | 已經存檔的 `time` record 若再被合併，會換新 ID，`inFlight` 中的 record 也不會被合併，因此不會觸發 IndexedDB 的「同 ID 不同內容」中止。隨機壓力測試中 mismatch 為 0。 |
| 複雜度 | `compactPending`（`gameStore.ts:59-135`）明顯偏複雜（經過 6 輪修改），可維護性風險偏高。不過隨機壓力測試沒有找到違反上限的情況。 |
| 輕微的語意問題（不列為 Finding） | 已經送進 IndexedDB 的 record 若同時被壓縮，archive 裡可能同時存在原始紀錄和涵蓋它的缺口標記。只影響紀錄的解讀，不影響存檔或遊戲狀態。 |

---

## D. Regression 結果

| 指令／測試 | 結果 | 環境與說明 |
|---|---|---|
| `npm ci` + `npm run check`（HEAD 隔離副本） | **PASS**：48 files／718 tests；`vue-tsc --noEmit` 和 `vite build` 都通過 | 隔離目錄（`git archive HEAD`），耗時 106.8 秒 |
| 審查者的跨版本測試：b11d760 舊版重現 | **PASS**：舊版 resin=-1 且 `deserialize` 拋錯；HEAD 回傳 `materials_required`，state 不變 | 只在隔離副本，不屬於 repo |
| 審查者的跨版本測試：合法鍛造結果比對 | **PASS**：28 個配方 ×（不用素材＋每種允許素材）× 2 個 seed，共 238 組。鍛造結果、鍛造後存檔字串、之後再模擬 6 小時的存檔字串，新舊版完全相同 | 確認 RNG 消耗順序和 Determinism 契約沒有改變 |
| 審查者的 journal 隨機壓力測試（24 seeds × 900 步） | **PASS**：pending 最多 50 筆、最多約 255,989 字元；每一步的 checkpoint 都能載入；mismatch=0；每個 seed 都有 12–25 次 reset 和 14–26 次重載；最後恢復正常時都能存檔並清空 | 混合 IndexedDB 失敗／成功／遺失 ack、localStorage 配額失敗、大量事件 action |
| 瀏覽器實測（G-04，時間持續流動） | **NOT RUN** | Ticket 已把 G-04 列為 Out of Scope |
| Long-world、Monte Carlo、Phase0–10 QA、兩小時壓測 | **NOT RUN** | engine 模擬與 `scripts/` 都沒有修改，沒有需要重跑的跨系統風險 |

- **受影響模組：** Crafting、Reward actions、gameStore 的 journal 和 persistence。
- **未受影響：** NPC／Succession／World 和其他 UI 元件沒有修改，也沒有發現跨系統影響。
- **驗證限制：** 審查者的跨版本與隨機壓力測試只存在隔離副本中，沒有提交到 repo。

---

## E. 新發現／重新開啟的 Findings

### O-01（P3，C 類：與修復直接相關）：pending 壓縮只在新增紀錄時執行，載入或存檔時不會執行

| 欄位 | 內容 |
|---|---|
| 位置 | `src/stores/gameStore.ts:159`（`compactPending()` 只在 `record()` 內呼叫）、`:161-176`（`loadCheckpoint`）、`:216`（`save`） |
| 審查的 Commit | `b21ce0c` |
| 觸發條件 | 載入一份 pending 超過上限的舊版 checkpoint，而且重寫同樣大小的資料就會超過配額。例如瀏覽器配額變小，或舊版當時剛好卡在配額邊緣。 |
| 預期與實際 | 預期：載入後就壓縮，可以繼續玩原本的世界。實際：`save()` 一直失敗，`canProgress()` 擋住所有行動，只能「重建世界」才會觸發壓縮。repo 測試 `compacts oversized legacy pending data…` 本身就呈現這個行為。 |
| 影響 | 很低。重寫一份原本就存得下、大小相同的資料，通常會成功；而且 reset 這條路一定可用。 |
| 最小修正 | 在可寫入的 `loadCheckpoint` 中，或 `save()` 序列化之前呼叫 `compactPending()`。 |
| Regression 測試 | 載入超過上限的舊版 pending，配額設為 5M，接著 `advance(1)`：不需要 reset 就能成功存檔。 |
| 是否阻擋 RC | 否 |

### 測試覆蓋限制（不是缺陷）

- G-02 只測了代表性的 action 序列，沒有涵蓋 equip、sell、hire、地城和接班。
- G-01 的「UI disabled」是透過 projection 的 `plan.ok` 間接驗證，沒有測 DOM。
- G-04 和 G-05 仍未覆蓋。

---

## F. 仍保留的已接受風險

- Owner 既有決策維持不變：Threat Saturation `KEEP V0`、Merchant `NOT MODELED`、Human Product `DEFERRED`、Crafting chore 屬產品觀察。
- Owner 決策：超過上限的極舊世界會合併成一組 `journal-combined-worlds` 標記，失去個別來源。
- IndexedDB 的總歷史量沒有上限（x1 約每小時 150 萬字元）。
- 遺失 ack 時，可能留下 ID 不同但時間範圍重疊的紀錄，消費端不能把它們加總當成唯一時間。
- S-01（360 日冷卻的意圖）、S-02、S-03、G-04、G-05：Ticket 已列 Out of Scope，維持待決或未驗證。
- 瀏覽器和實機（包括 Safari ITP）沒有驗證。

---

## G. Final Verdict

**`APPROVED WITH FINDINGS`**

- **原始阻擋問題是否都解除了？** 是。唯一的 Release Blocker P1-01 已修好，有舊版重現、新版拒絕、22 配方邊界測試和 Determinism 比對作為證據。
- **是否有新的 Release Blocker？** 沒有。只有 O-01（P3）。
- **是否建議接受外部 Code Review？** 建議接受，並把 O-01 記入 risk register 或後續 backlog。
- **是否可以進入 V2.x 最終 RC 驗收？** 可以，限於 Engineering RC。Human Product Gate 仍是 DEFERRED。
- **需要 Owner 決定：**
  1. O-01 要在 RC 前修，還是列入 backlog。
  2. S-01 的冷卻意圖。
  3. 啟動 RC 驗收。

**核心問題：** 先前 External Code Review 發現的問題，是否都已真正修復，而且修復後的 Oakvale V2.x 是否仍然維持跨系統正確性與穩定性？

是。4 項問題都已真正修好。比對修復前後的程式碼，合法操作的 RNG 結果和存檔內容完全一致。journal 在各種失敗組合下都維持上限、可重載、可恢復。沒有發現跨系統正確性或穩定性被破壞。

---

## JSON Verdict

```json
{
  "originalReviewCommit": "b11d7603b14219739cb7524105669dc187c23cf8",
  "fixedSourceCommit": "b21ce0c520332d70fbdb59ccd0dbc0d80a7c4b41",
  "reviewerModelRequested": "Claude Opus 5.5",
  "reviewerModelObserved": "claude-opus-5-5 (runtime self-report)",
  "independentContext": "Fresh Claude Code session; did not inherit any development session; read-only; tests run in an isolated scratchpad copy",
  "originalFindingCount": 4,
  "verifiedFixedCount": 4,
  "partiallyFixedCount": 0,
  "unresolvedCount": 0,
  "notVerifiableCount": 0,
  "newRegressionCount": 0,
  "findingStatuses": {
    "P1-01": "VERIFIED_FIXED",
    "P2-01": "VERIFIED_FIXED",
    "P3-01": "VERIFIED_FIXED",
    "P3-02": "VERIFIED_FIXED"
  },
  "newRelatedFindings": [
    { "id": "O-01", "severity": "P3", "category": "C", "file": "src/stores/gameStore.ts:159,161-176,216", "summary": "Pending compaction runs only inside record(); an oversized legacy pending that no longer fits the quota blocks continuing the existing world until reset", "releaseBlocking": false }
  ],
  "testsExecuted": [
    { "command": "npm ci && npm run check (isolated HEAD copy)", "result": "PASS", "detail": "48 files / 718 tests; vue-tsc + vite build passed" },
    { "command": "auditor cross-version RED reproduction (b11d760 vs HEAD)", "result": "PASS", "detail": "old: resin=-1 and deserialize throws; new: materials_required, state unchanged" },
    { "command": "auditor cross-version legal-craft determinism", "result": "PASS", "detail": "238 recipe x influence x seed cases byte-identical incl. 6h continuation" },
    { "command": "auditor journal fuzz 24 seeds x 900 steps", "result": "PASS", "detail": "max pending 50 records / 255989 chars; 0 same-id mismatches; recovery drains pending" },
    { "command": "browser smoke (time flowing)", "result": "NOT RUN" },
    { "command": "long-world / Monte Carlo / full QA rerun", "result": "NOT RUN" }
  ],
  "releaseBlockers": [],
  "remainingRisks": [
    "O-01 compaction not applied on load/save (P3)",
    "IndexedDB total history unbounded (accepted)",
    "Combined-world markers lose per-world attribution (Owner decision)",
    "Lost-ack may leave overlapping time ranges under different ids",
    "G-02 invariant covers a representative action set only; G-04/G-05 not covered",
    "S-01/S-02/S-03 pending; browser/device unverified",
    "Owner decisions retained: Threat Saturation KEEP V0, Merchant NOT MODELED, Human Product DEFERRED, Crafting chore observation"
  ],
  "verdict": "APPROVED WITH FINDINGS",
  "releaseCandidateRecommendation": "Proceed to V2.x Engineering Release Candidate acceptance; track O-01 as non-blocking; Human Product Gate remains DEFERRED"
}
```

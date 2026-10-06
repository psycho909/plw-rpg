# Save Writer 獨立 Review

**結論：** P1 雙分頁覆寫修復可凍結；目前未見會阻止此修復交付的 P1。另有一項 P2 匯出一致性疑慮維持 **OPEN**，留待後續集中修正／驗證。這項診斷只在受控 repository promise 交錯中重現；沒有證明目前 IndexedDB adapter 在一般瀏覽器排程中會發生，不能描述為已確認的 IndexedDB 歷史紀錄遺失。

## 範圍與快照

- Work Authority：`tickets/20261004-v2-final-qa.md`，L2；本次只審查 save-writer 修復與相關文件。
- Baseline：`c02b600c6f5f1533374d671b707d333c86d852d7`。
- 凍結 commit：`441e3c2b435f199a50cb78ee5b19521bcc084593`（由 coordinator 提供；本 reviewer 依明確限制未執行 Git 命令）。
- 審查路徑：`src/services/saveWriter.ts`、`src/stores/gameStore.ts`、`src/stores/gameStore.test.ts`、`src/App.vue`、`docs/UI.md`、`CHANGELOG.md`，以及相關 journal contract／QA evidence。
- 沒有執行 `git diff`、`git status` 或其他 Git 命令，因此沒有獨立核對 staged／unstaged 差異；以凍結檔案內容 SHA-256 識別目前四個程式檔案。四值與 Astra manifest 的 source hashes 相符：

  - `src/services/saveWriter.ts`: `0703016eb96d12bb843f0b04b6e21b6568bf7f9b44defc59e340896c675ff43b`
  - `src/stores/gameStore.ts`: `6ad3c0b49b3b7007ca72bdd90aaf1cc9caf4530b8f084c92c3351e5168b0c9b9`
  - `src/stores/gameStore.test.ts`: `f9afa54d15bd6aff3464313030b8650d233cfd6f6e4203737c5fda12b73cae89`
  - `src/App.vue`: `f5cdc05df85713c36dbdb27e88ad47f3e4127d8579dd637d5d075d8b096fcf1f`

Review participants: 主 reviewer `/root/writer_review_final`；Standards 與 Spec 各有獨立 reviewer。工具沒有提供可核實的模型遙測，因此不從 agent 名稱推測模型。

## Standards

**PASS，無 actionable finding。** 單一小型 writer adapter 負責 Web Lock lease；store 的存讀、操作、時間推進、重建及 journal flush 使用同一權限閘門。沒有新增依賴、存檔 schema 或網路服務。異步 grant 後會重新讀取 checkpoint，dispose 會停用 store 並釋放 lease。Reviewing agent 確認命名、責任範圍與既有模組界線清楚。

## Spec 與行為

P1 目標在靜態路徑檢查及既有 evidence 中成立：`saveWriter.ts:7-15` 採 `ifAvailable` lease，持有期間以未完成 Promise 保持鎖，沒有自動接管；`gameStore.ts:42-43,129-135` 先唯讀預覽、取得鎖後重載最新 checkpoint，dispose 停止操作；`gameStore.ts:64-109` 將保存、重置、開始人生、移動／操作、等待及時間倍率變更限制在 writer-ready gate 之後。相關 unit cases 覆蓋雙 store 競爭、延遲取得、拒絕、dispose、loser 匯出最新 checkpoint 與 unsupported lock（`gameStore.test.ts:387-489`）。

App 在開場不可關閉時仍能由 footer 操作恢復；待取得期間停用起身／重整，loser 可關閉另一頁後重新載入（`App.vue:42-46,139-156`）。UI contract 和 changelog 已記錄單一使用權及不自動接管規則（`docs/UI.md:66-72`、`CHANGELOG.md:31-36`）。

既有證據：Astra 的雙分頁 browser 記錄為 12/12 checks pass、fresh loser／unsupported opening 為 9/9 pass，見 `reports/playtests/20261004-v2-final-qa/astra/save-writer-browser.json` 與 `save-writer-opening-green.json`。Coordinator 回報凍結 source 的全量單 worker unit 為 229 tests／14 files pass，typecheck／build pass；本 reviewer 未重跑這些檢查。上述證據沒有涵蓋 2 小時 soak 或真人 Fun Gate；本 review 不作此類通過宣稱。

### P2 OPEN：Blocked-tab 匯出可能跨越 journal append／ACK 邊界

`gameStore.ts:111-123` 先 await `repository.readAll()`，之後才在 blocked 分支讀取 localStorage 的最新 checkpoint，兩份資料各自來自不同時刻。Owner 的 `flushJournal()` 在 IndexedDB append 完成後，會從 pending queue 移除已 ACK IDs 並保存新 checkpoint（`gameStore.ts:49-57`）。受控交錯如下：

1. blocked export 取得不含新操作的 archive snapshot，並暫停在 `await readAll()`。
2. owner append 新操作至 archive、ACK 並把 localStorage pending 清空。
3. blocked export 繼續，讀到 pending 已空的 checkpoint。
4. 下載 JSON 的 `records` 與 `pending` 都不含新操作；該筆仍留在 archive，所以這是**該次匯出缺項**，沒有證據顯示 archive source record 被刪除。

獨立診斷 `reports/playtests/20261004-v2-final-qa/review/save-export-race.probe.ts` 以延遲的 repository Promise 注入此順序，並在預期「匯出至少包含 records 或 pending 中一筆」的 assertion 失敗。重現命令：

```sh
npm run test -- --config reports/playtests/20261004-v2-final-qa/review/vitest-export-probe.config.mjs --maxWorkers=1 --reporter=verbose reports/playtests/20261004-v2-final-qa/review/save-export-race.probe.ts
```

Vitest 結果為 1 failed，具體失敗在 probe 第 86 行；原始輸出保留於 `reports/playtests/20261004-v2-final-qa/review/save-export-race-probe.log`。第一輪 log `reports/playtests/20261004-v2-final-qa/review/save-export-race-vitest.log` 也保留；其原始 probe body 存於 `reports/playtests/20261004-v2-final-qa/review/archive/save-export-race.test-source.probe.ts`。Repo 預設 Vitest include 不會匹配非 `.test`／`.spec` 的 probe 檔，probe 不會加入一般產品回歸套件。

**限制：** 這是 store 在抽象非同步 repository 邊界上的可重現交錯，不是實際 IndexedDB 時序驗證。IndexedDB adapter 的 append/read transaction 規則可能序列化此順序；尚未用真實 adapter／browser 重現或排除，故 P2 維持 OPEN 供後續核實，不能把此 finding 提升成已發生的資料損失。現有 export 測試只檢查穩定 checkpoint（`gameStore.test.ts:415-428`）。後續應用穩定 record ID 合併 archive 與匯出起始 checkpoint 的 pending，並加入實際 IndexedDB 邊界測試；完成前不宣稱跨 store export 完全一致。依 journal contract，匯出需唯讀且保留待補送內容（`tickets/20261003-local-autosave-journal.md:20,22,38`）。

### P3 非阻擋 UX 註記

- Unsupported Web Locks 環境在 `App.vue:42-46,156` 把重新整理作為恢復動作；若瀏覽器仍不支援 `navigator.locks`，reload 本身不會取得能力。Warning 已說明需改用支援 Web Locks 的安全瀏覽器／origin，依 coordinator 決定留待後續文案調整。
- 衝突／unsupported 文案同時出現在 persistent warning 和 StatusNotice（`App.vue:41,123-124,156-157`），會重複顯示；控制與存檔保護不受影響。此項已知且不阻擋凍結。

## Disposition

**P1 single-writer 修復：可接受凍結。整體 Engineering：PASS WITH FINDING，P2 export snapshot consistency OPEN。** 沒有修改 application source；這份 review、probe 與輸出只保存審查證據。Review 結論不代表 `tickets/20261004-v2-final-qa.md` 的 2 小時 browser soak、三路 Agent playtest 或真人／Product Gate 已完成。

Coordinator 整理：原 reviewer 誤將 ownerreview/review 解讀成 repo 根目錄；證據已合併至既有本輪 QA/review 目錄，保留原log及probe內容，調整專用config與import為可重現相對路徑。未改app source。

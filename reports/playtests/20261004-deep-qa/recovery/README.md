# O1 保存故障復原邊界修正

狀態：worker 實作與本機檢查完成；來源已凍結，交由 root 建立新版固定 build、執行真瀏覽器與最後 2 小時 soak。不是整張 QA Ticket 已完成。

## 診斷與最小行為

基準 commit `738bc0010c549fa3fb2420437d171f5aa2a043a0`。root 在真 Chromium 持續注入 `Storage.setItem` 的 `QuotaExceededError`：初次移動後記憶體時間 481 → 486、×20 再至 489、等待一季再至 43689；舊 localStorage raw 保持不變。恢復儲存後三筆 pending 各提交一次，沒有 pageerror。這證明保存失敗後可繞過暫停而繼續累積未保存進度；沒有證明 silent corruption。

依 `docs/UI.md` 的保存失敗暫停／持續復原提示契約、O1 明列的最小共用 gate，以及本輪 Ticket 對重大 Bug 必要最小修復的授權，採以下修正：

- `gameStore.ts`：已有 `saveError` 時，`act`、`advance`、非零 `setSpeed` 必須先成功保存現有記憶體與 pending，才執行下一步。健康路徑沒有新增預先保存。
- `App.vue`：HUD 倍率與 modal 繼續共用 store `setSpeed`；等待被阻擋或首次保存失敗時，保留保存錯誤，避免無條件顯示等待成功。
- 首次操作後才發生保存失敗時，該操作仍保留在記憶體及 pending；沒有回滚、丟棄事件、節流保存或刪除 archive。`saveBlocked`（壞 raw）、`saveError`（checkpoint）、`journalError`（archive）仍分別處理。
- 單獨 `journalError` 不阻擋遊玩；查看、匯出、手動重試、暫停與原有確認後重建路徑仍可用。

## 實際驗證

| 檢查 | 結果 | 證據 |
| --- | --- | --- |
| action RED | exit 1，第二次 callback 被呼叫，與預期 noninvocation 不符 | `red-action.log/json` |
| action GREEN | store 13/13，exit 0 | `green-action.log/json` |
| advance RED | exit 1，整個 world state 在一季等待後改變 | `red-advance.log/json` |
| advance GREEN | store 14/14，exit 0 | `green-advance.log/json` |
| speed RED | ×1/×5/×20 共 3 個新 seam 測例，因 store 尚無 setSpeed 而 assertion 失敗 | `red-speed.log/json` |
| speed GREEN | store 17/17，exit 0；檢查持續失敗維持 speed=0、成功保存先於恢复倍率 | `green-speed.log/json` |
| recovery regressions | store 20/20，exit 0 | `recovery-regressions.log/json` |
| 完整 Vitest | 143 tests / 7 files passed，exit 0 | `full-tests.log/json` |
| `npx vue-tsc --noEmit` | exit 0 | `types.log/json` |
| premium UI strict 靜態稽核 | 0 findings，exit 0 | `premium-audit.json`、`premium-audit-run.json` |
| scoped `git diff --check` | exit 0 | `diff-check.log/json` |

原 store 測例中「動作可以覆寫一般錯誤訊息」已改為持續 quota 的拒絕下一個操作契約；總數由 136 增至 143。額外回歸（只標 GREEN，沒有冒稱新的 RED）直接驗證：下一個 action callback 啟動時舊進度與 pending 已落盤、恢復後每筆 ID 提交一次、journal-only 正常動作／時間／倍率且保存次數不增加、雙重故障中重建保留舊世界 pending，儲存恢复與 archive 恢复可分開完成。既有慢 ACK／拒絕批次／壞 raw／220 events／reset 等測例包含在完整回歸內。

## Standards／Spec 自查

實作人以 `matt-skills-curated:code-review` 的兩個面向分開自查，按專案適配及 root 委派限制沒有另外派 agent；這不是獨立 review。基準與 HEAD 同上，範圍為三個 source 檔的 unstaged diff 與本 recovery 目錄新證據。root 負責整合審查、Ticket/契約同步與 Git。

Standards：檢查適用 AGENTS、工程方法、資料流及 scoped diff；共用 gate 重用原同步 save、保留狹窄介面，沒有新依賴／新儲存格式／引擎公式改動。測試沿用 Pinia/Vitest 公開 store seam，持續 storage 故障的 mock 在 beforeEach 重設，未對內部 helper 做 mock。無阻擋 finding。

Spec：檢查 O1 保護規則與 UI 保存契約；首次失敗記憶體進度保留、後續操作重試先行、journal-only 可玩、舊 raw／pending 保護均有 store 證據。App 倍率與 modal 均呼叫同一 store seam，沒有直接寫 `game.speed`。等待失敗不顯示成功。無新增產品功能或範圍外政策。

## 限制與交接

- 這個 worker 沒有建立 production build、沒有操作新版瀏覽器，也沒有執行 2 小時 soak。root 已收到來源凍結通知，需在新 build 核對 ×20、modal resume、等待一季、按鈕／鍵盤移動、查看／匯出／手動重試／確認重建、恢復後 pending ID 去重與 reload。
- Store 的 journal repository 使用受控邊界 mock，證明調度與提交隊列行為；真 IndexedDB 交易與匯出按鈕仍依 root 新版 browser 驗證。
- premium static audit 以 provider 原始脚本在記憶體載入、`--mode strict --no-write` 執行，再由既有 writer 保存輸出；來源 URI/hash 見 `premium-audit-run.json`。靜態零 finding 不代替 browser 或無障礙驗收。
- 沒有新增/宣稱 lint、formatter、DOM runner、Storybook、裝置實測。`premium-ui.json` 的 build/browser 命令由 root 的新版整合驗證承接，不覆寫舊報告。
- 所有本路線輸出透過 `scripts.recorded_reports.write_recorded` 發布；`playlog.jsonl` 保留 RED、GREEN 與各 checkpoint。每條命令保留原 exit code；JSON 保存執行起訖與三個 source hash。

## 最終 source SHA256

- `src/stores/gameStore.ts`: `d0be0a7ab5a147a46d04313ccc54e57f86eb84cfc0049afe020c4e70224721fe`
- `src/stores/gameStore.test.ts`: `fefc711704046afea5be1b2f363fd8b2d3cfde460497164db9eca2dd17454bc3`
- `src/App.vue`: `e28a60e602dbed5f5dba0a44fda1172e77e5a4c6576bf722d39ee675c352b310`

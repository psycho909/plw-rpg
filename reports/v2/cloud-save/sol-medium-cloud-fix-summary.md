# Cloud Save review fixes — worker summary

- 日期：2026-10-17。
- 授權：`.scratch/20261017-cloud-save/dispatch-sol-medium-cloud-fix.md`；Ticket `tickets/20261017-cloud-save-mvp.md`。
- Branch／HEAD：`feature/cloud-save`／`2613459dfe8ab16896858749b3fc43b049906a7c`。
- 結果：三項 review finding 已修正或補足測試，指定驗證通過，交回 Lead 複審。不是整張 L3 Ticket 的 accepted 或獨立 Audit。
- 未委派、未使用 herdr、未 commit／push、未讀取 `.env.local`、未輸出秘密；沒有修改外部服務、依賴、Schema 或其他施工者的檔案。

## 修改

1. **P2：401 → offline → online 保留重新登入需求。**
   - `src/stores/cloudStore.ts` 新增獨立 `authRequired`；401 設定後，網路事件不能清除。
   - 同使用者仍只接受 `SIGNED_IN`／`TOKEN_REFRESHED` 的不同 access token 解除；`INITIAL_SESSION`、同 token 重播不解除。登出／帳號切換沿用既有 session 重設流程；失敗 token 只保留在記憶體。
   - 回到 online 時恢復 `auth`；上傳、載入、覆寫、自動同步及 refresh 皆由此旗標阻擋，避免繼續使用失效 token。
   - `src/components/CloudSaveWindow.vue` 的登入按鈕及操作可用條件改用旗標。離線時登入按鈕仍存在，維持既有離線停用條件。
   - `src/stores/cloudStore.test.ts` 驗證網路往返前後的登入按鈕條件、`auth` 狀態、無新網路呼叫、同 token 不解除，以及不同 token refresh 恢復讀取。既有兩種事件及 conflict 回歸保留。
2. **P2：adoptCheckpoint 寫入失敗恢復 writer。**
   - `src/stores/gameStore.ts` 只修改既有 `adoptCheckpoint`：先保存速度；`setItem` 拋錯時恢復 `writerReady=true` 與原速度，設定既有 storage-failure 原文至 `saveError`／`message`，重新拋出原錯誤，不 reload。
   - 呼叫前已檢查 writer 必須為 true，因此恢復 true 即恢復原 readiness；不改驗證、成功停寫或 reload 路徑。
   - `src/stores/gameStore.test.ts` 只新增 adopt 測試，驗證 quota 拋錯、原 checkpoint 逐位元組相同、savedAt 不變、writer／速度恢復、錯誤訊息與不 reload。
   - cloud store 補測 adopt 拋錯後 `loadCloud` 回傳 false，不保存成功同步 metadata；重用既有 catch，無需改呼叫端正式程式。
3. **P3：補足採用後停寫證據。**
   - 原本僅直接呼叫 `save()` 的測試改名並擴為 journal retry／in-flight 兩種情境。
   - 使用真實 game store 與 `startLoop`，mock reload，依 `App.vue` 現有 wiring 註冊 lifecycle handler，實際 dispatch `pagehide` 及 `visibilitychange`（hidden）。
   - 建立待重試或尚未完成的 journal append，採用後讓在途 append 完成，推進 fake timers 60 秒；確認 lifecycle 與 loop save callback 確實執行、journal 沒有新 append、checkpoint 完全相同且沒有任何後續 `SAVE_KEY` setItem。
   - 這是 store／loop 整合 seam；沒有 mount App.vue 或宣稱真實瀏覽器事件驗證。

## RED → GREEN 證據

正式程式修改前，兩項 P2 各自先取得預期原因的失敗：

```text
npx.cmd vitest run src/stores/cloudStore.test.ts -t 'keeps re-login required across'
AssertionError: expected 'ready' to be 'auth'
Test Files  1 failed (1)
Tests       1 failed | 19 skipped (20)
Exit code   1
```

首次測試先停在尚不存在的旗標斷言；調整斷言順序後重新執行，取得上述既有行為的 RED，才修改正式程式。修正後 cloud store 20／20 PASS，exit 0。

```text
npx.cmd vitest run src/stores/gameStore.test.ts -t 'restores writer readiness and speed'
AssertionError: expected false to be true
  expect(game.writerReady).toBe(true)
Test Files  1 failed (1)
Tests       1 failed | 68 skipped (69)
Exit code   1
```

修正後同命令 1 PASS／68 skipped，exit 0。P3 強化測試兩種情境均 PASS；沒有改動 journal／loop 正式程式。

## 最終驗證與自查

| 檢查 | 實際結果 |
| --- | --- |
| `npx.cmd vitest run src/services/cloudSave.test.ts src/stores/cloudStore.test.ts src/stores/gameStore.test.ts` | 3 檔、104／104 PASS，exit 0；54.47 秒。service 13、cloud store 22、game store 69。 |
| `npx.cmd vue-tsc --noEmit` | PASS，exit 0。 |
| `git diff --check -- src/stores/gameStore.ts src/stores/gameStore.test.ts` | PASS，exit 0。 |
| 三份未追蹤 cloud store／test／component 的逐行 trailing-whitespace 檢查 | 沒有 finding。 |

- Standards 自查：核對 HEAD、staged（空）、tracked diff 與本次未追蹤檔案完整內容。gameStore 正式程式只改 adopt；其 test diff 只有新增 17 行。保留既有資料驗證、writer lock、journal、備份及確認 gate，沒有新依賴或額外抽象。
- Spec 自查：逐項核對 dispatch 三項 finding、CS-F01、錯誤回復與成功停寫；指定範圍未發現尚未處理的阻擋 finding。由施工者執行，非獨立 review；Lead 仍須複審。
- 使用 `matt-skills-curated:tdd`、`matt-skills-curated:implement`（套件 1.1.0）、`supabase:supabase`（metadata 0.1.2）與 `ponytail:ponytail`（套件 5.3.2），依專案 skill-workflows 適配驗證單位與禁止 Git／委派邊界。
- Auth 事件參考：[Supabase onAuthStateChange 官方文件](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)。changelog.md fetch 被工具以不支援 text/markdown 拒絕，沒有宣稱完成 changelog 掃描；本次無 SDK API、版本或設定變更。

未執行完整 repo suite、build、真實 OAuth／Supabase E2E、瀏覽器 UI mount 或部署；本輪證據限指定單元／整合 seam 及型別檢查。
剩餘風險：沿用指定 storage-failure 原文包含「時間已暫停」，但 adopt 失敗會依 dispatch 恢復原速度；後續遊戲仍沿用既有 saveError／save 的重試保護。整張 Ticket 的獨立 review 與最終驗收由 Lead 接續。

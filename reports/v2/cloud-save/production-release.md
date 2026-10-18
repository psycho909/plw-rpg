# Cloud Save MVP — Production Release 報告

- 日期：2026-10-18。Ticket：[20261018-cloud-save-production-release](../../../tickets/20261018-cloud-save-production-release.md)。PR：https://github.com/psycho909/plw-rpg/pull/2 （MERGED，fast-forward）。

## Verdict

**PRODUCTION DEPLOYED WITH FINDINGS**：正式站的 GitHub OAuth 與 Cloud Save 已通過真實測試。剩餘的 findings 都屬於顯示問題，或驗證範圍上的限制。

| 項目 | 值 |
|---|---|
| Production URL | https://plw-rpg.vercel.app |
| Production Git SHA | `8ac65bc103ca973837c963b9f933b20ff892afcc`（`main`） |
| Deployment | `dpl_6JNbFcUxQjEcWrqvMZo6phaXakHC`：READY，target production，source git |
| 正式站 bundle | `assets/index-D6x4fTkM.js`（739,000 bytes），帶入 Supabase URL 與 publishable key；和 Preview `dpl_82LNBTdK5YvFavbcKPgQh1rJvZ3W` 是同一個檔名 |
| 先前的 Production（回滾目標） | `dpl_6NLDHhNicSsk5BJWQQVL7Cekazh9`（`main`@`2613459`） |

## Release Gate

- `feature/cloud-save` ahead 1／behind 0；diff 只有 cloud save 相關的 21 個檔案。
- Vercel Production 原本沒有 `VITE_SUPABASE_*`，已新增（公開值）。
- Supabase 的 `site_url` 與 redirect 都允許正式網址，GitHub provider 已啟用。
- `npm ci` + `npm run check`：52 files／806 tests PASS。第一次執行因記憶體不足被終止，經 Owner 同意後重跑。
- PR 獨立審查（Claude Opus，唯讀）：**GO**。

## 正式網址實測

使用兩個全新的隔離 Chrome profile（P1、P2），由 Owner 親自用 GitHub 登入。沒有碰到 Owner 原本的本機世界；測試後兩個都已登出、關閉，並刪除 profile。

| 測試 | 結果 |
|---|---|
| **GitHub OAuth（正式網址）** | PASS：P1、P2 都由 Owner 登入 `psycho909` 成功 |
| **本機存檔保護** | PASS：P1、P2 登入時都有各自不同的本機世界（`d082f491…`、`3f1ff4be…`），都**沒有**被雲端自動覆蓋，遊戲照常推進 |
| **不同世界顯示衝突** | PASS：兩台都顯示「雲端已有不同版本，請選擇保留的進度。」，雲端的 revision 9／10 沒有被改動 |
| **載入前備份＋確認** | PASS：P1、P2 載入前都先下載各自本機世界的 checkpoint 備份（內容確認是原本的本機世界），並跳出確認 |
| **Cloud 下載（載入）** | PASS：P1 載入 revision 9（4085 → 繼續到 4104）；P2 載入 revision 10 |
| **Cloud 上傳／重新同步** | PASS：P1 上傳產生 revision 10、11；DB 端的 SHA-256 與 checksum 相符 |
| **離線本機存檔** | PASS：離線時本機照常推進並存檔（4122 → 4150），沒有存檔錯誤；封鎖 Supabase 請求時顯示「雲端連線失敗，本機進度仍保留」 |
| **過期 revision 無法覆蓋** | PASS：P2（基準 revision 10）在 P1 產生 revision 11 後上傳 → 判定衝突；DB 仍是 revision 11、checksum `e620ba65…` |

雲端 `primary` 槽依 Owner 指示**沒有刪除**。現在是 revision 11（測試世界 `929d28b4…`，worldTime 4448），因為測試過程中又繼續推進了。

## Findings／剩餘限制

- **CS-R01（P3，顯示）**：網路恢復後狀態已回到 `ready`，但「雲端連線失敗」的舊訊息仍留在雲端視窗中，直到下一次同步成功才清除。不影響資料。
- **審查 Minor**：
  - 瀏覽器無法確認備份檔是否真的存檔成功，只能靠確認視窗提醒使用者。
  - 載入雲端存檔時，本機尚未寫入 journal 的紀錄只會保留在備份檔裡。
- 跨裝置是同一台電腦上的兩個隔離 profile，**不是實體手機或第二台電腦**。實體裝置的驗證請照下方流程進行。
- RLS 的第二位使用者是在資料庫用角色模擬的（2026-10-17），沒有用第二個 GitHub 帳號。
- 加入 supabase-js 後，bundle 從 503 kB 增加到 739 kB。
- Safari／Firefox 沒有測試。
- 回滾：可以把 Vercel alias 指回 `dpl_6NLDHhNicSsk5BJWQQVL7Cekazh9`，但回滾後雲端功能會消失；玩家的本機存檔格式沒有改變（仍是 V8），不會有相容性問題。

## Owner 實體裝置測試流程（最少步驟）

需要一支手機（或第二台電腦），以及原本這台電腦。

1. **手機**：用瀏覽器打開 https://plw-rpg.vercel.app ，按「起身」。依序點「選單」→「雲端存檔」→「GitHub 登入」，完成授權。
   - 預期：顯示「存檔版本衝突」，因為手機上的世界和雲端不同。
2. **手機**：按「備份本機，改用雲端」，確認下載備份後按確定。
   - 預期：頁面重新整理後，變成雲端的世界（世界時間大約 4448 以後），可以繼續遊玩。
3. **手機**：玩一下，再到「雲端存檔」按「上傳本機存檔」。
   - 預期：revision 加 1，「最後成功同步」顯示剛才的時間。
4. **電腦**（任何已登入雲端、但還停在舊 revision 的瀏覽器）：按「上傳本機存檔」。
   - 預期：顯示衝突，**不會**覆蓋手機剛剛上傳的版本。
5. **電腦**：按「備份本機，改用雲端」。
   - 預期：載入手機上傳的進度。

這樣就完成了實體跨裝置往返。任何一步不如預期，請截圖或記下畫面上的文字回報給我。

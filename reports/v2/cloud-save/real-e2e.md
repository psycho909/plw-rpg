# Cloud Save MVP — 真實服務 E2E 證據

- 日期：2026-10-17。Ticket：[20261017-cloud-save-mvp](../../../tickets/20261017-cloud-save-mvp.md)。分支：`feature/cloud-save`。
- 環境：
  - Supabase `oakvale-rpg-cloud`（`ejgmdvmuywrrjkumuxdy`，ap-northeast-1）。
  - 本地 `vite preview` 位於 `http://127.0.0.1:5173`（已列入 redirect allow list）。
  - Chrome 155 有畫面的視窗，裝置 A、B 各用一個全新 profile。
  - 測試工具：[`scripts/cloud-e2e/e2e.mjs`](../../../scripts/cloud-e2e/e2e.mjs)（CDP）。
- GitHub 登入由 Owner 在測試視窗內親自完成；Lead 沒有接觸 GitHub 憑證、OAuth client secret 或 Supabase secret／service role key。資料庫的核對與毀損注入，是用 Owner 授權的 Supabase CLI 登入，透過 Management API 執行 SQL。

## Task A — OAuth 設定

| 項目 | 結果 |
|---|---|
| GitHub OAuth App | Owner 建立「Oakvale RPG Cloud Save」，Homepage `https://plw-rpg.vercel.app`，callback `https://ejgmdvmuywrrjkumuxdy.supabase.co/auth/v1/callback` |
| Supabase GitHub provider | `external_github_enabled=true`，client id／secret 都已設定（只確認「已設定」，沒有讀取內容） |
| Site URL／redirect allow list | `site_url=https://plw-rpg.vercel.app`；allow list：`https://plw-rpg.vercel.app/**`、`https://plw-rpg-*-psycho909s-projects.vercel.app/**`、`http://127.0.0.1:*/**`、`http://localhost:*/**` |
| 匿名登入 | `external_anonymous_users_enabled=false` |
| 前端金鑰 | 只用 `VITE_SUPABASE_URL` 和 publishable key（`sb_publishable_…`）。bundle 裡沒有任何 secret／service_role key；唯一出現的字串是 supabase-js 檢查 key 前綴的程式碼 |

## Database

`public.oakvale_cloud_saves` 的設定與 Owner 描述一致：
- 主鍵是 `(user_id, slot_id)`，`slot_id` 只能是 `'primary'`。
- 欄位限制：revision ≥ 1；checksum 必須是 64 位十六進位；checkpoint 為 2 B～8 MiB；`user_id` 有 FK 指向 `auth.users`。
- RLS 已啟用。3 條 policy（select／insert／update）都限 `authenticated` 角色，條件是 `auth.uid() = user_id`。
- `updated_at` 由 trigger 維護。anon 沒有任何權限。

## 結果

| 測試 | 結果 | 證據 |
|---|---|---|
| **真實 GitHub OAuth 登入** | PASS | 裝置 A、B 都由 Owner 登入 `psycho909`；DB 中 `auth.users.raw_app_meta_data.provider = github` |
| **真實上傳** | PASS | A 登入後自動同步：INSERT revision 1。DB 端用 `digest(checkpoint,'sha256')` 重算，與 `checksum` 相符；79,976 bytes，`save_version` 8 |
| **Session 恢復** | PASS | 兩個視窗被關閉後，用同樣的 profile 重開，兩台都自動恢復登入 |
| **不覆蓋未備份的本機進度** | PASS | B 登入時本機是另一個世界，自動同步偵測到衝突並暫停，雲端仍是 A 的 revision 1；載入前先下載 B 本機的 checkpoint 備份（內容確認是 B 的世界）並跳出確認 |
| **跨裝置恢復** | PASS（兩次） | B 載入 revision 1 → 從 A 的世界 633 繼續；B 再載入 revision 3 → 從 977 繼續 |
| **Revision 衝突** | PASS | B 上傳 → revision 2。A 以 revision 1 為基準上傳 → 判定衝突，雲端仍是 revision 2（`f695a6f1…`）。A 以本機覆寫 → 重新讀取 → 確認「取代雲端 revision 2」→ 條件更新成 revision 3。B 以 revision 2 為基準上傳 → 判定衝突 |
| **RLS（兩名使用者）** | PASS | 第二位使用者用 `set role authenticated` 加上另一個 uid 的 JWT claims 實測：SELECT 0 筆、UPDATE 影響 0 筆、冒名 INSERT 與 DELETE 被拒（42501）。anon 的 SELECT 被拒。本人只看得到自己的 1 筆，且無法把資料轉給別人（42501）。測試後資料不變。另外只帶 publishable key 的 REST GET／POST 也被拒（42501） |
| **離線** | PASS | 網路切斷：狀態顯示「離線」，遊戲照常推進並存檔，沒有存檔錯誤。封鎖 Supabase 請求：顯示「雲端連線失敗，本機進度仍保留；下次存檔再試。」，本機正常。恢復網路後上傳成功，產生 revision 4 |
| **Token 過期** | PASS（修正後） | access 與 refresh token 都改成無效值：狀態「請重新登入」，本機照常。**修正前** 3 秒內被同一個 token 的重播事件清除（P3），**修正後** 15 秒並重新取得焦點後仍然保留。還原 session 後回到 ready |
| **毀損與回復** | PASS | (1) checkpoint 被改但 checksum 沒變：A、B 都是 `invalid`，B 主動載入時沒有備份、沒有確認、沒有套用，本機繼續。(2) 內容改成不合法 JSON，checksum 同步更新：A 為 `invalid`。還原資料後：A 回到 ready（revision 4，`4cadff9c`），B 正確顯示衝突（基準是 revision 3） |
| **自動同步** | PASS | 登入後第一次同步、之後間隔至少 5 分鐘的同步（A 在測試期間自動產生 revision 5） |

## 修正

- **CS-F01（P3）**：同一個使用者、同一個 token 的 auth 事件重播，會清除「請重新登入」的提示。已修正：只有在 `SIGNED_IN` 或 `TOKEN_REFRESHED` 事件、而且拿到新 token 時才解除。RED 3 項失敗 → GREEN；已在真實環境重測。
- **CR-P2a**（獨立審查）：401 之後經歷一次離線再上線，會把狀態改回 ready。已修正：新增獨立的 `authRequired` 旗標，網路事件不會清除它。真實環境重測 token 失效 → 離線 → 上線：維持 `auth`，還原 session 後才回到 ready。
- **CR-P2b**（獨立審查）：`adoptCheckpoint` 寫入 localStorage 失敗時，分頁會卡住。已修正：恢復寫入權與速度、保留原存檔、顯示儲存錯誤，而且不 reload（單元測試）。
- **CR-P3**（獨立審查）：補上 pagehide／visibilitychange／journal 重試與進行中 flush 的停寫測試（store 與 loop 的整合層，沒有 mount App）。

## 原始輸出（節錄）

- Auth 設定：`{"site_url":"https://plw-rpg.vercel.app","uri_allow_list":"https://plw-rpg.vercel.app/**,https://plw-rpg-*-psycho909s-projects.vercel.app/**,http://127.0.0.1:*/**,http://localhost:*/**","external_github_enabled":true,"external_github_client_id_set":true,"external_github_secret_set":true,"external_anonymous_users_enabled":false}`
- 第一筆上傳：`{"provider":"github","user_name":"psycho909","slot":"primary","revision":1,"world_time":633,"save_version":8,"bytes":79976,"checksum_ok":true,"checksum_prefix":"8559cc0807cf"}`
- RLS：`u2 auth.uid()=…0b2; u2 SELECT visible rows=0; u2 UPDATE u1 row: affected=0; u2 INSERT as u1=DENIED 42501; u2 DELETE u1 row=DENIED 42501; anon SELECT=DENIED 42501; u1 SELECT own rows=1; u1 reassign row to u2=DENIED 42501; row unchanged (revision)=true`
- 匿名 REST：GET 與 POST 都回 `42501 permission denied for table oakvale_cloud_saves`

## 驗證時的 build

E2E 使用本機 `vite preview`，載入本分支工作樹的 build（含 `.env.local` 的 URL 與 publishable key）。最終工作樹：`npm.cmd run check` 52 files／806 tests PASS；commit SHA 見 Ticket。

## 沒有涵蓋的部分

- 兩名使用者裡，第二位是用資料庫角色模擬（沒有第二個 GitHub 帳號），沒有走第二個 GitHub OAuth。
- 跨裝置是同一台電腦上兩個獨立的 browser profile，沒有用兩台實體裝置。
- 正式網址的 OAuth 沒有測試：本輪不部署 Production。
- Preview 網址有 Vercel SSO 保護，所以沒有在 Preview 上做 OAuth E2E。

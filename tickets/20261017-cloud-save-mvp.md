# Oakvale Cloud Save MVP（Supabase + GitHub OAuth）

- Status: accepted — Cloud Save MVP 完成（feature 分支＋Preview；未 merge main、未部署 Production）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-17 Owner 於 session 授權「Oakvale Cloud Save — 接續實作與 GitHub OAuth」：Supabase project `oakvale-rpg-cloud`（`ejgmdvmuywrrjkumuxdy`，ap-northeast-1）與 `public.oakvale_cloud_saves`（RLS：authenticated 僅能 SELECT／INSERT／UPDATE 自己的列）已由 Owner 端建立，不得重建或重複 migration；Task A GitHub OAuth、Task B Vue 整合（10 項 MVP 需求）、Task C revision 條件更新、Task D 實測驗證。新增依賴 `@supabase/supabase-js`（Owner 指定 Supabase Auth）。
- Risk: L3（新外部服務／帳號資料／存檔完整性）
- Updated: 2026-10-17
- Branch: `feature/cloud-save`（自已驗收 V2.x `2613459` 建立）
- Git / Remote authority: Root-only commit/push 至 `feature/cloud-save`；允許 Preview deployment。不 merge main、不 production deploy、不 force push。Worker 不 commit／push。Secret（GitHub client secret、service role key）不得出現在 console、commit、報告或對話。

## Requirements（Owner MVP）

1 GitHub 登入／登出；2 session 恢復；3 手動上傳；4 手動載入；5 本機存檔成功後定期自動同步；6 斷網繼續使用本機；7 不覆蓋未備份的本機進度；8 跨裝置衝突提示；9 最後成功同步時間；10 不破壞 journal、writer lock、save migration。

## Lead 設計契約

- **設定**：`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`（publishable key 來自 Supabase project 設定，非 secret）。缺任一項時雲端功能停用，遊戲照常運作。前端不得使用 secret／service role key。
- **Auth**：`signInWithOAuth({ provider: 'github', options: { redirectTo: 目前 origin + path } })`，PKCE、`persistSession`、`autoRefreshToken`、`detectSessionInUrl`；`onAuthStateChange` 維持 session。
- **資料列**：`oakvale_cloud_saves`，slot `primary`；欄位 `user_id, slot_id, revision, world_id, world_time, save_version, checkpoint, checksum`（`updated_at` 由 DB 維護）。`checksum` = checkpoint UTF-8 的 SHA-256 hex。checkpoint 超過 8 MiB 時拒絕上傳。
- **上傳**：先以 `unpackCheckpoint` 驗證，再計算 checksum。
  - 第一次：`INSERT revision=1`；遇到 unique violation（23505）視為衝突。
  - 更新：`UPDATE … WHERE user_id = uid AND slot_id = 'primary' AND revision = expected` 並 `select` 回傳，`revision = expected + 1`。影響 0 列時視為衝突或授權異常，重新讀取雲端狀態。**禁止 upsert**。
  - 回傳的 checksum／revision 必須與送出的一致。
- **下載**：`checksum` 必須等於 `sha256(checkpoint)`，且 `unpackCheckpoint` 驗證通過，才可以使用；否則視為毀損並拒絕套用。
- **同步狀態**：localStorage `oakvale-cloud-sync-v1` 記錄 `{ userId, revision, checksum, worldId, syncedAt }`，只是 metadata，與遊戲存檔分開。
- **自動同步**：只有 writer 分頁（`game.writerReady`）、已登入、上線中、沒有衝突時才執行。在 `game.savedAt` 改變後，距離上次同步 ≥ 5 分鐘時，用 base revision 條件更新。網路失敗：標記離線、保留本機進度，下次再試。衝突：停止自動同步並提示。
- **套用雲端存檔**（手動載入或衝突時選擇雲端）：
  1. 比較雲端與本機（世界 id、世界時間、是否有尚未同步的本機進度）。
  2. 必須明確確認，並且**先下載本機 checkpoint 備份檔**。
  3. 由 store 的新 API `adoptCheckpoint(raw)` 處理：驗證 → 停止寫入（`writerReady=false`，避免 loop 或 pagehide 存檔把雲端內容覆寫回去）→ 寫入 localStorage → `location.reload()`。

  journal、migration 都沿用既有的載入流程。
- **以本機覆蓋雲端**（衝突時）：重新讀取雲端 revision，Owner 明確確認後，用最新 revision 條件更新；仍是 0 列就再次提示，不重試覆寫。
- **離線／token 過期**：本機存檔與遊玩不受影響；401／session 失效時顯示「請重新登入」，不清除本機資料。
- **UI**：選單新增「雲端存檔」視窗，顯示登入狀態（GitHub 帳號）、最後成功同步時間、雲端 revision 與世界時間，按鈕包含登入／登出、上傳、載入，以及衝突提示和確認。沿用 PixelWindow 與既有樣式，不改其他 UI。

## Acceptance

- [x] Task A：GitHub OAuth App 已建立（Owner），Supabase GitHub provider 已啟用，redirect URL 包含正式站、Preview 與本地測試網址。
- [x] Task B／C：實作與單元測試（mock client：insert 競態、0 列衝突、checksum 不符、毀損 checkpoint、離線、token 過期、不覆蓋未備份進度）；`npm.cmd run check`。
- [x] Task D：真實 GitHub 登入；真實上傳／下載；兩名使用者 RLS 隔離；兩個獨立 browser context 跨裝置恢復；revision 衝突；離線與 token 過期；毀損與回復；獨立 reviewer。
- [x] Preview deployment；報告；commit／push `feature/cloud-save`；停止等待 Owner（不 merge、不 production）。

## Evidence

- Baseline: `feature/cloud-save` 自 `2613459`（`src` `ab7c2615…`）建立；新增 `@supabase/supabase-js@2.117.2`（2026-09-25 發布）。
- Verification: `npm.cmd run check` 52 files／806 tests PASS＋`vue-tsc`＋`vite build`。真實服務 E2E（[real-e2e.md](../reports/v2/cloud-save/real-e2e.md)）：OAuth、上傳／下載、session 恢復、跨裝置（兩次）、revision 衝突、RLS（第二使用者以 DB 角色模擬、anon REST）、離線、token 過期、毀損與回復全部 PASS。
- Workers: Codex `sol-medium-cloud-save`（實作＋CS-F01 修正）、`sol-medium-cloud-fix`（獨立審查 3 項 finding 修正）。
- Review / Audit: `luna-max-cloud-review`（Codex GPT-6 Luna max，唯讀，未施工）：第一輪 CHANGES REQUIRED（2×P2、1×P3）→ 修正 → 複審 **APPROVE**。
- Supabase／Vercel 設定：Auth `site_url`、redirect allow list（Management API）；Vercel Preview env `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 僅限分支 `feature/cloud-save`。未使用 secret／service role key；未重建資料表或 migration。
- Commit / PR: 本 Ticket 更新所在 commit，push 至 `origin/feature/cloud-save`；不 PR／merge／production。

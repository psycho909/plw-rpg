# Cloud Save MVP Production Release

- Status: accepted — PRODUCTION DEPLOYED WITH FINDINGS（`main`@`8ac65bc`，`dpl_6JNbFcUxQjEcWrqvMZo6phaXakHC`）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-18 Owner 於 session 授權「Oakvale V2.x — Cloud Save Production Release」：Release Gate 通過後建立並 review `feature/cloud-save` → `main` PR、合併、沿用既有 Vercel Git integration 部署、正式網址真實 GitHub OAuth 與 Cloud Save smoke。不授權 force push、重建 Supabase DB、修改存檔 schema、第二個 Vercel project、刪除雲端測試存檔或 V3。Parent [Cloud Save MVP](20261017-cloud-save-mvp.md)（其「不 merge main」限制由本 Ticket 的 Owner 授權取代，僅限本次 release）。
- Risk: L3（Production release／帳號資料）
- Updated: 2026-10-18
- Branch: `feature/cloud-save` → `main`
- Git / Remote authority: fast-forward `main` 至 `8ac65bc`（PR #2）；文件 commit／push 至 `feature/cloud-save`。不 force push。

## Release Gate

- Git：`feature/cloud-save` `8ac65bc` ahead 1／behind 0 of `main` `2613459`；diff 限 cloud save 範圍（21 files）。
- Vercel Production env：原本沒有 → 2026-10-18 新增 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`（公開值）。
- Supabase：`site_url=https://plw-rpg.vercel.app`，allow list 含 `https://plw-rpg.vercel.app/**`，GitHub provider enabled（client id／secret 已設定）；anonymous sign-in disabled。
- 雲端測試存檔：`primary` revision 9（world `929d28b4…`，worldTime 4085，checksum 相符），保留不刪（Owner 指示）。
- `npm ci` + `npm run check` @ `8ac65bc`：52 files／806 tests PASS，`vue-tsc`、`vite build` PASS；dist `4ab78450…`（`sha256sum`，Windows CRLF 工作樹）。第一次執行因系統記憶體不足被終止，經 Owner 同意於前景重跑。
- PR review：Claude Opus 獨立唯讀 reviewer **GO**（無 Blocker；M1 合併授權由本 Ticket 記錄；M2 Production env 已設定；Minor：備份下載無法確認是否真正存檔、未 flush 的本機 journal 只保存在備份檔、E2E 第二使用者為 DB 模擬）。

## Acceptance

- [x] PR #2 合併（fast-forward）；Production deployment READY 且 Git SHA = `8ac65bc`。
- [x] 正式網址真實 GitHub OAuth 與 Cloud Save smoke（隔離 profile）：本機不被覆蓋、不同世界顯示衝突、載入前備份＋確認、載入後可繼續與同步、離線本機可用、過期 revision 無法覆蓋。
- [x] 報告、Owner 實體裝置測試流程；停止等待 Owner。

## Evidence

- Verification: 正式網址實測（隔離 profile P1／P2，Owner 真實 GitHub 登入）全部 PASS：OAuth、本機不被覆蓋、不同世界衝突、載入前備份＋確認、載入後繼續與重新同步（revision 10、11）、離線本機存檔、過期 revision 無法覆蓋（DB 仍為 revision 11、`e620ba65…`）。報告：[production-release.md](../reports/v2/cloud-save/production-release.md)（含 Owner 實體裝置測試流程）。Finding CS-R01（P3 顯示）。
- Commit / PR: https://github.com/psycho909/plw-rpg/pull/2

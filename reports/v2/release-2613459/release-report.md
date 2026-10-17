# Oakvale V2.x Production Release — 報告

- 日期：2026-10-17。Ticket：[20261017-v2x-production-release](../../../tickets/20261017-v2x-production-release.md)。
- Release Manager：Claude Lead（Claude Opus 5.5）。獨立審查：Codex `luna-max-release-review`（GPT-6 Luna max，唯讀，沒有參與 release 準備）。

## E. Verdict

**PRODUCTION DEPLOYED WITH FINDINGS**

正式站 https://plw-rpg.vercel.app 已在運行已驗收的 V2.x：
- commit：`2613459`；產品 Source：`ab7c2615`。
- 部署出的檔案和 release build 逐 byte 相同。
- 正式站 smoke：9 項中 8 項通過，唯一的失敗是既有的 `/favicon.ico` 404（P3）。

這不代表真人體驗已通過驗收（Human Product 仍是 DEFERRED）。

## A. Release Baseline

| 項目 | 值 |
|---|---|
| Source commit | `2613459dfe8ab16896858749b3fc43b049906a7c` |
| Production commit（main） | `2613459dfe8ab16896858749b3fc43b049906a7c`：fast-forward `8945fa7..2613459`，沒有 merge commit，沒有改寫歷史 |
| 產品 Source（`2613459:src`） | `ab7c2615ad7b6a68a0d8905ec64f6aa6df36085e` |
| Build（Linux／LF） | `index-CXJSZMya.js` sha256 `6668ba1e…`（503,629 bytes）、`index-C6FjWgbh.css` `f21a94a4…`（32,786 bytes）、`index.html` `9d7a014f…`（448 bytes） |
| Windows CRLF 本地 build | 產出不同的雜湊（`index-wO2_fiUb.js`），原因是換行字元。所以部署比對以 LF checkout 為準 |

## B. Deployment

| 項目 | 值 |
|---|---|
| Team／Project | `psycho909s-projects`／`plw-rpg`（`prj_lZyO5igVePNdObriTjrVvXGEBKMd`） |
| Git integration | GitHub `psycho909/plw-rpg`，production branch `main`；Vite、Node 22.x、`npm ci`、`npm run build`、`dist` |
| PR | https://github.com/psycho909/plw-rpg/pull/1 `release/v2x-2613459 → main`：MERGED（2026-10-17T01:35:57Z，由 fast-forward push 完成） |
| Preview | `dpl_2n2nkmZEWDyqkcXcKta9YuA5h7Ey`：READY，`v2x/reward-core`@`2613459`（有 SSO 保護） |
| Production | `dpl_6NLDHhNicSsk5BJWQQVL7Cekazh9`：READY，target production，source git，`main`@`2613459` |
| Aliases | `plw-rpg.vercel.app`、`plw-rpg-psycho909s-projects.vercel.app`、`plw-rpg-git-main-psycho909s-projects.vercel.app` |
| 先前的 Production（回滾目標） | `dpl_5DkCLUiZVjmTsd8wewncKJ2VfYmm`，`main`@`8945fa7`（V1），`plw-pc8p3e6et-psycho909s-projects.vercel.app` |

## C. Validation

| Gate | 結果 | 證據 |
|---|---|---|
| Full check | 在乾淨的 worktree（`2613459`）執行 `npm ci` 與 `npm run check`：**50 files／770 tests PASS**，`vue-tsc` 與 `vite build` 通過 | [log](npm-run-check-release-worktree.log) |
| Preview 產物一致 | Preview 的 JS／CSS 和 LF build 逐 byte 相同；`index.html` 除了 Vercel 注入的 live script 外相同。reviewer 用 HEAD 獨立核對了 Content-Length（JS 503,629） | 本報告 A 節 |
| Preview smoke（Preview 一致的 build） | Phase10-E runner：200 個動作、123 次點擊、0 次被拒絕的點擊、15 個 viewport 都正常、存讀檔一致、4 個 fixture 都有跑、戰鬥完成 | [preview-smoke/](preview-smoke/)（只保留 results／closeout／manifest／actions） |
| Preview 存檔／IndexedDB | O-01 runner **29/29** | [preview-o01/](preview-o01/)（截圖未保存，manifest 中列出的 PNG 不存在） |
| 存檔相容性（V1 → V8 原地升級） | 在同一個 origin 上先用 V1 正式版（`8945fa7`）建立存檔，再換成 release build：**7/7**，`saveVersion` 1 → 8，seed 909 不變，時間沒有倒退，存讀檔能接續，IndexedDB 收到 14 筆。另外，V1 遷移的單元測試包含在 770 個測試中 | [v1-upgrade/](v1-upgrade/)，script `scripts/release/v1-upgrade.mjs` |
| 正式站 deployment 一致 | `plw-rpg.vercel.app` 的 JS／CSS／`index.html` 都和 release build 逐 byte 相同 | 本報告 A 節 |
| Production smoke（全新 profile） | **8/9**：開始新世界、時間推進、鍵盤移動、物品視窗、手動存檔（`saveVersion` 8）、重新載入後是同一個世界、IndexedDB 有 24 筆、375×667 沒有溢出且顯示 mobile nav。**L9 失敗：`/favicon.ico` 404**，V1 和 V2.x 都沒有 favicon，是既有問題 | [production-smoke/](production-smoke/)，script `scripts/release/live-smoke.mjs` |
| 獨立審查 | `luna-max-release-review`：**GO**，沒有 P0／P1。P2 證據缺口：O-01 截圖未保存；升級測試的 U4 允許 pending 為空，所以沒有單獨證明匯入紀錄（U6 確認 IndexedDB 有寫入） | — |

正式站只用了全新的測試 profile，沒有讀寫任何真實玩家的瀏覽器資料。Preview 和正式站的瀏覽器儲存空間是分開的，所以 Preview 的測試不等於正式網址上的原地升級測試；原地升級是用 V1 正式版的 build，在本地同一個 origin 上驗證的。

## D. Known Limitations／Findings

- **REL-F01（P3）**：沒有 favicon，每次載入會出現 1 個 `/favicon.ico` 404 console error。這是 V1 就有的問題，不影響功能。修正需要新增素材，不在本次範圍內。
- **REL-F02（info）**：repo 的 tracked 檔案約 1.67 GB（QA 證據），PR 有 12,074 個檔案變更，其中產品相關只有 128 個。Vercel build 約 1 分鐘，沒有阻擋。建議日後另外處理證據的存放方式。
- **REL-F03（info）**：Release 期間 `vercel curl` 自動為這個 project 建立了一個 deployment protection bypass token。Owner 可以在 Vercel 的 Deployment Protection 設定中檢視或撤銷。
- **降版存檔相容性**：V8 存檔無法由 V1 讀取；S-02 超過 16 筆的 ledger 也無法由較舊的 V2 build 讀取。**回滾網頁程式不等於可以安全降版玩家存檔。**
- 沿用：Human Product DEFERRED；Safari／Firefox／實體裝置未完整測試；IndexedDB 長期容量（B2）；archive 持續故障時改走壓縮的政策（B1）；Security follow-up SEC-01..03。

## Rollback plan

1. 發生阻擋級錯誤時，先停止後續操作，記錄錯誤與受影響範圍。
2. 網頁程式的回滾方式：Vercel 把 `plw-rpg.vercel.app` 的 alias 指回 `dpl_5DkCLUiZVjmTsd8wewncKJ2VfYmm`（`vercel promote`／`vercel rollback`），或在 main 上 revert。**必須先由 Owner 決定**，因為已經載入過 V2.x 的玩家存檔已經是 V8，V1 會拒絕讀取（V1 會顯示存檔錯誤，原始存檔仍保留在 localStorage，不會被刪除）。
3. 涉及資料相容性時，優先採用 hotfix 往前修，不清除任何玩家資料。

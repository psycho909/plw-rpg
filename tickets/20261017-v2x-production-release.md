# V2.x Production Deployment & Release Handoff

- Status: accepted — PRODUCTION DEPLOYED WITH FINDINGS
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-17 Owner 於 session 正式授權 V2.x 正式部署：release preflight、preview、production build／deployment、正式站 smoke、必要部署設定修正、release 文件；Release Gates 通過且 PR 僅含預期 V2.x 內容時，授權以 PR 方式整合至 `main` 並完成該次 merge，以觸發既有 Vercel Git integration。不授權 force push、改寫歷史、新功能、平衡、V3、第二正式網站、後端、修改玩家存檔或正式網域。Parent [S-02](20261017-v2x-s02-equipment-ledger.md)、[Vercel production](20261003-vercel-production.md)。
- Risk: L3（Production release）
- Updated: 2026-10-17
- Branch: `release/v2x-2613459` → `main`；文件記錄於 `v2x/reward-core`
- Git / Remote authority: 依 Owner 授權 fast-forward `main` 至已驗收 commit（不 force push）；release 文件 Root-only commit／push 至 `v2x/reward-core`。

## Acceptance

- [x] Preflight：HEAD／remote／main 差異（main 為祖先，無獨立變更）、`2613459:src` = `ab7c2615…`、Vercel team／project／Git integration／production branch 核對。
- [x] Preview READY 且產物與 LF release build 逐 byte 相同；乾淨 worktree `npm ci` + `npm run check` 50 files／770 tests PASS。
- [x] Preview 一致 build 的 browser smoke、O-01 29/29、V1 → V8 原地升級 7/7。
- [x] 獨立 Luna Max release review：GO。
- [x] PR #1 merged（fast-forward）、production `dpl_6NLDHhNicSsk5BJWQQVL7Cekazh9` READY，`main`@`2613459`，alias `plw-rpg.vercel.app`，正式檔案逐 byte 相同。
- [x] 正式站 smoke（全新 profile）8/9（REL-F01 favicon 404，P3，V1 既有）。
- [x] Release 報告、CHANGELOG、rollback 計畫；worker 全部關閉；停止等待 Owner。

## Evidence

- Report: [`reports/v2/release-2613459/release-report.md`](../reports/v2/release-2613459/release-report.md)（baseline、deployment、validation、limitations、rollback）。
- Rollback target: `dpl_5DkCLUiZVjmTsd8wewncKJ2VfYmm`（`main`@`8945fa7`，V1）；V8 存檔無法由 V1 讀取，回滾需 Owner 決策。
- Review / Audit: `luna-max-release-review` GO；無 P0／P1；P2 證據缺口已記錄於報告。
- Commit / PR: PR https://github.com/psycho909/plw-rpg/pull/1 ；`main` = `2613459`；本 Ticket 與報告 commit 至 `v2x/reward-core`（不推 `main`，避免觸發文件-only 的 production 部署）。

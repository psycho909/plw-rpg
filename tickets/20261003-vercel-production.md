# Vercel 正式網站與 main 自動部署

- Status: accepted
- Owner: 本專案使用者（沿用 README 已確認身份）
- Approver: 同 Owner
- Approval evidence: 2026-10-03 使用者明確要求「在 Vercel 建立網頁」「每當 git branch main 更新時 Vercel 也會自動更新版本」。
- Risk: L2
- Updated: 2026-10-03
- Branch: main
- Git / Remote authority: README standing authorization；本 Ticket 額外授權建立 Vercel 專案、連接 psycho909/plw-rpg Git repo、將 main 設為正式部署分支及發布此 V1。

## Goal
V1 可透過公開 Vercel 網址開啟，origin/main 新 commit 自動觸發正式部署。

## Scope
Vercel 專案、Git integration、Vite build 設定、正式網址 smoke 驗證與必要交付文件。

## Out of Scope
付費升級、自訂網域、後端、登入、雲端存檔或新增遊戲功能。

## Acceptance
- [x] Vercel 專案連接 GitHub psycho909/plw-rpg，Production Branch 為 main。
- [x] Vite build 成功，正式網址可公開開啟及操作遊戲。
- [x] main 更新自動建立新 deployment，READY 且 Git SHA 符合最新 origin/main。
- [x] README 保存正式網址及部署流程；所有本次更新 commit／push，遠端 SHA 核對一致。

## Constraints and Decisions
- 使用 Vercel 內建 Git integration，不新增另一套 GitHub Actions／部署 token。
- 沿用本機瀏覽器存檔，不同來源網址的存檔各自獨立。

## Dependencies and Blockers
- None；V1 已交付，Owner 已安裝 GitHub App，Git integration 已連接。

## Evidence
- Verification: Vercel project prj_lZyO5igVePNdObriTjrVvXGEBKMd，Node22.x、Vite、npm ci／npm run build、dist。初次 CLI production deployment dpl_7Rv3wfSUKFRhcvhe5sh9CkkGuoZD READY，githubCommitSha=75662ae3b5aa4045976a2844b41c01d4bbcef340，alias https://plw-rpg.vercel.app HTTP200。正式瀏覽器驗證移動、怪物遭遇、勝利、手動存檔、reload，console error/warn=[]；遠端 JS index-BmZJNcI-.js 與 dist SHA256 一致。Git App 初次未安裝而連線失敗，Owner 回覆已完成安裝後 vercel git connect exit0；讀回 link.org=psycho909、repo=plw-rpg、productionBranch=main、createDeployments=enabled。main push fbe269115de489e997f7d12e8f182eaed18ab228 自動建立 dpl_EnRH6XuHm7NByLU4FdUFJnZ21biQ，source=git、target=production、branch=main、SHA 一致且 READY；已證明原生 Git 自動部署。
- Review / Audit: 主 Agent 分開核對 Standards（機密檔 Git 忽略、沿用同一 build、原生 Git integration）與 Spec（公開網址可操作、main 生產分支與自動觸發已實測）；已完成部分通過。此為 L2 主 Agent review，未宣稱獨立 Audit。
- Skills: vercel:deployments-cicd、vercel:vercel-cli 0.21.4。
- Commit / PR: V1 75662ae 與交付記錄 fbe2691 已 push、遠端核對一致；本 Ticket 與 handoff done 隨最終文件 commit／push，並核對最新 main 的自動部署。無 PR。

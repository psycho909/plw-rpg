# Vercel 正式網站與 main 自動部署

- Status: in_progress
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
- [ ] Vercel 專案連接 GitHub psycho909/plw-rpg，Production Branch 為 main。
- [ ] Vite build 成功，正式網址可公開開啟及操作遊戲。
- [ ] main 更新自動建立新 deployment，READY 且 Git SHA 符合最新 origin/main。
- [ ] README 保存正式網址及部署流程；所有本次更新 commit／push，遠端 SHA 核對一致。

## Constraints and Decisions
- 使用 Vercel 內建 Git integration，不新增另一套 GitHub Actions／部署 token。
- 沿用本機瀏覽器存檔，不同來源網址的存檔各自獨立。

## Dependencies and Blockers
- 待 V1 交付審查完成與第一次 main push。

## Evidence
- Verification: 已確認 Vercel CLI 61.0.0 登入 psycho909；唯一 team 為 psycho909s-projects，尚無既有專案。
- Review / Audit: 待設定後核對。
- Skills: vercel:deployments-cicd、vercel:vercel-cli 0.21.4。
- Commit / PR: 待交付；無 PR。

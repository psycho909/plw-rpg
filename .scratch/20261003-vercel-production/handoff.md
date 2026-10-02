# Task Handoff

## Identity
- Task: V1 交付與 Vercel main 自動部署
- Authority / Ticket: tickets/20261003-vercel-production.md；產品驗收見 tickets/20261002-v1-*.md
- Status: in_progress
- Updated: 2026-10-03（本次補寫；先前暫停未建立 handoff，不能視為已有歷史快照）
- Source environment: Windows / D:\Codex\plw-rpg
- Branch: main
- Remote: https://github.com/psycho909/plw-rpg.git
- Base commit: 75662ae3b5aa4045976a2844b41c01d4bbcef340
- Working tree: 交付證據與 README／Ticket 結案文件待 commit；遊戲程式已完整交付
- Sync target: origin/main

## Goal and Acceptance
V1 已完成產品驗收；完成公開 Vercel 網站、GitHub main 自動部署與遠端交付核對。

## Completed
- 77/77 tests、type check／build、npm ci 與 audit 0 漏洞。
- 本機瀏覽器全流程包含死亡繼承、離線摘要、390px 版面。
- 初始 V1 commit 已 push，origin/main SHA 與 HEAD 一致。
- https://plw-rpg.vercel.app HTTP 200，production deployment READY；正式網站移動／戰鬥／儲存重載通過，console error/warn 為空，JS SHA256 與本機 build 一致。
- Owner 已安裝 GitHub App；vercel git connect 成功，project.link 指向 psycho909/plw-rpg，productionBranch=main，createDeployments=enabled。

## Remaining
提交本次文件更新後，觀察 Git push 自動建立的 production deployment，核對 READY、最新 main SHA 與正式網址；更新此快照為 done 並再次同步核對。

## Decisions
- Owner／Approver 沿用 README；2026-10-03 使用者另行明確授權 Vercel 發布及 Git integration。
- 獨立 GPT-6 Luna Max review 中途遇額度限制；已修正其回報 findings，主 Agent 依 docs/agents/review.md 分開完成 L2 Standards／Spec fallback。非完整獨立審查通過。
- 使用 Vercel 內建 Git integration；不新增 CI token、自訂網域或付費升級。

## Changed Files
README.md、CHANGELOG.md、TODO.md、產品與規範同步 Ticket、Vercel Ticket、本 handoff；程式碼已包含於 Base commit。

## Verification
產品與正式網站證據見各 Ticket。Git integration 設定已讀回確認；main 新 push 的自動 deployment 尚待實測。

## Blockers
None；GitHub App 授權已完成。

## Next Action
commit／push 本次文件到 main，查 Vercel deployment 的 source、githubCommitSha、target 與 READY。

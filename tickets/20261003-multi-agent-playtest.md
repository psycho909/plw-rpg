# 多 Agent 模擬遊玩與 Bug 紀錄

- Status: accepted
- Owner: 本專案使用者；沿用 README 的身份設定
- Approver: 同 Owner
- Approval evidence: 2026-10-03，使用者明確要求「派多個sub agent進行遊戲的模擬遊玩，並且記錄遊玩紀錄和bug」
- Risk: L1（本機獨立存檔的遊玩測試與文件紀錄）
- Updated: 2026-10-03
- Branch: work
- Git / Remote authority: 沿用 README；只提交本次遊玩紀錄並 push 目前 work 分支，不推送 main、不部署或建立外部 Issue

## Goal

由多個獨立 Agent 實際模擬遊玩 Oakvale，留下可接續的遊玩紀錄及可重現的 Bug 清單。

## Scope

- GPT-6 Luna Max sub agent 分別執行生活經濟、冒險戰鬥、存檔離線與長期世界演化路線。
- 使用本機 Vite 與每個 Agent 獨立的 Playwright Chromium browser context，不共用玩家存檔。
- 在 reports/playtests/20261003/ 保存實際操作、結果、可重現腳本與必要證據。
- 主 Agent 交叉重現疑似 Bug、合併重複項目、區分確認 Bug／設計限制／尚未重現，完成文件自查及遠端同步。

## Out of Scope

- 不修改應用程式、正式測試、依賴或鎖定檔，不修復 Bug。
- 不使用正式網站、不讀取正式玩家存檔、不部署、不建立 GitHub Issue。
- 不把直接改寫狀態的測試說成正常遊玩；測試性故障注入與 headless 輔助檢查必須另外標示。

## Acceptance

- [x] 至少 4 個獨立 sub agent 路線完成並保存實際遊玩紀錄。
- [x] 每條路線記錄環境、seed／起始條件、操作、遊戲時間、結果、通過與未執行項目。
- [x] Bug 紀錄有重現步驟、預期／實際、影響、證據與確認狀態；主 Agent 重驗接受的確認 Bug。
- [x] 保存整合報告與分路線紀錄；不強求找出 Bug。
- [x] 程式與依賴未變更，文件檢查通過，本次紀錄提交並同步 work 分支。

## Constraints and Decisions

- 基準 commit：8945fa76343a3efed38b21e4615d269f9ebef529。
- 執行入口：collaboration.spawn_agent，明確指定 model=gpt-6-luna、reasoning_effort=max；根據 docs/SUBAGENTS.md。checkout 沒有 .codex/agents/luna_worker.toml，故使用已存在的 README／SUBAGENTS 委派規範，不能宣稱讀取不存在的 profile。
- 同一 Vite 服務供所有 Agent 使用；各 Agent 不停止服務、不互改檔案、不自行 commit/push。
- 主 Agent 負責正式 Ticket、整合報告與 Git；各 Agent 只寫其指定路線的報告、腳本及證據。

## Dependencies and Blockers

- 已有 Node.js 24.19.0、npm 11.9.0、Chromium、Python Playwright 與 npm 依賴。
- Vite 服務為 http://127.0.0.1:5173/，已取得 Oakvale 首頁。
- 無外部憑證需求；目前無阻塞。

## Evidence

- Verification: 四個 sub agent 的 Playwright UI 路線已完成，詳見 [整合報告](../reports/playtests/20261003/README.md)。生活路線10.56日、冒險路線90日以上且聘傭兵成功、存檔正常與4項注入、世界路線64年及自然死亡繼承；各路線的實際腳本、JSON及截圖均已保存。世界路線完成後由主Agent接手收尾文件，依world-final.json的10項成功斷言驗收。
- Verification: 主Agent額外執行verification.py（鍵盤／倍速／自動保存，exit0）及verify_bugs.py（成功重現PT-001，exit0）；PT-001只在受控損毀存檔注入確認，正常遊玩未確認其他Bug。修復不在本次Scope。
- Review / Audit: L1主Agent自查（參與整合，非獨立Audit）。基準／HEAD為8945fa76343a3efed38b21e4615d269f9ebef529；範圍為本Ticket與reports/playtests/20261003/。已核對實際Python脚本、JSON數據、Markdown連結、PNG完整性及分路線的成功／未跑項目；Standards與本次Spec均符合，未修改應用程式與依賴。主Agent逐一斷言4條路線結果及PT-001資料一致。
- Review / Audit: git diff --check、保護路徑git diff --exit-code通過；新增檔案及staging後git diff --cached --check與提交清單已核對，91個檔案全部限本次Ticket與報告路徑，無Python快取。7份Markdown、6支腳本、25份JSON與52張PNG的連結／語法／格式／完整性均已檢查。只有報告、重現腳本及證據，未建立Audit Report或額外修復Ticket。
- Commit / PR: 報告與證據commit為6bb387db5444f1ad730324e041d353d5f5697ada，已push至origin/work並以git ls-remote確認遠端SHA一致；本次Ticket結案狀態另隨後續文件commit保存。不建立PR，不推送main。

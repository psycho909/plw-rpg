# PLW 專案身份繼承與 GPT-6.1 Sol 規範同步

- Status: accepted
- Owner: 本專案使用者（沿用 README 已確認身份）
- Approver: 本專案使用者（預設同 Owner）
- Approval evidence: 2026-10-02；Owner 在本 Session 明確要求「D:\Codex\plw-rpg 此專案的也一起調整」；依本 Session 已核准的身份繼承與 AGENTS 調整目標界定本 Ticket 文件 Scope，未授權變更產品驗收。
- Risk: L2
- Updated: 2026-10-03
- Branch: main
- Git / Remote authority: 依 README 既有 standing authorization；本次 worker 不執行 Git 交付，由主 Agent 核對。unborn main 及全部產品檔案未追蹤，不因本次文件 Scope 一併發布產品；若無安全文件交付基準，記錄同步阻塞。

## Goal
同步目前已更新的專案 AI 工程規範，讓 Owner／Approver 身份一次確認、Ticket 繼承身份並保存核准依據，同時保留 GPT-6.1 Sol 主 Agent 使用入口、GPT-6 Luna Max 委派策略及既有工程底線。

## Scope
- `AGENTS.md`
- `README.md`
- `tickets/README.md`
- `docs/agents/work-authority.md`
- `docs/governance/ai-governance.md`
- `CHANGELOG.md`
- 本 Ticket

## Out of Scope
不修改 `SPEC.md`、其他產品 Ticket、`src/`、設定或 Agent profile、依賴、遊戲 Acceptance、`TODO.md`、handoff 或其他既有檔案。本次 worker 不操作 stage／commit／push；這是委派分工，不撤銷或變更 README 既有 standing authorization。merge／deploy 不在本次文件 Scope。

## Acceptance
- [x] README 保留已於 2026-10-02 確認的本專案使用者身份；Approver 預設同 Owner；未確認身份只阻塞需要核准的部分，並連結 Ticket 身份繼承規則。
- [x] Ticket Convention 新增身份繼承／核准依據規則及 `Approval evidence` 欄位，明確保留身份快照且不擴張 Scope 或遠端授權。
- [x] `AGENTS.md` 同步精簡 Output style、一次身份讀取與 Ticket 身份指標，並保留 G3、Sol 使用入口、Scope、TDD、驗證及獨立 Audit 底線。
- [x] Work Authority 與治理文件同步身份繼承規則及連結，既有專案權限與治理條款保留。
- [x] CHANGELOG 記錄本次規範變更；文件 diff、相對連結（含新錨點）及 Scope preservation 驗證完成；不執行遊戲檢查。

## Constraints and Decisions
- 本次 Owner 指示直接授權上述 L2 文件 Scope；身份沿用 PLW README，不重問核准。
- 僅使用允許修改路徑；保留其他 Agent 與既有產品內容，不重寫歷史 Ticket。
- 不以文件／設定變更推論模型 runtime 或效能證據。

## Dependencies and Blockers
- None；原先產品驗收／unborn main 阻塞已於 2026-10-03 解除。V1 主 Agent 完成 77 項測試、build、review fallback，建立並推送初始 commit，規範文件隨產品基準完整交付。
## Evidence
- Verification: 四份同步文件對照 `templates/project/` 執行 `git diff --no-index --check`，均 exit 0；新 Ticket 對照 `NUL` 的 `git diff --no-index --check` exit 1（新增檔案差異，無空白錯誤診斷）；直接尾端空白掃描 PASS。PowerShell inline Markdown link checker 檢查 7 份文件，共 42 個連結（39 個相對連結）及 5 個錨點，全部通過；檢查移除 fenced code／HTML comments 後的 inline links，確認本機目標檔案及標題錨點。未執行遊戲檢查。
- Review / Audit: 主 Agent 分開完成 Standards／Spec 檢查：四份規範文件與正式模板 LF／trimEnd 正規化內容一致；README 已確認身份、Git standing authorization、產品正本、損毀存檔保護與模型限制保留；CHANGELOG／本 Ticket 只涉及文件 Scope，沒有應用程式變更。整合重驗 7 份文件、39 個相對連結及 5 個錨點、尾端空白皆 PASS（Node inline checker exit 0）。此為施工主 Agent 的整合 review，不是 Independent Audit；L2 未觸發 L3 稽核。
- Commit / PR: 2026-10-03 由 V1 主 Agent 整合交付，75662ae3b5aa4045976a2844b41c01d4bbcef340 已包含本 Ticket 與全部規範依據；origin/main 與 HEAD 核對一致，原 Git 基準阻塞解除。結案狀態隨後再 commit／push。無 PR／merge；部署由另行授權的 Vercel Ticket 處理。

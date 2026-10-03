# Astra 單機遊戲優化規劃

- Status: in_progress
- Owner: 本專案使用者；沿用 README 已確認身份
- Approver: 同 Owner
- Approval evidence: 2026-10-03 使用者明確要求「使用astra規劃可以優化的地方」。授權本輪分析與規劃文件，未授權執行所提出的行為變更。
- Risk: L1（唯讀分析與規劃文件；候選方案各自標示後續實作風險）
- Updated: 2026-10-03
- Branch: work
- Git / Remote authority: 沿用 README，驗證後 commit/push 本次規劃文件至 work；不推 main、不建立 PR、不部署。

## Goal

由 Astra 根據現有程式、設計正本與已完成遊玩測試，提出有依據、可排程且可驗收的單機遊戲優化計畫。

## Scope

- Astra 唯讀分析遊戲流程、UI/UX、世界演化、Boss、資料保存、效能與測試可維護性。
- 以 docs/design/DESIGN.md、SPEC.md、docs/UI.md 及兩輪完整測試證據為依據，核對實際程式。
- 計畫保存於 docs/plans/20261003-astra-optimization.md；每項列出證據、玩家收益、建議範圍、優先順序、依賴、風險及驗收方式。
- 明確區分已確認事實、尚待量測的假說與新增玩法建議；提供首輪推薦範圍及後續階段。
- 主 Agent 核對證據、連結、規範及單機範圍，提交並同步規劃文件。

## Out of Scope

- 本輪不修改 src、既有測試／報告、SPEC、正式設計契約或依賴。
- 伺服器、帳號、跨裝置同步、檔案防修改／防刪除、部署與外部發布。
- 把已修復的缺陷說成未修復 Bug、把未量測效能假說說成已證實問題。

## Acceptance

- [x] 以明確 gpt-6-astra/max 設定委派，記錄使用者模型覆寫來源與實際產出。
- [x] 計畫涵蓋玩家體驗及工程改善，重要建議都有可核對來源。
- [x] 提供優先順序、首輪建議與階段依賴，每項含可驗證完成條件。
- [x] 區分既有問題／待驗證假說／新玩法提案，遵守單機限制。
- [ ] 主 Agent 文件與證據自查通過，工作內容限本票路徑並同步 work。

## Constraints and Decisions

- 基準 HEAD：4a955ddab91d22aafefc868ffea1cab6bcd4129f。
- 使用者明確指定 Astra，優先於 docs/SUBAGENTS.md 的一般 Luna 預設；配置名稱是委派設定證據，不宣稱取得後端模型遙測。
- Astra 單一擁有者只寫計畫；主 Agent 單一擁有者只寫本 Ticket，負責 Git 與最終驗收。
- 授權規劃與提出建議，不把候選方案當作已核准施工票。
- 工作流採 engineering-workflow-guide 路由；存檔模組介面分析可用 codebase-design，UI/UX 分析依可用 frontend-design 指南。

## Dependencies and Blockers

- 依據為現有本機 Git 追蹤程式與 reports/playtests/20261003-comprehensive、20261003-local-autosave；不需要新依賴或外部服務。
- 無已確認阻塞。

## Evidence

- Verification: [計畫](../docs/plans/20261003-astra-optimization.md)共9項候選，首輪O1→O2→O3，每項具來源、最小範圍與驗收。主 Agent完整閱讀最終文件，核對戰鬥回饋、聘用角色、等待、保存／匯出與多分頁契約；相對來源／行號檢查通過。Astra重新計算既有source-checks的8個指紋均相符；主 Agent確認src、scripts、reports、依賴與正式UI／設計正本無diff。本輪未跑新runtime／全測，不將既有PASS或效能假說當成本輪實測。
- Review / Audit: L1，由主 Agent自查，非獨立Audit。Standards：實際新增計畫與本票均已完整讀取，符合繁中、單一檔案擁有者、文件驗證及Git授權。Spec：9項及首輪3項完成，已區分能力缺口／待驗證／新玩法，維持單機與即時保存、追加、ACK及壞raw保護；未新增施工授權。Astra前次用量中斷已揭露，使用者「繼續」後同一agent接續並交付完整文件，無未解規劃finding。
- Commit / PR: 待交付；不建立 PR。

# 世界優先的黑白復古 UI／UX 重製

- Status: in_progress
- Owner: 本專案使用者，繼承 README 2026-10-02 已確認身份
- Approver: 同 Owner
- Approval evidence: 2026-10-03 使用者「讀取design/DESIGN.md進行UIUX調整」，並允許提出問題與想法
- Risk: L2
- Updated: 2026-10-03
- Branch: work
- Git / Remote authority: README standing authorization，驗證後 commit／push origin/work；不 merge main 或發布正式網站

## Goal
依 docs/design/DESIGN.md 將既有管理介面改為世界優先的繁體中文復古 RPG 介面。

## Scope
世界畫面、HUD、情境互動、角色／背包／日誌／歷史／聚落／威脅視窗、NPC 資訊與資料驅動交談、商店／酒館／農作／採集／戰鬥／地下城、繼任與重建確認、共用像素元件、響應式與鍵盤操作。建立呈現層測試、可重現瀏覽器驗證、UI 契約與證據。

## Out of Scope
不修改 Simulation、存檔 schema、經濟、戰鬥與 NPC 規則；不新增後端、依賴、AI 對話或音效／CRT 系統。不修復前次遊玩紀錄 PT-001 的輸入驗證問題；不偽造逐隻怪物或新增建築碰撞。

## Acceptance
- [x] 正常探索以世界地圖為主，移除固定側欄／數值面板／完整日誌。
- [x] 黑白灰 token、方形硬邊框、可讀繁體中文、原生 Emoji 世界物件與文字標示。
- [x] 現有遊戲活動由所在位置／附近物件啟動，沒有無效按鈕；營業、費用與限制仍沿用引擎。
- [x] 所有詳細資訊使用共用視窗；焦點進入、Tab containment、Esc、還原焦點與重建取消可用。
- [x] WASD／方向鍵、Enter、Esc、C／I／L／M、滑鼠及手機方向控制可用，IME 與文字輸入不觸發快捷鍵。
- [x] 聚落成長、農作、迷霧與威脅透過真實 state 在地圖變化。
- [x] 1440／1280／1024、768 平板、390／320 手機有瀏覽器證據；存檔重載與失敗保護仍可用。
- [ ] npm run check、靜態契約檢查、實際瀏覽器流程與 Standards／Spec review 通過，commit／push 工作分支。

## Constraints and Decisions
- docs/design/DESIGN.md 是使用者此次指定的視覺正本，其 World First 要求取代 SPEC.md 54–58 的舊固定側欄布局；SPEC 的遊戲規則不變。
- 舊 UI 沒有共用元件或 token owner，新增最少必要的 PixelWindow／PixelMeter／StatusNotice 與遊戲內容元件。src/style.scss 是 runtime token owner，docs/UI.md 記錄映射與行為。
- 世界為本機單一畫面，視窗開啟期間暫存選取／篩選，關閉後回預設，不寫入存檔或 URL 路由。時間持續依選定倍率流動；開視窗不偷偷暫停。
- 額外民居、怪物蹤跡是 state 的呈現投影，不建立假的可互動實體。NPC 交談是活動與世界狀態模板，不新增社交狀態或 AI。
- 320×640 的地圖高度約 61%，保留手機方向控制與 HUD；其餘驗證尺寸約 70–79%。Spec reviewer 將其列為已揭露、非阻擋的設計差異。

## Dependencies and Blockers
無。既有 Vite、Vue／Pinia、Vitest、Playwright Python 與 Chromium 可用；無 DOM unit runner，視窗／焦點使用實際瀏覽器驗證。

## Evidence
- Verification: 基準 ec0240bdfc056649f71cb4fd837233690116fb6a，既有 77 項測試；本次最終 `npm run check` exit 0，6 files／90 tests PASS、vue-tsc 與 Vite build PASS。沒有改 engine／domain／data、依賴或存檔版本；service 整數修復另屬 PT-001 Ticket。
- Browser: `python reports/ui/20261003-world-first/verify.py` exit 0，107 項斷言、六尺寸 1440／1280／1024／768／390／320、零 page errors。[結果／source 指紋](../reports/ui/20261003-world-first/artifacts/results.json) 逐檔符合最終程式；manifest JSON sort_keys 整體 SHA-256 `4abb7b0512bd32889c6515559856a8c7b81a3d8c90b585e0e781efd488aca24a`。[完整驗收／截圖](../reports/ui/20261003-world-first/README.md) 區分自然遊玩與 fixtures、V2 限制。
- Additional regression: Astra 依使用者指定處理存檔復原按鈕被訊息遮擋，以及迷霧建築文字洩漏。390／320 × corrupt／throwing／長讀取錯誤六案例全部正常 click PASS；主 Agent 最終流程再驗證復原、PT-001 原文保護與隱藏建築。雲端 onboarding 新版 smoke exit 0。
- Static: 原版 premium `audit_project.py --mode strict` exit 0／0 findings；官方 `@google/design.md designmd lint` 根入口與正本都 exit 0／0 errors、1 warning（無 YAML frontmatter）。`git diff --check`、修改 Markdown 相對檔案連結與 Python 語法檢查 PASS；未配置 ESLint／formatter／DOM unit runner，不宣稱通過。
- Skills: frontend-design-premium:frontend-design＋frontend-design-premium、matt-skills-curated:implement／tdd／code-review，依專案 workflow 適配；使用者明確指定 Astra bug 工作者，其餘獨立 reviewer 使用 README 的 GPT-6 Luna Max。
- Review / Audit: 未參與施工的 ui_standards_review、ui_spec_review，入口明確指定 GPT-6 Luna／max（選用證據，非後端遙測），完成 Standards／Spec 與修正後復查。固定 base＝HEAD `ec0240b...`，先涵蓋 unstaged／cached／untracked 新檔，再核對最後 77 個 staged 檔案及 source 指紋 `4abb7b...`；一般 L2 review。兩者最終均無剩餘 blocker、可接受；沒有自行重跑 suite，以保存的 90 tests／107 browser checks、32 source hashes 與 RED／GREEN artifacts 核對。
- Findings disposition: Spec 的暫存範圍文句已更正，Enter／WASD runtime 補測；Standards 的 M 視窗負 tabindex 格誤納入 Tab 已由 Astra 最小修復且四案例 RED→GREEN、六尺寸最終回歸通過。自動存檔恢復的舊錯誤訊息建議也已修正，unit 保留較新行動訊息，browser 真正自動儲存更新成功提示。
- Final review: 主 Agent 核對 Scope、相對連結、staged diff、全部新檔與最後指紋，runtime 證據符合 Acceptance；剩餘 V2／跨瀏覽器與實機限制見報告。尚待工作分支 commit／push 完成。
- Commit / PR: 尚未提交。

# V1 存檔、離線與整體交付

- Status: accepted
- Owner: 本專案使用者（本對話於 2026-10-02 明確指定）
- Approver: 本專案使用者
- Approval evidence: 2026-10-02 使用者提供 V1 規格並明確要求繼續施工；2026-10-02 確認 Owner／Approver 是我；2026-10-03 再次要求繼續。
- Risk: L2
- Updated: 2026-10-03
- Branch: main
- Git / Remote authority: 同 README；完成與驗證後可 commit／push 至 origin/main，本 Ticket 不授權部署；2026-10-03 使用者另於 Vercel Production Ticket 明確授權。

## Goal
完成 SPEC.md Phase 7、AC-17–20 與全流程驗收，提供可重現啟動入口及 Git 交付。

## Scope
現有 saveService、Pinia store、單一 game loop；manual／auto save、reload、離線上限與摘要、損毀存檔保護；依賴修補、README、TODO、CHANGELOG、Ticket Evidence 與最終 review。

## Out of Scope
雲端存檔、後端、多人連線、部署、付費服務與 API。

## Acceptance
- [x] AC-17：序列化／反序列化保持世界一致，版本／非法存檔被拒絕且原始資料不被自動覆蓋。
- [x] AC-18：離線最多模擬 8 真實小時；處理時間、農作物、NPC、聚落、威脅與契約，呈現摘要。
- [x] AC-20：核心日曆、人物、NPC、農作、戰鬥、聚落、威脅與存檔都有自動測試。
- [x] `npm.cmd run check`（單元測試＋type check＋production build）通過；依賴 audit 無已知待處理問題。
- [x] 實際瀏覽器驗證 New Game → 移動 → 種田／收割 → 戰鬥／EXP → 酒館／傭兵 → 地下城 → 時間／NPC／聚落／威脅 → Save／Reload／Continue。
- [x] Standards／Spec review findings 修正、文件同步、Git diff --check 通過，依授權 commit／push 並核對遠端 SHA。

## Constraints and Decisions
- 種子與 RNG 狀態保存；離線與線上使用同一 simulate(gameMinutes)。
- 測試使用獨立本機瀏覽器工作階段，不覆蓋使用者現有存檔。
- 不把本機測試或 Git push 當作部署。

## Dependencies and Blockers
- Blocked by: None；Core World、Life Adventure 的本機驗證與 review 已完成，Git 同步待交付。

## Evidence
- Verification: npm.cmd ci 已成功（停止 Vite 後解除 Windows esbuild.exe 鎖定），0 vulnerabilities；目前完整 npm.cmd run check：77/77 測試、vue-tsc 與 production build 通過。saveService 27 項、store 4 項、loop 1 項，涵蓋正常／死亡／戰鬥存檔、損毀保留、離線 8 小時上限、契約／作物／年齡與 timer。Vitest 更新至 4.1.11；npm 10 peer graph 安裝錯誤使用一次性 npm 11 install 解決，npm.cmd audit exit 0（0 vulnerabilities）。瀏覽器完成 New Game 至死亡繼承全流程；儲存重載保留人物／裝備／世界，關閉再開顯示 3 遊戲小時離線摘要，console error/warn 為空。
- Review / Audit: HEAD unborn，涵蓋 git diff --cached、git diff 及新檔完整內容。獨立 context v1_review（工具指定 GPT-6 Luna / max，未施工）回報 4 項 P2 存檔邊界及資料驅動缺口；均已 test-first 修正。reviewer 在完整結論前因使用額度中斷；依 docs/agents/review.md L2 fallback，由主 Agent 分開核對 Standards（單一 loop、純 TS domain、共用 RNG、機密忽略、位置／EXP／日程／地城載入契約）與 Spec（AC-01–20、自主世界、全流程瀏覽器、資料表修改可改變 spawn／threat），結果可接受，無已知阻擋產品驗收 finding。fallback 非完整獨立 review。最終 77 tests + type check/build PASS；git whitespace 與相對連結 PASS。
- Skills: matt-skills-curated:implement 1.1.0；準備交付時讀取 code-review。
- Commit / PR: V1 已 commit／push：75662ae3b5aa4045976a2844b41c01d4bbcef340；git ls-remote origin refs/heads/main 與本機 HEAD 一致，當時工作樹乾淨。此文件結案更新依 README 隨後 commit／push；無 PR。網站部署另見 Vercel Production Ticket。

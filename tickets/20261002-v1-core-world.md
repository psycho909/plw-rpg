# V1 世界時間與自主演化

- Status: accepted
- Owner: 本專案使用者（本對話於 2026-10-02 明確指定）
- Approver: 本專案使用者
- Approval evidence: 2026-10-02 使用者提供 V1 規格並明確要求繼續施工；2026-10-02 確認 Owner／Approver 是我；2026-10-03 再次要求繼續。
- Risk: L2
- Updated: 2026-10-03
- Branch: main
- Git / Remote authority: README standing authorization；Owner 確認後，通過驗收的更新可 commit／push 至 origin/main。無部署授權。

## Goal
完成 SPEC.md Phase 1、2、6 的既有實作與自動驗收，證明玩家不操作時世界仍會演化。

## Scope
- src/engine 的時間、RNG、模擬、角色移動、NPC 日程、人口與繼任者。
- 聚落兩次階段成長、威脅／營地、預警／Boss、世界歷史。
- 必要的設定、型別與對應 UI 修正；純 TypeScript headless 測試。

## Out of Scope
SPEC.md 第 60 節全部排除項目、特殊夥伴 Stretch Goal、外部 API、後端、部署與無關重構。

## Acceptance
- [x] AC-01：直接操作限主角；成年 NPC 僅在主角死亡後可接續，世界時間與歷史保留。
- [x] AC-02–05：日／季／年正常進位；NPC 自主移動、工作、休息、升級、衰老、出生／移入與死亡；主角年齡正確。
- [x] AC-11：Simulation 自動完成 Hamlet → Village → Town，新增建築／容量。
- [x] AC-12–15：威脅與營地自然成長；Boss 依威脅累積且在預警後出現；忽略威脅降低聚落指標而不直接 Game Over。
- [x] AC-16、19：重大事件保存歷史；domain／engine 不依賴 Vue、DOM 或 Emoji。
- [x] 1／10／50 年 headless 檢查有限數值、人口受限且不必然歸零、死亡者不工作、狀態可序列化。

## Constraints and Decisions
- 產品授權來源：本對話附上的 V1 規格與「繼續，並且閱讀 AGENTS.md」。不擴大既有 Scope。
- 單一主 Agent 施工；L2 準備交付時依 docs/agents/review.md 取得獨立 review。
- 沿用資料表與現有測試 runner；新增行為修正先寫失敗測試，再修正。
- 本次承接的程式已先於新工程規範建立；既有程式補測是 baseline 驗證，不宣稱為 TDD。

## Dependencies and Blockers
- Blocked by: None；Owner 已於本對話確認。
- Approval: 使用者於本對話提供 V1 規格、要求繼續，並確認「Owner／Approver 是我」。

## Evidence
- Verification: 28 項 simulation 測試通過：固定種子／分批一致、日季年、NPC 日程／技能／人口／老死、繼承位置、兩次聚落進化、威脅預警與 Boss；1／10／50 年 headless 數值有限、人口有界且狀態可往返存檔。瀏覽器從第 1 年推進至第 4 年，聚落自然成為城鎮；主角戰死後繼承米拉 1，年齡 21，保留第 4 年與原主角死亡歷史。
- Review / Audit: HEAD unborn，涵蓋 git diff --cached、git diff 及新檔完整內容。獨立 context v1_review（工具指定 GPT-6 Luna / max，未施工）回報 4 項 P2 存檔邊界及資料驅動缺口；均已 test-first 修正。reviewer 在完整結論前因使用額度中斷；依 docs/agents/review.md L2 fallback，由主 Agent 分開核對 Standards（單一 loop、純 TS domain、共用 RNG、機密忽略、位置／EXP／日程／地城載入契約）與 Spec（AC-01–20、自主世界、全流程瀏覽器、資料表修改可改變 spawn／threat），結果可接受，無已知阻擋產品驗收 finding。fallback 非完整獨立 review。最終 77 tests + type check/build PASS；git whitespace 與相對連結 PASS。
- Skills: matt-skills-curated:implement、matt-skills-curated:to-tickets，1.1.0；流程依 docs/agents/skill-workflows.md 適配至 tickets/ 正本，無外部 tracker。
- Commit / PR: V1 已 commit／push：75662ae3b5aa4045976a2844b41c01d4bbcef340；git ls-remote origin refs/heads/main 與本機 HEAD 一致，當時工作樹乾淨。此文件結案更新依 README 隨後 commit／push；無 PR。網站部署另見 Vercel Production Ticket。

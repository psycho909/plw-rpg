# V1 生活與冒險

- Status: accepted
- Owner: 本專案使用者（本對話於 2026-10-02 明確指定）
- Approver: 本專案使用者
- Approval evidence: 2026-10-02 使用者提供 V1 規格並明確要求繼續施工；2026-10-02 確認 Owner／Approver 是我；2026-10-03 再次要求繼續。
- Risk: L2
- Updated: 2026-10-03
- Branch: main
- Git / Remote authority: 同 README；完成與驗證後可 commit／push 至 origin/main，無部署授權。

## Goal
完成 SPEC.md Phase 3–5；玩家可走到各區域生活、交易與冒險。

## Scope
現有 farming、gathering、inventory、economy、equipment、combat、exploration、dungeon、tavern、party 與 Vue UI；相應單元測試與瀏覽器操作。

## Out of Scope
大型 RPG、AI API、後端、特殊夥伴、技能樹、額外內容與重做 UI 架構。

## Acceptance
- [x] AC-06：整地 → 播種 → 時間成熟 → 收割；採礦、伐木可取得資源與技能經驗。
- [x] AC-07：探索／戰鬥可提升角色與技能；武器／防具有效；攻擊、防禦、藥水與逃跑正常。
- [x] AC-08：迷霧探索後發現廢棄礦坑；普通、精英、Boss 戰與掉落可完成。
- [x] AC-09–10：酒館於營業時間可聘請傭兵，最多 Player + 2；日薪與契約到期受世界時間控制。
- [x] 商店受位置、營業時間、金錢與聚落等級約束；不得出售最後一件已裝備物品。
- [x] 桌面與窄螢幕操作可用；鍵盤移動、方向按鈕、點地圖步行皆只移動主角；NPC 狀態可查看。

## Constraints and Decisions
- 沿用 SPEC.md 技術棧與既有實作；不加入新功能庫。
- 依原始 V1 授權施工，Granularity 為既有程式的完成與驗收單位。

## Dependencies and Blockers
- Blocked by: [V1 Core World](20261002-v1-core-world.md) 的時間／人物核心驗證。

## Evidence
- Verification: 17 項 actions 測試通過：農作全流程、採集技能、交易／裝備、戰鬥操作／掉落、死亡／逃跑、地下城、傭兵上限／日薪／到期／自主戰鬥。實際瀏覽器完成種田收割、伐木採礦、商店交易、裝備、18 時酒館聘僱、地下城三戰與升至 Lv.5；NPC 自主走動／活動可見。390px 窄螢幕文件寬 375px，無頁面水平溢出，方向按鈕及鍵盤操作可用。
- Review / Audit: HEAD unborn，涵蓋 git diff --cached、git diff 及新檔完整內容。獨立 context v1_review（工具指定 GPT-6 Luna / max，未施工）回報 4 項 P2 存檔邊界及資料驅動缺口；均已 test-first 修正。reviewer 在完整結論前因使用額度中斷；依 docs/agents/review.md L2 fallback，由主 Agent 分開核對 Standards（單一 loop、純 TS domain、共用 RNG、機密忽略、位置／EXP／日程／地城載入契約）與 Spec（AC-01–20、自主世界、全流程瀏覽器、資料表修改可改變 spawn／threat），結果可接受，無已知阻擋產品驗收 finding。fallback 非完整獨立 review。最終 77 tests + type check/build PASS；git whitespace 與相對連結 PASS。
- Skills: matt-skills-curated:implement 1.1.0；frontend-design 已於初次施工使用。
- Commit / PR: V1 已 commit／push：75662ae3b5aa4045976a2844b41c01d4bbcef340；git ls-remote origin refs/heads/main 與本機 HEAD 一致，當時工作樹乾淨。此文件結案更新依 README 隨後 commit／push；無 PR。網站部署另見 Vercel Production Ticket。

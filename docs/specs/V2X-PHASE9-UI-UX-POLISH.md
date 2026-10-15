# Oakvale V2.x — Phase8 Owner Approval & Phase9 UI/UX Polish

> Owner 於 2026-10-15 在 Session 中提供之正式規格，原文保存。

## 0. Owner 正式授權

我以 Oakvale 專案 Owner／Approver 身分，正式接受 Phase8 Engineering Delivery：

**PASS WITH FINDINGS**

授權：

1. 核對 Phase8 最終交付、獨立 Review 與 Git 遠端紀錄。
2. 依現有 L3 治理規則，記錄 Owner Approval 並完成必要結案。
3. 保留所有未解 Product Findings、證據限制與歷史失敗。
4. 正式啟動 **Phase9 — UI/UX Polish**。
5. 授權 Phase9 範圍內的 UI／UX 實作、測試、Review，以及依 README／Ticket 規則在目前工作分支 commit／push。

不授權 PR、merge、production deploy、修改 main、Phase10 或 V3。

Phase8 Human Product Gate 仍為 `DEFERRED`，不宣告 V2 Product Gate 通過。

---

# 1. 核心任務

本輪只執行：

**Phase9 — UI/UX Polish**

Phase0～8 已建立完整的 Adventure、Life、Crafting、NPC、World、Regional Crisis 及 Content 系統。

Phase9 的任務是：

> 讓玩家更容易理解世界、形成目標、完成操作，並清楚看見自己行為造成的結果。

核心目標：

- World First
- Minimal Friction
- Clear Feedback
- Meaningful Choices
- PC / Mobile Friendly
- Retro Black & White RPG

**不重新設計遊戲核心，不增加大型功能，不改變產品方向。**

---

# 2. 開工前檢查

先閱讀目前相關版本：

- `AGENTS.md`
- `docs/agents/agent-routing.md`
- `docs/SUBAGENTS.md`
- `docs/agents/review.md`
- `docs/UI.md`
- V2.x 正式規格
- Phase7 / Phase8 Final Reviews
- Phase8 `balance-findings.md`
- Phase8 `reward-pacing.md`
- Phase8 `boss-progression.md`
- Phase8 `life-progression.md`
- Phase8 `agent-role-playtests.md`
- 現有 Vue Components、Pinia Stores、SCSS、PixelWindow 與操作流程

Phase8 交付參考 Commit：

`53dbec2fe37e5d81fa2415fadbfe922f653b7540`

開始施工前核對實際：

`Branch / HEAD / Working Tree / Source Fingerprint / Test Baseline`

建立 Phase9 Parent Ticket 與必要的子 Ticket。

不要新增另一套文件管理、Agent Routing 或 QA Framework。

---

# 3. 優先處理的 Phase8 Findings

## P9-01 — 玩家不知道下一步該做什麼

Phase8 測量到大量 no-progress actions。

其中有 Runner 策略問題，也有尚未驗證的 Goal Clarity 問題。

不能把這些結果直接推論為真人玩家覺得無聊。

本輪要改善：

- 玩家目前有哪些可行動作？
- 下一個值得追求的目標是什麼？
- 哪些目標尚未解鎖？
- 缺少什麼條件？
- 可以去哪裡取得資源或線索？
- 最近的世界變化與自己有什麼關係？

### 設計方向

可以利用現有 World State、Character、Equipment、Recipe、NPC、Threat 與 World History，提供少量情境式提示。

例如：

- 目前有尚未探索的區域。
- 某種怪物可能提供所需素材。
- 工作台有一個尚未完成的配方。
- 某項技能接近解鎖條件。
- 聚落面臨物資短缺。
- 某個 Boss 已具備挑戰資格。

所有提示都必須根據實際資料。

**不得新增每日任務、固定待辦清單、強制主線或假任務。**

不要把玩家的自由人生變成「照著 UI 指示完成工作」。

---

## P9-02 — Boss 風險與準備資訊不足

Phase8 確認 Boss Rank 與 Eligibility Reasons 已經可見，但明確的危險程度與準備資訊仍不足。

改善方向：

- 清楚呈現 Boss Rank。
- 顯示可挑戰或尚未解鎖的原因。
- 顯示已知技能／特性。
- 顯示玩家已知的戰利品情報。
- 讓玩家在進入戰鬥前理解是否存在重大風險。
- 說明撤退、冷卻等既有規則。

如果現有 Combat Model 沒有可靠的建議等級或危險估算公式，不得自行發明數值。

可以提供基於已知資訊的定性提示，例如「危險」、「情報不足」、「已知具有護甲能力」，但每項提示都必須有真實資料依據。

不新增 Combat Power Rating System。

---

## P9-03 — Crafting 重複操作與成長資訊

Phase8 Life Route 曾觀察到 676 次製作中，有 670 次 Starter Spear 製作未獲得 XP。

這是操作及成長回饋的風險訊號，不等於真人玩家一定會反覆製作。

本輪不直接修改 Smithing XP 公式。

優先改善：

- 當前 Smithing Level / XP。
- 下一階段能解鎖的配方。
- 配方的技能需求。
- 所需素材與目前持有量。
- 素材的已知取得方式。
- 本次製作是否還能取得 XP。
- 成品可能的品質與素材影響。
- 製作完成後能否快速比較／裝備／出售。

### 特別要求

如果製作不再提供 XP，必須清楚顯示。

例如：

「此配方已無法提供鍛造熟練度。」

不得讓玩家誤以為製作仍能持續提升能力。

如果暫時沒有可製作的進階配方，應說明目前已知的阻礙，而不是只顯示 Disabled Button。

---

## P9-04 — 大量 Item／Monster 的資訊架構

Phase7 已新增：

- 66 種怪物
- 107 種物品
- 24 種配方
- 多種作物與生態

需要檢查：

- Inventory
- Equipment Compare
- Crafting Recipes
- Material Sources
- Monster Collection
- Boss Discovery
- World Rumors
- History
- Crisis Information

避免資訊變多後，玩家找不到自己需要的內容。

優先使用既有 UI 元件實現必要的：

- 分類
- 搜尋
- 篩選
- 排序
- 已發現／未發現狀態
- 相關用途與來源提示

不需要每個視窗都增加上述所有功能。

必須依真實操作需求選擇。

禁止為了 UI 完整性而建立大型百科、任務系統或第二套 Collection Database。

---

## P9-05 — 世界事件與行動回饋

Oakvale 的核心是 Persistent Living World。

玩家需要理解：

**我的行動造成了什麼？世界又發生了什麼？**

檢查：

- 採集成功與資源變化。
- 製作結果與技能進展。
- Combat Reward。
- Boss Defeat。
- NPC 狀態變化。
- Regional Crisis 準備與結果。
- Settlement 發展。
- Reputation / Identity。
- Property / Ownership。
- World History。

改善完成動作後的回饋方式。

但不要把每個事件都做成 Modal。

優先使用：

- 短訊息
- 狀態變化
- 必要時的詳細資訊
- 可查看的歷史紀錄

維持資訊層級，避免通知疲勞。

---

# 4. UI / UX 設計原則

## 4.1 保留既有視覺身份

Oakvale 目前是：

**黑白、復古、文字導向的 RPG。**

不得自行將其改成：

- 現代 MMORPG Dashboard
- 大量彩色 Card UI
- 手遊商城介面
- 複雜技能樹面板
- 大型全螢幕 HUD

只針對既有設計改善：

- Typography
- Hierarchy
- Spacing
- Contrast
- Interaction States
- Information Density
- Modal Layout
- Responsive Behavior

不需要新增圖片素材或大型 UI Framework。

## 4.2 World First

世界地圖仍是主要操作場景。

UI 應協助玩家理解世界，而不是長時間把玩家困在層層選單裡。

重要操作應盡量減少不必要的視窗切換。

不要為了追求最少點擊數，反而讓畫面充滿按鈕。

## 4.3 Progressive Disclosure

第一次看到的資訊要簡單。

需要更多細節時才展開。

例如：

怪物清單先顯示名稱、Rank、狀態。

進入詳情後才呈現能力、掉落、條件與歷史。

## 4.4 不隱藏必要規則

以下資訊若影響決策，應能在適當位置看到：

- 操作成本
- 金幣
- 體力
- 所需時間
- 材料不足
- 技能需求
- 無法執行的理由
- 已知風險

不能只有 Disabled 按鈕卻沒有原因。

---

# 5. PC / Mobile Responsive

沿用現有專案的 Vue 3、TypeScript、Pinia、SCSS 與 Responsive 規則。

檢查具有代表性的視窗寬度：

- 320px
- 375px
- 768px
- 1280px
- 1920px

這些是測試取樣，不代表必須新建五套版型。

重點：

- 文字不截斷必要資訊。
- Button 與互動區域可正常操作。
- Modal 不超出可視範圍。
- 可捲動內容不被底部操作區遮蔽。
- Mobile 沒有必須 Hover 才能使用的關鍵功能。
- Inventory / Recipe / Monster List 不造成嚴重效能下降。
- PC Keyboard 與 Mobile Touch 具有等價的重要操作能力。

不得為了 Mobile 重建第二套遊戲邏輯。

---

# 6. Keyboard / Modal / Accessibility

特別檢查現有 PixelWindow 與 Dialog 行為。

必須驗證：

- Tab 導覽順序。
- Focus Indicator。
- Enter / Space 觸發。
- Esc 關閉。
- 開啟 Modal 後的 Focus 管理。
- 關閉後 Focus 恢復。
- 避免 Modal 背後的按鈕被使用者誤操作。
- 多層視窗時，最上層視窗具有正確操作優先權。
- 必要時限制背景互動。
- 可捲動清單的 Keyboard Navigation。

Phase8 曾發現 Browser Runner 座標點擊造成穿透 Overlay 的測試問題。

本輪要區分：

1. Runner 座標／Locator 錯誤。
2. 真正的 UI Hit Testing / Modal 問題。

有可重現證據才修改遊戲 UI；Runner 缺陷不應冒充產品 Bug。

---

# 7. 實作階段

建議按以下六個階段進行。

## Phase9-A — UX Baseline & Flow Audit

先不要大規模改動 UI。

使用正常 fresh-save 操作，檢查：

- Life Route
- Adventure Route
- Hybrid Route
- Crafting
- Boss Preparation
- Regional Crisis
- Succession

記錄主要問題、實際操作路徑、重複步驟與阻礙。

優先找出真正的使用問題，而不是單純列出所有可美化的地方。

產出 `ux-baseline.md`。

## Phase9-B — Goal & Information Architecture

優先改善：

- 當前可行動作
- 下一步目標
- 解鎖條件
- 世界需求
- Boss 風險
- 素材來源

使用既有 State Projection，不複製 Domain Rules。

## Phase9-C — Gameplay Interaction Polish

改善：

- Inventory
- Compare
- Crafting
- Monster Information
- Crisis Contribution
- World History

聚焦於減少不必要的視窗切換、資訊混亂與操作阻礙。

## Phase9-D — Responsive & Accessibility

改善：

- PC / Mobile
- Keyboard
- Touch
- Modal
- Scroll
- Focus
- Input Feedback

不改核心 Game Loop。

## Phase9-E — Visual Consistency & Feedback

統一：

- Typography
- Spacing
- Window Layout
- Button States
- Information Hierarchy
- Status / Feedback
- Retro Presentation

只做符合既有風格的視覺優化。

## Phase9-F — Full QA & Independent Review

執行完整驗證、瀏覽器測試、效能檢查及獨立審查。

每個子階段通過局部驗收後，才進入下一階段。

---

# 8. Scope Control

本輪禁止：

- 新增 Monster / Boss Family
- 新增大型 Crafting System
- 新增 Quest System
- 調整 Threat V0 公式
- 重新調整 Farming V4 成長公式
- 改變 Combat / Loot 核心平衡
- 新增 Economy Engine
- 新增離線收益
- 新增多人生態
- 重新設計 Save Schema
- 新增大型 UI Framework
- V3 任何功能

Phase8 的 High Product Finding：

**Threat Level 3 長期飽和**

已依 Owner 決策 `KEEP V0`。

Phase9 只能改善既有威脅資訊的呈現，不能擅自修改 Threat Growth 或 Guard Recovery。

Merchant Stock / Restock `NOT MODELED` 也不能因 UI 優化就宣稱已解決。

若發現真正阻礙介面使用的 Domain Bug，可以提出最小必要修正，依現有 Ticket／風險規則處理。

---

# 9. QA 與驗收

## 9.1 Automated Regression

至少執行：

- Full Regression
- Typecheck
- Production Build
- UI Component Tests
- State Projection Tests
- Keyboard / Focus / Modal Tests
- Responsive Smoke
- Save / Reload
- Existing V1 / V2 / Phase0–8 Regression

Phase8 最終基準為 631 項測試，但實際數量以當前 Source 為準。

## 9.2 Browser Normal Flows

使用 production build 執行真 Browser 測試。

至少完成：

**Life**

`Gather → Craft → Compare / Use → Skill Feedback`

不得強制進入戰鬥。

**Adventure**

`Explore → Encounter → Combat → Loot → Compare → Next Goal`

**Hybrid**

`Adventure Material → Craft → Equipment → Adventure`

**Crisis**

`Warning → Preparation → Contribution / Choice → Outcome`

**General**

`Open / Close Modal → Keyboard / Touch → Save / Reload`

正常流程使用可見 UI，不得注入遊戲狀態。

若某情境不容易自然觸發，可使用受控 Fixture 補測，但不得混稱正常遊玩。

## 9.3 Performance

先執行：

**20～30 分鐘 Integrated Browser Stress**

檢查：

- DOM
- Listeners
- Heap
- Input Responsiveness
- Modal Lifecycle
- Long Lists
- Save / Reload
- IndexedDB Errors

只有實際證據顯示 Regression，或修改高風險 Renderer / Persistence Lifecycle，才延長到 60／120 分鐘。

## 9.4 Storage 與 QA Artifacts

考量專案之前曾累積約 6GB 的開發／QA 資料：

- 優先重用現有 Runner。
- 不為 Phase9 重建大型測試系統。
- Raw Artifacts 優先使用有界紀錄與無損壓縮。
- 必須保留原始失敗的必要證據與 Checksum。
- 不重複永久保存可重建的龐大暫存。
- 不擅自改寫 Git History。

## 9.5 Human Gate

所有 Automated / Agent 測試只可證明工程與操作可行性。

不可聲稱：

- 玩家覺得有趣。
- 玩家一定理解下一步。
- 玩家願意持續遊玩。
- 遊戲具有合格 Retention。

Human Product Gate 仍為：

`DEFERRED / NOT APPLICABLE AT THIS STAGE`

---

# 10. Agent Routing

遵守專案現有 `AGENTS.md` 與 Routing Policy。

- Luna Low：UI 探索、資料收集、Browser Runner、測試執行。
- Luna Medium：一般 Vue / SCSS / UI 修正、一般測試、一般 Bug Fix。
- Luna Max：複雜 State Projection、Renderer Lifecycle、Save／Determinism 風險、深度 Review。
- Main Orchestrator：產品 Scope、資訊架構決策、整合與最終 Gate。

根據實際工具能力選擇最低可可靠完成的角色。

不要固定 Low → Medium → Max 升級。

每個共享 UI 檔案同一時間只有一位施工 Owner。

模型名稱及 Effort 必須區分 Requested / Observed，不能用 Session 名稱冒充後端模型身份。

---

# 11. Phase9 Acceptance Gates

最終分別判定：

| Gate | 驗收重點 |
|---|---|
| Engineering | Regression / Build / Save |
| Goal Clarity | 可行動作與條件資訊正確 |
| Information Architecture | 重要資訊容易查找 |
| Adventure UX | 戰鬥風險、獎勵、下一挑戰清楚 |
| Life / Craft UX | 材料、技能、配方、成本與結果清楚 |
| World Feedback | 玩家能觀察世界與行動變化 |
| Interaction | Modal / Keyboard / Touch 正常 |
| Responsive | PC / Mobile 沒有阻擋級問題 |
| Visual Consistency | 符合既有黑白復古風格 |
| Performance | 長清單與視窗操作沒有明顯 Regression |
| Human Product | DEFERRED |

判定：

`PASS / PASS WITH FINDINGS / FAIL`

沒有真人資料就不能宣告主觀 Goal Clarity / Fun 通過；工程 Gate 可依 UI 資訊正確性與操作證據判定。

---

# 12. Definition of Done

Phase9 完成必須證明：

1. 玩家可以透過既有 UI 找到目前可行動作。
2. 無法執行的操作有清楚且真實的原因。
3. Boss 風險與挑戰資格不再只有模糊資訊。
4. 製作配方、材料缺口與 XP 狀態易於理解。
5. Inventory / Monster / Recipe 清單具有合理的操作效率。
6. 主要視窗不會發生阻擋級 Modal / Focus / Keyboard 問題。
7. Mobile 的核心功能可以正常使用。
8. 重要行動完成後有清楚回饋。
9. 玩家能觀察 World / NPC / Crisis 的有意義變化。
10. 不新增 Daily Quest 或強制目標。
11. 不破壞 Adventure / Life / Hybrid 自由選擇。
12. 不擅自修改 Phase8 已核定的 Balance Decision。
13. Save / Reload / Migration / Succession 保持正確。
14. 沒有未解 P0／P1 工程阻擋缺陷。
15. 所有完成宣告具有可追溯證據。

---

# 13. 最終交付

至少提供：

- `ux-baseline.md`
- `goal-information-architecture.md`
- `adventure-ux.md`
- `life-crafting-ux.md`
- `world-feedback.md`
- `interaction-accessibility.md`
- `responsive-visual-review.md`
- `browser-regression.md`
- `browser-stress.md`
- `performance.md`
- `bugs.md`
- `ux-findings.md`
- `final-review.md`

沿用專案既有報告結構，不建立重複報告框架。

Final Review 必須回答：

**Q1.** 玩家是否能知道目前有哪些實際可做的事情？

**Q2.** 玩家是否能理解 Boss 的風險與挑戰條件？

**Q3.** Crafting 是否清楚呈現技能、素材、配方與獲得的結果？

**Q4.** 大量怪物與裝備內容是否仍容易查找、理解與比較？

**Q5.** 世界事件、NPC 與危機是否能讓玩家觀察到變化？

**Q6.** PC、Mobile、Keyboard 與 Modal 是否具有可靠的操作體驗？

**Q7.** 是否因改善便利性而犧牲 Oakvale 的自由探索與世界沉浸感？

所有回答必須區分工程證據與尚未取得的真人感受。

---

# 14. Review / Git / Stop

Phase9 完成後：

1. 依現有 Review Contract 完成必要獨立審查。
2. 修復阻擋級 Engineering Findings。
3. 保留 Product Findings 與歷史 Evidence。
4. 完成 Source Fingerprint / Build Correlation。
5. 依現有授權在工作分支 commit／push，並核對遠端。
6. 提交 Phase9 Final Engineering Review。
7. 停止並等待 Owner 審閱。

**不得自動開始 Phase10、Claude 外部最終 Review、正式部署或 V3。**

---

## Final Product Principle

Phase7：

**Expand the world's possibilities.**

Phase8：

**Make those possibilities worth pursuing.**

Phase9：

**Make those possibilities understandable and enjoyable to interact with.**

Oakvale 不需要更多選單。

Oakvale 需要讓玩家透過簡單的操作，更清楚地感受到：

> 世界正在發生什麼、我能做什麼，以及我的選擇讓世界產生了什麼變化。

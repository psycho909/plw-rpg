# Oakvale V2.x — Phase9 Owner Approval & Phase10 Final QA / Release Candidate

> Owner 於 2026-10-16 在 Session 中提供之正式規格，原文保存。

## 0. Owner 正式授權

我以 Oakvale 專案 Owner／Approver 身分，正式審閱並接受 Phase9 Engineering Delivery：

**PASS WITH FINDINGS**

授權：

1. 核對 Phase9 最新 Final Review、Independent Max Review、Follow-up、Ticket 與 Git 遠端交付證據。
2. 依既有 L3 治理規則記錄 Owner Approval，保留全部 Findings 與 Evidence Limitations。
3. 正式啟動 **Phase10 — Final Reward / Retention QA & Release Candidate Preparation**。
4. 授權本輪必要的整合測試、工程缺陷修復、最小必要 UX 修正、內部獨立 Review、文件整理，以及目前工作分支上的正常 commit／push。
5. 完成 Phase10 後停止，提交最終工程驗收與外部 Code Review Handoff，等待 Owner 決策。

**不授權：**

- 開始 V3 或新的大型開發 Phase。
- 新增未經核准的遊戲系統。
- 擅自修改已核定的遊戲平衡決策。
- PR、merge、修改 `main`、production deploy、force push。
- 自動執行 Claude Opus 5.5 的最終外部 Code Review。
- 未經真人遊玩就宣稱 V2 Product Gate 通過。

Human Product Gate 與 Engineering Gate 必須分開管理。

---

# 1. Phase10 任務定位

Phase10 是 Oakvale V2.x 最後一個正式工程開發與驗收階段。

Phase0～9 已建立：

- Persistent Living World
- Player Life / Succession
- Autonomous NPC / Settlement
- Adventure / Combat / Boss
- Procedural Equipment / Loot
- Crafting / Smithing / Masterpiece
- Regional Crisis / Civil Defense
- Monster / Item Content Expansion
- Balance & Progression
- UI/UX Polish

Phase10 不以增加內容或功能為目標。

**核心任務：確認這些既有系統能夠長時間、跨存檔、跨角色與跨世界事件正確協作，並為 V2.x Release Candidate 建立可信賴的工程證據。**

最終必須回答：

> Oakvale 是否已具備穩定、完整、可持續遊玩的 V2.x 工程基礎？

同時回答：

> 哪些 Reward、Progression、Goal Clarity 與 Retention 問題仍需要真人遊玩才能判定？

注意：工程穩定不等於遊戲有趣。

---

# 2. 開工前必要檢查

遵守現有：

- `AGENTS.md`
- `docs/agents/agent-routing.md`
- `docs/SUBAGENTS.md`
- `docs/agents/review.md`
- `docs/governance/ai-governance.md`
- V2.x 正式規格與 Phase0～9 Tickets
- Phase7、Phase8、Phase9 Final Reviews
- Phase8 `balance-findings.md`
- Phase9 `ux-findings.md`
- 現有 QA Runner、Browser Tests、Simulation、Save / Migration Tests

Phase9 最終受測 Source 參考：

`c0a377b50e09b67664bc07b65d4e81a382daa53f`

Phase9 Engineering Baseline：

`650 tests / 41 files + Typecheck + Build PASS`

以上只是歷史參考。

開始工作前必須重新確認：

- 目前 Branch / HEAD / Remote
- Working Tree
- 未提交修改
- Source Fingerprint
- 已接受的工程與產品 Findings
- 目前 Regression Baseline
- 最新 Phase9 Owner Approval / Ticket State

建立 Phase10 Parent Ticket，沿用現有 Work Authority 與 Evidence 流程。

不得為最後一個 Phase 另外建立一套管理框架。

---

# 3. 最重要的工程原則

本輪採取：

**Feature Freeze → Risk-Based Verification → Minimal Fix → Regression → Final Review**

不再使用：

`發現可改善的地方 → 新增功能 → 再做大型測試`

### 變更優先級

**P0 / P1：**

- 遊戲無法正常進行
- 存檔損壞或資料遺失
- Determinism 破壞
- 世界無法繼續演化
- 必要操作無法完成
- 嚴重資源洩漏
- 可重現的重大規則錯誤

必須優先修復。

**P2：**

具有明確影響的操作、流程與相容性問題。

依風險及修復成本決定是否在 Phase10 修正；若影響 Release Candidate 的核心體驗或資料安全，不能僅為了結案而延後。

**P3 / Product Findings：**

可以記錄並延後，但必須清楚標明原因及未來負責者。

禁止為了讓全部 Gate 都顯示 PASS 而隱藏未解問題。

---

# 4. Phase9 遺留問題追蹤

以下項目必須納入 Phase10 的 Final Risk Register。

## P10-F01 — Hybrid Natural Progression

Phase9 的受控 Hybrid 流程已證明 UI 與製作／裝備整合可運作。

但 Fresh Save 自然路線未在限定時間內取得所需材料及進度。

Phase10 應至少進行一組具明確目標、合法操作、正常資源取得的 Hybrid 探索：

`Explore → Encounter → Loot / Material → Meet Requirements → Craft → Equip → Adventure`

記錄：

- 正常起始狀態
- 玩家可見的材料來源
- 合法取得路線
- 角色技能與工作台條件
- 實際所需時間／行動
- 阻擋點
- 成功與否
- 為什麼沒有完成

如果合理測試窗口內無法完成，回報：

`NOT ESTABLISHED — NORMAL PROGRESSION`

再使用受控 Fixture 驗證技術正確性。

不得以 Fixture 成功冒充正常遊玩完成。

只有找到可重現的實際規則缺陷，才進行最小必要修正。

## P10-F02 — Crafting Zero-XP Chore Risk

Phase8 發現大量 Starter Spear 零 XP 製作。

Phase9 已改善 XP Cap 與下一配方資訊。

Phase10 應驗證：

- 正常角色能否理解已達 XP Cap。
- 是否仍有可行的其他技能成長方向。
- 材料與進階配方的可達性。
- UI 是否正確呈現可執行與阻擋原因。
- 是否存在可重現的無效重複流程。

若沒有證據證明遊戲規則存在錯誤，不擅自修改 XP 公式。

實際玩家是否認為製作乏味，保留 Human Product Gate。

## P10-F03 — Threat Saturation

Phase8 的 D-F1 顯示 Threat Level 3 長期飽和。

既有 Owner Decision：

**KEEP V0**

Phase10 必須保留此決策，確認世界仍能運作、危機能結算、NPC 能自治、聚落能恢復。

不得為了改善 Simulation 指標而修改 Threat Growth／Guard 公式。

除非發現新的阻擋級缺陷並取得必要授權，否則作為已知 Product Finding 移交。

## P10-F04 — Merchant Economy

Merchant Stock / Restock 仍為：

`NOT MODELED`

Phase10 可確認既有交易、物品保存與金額結算沒有資料完整性錯誤。

但不得新增 Merchant Economy Engine，也不得宣稱完整市場循環已驗證。

## P10-F05 — Human Goal / Fun / Retention

Phase8 與 Phase9 的自動化測試已改善工程可觀測性。

仍不能證明：

- 玩家覺得有趣
- 玩家知道自己接下來想做什麼
- 玩家對 NPC 產生情感
- 玩家認為行動具有意義
- 玩家願意持續遊玩

這些必須保留為真正的 Human Product Validation。

---

# 5. Phase10-A — Final Baseline & Feature Freeze

先確認 Phase0～9 的交付是否完整一致。

核對：

- 完成的正式 Spec
- Engine / Domain Contracts
- Monster / Item Registries
- Content Validator
- Combat / Loot / Crafting
- Life / NPC / Crisis
- Save / Migration / Succession
- UI / Browser
- 所有尚未關閉的重大 Findings

### Baseline 驗證

執行：

`npm run check`

並記錄：

- Tests
- Typecheck
- Build
- Source Fingerprint
- Build Fingerprint
- Git Diff
- Test Environment

不得將歷史的 650 項測試當成當前測試通過。

### Feature Freeze

Phase10 原則上不接受新 Feature。

只有修復有具體證據的缺陷，才可以修改產品 Source。

產出：

`phase10-baseline.md`

與：

`final-risk-register.md`

---

# 6. Phase10-B — Cross-System Integration QA

這是 Phase10 最重要的工程任務。

不再只驗證單獨的 Combat、Craft 或 Crisis。

必須檢查不同系統交會時是否有錯誤。

## 6.1 Adventure Loop

驗證：

`Explore → Encounter → Combat → Loot → Compare → Equip → Save → Reload`

包含：

- 正常怪物
- Elite
- Mini Boss
- Boss
- Retreat
- Cooldown
- Unique Loot
- Loot Provenance
- Equipment Affix / Rarity

針對代表性 Family 與高風險交界測試，不要求人工逐一跑完全部怪物。

## 6.2 Life Loop

驗證：

`Gather → Farm → Craft → Sell / Use → Skill → Ownership`

包含：

- 素材扣除
- 金幣扣除
- Craft XP
- XP Cap
- Masterpiece
- Equipment Creation
- Crop Growth
- Supply Contribution
- Storage
- Save / Reload

## 6.3 Hybrid Loop

驗證冒險獲得的材料，是否真的能進入生活製作並回饋冒險。

至少保留：

- Normal Fresh-save Attempt
- Controlled Integration Fixture

兩者必須分開計算。

## 6.4 Crisis Loop

驗證：

`Warning → Preparation → Active → Contribution / Combat → Resolution → Aftermath → Recovery`

包含：

- Life Contribution
- Adventure Intervention
- NPC Autonomous Behavior
- World Consequences
- History
- Reputation
- Recovery
- Save / Reload

玩家沒有介入時，世界也必須能繼續進行。

## 6.5 Life / Death / Succession

驗證：

- 角色死亡
- 選擇接班者
- 新角色初始狀態
- 舊角色歷史保存
- NPC 記憶與關係
- 產業／資產權利依既有規則轉移或保留
- 世界時間不重置
- RNG 不重新初始化
- 重新載入後可繼續

優先使用既有測試能力，不重新實作整套 Simulation。

---

# 7. Phase10-C — Reward & Retention Engineering Audit

本階段只分析可以被工程測量的 Reward 與 Progression 訊號。

不能用 Agent 行為宣稱人類 Retention。

## 7.1 Reward Signal

記錄：

- First Meaningful Reward
- Equipment Upgrade / Sidegrade
- Material Acquisition
- Skill Progress
- Craft Success
- Boss Reward
- World Recognition
- Ownership Progress
- Reputation / Identity Progress

必須說明每項指標如何定義，避免把普通金幣變化都算成有意義獎勵。

## 7.2 Goal Continuity

驗證是否存在：

- 目標無法到達
- 材料來源不存在
- UI 顯示可以操作但 Domain 拒絕
- 永遠無法滿足的解鎖條件
- 沒有任何可行後續操作的狀態
- 提示已過期或與世界狀態不一致

區分：

1. 真正的 Dead End。
2. 合法的世界限制。
3. Runner 選擇策略失敗。
4. 玩家主觀上可能感到迷失，但尚未經人類驗證。

## 7.3 Reward / Progression Drought

分析：

- 沒有新裝備的區間
- 沒有技能成長的區間
- 沒有新挑戰的區間
- 沒有世界反饋的區間
- 重複操作但無明確收益的情況

不設定固定每 X 分鐘發放獎勵。

不加入：

- Daily Quest
- Login Reward
- Battle Pass
- 強制主線
- FOMO
- Offline Income

重點是檢查 Oakvale 是否提供合理的自由選擇與成長可能性。

## 7.4 Content Coverage

重新執行既有 Content Validator，核對 Phase7 所交付內容仍具有效引用、合法生成途徑及可用的消費／轉化關係。

若內容及相關機制未變，不重做所有 Phase7／8 的巨量 Monte Carlo。

只有來源變更、舊證據不具可比性或出現新的風險時，才針對受影響部分補測。

---

# 8. Phase10-D — Persistence & Long-world Stability

Oakvale 最重要的技術要求之一，是世界的持續性。

至少驗證：

## Save / Reload

- Normal Save
- Manual Save
- Browser Reload
- Long-world Reload
- Invalid Save Rejection
- Legacy Save Migration
- Unrecognized Version Handling
- No Silent Overwrite
- Equipment / Material / Quest-like Request State
- Crisis / Boss Cooldown
- NPC / History / Succession

沿用既有存檔行為與契約。

不得為了測試方便自行更換存檔格式。

## Determinism

固定 Seed 與合法 Action Sequence，驗證：

`Same Seed + Same Initial State + Same Actions → Same Relevant State`

核對 RNG、World Time、Loot、NPC／Crisis 狀態及可重現的世界結果。

忽略無關的測試執行時間戳時，必須明確列出其不參與遊戲狀態的理由。

## Long-world

至少保留：

`3 Seeds × 10 / 50 / 100 Years`

觀察：

- NPC Population
- Settlement Progress
- Economy
- Food
- Monster / Boss
- Crisis / Recovery
- History
- Save Size
- RNG
- Succession
- Orphan References

如果核心 World Engine 沒有變更且既有 Phase8 證據可精確對應目前受測 source，可以重用有效證據並執行必要的精簡確認。

如有核心變更，重跑受影響的完整長世界測試。

注意：

100 年模擬穩定，不代表真實玩家 100 年遊玩路線已驗證。

---

# 9. Phase10-E — Final Browser / Performance QA

使用真正的 Production Build 測試。

不得只以 Unit Test 取代 Browser QA。

## 9.1 Browser Regression

至少驗證：

- New Game
- Life Route
- Adventure Route
- Hybrid Attempt
- Inventory / Compare
- Crafting
- Boss Preparation
- Crisis UI
- World History
- Save / Reload
- Succession
- Modal / Keyboard
- Mobile Navigation

有真實世界條件限制的事件，可使用合法受控存檔補測，並明確標註。

## 9.2 Responsive

優先確認：

- 320px
- 375px
- 768px
- 1280px
- 1920px

重點是：

- 不遮擋主要操作
- 不出現無法捲動的必要內容
- 沒有異常水平溢位
- Modal Focus 正確
- Touch / Keyboard 可操作
- 長清單與大量資訊可閱讀

既有 Phase9 測試如果仍有效，允許重用；不為了數量重複相同測試。

Safari、Firefox 或實體手機若不可使用，記錄 `NOT TESTED`，不得冒稱通過。

## 9.3 Performance

基準：

- Full Regression
- Production Build
- Browser Integration
- 20～30 分鐘 Integrated Stress

觀察：

- Heap
- DOM / Listeners
- Click / Input Latency
- Save Latency
- IndexedDB Errors
- History Growth
- Browser Errors
- Repeated Modal Cycles

若沒有明確 Regression，不預設重跑兩小時或更長壓力測試。

只有核心 Persistence、Renderer Lifecycle 或 Memory Risk 的證據支持時，才進行 Extended Soak。

---

# 10. QA Artifact 與磁碟容量控制

Oakvale 曾因大量 QA Evidence 累積至數 GB。

Phase10 必須嚴格控制非必要產物。

規則：

1. 優先重用既有測試腳本與 Validated Evidence。
2. 不重新建立第二套 QA Framework。
3. 原始 Runner Logs 使用有界紀錄。
4. 大型 JSONL／Trace 優先無損壓縮。
5. 保存必要 Hash、Manifest、Seed、Source Fingerprint、失敗診斷。
6. Chrome Profile、Build Cache 與可重建暫存，在驗證安全後清理。
7. 重要失敗證據不得因體積過大而直接刪除。
8. 避免把每次重跑產生的數百 MB 資料都永久提交 Git。
9. 不自動改寫 Git History。
10. 最終報告記錄新增 QA Artifacts 的容量及保留方式。

不得為了讓專案小於特定容量，犧牲證據完整性。

---

# 11. Human Product Gate — Release Readiness

這是 V2.x 最終不可忽略的產品驗證部分。

但目前階段仍採用：

`DEFERRED / NOT APPLICABLE UNTIL OWNER STARTS HUMAN TESTING`

Phase10 必須準備好真人測試流程，但不能冒充已執行。

## 建立 Human Playtest Packet

以原有 Phase7 Human Fun Gate 八個問題為基礎。

正式真人測試建議：

**1～2 小時正常遊玩**

記錄：

- 真正遊玩時間
- Build / Commit / Seed
- 玩家採取的主要行動
- 最有趣的時刻
- 最無聊的時刻
- 最困惑的時刻
- 玩家是否主動形成新的目標
- 玩家是否關心某個 NPC
- 玩家是否在意擁有的物品／產業
- 玩家是否注意自己的行動改變世界
- 玩家是否想繼續玩，以及原因

核心八問：

1. 你現在最想做什麼？為什麼？
2. 你記得哪位 NPC？為什麼？
3. 你記得哪件世界事件？為什麼？
4. 你的角色現在是一個怎樣的人？
5. 有什麼東西讓你覺得真正屬於自己？
6. 你的行動改變世界了嗎？在哪裡？
7. 如果角色現在死亡，會留下什麼？
8. 你想繼續玩嗎？下一步會做什麼？如果不想，原因是什麼？

不得預先填入答案。

不得以 Agent Simulation、Playwright、測試資料或模型推測作為人類回答。

如果 Owner 尚未正式啟動 Human Playtest，本輪只交付測試方案：

`HUMAN PRODUCT — DEFERRED`

工程驗收與 Human Product 必須是獨立 Gate。

---

# 12. Phase10 實施順序

依照以下六個工作階段執行。

### Phase10-A — Baseline & Freeze

- 確認全部 Phase 交付及目前風險
- 建立 Final Baseline
- Feature Freeze
- Source / Build Correlation

### Phase10-B — Cross-system Integration

- Adventure
- Life
- Hybrid
- Crisis
- Succession
- 補足 Phase9 已知整合證據缺口

### Phase10-C — Reward / Goal / Retention Signals

- Reward Distribution
- Progression
- Goal Continuity
- Dead Ends
- Chore Risk
- Content Reachability

### Phase10-D — Persistence & Long-world

- Save / Reload
- Migration
- Determinism
- 10/50/100-year
- History / Storage

### Phase10-E — Browser & Performance

- Production Regression
- PC / Mobile
- Keyboard / Modal
- Browser Stress
- Performance / Storage

### Phase10-F — Final QA, Internal Review & Handoff

- Full Regression
- 全部 Findings Triage
- Independent Max Review
- Release Candidate Engineering Assessment
- External Code Review Packet
- 最終交付與停止

每階段使用必要的局部驗收。

不要每個子階段都跑一次完整長時間 Stress。

---

# 13. Agent Routing

沿用目前 AGENTS.md，不建立平行 Routing Policy。

### Low

- Data Extraction
- QA Runner
- Simulation
- Evidence Collection
- Checksum Verification
- Artifact Inventory

### Medium

- 一般 Regression 修正
- 測試設計
- UI / Interaction Bug Fix
- Integration Tests
- 一般技術 Review

### Max

- Save / Migration
- Determinism
- Complex Cross-system Defects
- Persistence
- Race / Concurrency
- Deep Independent Review

### Orchestrator

- Risk Prioritization
- Scope Control
- Finding Disposition
- Cross-system Integration
- Engineering Gate
- Release Candidate Decision Proposal

直接選擇最低且可靠足夠的角色。

不使用固定 Low → Medium → Max Pipeline。

Reviewer 必須與施工者維持 Context 獨立。

實際模型身份區分 Requested / Observed / Unknown，不依 Task Name 假定 Runtime。

長時間 QA 採 Runner-driven 模式，不讓 LLM 持續輪詢等待。

---

# 14. Phase10 Final Acceptance Gates

最終分別判定：

| Gate | 驗收重點 |
|---|---|
| Engineering | Test / Typecheck / Build 正確 |
| Adventure | Combat、Loot、Equipment、Boss 全流程 |
| Life | Farming、Crafting、Skill、Ownership |
| Hybrid | Adventure → Material → Craft → Adventure |
| World | NPC、Settlement、Crisis、Recovery |
| Persistence | Save / Migration / Succession / History |
| Determinism | Seed 與 Action Replay |
| Content | Monster / Item / Recipe / Encounter 合法可用 |
| Reward / Goal | 進度、獎勵與可行下一步的工程證據 |
| Browser / UX | 操作、Responsive、Modal、效能 |
| Release Engineering | 來源、交付、風險與驗證可追溯 |
| Human Product | DEFERRED，除非實際完成真人驗證 |
| External Code Review | NOT STARTED；Phase10 後另行執行 |

工程 Gate 使用：

`PASS / PASS WITH FINDINGS / FAIL`

Human Product 另使用：

`DEFERRED / NOT APPROVED / APPROVED`

未執行的外部 Code Review 必須標記 `NOT STARTED`，不得假稱 Independent Max Review 已代替外部審查。

---

# 15. Final Definition of Done

Phase10 工程完成必須具備：

1. Phase0～9 交付內容在目前 Source 上通過適當 Regression。
2. Adventure 核心流程正確。
3. Life 核心流程正確。
4. Hybrid 正常流程已獲得實際證據，或清楚保留尚未建立的範圍與原因。
5. Boss、Loot、Crafting、Crisis 互相整合。
6. NPC 與 Settlement 可以持續演化。
7. 玩家死亡後世界及新人生正常接續。
8. Save、Migration、Determinism 沒有阻擋級問題。
9. Content Validator 沒有已知重大非法引用或不可用內容。
10. 正常 UI 操作無阻擋級缺陷。
11. Production Browser 與必要 Stress 驗證完成。
12. 磁碟／QA Artifacts 沒有新增失控膨脹。
13. 重大 Findings 均有處置與責任歸屬。
14. 沒有未解 P0／P1 Engineering Blocker。
15. 完成內部獨立 Review。
16. 交付 Source Fingerprint / Build Correlation。
17. 準備可供 Claude Opus 5.5 審查的完整 Handoff。
18. 不假稱已經通過 Human Fun / Retention Gate。

DoD 可以對部分項目判定 `PARTIAL / PASS WITH FINDINGS`。

若核心工程問題仍未解除，不得僅透過降低驗收門檻宣稱 Release Candidate 已準備完成。

---

# 16. Phase10 最終交付內容

使用現有：

`reports/v2/`

及對應 Phase10 Evidence 目錄。

至少提供：

1. `baseline.md`
2. `cross-system-integration.md`
3. `adventure-life-hybrid.md`
4. `reward-retention-signals.md`
5. `content-coverage.md`
6. `save-migration-determinism.md`
7. `long-world.md`
8. `browser-regression.md`
9. `browser-stress-performance.md`
10. `final-risk-register.md`
11. `human-playtest-packet.md`
12. `external-review-handoff.md`
13. `final-review.md`

內容可以引用已驗證的既有報告，不為湊齊檔案數量複製大量原始證據。

必須包含：

- Test Commands
- Seed / Scenario
- Runtime Environment
- Source SHA / Fingerprint
- Production Build Correlation
- 實際通過／失敗紀錄
- Before / After Evidence（若有修改）
- 原始失敗與修復追蹤
- Internal Independent Review
- Known Limitations
- Owner Decision Required

---

# 17. 外部 Claude Opus 5.5 Code Review Handoff

這是 Phase10 完成後的下一個步驟。

**本輪只準備 Handoff，不直接執行外部 Review。**

交付內容至少包含：

- V2.x Architecture Overview
- Phase0～10 Completion Summary
- Final Source Commit
- Source / Build Fingerprint
- Save / Migration Contracts
- RNG / Determinism Contracts
- NPC / World / Crisis Contracts
- Combat / Reward / Crafting Contracts
- QA Summary
- High-risk Code Paths
- Open Product Findings
- Known Technical Debt
- Historical Evidence Limitations
- Security / Data Integrity Concerns
- External Review Checklist

外部 Reviewer 必須使用**未參與 Phase10 施工與內部審查的獨立 Context**，並取得確切 Source Snapshot 與相關測試證據。

預定最終流程：

`Phase10 Engineering QA → Owner 審閱 → Claude Opus 5.5 Independent Code Review → 必要修復 → Regression → V2.x Release Candidate`

這次外部 Review 的任務是審查，而不是直接修改遊戲。

---

# 18. Phase10 最終報告必須回答

### Q1
Oakvale V2.x 是否存在阻擋遊戲正常運作的核心缺陷？

### Q2
Adventure、Life、Hybrid 是否形成可驗證且正確的跨系統流程？

### Q3
玩家死亡、存檔、讀檔及接班之後，世界是否保持連續？

### Q4
世界在長期演化下是否穩定？哪些世界平衡 Finding 仍保留？

### Q5
Reward 與 Progression 是否存在工程可確認的 Dead End？

### Q6
目前 UI 是否具備正常 PC / Mobile 使用所需的工程條件？

### Q7
哪些結論已由自動化驗證？哪些仍須真人判斷？

### Q8
V2.x 是否已達到 **Engineering Release Candidate Ready**？

### Q9
Claude Opus 5.5 外部獨立 Review 最需要注意哪些高風險區域？

所有答案必須附可追溯 Evidence。

---

# 19. 最終停止條件

Phase10 完成後：

1. 完成內部 Independent Max Review。
2. 修復所有阻擋工程驗收的缺陷。
3. 完成 Final Engineering Gate。
4. 整理全部 Findings 與 Release Risk。
5. 完成目前分支 commit / push 與遠端核對。
6. 提交完整 Phase10 Final Report。
7. 提交 Claude Opus 5.5 External Review Handoff。
8. 等待 Owner 審閱。

**不得自動執行 PR、merge、deploy、外部 Code Review 或 V3 開發。**

最後的 Engineering Gate 即使通過，也不等於 Human Product Gate 已通過。

---

# Final Product Principle

Oakvale 的核心不是追求內容最多、裝備最強或數值最高。

而是：

**Life × Living World × Consequence**

玩家可以選擇冒險、鍛造、農業、經營或自由生活。

世界不因玩家停止某條路線而停止。

NPC 不應只是玩家任務的工具。

玩家的行動可以留下痕跡，即使角色死亡，世界仍然延續。

Phase10 最終要驗證：

> **Oakvale V2.x 是否已成為一個技術上穩定、系統互相連結、可供真人長時間探索的持續生活世界。**

驗證完成後停止開發，等待 Owner 的最終工程審閱及外部 Code Review 決策。

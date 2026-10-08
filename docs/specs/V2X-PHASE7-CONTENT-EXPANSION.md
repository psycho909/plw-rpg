# Oakvale V2.x Phase7 — Living World Content Expansion

## 任務定位

你是 Oakvale 專案的 Main Orchestrator，依專案既有 `AGENTS.md` 與 `docs/agents/agent-routing.md` 分派工程工作。

**本輪只執行 Phase7 — Content Expansion。**

Phase0–6 已交付並通過工程驗收。Phase6 最終狀態為 `PASS WITH FINDINGS`。

Phase7 的目的不是單純增加怪物與物品，而是讓新內容透過既有系統，持續產生新的冒險、生活與世界變化。

核心產品原則：

> Adventure discovers value. Life transforms value. The world gives that value meaning.

本輪需要讓這三者具備足夠的內容深度，而不是建立互相獨立的資料庫。

**不要開始 Phase8～10 或 V3。**

---

## 1. 開工前的必要檢查

先閱讀：

- 根目錄 `AGENTS.md`
- `docs/agents/agent-routing.md`
- V2.x 正式規格
- Phase0–6 已完成 Tickets
- Phase6 最終工程交付
- Phase6 `crisis-findings.md`
- 現有 Monster / Item / Loot / Crafting / Crisis registries
- Combat / Simulation / World Director
- Save / Migration / Determinism
- 目前 QA 與 Content Validation 工具

Phase6 交付參考：

- Branch：`v2x/reward-core`
- 驗證 commit：`bd316cb326e5fbc20087c0154d6e3f294a5daac7`
- 91 個 source 檔案
- 531 tests

上述僅為 Phase6 交付參考。開始施工前必須重新確認目前 HEAD、working tree、source fingerprint 與 regression baseline。

不得假設現在的 source 必然等同於上述 commit。

先建立 **Phase7 Content Baseline**，記錄現有怪物、Boss、Item、Recipe、Material、Crop、Affix 與可觸發世界內容的精確數量。

---

## 2. Phase7 核心目標

本輪要完成：

1. 至少新增 **50 種真正不同的怪物定義**。
2. 至少新增 **100 種具有用途的物品定義**。
3. 建立多種合理的 Monster Family / Ecology。
4. 擴充 Elite、Mini Boss、Boss 的內容深度。
5. 讓新內容真正接入 Adventure、Life、Crafting、Economy 與 Regional Crisis。
6. 增加裝備、素材、製作與探索的長期選擇。
7. 確保內容擴充不造成世界失衡、存檔不相容、效能惡化或無法觸發的死資料。

最重要的要求：

> **新增內容必須增加玩法差異、世界可能性或玩家決策，而不是只增加 Registry 筆數。**

---

## 3. Content 數量與計數規則

### Monster Content

硬性最低目標：

**新增 ≥50 個符合品質門檻的 Monster Definitions。**

建議規劃約 60～75 個新增怪物：

| 類型 | 建議新增數量 |
|---|---:|
| Normal Monster | 35～40 |
| Elite | 12～15 |
| Mini Boss | 8～12 |
| Boss | 6～8 |

這是建議分配，不是要求每類強行湊數。Main Agent 應根據現有 Combat 能力確認分配，再鎖定 Content Plan。

計數規則：

- 現有灰狼、狼王、Goblin Chief 等不能冒充新增內容。
- 只改名字、顏色、HP 或 ATK 不算真正的新怪物。
- Procedural Trait 組合不算新 Monster Definition。
- Boss Variants 不得重複灌入 Monster Definition 數量。
- Elite 若只是普通怪套數值倍率，不應計為獨立新怪物。
- 同一 ID 的不同品質、等級與生成實例不重複計數。

可以有共同的 Monster Family，但個別怪物應具有可驗證的行為或用途差異。

### Item Content

硬性最低目標：

**新增 ≥100 個具有實際用途的 Item Definitions。**

建議覆蓋：

- Weapons
- Armor
- Crafting Materials
- Rare Materials
- Consumables
- Functional / Trade Items

具體配比由現有 Item Schema 與支援的遊戲機制決定，不預設必須平均分配。

計數規則：

- 不同 Rarity 的同一 Base Item 不得重複計數。
- Prefix / Suffix 組合不得當成新 Item。
- 不同 ItemInstance 不得當成新 Item。
- 純換名稱、無功能差異的複製物不計入合格數。
- 尚未具備實際用途的 Future Placeholder 不計入合格數。

如果某個 Item 類別需要新增大型核心系統才能使用，優先改以現有支援類別實現，而不是為了湊數擴張架構。

### Crops

建議將作物種類擴充至 **10～15 種（包含既有作物）**，但必須有不同的生長、供給、經濟或 Crisis 用途。

不得為了數量增加沒有實際差異的作物。

若現有 Farming 架構無法在 Phase7 範圍內合理支持此目標，必須先提交影響分析，由 Main Agent 決定是否限縮，並在 Gate 中明確列出未完成項目。

---

## 4. Monster Family 與世界生態

建立或擴充 Data-driven Monster Family 定義。

每個 Family 至少具有：

- Family Identity
- Allowed Regions
- Spawn Conditions
- Monster Pool
- Combat Roles
- Elite / Boss Candidates
- Loot Identity
- World / Threat Relationship

可從既有世界環境出發，例如：

- Forest
- Mine
- Farmland / Frontier
- Fog Valley
- Existing Goblin Threat Regions

優先讓新怪物自然存在於 Oakvale 目前可到達的世界。

不要因為增加內容而建立大型新地圖。

### 生態合理性

怪物生成應考慮：

`Region + World State + Threat + Time / Season + Seeded RNG`

依既有引擎能力選擇合適條件，不需要為了完整公式建立新的生態模擬器。

不得出現：

- 不合理的區域生成
- 大量互斥怪物同時生成
- Boss 無限重複出現
- 危險怪物堵住所有新手路線
- 明明被消滅的 Threat 立刻以相同狀態回復

每個 Family 必須能說明：為什麼存在於這個世界，以及它能提供什麼不同的玩法。

---

## 5. Monster Design Quality Gate

每個新增怪物至少應在以下三項中具備兩項清楚的差異：

1. **Combat Identity**：戰鬥方式、技能、抗性或戰術差異。
2. **Loot Identity**：特有材料、獎勵或製作價值。
3. **World Role**：生態、威脅、資源、事件或危機作用。

例如：

- 高護甲型敵人 → 讓穿透能力有價值
- 高速型敵人 → 改變攻防選擇
- 會召集同伴的敵人 → 需要不同戰術
- 稀有素材型敵人 → 形成追蹤與 Crafting 目標
- 威脅來源型敵人 → 影響世界安全與危機條件

不得只透過 HP、ATK、DEF 的數值倍率創造大量換皮怪。

避免讓所有敵人同時持有多個複雜技能；普通怪物應保持可理解性。

---

## 6. Controlled Monster Randomness

沿用 Phase3 已建立的 Monster Traits / Boss Variants。

建議：

| 類型 | 隨機性 |
|---|---|
| Normal | 少量屬性變化，通常 0～1 Trait |
| Elite | 1～2 個有意義的 Trait / Affix |
| Mini Boss | 固定核心能力＋少量變體 |
| Boss | 固定身份與主要機制＋受控變體 |

這些是設計方向，不要求機械套用相同數量。

重要原則：

> **裝備隨機性讓玩家期待得到什麼；怪物隨機性讓玩家思考如何對付。**

避免讓 Boss 因為隨機詞綴而失去自己的核心身份。

---

## 7. Elite、Mini Boss 與 Boss

### Elite

必須具有：

- 高於普通怪物的挑戰
- 可辨識的特殊能力
- 更值得追求的獎勵
- 合理的區域與出現條件

### Mini Boss

必須具有：

- 明確的戰鬥主題
- 比 Elite 更強的機制身份
- 專屬或偏向性的獎勵
- 不依賴完整 Regional Crisis 才能存在

### Boss

每個 Boss 應至少定義：

- Identity
- Region / Conditions
- Core Mechanics
- Controlled Variants
- Telegraph / Readability
- Exclusive Loot Identity
- Defeat / Escape / Reload Rules
- Respawn / Cooldown
- World Consequence

新增 Boss 應是世界內的候選事件，不是固定劇情表。

禁止：

`Year 5 → 固定出現 Boss A`

應透過世界條件、候選池、權重與既有 RNG 決定。

不是所有 Boss 都必須能在同一個新手世界的短期遊玩中出現。

---

## 8. Item、Equipment 與 Affix

沿用 Phase1–5 已存在的統一 Equipment Generation Pipeline。

新增裝備必須支援：

- ItemInstance
- Base Stats
- Rarity
- Affix Eligibility
- Procedural Generation
- Compare
- Equip
- Save / Reload
- Loot / Crafting Source

不得重新建立第二套 Item Generator。

新裝備的基礎類型、品質、詞綴與裝備等級需要有可理解的差異。

### 避免數值膨脹

禁止將新內容設計成單純：

`舊裝備 < 新裝備 < 更晚新增裝備`

應保留：

- Raw Damage
- Crit / Speed
- Bleed
- Armor / Defense
- Penetration
- 其他現有機制

之間的情境差異。

高等級裝備可以較強，但不得讓全部早期裝備立即失去合理用途。

不得透過 Nerf Legacy Equipment 來證明新裝備有價值。

---

## 9. Loot Identity 與 Reward Loop

新增怪物必須有合理 Loot Table。

不同 Family 的 Loot 應具有辨識度。

例如：

`Forest Beast → Beast Materials → Specific Crafting`

`Mine Enemy → Ore / Stone-related Materials → Equipment Production`

具體內容依專案 Canon 與已存在的資源類型決定。

Loot 應支援：

- Guaranteed
- Weighted
- Conditional
- Elite Quality Bias
- Boss-specific
- Rare / Exclusive

如果現有 Loot Table 已可支持，直接沿用，不得為了 Phase7 重寫。

新增內容仍必須滿足：

`Explore → Risk → Combat → Loot → Compare / Craft → Build → Harder Target`

不能大量增加怪物，卻讓全部怪物掉落幾乎相同的 Generic Material。

---

## 10. Materials、Crafting 與 Masterpiece

Phase5 已建立：

- Crafting Recipes
- Material Influence
- Smithing
- Masterpiece
- Craft Provenance

Phase7 應擴充其**內容**，不要重新設計其核心規則。

新增材料必須至少具有一個明確用途，例如：

- Recipe Input
- Material Bias
- Equipment Creation
- Consumable Production（限現有支援機制）
- Economy
- Civil Defense Support

建議同步擴充約 **15～25 個有意義的 Recipe Definitions**，但以材料用途完整、配方差異與正常流程可取得為優先。

新增 Recipe 必須沿用既有製作與 RNG 規則。

不得提前建立：

- Full Alchemy System
- Complex Production Chains
- Worker Automation
- Factory Management
- New Crafting Professions

Masterpiece 仍應由技能、材料、合法配方與 RNG 共同決定，不得變成純粹另一個掉率池。

---

## 11. Life、Economy 與 Food Expansion

新增內容要讓生活線也變得更豐富。

優先補強：

`Gather → Produce → Craft → Use / Sell → Skill / Wealth → Next Goal`

以及：

`Farm / Supply → World Need → Contribution → World Consequence`

作物、素材與消耗品應考慮：

- 生產或取得成本
- 生長／取得時間
- 市場價值
- 實際使用價值
- Crafting 消耗
- Crisis Supply 用途

不要讓新內容造成：

`Buy → Craft → Sell → 無風險無限獲利`

也不要讓普通生活工作完全失去經濟價值。

保留 Phase5 產品 Finding：目前住宅／進階工作台／傑作的自然長期追求尚未充分驗證。

Phase7 可以改善相關內容與選擇，但不要藉此提前打造完整經營系統。

---

## 12. Regional Crisis Integration

Phase6 已建立完整 Goblin Regional Crisis Vertical Slice。

Phase7 新增內容時，應確認：

- 怪物與現有 Threat 不互相衝突
- 新素材可供部分 Civil Defense 使用
- 新裝備可合理影響防衛裝備價值
- 新作物與物資能接既有 Food / Supply Model
- 新怪物不會造成危機觸發密度失控
- 現有 Goblin Crisis 的觸發、Boss、Contribution、Outcome、Recovery 仍然正確

**本輪不要新增第二套 Regional Crisis 核心架構。**

允許少量 Data-driven Crisis Content，但只有在能完全沿用 Phase6 系統、不需要大型架構擴張的前提下才可加入。

Phase6 遺留的兩項驗證限制必須保留為追蹤項：

- 自然生活路線的實際公共物資交付覆蓋不足
- 自然 No-Player 世界自治成功率尚未獨立充分驗證

如果本輪新內容提供合理機會，可以補充正常流程觀察；但不得用受控 fixture 冒充自然遊玩。

---

## 13. World Director、生成與內容分布

新增 50+ 怪物後，最需要避免的是：

> 內容雖然很多，但生成分布完全失控。

World Director 與現有生成系統應根據：

`Region + Progression + Threat + World Conditions + Weight + Cooldown + Seed`

選擇合法內容。

檢查：

- 新手是否仍有安全活動區
- 怪物分布是否與區域一致
- Elite 出現率是否合理
- Mini Boss 是否過度頻繁
- Boss 是否互相搶占世界狀態
- 同一 Family 是否過度主導全部冒險
- 長期世界是否能看到內容輪替
- 某些怪物／Boss 是否因條件矛盾而永遠無法生成

**所有內容必須有 Reachability Validation。**

有條件出現不代表必須高頻出現；但每個正式加入的內容都必須有合法、可驗證的觸發途徑。

---

## 14. UI / UX 與 Discovery

新增大量內容後，必須檢查：

- Monster Discovery
- Collection
- Inventory
- Equipment Filter
- Loot Compare
- Recipe List
- Material Source
- Boss Warnings
- World Rumors
- Crisis-related Needs

不要因為增加 100+ Items 就讓清單難以使用。

本輪只允許必要的：

- Search
- Filter
- Pagination
- Grouping
- Discovery Indication
- Relevant Source / Usage Hints

避免新增大型 UI 系統。

維持 Oakvale：

**World First / Retro / Traditional Chinese / PC + Mobile**

所有新增內容名稱、敘述與機制提示都要能在手機上清楚閱讀。

不要讓玩家必須查外部 Wiki 才知道一件材料的用途。

---

## 15. Data Validation 與 Content Authoring

Phase7 必須優先建立或強化自動化 Content Validator。

至少檢查：

- Unique ID
- Schema Validation
- Referenced ID Exists
- Region Compatibility
- Monster Family References
- Loot Table References
- Recipe Input / Output References
- Material Eligibility
- Affix Eligibility
- Valid Stat Ranges
- Finite Numeric Values
- Spawn Condition Reachability
- Boss / Elite Classification
- Localization Completeness
- Item Usability
- Duplicate-like Definitions
- Save Compatibility

新增 Content 不得依賴人工逐筆 Review 才能發現基本格式錯誤。

每批完成後自動執行：

`validate → targeted tests → report`

對未使用的 ID、永遠不會觸發的內容、無用途物品都要提出明確警告。

---

## 16. 數值平衡

### Monster Balance

建立代表性 Combat Matrix，涵蓋：

- Early / Mid / Late progression
- Normal / Elite / Mini Boss / Boss
- Legacy Gear
- Procedural Loot Gear
- Crafted Gear
- Masterpiece（合法條件）
- Different Combat Builds

量測：

- Win Rate
- Death Rate
- Median Turns
- P10 / P50 / P90 Turns
- Damage Taken
- Potion Usage
- Time / Resource Cost

不得只比較 ATK / DEF。

### Loot Balance

使用 deterministic Monte Carlo。

建議至少 100,000 次 Loot Generation，依 Family、Tier、Region、Boss 與 Rarity 進行分層。

記錄：

- Drop Distribution
- Rarity
- Affix Utility
- Material Availability
- Exclusive Drops
- Upgrade / Sidegrade
- Reward Drought
- Meaningless Loot

### Economy / Craft Balance

檢查：

- Material Income
- Material Consumption
- Recipe Cost
- Craft Sell Value
- Gold Sinks
- Consumable Cost
- Infinite Arbitrage
- Masterpiece Frequency

先建立 baseline，再調整。

本輪不要求所有 Build 完全等強，但必須避免某一種低成本策略在全部情境下明顯壓倒其他玩法。

---

## 17. 長期世界模擬

至少執行：

**3 Seeds × 10 / 50 / 100 年**

如成本合理，可增加 Seed 數量以觀察分布。

檢查：

- Monster Ecology
- Region Spawn
- Boss Frequency
- Boss Cooldown
- Crisis Frequency
- Population
- NPC Survival
- Settlement State
- Food / Supply
- Material / Item Distribution
- Economy
- World History
- Save Size
- Journal Growth
- Deterministic Replay

特別關注：

- Content Flood
- Boss Spam
- Threat Spiral
- Economy Inflation
- Rare Material Flood
- Equipment Power Creep
- Settlement Death Spiral
- Orphan References
- Save / Migration Failure

長世界模擬不代表所有內容都自然遇到過，因此仍須另外提供 Content Reachability / Coverage 報告。

---

## 18. Performance 與儲存

Phase7 是大量內容擴充，必須監控：

- Registry 初始化時間
- Browser Bundle Size
- Initial Render
- Inventory Rendering
- Collection Rendering
- Memory / Heap
- DOM / Listener
- Save Latency
- Save Size
- IndexedDB Growth

延續既有：

- C01 Export / Interleaving
- C02 Journal Growth
- C03 DOM / Listener Retention

但不得只因為存在歷史 Finding 就直接大重構。

若新內容導致可重現的退化，才進行針對性修復。

不得將整個 Monster / Item Registry 或所有歷史事件不必要地複製進每個 Save Instance。

---

## 19. Save、RNG 與相容性

所有新內容仍須遵守：

- Seeded RNG
- Single Generation Authority
- Stable ItemInstance ID
- Save / Reload
- Incremental Migration（確有 schema 需求時）
- Legacy Compatibility
- World Continuity
- Succession
- Persistent History

禁止散落 `Math.random()`。

純資料擴充原則上不應要求整套 Save Schema Migration。

如果需要新增欄位，必須說明原因並先完成最小 Migration 測試。

舊 V1、V2、Phase0–6 的角色與世界不得因 Registry 擴充而失效。

---

## 20. 本輪施工順序

將 Phase7 分成以下階段：

### Phase7-A — Baseline & Content Plan

記錄現有內容數量、Schema、Registry、測試與世界分布。

產出內容分類、目標數量、Family Plan、物品用途矩陣。

先讓 Main Agent 核定，再大量施工。

### Phase7-B — Content Validator & Authoring Contracts

完善 Schema Validation、Reference Validation、Reachability Checks、Batch Report。

先建工具，再產生大量內容。

### Phase7-C — First Content Batch

先完成 1～2 個完整 Monster Families。

每批應有：

`Monster → Combat → Loot → Material → Craft/Use → Discovery`

以小批次驗證架構可擴充性。

### Phase7-D — Monster Expansion

依核定計畫分批新增普通怪物、Elite。

避免多個 Agent 同時修改同一核心 Registry 檔造成衝突。

### Phase7-E — Mini Boss & Boss Expansion

新增獨立的 Mini Boss / Boss Identity、Variant、Exclusive Loot、Cooldown、World Conditions。

### Phase7-F — Item / Recipe Expansion

新增裝備、素材、消耗品及必要配方。

全部接既有 Procedural Equipment / Crafting Pipeline。

### Phase7-G — Life / Economy / Crop Expansion

增加生活資源用途、作物差異、物品消耗與經濟互動。

### Phase7-H — World & Crisis Integration

確認所有新增內容接入合適的世界與危機系統，且不破壞 Phase6。

### Phase7-I — Discovery & UX

優化大量內容下的 Collection、Inventory、Material Usage 與 Boss Readability。

### Phase7-J — Balance & Coverage

執行 Content Coverage、Loot Monte Carlo、Combat Matrix、Economy、Long-world Simulation。

修正明顯異常。

### Phase7-K — Full QA & Independent Review

全量 Regression、Browser、Performance、Save、Determinism、Review、Final Gate。

**每一階段都應有對應的局部驗收，不要等最後才發現整批內容不符合 Schema。**

---

## 21. Agent 分工與 Token 成本

嚴格遵守既有 Agent Routing Policy，不重新建立另一套。

建議：

**GPT-6 Luna Low**

- Content Registry Data
- Batch Authoring
- Content Validation
- Fixtures
- Test Execution
- Monte Carlo
- Long-world Simulation
- Browser Runner

**GPT-6 Luna Medium**

- 一般 Content Integration
- 新增一般 Monster Mechanics
- UI / Discovery
- Recipe Integration
- Test Design
- 一般 Bug Fix

**GPT-6 Luna Max**

- Core Registry / Generator Architecture
- Complex Combat Mechanics
- Save / Determinism
- World Director Integration
- Difficult Bugs
- Deep Review

**GPT-6.1 Sol Medium**

- Scope / Plan
- Content Quality Standards
- Architecture Decisions
- Agent Coordination
- Integration
- Final Gate

具體模型名稱與 effort 必須符合執行環境實際可用設定；無法取得執行 telemetry 時，不得假稱已確認模型配置。

### Token Efficiency

- 先定 Schema，再批量產生內容。
- 能用 validator 發現的錯誤，不交給高推理模型逐筆檢查。
- 不讓多個 Agent 重複分析同一個 Family。
- 平行處理獨立 Content Batch，但保持清楚的檔案 ownership。
- Runner 自行執行並輸出 summary。
- Main Agent 只閱讀必要 diff、統計、重大 Findings 與 Gate 證據。
- 不為了追求絕對零 Finding 進行無限 QA。

---

## 22. QA 策略

Phase7 不預設兩小時 Browser Soak。

### 每個 Content Batch

只做：

- Content Validator
- Targeted Unit Tests
- Relevant Integration Tests
- Typecheck（必要時）
- Deterministic Smoke

### 重要整合節點

執行：

- Full Regression
- Typecheck
- Production Build
- Save / Reload
- Combat / Loot / Crafting Integration
- Crisis Compatibility
- UI Smoke

### Phase7 Final QA

至少：

- Full Regression
- Production Build
- Content Count Audit
- Content Quality / Reachability Audit
- 100,000 Loot Generation（可調整為等價有效分層樣本）
- Representative Combat Matrix
- Economy / Craft Simulation
- 3 Seeds × 10 / 50 / 100 Years
- Production Chromium Regression
- 20～30 分鐘 Integrated Browser Stress
- 30～60 分鐘 Content-focused Agent Exploratory Playtest
- Independent Technical Review

只有短測有異常、或改動 persistence / renderer lifecycle 等高風險領域，才考慮 60～120 分鐘 Extended Soak。

Human Fun / Retention Gate：

`DEFERRED / NOT APPLICABLE AT THIS STAGE`

除非 Owner 明確要求真人產品驗證。

Agent 不得冒稱真人。

---

## 23. QA 與 Product Findings 分開

Bug：

內容違反既定規格、引用不存在、戰鬥公式錯誤、存檔損壞等。

Product Finding：

某個 Family 不夠有趣、掉落差異不足、Boss 出現太少、Crafting 太重複等。

不得為了讓 QA PASS 而擅自：

- 提高全部 Rare Drop Rate
- Nerf 所有 Legacy Gear
- 降低全部 Boss 難度
- 提高所有 Gold Reward
- 強制觸發稀有事件

工程正確與產品吸引力是不同的驗收面向。

---

## 24. Phase7 Definition of Done

完成 Phase7 必須同時滿足：

1. 新增至少 50 種合格 Monster Definitions，數量由自動稽核確認。
2. 新增至少 100 種具實際用途的 Item Definitions，數量由自動稽核確認。
3. 各 Family 具備合理的戰鬥、掉落與世界身份。
4. Elite、Mini Boss、Boss 具有可辨識的機制與獎勵差異。
5. 正式內容不存在已知的無效引用、非法生成條件或死資料。
6. 新裝備沿用既有生成、比較、穿戴、保存與交易系統。
7. 新素材至少有合理的消費或轉化途徑。
8. 新 Recipe 沿用 Phase5 Crafting、Smithing 與 Masterpiece。
9. 新內容沒有破壞 Phase6 Civil Defense 與 Regional Crisis。
10. 玩家可透過正常世界活動接觸不同 Family 與 Reward。
11. 世界生成沒有明顯怪物／Boss 氾濫。
12. 代表性 Combat Build 不存在明顯不可接受的全面壓倒性策略。
13. Economy 不存在新增的無風險無限套利。
14. 新內容可在 PC / Mobile 清楚閱讀及操作。
15. 10 / 50 / 100 年模擬可持續運作。
16. Save / Reload / Succession / Migration 保持正確。
17. V1 / V2 / Phase0–6 regression 保持通過。
18. 所有重大 Bug 均完成修復或有明確阻擋判定。
19. QA 提供可追溯、可重現的 source evidence。
20. 各項數量、覆蓋率、成功案例不得以 Fixture 或候選定義冒充自然遊玩成果。

---

## 25. Phase7 Final Gates

最終分別判定：

| Gate | 驗收重點 |
|---|---|
| Engineering | Regression、Build、Save、Determinism |
| Content Quantity | ≥50 新怪物、≥100 新物品 |
| Content Quality | 不以換皮內容湊數 |
| Ecology | 合理生成、區域相容、可觸發 |
| Combat Diversity | 怪物與 Build 產生有效差異 |
| Reward / Loot | 不同 Family 具獎勵身份 |
| Crafting / Life | 新素材與配方有實際用途 |
| World Integration | Threat / Crisis / NPC 不互相衝突 |
| Economy | 無明顯無限套利與資源崩壞 |
| Long-world Stability | 長期世界、儲存、事件維持穩定 |
| Human Product | DEFERRED，除非明確啟動 |

每項 Gate 可使用：

`PASS / PASS WITH FINDINGS / FAIL`

不得為達到完整 PASS 而隱藏限制。

---

## 26. 最終交付內容

沿用既有 Tickets 與 QA Artifact 結構，不另建平行流程。

至少交付：

- `content-baseline.md`
- `content-plan.md`
- `monster-catalog.md`
- `item-catalog.md`
- `content-coverage.json`
- `content-validation.md`
- `monster-balance.md`
- `loot-analysis.md`
- `crafting-economy.md`
- `world-integration.md`
- `long-world.md`
- `browser-regression.md`
- `browser-stress.md`
- `agent-content-playtest.md`
- `bugs.md`
- `content-findings.md`
- `final-review.md`

保留：

- 真正受測 Source Fingerprint
- Production Build Correlation
- Delivery Source Commit
- Independent Review
- 原始失敗證據

不得將測試 base SHA 誤稱為已交付的完整實作 SHA。

---

## 27. Phase7 後的外部 Review 準備

Phase7 完成並通過 Development Engineering Gate 後，準備一份供外部獨立 Code Review 使用的 Handoff。

目標 Reviewer：

**Claude Opus 5.5**（由 Owner 另行執行）。

Handoff 至少包含：

- Phase0–7 Architecture Summary
- Source Commit / PR Diff
- Relevant Specs / Tickets
- Current Test Matrix
- Save / Migration Overview
- Content Registries
- Monster / Loot / Crafting / Crisis Data Flow
- Known Findings
- Technical Debt
- Review Focus

外部 Reviewer 的主要目的：

> 找出跨系統耦合、資料擴充性、長期穩定性、存檔相容性及內部 QA 可能忽略的風險。

本輪只準備 Handoff，不擅自宣告外部 Review 完成，也不自行進行 PR Merge 或正式部署。

---

## 28. Final Product Questions

Phase7 最終審查必須回答：

**Q1.** 增加 50+ 怪物後，世界是否真的變得更豐富，而不只是 Encounter 名稱更多？

**Q2.** 增加 100+ 物品後，玩家是否產生更多裝備、製作與資源決策，而不是單純 Inventory 更亂？

**Q3.** Elite / Mini Boss / Boss 是否各自提供值得冒險的目標？

**Q4.** 不同怪物生態是否能隨世界狀態自然變化，而不是固定劇情與固定刷怪清單？

**Q5.** 新素材與裝備是否真正進入生活、Crafting、Economy 與 Crisis？

**Q6.** 擴充內容後，原本的 Living World 是否仍能長期運轉，而不是被大量資料與事件拖垮？

以上必須以實際 Code、Simulation、Browser Runtime 與 QA Evidence 回答，不得僅引用設計文件。

---

## 29. Core Principle

Phase7 不是：

> Add 50 monsters and 100 items.

而是：

> **Expand the world's possibilities without breaking its living systems.**

Oakvale 應從：

「我知道這片森林有什麼。」

逐漸變成：

「世界變化後，這片森林還可能出現什麼？」

最終目標：

**讓每一種新怪物、新素材、新裝備，都有機會成為玩家人生與世界歷史中的一部分。**

完成 Phase7 Gate 後停止施工，等待 Owner 審閱。不得自動開始 Phase8～10。

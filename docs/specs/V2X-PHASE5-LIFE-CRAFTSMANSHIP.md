# Oakvale V2.x Phase5 — Life Reward & Craftsmanship Vertical Slice

本輪只執行：

> **Phase5 — Life Reward / Craftsmanship Vertical Slice**

Phase4 已完成並通過：

- Engineering Gate
- Browser Stability Gate
- Reward System Gate
- Risk / Reward Gate
- Build Gate
- Adventure Loop Gate

狀態均為：

`PASS WITH FINDINGS`

本輪不要開始：

- Phase6 Regional Crisis
- Phase7 50+ Monsters / 100+ Items
- Phase8 Balance
- Phase9 Final Polish
- Phase10 Final Retention QA
- V3

---

# 1. Phase5 核心目標

Phase4 已證明：

```text
Explore
→ Fight
→ Loot
→ Build
→ Harder Target
```

Phase5 要建立第二條核心循環：

```text
Gather / Acquire
↓
Material
↓
Craft
↓
Useful Product
↓
Skill / Mastery
↓
Better Crafting Decisions
↓
Higher-value Product
↓
Ownership / Reputation / Wealth
↓
New Life Goal
```

並首次形成：

```text
Adventure
→ discovers value

Life
→ transforms value
```

---

# 2. 本輪真正要回答的問題

不要只證明：

> Crafting 系統可以製作物品。

必須回答：

> **生活玩家是否能透過製作、技能與經營，把普通資源逐步轉化成具有更高價值的成果，並自然產生下一個人生目標？**

以及：

> **冒險取得的素材是否因 Craftsmanship 而真正有意義？**

---

# 3. Life Reward 核心心理

Phase5 主要強化：

```text
Progress
Mastery
Ownership
Competence
Transformation
Recognition
Legacy
```

Adventure Reward 的核心是：

> 「下一次會得到什麼？」

Life Reward 應逐漸形成：

> **「下一步我能把自己的人生與產業變成什麼？」**

---

# 4. 不做生活模擬器膨脹

Phase5 不是：

- Furniture Simulator
- Base Builder
- Factory Game
- Automation Game
- Farming Expansion
- Cooking Expansion
- Full Economy Simulator

本輪只建立：

> **Craftsmanship Vertical Slice**

優先職業幻想：

> **Smith / Crafter**

利用目前已經存在的：

- Equipment
- Materials
- Gold
- Skills
- Shop / Blacksmith
- Ownership
- Reputation
- Procedural Gear

形成最小但完整的 Life Reward Loop。

---

# 5. Phase4 Findings 接續

Phase5 必須正式處理或量測：

### Material Utility

目前 Monster Materials 用途不足。

Phase5 要讓：

```text
Wolf Fang
Wolf Hide
Moon-related material
其他既有素材
```

至少部分真正進入：

```text
Crafting
Material Bias
Recipe
Upgrade / Equipment Creation
```

不要再只是：

> 可出售的 Generic Material。

---

# 6. Crafting Architecture

建立 Data-driven Crafting Registry。

最低結構應能表達：

```text
Recipe
Input Materials
Gold / Service Cost
Output Base
Required Skill
Material Influence
Quality Rules
Affix Rules
Unlock Conditions
```

概念：

```ts
Recipe {
  id
  category
  inputs
  goldCost
  outputBase
  requiredSkill
  unlockCondition
  materialBias
}
```

實際型別依現有 architecture 決定。

不要為了符合範例硬套型別。

---

# 7. Crafting 必須共用既有 Item Generation Pipeline

禁止建立第二套：

```text
Adventure Item Generator
Crafting Item Generator
```

Crafted Equipment 必須盡可能共用 Phase1–4 已存在的：

```text
Base Item
Rarity
Affix
Roll
Item Instance
Serialization
Comparison
Equip
Save
```

差異應透過：

```text
Generation Context
Material Bias
Crafter Skill
Recipe
```

控制。

---

# 8. Single Generation Authority

應維持單一可信生成入口。

例如概念：

```text
generateEquipment(context)
```

Context 可以是：

```text
Loot
Boss
Crafting
```

不要在不同 subsystem 複製：

- rarity roll
- affix roll
- stat calculation
- instance ID
- serialization

避免 Phase7 大量 Content 時失控。

---

# 9. Material-biased Crafting

Crafting 不得只是：

> 把三個素材換成一把隨機武器。

不同素材必須能：

> **影響結果概率。**

例如概念：

```text
Wolf Fang
→ Bleed / Beast / Damage bias

Wolf Hide
→ Defense / Agility bias

Moon Material
→ Rare / Crit / Special bias
```

實際效果依現有 Affix 系統與世界設定實作。

核心是：

```text
Material
→ alters probability
```

而不是：

```text
Material
→ guarantees perfect item
```

---

# 10. Controlled RNG

Crafting 可以有 RNG。

但必須是：

> **Player-influenced RNG**

不是純 Casino。

結果應由：

```text
Recipe
+
Material
+
Skill
+
Seeded RNG
```

共同決定。

玩家要能理解：

> 「我為什麼選這個素材。」

---

# 11. Determinism

所有 Crafting RNG 必須走既有：

```text
worldSeed
rngState
RandomService
```

禁止：

```text
Math.random()
```

同一：

```text
state
+
seed
+
action sequence
```

必須得到相同結果。

---

# 12. Crafting Skill

建立或接入 Craftsmanship / Smithing Skill。

不要做 Skill Tree。

Phase5 只需要：

```text
Practice
↓
Skill XP
↓
Skill Level
↓
Better Crafting Capability
```

Skill 可以影響：

- Unlock Recipe
- Minimum Quality
- Affix Roll Weight
- Roll Quality
- Failure / Waste reduction

但不要一次全部實作。

選擇最有價值且能被玩家理解的 2～3 項。

---

# 13. Skill Progression 不能只是數字

技能升級必須帶來：

> **Capability Change**

而不只是：

```text
Smithing Lv3
→ Smithing Lv4
```

至少要產生：

```text
New recipe
Better control
Better quality floor
New material capability
```

其中一種。

---

# 14. Crafting Graduation

避免：

> 永遠重複製作最低階裝備刷技能。

應建立最低程度的 diminishing value / progression。

例如：

```text
低階 Recipe
→ Early XP

高技能後
→ XP value下降或停止
```

或：

```text
更高 Skill
→ 鼓勵較高階 Recipe
```

不要做 MMO 式大量 grind。

---

# 15. Recipe Scope

本輪不要增加大量 Recipe。

建議只建立足夠驗證 Loop 的：

> **6～12 個 Recipe**

涵蓋：

- Weapon
- Armor
- Material-specific recipe
- Higher-skill recipe
- Boss-material recipe

數量不是 Gate。

Loop 是否成立才是 Gate。

---

# 16. Crafted Gear vs Adventure Gear

兩者不能形成：

```text
Crafting 永遠最好
```

也不能：

```text
Boss Loot 永遠最好
```

目標是：

### Adventure

提供：

- Unknown
- Rare Base
- Exclusive Material
- Boss Reward
- Jackpot

### Crafting

提供：

- Control
- Material Selection
- Build Targeting
- Repeatability
- Mastery

形成不同 Reward Fantasy。

---

# 17. Adventure × Crafting

至少證明：

```text
Adventure Material
↓
Crafting
↓
Useful Equipment
↓
Adventure capability improves
```

以及：

```text
Adventure finds rare material
↓
Life player transforms it
↓
Higher value item
```

Phase5 完成後不能再出現：

> 狼王素材只有收藏或賣錢用途。

---

# 18. Masterpiece — Minimal Vertical Slice

Phase5 可以正式加入：

> **Masterpiece**

但只做最小 Slice。

Masterpiece 定義：

> 高技能 Crafter 在適當 Recipe / Material 下，有機會製作出的特殊高價值成果。

不要把它設計成：

> 0.1% Casino Drop。

應由：

```text
High Skill
+
Appropriate Material
+
Eligible Recipe
+
Seeded Roll
```

共同決定。

---

# 19. Masterpiece 必須有 Identity

Masterpiece 不只是：

```text
ATK +10%
```

至少包含：

```text
Quality Identity
Crafter
Crafted Time
Recipe / Base
```

如果現有 architecture 容許，可記：

```text
createdBy
createdAt
materialSource
```

避免提前建立過重 provenance system。

---

# 20. Masterpiece History

如果成本合理：

重要 Masterpiece 可以進入：

> Persistent History

例如：

```text
「Year 3，某角色打造了……」
```

但只有：

- Masterpiece
- Legendary Craft

才值得寫入。

禁止每把 Common Sword 都寫 World History。

---

# 21. Crafting Quality

Crafting Quality 應沿用既有：

```text
Common
Uncommon
Rare
Epic
Legendary
```

不要另外建立：

```text
Craft Rank S/A/B/C
```

造成兩套品質系統。

Masterpiece 是：

> Crafting Achievement / Property

不必成為第六個 Rarity。

---

# 22. Workshop

Phase5 可以建立：

> **Minimal Workshop Interaction**

但不要做 Base Builder。

Workshop 只需要支援：

```text
Craft
Recipe
Material selection
Result
Skill progress
```

如果既有 Blacksmith 能合理承擔：

優先擴充既有 Blacksmith。

不要沒有必要就新增新建築。

---

# 23. Ownership — Minimal Integration

如果 V2 Ownership 已存在並容易接入：

可以讓：

```text
Workshop / Business Ownership
```

提供小幅實際價值。

例如：

- Lower service cost
- Access advanced crafting
- Sell crafted goods
- Reputation bonus

但不要在 Phase5 建立完整：

- Employees
- Business management
- Production chains
- Tax system
- Supply contracts

那些不是本輪必要條件。

---

# 24. Crafting UI

玩家必須快速理解：

```text
Recipe
Required Materials
Owned Materials
Expected Output
Material Influence
Required Skill
Cost
```

不要讓玩家必須查 Wiki 才知道素材作用。

---

# 25. Material Influence UI

Material Bias 至少提供：

> Directional Information

例如：

```text
較容易出現出血相關效果
較容易得到防禦效果
提高高品質機率
```

不必公開完整數學公式。

---

# 26. Craft Result UI

Craft 完成時顯示：

```text
Item
Rarity
Stats
Affixes
Quality / Masterpiece
Compare with equipped
```

沿用 Phase4 Compare UX。

不要建立第二套 Item Inspect UI。

---

# 27. Craft Decision

真正的 Crafting 決策至少包含：

```text
Craft what?
Use which material?
Craft now or save rare material?
Use result or sell it?
```

如果流程只是：

```text
有素材
→ 點 Craft
→ 得裝備
```

則 Phase5 不成立。

---

# 28. Economy Loop

Phase5 必須開始驗證：

```text
Acquire Material
↓
Craft
↓
Use / Sell
↓
Gold / Capability
↓
Acquire Better Inputs
```

但不要重做完整 Economy。

---

# 29. Crafting 不能是 Money Printer

建立 Economy Simulation。

確認：

```text
Material purchase
+
Craft cost
→ Crafted item sell
```

不能穩定產生：

> 無限無風險套利。

允許：

> 高技能、高價材料、特殊 Item 有合理利潤。

但不應存在無限：

```text
Buy → Craft → Sell → Profit
```

循環。

---

# 30. Item Sell Value

Crafted Item Sell Value 應考慮：

```text
Base
Rarity
Affixes
Quality
```

但不要讓隨機 Roll 稍高就產生指數級 Gold。

建立 distribution 測試。

---

# 31. Crafting Resource Sink

Phase4 的 Gold / Material accumulation 必須開始有用途。

Phase5 至少建立：

- Crafting cost
- Material consumption

形成：

```text
Adventure Resource Inflow
↕
Life Resource Sink
```

避免只有收入沒有支出。

---

# 32. Ordinary Materials

不是所有材料都必須 Rare。

普通材料應能：

- 練技能
- 製作基礎裝備
- 補充經濟
- 支援常規 Crafting

Rare / Boss Material 則：

- Bias
- Special recipe
- Masterpiece eligibility
- Higher tier result

---

# 33. Life Reward Cadence

分析：

```text
1 craft
5～10分鐘
30分鐘
Skill milestone
Masterpiece event
```

對應：

```text
Small reward
Progress reward
Capability unlock
Jackpot / identity reward
```

不要每次 Craft 都給重大 Reward。

---

# 34. Life Reward Drought

定義並量測：

> **Life Reward Drought**

例如：

```text
連續大量 Craft
↓
沒有技能進展
沒有新能力
沒有有價值成果
沒有新目標
```

這是 Product Finding，不一定是 Bug。

---

# 35. Repetition / Chore Detection

Agent Playtest 要記錄：

```text
重複 Craft
重複 Gathering
重複 Buy
重複 Sell
```

是否開始沒有決策。

若只剩：

```text
click
click
click
```

記錄：

> Chore Risk

不要為了解決它直接加入完整 Automation。

---

# 36. Automation 不在本輪

Phase5 不建立：

- Worker automation
- NPC production queue
- Offline crafting
- Factory
- Auto-craft
- Background manufacturing

只需要確認：

> Manual action 目前是否合理。

Automation 留給後續必要時處理。

---

# 37. Life Identity

Craftsmanship 應開始影響角色 Identity。

例如：

```text
Smithing Skill
Masterpiece
Workshop ownership
Craft reputation
```

至少其中部分可被角色資訊或 World History 看見。

玩家不選：

> Smith Class。

身份由實際行為形成。

---

# 38. Reputation — Minimal Integration

如果既有 Reputation architecture 可低成本接入：

Crafting achievement 可以少量影響：

```text
Local Reputation
Crafter Recognition
```

例如：

> Masterpiece / high quality order

不要建立完整 Fame System。

---

# 39. NPC Interaction

本輪不需要完整 NPC Order System。

若現有世界需求架構容易接：

可建立 1～2 個最小需求案例，例如：

```text
Blacksmith needs material
NPC needs weapon
```

但不能因此提前做 Phase6 World Crisis。

---

# 40. Requests

如果加入 Craft Request：

必須由：

```text
world need
```

產生。

不要做：

> 每日任務。

不要：

```text
每天打造3把劍
→領獎勵
```

---

# 41. Existing Legacy Gear

不要透過：

> Nerf legacy

來證明 Crafting 有價值。

Crafting 應靠：

```text
Control
Build targeting
Material influence
Skill progression
Masterpiece
```

建立自己的價值。

---

# 42. PF02 延續

Phase4 已有 ordinary procedural gear 相對滿配 legacy 的差距。

Phase5 要驗證：

> Crafting Control 是否能改善這個問題。

例如：

```text
Random Drop
→ high variance

Crafting
→ lower variance / targeted outcome
```

而不是全面提高所有新裝備數值。

---

# 43. Crafting Monte Carlo

建立 deterministic Crafting Runner。

建議：

```text
≥ 100,000 crafts
```

如果執行成本合理。

統計：

```text
Rarity
Affix count
Affix type
Material bias effectiveness
Skill-level outcome
Masterpiece rate
Sell value
Effective Combat Value
```

---

# 44. Material Bias Validation

對每種 Phase5 使用的特殊素材：

測試：

```text
With material
vs
Control material
```

確認 Bias：

> 統計上真的存在。

不能 UI 說：

> 提高 Bleed

但實際 distribution 幾乎完全相同。

---

# 45. Skill Simulation

測試：

```text
Low Skill
Mid Skill
High Skill
```

至少比較：

- Result quality
- Recipe capability
- Material efficiency
- Masterpiece eligibility

避免：

> Skill level 對實際結果幾乎沒有影響。

---

# 46. Build Validation

Crafted Gear 也要進 Phase4 已建立的 Combat Matrix。

比較：

```text
Legacy
Adventure Loot
Crafted Gear
Boss Gear
Masterpiece
```

但不要要求：

> Masterpiece 永遠全勝。

---

# 47. Healthy Reward Relationship

理想關係：

```text
Random Adventure Loot
= high uncertainty / discovery

Crafted Gear
= higher control / targeted build

Boss Gear
= exclusive identity

Masterpiece
= mastery achievement
```

不是單純：

```text
Common < Rare < Boss < Crafted < Masterpiece
```

線性 Power Ladder。

---

# 48. Save Schema

如果 Phase5 需要新增：

```text
Crafting Skill
Recipe Unlock
Craft Provenance
Masterpiece
```

必須：

- Incremental migration
- Legal defaults
- Legacy compatibility
- Idempotence
- Save/reload
- Deterministic preservation

---

# 49. Item Identity

Crafted Item 必須保持：

```text
instanceId
base
rarity
stats
affixes
owner
equipped state
```

若加入 provenance：

保存後必須完全一致。

---

# 50. Death / Succession

至少驗證一次：

> Crafter 死亡後世界不被重置。

檢查：

- Crafted items remain
- Masterpiece remains
- History remains
- Workshop / ownership obey existing succession rules

不要為 Phase5 重寫 Succession System。

---

# 51. Browser Flow

至少有一條 fresh-save / legal progression：

```text
Acquire material
↓
Access crafting
↓
Select recipe
↓
Select material
↓
Craft
↓
Inspect
↓
Compare
↓
Equip or Sell
↓
Save
↓
Reload
```

不能全部只靠 injected fixture 驗證。

Controlled fixtures 可以補 edge cases。

---

# 52. Agent Life Playtest

本輪執行：

> **30～60 分鐘 Life-focused Agent Playtest**

Agent 主要目標不是戰鬥。

觀察：

```text
What did it want to craft next?
Why?
Was material choice meaningful?
Was skill progression visible?
When did crafting become repetitive?
Did it save rare materials?
Did it pursue a Masterpiece?
Did crafting create another goal?
```

不得冒稱真人。

---

# 53. Hybrid Slice

Phase5 最重要的一條額外測試：

> Adventure → Life → Adventure

至少一次正常流程：

```text
Kill Wolf / Boss
↓
Receive material
↓
Craft targeted equipment
↓
Equip
↓
Return to combat
↓
Combat outcome changes
```

這條是 Phase5 關鍵驗收。

---

# 54. Browser Stress

Phase5 不預設 2 小時。

執行：

> **20～30 分鐘 Integrated Browser Stress**

內容：

```text
craft
material selection
inventory
equip
sell
save/reload
shop
combat
modal
skill progression
```

監控：

- heap
- DOM
- listeners
- storage
- save latency
- UI responsiveness

---

# 55. Existing Technical Findings

持續監控：

```text
C01 Export / Interleaving
C02 Journal Growth
C03 Detached DOM / Listener
```

不要因為 Phase5 順手大重構。

只有出現：

> 新 regression / clear worsening

才升級處理。

---

# 56. Extended Soak

只有：

- Save lifecycle 大改
- IndexedDB 大改
- Journal architecture 改動
- Renderer lifecycle 改動
- Memory trend 異常
- Short stress 出現 instability

才升級：

```text
60m
→ if necessary 120m
```

---

# 57. QA Routing

依：

`docs/agents/agent-routing.md`

使用：

```text
Low
→ exploration / runner / simulation / long tests

Medium
→ normal engineering / normal bug / review

Max
→ core crafting architecture / save migration / difficult bug / deep review

Sol
→ scope / architecture / gate
```

不要重新發明另一套 routing。

---

# 58. Recommended Implementation Order

嚴格依序：

```text
Phase5-A
Baseline / Material Economy
↓
Phase5-B
Crafting Data Model
↓
Phase5-C
Crafting Vertical Slice
↓
Phase5-D
Material Bias
↓
Phase5-E
Skill / Mastery
↓
Phase5-F
Masterpiece
↓
Phase5-G
Economy / Ownership Integration
↓
Phase5-H
Adventure × Life Hybrid
↓
Phase5-I
Balance
↓
Phase5-J
QA / Review
```

不要一次施工全部。

---

# 59. Phase5-A — Baseline

先量目前：

```text
Material income
Gold income
Equipment sell value
Material sell value
Current sinks
Current crafting-related skill/state
```

沒有 Baseline：

不要先改 Economy。

---

# 60. Phase5-B — Data Model

先建立：

- Recipes
- Craft context
- Material influence
- Skill requirements
- Crafted provenance

完成：

- serialization
- migration
- unit tests

再進 UI。

---

# 61. Phase5-C — Vertical Slice

先只完成：

> 一件 Weapon / Armor 完整 Craft Flow。

確認：

```text
material
→ craft
→ item instance
→ inventory
→ inspect
→ equip
→ save/reload
```

再擴 Recipe。

---

# 62. Phase5-D — Material Bias

至少使用：

> 2～3 種素材

建立可量測差異。

---

# 63. Phase5-E — Skill

完成：

```text
Craft
→ Skill progress
→ Capability change
```

不能只增加 XP bar。

---

# 64. Phase5-F — Masterpiece

先完成：

> 一條 Masterpiece 正常產生、保存、顯示、歷史流程。

不要大量新增 Legendary Content。

---

# 65. Phase5-G — Economy / Ownership

確認：

```text
Craft cost
Sell
Gold
Material
```

不產生無限套利。

若 Ownership 已存在：

做 Minimal Integration。

---

# 66. Phase5-H — Hybrid

正式完成：

```text
Adventure Material
→ Craft
→ Build
→ Adventure
```

這是 Phase5 最重要的 System Integration Gate。

---

# 67. Phase5-I — Balance

執行：

- Craft Monte Carlo
- Material Bias Simulation
- Skill Simulation
- Economy Simulation
- Combat Matrix
- Sell-value analysis
- Masterpiece distribution

---

# 68. Phase5-J — QA

至少：

```text
Full Regression
Typecheck
Production Build
Save / Migration
Determinism
Crafting Monte Carlo
Economy Simulation
Combat Comparison
Browser Regression
20–30m Stress
Life Agent Playtest
Hybrid Playtest
Independent Review
```

---

# 69. Human Validation

如果目前仍只是 Development Build：

```text
Human Product Gate:
DEFERRED / NOT APPLICABLE
```

如果本輪已部署 Human-testable Playtest Build，而且 Owner 明確要求真人驗證：

可以額外記：

```text
Human Product Findings
```

但：

> 真人覺得不好玩 ≠ Engineering Gate FAIL。

分開處理：

```text
Engineering correctness
vs
Product validation
```

---

# 70. Bugs vs Product Findings

保持分離。

Bug：

> Craft result 違反 Spec。

Product Finding：

> Crafting 正常運作，但太重複。

不要把 Product Finding 偷偷轉成：

> 免費提高 Masterpiece Rate。

---

# 71. Out of Scope

本輪禁止：

- Regional Crisis
- Civil Defense
- 50+ Monster expansion
- 100+ Item expansion
- Theme Packs
- Full Farming Expansion
- Cooking System
- Alchemy System
- Full Business Management
- Employee Management
- Production Automation
- Offline Crafting
- Full NPC Order System
- Furniture
- Housing Decoration
- Multi-settlement
- Kingdom
- Faction
- Magic System
- Dragon System
- V3

---

# 72. QA Artifacts

沿用既有 evidence structure。

至少保留：

```text
baseline.md
crafting-model.md
crafting-distribution.json
crafting-analysis.md
material-bias.json
skill-analysis.md
masterpiece-analysis.md
economy-analysis.md
hybrid-loop.md
browser-regression.md
browser-stress.md
agent-life.md
bugs.md
life-reward-findings.md
final-review.md
```

檔名依 repository convention 可調整。

不要建立平行 QA 系統。

---

# 73. Source Correlation

延續 Phase4 已建立的：

```text
source freeze
tested source hashes
delivery commit correlation
```

避免：

> base commit 與實際 working-tree source 混淆。

正式交付必須能回答：

> 「實際被測試的 source 最後對應哪個 delivery commit？」

---

# 74. Final Gates

Phase5 最終分開判定：

### Engineering Gate

`PASS / FAIL / PASS WITH FINDINGS`

### Crafting System Gate

確認：

```text
Material
→ Craft
→ Valid Item
```

完整成立。

### Material Meaning Gate

確認：

> 不同 Material 真正影響 Craft Decision / Result。

### Mastery Gate

確認：

```text
Practice
→ Skill
→ New Capability
```

成立。

### Economy Gate

確認：

> Crafting 不造成明顯 Money Printer 或 Resource Collapse。

### Adventure × Life Gate

確認：

```text
Adventure
→ Material
→ Crafting
→ Build
→ Adventure
```

成立。

### Life Reward Gate

確認：

> Crafting 行為能自然產生下一個生活目標。

### Human Gate

依當前部署狀態：

`DEFERRED / OPTIONAL PRODUCT FINDINGS`

不得假裝 Agent 是真人。

---

# 75. Phase5 Definition of Done

Phase5 不是：

> 有 Craft 按鈕。

必須至少證明一條正常世界流程：

```text
玩家透過正常世界取得素材。

玩家理解素材具有不同用途。

玩家選擇 Recipe 與 Material。

Crafting 使用既有 Procedural Equipment Pipeline。

產生合法且持久化的 Item Instance。

素材選擇實際影響結果機率。

玩家能比較、裝備或出售成果。

Crafting Skill 因實際行為成長。

Skill 成長至少解鎖一種新的 Capability。

高技能＋適當素材可以產生 Masterpiece。

Masterpiece 有可辨識 Identity，且 Save / Reload 後保持一致。

Crafting 不形成明顯無限 Gold 套利。

冒險取得的至少一種稀有素材能透過 Crafting 轉化成有意義的 Build Value。

Crafted Equipment 能實際改變後續 Combat Outcome。

死亡／Succession 不會抹除應持久存在的 Item / History。

V1 / V2 / Phase0–4 Regression 仍然通過。
```

---

# 76. Phase5 最重要的驗收問題

Final Review 必須用 Evidence 回答：

### Question 1

> **冒險取得的素材，現在是否真的因生活系統而變得更有價值？**

### Question 2

> **Crafting 是否提供了與隨機 Loot 不同的 Reward Fantasy，而不是另一個隨機掉寶按鈕？**

### Question 3

> **玩家是否能透過 Skill / Material / Recipe 選擇逐漸掌握結果，而不是純 Casino？**

### Question 4

> **Crafting 是否開始形成「Mastery → Ownership / Identity → 下一個人生目標」？**

### Question 5

> **Adventure → Life → Adventure 是否已形成真正雙向循環？**

如果以上可以由：

- Simulation
- Browser Runtime
- Save / Migration
- Agent Life Playtest
- Hybrid Playtest
- Independent Review

共同支持：

> **Phase5 可以 Gate。**

否則：

> 保留 Phase5，不要透過 Phase6 Crisis 或 Phase7 Content Expansion 掩蓋 Life Reward Loop 的問題。

---

# 77. Product Principle

本輪最重要的產品原則：

> **Adventure discovers value. Life transforms value.**

中文：

> **冒險把未知與資源帶回世界；生活把它們轉化成裝備、財富、技藝與人生。**

Phase5 完成後，Oakvale 不應只有：

> 「我打到了什麼？」

還應第一次真正出現：

> **「我能把得到的東西變成什麼？」**

以及：

> **「我能成為什麼樣的人？」**
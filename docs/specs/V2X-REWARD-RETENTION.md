# Oakvale V2.x — Reward & Retention

> Persistent Living Fantasy World RPG  
> 階段定位：**Core Depth / Reward / Retention**
>
> 本版本不是 V3。
>
> 核心問題：
>
> **「為什麼玩家會想再玩 5 分鐘、30 分鐘、下一個 Session？」**

---

# 0. 執行前提

目前 V2 已完成主要工程與 QA。

本階段不得重新設計 V2 核心，不得因新增內容破壞：

- Persistent World
- NPC Lifecycle
- Active Idle
- Identity
- Reputation
- Ownership
- Living Events
- Consequence
- Succession
- Save Migration
- World History

V2 視為：

> **Engineering Freeze**

只允許：

- P0 / P1 Bug
- Save Compatibility
- 明確 Performance Regression
- V2.x 必需的窄幅架構擴充

禁止以「重構比較漂亮」為理由重寫穩定核心。

---

# 1. V2.x 產品目標

V2 已證明：

> 世界會生活，玩家能在其中活一生。

V2.x 要證明：

> **這一生本身值得玩家持續玩下去。**

核心不是增加更多系統。

而是提升：

```text
Curiosity
Mastery
Progress
Ownership
Attachment
Anticipation
Reward
```

---

# 2. 兩條主要玩家路線

V2.x 必須同時服務：

## Adventure Mastery

核心幻想：

> **從普通人逐漸成為能探索未知、取得寶物、擊敗強敵，甚至成為傳說的人。**

核心 Loop：

```text
Explore
↓
Encounter
↓
Risk
↓
Combat
↓
Loot
↓
Build
↓
Deeper Unknown
↓
Legend
```

---

## Life Mastery

核心幻想：

> **從普通居民逐漸建立技藝、財產、事業與影響力，成為世界不可或缺的人。**

核心 Loop：

```text
Labor
↓
Skill
↓
Mastery
↓
Ownership
↓
Automation
↓
Influence
↓
Legacy
```

---

# 3. 平行設計原則

兩條路線：

> **Reward Density 要接近。**

但：

> **Reward Type 不需要相同。**

Adventure 主要依賴：

- Unknown
- Risk
- Loot
- Build
- Boss
- Push Your Luck

Life 主要依賴：

- Progress
- Mastery
- Ownership
- Leverage
- Recognition
- Attachment
- Legacy

禁止用：

> 「五星小麥 = Legendary Sword」

這類假對稱設計。

---

# 4. V2.x 第一優先：Content Expansion

目前內容量不足以支撐長期 Reward Loop。

本階段最低要求：

```text
新增怪物 ≥ 50
```

並使完整怪物總池具有足夠 Family 差異。

物品／裝備：

```text
新增 ≥ 100
```

包含 Base Item、素材、消耗品、特殊物品等。

不是要求手工寫 100 件完全固定裝備。

Procedural Gear 產生的 Variant 不直接計入「100 Base Content」。

---

# 5. Monster Content Budget

建議：

```text
普通怪       35～40
Elite         12～15
Mini Boss     8～12
Boss          6～8
Rare Monster  少量
```

總體至少：

> 50+ 可辨識 Monster Definitions。

---

# 6. Monster Family

怪物不可全部散裝。

至少建立數個 Family，例如：

```text
Slime
Beast
Goblin
Cave / Insect
Undead
Construct / Golem
Aberration / Magical Creature
```

每個 Family 應具有：

- 戰鬥風格
- 區域偏好
- Loot Identity
- Threat Identity
- Elite / Boss 升級空間

---

# 7. Monster Combat Role

每隻怪至少具有一個真正 Gameplay Role：

```text
Bruiser
Fast
Tank
Ranged
Support
Debuff
Summoner
Ambusher
Controller
Special
```

禁止：

```text
Wolf Lv3
Wolf Lv5
Wolf Lv7
```

只改 HP / ATK。

如果新怪物的存在理由只有：

> 數值更高

則不應加入。

---

# 8. Procedural Monster System

怪物採：

> **Controlled Randomness**

不是完全 Roguelike 隨機。

基本模型：

```text
Base Monster
+
Variant
+
Trait
+
World Modifier
```

---

# 9. 普通怪隨機程度

普通怪保持高度辨識度。

建議：

```text
80～90% Base Identity
10～20% Procedural Variation
```

普通怪：

```text
0～1 Trait
```

例如：

```text
Gray Wolf
```

可能：

```text
Hungry
Aggressive
Old
Scarred
```

但不應每隻普通狼都有三四個 Affix。

---

# 10. Elite

Elite 是主要隨機戰鬥挑戰。

建議：

```text
1～2 Affix
```

例如：

```text
Swift
Armored
Vampiric
Poisonous
Frenzied
Pack Leader
Regenerating
Berserker
```

名稱必須可讀：

```text
迅捷的灰狼
裝甲哥布林
吸血巨蛛
```

玩家應能從名稱預判部分能力。

---

# 11. Mini Boss

Mini Boss：

```text
Fixed Core Mechanic
+
2～3 Traits
```

例如 Goblin Captain：

固定：

- War Cry
- Reinforcement
- 高防禦

Variant：

- Fire
- Berserker
- Poison
- Tactical
- Armored

保持：

> 可辨識身份 + 不同世界變化。

---

# 12. Boss

Boss 不採完全 Random Generation。

必須：

> **Boss Archetype + Controlled Variant**

Boss 的：

- Identity
- Core Skills
- Combat Rhythm
- Family
- Loot Identity

固定。

隨機：

```text
Variant
1～2 Boss Traits
World Modifier
```

---

# 13. Boss Content Minimum

V2.x 至少建立：

```text
6～8 Boss Archetypes
```

可考慮：

```text
Goblin Warlord
Great Wolf King
Cave Broodmother
Mountain Troll
Ancient Golem
Mine Wraith
```

實際名稱與內容依專案風格調整。

禁止因此直接製作完整 Theme Expansion。

---

# 14. Boss Formation

Boss Variant 不應只有純 RNG。

優先支援：

```text
World State
+
Threat History
+
Player Intervention
+
Seeded RNG
```

決定 Boss 最終形態。

例如：

玩家長期不干涉哥布林補給：

```text
資源充足
↓
Armored Warlord 權重提高
```

玩家破壞補給：

```text
資源不足
↓
Starved / Berserk Variant
```

這是：

> Consequence-driven Randomness。

---

# 15. 未來 Theme System

本版只建立相容架構。

不要完整開發：

```text
Goblin Warband Pack
Undead Pack
Dragon Pack
```

但資料模型應預留：

```text
Monster Family
Boss Archetype
Region Compatibility
Loot Pool
Event Hooks
Theme Tags
```

讓未來可以新增：

> 一個世界可能性

而不用重寫 Simulation。

---

# 16. Equipment / Loot 核心

本階段最重要的 Reward Engine：

> **Procedural Equipment**

基本模型：

```text
Base Item
+
Item Level
+
Material
+
Rarity
+
Prefix
+
Suffix
+
Special Trait
+
Seeded RNG
```

---

# 17. Equipment Base Types

不要只增加大量固定武器。

建立合理 Base：

例如：

```text
Short Sword
Long Sword
Great Sword
Dagger
Axe
Battle Axe
Hammer
War Hammer
Spear
Bow
Staff Base
```

防具：

```text
Light
Medium
Heavy
```

搭配有限 Slot。

不要本版突然增加：

```text
10～15 equipment slots
```

---

# 18. Rarity

最低建議：

```text
Common
Uncommon
Rare
Epic
Legendary
```

可預留：

```text
Masterpiece
```

給 Craftsmanship。

---

# 19. Rarity 不只是倍率

禁止：

```text
Rare = ATK × 1.2
Epic = ATK × 1.5
```

主要差異應是：

```text
Affix Count
Affix Tier
Special Trait Eligibility
Unique Eligibility
```

例如：

```text
Common      0～1
Uncommon    1～2
Rare        2～3
Epic        3～4
Legendary   3～5 + Unique possibility
```

實際數值依 balance 測試調整。

---

# 20. Affix Pool

每個 Item Category 都有自己的 Allowed Affix Pool。

Sword：

```text
Attack
Critical
Attack Speed
Bleed
Armor Penetration
Element Damage
Beast Damage
Life on Kill
```

Armor：

```text
Defense
HP
Resistance
Block
Dodge
Damage Reduction
Status Resistance
```

Accessory：

可以較自由。

禁止毫無邏輯的：

```text
Great Sword
+Farming Yield
+Shop Discount
```

除非未來有明確 Hybrid Item。

---

# 21. Equipment Affix Quality

同一 Affix 可以有 Tier。

例如：

```text
Critical +2%
Critical +5%
Critical +9%
Critical +13%
```

但不要造成：

> 大量純垃圾裝備。

需要：

- Minimum useful floor
- Item-level scaling
- Rarity weighting
- Smart filtering

---

# 22. Boss Loot

Boss 採：

> **Theme-specific / Family-specific Loot Pool**

例如 Wolf Boss：

```text
Wolf Fang
Moon Hide
Hunter Charm
Wolf Weapon Base
Beast Affix Material
```

然後裝備仍進行 Procedural Roll。

所以玩家知道：

> 打這隻 Boss 有目的。

但不知道：

> 最後掉什麼品質。

---

# 23. Monster-specific Material

移除：

```text
所有怪物 → 怪物素材 +1
```

作為主要 Loot 模式。

至少加入：

```text
Wolf Hide
Wolf Fang

Goblin Scrap
Goblin Emblem

Spider Silk
Venom Sac

Golem Core
Stone Crystal

Undead Essence
Bone Fragment
```

不一定每隻怪完全獨立素材。

可以以 Family 共用。

---

# 24. Rare Materials

至少建立：

```text
10～15
```

真正有用途的 Rare Materials。

例如：

```text
Star Silver
Ancient Core
Soul Crystal
Moon Stone
Black Iron
```

全部必須：

> 對 Crafting / Build / Trade / Collection 有實際用途。

---

# 25. Controlled Crafting RNG

Crafting 不應是：

```text
press button
→ random item
```

而應：

```text
Base
+
Material
+
Crafter Skill
+
Technique
+
World / Item Context
+
RNG
```

---

# 26. Material-biased RNG

玩家應可以：

> 影響隨機方向。

例如：

```text
Wolf Fang
→ Bleed / Beast Affix Weight ↑

Star Silver
→ Crit / Speed Weight ↑

Ancient Core
→ Special Trait Chance ↑
```

核心：

> **Player-influenced Randomness**

而不是完全 Casino。

---

# 27. Masterpiece

Life Mastery 的重要 Jackpot。

高技能／特殊素材／工法可能產生：

```text
Masterpiece
```

具有：

- 高品質
- 特殊 Trait
- Crafter Name
- Creation Year
- World History Identity

例如：

```text
「白銀之月」

Maker: Marcus
Year: 23
```

物品應保留：

> Provenance。

---

# 28. Item Provenance

特殊裝備可以記錄：

```text
createdBy
createdAt
bossSource
materialSource
previousOwner
notableEvent
```

不要所有普通物品都保存完整歷史。

只有：

- Legendary
- Masterpiece
- Unique
- Major Relic

才需要。

---

# 29. Collection / Discovery

新增輕量 Collection。

可以記：

```text
Monster Seen
Monster Defeated
Item Discovered
Material Discovered
Boss Defeated
Rare Item Found
```

目的：

> Curiosity / Completion。

不要做成強制 Daily Checklist。

---

# 30. Adventure Reward Loop

最終應成立：

```text
Explore
↓
Monster Variant
↓
Risk
↓
Loot
↓
Evaluate Item
↓
Build Decision
↓
Craft / Equip / Sell
↓
Stronger or Different Build
↓
Deeper Exploration
```

---

# 31. Push Your Luck

Dungeon / Expedition 應逐步加入：

```text
已取得 Loot
剩餘 HP
同行者狀況
消耗品
未知區域
```

讓玩家選：

```text
Withdraw
or
Continue
```

不要一次做 Hardcore Survival。

但必須形成：

> 「再深入一點？」

---

# 32. Life Content 強化原則

Life 不是：

```text
更多 chores
```

禁止因增加內容直接新增：

- 30 種每日作物
- 50 種家具
- 大量木材 grind
- 每日補貨清單

---

# 33. Life Progression

所有主要生活路線應逐步從：

```text
Manual Labor
```

進入：

```text
Skill
↓
Mastery
↓
Ownership
↓
Automation
↓
Decision
↓
Influence
```

玩家不能永遠做低階重複工作。

---

# 34. Farming

農業不用 50 種 Crop。

本版建議：

```text
10～15 種
```

但每種必須有 Gameplay Identity。

例如：

```text
Wheat
→ staple food

Potato
→ high yield / crisis reserve

Herb
→ medicine

Berry
→ adventure supply

Rare Plant
→ crafting
```

禁止只是：

```text
cropA = food +5
cropB = food +7
```

---

# 35. Gathering

採礦／伐木必須有：

```text
Common Resource
Rare Discovery
Special Resource
World Use
Crafting Use
```

但不要強迫玩家：

> 每天採 500 個材料。

高階階段可：

```text
Mining Rights
Worker
Supply Contract
```

讓低階勞動自動化。

---

# 36. Life Reward

Life 玩家主要 Reward：

```text
Mastery Breakthrough
Ownership
Automation
Large Order
Special Customer
World Recognition
Economic Leverage
NPC Dependency
Legacy
```

---

# 37. Regional Crisis & Civil Defense

這是 V2.x 重要連接器。

Monster Crisis 不能：

```text
Boss Power vs Player Power
```

而是：

```text
Regional Resistance
=
Guards
+ Adventurers
+ Equipment
+ Food
+ Medicine
+ Money
+ Fortification
+ Morale
+ External Support
+ Player Contribution
```

---

# 38. Adventure Contribution

Adventure Player：

```text
Scout
Hunt
Destroy Camp
Rescue
Dungeon
Elite
Boss
```

可直接：

> 改變危機。

---

# 39. Life Contribution

Life Player：

```text
Food
Equipment
Medicine
Funding
Logistics
Defense
Evacuation
```

不能要求：

> 最後還是自己打 Boss。

---

# 40. Crisis Balance

避免兩個極端：

### NPC 太強

```text
玩家完全不必介入
```

Adventure 失去價值。

### NPC 太弱

```text
不當戰士就必定滅村
```

Life 自由是假象。

目標：

> 世界可以自己處理，但玩家介入會明顯改變結果。

---

# 41. Settlement Failure

區域被擊敗：

不得直接：

```text
GAME OVER
```

可以：

```text
damage
shutdown
evacuation
occupation
abandonment
recovery
rebuild
```

重大失敗：

> 轉化成新的世界狀態。

---

# 42. Reward Timeline

玩家不同時間尺度都要有下一個期待。

### Seconds / Minutes

```text
Combat hit
Drop
Craft result
Interaction feedback
```

### 10～30 Minutes

```text
Item upgrade
Elite
Order
Skill breakthrough
Small Event
```

### 1～3 Hours

```text
Build forms
Boss
Ownership progress
Business growth
Important NPC event
```

### Multiple Sessions

```text
Event Arc
NPC Career
Major Property
Long-term Threat
```

### Lifetime

```text
Legacy
History
Successor
World Change
```

---

# 43. Retention Hole Detection

正式定義：

## Reward Drought

很久沒有值得注意的回饋。

## Goal Drought

玩家不知道下一步幹嘛。

## Repetition Wall

知道幹嘛，但只是在重複同一操作。

## Meaningless Reward

拿到東西，但：

> 沒有用途。

## Choice Collapse

看似很多玩法，但只有一種路徑最合理。

開發與 QA 都要找這五種問題。

---

# 44. Data-driven Requirement

以下全部不得硬寫在 UI：

```text
Monster
Monster Trait
Boss
Boss Variant
Item Base
Rarity
Affix
Material
Loot Pool
Crop
Craft Recipe
```

建立 Data-driven registry。

---

# 45. Suggested Data Architecture

概念：

```text
MonsterDefinition
MonsterFamily
MonsterTraitDefinition

BossDefinition
BossVariantDefinition

ItemBaseDefinition
AffixDefinition
RarityDefinition

MaterialDefinition
LootTableDefinition

CropDefinition
RecipeDefinition
```

保持 Simulation 純 TypeScript。

Vue 不得決定核心規則。

---

# 46. RandomService

所有 Procedural Content 必須：

```text
RandomService
worldSeed
rngState
```

禁止：

```text
Math.random()
```

散落。

---

# 47. Save Compatibility

新增 Procedural Gear 後，Save 必須保存：

```text
instanceId
baseId
rarity
rolledStats
affixes
specialTrait
provenance
```

不能只保存：

```text
itemId: sword
```

---

# 48. V2 Save Migration

現有 V2 Save 必須可升級。

舊：

```text
sword: quantity
```

若現有資料模型需要轉換：

不得直接刪除。

可以轉換成：

```text
legacy deterministic instance
```

保留原有裝備效果。

Migration 必須：

- deterministic
- idempotent
- testable
- lossless within old semantics

---

# 49. Inventory Architecture

Procedural Equipment 不宜全部使用：

```text
Record<ItemId, number>
```

普通 stackable item：

```text
quantity
```

Procedural equipment：

```text
unique instances
```

需要明確分開。

---

# 50. 不要把所有物品 unique-instance 化

例如：

```text
Wood ×50
Potion ×8
```

繼續 stack。

只有：

```text
rolled equipment
masterpiece
unique
relic
```

使用 instance。

避免 Save 膨脹。

---

# 51. Item Generation

必須提供單一：

```text
generateItem(...)
```

或同等 domain API。

輸入：

```text
base
source
level/context
materials
seed/rng
```

輸出：

> deterministic ItemInstance。

不要在 Combat、Crafting、Boss 各自實作不同 Random 邏輯。

---

# 52. Loot Table

建立：

```text
LootTable
```

至少支援：

```text
guaranteed
weighted
rare
conditional
boss-specific
```

避免掉落邏輯散落在 Combat Engine。

---

# 53. Balance Simulation

新增：

> Monte Carlo / deterministic sampled balance runner。

至少可以模擬：

```text
10,000+
loot rolls
```

檢查：

- rarity distribution
- affix distribution
- useless roll rate
- legendary rate
- boss-exclusive rate
- material availability
- expected progression

不要靠真人刷 10,000 次。

---

# 54. Monster Balance Simulation

對：

```text
normal
elite
mini boss
boss
```

進行大量 deterministic fights。

追蹤：

```text
win rate
damage
turn count
healing usage
death rate
reward
```

---

# 55. Build Diversity Test

至少建立幾個代表 Build：

```text
Fast Crit
Tank
Bleed
Raw Damage
Defensive
```

若 V2.x 實際內容支援。

確認：

> 不會只有一種 Build 完全碾壓。

---

# 56. Development Workflow

不得一次把所有 50+ 怪物與 100+ 物品塞完再測。

依以下 Phase。

---

# Phase 0 — Baseline / Freeze

完成：

- 記錄 V2 source SHA
- 全量 V2 regression
- 建立 V2.x branch/ticket
- 保存 V2 QA baseline
- 不修改產品功能

Gate：

> baseline clean。

---

# Phase 1 — Data Model

先建立：

```text
MonsterFamily
MonsterTrait
BossVariant
ItemBase
Rarity
Affix
ItemInstance
LootTable
Material
```

完成 migration。

只使用少量 fixture。

例如：

```text
3 monsters
2 elite traits
1 boss
5 items
```

Gate：

- tests
- migration
- determinism
- save/load

---

# Phase 2 — Procedural Equipment Vertical Slice

只做：

```text
3～5 weapon bases
2 armor bases
few affixes
rarity
loot
```

完成：

```text
kill
↓
drop
↓
inspect
↓
equip
↓
save
↓
reload
```

完整 Vertical Slice。

Gate：

> Loot Loop genuinely works。

---

# Phase 3 — Monster Variant Vertical Slice

先做一個 Family，例如：

```text
Wolf
```

包括：

```text
normal
variants
elite
mini boss
boss
```

驗證：

```text
Base Identity
+
Controlled Randomness
```

Gate：

> 每種遭遇可以辨識但不是完全相同。

---

# Phase 4 — Adventure Reward Loop

串：

```text
Explore
Monster
Elite
Boss
Loot
Build
Craft
Re-enter
```

先不要增加 50 隻怪。

先確認：

> 核心 Loop 好玩且有技術閉環。

---

# Phase 5 — Life Reward Vertical Slice

選：

```text
Craftsmanship
```

作為第一條完整生活深度。

完成：

```text
material
craft
quality
masterpiece
world usage
```

必要時加：

```text
blacksmith / workshop
```

但不要此 Phase 同時做完整農商礦三系。

---

# Phase 6 — Crisis Integration

讓：

```text
equipment
food
money
adventurer action
```

真正影響 Regional Crisis。

測：

```text
Adventure
Life
Hybrid
```

三條策略。

---

# Phase 7 — Content Expansion

架構穩定後才大量加入：

```text
50+ Monsters
100+ Items
6～8 Boss
12～15 Elite
10～15 Crops
10～20 Rare Materials
```

Content 應主要是 Data。

不要新增一個怪就改 Engine。

---

# Phase 8 — Balance

執行：

```text
Loot Monte Carlo
Combat Simulation
Economy Simulation
Crisis Simulation
Build Comparison
```

調整：

- drop rate
- rarity
- stats
- boss difficulty
- material supply
- prices

---

# Phase 9 — UI / UX Polish

完成：

- Loot presentation
- rarity readability
- affix readability
- compare equipment
- Collection
- monster trait display
- Boss warnings
- Craft result

保持：

> World First。

不要變 Inventory Spreadsheet Simulator。

---

# Phase 10 — Reward / Retention QA

進行：

```text
Adventure Playtest
Life Playtest
Hybrid Playtest
```

專門找：

- Reward Drought
- Goal Drought
- Repetition Wall
- Meaningless Reward
- Choice Collapse

---

# 57. QA Policy

這一版不要預設再跑 2 小時 Browser Soak。

---

# 58. 日常 QA

每個 Phase：

```text
unit
integration
typecheck
build
determinism
relevant browser regression
```

---

# 59. Browser QA

大型功能完成：

> 10～15 分鐘 targeted browser regression。

整合階段：

> 20～30 分鐘 high-density browser stress。

包括：

```text
combat
loot
inventory
equipment
craft
save
reload
modal
world time
boss
```

---

# 60. Long-term

Engine：

```text
10
50
100 years
```

Multi-seed。

Browser 不負責證明 100 年世界。

---

# 61. Memory / DOM Test

使用：

```text
repeated cycles
```

例如：

```text
modal ×100
inventory/equipment ×100
combat loops
save/load loops
```

比較：

```text
heap
DOM
listeners
storage
```

如果有線性 growth，再升級長 soak。

---

# 62. Extended 2h Soak

只有：

- Game Loop 改動
- Save / Journal 改動
- IndexedDB 改動
- Renderer lifecycle 大改
- 短測疑似 Leak
- Release milestone

才執行。

不要每 Phase 固定執行。

---

# 63. Token / Agent Cost Control

所有長測：

> runner-driven。

不要 LLM 陪跑。

Runner 自動：

```text
execute
↓
write JSON/CSV
↓
finish
```

Codex 只在：

```text
start
finish
failure
summary
```

分析。

長測 stdout/stderr 寫入 artifact。

---

# 64. Human Fun Gate

V2 的 Human Fun Gate 仍然保留。

但不阻止 V2.x 工程開發。

V2.x 開發完成後要重新做一次：

> Reward / Retention Human Test。

重點增加：

```text
哪個時刻第一次想「再做一下」？
哪個 Loot 最有感？
哪個目標最期待？
哪個階段開始覺得重複？
生活／冒險哪條比較有吸引力？
```

---

# 65. Success Metrics

V2.x 不以：

```text
50 monsters added
100 items added
```

作為成功。

必須：

### Adventure

玩家能回答：

> 「我下一個想找什麼／打什麼／得到什麼？」

### Life

玩家能回答：

> 「我下一步想把自己的生活／事業變成什麼？」

### World

玩家能回答：

> 「我想知道這個世界接下來會發生什麼。」

---

# 66. Content Quality Gate

每個 Monster 必須至少具有：

```text
combat identity
or
loot identity
or
world role
```

最好兩項以上。

每個 Item 必須至少具有：

```text
build
crafting
consumption
trade
collection
world use
```

其中一項。

純湊數內容拒絕。

---

# 67. V2.x Non-goals

不要開始：

- V3
- Multi-settlement
- Kingdom Simulation
- Full Faction System
- Large World Map
- Full Magic System
- Dragon World Entity
- Politics
- War Simulation
- Romance
- Family Tree
- Multiplayer
- MMO
- PvP
- Raid
- Player Guild
- LLM NPC
- AI Quest Generation
- Full Theme Pack System
- 50 Furniture
- Daily Login
- Daily Quest
- Offline Reward
- Battle Pass
- FOMO mechanics

---

# 68. Theme Ecosystem Roadmap

本版只記錄。

未來 Theme Pack 可能：

```text
Goblin Warband
Moonfang Hunt
Ancient Mine
Hollow Dead
Spider Brood
Dragon Awakening
```

每一 Pack 可包含：

```text
Monster
Elite
Mini Boss
Boss
Region Effects
Dungeon
Loot
Materials
Events
Life Economy Effects
```

但本版不得自行全面實作。

---

# 69. Technical Backlog from V2 QA

保持追蹤：

```text
Journal Growth
DOM / Listener Retention
Export Interleaving
P3 UI hints
```

除非：

> V2.x 導致明顯 Regression。

否則不因這些項目先做大重構。

---

# 70. Required Tests

最低新增：

```text
item generation determinism
rarity roll
affix eligibility
affix tier
loot table
boss loot
monster trait
elite trait
boss variant
material bias
crafting generation
item instance save
item instance reload
legacy migration
stackable vs instance inventory
collection discovery
```

---

# 71. Regression

V1 / V2 existing regression 必須保留：

- world
- NPC
- lifecycle
- farming
- gathering
- economy
- combat
- dungeon
- party
- threat
- boss
- succession
- save
- migration
- Active Idle
- Identity
- Reputation
- Ownership
- Living Events

---

# 72. 最終 QA 報告

完成後至少輸出：

```text
baseline
architecture
content-summary
loot-balance
monster-balance
economy-balance
crisis-balance
browser-stress
long-term
performance
agent-adventure
agent-life
agent-hybrid
retention-audit
bugs
final-review
```

沿用 repository 既有 QA 結構。

不要建立完全不同格式。

---

# 73. Final Review 必須分開

### Engineering Gate

```text
PASS / FAIL / PASS WITH FINDINGS
```

### Content Gate

50+ Monster / 100+ Items 是否達標。

### Reward Gate

Adventure / Life 是否有完整回饋循環。

### Balance Gate

是否存在明顯壓倒性策略／垃圾掉落海。

### Retention Gate

是否存在明顯：

```text
Reward Drought
Goal Drought
Repetition Wall
```

### Human Gate

仍然需要真人驗證。

---

# 74. Definition of Done

V2.x 完成不是：

> 新增 50 隻怪。

而是至少可以出現：

```text
玩家探索森林。

遇到一隻帶特殊 Trait 的 Elite。

取得以前沒看過的 Rare Material。

回到 Oakvale。

利用素材打造一件具有隨機能力的裝備。

這件裝備形成新的 Build。

玩家因此可以挑戰以前不敢碰的 Boss。

Boss 本身因為這個世界之前的發展，
具有不同 Variant。

Boss 掉落新的特殊素材。

玩家可以選擇：
繼續強化 Adventure，
或把素材交給 Life / Crafting 系統。

另一方面，
生活型玩家即使不親自打 Boss，
也能透過工坊、資源、經濟與防禦
真正影響這場危機。

多年後，
裝備、Boss、玩家事業與事件
仍存在於世界歷史。
```

---

# 75. 最終產品原則

不要把 Oakvale 做成：

> Diablo + Stardew Valley。

也不要做成：

> Combat 系統與 Life 系統互不相關。

真正目標是：

```text
Adventure discovers value.
Life transforms value.
World gives that value meaning.
```

中文：

> **冒險把未知帶回世界。**
>
> **生活把未知轉化成文明、財富與人生。**
>
> **世界記住兩者造成的結果。**

---

# 76. Codex 執行原則

不要一次直接完成全部 Scope。

必須：

```text
Phase
↓
implement
↓
tests
↓
review
↓
gate
↓
next phase
```

如果 Vertical Slice 不成立：

> 停止擴充 Content。

不要用增加 50 個資料條目掩蓋核心 Loop 問題。

若發現：

- 架構無法安全支援
- Save Migration 有重大風險
- Adventure / Life 明顯失衡
- Procedural System 造成垃圾內容氾濫

先回報：

```text
finding
evidence
impact
recommended fix
```

再處理。

---

# 77. 第一個實際施工目標

先只執行：

> **Phase 0 → Phase 3**

也就是：

```text
Baseline
↓
Data Model
↓
Procedural Equipment Vertical Slice
↓
Monster Variant Vertical Slice
```

不要第一個 PR 就加入：

```text
50 Monsters
100 Items
```

先證明：

> **程序裝備與程序怪物的 Core Loop 正確。**

確認後才進入：

> Adventure Reward → Life Reward → Crisis → Content Expansion。

---

# 78. 本階段一句話任務

> **不是做更多內容，而是建立一套能讓「更多內容持續產生遊玩價值」的 Reward & Retention Engine。**
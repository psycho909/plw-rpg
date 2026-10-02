# Persistent Living World RPG — V1 開發規格書

## 0. Codex 任務

建立一款 V1 瀏覽器遊戲原型。

核心不是完成大量內容，而是驗證以下體驗是否成立：

> 玩家可以自由生活在這個世界，但世界不會停下來等玩家。
> 玩家、NPC、村莊、怪物、地下城與世界時間會一起持續變化。

V1 必須優先完成 Simulation Core、世界時間、主角操作、NPC 自主行動、聚落成長與怪物威脅成長。

不得自行擴張需求至大型 RPG。

---

# 1. 遊戲定位

類型：

**Persistent Living World RPG**

中文定位：

**持續演化型開放世界生活 RPG**

遊戲感受參考：

```text
GTA
→ 自由決定今天要做什麼

勇者鬥惡龍
→ 等級、能力、裝備、怪物、地下城、冒險

牧場物語
→ 種田、採集、工作、生活、時間

模擬人生
→ 世界時間、NPC 生活、年齡、人生變化

World Simulation
→ 村莊、怪物勢力、世界狀態會自行演化
```

不是 Clone，不需複製任何遊戲內容或介面。

---

# 2. V1 最核心設計原則

整個專案遵守：

> 玩家只直接控制一名角色。

> NPC 不是玩家棋子。

> NPC 有自己的活動。

> 世界時間永遠是所有系統的共同基準。

> 玩家不處理某件事情，不代表它會停下來。

> 世界變化不必全部圍繞玩家。

> Graphics < Systems。

---

# 3. V1 必須呈現的核心體驗

玩家從：

```text
Year 1
Age 16
Lv.1

🏘 小型村莊
👥 30 人

🌲 北方森林
Threat Lv.1
```

經過遊戲時間後，可以變成：

```text
Year 12
Age 27
Lv.18

🏘 大型村莊
👥 67 人

🍺 新酒館
⚒ 新鐵匠鋪
🕳 地下城已發現

🌲 北方森林
Threat Lv.3

👹 Goblin Chief appeared
```

而且這些改變不能全部是玩家按 Upgrade 造成。

---

# 4. 玩家身份

玩家是一名真正存在於世界中的角色。

不是：

```text
God
Mayor
Village Manager
```

初始是：

```text
普通居民
```

玩家只能直接操作自己。

可以：

```text
走路
探索
工作
種田
採集
砍樹
挖礦
打怪
進地下城
購物
住宿
去酒館
聘請傭兵
裝備物品
休息
```

V1 禁止：

```text
直接控制 NPC
任意切換 NPC
直接指定所有 NPC 工作
直接控制村莊建設
直接控制怪物
```

---

# 5. 技術方向

若 Repository 為空，建立：

```text
Vue 3
TypeScript
Vite
Pinia
SCSS
Vitest
```

遊戲呈現使用：

```text
DOM
CSS Grid
Emoji
Unicode
ASCII
Text
```

V1 不使用：

```text
Canvas
WebGL
Three.js
Unity
Phaser
PixiJS
LLM
AI API
後端 Server
多人連線
```

---

# 6. 視覺原則

不追求華麗畫面。

例如世界：

```text
🌊🌊🌊🌊🌊🌊🌊
🌊🌲🌲⛰️❓🌊🌊
🌊🌲🏘️🌾⛏️🌊🌊
🌊🌲🐺🌲🪨🌊🌊
🌊🌲👺🕳️🌲🌊🌊
🌊🌊🌊🌊🌊🌊🌊
```

角色：

```text
🙂 Player
👨‍🌾 Farmer
⚒ Smith
🛡 Guard
🧙 Mage
```

怪物：

```text
🟢 Slime
🐺 Wolf
👺 Goblin
👹 Boss
```

未來可以替換 Pixel Sprite，因此 Emoji 不得寫入 Domain Logic。

---

# 7. 核心架構

Simulation Engine 必須與 Vue 完全分離。

建議：

```text
src/

  domain/
    character/
    npc/
    world/
    settlement/
    combat/
    monster/
    threat/
    dungeon/
    farming/
    inventory/
    equipment/
    economy/

  engine/
    gameLoop.ts
    simulation.ts
    calendar.ts
    scheduler.ts
    random.ts
    events.ts

  data/
    characters.ts
    npcs.ts
    monsters.ts
    regions.ts
    items.ts
    equipment.ts
    crops.ts
    jobs.ts
    buildings.ts
    threat.ts

  stores/
    gameStore.ts
    uiStore.ts

  services/
    saveService.ts

  presentation/
    icons.ts

  views/
  components/
```

禁止：

```text
Vue Component 直接執行世界模擬
Component 直接計算怪物成長
Component 直接修改 NPC 年齡
```

---

# 8. World Timeline

世界必須存在唯一時間軸。

至少包含：

```text
Year
Season
Day
Hour
Minute
```

V1 季節：

```text
Spring
Summer
Autumn
Winter
```

建議：

```text
30 Days / Season
120 Days / Year
```

數值必須可設定。

遊戲速度：

```text
Pause
x1
x5
x20
```

Simulation 不得綁 FPS。

使用：

```ts
simulate(gameMinutes)
```

---

# 9. 世界時間必須真正影響系統

以下至少受到時間影響：

```text
角色年齡
NPC 日程
農作物
怪物勢力
Dungeon Threat
村莊成長
傭兵契約
商店營業時間
世界事件
```

---

# 10. 主角角色資料

```ts
Character {
  id
  name

  birthYear
  age
  lifeStage

  level
  exp

  hp
  maxHp

  stamina
  maxStamina

  stats {
    strength
    vitality
    dexterity
    intelligence
  }

  skills {
    combat
    farming
    mining
    woodcutting
  }

  gold

  inventory
  equipment

  position
  currentRegion

  status
}
```

---

# 11. 角色成長

主角透過：

```text
戰鬥
工作
採集
種田
探索
```

取得：

```text
Character EXP
Skill EXP
```

例如：

```text
Mining Lv.1
↓
Mining Lv.8
```

熟練度必須影響活動效率。

V1 不做 Skill Tree。

---

# 12. 年齡與衰老

V1 必須實作。

生命階段：

```text
Child       0–14
Young       15–24
Adult       25–49
MiddleAge   50–64
Elder       65+
```

玩家初始：

```text
Age 16+
```

V1 Modifier 保持簡單。

例如：

```text
Young
Stamina +5%

Adult
Normal

MiddleAge
Stamina -5%

Elder
Stamina -15%
```

所有數值放 Config。

---

# 13. 死亡與世界延續

NPC 可以自然死亡。

玩家角色未來也會死亡。

V1 需要保留架構：

```ts
isAlive
deathYear
deathCause
```

如果玩家死亡：

```text
世界不可 Reset。
```

提供簡化：

```text
Choose Successor
```

可從成年 NPC 候選人中選擇新的操作角色。

V1 不做家族遺傳。

核心要求：

> 角色死亡，世界仍繼續存在。

---

# 14. NPC 系統

NPC 必須是 Autonomous Entity。

每個 NPC 至少：

```ts
NPC {
  id
  name

  age
  lifeStage

  level
  stats
  skills

  job

  home
  workplace

  currentActivity
  position

  schedule

  isAlive
}
```

---

# 15. NPC V1 日程

至少支援：

```text
Sleep
Work
Leisure
Travel
```

例如：

```text
07:00 Wake
08:00 Work
12:00 Break
13:00 Work
17:00 Finish
18:00 Leisure
22:00 Sleep
```

NPC 不需要複雜 AI。

使用：

```text
Schedule + State Machine
```

即可。

---

# 16. NPC 世界自主性

玩家站著不動時：

NPC 仍應：

```text
上下班
移動
工作
休息
變老
升級部分技能
死亡
```

遊戲不能只有玩家動時世界才動。

---

# 17. NPC 人口變化

V1 採簡化 Population Simulation。

需要：

```text
Birth
Natural Death
Immigration
```

V1 不做：

```text
戀愛
結婚
家族樹
親子遺傳
```

出生條件可簡化為：

```text
Population Capacity
Food Stability
Settlement Prosperity
```

符合條件後產生新 Child NPC。

---

# 18. Settlement

V1 一個主要聚落即可。

階段：

```text
Hamlet
↓
Village
↓
Town
```

不要使用：

```text
玩家按 Upgrade
```

作為唯一成長方式。

---

# 19. Settlement Growth

聚落透過世界模擬累積 Growth。

至少受：

```text
Population
Food
Prosperity
Safety
Infrastructure
```

影響。

例如：

```ts
growthScore =
populationFactor +
prosperityFactor +
safetyFactor +
resourceFactor
```

達到條件後：

```text
Hamlet → Village
```

---

# 20. 聚落成長結果

升級後可以：

```text
出現新建築
增加人口上限
增加 NPC
改善商品
出現更強傭兵
增加服務
```

例如：

```text
Hamlet
🏠
🌾
🏪

Village
🏠
🌾
🏪
🍺
⚒

Town
🏘
🍺
⚒
🛡
🏪
```

---

# 21. 建築

V1 至少：

```text
🏠 House
🌾 Farm
🏪 General Store
🍺 Tavern
⚒ Blacksmith
🛏 Inn
```

不要求玩家建造。

可以隨：

```text
Settlement Growth
```

由 Simulation 建立。

---

# 22. 玩家工作／生活

V1 至少支援：

```text
🌾 Farming
🪓 Woodcutting
⛏ Mining
⚔ Adventuring
```

玩家不是指派別人。

玩家自己前往對應區域並進行活動。

---

# 23. Farming

種田必須與 World Time 綁定。

流程：

```text
Prepare
↓
Plant
↓
Grow
↓
Mature
↓
Harvest
```

Crop：

```ts
Crop {
  id
  plantedAt
  growthDuration
  matureAt
  status
}
```

例如：

```text
🌱
↓
🌿
↓
🌾
```

V1 不做複雜土壤、肥料、天氣。

---

# 24. Resource Gathering

V1：

```text
🌲 Wood
🪨 Stone
⛏ Iron Ore
🌾 Food
```

資源點存在於世界。

玩家靠活動取得。

資源可以有：

```text
remainingAmount
regenerationRate
```

---

# 25. Inventory

玩家有個人 Inventory。

V1 資源：

```text
Wood
Stone
Iron Ore
Food
Monster Material
Potion
```

裝備：

```text
Weapon
Armor
```

不要一開始做過多欄位。

---

# 26. Combat

玩家直接參與戰鬥。

V1 不需複雜 Action RPG。

可以使用：

```text
Auto Attack
+
簡單主動指令
```

最少：

```text
Attack
Defend
Use Item
Run
```

如果設計為 Real-Time Tick Based 也可以。

重點是 Engine 可測試。

---

# 27. 怪物

V1：

```text
🟢 Slime
🐺 Wolf
👺 Goblin
👹 Goblin Chief
```

資料：

```ts
MonsterDefinition {
  id
  name
  level
  hp
  attack
  defense
  exp
  lootTable
}
```

---

# 28. 怪物不是固定刷新點

V1 必須開始實作：

**Monster Population / Threat**

例如森林：

```ts
RegionThreat {
  monsterPopulation
  threatLevel
  growthRate
  bossProgress
}
```

---

# 29. Threat Growth

如果長期沒有人處理怪物：

```text
Threat Lv.1
↓
Threat Lv.2
↓
Threat Lv.3
```

效果：

```text
更多怪物
更強怪物
更危險區域
Boss Progress ↑
```

---

# 30. V1 怪物據點

只需要一種：

```text
Goblin Camp
```

演化：

```text
Goblin Camp Lv.1
↓
Goblin Camp Lv.2
↓
Goblin Camp Lv.3
```

如果玩家與世界 NPC 都不處理：

```text
Goblin Chief appears.
```

---

# 31. Boss

Boss 不應無預警直接生成。

V1 使用：

```text
Threat Growth
↓
Warnings
↓
Boss Spawn
```

例如 Event Log：

```text
⚠ Goblins are becoming more active.

⚠ Merchants report attacks on the northern road.

🚨 Goblin Chief has appeared.
```

---

# 32. 不處理 Boss 的後果

V1 不 Game Over。

可以：

```text
Settlement Safety ↓
Prosperity ↓
NPC Injury
Resource Production ↓
Trade ↓
```

V1 不需要實作整座城摧毀。

但架構要允許未來加入。

---

# 33. Dungeon

V1 一座：

```text
🕳 Abandoned Mine
```

地下城包含：

```text
普通怪物
精英怪
Loot
Boss
Threat
```

---

# 34. Dungeon Growth

地下城也受時間影響。

例如：

```text
Dungeon Threat 1
↓
Threat 2
↓
Threat 3
```

怪物強度與獎勵增加。

V1 不做程序生成 Dungeon。

---

# 35. Unknown Area

世界至少有：

```text
❓ Unknown Region
```

玩家走近／探索後：

```text
Reveal Region
```

世界不需要一開始全部顯示。

---

# 36. World Map

V1 小型即可，例如：

```text
32 × 24 Tiles
```

或依實作合理調整。

Tile Data：

```ts
Tile {
  terrain
  regionId
  discovered
  walkable
  entityId?
}
```

---

# 37. 玩家直接移動

支援：

```text
WASD
Arrow Keys
```

玩家可以真的走：

```text
家
↓
農田
↓
酒館
↓
森林
↓
礦坑
↓
Dungeon
```

這是 V1 與純管理遊戲最大的差異之一。

---

# 38. NPC 移動

V1 NPC 可使用簡單 Grid Pathfinding。

不需要高階 Crowd Simulation。

如果效能需要，可使用：

```text
抽象 Travel State
```

處理遠距離 NPC。

避免每個 NPC 每 Frame 尋路。

---

# 39. Tavern

酒館是 V1 重要功能。

提供：

```text
Rumors
Mercenaries
Rest
```

Rumor 可以反映世界狀態：

```text
「最近北方森林哥布林變多了。」
```

不需要 AI 生成。

由 Event Template 產生。

---

# 40. Mercenary

傭兵不是永久角色收藏。

資料：

```ts
Mercenary {
  npcId
  hireCost
  dailyWage
  contractEnd
}
```

V1 Party：

```text
Player + 最多 2 名同行者
```

先控制總共 3 人。

---

# 41. 傭兵戰鬥

玩家只控制主角。

傭兵由簡單 AI：

```text
Attack
Defend
Heal
```

依角色 Archetype 選擇行為。

V1 不做複雜戰術編輯器。

---

# 42. 特殊夥伴

V1 可選擇實作：

```text
1 名特殊 NPC
```

透過探索事件認識。

例如：

```text
森林中遇到受傷的遊俠
↓
協助
↓
之後可邀請同行
```

若影響工期，可列為 V1 Stretch Goal。

---

# 43. Party 原則

永久限制概念：

```text
主角 + 少數同行者
```

禁止 V1 做：

```text
20 人冒險隊
大量 Character Collection
軍團系統
Raid
```

---

# 44. Economy

V1 簡化。

貨幣：

```text
Gold
```

來源：

```text
工作
出售素材
怪物掉落
```

用途：

```text
購買
住宿
裝備
傭兵
```

---

# 45. Shop

至少：

```text
General Store
Blacksmith
```

商店庫存可以依：

```text
Settlement Level
```

提升。

V1 不需要 Supply Chain Simulation。

---

# 46. Event System

所有重要變化透過統一 Event Bus。

例如：

```ts
character.levelUp
npc.died
npc.born
settlement.grew
monster.threatIncreased
boss.spawned
region.discovered
dungeon.threatIncreased
```

---

# 47. Event Log

這是核心 UI。

例如：

```text
Year 3 / Spring 12

08:20
⚒ Blacksmith opened.

10:31
🐺 Wolf population increased.

12:14
🙂 Player reached Mining Lv.4.

14:02
⚠ Goblin activity increased.

18:00
🍺 New mercenary arrived at the tavern.
```

Filter：

```text
ALL
PLAYER
NPC
WORLD
MONSTER
SETTLEMENT
```

---

# 48. World History

重大事件另存 History。

例如：

```text
Year 1
Oakvale Hamlet founded.

Year 4
Oakvale became a Village.

Year 7
Abandoned Mine discovered.

Year 9
Goblin Chief appeared.
```

這會是未來世界歷史系統的底。

---

# 49. Offline Progress

遊戲重新開啟時：

```text
lastSavedAt
```

計算離線時間。

V1 最多模擬：

```text
8 Real Hours
```

或合理 Config。

不要逐分鐘更新 UI。

使用：

```text
Fast Simulation / Batch Processing
```

---

# 50. 世界離線時也應變化

Offline Simulation 至少處理：

```text
NPC aging
crop growth
settlement growth
monster threat
dungeon threat
mercenary contract
```

玩家回來可能看到：

```text
While you were away:

👥 Population +2
👴 1 villager died
🌾 Crops matured
⚠ Goblin Threat 1 → 2
🍺 New mercenary arrived
```

---

# 51. RNG

禁止 Domain 到處：

```ts
Math.random()
```

統一：

```ts
RandomService
```

支援：

```text
seed
```

方便：

```text
Testing
Reproduction
Future World Seeds
```

---

# 52. Data Driven

以下全部資料驅動：

```text
Monster
Item
Equipment
Crop
Job
Region
Building
Dungeon
NPC Archetype
Threat Level
```

新增內容不應修改核心 Engine。

---

# 53. Save System

至少：

```text
Auto Save
Manual Save
Reset World
```

Save：

```ts
{
  saveVersion,
  worldSeed,
  worldTime,
  activeCharacterId,
  characters,
  npcs,
  settlement,
  regions,
  monsters,
  dungeons,
  inventory,
  history
}
```

---

# 54. UI

建議 Desktop：

```text
┌─────────────────────────────────────┐
│ Year 3 Spring 12 | 14:20 | x1 x5   │
├────────┬──────────────────┬─────────┤
│        │                  │         │
│ Menu   │    World Map     │ Status  │
│        │                  │         │
│        │                  │         │
├────────┴──────────────────┴─────────┤
│ Event Log                           │
└─────────────────────────────────────┘
```

---

# 55. Sidebar

V1：

```text
WORLD
CHARACTER
INVENTORY
JOURNAL
HISTORY
```

不需要大量功能頁。

---

# 56. Character Panel

```text
🙂 Alden

Age 19
Lv.8

HP  82/100
STA 44/70

STR 14
VIT 12
DEX 10
INT 8

⚔ Combat      Lv.6
🌾 Farming     Lv.4
⛏ Mining      Lv.7
🪓 Woodcutting Lv.2

Gold
🪙 218
```

---

# 57. Settlement Panel

玩家只能查看，而非上帝式控制。

```text
🏘 Oakvale Village

Population 48
Prosperity 63
Safety 72
Food 81

Buildings
🏠 Houses
🌾 Farm
🏪 Store
🍺 Tavern
⚒ Blacksmith
```

---

# 58. Threat Panel

例如：

```text
🌲 North Forest

Threat
███░░ 3

🐺 Wolf
Population: Medium

👺 Goblin
Population: Rising

⚠ Goblin Camp Lv.2
```

---

# 59. V1 World Content

限制內容量。

### Settlement

```text
1
```

### Regions

```text
Village
Farmland
Forest
Mine
Unknown Region
```

### Dungeon

```text
1
```

### Monster

```text
Slime
Wolf
Goblin
Goblin Chief
```

### NPC

```text
20–40 Initial NPC
```

### Jobs

```text
Farmer
Miner
Woodcutter
Blacksmith
Shopkeeper
Guard
Mercenary
```

不需要每個 Job 都讓玩家做。

---

# 60. V1 不做

嚴格排除：

```text
國家
政治
外交
戰爭
大型軍團
宗教
家族樹
戀愛
婚姻
複雜情緒
NPC LLM
NPC 自然語言聊天
魔法系統
技能樹
轉職
寵物
坐騎
大型 Boss Raid
多城市
多國家
海洋
空島
程序生成無限地圖
多人連線
商城
成就系統
主線劇情
大型 Quest 系統
```

---

# 61. Simulation Frequency

不要所有系統都每分鐘運算。

區分：

```text
Movement Tick
Combat Tick
World Tick
Daily Tick
Season Tick
Year Tick
```

例如：

```text
Movement
每 Game Minute

NPC Schedule
每 10 Game Minutes

Settlement
每日

Threat
每日

Aging
每年
```

避免 Simulation 浪費資源。

---

# 62. Performance

V1：

```text
20–50 NPC
```

架構應可合理擴展：

```text
100+
```

禁止：

```text
每 NPC 一個 setInterval
```

必須由：

```text
Single Simulation Loop
```

統一處理。

---

# 63. Unit Test

至少：

### Calendar

```text
day rollover
season rollover
year rollover
speed independent
```

### Character

```text
EXP
level up
skill EXP
aging
life stage
```

### NPC

```text
schedule
work transition
aging
death
```

### Farming

```text
plant
growth
mature
harvest
```

### Combat

```text
damage
death
loot
EXP
```

### Settlement

```text
growth
stage transition
```

### Threat

```text
threat grows
threat decreases
boss threshold
```

### Save

```text
serialize
deserialize
version
```

---

# 64. Headless Simulation Test

非常重要。

必須可以：

```text
simulate 1 year
simulate 10 years
simulate 50 years
```

不需要 Browser UI。

檢查：

```text
沒有 NaN
沒有 Infinite Loop
人口不會無限制爆炸
人口不會必然歸零
怪物 Threat 不會失控成 Infinity
角色年齡正確
Settlement 可以成長
死亡角色不再活動
Save State 可 Serialize
```

---

# 65. Browser Verification

完成功能後實際驗證：

```text
New Game

Move Player

Go Farm

Plant Crop

Wait

Harvest

Go Forest

Fight Monster

Gain EXP

Visit Tavern

Hire Mercenary

Enter Dungeon

Advance Time

Observe NPC Activities

Observe NPC Aging

Observe Settlement Growth

Observe Monster Threat Growth

Save

Reload

Continue
```

---

# 66. Phase 1 — Core World

先完成：

```text
Calendar
Simulation Loop
Player
NPC
Movement
Map
Save
```

驗收：

> 玩家與 NPC 可以在同一個有時間流動的世界存在。

---

# 67. Phase 2 — Living NPC

完成：

```text
NPC Schedule
Jobs
Aging
Birth
Death
Immigration
```

驗收：

> 玩家站著不動，NPC 世界仍會變化。

---

# 68. Phase 3 — Life Gameplay

完成：

```text
Farming
Mining
Woodcutting
Inventory
Economy
Shop
```

驗收：

> 玩家可以選擇過一般生活，不必一直戰鬥。

---

# 69. Phase 4 — RPG

完成：

```text
Level
Stats
Skills
Equipment
Combat
Monsters
```

驗收：

> 玩家可以透過冒險真正變強。

---

# 70. Phase 5 — Adventure

完成：

```text
Unknown Region
Exploration
Dungeon
Tavern
Mercenary
```

驗收：

> 玩家可以離開日常生活進行冒險。

---

# 71. Phase 6 — Living World

完成：

```text
Settlement Growth
Monster Population
Threat Growth
Goblin Camp
Boss
World History
```

驗收：

> 玩家什麼都不做，世界也會自己產生重要變化。

---

# 72. Phase 7 — Persistence

完成：

```text
Auto Save
Load
Offline Simulation
World Summary
```

驗收：

> 關閉遊戲再回來，世界仍延續。

---

# 73. Acceptance Criteria

## AC-01

玩家只能直接操作主角。

---

## AC-02

NPC 無玩家控制也會：

```text
移動
工作
休息
衰老
```

---

## AC-03

World Calendar 可以：

```text
Day
Season
Year
```

正常前進。

---

## AC-04

玩家會隨年份增加年齡。

---

## AC-05

NPC 會：

```text
出生 / 出現
變老
死亡
```

---

## AC-06

玩家可以：

```text
種田
採礦
伐木
```

---

## AC-07

玩家可以：

```text
探索
戰鬥
升級
提升 Skill
```

---

## AC-08

至少一個 Dungeon 可探索。

---

## AC-09

Tavern 可以聘請至少一名傭兵。

---

## AC-10

Party 不超過：

```text
Player + 2
```

---

## AC-11

聚落可以隨 Simulation：

```text
Hamlet → Village → Town
```

至少完成其中兩次階段轉換。

---

## AC-12

怪物 Threat 會隨時間自行成長。

---

## AC-13

Goblin Camp 可以因長期未處理而升級。

---

## AC-14

Boss 可以由 Threat System 產生。

不是固定時間直接 Spawn。

---

## AC-15

不處理怪物 Threat 不會直接 Game Over。

但會對 Settlement 產生負面影響。

---

## AC-16

世界重大事件會進入 History。

---

## AC-17

Save / Reload 後世界狀態一致。

---

## AC-18

Offline Progress 會造成：

```text
時間
農作物
NPC
Settlement
Threat
```

合理變化。

---

## AC-19

Domain Simulation 不依賴 Vue。

---

## AC-20

核心系統全部有自動測試。

---

# 74. V1 成功判定

V1 不以內容量判斷成功。

只看玩家是否能感受到：

### 第一種感覺

> 我可以自由決定今天要種田、賺錢、打怪還是探索。

### 第二種感覺

> NPC 並不是等著我互動，他們有自己的生活。

### 第三種感覺

> 我老了，其他角色也老了。

### 第四種感覺

> 我很久沒去北方森林，那裡真的發生了變化。

### 第五種感覺

> 當年的小聚落現在已經變成村莊甚至城鎮。

### 第六種感覺

> 即使我沒有處理某件事情，它也可能自己發展成新的問題。

如果 V1 能做到這六件事情，核心就成立。

---

# 75. 最重要的開發原則

不要為了「看起來像遊戲」優先增加美術。

不要為了「內容很多」先加入幾十種怪物。

不要為了「AI」加入 LLM。

不要先製作巨大世界。

不要先做複雜 Quest。

優先確保：

```text
TIME
↓
PLAYER
↓
NPC
↓
SETTLEMENT
↓
MONSTER
↓
WORLD
```

全部真的會一起運作。

---

# 76. 一句話產品核心

> **我自由地生活在這個世界裡，而在我生活的同時，其他人、村莊、怪物、地下城與整個世界，也正在過著屬於它們自己的時間。**

這句話高於其他 V1 功能。

任何實作決策若與此衝突，優先維持這個核心。

# Oakvale V2 — Life & Emergence

> Persistent Living Fantasy World RPG
> V2 主題：**人生、歸屬、世界回應與自然演化**

---

# 0. Codex 執行總則

本文件為 V2 正式開發規格。

V1 已完成並通過既有功能與深度 QA，不得因 V2 開發任意重寫已穩定的核心系統。

V2 開發原則：

1. 保留 V1 已驗證的 Simulation Engine。
2. 不為追求 V2 功能而大規模重構。
3. 新系統必須 Data-driven。
4. Simulation Domain 不可依賴 Vue / DOM。
5. 不以 LLM / AI API 產生 NPC、對話、事件或世界內容。
6. 所有隨機必須經 Seeded RNG / RandomService。
7. 不得散落使用 `Math.random()`。
8. V1 Save 必須可安全 Migration 至 V2。
9. V2 不追求世界變大，優先讓世界變深。
10. 不得自行加入本規格 Non-goals 中的功能。

發現重大不確定時才詢問。

其餘細節以：

> **最小、可測試、可擴充、符合 Life × Living World × Consequence**

為優先原則。

---

# 1. V1 Baseline

V2 必須建立在目前 V1 之上。

V1 已存在：

- 24×16 世界地圖
- 橡谷聚落
- 農田
- 森林
- 礦區
- 迷霧山谷
- 玩家單一主角直接控制
- WASD／方向鍵／點擊移動
- 日／季／年
- ×1／×5／×20
- 暫停
- NPC 工作／旅行／休息
- NPC 技能成長
- 出生
- 移民
- 老化
- 自然死亡
- 傷勢
- 農作
- 採集
- 經濟
- 商店
- 裝備
- 休息
- 等級／EXP／技能
- 回合戰鬥
- 怪物／精英
- 地下城
- 酒館
- 傭兵／同行者
- 聚落 Hamlet → Village → Town
- Monster Population
- Threat
- Goblin Camp
- Boss
- 世界歷史
- 玩家死亡
- 成年 NPC 繼承
- Local Save
- IndexedDB Journal
- 世界優先 World First UI

V2 不得重新實作上述系統，除非是完成本規格要求所必需的窄幅調整。

---

# 2. V2 核心產品定義

## 2.1 V1 解決的問題

V1：

> **「這個世界會不會自己活著？」**

答案已經成立。

---

## 2.2 V2 要解決的問題

V2：

> **「玩家能不能在這個世界真正活出一段人生？」**

玩家應開始感受到：

- 我逐漸成為某種人。
- NPC 開始知道我是誰。
- NPC 自己也會成長與改變。
- 我在這裡擁有真正屬於自己的東西。
- 我的行為會留下後果。
- 世界會自然產生新的事情。
- 很多年後仍看得到以前的選擇。
- 不同 Save 會形成不同歷史。

---

# 3. Oakvale 核心 Product DNA

所有 V2 新功能必須至少強化下列三項中的兩項：

## Life

> 我這一代角色想怎麼活？

## Living World

> 其他人、怪物與世界不以玩家為中心，也有自己的生命。

## Consequence

> 玩家與世界互相留下長期痕跡。

若一個功能只增加「內容數量」，但沒有強化至少兩項，不進入 V2。

例如：

| 功能 | Life | Living World | Consequence | V2 |
|---|---:|---:|---:|---:|
| NPC 職涯 | ✓ | ✓ | ✓ | 做 |
| 房屋／產業 | ✓ |  | ✓ | 做 |
| 世界事件鏈 |  | ✓ | ✓ | 做 |
| NPC 記憶 | ✓ | ✓ | ✓ | 做 |
| 50 種家具 | ✓ |  |  | 不做 |
| 30 把新武器 |  |  |  | 不做 |
| PvP |  |  |  | 不做 |
| 公會 Raid |  |  |  | 不做 |

---

# 4. 世界觀正史化

V2 開始正式採用：

> **Persistent Living Fantasy World RPG**

玩家不是原本世界中的普通居民。

第一代玩家角色：

> **來自另一個世界，在這個奇幻世界重新開始人生。**

但不得設定：

- 天選之人
- 強制救世主
- 固定勇者
- 神賜 SSS 能力
- 必須打倒魔王
- 固定主線使命

玩家只是：

> **一個來到陌生世界、需要想辦法生活下去的人。**

---

# 5. 世界設定

Oakvale 並不是整個世界。

Oakvale 是：

> **大型奇幻世界中相對偏遠的一個邊境聚落。**

世界 Canon 中允許存在：

- 人類
- 精靈
- 其他未來可擴充種族
- 農民
- 商人
- 冒險者
- 傭兵
- 勇者
- 魔法師
- 騎士
- 王國
- 國王
- 魔法
- 怪物
- 地下城
- 龍
- 大型怪物
- 怪物群落與勢力
- 遙遠城市與國家

但：

> **存在於世界觀 ≠ V2 必須實作完整遊戲系統。**

---

# 6. V1 → V2 必補強項目

以下視為 V2 Foundation，不再回頭製作 V1.1。

---

## 6.1 第一代玩家身分

新增：

```text
origin = OTHER_WORLD
generation = 1
```

第一代玩家為：

> The Reborn

遊戲開場必須符合：

- 玩家不知道世界全貌。
- 玩家需要自然認識 Oakvale。
- 玩家不具備救世使命。
- 不一次大量說明 Lore。
- 透過生活逐漸理解世界。

---

## 6.2 開場流程

保持非常簡單。

概念：

```text
你醒了過來。

陌生的天空。
陌生的土地。

你記得另一個地方、另一段人生。

但那已經結束了。

遠方似乎有炊煙。

你得先想辦法活下去。
```

玩家選擇：

```text
[起身]
```

之後世界正式開始運行。

不要製作長 Tutorial Cutscene。

---

# 7. 修正「重生者 × 死亡繼承」語意

V1 已存在：

> 主角死亡 → 選成年 NPC 繼續。

功能保留。

但 V2 正式重新定義：

## 第一代

```text
OTHER_WORLD
↓
The Reborn
↓
在這個世界活一生
↓
死亡
```

第一代死亡代表：

> 這段人生結束。

不是再次轉生。

---

## 後續角色

世界不重置。

玩家可選擇：

> **World Successor**

繼續操作世界中已存在的成年居民。

例如：

```text
Generation 1
異世界重生者

↓

死亡

↓

Generation 2
Oakvale居民 / World Successor
```

第二代不是異世界人。

---

## 必須保存

角色死亡不得清除：

- 世界時間
- Settlement
- NPC
- Monster State
- Threat
- Dungeon State
- Ownership
- Reputation History
- World History
- Major Events
- 已死亡人物歷史

---

# 8. Active Idle 世界時間

V2 將正式修改 V1 Offline Progress 哲學。

## V1

存在：

```text
Offline Progress
max 8 real hours
```

## V2

改為：

> **World runs while the player is present.**

---

## 8.1 規則

遊戲開啟：

```text
World Running
```

玩家放著不操作：

```text
World Running
```

開啟角色／背包／其他 Window：

```text
World Running
```

除非玩家：

```text
Pause
```

---

## 8.2 關閉遊戲

遊戲／頁面完全關閉：

```text
World Frozen
```

例如：

```text
世界時間：
Year 12 / Summer 18 / 14:35
```

關閉三天。

重新開啟：

```text
Year 12 / Summer 18 / 14:35
```

不得模擬三天現實時間。

---

## 8.3 Background Tab

同一個遊戲 Session 中：

瀏覽器背景 Tab 可能 throttle timer。

不得依賴每秒 interval 保證正確 Simulation。

應使用：

```text
session elapsed time
↓
return foreground
↓
batch catch-up
```

此為：

> In-session Catch-up

不是：

> Offline Progress。

---

## 8.4 技術原則

不要使用重新開啟遊戲後的：

```text
Date.now() - lastSaveTimestamp
```

進行世界模擬。

重新 Load：

> 從已保存的 WorldTime 繼續。

---

# 9. V1 Save → V2 Migration

Save Version 必須升級。

建議：

```text
saveVersion: 2
```

要求：

```text
V1 Save
↓
Migration
↓
V2 Save
```

不得：

- 默默丟資料
- 重建世界
- 重抽 RNG
- 改變 V1 worldSeed
- 重置 NPC
- 重置歷史
- 自動模擬舊 Offline 時間

Migration 後：

```text
worldTime
```

必須等於 V1 最後保存的遊戲時間。

---

# 10. V2 Core System 1 — Identity

核心問題：

> **這一代角色成為了什麼樣的人？**

不要製作傳統：

```text
Choose Class
```

玩家不直接按：

```text
轉職農夫
轉職礦工
```

Identity 應根據：

```text
Actions
Skills
Career
Ownership
Major Events
Reputation
```

自然形成。

---

## 10.1 Identity 範例

```text
居民
```

長期務農：

```text
居民
↓
農夫
↓
熟練農夫
↓
農場主人
```

長期採礦：

```text
居民
↓
礦工
↓
熟練礦工
```

長期戰鬥／冒險：

```text
居民
↓
冒險者
↓
資深冒險者
```

---

## 10.2 多重 Identity

允許：

```text
橡木村居民
+
礦工
+
冒險者
+
農場主人
```

不要強制單 Class。

---

## 10.3 普通人生合法

玩家沒有成為：

```text
Hero
Legend
King
```

也不能被視為失敗。

例如：

```text
農夫
活到 76 歲
擁有一塊農場
```

也是完整人生。

---

# 11. V2 Core System 2 — Ownership

Ownership 定義：

> **玩家在世界建立真正屬於自己的生活據點與事業。**

不是 Base Builder。

---

## V2 最小 Scope

只實作：

### A. 自宅

```text
🏠 Home
```

功能：

- 休息
- 儲物
- Ownership 標記
- 人生據點
- 未來傳承資料基礎

---

### B. 土地／農場

玩家可透過：

- 金錢
- Reputation
- Settlement 階段

取得資格。

玩家的農業產出可對世界產生有限影響。

例如：

```text
Food Supply
```

---

### C. 一種事業型 Ownership

V2 只挑 **一種** 完整做深。

建議候選：

```text
Workshop
```

或：

```text
Farm Business
```

不要一次做：

- 商店
- 旅館
- 酒館
- 礦場
- 鐵匠鋪
- 農場
- 工坊

全部。

---

# 12. V2 Core System 3 — Reputation

Reputation 不只是折扣數字。

V2 至少存在：

```text
Settlement Reputation
```

可選：

```text
Adventurer Reputation
Career Reputation
```

但不要建立每個 NPC 0～100 好感度系統。

---

## Reputation 應影響

- NPC 對話
- 土地購買資格
- Ownership
- 特殊委託
- 特殊資訊
- 傭兵
- 地方事件參與
- NPC 對玩家稱呼／認知

---

# 13. V2 Core System 4 — NPC Awareness

V1 NPC 已會：

```text
work
travel
rest
learn
age
die
```

V2 必須讓 NPC 開始具有：

> **人生方向。**

---

# 14. NPC Career System

新增：

```text
Career Stage
```

例如：

```text
young resident
↓
apprentice
↓
worker
↓
experienced worker
↓
owner / senior
↓
retired
```

NPC Career Transition 可以考慮：

```text
Age
Skill
Trait
Settlement Need
Job Availability
World State
Weighted RNG
```

不得純 Random。

---

## 範例

```text
Age 17
Miner Apprentice

↓

Age 26
Miner

↓

Age 37
Blacksmith Assistant

↓

Age 46
Blacksmith

↓

Age 68
Retired
```

---

# 15. NPC Traits

V2 建立簡單 Traits 系統。

例如：

```text
brave
cautious
ambitious
content
hardworking
wanderer
social
solitary
```

V2 不需要大量人格參數。

Traits 主要影響：

- Career weight
- Event reaction
- Request
- Travel
- Risk tolerance
- Dialogue variation

---

# 16. NPC Memory

不得建立無限記憶。

採：

> Important Structured Memory

---

## Personal Memory

例如：

```text
PLAYER_HELPED_ME
PLAYER_HIRED_ME
PLAYER_SAVED_ME
PLAYER_FAILED_ME
```

---

## Settlement Memory

例如：

```text
PLAYER_DEFENDED_OAKVALE
PLAYER_OWNS_FARM
PLAYER_SUPPORTED_FOOD
```

---

## World Memory

例如：

```text
GOBLIN_CHIEF_DEFEATED
DUNGEON_DISCOVERED
MAJOR_DISASTER
```

NPC 不必知道所有 World Memory。

避免：

> 所有人瞬間全知。

---

# 17. Contextual Dialogue

V2 不使用 LLM。

對話由：

```text
NPC
+
Age
+
Career
+
Trait
+
Current Concern
+
Settlement State
+
World Event
+
Player Identity
+
Player Reputation
+
Important Memory
+
Weighted Dialogue Template
```

決定。

---

## 同 NPC 不同人生階段

Year 2：

> 今天還得去礦坑工作。

Year 15：

> 最近鐵礦需求越來越高了。

Year 30：

> 年輕時我一天能在礦坑待到晚上，現在可不行了。

---

## 玩家事件反應

Boss 被玩家擊敗：

> 聽說北邊那個麻煩是你解決的？

玩家擁有農場：

> 今年你那邊的收成看起來不錯。

---

# 18. Featured NPC

V2 不要求所有 NPC 都有巨大內容量。

先挑：

> **5～10 名 Featured NPC**

完整驗證：

- Career
- Aging
- Important Memory
- Dialogue
- Event participation
- Life milestones

其他 NPC 使用較簡化版本。

---

# 19. V2 Core System 5 — Living Events

事件不能只是：

```text
Event
↓
Log
↓
End
```

必須支援：

```text
CAUSE
↓
SIGNAL
↓
DEVELOPMENT
↓
REACTION
↓
OUTCOME
↓
CONSEQUENCE
```

---

# 20. Event Arc

例如：

## Northern Road Crisis

Stage 1：

```text
Wolf Population ↑
```

NPC：

> 最近北邊不太安全。

Stage 2：

```text
Merchant attacked
```

Stage 3：

```text
Trade Route Risk ↑
Supply ↓
Price ↑
```

如果玩家處理：

```text
Wolf Population ↓
↓
Road Safety ↑
↓
Trade Recover
```

如果玩家不處理：

```text
Merchant leaves
↓
Supply permanently changes
↓
Settlement consequence
```

---

# 21. World-driven Requests

V2 不做傳統：

```text
NPC !
↓
Kill 10 wolves
```

Request 應由真實 World State 產生。

例如：

```text
Food shortage
→ Food Purchase Request
```

```text
Wolf threat
→ Hunting Request
```

```text
Iron shortage
→ Mining Request
```

```text
NPC injury
→ Medicine Request
```

Request 解決後必須對原 World State 有影響。

---

# 22. V2 Core System 6 — Emergent World

V2 開始建立程序世界骨架。

不使用 AI。

核心：

```text
Seeded RNG
+
World State
+
Conditions
+
Weighted Tables
+
Traits
+
Event Chains
+
World Director
```

---

# 23. 隨機不是純 Random

禁止：

```text
random event every X minutes
```

應：

```text
World State
↓
Valid Candidates
↓
Conditions
↓
Weights
↓
Seeded RNG
↓
Result
```

---

# 24. World Director

V2 建立簡化版 World Director。

用途：

> 控制世界節奏，而不是控制世界劇情。

Director 追蹤：

- 最近重大事件數
- 最近危機密度
- Settlement Stability
- Player activity
- Threat level
- Quiet period
- Event cooldown

---

## Director 原則

不要：

```text
Boss
Boss
Disaster
NPC Death
Boss
Disaster
```

應允許：

```text
Life
Life
Minor Event
Life
Quiet
Crisis
Recovery
Life
```

平淡期本身是合法世界狀態。

---

# 25. Rare Events

V2 只加入少量。

例如：

- 神秘旅人
- 特殊冒險者
- 稀有商人
- 異常怪物
- 遺跡線索
- 遙遠巨龍目擊
- 精靈旅行者

Rare Event 必須：

- 低概率
- 有條件
- 有 cooldown
- 不一定要求玩家處理

---

# 26. 奇幻世界「存在感」

V2 不需要把整個大世界做出來。

但 Oakvale 必須開始讓玩家感覺：

> 外面的世界真的存在。

---

## V2 可使用

### 酒館 Rumor

例如：

- 王都正在徵召騎士。
- 北方有人目擊巨龍。
- 精靈商隊正在南下。
- 某位勇者正在東部活動。
- 遠方魔法學院發生事故。

---

### Traveling NPC

V2 可少量出現：

```text
Elf Traveler
Mage Traveler
Knight
Adventurer
Merchant
```

但不需要完整種族系統。

---

### World News

重大遠方事件可以成為：

```text
World News
```

但 V2 不模擬整個王國政治。

---

# 27. V2 不實作完整魔法系統

世界中：

> Magic exists.

但 V2 不因此必須新增：

- Mana
- Spell Tree
- Fireball
- Magic Crafting
- Magic Class
- Mage Combat System

可以透過：

- NPC
- 傳聞
- Event
- Item Flavor
- World History

讓玩家知道魔法存在。

---

# 28. V2 不實作 Dragon Combat

世界中：

> Dragon exists.

V2 可以：

- 傳聞
- 目擊
- Rare Event
- World News

但不必讓玩家真正戰鬥。

Dragon 後續應傾向：

> World Entity

而不是普通 Boss。

完整實作留給後續版本。

---

# 29. Monster Threat 擴充原則

V1：

```text
Population
↓
Camp
↓
Threat
↓
Boss
```

V2 保留。

可增加：

```text
Monster Activity
Monster Pressure
Regional Consequence
```

但不要直接實作完整：

```text
Monster Kingdom
Monster Faction
Territory War
```

這些屬於 V3。

---

# 30. 玩家不是唯一英雄

世界中可以存在：

```text
Hero
Adventurer
Mage
Knight
Mercenary
```

且他們不是玩家部下。

未來世界事件可以出現：

```text
NPC Hero attempts boss
```

成功或失敗均可。

但 V2 先以少量 Scripted-Systemic Event 驗證，不建完整 Hero Simulation。

---

# 31. Simulation Scalability Foundation

V2 世界尚未大規模擴張，但必須建立未來可以擴張的技術邊界。

---

## 31.1 Simulation 與 UI

必須保持：

```text
Simulation Engine
↓
World State
↓
Projection
↓
UI Renderer
```

Vue 不得成為 Simulation Engine。

---

## 31.2 World Projection

UI 只取得需要顯示的資料。

不要直接把整個世界 State 做 Deep Reactive。

例如：

```text
World Simulation
↓
Viewport Projection
↓
Visible Tiles
Visible NPC
Visible Markers
```

---

# 32. Simulation LOD

V2 開始建立至少概念與介面。

NPC 依距離／重要性可分：

## Active

玩家附近。

精細處理：

- movement
- interaction
- local action

## Simulated

同區域但不在畫面。

處理：

- schedule
- job
- event
- growth

不需要逐格移動。

## Abstract

遠距 NPC。

使用：

- batch work
- summary growth
- daily transition

V2 不必做到數千 NPC。

但資料模型不得阻止未來實作。

---

# 33. Monster Simulation

繼續使用：

> Population Model

禁止把每一隻遠方怪物都 materialize。

例如：

```text
Wolf Population = 180
```

不代表建立 180 個 wolf entity。

玩家附近才：

```text
materialize encounter
```

---

# 34. Event Data 分級

V2 必須開始區分：

```text
Transient Event
Gameplay Event
Major History
Debug Journal
```

例如：

不需要永久世界史：

```text
NPC went to work.
```

重要歷史：

```text
Marcus founded Oakvale Workshop.
```

避免長時間遊戲所有細碎事件永久累積成世界歷史。

---

# 35. UI / UX

延續 V1：

> World First

正常畫面仍以世界為主。

不要轉回：

> Dashboard Simulator。

---

## 新增 UI

V2 最少需要：

### Identity Window

顯示：

- Current Identity
- Life milestones
- Reputation
- Ownership

### NPC Window

新增：

- Age
- Career
- Known role
- Familiarity
- Current concern
- Known memories（只顯示合理資訊）

### Property Window

- Home
- Land
- Business

### Event / World News

清楚區分：

```text
Local
Regional
Rumor
Major
```

---

# 36. Information Design

玩家不應直接看到所有內部 Simulation 數字。

例如不要直接顯示：

```text
Wolf Population = 43.73
Event Weight = 0.72
Goblin Boss Progress = 81%
```

應優先透過：

- 世界圖示
- NPC 對話
- Rumor
- World News
- 商店價格
- 道路狀態
- Event Log

讓玩家推測世界。

---

# 37. V2 Content Budget

V2 不追求內容量。

建議初始 Budget：

- 5～10 Featured NPC
- 8～12 NPC Traits
- 5～7 Career Transition 類型
- 15～20 Minor Events
- 5～10 Medium Events
- 3 完整 Event Arcs
- 3～5 Rare Events
- 1 Home System
- 1 Land/Farm Ownership
- 1 Business Ownership
- 1 Settlement Reputation
- 少量 Contextual Dialogue Templates
- 少量遠方世界 Rumors
- 少量 Fantasy Traveler

先證明系統好玩。

再擴內容。

---

# 38. V2 不應變成 Fantasy Life Clone

不得以：

```text
大量 Life/Class
```

作為 V2 核心。

Identity 必須：

> 由玩家生活行為自然形成。

不是：

> 選擇 14 個職業逐一 Rank Up。

---

# 39. V2 不應變成 Mabinogi/MMO

不新增：

- Multiplayer
- Player Guild
- Raid
- World Chat
- Daily Quest
- PvP
- MMO Social

Oakvale 的核心：

> NPC Society

不是：

> Player Society。

---

# 40. Active Idle 定位

Active Idle 只是：

> 遊玩節奏。

不是：

> Idle Reward Game。

禁止新增：

- Offline Reward
- Claim Reward
- Auto Battle
- Auto Farm Reward
- Idle Currency
- AFK Bonus

正確行為：

```text
玩家放著
↓
世界自己生活
↓
玩家看見有趣的事情
↓
決定是否介入
```

---

# 41. Fun Loop

V2 最終必須形成：

```text
生活
↓
形成 Identity
↓
認識 NPC
↓
取得 Reputation
↓
建立 Ownership
↓
世界產生反應
↓
Living Event 發展
↓
玩家決定介入或忽略
↓
留下 Consequence
↓
產生新的生活選擇
```

---

# 42. Player Motivation

必須同時提供：

## Short-term

例如：

- 作物成熟
- 買裝備
- 完成工作
- 處理小事件

## Mid-term

例如：

- 買房
- 取得土地
- 建立 Identity
- 提高 Reputation

## Long-term

例如：

- 經營事業
- 看 NPC 人生發展
- 看 Oakvale 演變
- 處理長期 Threat

## Life-term

例如：

- 這一代角色最後成為什麼人？
- 留下什麼東西？
- 誰還記得他？
- 世界因他變成什麼樣？

---

# 43. QA 原則

V1 自動化 Regression 必須保留。

不能只測 V2 Feature。

---

## Engine Tests

至少增加：

- Identity calculation
- Career transition
- Reputation
- Ownership
- Memory
- Event conditions
- Event weight
- Event Arc transition
- Director cooldown
- Seed determinism
- V1 → V2 migration
- Active Idle
- Session catch-up
- no offline advancement

---

# 44. Determinism Tests

同：

```text
Seed
+
Initial State
+
Player Actions
```

應得到相同結果。

至少驗證：

```text
1 min
1 hour
1 day
batch
```

合理情況下結果一致。

---

# 45. V2 Longevity Test

至少模擬：

```text
10 years
50 years
100 years
```

檢查：

- Career transitions
- NPC retirement
- NPC death
- population
- ownership
- identity
- event rate
- Director pacing
- Threat
- save/load
- IDs
- history size

---

# 46. Active Idle Browser Test

真瀏覽器：

- x1
- x5
- x20
- pause/resume
- background tab
- return foreground
- open windows while time flows
- save/reload

驗證：

> 關閉並重新載入不得加入 Offline Progress。

---

# 47. Performance Gate

追蹤：

- JS heap
- DOM nodes
- IndexedDB size
- journal growth
- save latency
- export latency
- UI responsiveness

若未證明 DOM 為瓶頸：

> 不准因預期效能問題改寫成 Canvas。

---

# 48. Fun / Memory QA

這是 V2 新增的正式 QA。

不能只驗證：

```text
Feature works
```

還要進行實際 Player Experience 測試。

遊玩後詢問：

### Q1

你現在最想做什麼？

### Q2

你記得哪一個 NPC？

### Q3

你記得哪一件世界事件？

### Q4

你覺得自己的角色現在是什麼樣的人？

### Q5

有什麼東西是你覺得真正屬於自己的？

### Q6

你覺得自己的行為改變過世界嗎？

### Q7

如果角色現在死亡，你覺得他留下了什麼？

### Q8

你想繼續玩嗎？為什麼？

---

# 49. V2 Fun Gate

如果玩家大量回答：

```text
不知道
```

則不得因：

```text
Tests Pass
```

直接宣告 V2 成功。

V2 成功條件必須包含：

> 玩家能自然描述一段自己在世界經歷的人生故事。

---

# 50. V2 Non-goals

V2 明確不做：

- Multiplayer
- MMO
- PvP
- Player Guild
- Raid
- 多王國
- 國家政治
- 外交
- 大型戰爭
- 完整 Faction System
- 多大型城市
- 無限世界
- 大型程序地圖
- 完整精靈文明
- 完整種族系統
- 完整魔法系統
- Spell Tree
- 完整 Dragon Combat
- 戀愛
- 婚姻
- 完整家庭樹
- 生育／遺傳系統
- 大型 Social Tree
- LLM NPC
- AI-generated Dialogue
- AI-generated Quest
- AI-generated World
- 大型 Main Quest
- 100+ Monster
- 大型 Skill Tree
- 50+ Weapon Content Pack
- House Decoration Simulator
- Offline Reward
- Daily Login Reward

這些不得自行擴張 Scope。

---

# 51. 建議開發 Phase

## Phase V2-0 — Foundation / Migration

完成：

- V2 saveVersion
- V1 Migration
- Active Idle
- 關閉 Offline Progress
- World Canon metadata
- First-generation origin
- Successor semantics
- Simulation / Projection boundary 檢查
- Event classification

完成後先 Regression。

---

## Phase V2-1 — Identity & Reputation

完成：

- Identity
- identity progression
- Reputation
- UI
- Dialogue hooks

---

## Phase V2-2 — NPC Life

完成：

- Traits
- Career Stage
- Career Transition
- Important Memory
- Contextual Dialogue
- Featured NPC

---

## Phase V2-3 — Ownership

完成：

- Home
- Land
- Farm ownership
- 一種 business ownership
- Ownership → World Effect

---

## Phase V2-4 — Living Events

完成：

- Event conditions
- Event candidate pool
- Event Arc
- World-driven Request
- persistent consequence

---

## Phase V2-5 — Emergent World

完成：

- Weighted RNG
- World Director
- Rare Event
- world rumor
- fantasy traveler
- quiet/recovery pacing

---

## Phase V2-6 — Integration & Balance

測：

- Identity × NPC
- Ownership × Economy
- Event × Threat
- Event × Reputation
- NPC × Event
- Player × Consequence
- Director pacing
- Long simulation

---

## Phase V2-7 — Fun Validation

進行：

- 1～2 小時真人遊玩
- Long-life scenario
- Memory QA
- Motivation QA
- New Save comparison
- Different Seed comparison

V2 不通過 Fun Gate：

> 不開始 V3。

---

# 52. V2 Definition of Done

V2 完成後，至少能自然發生以下故事：

```text
玩家作為異世界重生者來到 Oakvale。

最初只是普通居民。

經過多年生活後，
逐漸形成某種身份。

NPC 開始認識他。

他取得自己的住所與事業。

幾名 NPC 也在這段時間成長、
換工作、老去或死亡。

世界發生數個不是固定劇本的事件。

玩家處理了一些，
忽略了一些。

這些選擇造成長期後果。

數十年後，
Oakvale 與玩家剛到達時明顯不同。

玩家能說出：

「這就是我在這個世界活過的一生。」
```

如果只是：

```text
新增很多 Feature
```

但無法產生上述感受，

V2 不算完成。

---

# 53. V2 → V3 Gate

V3 不因 V2 功能完成而自動開始。

只有當 V2 證明：

- Life 有趣
- NPC 值得記得
- Ownership 有意義
- Event 有後果
- Procedural Variation 有差異
- Active Idle 有觀看價值
- 玩家有繼續遊玩的欲望

才能開始：

> V3 — Society & Expansion

V3 才考慮：

- 多聚落
- 多區域
- Trade Route
- Faction
- Kingdom
- Elf Society
- Large Monster Territory
- Dragon World Entity
- Large-scale Economy
- Generational Society

---

# 54. 最終產品原則

Oakvale 不追求：

> 功能最多的奇幻生活 RPG。

Oakvale 的差異化應始終是：

> **一個真正會隨時間生活、老去、變化，而且會記住玩家存在過的奇幻世界。**

V2 的核心不是：

> 更多。

而是：

> **更有意義。**

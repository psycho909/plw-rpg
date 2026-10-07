# Oakvale V2.x Phase6 — Regional Crisis & Civil Defense Integration

本輪只執行：

> **Phase6 — Regional Crisis / Civil Defense Integration**

Phase5 已完成：

`ACCEPTED / PASS WITH FINDINGS`

Phase5 已證明：

```text
Adventure
→ Material
→ Craft
→ Build
→ Adventure
```

Phase6 要第一次把：

```text
Adventure
+
Life
+
NPC
+
Settlement
+
Threat
+
Economy
+
World History
```

接到同一個持續世界事件。

本輪不要開始：

- Phase7 50+ Monsters / 100+ Items
- Theme Ecosystem Packs
- Phase8 Balance
- Phase9 Polish
- Phase10 Final Retention QA
- V3

---

# 1. 開始前

完整閱讀：

- 根目錄 `AGENTS.md`
- `docs/agents/agent-routing.md`
- V2.x 正式規格
- Phase0–5 Tickets
- Phase4 Final Review
- Phase5 Final Review
- Phase5 bugs
- Phase5 life-reward-findings
- 現有 Threat / Settlement / NPC / Combat / Crafting / Economy / World History implementation
- 現有 tests

確認：

```text
branch
HEAD
working tree
Phase5 application source
latest regression baseline
```

Phase5 已驗證 application source：

`f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`

但開始施工前仍需驗證目前實際 HEAD，不要假定 working tree 沒有後續變化。

---

# 2. Phase6 核心產品問題

本輪真正要回答：

> **當世界遭遇危機時，不同人生道路是否都能用自己的方式影響結果？**

不能變成：

```text
危機
→ 所有人都必須打 Boss
```

也不能變成：

```text
危機
→ 玩家交資源
→ Progress Bar +10%
```

真正目標：

```text
World Problem
↓
Signals
↓
Player / NPC Preparation
↓
Different Contributions
↓
Crisis Development
↓
Outcome
↓
Persistent Consequences
↓
New World State
```

---

# 3. 核心產品原則

Regional Crisis 是：

> **社會問題，不是單純 Boss Power vs Player Power。**

危機結果應受：

```text
NPC preparation
Settlement state
Food / resources
Equipment
Player contribution
Adventure actions
World history
Threat state
```

共同影響。

---

# 4. Player 不是唯一救世主

Oakvale 必須維持：

> 沒有玩家，世界仍然會運作。

因此 Crisis：

- NPC 可以自行準備
- Settlement 可以自行抵抗
- 世界可能自行成功
- 世界也可能自行失敗

玩家的作用是：

> **改變概率、成本、傷亡、結果與後續世界。**

不要：

> 玩家沒按按鈕 → Oakvale 必死。

也不要：

> NPC 永遠自動解決 → 玩家沒有影響。

---

# 5. 不同玩法都要有貢獻方式

至少驗證：

```text
Adventure
Life / Crafting
Food / Resource
Economic Support
No Direct Player Intervention
```

不同角色不需要得到相同玩法。

---

# 6. Adventure Contribution

冒險玩家應有高風險、高槓桿選項。

例如：

```text
Scout threat
Destroy camp
Kill elite
Interrupt supply
Rescue NPC
Fight crisis boss
```

本輪不需要全部實作。

選擇：

> **2～3 種真正有差異的 Adventure Contribution**

其中至少一種：

> 直接 Combat。

至少一種：

> 不只是「多殺幾隻普通怪」。

---

# 7. Life Contribution

生活玩家不得被迫戰鬥。

至少支援：

```text
Equipment contribution
Food / supply contribution
Economic contribution
```

其中 Phase5 Craftsmanship 應正式加入 Crisis。

例如：

```text
Craft weapons / armor
↓
Settlement defenders receive equipment support
↓
Defense capability changes
```

不是：

```text
捐一把劍
→ Crisis Score +10
```

應盡量由世界狀態推導效果。

---

# 8. Farmer / Food Contribution

既有 Food / Farming 可以成為：

```text
Siege endurance
NPC readiness
Recovery
```

的輸入。

不要新增完整農業系統。

只利用目前已有資料建立：

> **Food 在 Crisis 中第一次具有世界戰略價值。**

---

# 9. Economic Contribution

Gold 可以支援：

- supplies
- emergency purchasing
- guards
- logistics

但不要新增：

- 完整傭兵系統
- 商隊模擬
- 銀行
- 稅制

本輪只建立：

> Minimal Economic Contribution。

---

# 10. Crafter Contribution

Phase5 的核心成果必須被 Phase6 消費。

例如：

```text
Crafted Equipment
↓
Civil Defense
↓
NPC combat readiness
```

Quality / Rarity / Equipment Value 應造成合理差異。

不能：

```text
Common Sword = Legendary Sword = 1 contribution point
```

但也不要讓 Legendary 一件直接解決整場戰爭。

---

# 11. Contribution Value

Contribution 應根據實際價值推導。

例如概念：

```text
Equipment contribution
=
item effectiveness
× defender suitability
× current shortage
```

Food：

```text
food value
× shortage
× crisis duration
```

Adventure action：

```text
threat reduction
intel
enemy capability reduction
```

不需要把公式暴露給玩家。

---

# 12. Diminishing Returns

避免：

```text
999 food
→ 自動贏
```

或：

```text
製作100把Starter Spear
→ 無條件贏
```

相同 Contribution 必須存在：

> 合理 diminishing return / capacity。

例如：

- defenders 數量有限
- supply 有需求上限
- 一種裝備不能無限疊
- 食物超過 Crisis 需求後價值下降

---

# 13. Role Diversity

不要求所有職業都平衡成完全相同。

允許：

```text
Adventurer
→ 高風險 / 高瞬間影響

Crafter
→ 穩定準備 / equipment leverage

Farmer
→ endurance / supply

Merchant / Wealth
→ logistics / flexibility
```

重要的是：

> 每條路都具有真實影響。

---

# 14. Canonical Crisis Vertical Slice

Phase6 只建立：

> **一個完整 Regional Crisis Vertical Slice**

不要同時建立：

```text
Goblin War
Wolf Invasion
Undead Plague
Dragon Attack
Bandit Siege
```

優先使用既有 Threat / Goblin 系統。

若現有架構允許：

> **Goblin Regional Crisis**

應是第一選擇。

原因：

- 已存在 Goblin
- 已存在 Goblin Chief
- 已存在 Threat Population
- 已存在 Camp
- 已存在 Warning
- 已存在 Settlement Defense 相關語意

不要為 Phase6 發明新的 Monster Family。

---

# 15. Crisis 不等於原 Goblin Chief 事件

現有 Threat / Goblin Chief 可以作為輸入。

但 Phase6 Crisis 應升級成：

```text
Threat
↓
Signals
↓
Preparation
↓
Escalation
↓
Regional Crisis
↓
Response
↓
Outcome
↓
Aftermath
```

而不是：

```text
Threat滿
→ Boss出現
```

---

# 16. Crisis State Machine

建立明確 Crisis lifecycle。

最低建議：

```text
DORMANT
↓
WARNING
↓
PREPARATION
↓
ACTIVE
↓
RESOLUTION
↓
AFTERMATH
↓
COOLDOWN
```

實際名稱依專案 convention。

禁止大量布林：

```text
isCrisis
isWarning
isBattle
isAfterBattle
...
```

造成 illegal state combinations。

---

# 17. Crisis Instance

Crisis 應具有自己的穩定 identity。

概念：

```text
crisisId
type
region
createdAt
phase
severity
threatSource
signals
contributions
worldSnapshot / derived factors
outcome
resolvedAt
```

不要保存不必要的大型 duplicated world snapshot。

---

# 18. Crisis Cause

危機不能純粹：

> 每 X 天隨機觸發。

至少由：

```text
Threat
+
World conditions
+
Cooldown
+
Seeded RNG
```

決定。

未來 Phase7 Theme Packs 可以加入更多 Crisis Types。

Phase6 先做架構。

---

# 19. Crisis Signals

玩家必須在 Active Crisis 前得到 Signal。

例如：

- travelers
- sightings
- settlement warning
- NPC concern
- camp activity
- supply shortage
- world log

避免：

```text
正常一天
↓
突然Oakvale被攻擊
```

---

# 20. Preparation Window

WARNING / PREPARATION 階段必須給玩家：

> 合理反應時間。

玩家可以：

```text
prepare gear
craft
stock food
invest gold
scout
attack camps
```

不需要全部做。

---

# 21. World-driven Needs

Crisis 應根據實際狀態產生 Needs。

例如：

```text
缺裝備
缺食物
敵方情報不足
敵方Camp過強
```

UI 可呈現：

> Settlement needs equipment.

而不是：

> Quest: Donate 5 swords (0/5)

除非世界實際需求就是 5。

---

# 22. 禁止 Daily Quest 化

不要：

```text
每日提交3食物
每日殺5哥布林
每日製作2武器
```

Regional Crisis 是：

> 世界狀態造成的需求。

不是 Retention Checklist。

---

# 23. Civil Defense Model

建立一個集中、可測試的：

> **Civil Defense / Regional Resistance Model**

不要把 Crisis 結果散落在多個 UI / Store 中。

概念因素可包含：

```text
Defenders
Equipment Readiness
Supply
Morale
Intel
Threat Strength
Player Contributions
```

實際只使用現有系統能可靠支援的項目。

---

# 24. 不要過度模擬

Phase6 不需要：

- 每一個 NPC 都完整 tactical simulation
- 軍隊 formation
- supply route graph
- RTS combat
- 逐秒 siege simulation

Civil Defense 可以是：

> Aggregate Simulation

但 Outcome 必須能追溯。

---

# 25. Outcome Explainability

如果 Oakvale 勝利：

玩家應能知道大致原因。

例如：

```text
良好補給
防衛裝備充足
敵方Camp提前遭破壞
```

如果失敗：

```text
防衛人數不足
糧食不足
敵方Threat過高
```

不要只顯示：

> Crisis Score 63 vs 58。

內部可以有 score。

UI 應用世界語言呈現。

---

# 26. NPC Autonomy

NPC 應自行產生：

```text
baseline defense contribution
```

來源：

- population
- guards
- settlement level
- equipment
- food
- prosperity

玩家不是 Civil Defense 唯一來源。

---

# 27. No-player Baseline

必須測：

> 玩家完全不參與。

結果不能永遠固定：

```text
FAIL
```

也不能：

```text
PASS
```

應根據世界準備狀態產生不同結果。

---

# 28. Overprepared World

如果世界本身：

```text
Prosperous
Well supplied
Well equipped
Strong population
```

中等 Crisis 有可能：

> 不需要玩家親自參戰也能成功。

這是設計需求，不是 Bug。

---

# 29. Underprepared World

如果：

```text
Low population
Low supply
Weak equipment
High threat
```

世界應明顯更危險。

玩家可以：

> 改善結果。

但不能保證每一種單一貢獻都能救場。

---

# 30. Adventurer Leverage

冒險行動應能改變：

```text
Enemy Strength
Intel
Boss State
Camp Strength
Attack Timing
```

至少其中 2 項。

例如：

```text
destroy camp
→ enemy strength down

scout
→ uncertainty down

kill elite
→ enemy capability down
```

---

# 31. Boss

Crisis Boss 可以使用既有：

> Goblin Chief

不要建立新的 Boss。

Boss 必須是：

> Crisis 的高槓桿 Adventure Option。

不是：

> 所有玩家都必須殺 Boss。

---

# 32. Life-only Resolution

建立至少一個受控 Scenario：

```text
Player does not personally fight crisis Boss.
```

但透過：

```text
Crafting
Food
Gold
World preparation
```

使 Oakvale：

> 成功或以較低損失度過危機。

這是 Phase6 核心 Gate。

---

# 33. Adventure-only Resolution

也測：

```text
Player ignores Life preparation
but attacks threat directly.
```

可以成功。

但可能：

- 傷亡較高
- 資源消耗較高
- aftermath 較差

不要硬性要求一定如此。

由 Balance 支持。

---

# 34. Mixed Strategy

通常應該讓：

```text
Life preparation
+
Adventure intervention
```

具有最高穩定性。

但不要讓它成為：

> 唯一正確 Build。

---

# 35. Crisis Outcomes

至少建立分級結果。

例如：

```text
DECISIVE_SUCCESS

COSTLY_SUCCESS

SETBACK

LOCAL_DEFEAT
```

名稱依 domain convention。

不要只：

```text
WIN
LOSE
```

---

# 36. Consequences

Outcome 必須改變 World State。

可能影響：

```text
population
NPC injury/death
prosperity
food
equipment
reputation
threat
services
world history
```

不要每次全部改。

建立一套清楚、有限、可測的 Consequence Model。

---

# 37. Failure 不等於 Game Over

Local Defeat 不得：

> Delete save。

不得：

> Reset world。

不得：

> 強制建立新角色。

世界必須：

> 繼續。

---

# 38. Graded Loss

不要直接：

```text
玩家30小時資產全部消失
```

合理後果可以是：

- property temporarily inaccessible
- shop closed
- NPC injured
- prosperity loss
- supplies lost
- increased threat
- recovery need

但不要過度懲罰。

---

# 39. Ownership Safety

Phase5 已建立 Life Ownership / Workshop Utility。

Phase6 若造成 property 影響：

必須：

> graded。

不要直接 permanent deletion。

本輪不做完整 Property Destruction Simulator。

---

# 40. Settlement Fall

長期設計允許：

> Oakvale 可以失守。

但 Phase6 Vertical Slice 不要求完成：

> 完整 abandoned-town alternate world。

第一版可以使用：

```text
Compromised / Occupied / Severe Damage
```

之類受控狀態。

只要：

> 世界結果持久且有後果。

完整 abandoned settlement 可以後續擴充。

---

# 41. Recovery

危機結束後不能：

```text
Outcome
↓
所有東西瞬間恢復
```

AFTERMATH 應存在。

例如：

```text
recover supply
heal NPC
restore prosperity
clear remaining threat
```

但不要建立大型 Reconstruction System。

---

# 42. Crisis Cooldown

Regional Crisis 不能變成 recurring tax。

必須存在：

```text
cooldown
```

並受到：

- Crisis severity
- Outcome
- Threat
- World state

影響。

不要：

> 每幾天固定再來一場。

---

# 43. Crisis Frequency

Phase6 QA 必須測：

> 長期 Crisis Frequency。

避免：

```text
100年
→ 300場危機
```

也避免：

```text
100年
→ 1場
```

但本輪不要急著設定產品最終頻率。

先建立合理 baseline distribution。

---

# 44. Persistent History

至少記錄：

```text
Crisis started
Major player contribution
Boss outcome
Final outcome
Major consequence
```

不要把：

> 每捐1食物

都寫入 World History。

---

# 45. Contribution History

重大行為可以記：

```text
某角色為防衛打造武器
某角色摧毀Goblin Camp
某角色擊敗Chief
```

但需要 threshold。

避免 Journal 爆炸。

---

# 46. C02 Journal Growth

Phase6 尤其需要監控既有：

> C02 append-only Journal Growth。

因為 Crisis 很容易製造大量事件。

要求：

- Crisis event logging 有 tier
- 不把每個 tick 寫 Journal
- 不把每個 contribution 重複寫重大歷史

---

# 47. Crisis UI

UI 應回答：

```text
發生什麼？
目前處在哪個階段？
世界需要什麼？
我能做什麼？
我做的事情有沒有產生影響？
```

不要做 MMORPG Raid Dashboard。

維持：

> World First / Retro UI。

---

# 48. Readiness Presentation

內部可以有 numeric model。

玩家 UI 優先顯示：

```text
Defenders: Poor / Adequate / Strong
Supplies: Short / Stable / Abundant
Equipment: Poor / Adequate / Strong
Enemy Threat: Low / High / Severe
```

避免直接：

```text
Defense Power 7134
Enemy Power 6962
```

除非現有 UI 已使用明確數值且有充分理由。

---

# 49. Contribution Feedback

玩家 Contribution 完成後：

要能理解：

> 世界發生了什麼變化。

例如：

```text
你交付的武器已配發給守衛。
```

而不是：

> +7 Defense Points。

---

# 50. Crisis Requests

可以建立 Minimal Crisis Request。

例如：

```text
Need weapons
Need food
Need scouting
```

Request 必須：

- 從 World State 產生
- Crisis 結束後失效
- 已滿足需求不繼續要求
- Save / Reload 正確

---

# 51. Request 不等於強制任務

玩家可以：

> Ignore。

世界仍繼續。

這是 Oakvale Persistent World 的必要特性。

---

# 52. Identity / Reputation

不同 Contribution 可以強化：

```text
Adventurer Identity
Smith Identity
Community Reputation
```

但只接既有系統。

不要新建完整 Hero/Fame Tree。

---

# 53. Crisis Reputation

Reputation reward 不應只看：

> 最後 Boss 是誰殺的。

應至少可以認可：

```text
Major supply contribution
Major crafting contribution
High-risk adventure contribution
```

避免生活玩家永遠被世界忽略。

---

# 54. No Forced Combat

建立 regression：

Life-focused character 可以：

```text
participate meaningfully
```

而完全不進 Crisis Combat。

如果 Crisis UI 或流程：

> 強制 combat modal

則 FAIL。

---

# 55. No Forced Crafting

反過來：

Adventure-focused character 不得被迫：

> 練 Smithing 才能通關危機。

World / NPC 可以提供 baseline equipment。

---

# 56. No Dominant Contribution

Simulation 檢查：

```text
Food spam
Cheap weapon spam
Gold spam
Boss-only strategy
```

是否存在單一路徑壓倒所有其他方式。

若存在：

記為：

> Contribution Collapse。

---

# 57. Contribution Caps

可以使用：

```text
need-based cap
diminishing return
capacity
```

避免 spam。

不要使用完全人工：

```text
一天最多捐3次
```

除非有世界內合理原因。

---

# 58. Crisis Determinism

同：

```text
world state
seed
action sequence
```

必須得到相同：

```text
crisis trigger
crisis phase
contribution effect
outcome
consequence
```

所有 RNG 走既有 RandomService。

禁止 `Math.random()`。

---

# 59. Save / Reload

完整驗證：

```text
WARNING
save/reload

PREPARATION
save/reload

ACTIVE
save/reload

AFTERMATH
save/reload
```

不得：

- duplicate Crisis
- reset contribution
- reroll outcome
- reroll boss state
- duplicate rewards
- replay consequence

---

# 60. Mid-crisis Death / Succession

至少受控測試：

```text
player dies during Crisis
↓
successor
↓
Crisis continues
```

Regional Crisis 屬於：

> World State。

不能因角色死亡消失。

---

# 61. NPC Death

若 Crisis 可以造成 NPC Death：

必須沿用既有：

- aging/death
- NPC identity
- history
- succession/world references

不要產生：

- ghost NPC reference
- invalid ownership
- broken companion
- broken job slot

---

# 62. Settlement Progression

Hamlet / Village / Town 可以影響：

> baseline Civil Defense。

但不要為了 Crisis 重做 Settlement progression。

---

# 63. Crisis × Economy

驗證：

```text
preparation spending
resource consumption
aftermath cost
```

不造成：

> Crisis = 免費產金。

也不應：

> 每場危機都把玩家經濟清空。

---

# 64. Crisis × Crafting

Phase5 Crafting 必須有實際用途。

測試：

```text
same crisis state
+
weak equipment support

vs

same crisis state
+
strong crafted equipment support
```

結果應有統計差異。

---

# 65. Crisis × Food

同樣建立 controlled contrast：

```text
low supply
vs
adequate supply
```

至少在：

- casualty
- endurance
- outcome probability

之一產生差異。

---

# 66. Crisis × Adventure

Controlled contrast：

```text
enemy camp intact
vs
camp destroyed
```

或：

```text
elite alive
vs
elite defeated
```

結果必須真正不同。

---

# 67. Outcome Simulation

建立 deterministic Crisis Simulator。

至少 Scenario：

```text
No Player
Life Only
Adventure Only
Mixed
Overprepared World
Underprepared World
```

多 Seeds 執行。

---

# 68. Monte Carlo

若成本合理：

至少：

```text
10,000+ crisis resolutions
```

不是 Browser。

使用 engine simulation。

統計：

```text
Outcome Distribution
Casualties
Resource Loss
Contribution Value
World State Effects
Role Strategy Performance
```

---

# 69. 不要求所有策略50/50

目的不是：

> 所有玩法勝率完全一致。

而是：

> 每種合理策略都有真實影響，而且不存在荒謬 dominant exploit。

---

# 70. Multi-seed Long World

至少：

```text
3+ seeds
×
10 / 50 / 100 years
```

監控：

```text
crisis count
outcomes
population
settlement survival
economy
history
save size
journal growth
```

---

# 71. Long-world Failure Criteria

特別找：

```text
Crisis spam
Population death spiral
Permanent poverty loop
Settlement never recovers
Infinite food accumulation
Infinite threat accumulation
Journal explosion
```

這些是 Phase6 最重要的 long simulation risk。

---

# 72. Product Finding vs Bug

Bug：

> Crisis resolution violates rules.

Product Finding：

> Crisis technically works but feels too frequent.

保持分開。

不要因 Agent 覺得危機太難：

> 偷偷調低所有 Threat。

---

# 73. Browser Normal Flow

至少完成一條合法正常流程：

```text
World signal appears
↓
Preparation
↓
Player contributes
↓
Crisis activates
↓
Player chooses participation style
↓
Resolution
↓
Outcome
↓
Aftermath
↓
Save / Reload
```

不要使用 debug state injection。

可以使用：

- x5 / x20
- Rest
- 正常世界操作

縮短時間。

---

# 74. Controlled Fixtures

以下可以使用 Fixtures：

```text
Life-only comparison
Adventure-only comparison
Defeat outcome
Succession
Extreme supply
Extreme defense
```

但報告必須明確標記：

> CONTROLLED FIXTURE

不得冒充正常 fresh-save 遊玩。

---

# 75. Agent Crisis Playtest

執行：

> **30～60 分鐘 Crisis-focused Agent Playtest**

觀察：

```text
Did it understand the warning?
Did it understand what the world needed?
Did it choose a role?
Did its contribution visibly matter?
Was combat forced?
Was crafting forced?
Did it understand the outcome?
Did aftermath create another goal?
```

Agent 不是真人。

---

# 76. Role Playtests

至少受控驗證：

```text
Adventurer
Crafter
Resource/Food
Mixed
```

不用四個都跑30分鐘 Browser。

可以：

> engine simulation + focused browser。

---

# 77. Browser Stress

仍不預設2小時。

先：

> **20～30分鐘 Integrated Stress**

包含：

```text
crisis state transitions
contribution
craft
inventory
combat
save/reload
NPC
modal
history
aftermath
```

監控：

```text
heap
DOM
listeners
save size
IDB records
journal
UI latency
storage errors
```

---

# 78. Extended Soak Escalation

若出現：

- persistent heap rise
- detached DOM growth
- journal acceleration
- save latency degradation
- duplicate crisis
- repeated reload state drift

才升級：

```text
60m
→ 120m if evidence requires
```

---

# 79. Existing Technical Findings

繼續監控：

```text
C01 Export / Interleaving
C02 Journal Growth
C03 Detached DOM / Listener
```

Phase6 不主動重構它們。

只有 Regression Evidence 才升級處理。

---

# 80. Phase5 Findings

不要用 Crisis 掩蓋：

- long-term economy 尚未完整證明
- residential workshop natural progression 尚未完整探索
- natural Masterpiece pursuit 尚未完整探索

這些仍然是 Product Findings。

Phase6 不要求補完。

---

# 81. Agent Routing

遵守：

`docs/agents/agent-routing.md`

基本：

```text
Low
→ exploration / runner / simulation / data

Medium
→ normal engineering / UI / ordinary fixes

Max
→ Crisis core model / save / determinism / deep review

Sol
→ architecture / scope / gate
```

直接選最低足以可靠完成的 tier。

不要固定：

`Low → Medium → Max`

逐級試錯。

---

# 82. Implementation Order

嚴格建議：

```text
Phase6-A
Baseline / Existing Threat Audit
↓
Phase6-B
Crisis State Model
↓
Phase6-C
Civil Defense Model
↓
Phase6-D
Life Contributions
↓
Phase6-E
Adventure Contributions
↓
Phase6-F
Resolution / Consequences
↓
Phase6-G
Signals / Requests / UI
↓
Phase6-H
History / Identity Integration
↓
Phase6-I
Simulation / Balance
↓
Phase6-J
Browser / QA / Review
```

不要一次把整個 Crisis 塞進單一 Ticket。

---

# 83. Phase6-A — Baseline

先記錄：

```text
existing threat behavior
goblin camp
goblin chief
settlement defense
population
food
equipment
prosperity
existing warning
existing history events
```

不要先修改。

先建立 baseline。

---

# 84. Phase6-B — Crisis State Model

只完成：

```text
trigger
state transition
save
reload
determinism
```

還不要先做全部 contribution。

先確認 lifecycle 可靠。

---

# 85. Phase6-C — Civil Defense

建立純 Domain：

```text
calculateDefenseState(...)
resolveCrisis(...)
```

或符合現有 architecture 的等價設計。

不得綁 Vue component。

---

# 86. Phase6-D — Life

先接：

```text
Equipment
Food
Gold
```

不要一次擴所有 Career。

---

# 87. Phase6-E — Adventure

只接 2～3 個高價值行動。

至少：

```text
Camp / Threat intervention
Boss / Elite intervention
```

---

# 88. Phase6-F — Resolution

完成：

```text
Success
Costly Success
Setback
Local Defeat
```

與 persistent consequence。

---

# 89. Phase6-G — UI

玩家能：

```text
see
understand
decide
act
observe consequence
```

再進下一步。

---

# 90. Phase6-H — History

只保存重大 Crisis Events。

避免 C02 惡化。

---

# 91. Phase6-I — Balance

跑：

```text
No Player
Life Only
Adventure Only
Mixed
Prepared
Unprepared
```

與 multi-seed simulation。

修：

- dominant strategy
- impossible crisis
- automatic victory
- crisis spam
- death spiral

---

# 92. Phase6-J — QA

至少：

```text
Full Regression
Typecheck
Production Build

Save / Migration
Determinism

Crisis lifecycle tests
Civil Defense tests
Contribution tests
Outcome tests
Consequence tests
Succession tests

Monte Carlo
10/50/100-year simulation

Browser Regression
20–30m Stress
Crisis Agent Playtest

Independent Review
```

---

# 93. Human Validation

如果還是 Internal Development：

```text
Human Product Gate:
DEFERRED / NOT APPLICABLE
```

如果 Phase4/5 後已部署 Playtest Alpha：

Owner 可以額外真人玩。

但 Human Findings 與 Engineering Gate 分離。

---

# 94. Independent Review

一般 UI / normal implementation：

`Luna Medium Reviewer`

核心 Crisis Model：

`Luna Max Deep Reviewer`

必須特別 Review：

```text
state machine
determinism
save/reload
NPC autonomy
contribution math
resolution
consequence
journal behavior
```

---

# 95. QA Artifacts

沿用既有 QA evidence structure。

至少：

```text
baseline.md
crisis-model.md
civil-defense.md
contribution-analysis.md
crisis-simulation.json
crisis-balance.md
long-world.md
browser-regression.md
browser-stress.md
agent-crisis.md
bugs.md
crisis-findings.md
final-review.md
```

檔名可依 repository convention 調整。

不要建立另一套 QA framework。

---

# 96. Source Provenance

延續 Phase4/5 的：

```text
source freeze
tested source fingerprint
delivery source commit
correlation
```

正式報告必須區分：

```text
base commit
tested working source
delivery commit
QA/document commits
```

不得把文件 commit 冒充受測 application source。

---

# 97. Phase6 Gates

最終分開：

### Engineering Gate

```text
PASS
PASS WITH FINDINGS
FAIL
```

### Crisis Lifecycle Gate

確認：

```text
Cause
→ Signal
→ Preparation
→ Active
→ Resolution
→ Aftermath
```

完整成立。

### Civil Defense Gate

確認：

> 世界本身具有抵抗能力，不完全依賴玩家。

### Life Contribution Gate

確認：

> 玩家可以不進 Combat 而真正影響危機。

### Adventure Contribution Gate

確認：

> Adventure action 可以對危機造成高槓桿影響。

### Role Freedom Gate

確認：

> 不存在強制 Combat / Crafting。

### Consequence Gate

確認：

> Crisis Outcome 真正改變 Persistent World。

### Recovery Gate

確認：

> Failure 不等於 Game Over，世界可以繼續。

### Human Gate

依部署狀態：

```text
DEFERRED
```

或另列 Human Product Findings。

---

# 98. Phase6 Definition of Done

Phase6 不是：

> 顯示一條 Crisis Progress Bar。

必須證明至少：

```text
世界根據 Threat / World State 產生危機。

玩家在危機前得到足夠 Signal。

NPC 與 Settlement 本身具有 baseline resistance。

生活玩家可以透過 Equipment / Food / Economy 產生實際影響。

Crafter 製作的裝備能實際改善 Civil Defense。

冒險玩家可以透過高風險行動削弱 Threat。

玩家可以完全不打 Boss 仍然有可能幫助世界成功。

玩家也可以主要依靠 Adventure 行動處理危機。

Mixed Strategy 可以自然成立。

沒有單一廉價資源可以無限 spam 解決危機。

危機有至少數種分級 Outcome。

不同 Outcome 會留下不同 Persistent Consequences。

Local Defeat 不會 Game Over 或 Reset World。

Crisis Aftermath 不會瞬間消失。

Crisis 具有 Cooldown，不形成 recurring tax。

角色死亡／Succession 不會重置 Crisis。

Save / Reload 不會 reroll 或 duplicate Crisis。

World History 會記錄重大危機結果。

長期 Simulation 不會明顯造成 Crisis Spam、Population Death Spiral 或 Journal Explosion。

V1 / V2 / Phase0–5 regression 保持通過。
```

---

# 99. 最重要的五個驗收問題

Final Review 必須用 Evidence 回答：

### Question 1

> **如果玩家完全不參加戰鬥，他是否仍能真正改變危機結果？**

### Question 2

> **如果玩家走 Adventure 路線，他是否有只有冒險者才能提供的高槓桿價值？**

### Question 3

> **如果玩家什麼都不做，世界是否仍能根據自身狀態合理地成功或失敗？**

### Question 4

> **危機失敗後，世界是否變成新的可繼續遊玩狀態，而不是 Game Over？**

### Question 5

> **危機是否讓 Adventure、Life、NPC 與 Settlement 第一次真正成為同一個世界，而不是四套彼此無關的系統？**

如果五題都能由：

```text
Domain Tests
Deterministic Simulation
Long-world Simulation
Browser Runtime
Agent Playtest
Independent Review
```

共同支持：

> **Phase6 可以 Gate。**

否則：

> 保留 Phase6。

不要進 Phase7 用大量 Content 掩蓋系統問題。

---

# 100. Product Principle

Phase4：

> **Adventure discovers value.**

Phase5：

> **Life transforms value.**

Phase6 要完成：

> **The world gives that value meaning.**

完整循環第一次成形：

```text
Explore
↓
Fight
↓
Loot / Material
↓
Craft / Build
↓
Support Society
↓
World Crisis
↓
World Changes
↓
New Needs / Opportunities
↓
Explore Again
```

Oakvale 的核心不再只是：

> 「我要變強。」

而開始變成：

> **「我選擇過什麼人生，會改變這個世界如何活下去。」**
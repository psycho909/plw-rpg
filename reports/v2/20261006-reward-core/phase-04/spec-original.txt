# Oakvale V2.x Phase4 — Adventure Reward Loop

本輪只執行：

> **Phase4 — Adventure Reward Loop**

不要開始 Phase5～10。

目前 Phase0–3 已完成並通過：

> **Development / Engineering Gate: PASS WITH FINDINGS**

目前已存在：

- Reward Data Model
- Procedural Equipment
- 3 Weapon Bases
- 2 Armor Bases
- 5 Rarities
- 7 Affixes
- Wolf Family
- Elite
- Boss
- Controlled Boss Variants
- Monster Traits
- Boss-specific mechanics
- Procedural Loot
- Inspect / Equip / Save / Reload
- Collection / Discovery 基礎
- Deterministic RNG
- Save Migration

本輪的目的不是證明：

> 「隨機裝備可以生成。」

而是證明：

> **「隨機裝備與怪物差異真的會改變玩家下一個冒險決策。」**

---

# 1. 開始前

先完整閱讀：

- 根目錄 `AGENTS.md`
- `docs/agents/agent-routing.md`
- V2.x 正式規格
- `tickets/20261006-v2x-00`
- `tickets/20261006-v2x-01`
- `tickets/20261006-v2x-02`
- `tickets/20261006-v2x-03`
- Phase0–3 最終 Engineering Review
- Phase3 bugs / reward findings / performance
- 現有 tests
- 現有 Reward / Monster / Loot implementation

確認最新：

```text
branch
HEAD
working tree
source SHA
test baseline
```

不要使用舊 QA 結果代替目前 source 驗證。

---

# 2. Phase4 核心問題

本輪只回答：

> **玩家殺死怪物並取得 Loot 後，是否會自然產生下一個冒險目標？**

完整 Loop：

```text
Explore
↓
Encounter
↓
Monster / Variant / Elite
↓
Risk
↓
Combat
↓
Loot
↓
Inspect
↓
Equip / Keep / Sell
↓
Build changes
↓
New combat capability
↓
Harder target
↓
Boss
↓
Boss-specific reward
↓
Next goal
```

如果玩家只是：

```text
殺怪
↓
拿裝備
↓
看數字
↓
賣掉
↓
繼續殺同樣的怪
```

則 Phase4 不成立。

---

# 3. 核心產品原則

Adventure Reward 的主要心理來源：

```text
Curiosity
Risk
Anticipation
Loot
Progress
Build
Mastery
Boss
```

Phase4 必須強化：

> **「下一隻會掉什麼？」**

以及：

> **「這件裝備能不能讓我做以前做不到的事情？」**

不要只提高 Gold / EXP。

---

# 4. 不擴充大量 Content

Phase4 不進行：

```text
50+ Monsters
100+ Items
完整 Monster Families
大型新區域
大量新 Dungeon
Theme Packs
```

可以增加少量：

- 測試用 Item Base
- Affix
- Loot entry
- Combat modifier

但只能在：

> 驗證 Reward Loop 必須

的情況下增加。

真正大量 Content Expansion 留到 Phase7。

---

# 5. Loot Anticipation

不同危險層級必須讓玩家對 Loot 有不同期待。

最低區分：

```text
Normal
Variant
Elite
Boss
```

Reward expectation 應逐級提高。

不是只：

```text
Normal = 1 item
Elite = 2 items
Boss = 3 items
```

還應考慮：

```text
Rarity Weight
Affix Quality
Exclusive Pool
Rare Material Chance
Special Base Chance
```

---

# 6. Risk → Reward

必須避免：

> 最安全怪物永遠是最高效率玩法。

檢查：

```text
Reward / Risk
Reward / Time
Reward / Resource Cost
```

Normal Monster 應適合：

- 穩定取得
- 基礎 Progress

Elite 應提供：

- 更高期待值
- 更高品質機會
- 特殊 Loot 機會

Boss 應提供：

- 明確 Exclusive Reward Identity
- Rare Material
- Build-relevant Reward
- Collection / History Value

---

# 7. Boss-specific Loot

Boss 不得只是：

> 普通 Loot Table × 3。

目前 Wolf Boss 應建立清楚：

```text
Wolf Boss Loot Identity
```

例如：

```text
Wolf Fang Material
Wolf Hide Material
Wolf-themed Equipment Base
Beast-related Affix Bias
Boss-exclusive Reward
```

實際名稱依目前專案內容。

不要新增大量未來 Theme Content。

---

# 8. Loot Table Architecture

確認現有 Loot Table 可以支援：

```text
Guaranteed
Weighted
Conditional
Elite
Boss-specific
Exclusive
Rare
```

如果已能支援，不重寫。

只有現有架構確實無法支援 Phase4 時才擴充。

不要為了「更漂亮」重構。

---

# 9. Upgrade Decision

Loot 必須產生真實決策：

```text
Equip
Keep
Sell
Ignore
Build around
```

建立測試與分析，觀察：

- 新裝備直接升級比例
- Sidegrade 比例
- 明顯垃圾比例
- 不同 Rarity 的使用價值
- Boss Loot 是否真的值得保留

不要直接硬設一個任意 PASS 百分比。

先取得 Distribution。

如果結果顯示：

> 大量掉落永遠沒有合理用途

才調整。

---

# 10. PF02 必須在本輪深入驗證

Phase3 Finding：

> `PF02 raw slot stats 96.50% 低於固定 legacy compare`

不要單純：

> 把新裝備數值全部提高。

Phase4 必須改用：

> **Effective Combat Value**

評估：

```text
Base Stats
+
Affixes
+
Trait Utility
+
Build Synergy
+
Actual Combat Outcome
```

比較至少：

```text
Legacy Fixed Equipment
vs
Procedural Common
vs
Rare
vs
Epic
vs
Boss Reward
```

---

# 11. Effective Combat Value

不要只比較：

```text
ATK
DEF
```

必須透過實戰 Simulation 比較：

```text
Win Rate
Turn Count
Damage Taken
Damage Dealt
Potion Usage
Survival Rate
```

必要時依 Build 類型分開。

---

# 12. Build Differentiation

Phase4 不需要完整 ARPG Build System。

但至少開始形成數種不同方向。

建議最低驗證：

```text
Raw Damage
Crit / Speed
Bleed
Defense
```

依目前 Affix 實際支援調整。

目標：

> 換不同裝備後，最佳戰鬥選擇或結果真的改變。

如果所有 Build：

> 只是 ATK 越高越好

則 Phase4 尚未成立。

---

# 13. Affix Utility

檢查目前每個 Affix：

```text
是否實際進 Combat Formula
是否有明確用途
是否能被玩家理解
是否可能形成 Build
```

禁止：

> UI 顯示 Affix，但 Simulation 沒有真正使用。

也禁止：

> Affix technically works，但弱到完全沒有決策價值。

---

# 14. Affix Conflict / Eligibility

維持：

> Controlled Randomness。

不得產生明顯矛盾或無意義詞條。

例如：

- 不支援的武器機制
- 完全無法觸發的效果
- 同類 mutually exclusive 詞條錯誤共存
- Equipment Slot 不可能使用的 Affix

加入 regression。

---

# 15. Rarity Identity

檢查：

```text
Common
Uncommon
Rare
Epic
Legendary
```

是否真的有心理差異。

不要只靠顏色。

Rarity 至少影響：

```text
Affix Count
Affix Tier
Roll Quality
Special Eligibility
Drop Expectation
```

但避免：

> Common 完全沒有存在價值。

Common 可以：

- Early progression
- Sell value
- Baseline comparison

---

# 16. Legendary

Phase4 可以驗證 Legendary Loot。

但不要開始：

```text
Masterpiece
Crafting Legendary
Workshop
Crafter provenance
```

那些留 Phase5。

Legendary 在 Phase4 只驗證：

> Adventure Loot Jackpot。

---

# 17. Monster Traits × Equipment

建立真正交互。

例如：

```text
Armored Monster
→ Armor Penetration 有價值

Fast Monster
→ Defense / Speed response 有價值

Bleed-capable Build
→ 高HP target 有不同價值
```

不要為了做到這一條而增加大量新系統。

使用現有 Wolf Family 與現有 Trait 優先。

---

# 18. Monster Readability

Random Trait 不能變成：

> 玩家死了才知道這隻怪有什麼能力。

至少：

- Name
- Combat notice
- Inspect / battle UI

應讓重要 Trait 可讀。

目標：

> 玩家可以根據敵人決定是否冒險。

---

# 19. Elite Value

Elite 必須形成：

```text
Higher Danger
+
Higher Reward Expectation
```

檢查：

- 玩家是否有理由主動挑 Elite
- Elite Reward 是否值得風險
- Elite 是否只是 HP 增加
- Trait 是否真的改變戰鬥

---

# 20. Boss Preparation

Boss 不能只測：

> Player Power >= Boss Power。

至少讓：

```text
Gear
Affix
Potion
Companion
Boss Variant knowledge
```

中的數項對結果有意義。

不要加入完整 Weakness System，除非目前已經有相容機制。

---

# 21. Boss Variant Value

目前已有 Controlled Boss Variants。

Phase4 要驗證：

> Variant 是否真的讓準備與 Build 決策不同。

不能只是：

```text
Boss A ATK +10%
Boss B HP +10%
```

應至少有：

> Combat behavior / desirable counter 不同。

---

# 22. Push Your Luck — Minimal Slice

Phase4 可以做最小版：

> 「繼續冒險還是撤退？」

但不要重做完整 Dungeon。

如果現有系統允許：

利用：

```text
Current HP
Potion
Loot carried
Next threat
```

建立一個最小 Risk Decision。

如果需要大幅重構 Dungeon：

> DEFER。

記錄為 Phase later finding。

---

# 23. Adventure Goal Visibility

玩家需要知道：

> 有什麼值得繼續追。

不要做 Quest Marker 海。

可以利用：

- Collection
- Rumor
- Threat
- Boss warning
- Unknown loot
- Monster discovery
- Equipment comparison

讓：

```text
下一個可能目標
```

可理解。

---

# 24. Collection

現有 Collection 可以在本輪加強：

```text
Monster Seen
Monster Defeated
Loot Discovered
Boss Defeated
Rare Found
```

不要變成：

> 強制 Checklist。

作用是：

> Curiosity。

---

# 25. Reward Presentation

重要 Loot 必須有足夠 Feedback。

至少區分：

```text
Normal Drop
Rare Drop
Boss Drop
New Discovery
```

保持 Oakvale：

> World First / Retro UI

不要做成滿螢幕 Mobile Gacha 動畫。

Feedback 要清楚，不要浮誇。

---

# 26. Loot Compare UX

玩家取得裝備後應快速知道：

```text
Current
vs
New
```

顯示：

- Base stats
- Affixes
- Rarity
- relevant difference

避免需要在兩個 Window 來回記數字。

---

# 27. Inventory Friction

確認 Procedural Gear 增加後：

> Inventory 不會快速變成垃圾堆。

本輪先觀察：

- item count
- sell frequency
- compare friction
- duplicate-like gear

不要立即做：

```text
Salvage System
Auto Loot Filter
Warehouse
```

除非已有明確 blocker。

先記錄後續需求。

---

# 28. Economy

Loot 加入後必須檢查：

```text
Gold inflow
Equipment sell value
Potion cost
Shop value
```

避免：

> 刷怪後經濟直接崩壞。

也避免：

> Loot 賣價低到完全沒意義。

Phase4 只做必要 Balance。

不要重做完整 Economy。

---

# 29. Reward Drought

正式測：

> 玩家是否長時間沒有值得注意的新東西。

定義：

```text
Reward Drought
```

記錄：

- 時間
- encounters
- drops
- meaningful upgrades
- discoveries

不要為了解決 Reward Drought：

> 每一場都掉 Rare。

---

# 30. Meaningless Reward

找：

```text
掉了
↓
玩家看了
↓
沒有任何用途
↓
立刻忽略
```

區分：

- 正常低價值掉落
- 過量垃圾
- 真正完全無用途

不要追求：

> 每件 Loot 都是 Upgrade。

那會破壞 Loot Chase。

---

# 31. Goal Drought

Agent Playtest 中記錄：

> 任何「不知道下一步做什麼」的時間點。

如果：

```text
Boss dead
↓
世界暫時安靜
↓
沒有下一個 Adventure hook
```

必須記錄。

但不要為此提前新增大量 Phase7 Content。

---

# 32. Reward Cadence

分析不同時間尺度：

```text
每場 Combat
5～10分鐘
10～30分鐘
Boss cycle
```

觀察：

- Small reward
- Medium reward
- Jackpot
- New target

不要先設定人工固定掉落節拍。

先量測實際分布。

---

# 33. Adventure Vertical Slice Definition

本輪最終至少要能自然發生：

```text
玩家探索
↓
遇到普通狼
↓
遇到帶Trait的強敵
↓
取得一件值得比較的裝備
↓
裝備改變Build或實戰結果
↓
玩家主動尋找Elite
↓
取得更高價值Reward
↓
準備Wolf Boss
↓
面對Controlled Variant
↓
取得Boss-specific Reward
↓
產生下一個裝備／探索目標
```

如果只靠測試腳本硬指定流程：

> 不算完全成立。

---

# 34. Determinism

所有新增：

```text
Loot
Rarity
Affix
Boss reward
Variant interaction
```

必須走：

```text
worldSeed
rngState
RandomService
```

禁止散落：

```text
Math.random()
```

---

# 35. Save / Reload

驗證：

```text
loot generated
↓
save
↓
reload
```

必須完全保留：

- instanceId
- base
- rarity
- stats
- affixes
- ownership
- equipped state

Boss：

```text
midfight
flee
reload
retrack
cooldown
```

維持 Phase3 已驗證語意。

---

# 36. Legacy Compatibility

不得為 Phase4 Balance：

> 破壞 V1 / V2 legacy saves。

PF02 若需要調整：

應優先調整新 Procedural Generation／Balance。

不要偷偷改寫舊裝備 instance。

---

# 37. Loot Monte Carlo

建立／擴充 deterministic runner。

最低：

```text
≥ 100,000 loot rolls
```

如果執行成本合理。

統計：

```text
Rarity Distribution
Affix Count
Affix Distribution
Affix Tier
Boss-exclusive rate
Elite reward distribution
Duplicate-like rate
```

Runner 執行使用 Luna Low。

分析結果才使用 Medium / Max。

---

# 38. Combat Simulation

對代表 Build：

```text
Legacy
Raw Damage
Crit / Speed
Bleed
Defense
```

與：

```text
Normal
Elite
Boss Variant
```

進行 deterministic combat simulations。

至少輸出：

```text
Win Rate
Median Turns
P10 / P50 / P90 Turns
Damage Taken
Potion Usage
Death Rate
```

不要只輸出平均值。

---

# 39. Build Dominance

檢查：

> 是否存在一種 Build 對所有情況都最佳。

如果存在：

記錄：

```text
Choice Collapse
```

不要為了完全平均：

> 把所有 Build 做成相同。

允許：

> 不同情境有不同優勢。

---

# 40. Browser Validation

本輪不預設 2 小時 Soak。

依 QA Policy：

### Targeted Browser

先完成主要 Flow。

### Integrated Stress

建議：

> **20～30 分鐘**

正常 production runtime。

包含：

```text
movement
combat
loot
inspect
equip
compare
sell
elite
boss
reload
collection
modal cycles
```

---

# 41. Extended Soak Trigger

只有：

- Game Loop 改動
- Save / Journal architecture 改動
- IndexedDB 改動
- Renderer lifecycle 大改
- 短測出現持續 memory growth
- Stability finding 需要確認

才升級：

```text
60m / 120m
```

不要因為 Phase4 本身固定跑兩小時。

---

# 42. Existing Findings

繼續監控：

```text
PF02
C01 export/interleaving
C02 journal growth
C03 detached DOM/listener
```

但：

> 不要因本輪存在這些歷史 Finding 而自動大重構。

只有新的 evidence 顯示 regression 才處理。

---

# 43. Human Validation

目前仍屬：

> 開發中 Internal QA。

因此：

```text
Human Fun Gate:
DEFERRED / NOT APPLICABLE AT THIS STAGE
```

不得要求真人 1～2 小時遊玩來完成 Phase4 Engineering Gate。

Agent Playtest：

> 不得冒充真人。

---

# 44. Agent Exploratory Playtest

本輪需要 Adventure-focused Agent Playtest。

不要求 1～2 小時。

建議：

> 30～60 分鐘有效遊玩

視流程完成程度。

記錄：

```text
What did the agent want next?
Why?
What loot changed behavior?
When did reward feel meaningless?
When was there no goal?
When did a harder enemy become desirable?
```

---

# 45. Fun Signal

記錄任何自然出現：

```text
「再打一隻」
「想看看Elite掉什麼」
「這件裝備適合另一種Build」
「換裝後可以挑戰Boss」
「還差一個想要的Loot」
```

Agent 不可聲稱：

> 玩家一定會這樣感覺。

只能記：

> Systemic signal / Agent behavior。

---

# 46. Bugs vs Product Findings

分開。

Bug：

```text
mechanic does not behave as specified
```

Product Finding：

```text
mechanic works but reward feels weak
```

不要把：

> Loot 不夠吸引人

偷偷當 Bug 改成超高掉率。

---

# 47. Allowed Implementation Scope

Phase4 可以修改：

```text
Loot weights
Rarity balance
Affix balance
Combat-affix interaction
Boss loot
Elite reward
Reward presentation
Compare UX
Collection hooks
Minimal goal visibility
```

前提：

> 都直接服務 Adventure Reward Loop。

---

# 48. Out of Scope

禁止開始：

- Phase5 Crafting / Workshop
- Masterpiece
- Crafter system
- 完整 Life Reward
- Phase6 Crisis Integration
- Phase7 50+ Monsters
- Phase7 100+ Items
- Theme Ecosystem Pack
- 新大型區域
- Multi-settlement
- Full Magic
- Dragon system
- V3
- Daily Quest
- Battle Pass
- Offline Reward
- Loot Box / Gacha
- FOMO

---

# 49. Implementation Workflow

依序：

```text
Phase4-A
Reward Baseline
↓
Phase4-B
Risk / Reward
↓
Phase4-C
Affix / Build Utility
↓
Phase4-D
Boss Reward
↓
Phase4-E
UX / Presentation
↓
Phase4-F
Balance
↓
Phase4-G
QA / Review
```

不要一次全部混在同一大修改。

---

# 50. Phase4-A — Reward Baseline

先不要改 Balance。

先量：

```text
current loot distribution
upgrade rate
sidegrade rate
sell rate
rarity distribution
boss reward
elite reward
combat efficiency
```

建立 baseline。

如果沒有 baseline：

不得憑感覺大幅改數值。

---

# 51. Phase4-B — Risk / Reward

根據 baseline 調整：

```text
Normal
Elite
Boss
```

Reward relationship。

完成後測試。

---

# 52. Phase4-C — Affix / Build

讓現有 Affix：

> 真正形成至少數種有效差異。

必要時小幅調整：

- mechanics
- values
- eligibility

不要增加大量新 Affix。

---

# 53. Phase4-D — Boss Reward

完成：

> Wolf Boss-specific Reward identity。

驗證 Boss Variant 對準備的價值。

---

# 54. Phase4-E — UX

完成：

```text
Loot feedback
Compare
Trait readability
Rarity readability
Boss reward readability
Collection feedback
```

保持 World First。

---

# 55. Phase4-F — Balance

執行：

```text
Loot Monte Carlo
Combat Simulation
Economy impact
Build comparison
```

修正明顯異常。

---

# 56. Phase4-G — QA

執行：

```text
Full Regression
Typecheck
Production Build
Determinism
Save / Reload
Browser Regression
20～30m Browser Stress
Adventure Agent Playtest
Independent Review
```

---

# 57. Agent Routing

遵守：

`docs/agents/agent-routing.md`

不要在本 Ticket 重新發明 Agent Routing。

原則：

```text
Low = runner / exploration / data
Medium = normal engineering
Max = core / difficult / deep review
Sol = decision / gate
```

使用：

> 最低但足以可靠完成的 Tier。

---

# 58. QA Artifacts

沿用現有 V2.x QA 結構。

至少產出：

```text
baseline.md
loot-distribution.json
loot-analysis.md
combat-balance.json
build-analysis.md
boss-reward.md
browser-regression.md
browser-stress.md
agent-adventure.md
bugs.md
reward-findings.md
final-review.md
```

具體檔名可依 repository 現有 convention 調整。

不要建立另一套平行報告架構。

---

# 59. Final Gates

Phase4 最終分開：

### Engineering Gate

```text
PASS
FAIL
PASS WITH FINDINGS
```

### Reward System Gate

確認：

> Loot generation → decision → build change

成立。

### Risk / Reward Gate

確認：

> Elite / Boss 有合理風險回報。

### Build Gate

確認：

> 不只有單一 Raw Stat 路線。

### Adventure Loop Gate

確認：

```text
Fight
→ Loot
→ Build
→ Harder Target
```

形成。

### Human Gate

```text
DEFERRED
```

不阻擋本輪。

---

# 60. Phase4 Definition of Done

Phase4 不以：

> 新增多少裝備

作為完成。

必須證明至少一條完整正常遊戲流程：

```text
玩家使用正常角色探索。

遭遇普通怪與特殊敵人。

取得不同品質與詞綴的裝備。

至少有部分裝備造成真實選擇，
而不是單純全部賣掉。

不同裝備形成不同戰鬥傾向。

玩家因新Build而有能力或動機挑戰更高風險目標。

Elite具有更高風險與更高Reward期待。

Wolf Boss具有自己的Loot Identity。

Boss Variant使準備或Build具有差異。

Boss Reward產生下一個可理解的冒險目標。

Save / Reload後所有狀態一致。

V1/V2核心系統沒有Regression。
```

如果這條 Loop 尚未成立：

> 不要進 Phase5，也不要用大量 Content Expansion 掩蓋問題。

---

# 61. 本輪最重要的驗收問題

最終 Review 必須明確回答：

> **「目前的 Procedural Loot 是否真的改變了玩家下一個行動？」**

其次回答：

> **「玩家是否有合理理由主動尋找 Elite 與 Boss，而不是只刷最低風險敵人？」**

以及：

> **「不同裝備是否已開始形成真正不同的 Build，而不是只有數值大小比較？」**

如果三題都能用實際 Simulation、Browser、Agent Playtest 與 QA evidence 支持：

> **Phase4 可以 Gate。**

否則：

> 保留 Phase4，不進入下一階段。
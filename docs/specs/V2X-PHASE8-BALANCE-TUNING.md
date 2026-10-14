# Oakvale V2.x — Phase7 Owner Approval & Phase8 Balance / Progression Tuning

> Owner 於 2026-10-14 在目前 Session 提供之正式規格原文。正式狀態與 Acceptance 進度以 `tickets/20261014-v2x-08-balance-tuning.md` 及其子票為準。

## 0. Owner 正式授權

我以 Oakvale 專案 Owner／Approver 身分，正式審閱並接受 Phase7 Engineering Delivery。

授權範圍：

1. 接受 Phase7 `PASS WITH FINDINGS` 工程驗收結果。
2. 保留所有歷史失敗、Evidence Limitations、Product Findings 與未完成的人類產品驗證。
3. 依專案 L3 治理規則，將 Phase7 Parent Ticket 的 Owner Approval 正式記錄並結案。
4. 正式授權進入 **Phase8 — Balance & Progression Tuning**。
5. 授權 Phase8 必要的程式修改、測試、獨立審查及目前工作分支的正常 Git commit／push。

本授權不代表：

- Phase7 Human Fun Gate 通過。
- V2 Product Gate 通過。
- 歷史審計證據缺口已經消失。
- 允許 PR Merge、Production Deploy 或修改 `main`。
- 允許開始 Phase9、Phase10 或 V3。

Phase7 交付 Source：

`b71201e84ff6b78035f8b6ef9b845dbb831451c5`

受測 `src/` Fingerprint：

`585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`

上述為交付參考。開始 Phase8 前仍必須重新核對實際 HEAD、working tree、受測來源與最新文件。

---

# 1. Phase8 核心定位

本輪只執行：

**Phase8 — Balance & Progression Tuning**

Phase7 已擴充：

- 66 種新增 Monster Definitions
- 107 種新增合格 Item Definitions
- 6 個新增 Monster Families
- 24 種新增 Recipes
- 12 種作物選擇（含既有小麥）

Phase8 的任務不是繼續增加內容。

而是回答：

> **當玩家透過正常世界行為接觸這些內容時，Oakvale 是否具有合理的難度、獎勵、成長、經濟與世界演化節奏？**

核心原則：

**Balance is about meaningful choices, not equal numbers.**

不同生活道路不必具有相同報酬，但不能存在明顯無意義或全面劣勢的路線。

---

# 2. 開工前閱讀

依既有專案規範讀取：

- `AGENTS.md`
- `docs/agents/agent-routing.md`
- `docs/SUBAGENTS.md`
- `docs/agents/review.md`
- Phase0–7 Tickets、正式規格與 Final Reviews
- Phase7 `content-coverage.json`
- Phase7 `content-findings.md`
- Phase7 `monster-balance.md`
- Phase7 `loot-analysis.md`
- Phase7 `crafting-economy.md`
- Phase7 `long-world.md`
- Phase7 `agent-content-playtest.md`
- Phase7 `external-review-handoff.md`
- 相關 Combat / Loot / Crafting / Economy / Crisis / World Director 實作

先建立 Phase8 Parent Ticket、工作範圍、基準 SHA 與驗收標準。

不得重新發明專案已存在的 Ticket、QA 或 Agent Routing 系統。

---

# 3. Phase8 優先處理的 Findings

依 Phase7 真實證據，本輪優先追蹤六項。

### P8-F01 — Natural Encounter / Boss Progression

Phase7 已建立合法 Spawn Reachability，但尚未充分證明普通玩家能自然遇到、準備及擊敗不同 Boss。

必須量測：

- Early / Mid / Late 正常遊玩路線
- Monster Family Exposure
- Elite / Mini Boss / Boss Encounter Rate
- Boss Difficulty
- Preparation Cost
- Death / Retreat Rate
- Boss Reward Value
- Time to Encounter / Defeat

受控 Fixture 與正常遊玩必須分開報告。

### P8-F02 — Reward / Goal Drought

Phase7 長跑存在大量 no-progress actions。

必須區分：

- Runner 策略缺陷
- UI 行動不可見或不可達
- 玩家當前缺乏資源
- 沒有可理解的下一目標
- 過高的等待／重複操作成本
- 合理的世界等待

不要直接把 no-progress count 全部認定為遊戲無聊。

### P8-F03 — Life / Economy Full Cycle

Phase7 尚未完成完整 Merchant Purchase / Stock / Restock 的經濟閉環驗證。

應補上：

`Acquire → Produce → Sell → Purchase → Restock → Reinvest`

並分析 Gold、Material、Crafting、Food 之間的平衡。

### P8-F04 — Combat / Equipment Balance

新怪物與裝備數量增加後，必須確認：

- 早期是否過難
- 中期是否沒有挑戰
- Boss 是否數值過強或過弱
- 特定 Affix 是否全面主導
- Crafted Equipment 是否具備不同於 Loot 的優勢
- Legacy Equipment 是否仍有合理地位

不得只看 Raw ATK / DEF。

### P8-F05 — World / Crisis Balance

確認新增生態內容沒有造成：

- Monster Flood
- Boss Spam
- Threat Spiral
- Crisis Overfrequency
- Population Death Spiral
- Permanent Settlement Decline
- Resource Inflation

### P8-F06 — Storage / Performance Risk

Phase7 尚未實際量測 IndexedDB Physical Bytes、Quota 與 Compaction。

此項屬於 Technical Risk，不是純數值平衡。

Phase8 應建立必要的容量／成長證據，但不提前重構整個 Persistence Layer。

如發現明確資料遺失、Quota Failure 或嚴重持續增長，再依風險開立針對性修復。

---

# 4. Phase8 實作策略

嚴格採用：

`Baseline → Hypothesis → Controlled Comparison → Change → Regression → Natural Validation`

不要：

`覺得太弱 → 全面 Buff`

或：

`覺得太難 → 全面 Nerf`

每個 Balance Change 必須能回答：

1. 原始問題是什麼？
2. 哪一批證據支持它？
3. 預期改善哪個玩家決策或世界行為？
4. 實際修改了什麼？
5. 有沒有造成其他玩法退化？

不要為了追求全部指標改善而無限制迭代。

---

# 5. Phase8-A — Balance Baseline

第一階段禁止先大幅修改正式數值。

先建立 Phase7 原始數據快照。

至少包含：

**Combat**

- Win Rate
- Death Rate
- Battle Turns
- Damage Taken
- Potion Usage
- Fight Cost
- Build Performance
- Boss Success Rate

**Reward**

- Drop Rate
- Upgrade / Sidegrade Rate
- Time to Meaningful Loot
- Reward Drought
- Material Availability
- Boss Exclusive Reward Access

**Life**

- Material Income
- Crafting Cost
- Smithing Progression
- Masterpiece Eligibility / Frequency
- Crop Yield
- Gold Income
- Skill Unlock Time

**World**

- Monster Population
- Spawn Distribution
- Crisis Frequency
- Settlement Survival
- Food / Supply
- NPC Population
- Recovery Frequency

產出：

`phase8-baseline.md`

明確記錄實測範圍、Sample Size、Seed、Fixture 與不確定性。

不要自行宣稱某個理想勝率或掉率是正式產品需求。

---

# 6. Phase8-B — Combat & Equipment Balance

建立代表性 Combat Matrix：

`Early / Mid / Late Progression`

對應：

`Normal / Elite / Mini Boss / Boss`

比較：

- Legacy Gear
- Adventure Loot
- Crafted Gear
- Boss Gear
- Masterpiece
- Damage-focused Build
- Crit / Speed Build
- Bleed Build
- Penetration Build
- Defense Build

實際 Build 必須由合法可取得的裝備構成。

不得使用不可能自然出現的裝備組合，卻將結果當成正常角色的戰鬥能力。

### 改善原則

- 普通怪物仍應提供不同戰術。
- Elite 應值得挑戰。
- Mini Boss 應具備準備價值。
- Boss 應具有高風險與獨特報酬。
- 特定 Build 可以克制特定敵人。
- 不應有一套低成本 Build 全面壓倒所有情境。

優先調整：

- Stat Coefficients
- Encounter Weight
- Skill Cost / Cooldown
- Resistance / Armor Interaction
- Reward Quality
- Progression Eligibility

僅修改證據指出的參數。

不得重寫完整 Combat Engine。

### Boss 特別驗收

必須將 Phase7 的六種新 Boss 與既有重要 Boss 分開驗證：

- 合法生成條件
- 自然遭遇機會
- 早中後期合理難度
- 準備與撤退
- 勝利後獎勵
- Save / Reload
- Cooldown

若正常遊玩無法在合理測試窗口遭遇某 Boss，應報告為 `NOT OBSERVED`，再以受控測試補足規則正確性，不得假稱自然遭遇完成。

---

# 7. Phase8-C — Life & Economy Balance

本階段調整生活成長與經濟閉環。

重點：

`Gather → Produce → Craft → Use / Sell → Reinvest`

以及：

`Farm → Food → Economy / Civil Defense`

需要量測：

- 採集效率
- 作物成本與收益
- Smithing XP Growth
- Recipe Unlock Pace
- Materials Consumption
- Merchant Buy/Sell Spread
- Stock Availability
- Restock Rules
- Gold Income / Sinks
- Masterpiece Value

### 經濟限制

禁止明顯無風險套利：

`Buy Material → Craft → Sell → Infinite Profit`

但合法的：

- 高技能工匠
- 罕見材料
- 稀有製作品
- 世界供需差異

可以產生合理利潤。

不能為了避免套利，讓全部 Crafting 都永久虧損且沒有其他實質價值。

### 生活成長

確認：

- 低技能製作可以獲得進展。
- 高技能製作具有可理解的能力差異。
- 不需無止境製作最低階物品刷經驗。
- 進階配方有實際取得材料的途徑。
- Masterpiece 是技藝成果，不是純 Casino。

保留不同職業的經濟與時間成本差異，不強制全部相同。

---

# 8. Phase8-D — World & Regional Crisis Balance

建立不同世界情境：

- No Player Intervention
- Life-focused Player
- Adventure-focused Player
- Mixed Strategy
- Prosperous Settlement
- Struggling Settlement

驗證：

- NPC 自治
- Food / Equipment Readiness
- Threat Growth
- Crisis Probability
- Crisis Outcome
- Aftermath Recovery
- Settlement Continuity

Phase6 的設計原則不可被破壞：

**玩家不是唯一救世主，生活玩家也不應被迫戰鬥。**

不允許：

- 為了增加挑戰而讓世界固定發生危機。
- 為了提高成功率而使 NPC 永遠自動勝利。
- 某一種廉價捐贈完全取代其他貢獻。
- 玩家失敗後直接 Game Over 或 World Reset。

世界可以衰敗，但不能因數值錯誤使多數測試世界不可恢復。

---

# 9. Phase8-E — Reward & Progression Pacing

這是 Phase8 最重要的產品平衡工作之一。

需要檢查：

`Action → Progress → Reward → New Decision → New Goal`

而不只是計算掉寶率。

### Reward Drought

記錄玩家在多久的正常遊玩時間內：

- 沒有得到有意義的新物品
- 沒有技能突破
- 沒有新敵人或新內容
- 沒有資產／財富進展
- 沒有值得追求的新目標

### Goal Drought

觀察玩家是否因為：

- 取得條件不明
- 目標不可達
- 資源不足
- 世界狀態限制
- UI 缺乏線索

而反覆等待或重複相同動作。

### Chore Risk

特別量測：

- 無意義重複 Craft
- 重複低階 Gathering
- 重複 Wait 1 Day
- 沒有策略改變的 Farming
- 長期只選同一低風險敵人

不要要求固定每 X 分鐘給獎勵。

不要加入 Daily Quest、Login Reward、FOMO 或離線收益。

優先讓：

**既有世界狀態、可見目標及玩家選擇產生下一步。**

### Runner 與產品問題區分

Phase7 Agent 是 heuristic runner，並非真正具有遊戲目標理解能力的玩家。

因此：

1. 先檢查 runner decision policy。
2. 建立可觀測的 objective / action outcome。
3. 將 `no-progress` 分類為 runner、UI、resource、world pacing 等原因。
4. 再判定是否需要修改遊戲。

不可為了降低 runner 無效動作率而把世界設計成每次點擊必有獎勵。

---

# 10. Phase8-F — Simulation & Balance QA

使用既有 deterministic engine 與測試工具。

不建立第二套模擬引擎。

### Combat

使用多 Seed、成對比較與代表性 Build。

至少量測：

- Win Rate
- Turns P10 / P50 / P90
- Potion Usage
- HP Remaining
- Risk-adjusted Reward
- Fight Cost

### Loot

執行合理分層的 deterministic Monte Carlo。

原則上至少 100,000 次 Loot Generation；若現有 Phase7 樣本已有效且未更改相應參數，可重用已驗證 Evidence，並針對本輪變更重跑受影響部分。

### Economy

比較正常交易路線與受控循環。

必須包含實際 Merchant Buy / Sell / Stock / Restock。

### World

至少：

`3 Seeds × 10 / 50 / 100 Years`

若統計結論不穩定，增加 Seed，而不是只增加單一 Seed 的世界年數。

### Normal Play

至少分別覆蓋：

- Life Route
- Adventure Route
- Hybrid Route

不得把單一 heuristic runner 的混合操作當成三條路線已完整驗證。

正常 fresh-save 與 controlled fixtures 必須分開標示。

---

# 11. QA 深度與成本控制

不要求每修改一個平衡參數就跑完整兩小時 Browser Stress。

採用：

**Local Balance Iteration**

`Targeted Simulation → Focused Tests`

**Integrated Checkpoint**

`Full Regression → Typecheck → Build → Relevant Browser Smoke`

**Final Gate**

- Full Regression
- Save / Migration / Determinism
- Combat Matrix
- Loot Distribution
- Craft / Economy Simulation
- Crisis / Long-world Simulation
- Production Chromium Regression
- 20～30 分鐘 Integrated Browser Stress
- 30～60 分鐘 Role-focused Automated Exploration
- Independent Review

只有發現明確 memory / save / journal / renderer regression，或修正涉及核心生命週期時，才增加 60～120 分鐘 Extended Soak。

Runner 必須獨立執行並保存原始記錄，不能讓 LLM 長時間 polling 消耗 Token。

---

# 12. Performance 與儲存

持續追蹤：

- C01 Export / Interleaving
- C02 Journal Growth
- C03 DOM / Listener Retention

以及 Phase7 新發現：

- IndexedDB Physical Storage
- Quota Usage
- Journal Growth Rate
- Save Size
- Save Latency
- Inventory / Collection Performance

能取得的原生 Browser Storage 指標應與 JSON Serialization Estimated Bytes 分開記錄。

不得將估算值冒稱 IndexedDB 實際磁碟佔用。

若沒有可驗證的 Compaction 需求，先記錄風險，不直接實作大型儲存重構。

---

# 13. 嚴格禁止擴充 Scope

Phase8 不得新增：

- 新 Monster Families
- 大量新 Items
- 新 Boss Families
- 新 Regional Crisis 系統
- 全新 Combat Engine
- 全新 Economy Engine
- Skill Trees
- 新的 Crafting Professions
- NPC Employment / Worker Automation
- Offline Progress
- 完整 Housing Expansion
- Faction / Kingdom
- Multiplayer
- V3 功能

允許少量為修正已確認問題所需的 Data / UX / Domain 修改，但必須說明其與 Balance Finding 的直接關聯。

---

# 14. Agent Routing

完全沿用現有 Routing Policy。

**GPT-6 Luna Low**

- Data Extraction
- Baseline Collection
- Monte Carlo Runner
- Simulation
- Test Execution
- Browser QA

**GPT-6 Luna Medium**

- 一般平衡修改
- Test Design
- UI 目標與資訊修正
- 一般 Bug Fix
- 一般 Review

**GPT-6 Luna Max**

- Complex Combat Interactions
- RNG / Determinism
- Save / Migration
- World Director / Crisis Interaction
- Cross-system Balance Defects
- Deep Independent Review

**GPT-6.1 Sol Medium**

- Product Criteria
- Scope Control
- Balance Tradeoffs
- Coordination
- Final Gate

必須直接選擇最低且可靠足夠的模型，不採固定 Low→Medium→Max pipeline。

若模型或 Subagent Runtime 無法確認，明確回報 Requested / Observed / Unknown，不得以 Agent 名稱推定實際模型。

---

# 15. Implementation Order

正式切分：

### Phase8-A — Baseline & Measurement

建立原始分布、可觀測指標與 Finding 優先順序。

### Phase8-B — Combat & Equipment

調整難度曲線、Boss、Build、裝備與有效風險報酬。

### Phase8-C — Life & Economy

調整資源、Skill、Crafting、Merchant、作物與經濟循環。

### Phase8-D — World & Crisis

調整怪物生態、危機、NPC 自治與長期世界穩定性。

### Phase8-E — Reward & Pacing

分析重複操作、目標斷層、Reward Drought 與正常玩法回饋。

### Phase8-F — Full QA & Independent Review

整合 Regression、Simulation、Browser、Save、Performance 與最終 Findings。

每階段先局部驗收，再進下一階段；有共同基礎的數值修改應明確指定唯一負責者。

---

# 16. Phase8 Acceptance Gates

最終至少分別判定：

| Gate | 驗收 |
|---|---|
| Engineering | Regression / Build / Determinism |
| Combat Balance | 不同進度與敵人難度合理 |
| Boss Progression | 自然遭遇、準備與獎勵有可追溯證據 |
| Equipment Diversity | 不存在無條件最優 Build |
| Reward Balance | 掉落、素材、Crafting 有意義 |
| Life Progression | 技能與生活成果具有實際成長 |
| Economy | 無明顯無風險套利或資源崩壞 |
| World Balance | Threat / Crisis / NPC 長期持續 |
| Reward Pacing | 無目標與重複操作得到合理分析 |
| Stability | Save / Browser / Long-world 可持續 |
| Human Product | DEFERRED，除非 Owner 明確啟動 |

Gate 使用：

`PASS / PASS WITH FINDINGS / FAIL`

沒有正式數值 Target 的指標先保留觀察分布與設計理由，不事後發明門檻以製造 PASS。

不能以 controlled win rate 取代 normal-play experience。

---

# 17. 必須交付的報告

沿用專案既有 Evidence 位置。

至少包含：

- `baseline.md`
- `combat-balance.md`
- `boss-progression.md`
- `equipment-build-analysis.md`
- `loot-reward-distribution.md`
- `life-progression.md`
- `economy-balance.md`
- `world-crisis-balance.md`
- `reward-pacing.md`
- `long-world.md`
- `browser-regression.md`
- `browser-stress.md`
- `agent-role-playtests.md`
- `performance-storage.md`
- `bugs.md`
- `balance-findings.md`
- `final-review.md`

必須保留：

- Raw Evidence
- Seed / Sample / Scenario
- Before / After Comparison
- Source Fingerprint
- Tested Source / Delivery Commit Correlation
- Independent Review
- Historical Failures

不可把測試 Base Commit 與實際受測 Source 混淆。

---

# 18. Phase8 Definition of Done

Phase8 完成不是：

> 所有怪物數值都調整完畢。

而是可以由工程證據支持：

1. 不同進度的玩家具有合理挑戰。
2. Boss 有清楚的準備、風險、報酬及進度差異。
3. 不同裝備 Build 具有情境價值。
4. Adventure 與 Crafting 不形成單向全面壓制。
5. Life Skill 成長具有實際能力變化。
6. 經濟沒有新增明顯無風險套利。
7. 世界危機不會形成固定 recurring tax。
8. NPC 自治與世界長期結果合理。
9. Monster Ecology / Loot 不因新增內容而失控。
10. 主要 Reward / Goal Drought 已獲得量測與合理處理。
11. 重複操作問題已區分 Runner 限制與產品問題。
12. Save / Reload / Succession / Migration 保持正確。
13. 長世界模擬通過且限制明示。
14. 未解 P0 / P1 Product Defects 不阻擋交付。
15. 所有重大平衡修改具有 Before / After Evidence。

Phase8 的 Human Fun / Retention 不得僅靠自動測試宣告通過。

---

# 19. Final Review 必須回答

### Q1

玩家從 Early 到 Late 是否一直有合理且可達成的下一個挑戰？

### Q2

不同 Build、Crafting 與生活玩法是否真正產生有意義的選擇？

### Q3

新增 Boss 是值得準備的冒險目標，還是僅僅數值更高？

### Q4

世界在沒有玩家介入的情況下，是否仍然具有合理的演化結果？

### Q5

資源、金幣、裝備、作物與危機是否形成健康的長期循環？

### Q6

玩家的下一個目標是否容易理解？重複等待是世界規則、Agent 限制，還是實際 Pacing 問題？

### Q7

是否存在為了讓測試指標變漂亮，反而損害 Oakvale 自由人生體驗的調整？

必須用 Evidence 支持結論，不能只依 Agent 主觀評語。

---

# 20. 交付與停止條件

Phase8 完成後：

1. 完成獨立 Review。
2. 修復阻擋 Engineering Gate 的缺陷。
3. 保留 Product Findings 與未充分驗證項目。
4. 完成 QA 文件及 Source Correlation。
5. 在目前授權工作分支完成 Commit / Push。
6. 輸出 Phase8 最終完整工程交付報告。
7. 停止，不自動進入 Phase9。

**不得自動執行正式部署、PR Merge、修改 Production Branch 或 V3 開發。**

---

# Final Product Principle

Phase4：

**Adventure discovers value.**

Phase5：

**Life transforms value.**

Phase6：

**The world gives that value meaning.**

Phase7：

**Expand the world's possibilities.**

Phase8：

**Make those possibilities worth pursuing.**

本輪成功的標準不是平均所有數值，而是讓 Oakvale 的不同人生選擇，都能以合理的節奏、風險與成本產生真正的價值。

完成 Phase8 後，等待 Owner 審閱，再決定是否進入 Phase9 — UI/UX Polish。

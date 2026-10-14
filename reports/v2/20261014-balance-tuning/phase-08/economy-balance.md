# Phase 8-C1：Life 經濟、收入速率與 Farm supply

## 樣本與比較界線

有效 itinerary 都以相同 3 seeds（61101–61103）、3 遊戲年、公開引擎 action 執行。A v3 Life `attempt-20261014T040039340Z` 驗證 9/9；C 最終 `c-runner/attempt-20261014T090744303Z` 含 Life、Hybrid、craft-focused、farm-business-supply、seasonal-farm-sell 五種 variant，15/15 `VALID_POLICY`。這些是不同但合法的 scripted policies，不能將其中一方當成另一方的 runner 偏差而排除；也不能把 policy 結果當成人類玩家預測。

兩 runner 的 action safety ceiling 不同：A v3 每日上限 80 個 decision；C 普通 Life／Hybrid／craft-focused 為 24 個 action，farm-business-supply 與 seasonal-farm-sell 提高至 80，以便在同日完成合法購糧、移動／供應與 crop-good 售賣。這是 harness policy 差異，不是遊戲 UI 限制；三年淨額比較需連同路線政策與上限解讀。

| 路線 | 三年淨金幣／seed | 主要行為 |
|---|---:|---|
| A v3 Life | 約 +9,023 | 每 seed 743 gathers、676 starterSpear crafts、約 2,330 次 `sell-gathered`；gather 與出售頻繁 |
| C 普通 Life | +30、+30、+38（平均 +32.67） | 每 seed 5 gathers、1 starterSpear、359 wheat harvests；大量食物未變現 |
| C craft-focused Life | +2,851、+2,931、+2,915（平均 +2,899） | 每 seed 196 gathers、241 分層 crafts、35 wheat harvests |
| C Hybrid | +2,667、+2,835、+2,655（平均 +2,719） | Life／Adventure 交替，3 seeds 共 880 次成功 encounter start |
| C farm-business-supply | -34、-32、-32 | 每 seed 購買 land 與 farmBusiness，22 次 wheat harvest，成功供應 2 次 × 10 食物；包含為供糧測量而合法購糧的成本 |
| C seasonal-farm-sell | +101,218、+101,422、+101,528（平均 +101,389） | 每 seed 成功種收季節 crop 約 560 次；售出 crop goods 14,343 件、收入 77,580 G，另含合法 gather/craft 經濟活動 |

A Life gross income 約 11,727 G、gross sinks 約 2,704 G、net 約 +9,023 G／seed。C 普通 Life 的 3-seed 合計是 gather 工資 60 G、crafted gear sale 50 G、craft fees 12 G，沒有 raw-material sale，淨額 +98 G。C 不能與 A 的高收入差直接判定任何一方「錯誤」：A 實際量到一種高頻 gather/sell policy 的強收入；C 普通 Life 是 wheat-farm-heavy policy，二者策略重心不同。A 的 action schema 把出售統記為 `sell-gathered`，沒有逐筆 item ID，因此 8,755 G／seed 的出售收入無法無損拆成原料與 crafted gear。這是 A artifact 的欄位限制，不是將其視為舊 runner artifact 的理由。

## 各收入來源速率

### Gather 與出售

引擎每次 gather 固定給 4 G、消耗 10 stamina；產量為 `2 + floor((skillLevel - 1) / 2)`。若把全部原料都賣掉，依基礎售價 wood 4、stone 3、iron 8 G／件計算，Lv.1 每次 gather 的工資＋出售毛收入分別是 wood 12 G（1.20 G/stamina）、stone 10 G（1.00 G/stamina）、iron 20 G（2.00 G/stamina）。Lv.3–4 產量增至 3 件，對應 1.60、1.30、2.80 G/stamina。未扣移動、休息、出售 action 時間，也未扣留作 crafting 的材料價值。

A v3 Life 每 seed 743 gathers，工資 2,972 G／3 年（0.40 G/stamina）；`sell-gathered` 收入另有 8,755 G／seed，但其 2,330 筆出售沒有 item ID，不能全部算成原料銷售。C 普通 Life 每 seed 5 gathers，工資 20 G、50 stamina；沒有 raw-material sale。C craft-focused 每 seed 196 gathers（wood 63、stone 2、iron 131），工資 784 G，另有一筆原料出售 8 G；這條路將大多數原料留給製作。

**判斷：**在目前模型內，Gather → Sell 接近低風險的正現金流：工資固定為正，且材料按固定基礎售價出售；A v3 的 9/9 有效 Life 也顯示這種高頻 policy 可達約 +9,023 G／3 年。它不是無條件或無成本套利：地點移動、stamina／等待、節點耗盡、留料機會成本都存在；商人 stock/restock 不存在於 GameState，因此無法測出市場供量限制。以液態金幣為目標時，它明顯勝過目前不出售的小麥 farm loop。

### 作物：runtime 季節 crop、wheat 與售賣

Phase7-G crop runtime 已整合：`farmCropChoices()` 依目前 season／region 公開回傳合法性、成熟時間、技能調整後 yield、good、foodValue 與售價；`farmCropPlantingGuidance()` 提供 region／plot 指引。C seasonal variant 僅選 farmland 中 `status === available` 的季節 crop，按 `yield × sell / growthMinutes` 選候選，經 public prepare／plant／harvest action 收成，並逐件以 `tradeMaterial` 售出。下表為 **V4 前基準** attempt `attempt-20261014T090744303Z` 的每 seed 均值（3 seed 完整一致，貨品全數售出）。V4 後收成量與 crop mix 已改變，實測前後比較見 C-F1。Stamina 是每個完整 field cycle 的 prepare 6 + plant 4 + harvest 4 = 14；G／stamina 與 G／mature-day 均為毛值，不含移動、恢復時間與售賣 action 的 5 分鐘／件。

| 實際 crop | 種植季 | 成熟時間 | 每 seed 收成／cycle | 售價／件 | 售金／seed | Food equivalent／seed | field stamina／seed | 毛 G／stamina | 毛 G／成熟日 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `field_turnip` | 春 | 1 日 | 20（3 harvest） | 3 | 60 | 20 | 42 | 1.43 | 20.00 |
| `spring_pea` | 春 | 0.5 日 | 6,177（254 harvest） | 2 | 12,354 | 6,177 | 3,556 | 3.47 | 97.28 |
| `marsh_rice` | 夏 | 4 日 | 247（14 harvest） | 11 | 2,717 | 741 | 196 | 13.86 | 48.52 |
| `sun_pepper` | 夏 | 1.5 日 | 3,017（105 harvest） | 5 | 15,085 | 6,034 | 1,470 | 10.26 | 95.78 |
| `orchard_apple` | 秋 | 2 日 | 2,805（105 harvest） | 8 | 22,440 | 5,610 | 1,470 | 15.27 | 106.86 |
| `cave_mushroom` | 冬 | 3 日 | 2,077（79 harvested of 80 planted） | 12 | 24,924 | 6,231 | 1,106 | 22.53 | 105.16 |

`food equivalent` 是 yield × good 的 foodValue；seasonal route 選擇出售 goods，沒有轉成玩家 `food`。以上 crop-sale gross 77,580 G（14,343 件）是 **V4 前**基準；V4 後為每 seed 22,315 G（3,453 件），實際 Before/After 見 C-F1。基準路線三年淨額 +101,218 至 +101,528 G，包含其他生活經濟收入與支出，不能把淨額全歸因作物。普通 Life 的 wheat V4 前每 seed 359 harvest、約 7,853 food、實際 crop sale 0 G；每完整循環 field stamina 14，約 1.56 food／stamina。以 ITEMS.food 售價 5 G 計，若將全部 wheat food 改售，理論上約 109.4 G／harvest、54.7 G／成熟日、7.81 G／field stamina，但這不是普通 Life 實際行為，且會放棄食物用途。A v3 每 seed 4 次 wheat harvest、24 food。

V4 前同口徑比較 gather，Lv.3–4 全售素材含固定 wage 的毛收益是 wood 1.60、stone 1.30、iron 2.80 G／stamina；季節 crop 6 種中 5 種超過 gather 的最高 2.80 G／stamina，field turnip 1.43 較低。各 crop 毛 G／成熟日為 20.00–106.86。V4 後收益已由固定 bonus cap 下調，應以 C-F1 的 same-seed Before/After 為準。Seasonal-farm-sell 三年 net 仍 +49,108 至 +49,382 G／seed；因此目前資料仍不支持「farming 是全面劣勢賺金路徑」，但 wheat／其他變體食物 yield 確實下降。實際路徑有移動、休息及逐件售賣 action 成本；merchant demand／stock 未建模，不推論玩家或多人市場的無限容量。

### Finding C-F1 — Farming yield scaling（product, High；RESOLVED by C2 change）

Owner 於 2026-10-14 選定 V4，Lead 已改為 `min(2, floor((level - 1) / 2))`，同時套用在 wheat 與季節 crop（未知 crop fallback 亦使用該 bonus）。這解決 Farming level 持續線性提高單次產量的問題；C-F1 狀態為 **RESOLVED**。現行 farm actions 仍耗 stamina／時間、不耗 gold，crop-good 固定價出售；merchant stock／需求仍 **NOT MODELED**，是分開的產品模型缺口，不能據此推論 V4 下單次收益仍隨技能無限增長。

**固定序列反事實，不是 rerun：** 使用最終 attempt 的同一季節、同一作物、同 1,680 次收成、售價、成熟時間及 stamina，僅重算 yield bonus；玩家政策不會因收益改變而調整。V0 保留觀察 yield。其餘版本根據 `farmCrops.ts` 的 base yield 與從實際 yield 反推的 harvest 時 Farming level 計算；runner 的 Farming 欄位是在 harvest action 獲得 XP 後記錄，若該次剛升級便比計產量的等級高一級。V3 的第一年末等級取 day 359 daily row，三個 seeds 都是 Lv.19。

| 版本 | Yield bonus | crop sale G／seed 均值 | 對 V0 | V0 比例 |
|---|---|---:|---:|---:|
| V0 現行 | `level - 1`（觀察值） | 77,580 | — | 100.0% |
| V1 gather-style | `floor((level - 1) / 2)` | 44,886 | -32,694 | 57.9% |
| V2 base only | 0 | 13,410 | -64,170 | 17.3% |
| V3 year-1 frozen | 固定為第一年末 `level - 1` | 67,122 | -10,458 | 86.5% |
| V4 Owner-approved | `min(2, floor((level - 1) / 2))` | 19,346 | -58,234 | 24.9% |

此為固定序列 counterfactual，輸入是 V4 前 attempt `attempt-20261014T090744303Z`；同 1,680 次實際 harvest、crop/season、成熟時間、stamina 及售價，只重算 bonus，不重跑或調適 policy。三 seeds 的 year-1 end（day 359）Farming level 皆 Lv.19。V4 計算已實作於 `c1-crop-counterfactual.mjs`／core，JSON 保存 source attempt 與逐 seed／逐 crop 結果。

**V4 引擎實跑 Before／After（3 seeds；淨額／seed 範圍， harvest／food 為每 seed）：**

| Variant | Net G before → after | Harvests | 產出 before → after |
|---|---:|---:|---:|
| Life（wheat） | +30..+38 → +30..+38 | 359 → 359 | wheat food 7,853 → 2,500 |
| Hybrid | +2,655..+2,835 → +2,655..+2,835 | 270 → 270 | wheat food 5,266 → 1,877 |
| craft-focused | +2,851..+2,931 → +2,851..+2,931 | 35 → 35 | wheat food 336 → 232 |
| farm-business-supply | -34..-32 → -34..-32 | 22 → 22 | wheat food 186 → 141；supply 2/2 次／seed 成功 |
| seasonal-farm-sell | +101,218..+101,528 → +49,108..+49,382 | 560 → 513 | crop goods sold 14,343 → 3,453；crop sales 77,580 → 22,315 G |

來源為 before `attempt-20261014T090744303Z`、after `attempt-20261014T093926448Z` 的 `completion.json`、`actions.csv`、`crop-yields.csv`。兩者均 PASS、15/15 route-seed valid。Settlement food 最終均為 100；供應 route 仍每 seed 2 次成功 supply action。季節路線後測 net 仍高，主要來自 craftsman-profit：crafted sales 68,223–68,497 G／seed 減 craft fees 45,450 G = +22,773–+23,047 G；V4 前 sales 59,464–59,774 減 39,434 G = +20,030–+20,340 G。金幣差額來自 gather 的 iron 等 node-capped inputs；這是合法收入觀測，不代表無限套利，受節點 regen 與 runner 每日 80-action ceiling 限制，對 craft 價格 **NO CHANGE**。此處 sales-fees 不扣原料時間機會成本。

#### 對照 Phase8 §4 五問

1. **原始問題：** Farming yield bonus 隨未封頂技能線性成長；種植／收成不耗 gold、crop-good 固定價出售，導致季節作物單次 yield 與收入持續膨脹。
2. **支持證據：** V4 前 route 15/15 valid、Farming Lv.1→33，seasonal crop sales 77,580 G／seed；固定 harvest 序列 V4 計為 19,346 G／seed。引擎 V4 實跑前後見上表：同 seeds／3 年，seasonal crops 560→513 harvest，crop sales 77,580→22,315 G；其他四個 variant net 與 harvest 數不變。V4 前後完成樣本皆 15/15 valid，Settlement food 結尾均 100。
3. **預期改善的玩家決策／世界行為：** 讓 Farming level 提供前期 yield 成長，但使後期每次 harvest bonus 封頂，避免農耕收益隨技能永久線性增長而壓制其他 gold paths。
4. **實際修改：** Owner 核准、Lead 實作 `min(2, floor((level - 1) / 2))`，用於 `farmCropChoices()` 的所有作物（含 wheat）與 unknown-crop fallback；C-F1 **RESOLVED by C2 change**。Lead 報告 engine vitest 28 files／424 tests PASS；本 C1 r3 未改 `src/`。`c1-crop-counterfactual.json` 已加入 V4：固定序列 sale value 19,346 G／seed。長世界 10／50／100 年驗證移交 Phase8-D。
5. **其他玩法退化／剩餘風險：** wheat、hybrid、craft、farm-supply routes 的 food yield 確有下降，但 supply action 仍每 seed 2/2 成功且各 settlement food 最終 100；尚需 Phase8-D 長世界 10／50／100 年驗證。seasonal route 的剩餘約 +22.8k G／seed craftsman-profit 由 node-capped gather inputs 轉為 crafted sales，受每日 80-action ceiling 限制，先記為合法 craftsman 收益觀測、craft price **NO CHANGE**，不是 Farming C-F1 仍未解。merchant stock／需求仍 **NOT MODELED**，保留為獨立產品 finding；此缺口不推翻 V4 對 yield scaling 的修正。

### Crafting tiers

C craft-focused 3 seeds 的售價均值來自實際輸出。下表扣除製作費、未扣輸入品的取得時間／機會成本；金額不是可直接套用到購入原料的淨套利。

| Tier／配方 | craft 數／seed | 平均輸出售價 | 費用 | 毛差／stamina |
|---|---:|---:|---:|---:|
| Lv.1 `starterSpear` | 2 | 16.67 G | 4 G | 1.27 G |
| Lv.2 `fieldArmor` | 44 | 28.50 G | 8 G | 1.71 G |
| Lv.5 `ironShortSword` | 195 | 25.90 G | 18 G | 0.49 G |

這些值包括隨機品質造成的輸出差異。若材料以商店價購入並立即出售，Town controlled probe 只看到 Lv.1 starterSpear 8 loops 中 1 loop +9 G，其餘 7 loops 虧損；Lv.3 fieldSpear 7/7 虧損（-27 至 -5 G）；Lv.5／6 ironShortSword 5/5 各虧 39 G。不可用單件輸出售價高於製作費就推導淨套利。

### Adventure

C Hybrid 的 `hybrid-combat-turn` 3 seeds 共記錄 8,848 G 戰鬥獎勵；成功 encounter start 共 880 次。用 encounter start 的 8 stamina 作最低直接成本，平均約 10.05 G／start、1.26 G/stamina。此粗算沒有扣入後續戰鬥回合、休息、死亡／撤退風險，也不等於 Adventure-only route 報酬。Hybrid 每 seed 另有 5 crafts；其三年淨額平均 +2,719 G／seed，仍含屬地、裝備與交易差異。Adventure-only 收入未拿來外推 Life 玩家。

## Farm → Food → Settlement／Civil Defense

最終 farm-business-supply variant 使用公開 `propertyEligibility`、`buyProperty`、商店 `trade(food, buy)`、農田移動與 `supplyFarmFood`，沒有直接改 settlement/player state。因被動聚落供糧常使 food 維持滿倉，variant 先合法購糧降低 settlement stock，再移至 farm building 鄰近位置供應。3 seeds 共 6 次成功 supply，每 seed 2 次、每次 10 food；每次 action inventory food -10、settlement food +10。這證明 supply action 可達並寫入聚落糧倉；目前沒有 active crisis，故未量到危機成功率或 Civil Defense readiness 的變化，不能宣稱供糧已量出完整戰備效益。

每 seed 另有 22 次 wheat harvest、購買 land 140 G 與 farmBusiness 220 G。為打開糧倉容量，各 seed 有 148–197 次成功購糧 action；因此這是**供糧可達性／成本壓力**觀測，不是建議玩家靠購糧循環，也解釋了該診斷 route 的三年淨額為 -34 至 -32 G。最終 evidence `attempt-20261014T090744303Z/` 15/15 route valid；供應 6/6 成功。

## Stock／Restock 與 runner 匯入說明

Controlled Town buy-craft-sell 共 25 個可完成 loops；25/25 經等待一天後可再次購買輸入，沒有觀察到 restock event。來源檢查也找不到 merchant stock inventory／restock API，故結論是 **NOT MODELED**，不是「庫存無限」的產品規則。Village fixture 的黑smith 不存在，對應配方阻塞的樣本不當作成功交易。

C runner 沒有 import `scripts/phase8/run-normal-routes.mjs`。該檔案是自執行 CLI：module top-level 解析參數、建立專屬 attempt、啟動 Vite 並立即跑完整 Life／Adventure／Hybrid；沒有可匯入的 route-policy 函式。直接 import 會觸發另一套 route run 與輸出副作用。C 因此重寫 economy-specific itinerary／action ledger，並重用 `route-validity.mjs` 的 gate；它沒有逐決策重播 A v3 的 route policy。這是可重現的 A/C policy 差異，應保留在解讀中，而不是把 A v3 有效樣本判作舊 runner artifact。

## C2 變更提案

### Gather → Sell 是否為近乎無風險的主收入

1. **問題：** Gather 工資加固定原料出售價是否讓其他 Life 方式失去金幣價值？
2. **證據：** Lv.3–4 wood／stone／iron 全售分別為 1.60／1.30／2.80 G/stamina；A v3 Life +9,023 G／3 年。C seasonal farm-sell 每 seed crop sale 77,580 G，季節 crop 有 5/6 種高於 gather 的最高 2.80 G/stamina；商人 stock／需求不建模。
3. **判讀：** gather wage 有固定保底且即售收入為正，是現行模型下近乎低風險的金幣路徑，但不是唯一或必然最強的 Life 收入；季節 crop-sale 已實際超過 A v3 的全部 gross income。兩者都未扣完整移動／時間機會成本，無法推論實際多人市場中的無限容量或無條件套利。
4. **提案：** **NO CHANGE** 工資／原料價；現有 gather rate 與 A v3 收益是可重現的正收入證據，但尚不足以單獨支持價格調整。此判斷基於目前 gather 樣本與未計入的移動／時間／節點機會成本，不以 merchant stock 缺少建模作為 Farming C-F1 的延後理由；Farming yield policy 另由 Owner 作產品選擇。
5. **驗收：** 本輪已留 A item-ID 缺失及 C seasonal farm 逐件 crop-good 售賣資料；若評估價格變動，補跑有逐 item 買賣量、移動／耗時、節點耗盡與可觀測 merchant stock 的 gather-only／craft／farm policies。

### Wheat 與季節作物的金幣／食物選擇

1. **問題：** wheat-only farming 是否對液態金幣目標全面劣勢？
2. **證據：** wheat 路線每 seed 359 harvest、約 7,853 food、實際 crop sale 0 G；seasonal-farm-sell 三年同 seeds 實測六種季節 crop，售金 77,580 G／seed。五種季節 crop 為 3.47–22.53 G／field stamina，高於 Lv.3–4 gather 最佳 2.80；field turnip 為 1.43。作物季節、成熟、yield、food equivalent、售金與 stamina 列於上方 crop table。
3. **判讀：** wheat 在 liquid gold 上比 gather／季節 crop 弱，但供應 food、Farming XP 與 FarmBusiness input；所以 wheat farming 不是對所有目標全面劣勢。runtime 數據證明「farming 作為 gold 路徑」也不再能概括成全面劣勢，差異在種植哪種合法 crop 及是否逐件變現。
4. **提案：** 不因單一 wheat-heavy policy 判定 farming 全面劣勢；季節 crop 已 runtime 整合且可變現。整體 yield policy 由 Finding C-F1 的 Owner product decision 決定；在選定相對收入目標前，Phase8 不改 wheat 或 seasonal crop 數值。保留 wheat 作 food／supply 選擇。
5. **驗收：** 本輪已按 `farmCropChoices` 與 `farmCropPlantingGuidance` 同 seeds、三年執行 seasonal variant；後續若更動價值，需另記錄未被此 best-current-rate policy 種到的 crop、供應結果、所有移動／休息與逐件售賣時間。

### FarmBusiness food supply／Civil Defense

1. **問題：** farm food 是否可沿公開路徑供應 settlement，且能否證明戰備價值？
2. **證據：** 最終 C route 6/6 成功、每 seed 2 次 × 10 food，settlement food 每次 +10；無 active crisis，未算出 readiness 或危機成功變化。
3. **判讀：** Farm → Food → Settlement supply action 已實際到達；Civil Defense 的下游效果尚未驗證。高滿倉和購糧開容量令診斷 route 花費高，三年淨額 -32 至 -34 G。
4. **提案：** **NO CHANGE** supply action 與 crisis 規則；現有證據不足以調整供應效益或成本。
5. **驗收：** 在合法購地／供糧路徑加入 active crisis 前後 readiness、food forecast、短缺與結果紀錄；區分自然聚落供糧、玩家供應和購糧造成的 settlement delta。

### Merchant stock／Buy-Craft-Sell

1. **問題：** 可否穩定買料製作後出售形成套利？
2. **證據：** 25 town loops 中僅 1 次 starterSpear +9 G，其餘 24 次為負；25 次隔日購買都可再執行、沒有 restock event，但 stock 欄位／API 不存在。
3. **判讀：** 已測配方的購料成本通常高於出售結果；隔日可買不代表有正式 restock 系統或無限供量。
4. **提案：** **NO CHANGE** 價格、配方費與 stock 規則。Phase 8 不新增 economy engine；將 NOT MODELED 缺口列為後續產品決策。
5. **驗收：** 若未來加入 stock／restock，按品項與城鎮 stage 記錄起始量、成交後庫存、隔日補貨及多人競爭，再重做完整 loop matrix。

## 來源

- `src/engine/actions.ts:35-80` farming 成本、成熟與收成；`:83-98` gather 產量、工資、體力與時間；`:115-138` store trade、固定售價與購價。
- `src/data/config.ts:33-37,61` 基礎買賣價格與 legacy wheat。
- `src/engine/ownership.ts:63-105,169-212` property eligibility、farmBusiness 與供糧容量／ settlement 更新。
- `src/engine/simulation.ts:282-304` settlement food 每日變化與聚落成長。
- `src/data/crafting.ts:6-93` 配方費用與 action cost；`src/engine/rewardActions.ts:11-53` crafted gear 售價公式。
- `src/engine/crops.ts:36-81` seasonal crop registry projection、season/region legality、yield 與 planting guidance；`src/data/contentRegistry.ts:10-15,28-29` Phase7-G crop runtime registration；`src/data/content/farmCrops.ts:7-83` 11 seasonal crops and goods。
- `src/engine/actions.ts:35-80` legal plant/harvest actions and stamina costs; `src/engine/rewardActions.ts:89-119` crop-good conversion and unit sales.
- Phase7-G: `reports/v2/20261008-content-expansion/phase-07/g-crop-plan.md`（內容規劃值；runtime integration 已在目前 checkout 接通）、`g-crop-author.md`（authoring only）。
- 原始數據：A attempt `actions.csv.gz`、`crop-yields.csv`、`completion.json`；C 最終 attempt `attempt-20261014T090744303Z/actions.csv`、`crop-yields.csv`、`crafts.csv`、`completion.json`。

# Phase 8-C1：生活成長與 Smithing

## 範圍與證據

- A v3 驗證樣本：`a-baseline-run/attempt-20261014T040039340Z/`，Life 3 seeds × 3 年，9/9 路線有效。
- C economy 樣本：`c-runner/attempt-20261014T090744303Z/`，Life、Hybrid、craft-focused、farm-business-supply 與 seasonal-farm-sell 共 15 個 route/seed 樣本，15/15 `VALID_POLICY`。
- 另有舊低階路線：A v3 每 seed 製作 676 把 `starterSpear`，僅前 6 把取得 practice XP；其餘 670 把已達 recipe practice cap，XP award 為 0。這是「重複低階製作」的真實政策訊號，但不是所有 Life 路線都必須做 676 次。
- C 的 craft-focused Life 每 seed 製作 241 件並到 Smithing Lv.6：`starterSpear` 2、`fieldArmor` 44、`ironShortSword` 195。依實際 craft ledger 的 XP award 與 Smithing 狀態，241 次已走完所需成長；Lv.6 的累積門檻為 300 XP。不要把 validity 輔助欄位 `smithingXpGained: 500` 當作實際 XP，它是 route gate 的 level-based proxy。

## 季節作物與 Farming 進度

`farmCropChoices()` 是已註冊 Phase7-G crops 的 runtime season／region legality projection，不是待整合資料。C seasonal-farm-sell 以同三個 seeds、相同三年窗口依 `status === available` 選當季作物，使用公開 prepare／plant／harvest，再經 `tradeMaterial` 售出 crop goods。下表是 **V4 前** attempt `attempt-20261014T090744303Z` 的每 seed 實際總量；field stamina 按每輪 prepare 6 + plant 4 + harvest 4 計。食物欄是 good 的 foodValue 換算，路線將 goods 售出而非轉成玩家 food。毛額不扣移動、rest 或逐件售賣 action 的時間。V4 後的實際輸出見下方 C-F1 Before/After 表。

| crop | 實際種植季 | 成熟日 | 每 seed yield（harvest 次數） | 售金／seed | Food equivalent／seed | field stamina／seed | 毛 G／stamina | 毛 G／成熟日 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `field_turnip` | 春 | 1 | 20（3） | 60 | 20 | 42 | 1.43 | 20.00 |
| `spring_pea` | 春 | 0.5 | 6,177（254） | 12,354 | 6,177 | 3,556 | 3.47 | 97.28 |
| `marsh_rice` | 夏 | 4 | 247（14） | 2,717 | 741 | 196 | 13.86 | 48.52 |
| `sun_pepper` | 夏 | 1.5 | 3,017（105） | 15,085 | 6,034 | 1,470 | 10.26 | 95.78 |
| `orchard_apple` | 秋 | 2 | 2,805（105） | 22,440 | 5,610 | 1,470 | 15.27 | 106.86 |
| `cave_mushroom` | 冬 | 3 | 2,077（79 harvested / 80 planted） | 24,924 | 6,231 | 1,106 | 22.53 | 105.16 |

普通 Life 的 wheat 對照（V4 前）為每 seed 359 harvest、約 7,853 food、實際 crop gold 0；約 5,026 farm stamina，1.56 food/stamina，成熟時間 2 日。A v3 每 seed 4 次 wheat harvest、24 food。Seasonal route V4 前每 seed 收成約 560 次，14,343 個 crop-good sale action 產生 77,580 G；V4 後 513 次 harvest、3,453 個售出 goods、22,315 G／seed。兩 route 淨額均包含 gather／craft 活動，不能把全數歸因 farming。完整 crop comparison 見 `economy-balance.md`。

## C2 Finding C-F1：Farming yield scaling（product, High；RESOLVED by C2 change）

Owner 於 2026-10-14 選定 V4：yield bonus `min(2, floor((level - 1) / 2))`。Lead 已將它用於 `farmCropChoices()` 的所有作物（含 wheat）及 `src/engine/actions.ts` unknown-crop fallback。Farming level 不再使單次 yield 線性無限增加，C-F1 已 **RESOLVED by C2 change**。商人 stock／需求仍未建模，是獨立產品 finding。

固定序列反事實以 V4 前 attempt `attempt-20261014T090744303Z` 的三 seeds 各 560 次收成為輸入，不重新決策或模擬；同 crop、season、成熟日、stamina、售價，只改 yield bonus。V0 現行觀察值 77,580 G／seed；V1 gather-style `floor((level - 1) / 2)` 44,886（57.9%）；V2 base only 13,410（17.3%）；V3 凍結第一年末 Lv.19 bonus 67,122（86.5%）；Owner V4 19,346（24.9%）。逐 seed／逐 crop 輸出及 source attempt 在 `c-runner/c1-crop-counterfactual.json`；路線若自適應會改變結果。

V4 前後都是 3 seeds × 3 年、15/15 route-seed PASS；以下淨額是每 seed 範圍，產出與 harvest 是每 seed：

| Variant | Net G before → after | Harvests before → after | Crop output before → after |
|---|---:|---:|---:|
| Life（wheat） | +30..+38 → +30..+38 | 359 → 359 | food 7,853 → 2,500 |
| Hybrid | +2,655..+2,835 → +2,655..+2,835 | 270 → 270 | food 5,266 → 1,877 |
| craft-focused | +2,851..+2,931 → +2,851..+2,931 | 35 → 35 | food 336 → 232 |
| farm-business-supply | -34..-32 → -34..-32 | 22 → 22 | food 186 → 141；每 seed 2 次 supply 仍成功 |
| seasonal-farm-sell | +101,218..+101,528 → +49,108..+49,382 | 560 → 513 | crop goods sold 14,343 → 3,453；sale 77,580 → 22,315 G |

Settlement food 最終在所有 route／seed 均為 100。Seasonal 路線主要正收入轉為 craftsman-profit：crafted sales 68,223–68,497 G／seed 減 craft fees 45,450 G = +22,773–+23,047 G（V4 前 sales 59,464–59,774 G 減 fees 39,434 G = +20,030–+20,340 G）。材料來自 gather 的 iron 等 node-capped inputs；受節點 regen 與 runner 每日 80-action ceiling 限制，且未扣採集時間機會成本。這是合法 craftsmanship 收益觀測；crafting 價格／費用 **NO CHANGE**。merchant stock／需求 **NOT MODELED** 是獨立產品 finding，不代表 C-F1 仍未解。數據來自兩 attempt 的 `completion.json`、`actions.csv`、`crop-yields.csv`。

對應 Phase8 §4 五問：

1. **原始問題：** Farming level 原會無 cap 地增加每次 yield，使長期單批作物量線性增長。
2. **支持證據：** V4 前 seasonal route 560 harvest、77,580 G／seed、Farming Lv.1→33；V4 固定序列為 19,346 G／seed。前後實跑表如上，皆 15/15 route-seed PASS。
3. **預期改善的玩家決策／世界行為：** 保留低／中期 Farming 成長的 harvest 回報，同時封頂後期單次 bonus，避免技能升級永久擴大每批 yield。
4. **實際修改：** Owner 核准且 Lead 實作 V4 `min(2, floor((level - 1) / 2))`，涵蓋所有 crop（含 wheat）及 unknown-crop fallback；C-F1 **RESOLVED by C2 change**。Lead 的引擎驗證為 28 files／424 tests PASS；本 C1 r3 僅新增 counterfactual V4 與報告，沒有再改 `src/`。長世界 10／50／100 年驗證交由 Phase8-D。
5. **其他玩法退化／剩餘風險：** Farming food yield 下降，但供應 action 仍每 seed 2/2 成功、Settlement food 最終維持 100；Phase8-D 需完成 10／50／100 年 regression。Crafting 正收入受 node regen 與 80-action ceiling 限制，另列收益觀測並 **NO CHANGE**。merchant stock／需求仍 **NOT MODELED**，獨立保留為產品 finding。

## Smithing 與配方層級

| 配方 | Smithing 門檻 | practice cap | 體力／時間／費用 | C craft-focused 數量／seed | 平均售價 | 扣製作費後、未扣材料機會成本 |
|---|---:|---:|---:|---:|---:|---:|
| `starterSpear` | 1 | 3 | 10／45 分／4 G | 2 | 16.67 G | 12.67 G／craft，1.27 G／stamina |
| `fieldArmor` | 2 | 5 | 12／60 分／8 G | 44 | 28.50 G | 20.50 G／craft，1.71 G／stamina |
| `ironShortSword` | 5 | 6 | 16／90 分／18 G | 195 | 25.90 G | 7.90 G／craft，0.49 G／stamina |

售價是 C 的 3-seed craft output 觀測值：`crafts.csv` 分別為 6、132、585 件。配方費已扣；木材、石材、鐵礦的取得時間與機會成本未扣，所以這不是完整淨利或每小時路線報酬。高階配方的單次售價不保證抵得過購買輸入成本；controlled buy-craft-sell 另見 `economy-balance.md`。

A v3 的 676 次訊號來自只反覆做最低階 `starterSpear` 並超過 practice cap：前 6 次取得 XP，其餘 670 次 XP 為 0。C 的分層路線用 241 crafts／seed 到 Lv.6，證明升級不需要 676 次低階 craft。保留「starterSpear-only policy 超 cap 後仍重複」的條件式 chore-risk；證據否定的是把 676 次解讀成所有 Life progression 必要量，並未證明所有玩家都不會遇到低階 chore。暫不調整 XP 或 cap；後續如玩家實際採用 starterSpear-only，應再看目標配方可見度及材料／設施阻塞。

## Masterpiece

`ironShortSword` 在 Smithing Lv.6 eligible 時，公式為 25%。C 3 seeds 共 555 次 eligible crafts，實際 154 件 masterpiece（27.7%）；各 seed 為 44/185、58/185、52/185。樣本略高於公式期望，現有 3-seed 樣本不足以支持改率。Lv.5 的 30 把 sword craft 尚未 eligible，不混入分母。

## C2 變更提案：Smithing progression／低階 chore

1. **問題：** A v3 的 676 次 `starterSpear` 會被解讀成必要的 Smithing 磨練，與低階 craft practice cap 衝突。
2. **證據：** A v3 每 seed 只重複最低階 `starterSpear`：676 crafts 中只有前 6 次得到 XP（共 60 XP），後 670 次超 practice cap、XP 0；C 每 seed 241 次分層 crafting（2／44／195）達 Lv.6。
3. **判讀：** 磨練訊號由固定最低配方政策造成，recipe 解鎖後改做較高階合法配方可更快到 Lv.6；低階重複仍可被用作出售，但不是升級必需。
4. **提案：** **NO CHANGE** XP 曲線與 practice cap。A 的 676-craft chore 訊號來自只重複一個最低階 `starterSpear` 配方超過 practice cap，屬政策特定風險；C 分層路線每 seed 241 crafts 到 Smithing Lv.6，沒有證據支持「所有 Life progression 都需要 chore」的結論。
5. **驗收：** 後續 progression 改動需重跑同 seeds 的 starter-only 與 highest-legal-recipe policy，列出超 cap 次數、每級 crafts、材料取得時間與實際 XP；目前已有 241-vs-676 的對照證據。

## C2 變更提案：Masterpiece

1. **問題：** 固定 25% masterpiece 會否因實際頻率偏高而破壞高階裝備／經濟節奏？
2. **證據：** Lv.6 `ironShortSword` 154/555（27.7%），三個 seed 各 185 次；Lv.5 樣本不符合 eligible 條件。
3. **判讀：** 與公式方向一致，3 seeds 只提供初步校驗，不足以判定 25% 失衡。
4. **提案：** **NO CHANGE** masterpiece 機率與公式。
5. **驗收：** 若後續調整，按 eligible crafts 分層累積更大樣本，並保存 seed、Smithing level、配方、公式 chance 與觀測率；不得混入未 eligible crafts。

## 來源

- `src/data/crafting.ts:6-93` 配方、材料、製作費、體力、時間、門檻、practice cap 與 masterpiece 規則。
- `src/engine/crafting.ts:179-258,415-478` 合法計畫、XP、成本與公開 craft 交易。
- `src/engine/simulation.ts:225-239` skill XP 升級曲線。
- `src/engine/itemGeneration.ts:191-201,239-246` masterpiece eligible 與隨機套用。
- 原始數據：A attempt `crafts.csv`、`completion.json`；C attempt `crafts.csv`、`recipe-plans.csv`、`completion.json`。

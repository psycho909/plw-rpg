# Phase7-G — 作物與收成品內容提案

狀態：Low 機械探索草案，待 Root 核定／Phase G release 後才可實作。目標為新增 11 種作物與 11 個不同收成品，連同既有 `wheat` 共 12 種。沿用 `ContentCrop`、`ContentCropGood`、Reward material、現有農作／交易／供糧契約；不新增 schema 欄位、存檔欄位或獨立作物子系統。

## 既有契約與整合條件

- 定義欄位見 `src/domain/content.ts`：作物 `id/name/description/regions/seasons/growthMinutes/harvestAmount/harvestGoodId`；收成品 `id/name/description/sourceCropId/foodValue/sell`。地區為 `village/farmland/forest/mine/unknown`，季節為春夏秋冬。validator 對成熟時間限 1–43200 分、收量限 1–100、`foodValue` 限 1–4、出售價限 1–50，且會檢查收成品反向來源與近似重複。
- Pack 入口是 `src/data/contentRegistry.ts` 的 `CONTENT_PACKS`，並導出 `CONTENT_CROPS`、`CONTENT_CROP_GOODS`；舊 `wheat` 已在 `LEGACY_CROP_IDS`，不得複製或重算。存檔 v8 已有 `cropId` 與 known-ID 檢查，遷移舊作物為 wheat。
- 目前實際農作 API 是 `src/engine/actions.ts` 的 `farm(state, 'prepare'|'plant'|'harvest')`。但 plant 寫死 `cropId: 'wheat'` 及兩日成熟，harvest 寫死 `CROP.yield`、直接增加 `inventory.food`；`src/engine/simulation.ts` 只將作物標成熟，不依 crop definition。故目前僅新增 pack 資料無法實現 11 種作物的播種、成長與收穫閉環。整合時需讓既有 `farm()` 流程消費 `CONTENT_CROPS`／持久 cropId，而不另造 public API；選種與季節／地區規則需由實作端沿用既有行動／UI 路徑解決。
- 收成品會由 `src/data/rewards.ts` 合併到 `MATERIALS`，`src/engine/rewardActions.ts::tradeMaterial` 可按收成品 `sell` 出售；Reward materials 可用 `src/engine/crafting.ts` 的既有 material 輸入消耗，但本提案不把作物硬塞進不相干裝備 recipe。`ContentCropGood.foodValue` 目前僅供 `contentSourceHints()` 顯示食用用途，並未由 runtime 消耗。`contributeCrisisFood()` 與 `ownership.ts` 的 `supplyFood()` 都只收 `character.inventory.food`。若要讓收成品實際補玩家／聚落糧食，Phase G 整合須在既有 harvest／供糧函式中按 `foodValue` 轉換或扣用收成品；不能僅憑 metadata 宣稱已支援危機供糧。
- 因此本表的 acquire→plant→growth→harvest→sell 路徑以既有 public `farm()`／simulation／Reward material／`tradeMaterial()` 接縫為目標；食用／供糧路徑是明確尚待接線的 acceptance。Phase G 驗收前需以實際行動證明完整循環，不得以 validator 的 `cropGoodEvidence` 代替 runtime 證據。這是唯讀探索發現，沒有改 source、ticket 或執行測試。

## 11 新作物／收成品資料列

所有作物皆使用 `regions: ['farmland']`，與既有 `farm()` 位置限制一致；不可暗示 forest、mine、unknown 有種植或解鎖支援。收成品皆可作現有素材庫商品出售。`foodValue` 是每份收成品轉成 inventory food 後的糧食值，目標範圍 1–3。金幣出售是把收成品整疊換為 gold，非額外生成收益。每對 `(foodValue, sell)` 均不同，避免 validator 的近似收成品警告。

| Crop ID / 名稱 | Good ID / 名稱 | 地區／季節 | 生長分鐘 | 收量 | foodValue | sell | 設計理由 |
|---|---|---|---:|---:|---:|---:|---|
| `spring_pea` 豌豆 | `spring_pea_good` 豌豆莢 | farmland／春 | 720 | 4 | 1 | 2 | 最快且低收量、低單價；春季短週期應急糧。 |
| `field_turnip` 田蕪菁 | `field_turnip_good` 蕪菁 | farmland／春、秋 | 1440 | 6 | 1 | 3 | 一日成熟，高收量但低單份營養與售價。 |
| `summer_barley` 夏大麥 | `summer_barley_good` 大麥束 | farmland／夏 | 2880 | 8 | 1 | 4 | 兩日大宗作物；以總收量補長等待，不提供高單位價值。 |
| `sun_pepper` 日照椒 | `sun_pepper_good` 紅椒 | farmland／夏 | 2160 | 4 | 2 | 5 | 中週期、低量中補給；單價高於普通糧食。 |
| `forest_bean` 林豆 | `forest_bean_good` 林豆莢 | farmland／夏、秋 | 2880 | 6 | 2 | 6 | 兩日成熟、季節跨度較長，作為穩定的中期供糧選擇。 |
| `autumn_pumpkin` 秋南瓜 | `autumn_pumpkin_good` 南瓜 | farmland／秋 | 5760 | 10 | 2 | 7 | 四日成熟且收量高；依賴長週期耕作而非高售價套利。 |
| `orchard_apple` 果園蘋果 | `orchard_apple_good` 蘋果 | farmland／秋 | 2880 | 5 | 2 | 8 | 兩日成熟，糧食與售價平衡，補秋季選擇。 |
| `winter_cabbage` 冬甘藍 | `winter_cabbage_good` 甘藍 | farmland／冬 | 4320 | 6 | 3 | 9 | 冬季三日成熟、中高補給，價值高於基礎糧。 |
| `frost_root` 霜根 | `frost_root_good` 霜根塊 | farmland／冬 | 5760 | 5 | 3 | 10 | 四日成熟、低收量、高單份補給與溫和溢價。 |
| `marsh_rice` 濕地稻 | `marsh_rice_good` 稻穗 | farmland／夏、秋 | 5760 | 8 | 3 | 11 | 四日大宗糧；靠長等待換取較高總補給與售價。 |
| `cave_mushroom` 洞菇 | `cave_mushroom_good` 洞菇 | farmland／春、秋、冬 | 4320 | 4 | 3 | 12 | 三日成熟、低收量高補給；季節跨幅較廣且售價最高。 |

## 粗略經濟檢查

以下是資料值導出的目標比較，不是實測 PASS：每塊田的等值食物為 `harvestAmount × foodValue`，金幣／日以 `harvestAmount × sell ÷ growthMinutes × 1440` 計，未扣除共同的整地、播種、收割時間與體力成本。

| 作物 | 等值食物／收成 | 目標食物／日 | 目標金幣／日 |
|---|---:|---:|---:|
| 豌豆 | 4 | 8.00 | 16.00 |
| 田蕪菁 | 6 | 6.00 | 18.00 |
| 夏大麥 | 8 | 4.00 | 16.00 |
| 日照椒 | 8 | 5.33 | 13.33 |
| 林豆 | 12 | 6.00 | 12.00 |
| 秋南瓜 | 20 | 5.00 | 17.50 |
| 果園蘋果 | 10 | 5.00 | 13.33 |
| 冬甘藍 | 18 | 6.00 | 12.00 |
| 霜根 | 15 | 3.75 | 12.50 |
| 濕地稻 | 24 | 6.00 | 22.00 |
| 洞菇 | 12 | 4.00 | 16.00 |

legacy wheat 基準按 5 食物／收成、5 份售價未納入此表（不是 `ContentCropGood`）；小麥 2880 分鐘時為 2.50 食物／日。耕作等級加成只應沿既有 harvest contract 一致處理，尚未用模擬核對。這些作物無額外金幣種植成本，不能只憑單次收益宣稱無套利；需後續按玩家時間、體力、season availability 及實際收成值檢視。

## 待 Root／Phase G 整合端確認

1. Root 已核准窄幅整合方向：在既有 `farm()` 的 optional `cropId` 參數（預設 `wheat`，保留舊呼叫）選種；必須經 registry known-ID 與當前 season gate，並在 cost／simulation mutation 前拒絕無效選擇。持久 crop row 繼續使用已存在的 `cropId`，不加 save 欄位或子系統。
2. 成長成熟時間取所選 `ContentCrop.growthMinutes`；收割依 cropId 產生對應 `harvestGoodId`／`harvestAmount`，不可同時再加 legacy `inventory.food`，避免重複獎勵。既有 wheat 保持舊行為與其歷史存檔相容。
3. Root 已核准沿用 reward-action 風格的既有動作接縫，將持有的 crop good 實際轉換／消耗為 `inventory.food`，按 `foodValue` 兌換並維持存檔材料帳一致；確認既有 `supplyFood()` 與 `contributeCrisisFood()` 可用轉換後食物，且供應扣除與收成品消耗不重複、不遺失。這是已核准的窄幅 runtime integration，不是目前已實作的 API。
4. 此計畫及表格不構成 runtime、模擬或供糧驗收證據；Phase G source 仍未 release。實際施工與測試需依 Root release 後 ticket／Phase gate 執行。

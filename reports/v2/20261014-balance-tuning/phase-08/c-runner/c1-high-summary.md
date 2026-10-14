# Phase8-C1 High summary

## 最終結果

- V4 前基準 attempt `attempt-20261014T090744303Z/` 與 Owner-approved V4 後 attempt `attempt-20261014T093926448Z/` 均由 `node scripts/phase8/run-life-economy.mjs` 產生，completion **PASS**，各 15/15 route/seed `VALID_POLICY`；後者是目前平衡值的實跑證據。
- 樣本含 Life、Hybrid、craft-focused Life、farm-business-supply Life、seasonal-farm-sell Life；seeds 61101–61103，各 3 年。記錄 322,286 action rows、16,200 daily rows、8,080 crafts、5,421 crop rows、58 controlled-probe rows。
- FarmBusiness supply 仍為 6/6 成功（每 seed 2 次 × 10 food）；沒有 active crisis，未量得 readiness／危機成效。
- 測試：`node --test scripts/phase8/test_economy_harness.mjs` — **4/4 PASS**。未執行 npm、Vitest 或 full check；留給 Lead。

## Lead 指定修訂

- r2 Lead review（V4 前發現）：`src/engine/crops.ts` 對季節作物原以 `harvestBase + Farming level - 1` 增 yield；每輪 Farming XP 無 practice cap，farm actions 不耗 gold、crop goods 固定價可售。三年內 seasonal route 每 seed Farming Lv.1→33、crop sale 77,580 G，約 A v3 Life net 9,023 G 的 8.6 倍、已測 Adventure net 約 2,345 G 的 33 倍；按舊規則無上限延伸會持續增長。
- 新增 `c-runner/c1-crop-counterfactual.mjs` 與 `c1-crop-counterfactual.json`：在最終 attempt 相同 crop／季節／成熟／stamina／售價、每 seed 560 harvest（共 1,680 rows）的固定序列上重算，不重跑也不調整政策。均值／seed：V0 現行 77,580 G；V1 `floor((level-1)/2)` 44,886（57.9%）；V2 base yield only 13,410（17.3%）；V3 凍結第一年末 bonus 67,122（86.5%）。三 seed day 359 Farming level 均 Lv.19。這些是分析反事實，路線若自適應會改變收成序列。
- r2 的 V0–V3 trade-off 已由 Owner 的後續決策取代，見下節；不再是待決狀態。
- `attempt-20261014T083910637Z/`：分類為 **INVALID_POLICY** 的失敗 seasonal-farm-sell 對照（15 個 route/seed 僅該季節 variant 3/3 無效）；route-validity 顯示該 variant 沒有成功 gather、farming、life activity 或 skill XP，並未形成 crop cycle。保留原 attempt，不列入 C1 結論。

## r3 Owner-approved V4 revision

- Owner 於 2026-10-14 選擇 V4 yield bonus：`min(2, floor((level - 1) / 2))`。Lead 已在 `farmCropChoices()` 套用於所有 crops（包含 wheat），並套用至 `actions.ts` unknown-crop fallback；Lead reported `crops.test.ts` regression 與 engine vitest 28 files／424 tests PASS。本任務未修改 `src/`。
- 已更新 `c1-crop-counterfactual.mjs`、core、JSON 與測試：固定使用 V4 前 `attempt-20261014T090744303Z` 的 1,680 次同 policy harvest sequence，不重跑 policy。V4 fixed-sequence crop sale = **19,346 G／seed**；相較 V0 77,580 G 為 24.9%。V1 44,886、V2 13,410、V3 67,122 G／seed 保留作敏感度對照。測試 `node --test scripts/phase8/test_crop_counterfactual.mjs` **2/2 PASS**；counterfactual script exit 0。
- Lead 已按 C2 V4 重跑同 seeds／3 年：after attempt `attempt-20261014T093926448Z/` **PASS 15/15**；before `attempt-20261014T090744303Z/` 亦 **PASS 15/15**。原始 `completion.json`／`actions.csv` 核對：Life wheat +30..+38 G 不變，359 harvest、food 7,853→2,500；Hybrid +2,655..+2,835 G 不變，270 harvest、food 5,266→1,877；craft-focused +2,851..+2,931 G 不變，35 harvest、food 336→232；farm-business-supply -34..-32 G 不變，22 harvest、food 186→141 且 supply 每 seed 2/2 成功；seasonal-farm-sell net +101,218..+101,528→+49,108..+49,382 G、560→513 harvest、crop goods sold 14,343→3,453、crop sales 77,580→22,315 G。`daily.csv` day 1079 顯示兩次 attempts 所有 route／seed settlement food 均為 100。
- C-F1 已記為 **RESOLVED by C2 change (Owner-approved V4)**，並按 Phase8 §4 五問更新兩份報告。季節路線後測餘下 +22,773..+23,047 G／seed crafted sales less fees（sales 68,223..68,497 減 fees 45,450；前測 +20,030..+20,340 = sales 59,464..59,774 減 fees 39,434），由 node-capped gathering inputs 支撐並受每日 80-action ceiling 限制；記錄為合法 craftsman-profit，craft price **NO CHANGE**。Merchant stock／需求仍 **NOT MODELED**，另列產品 finding。Food yield 下修但 supply actions 與 settlement food 未變；10／50／100 年長世界驗證交由 Phase8-D。

- A v3 Life `a-baseline-run/attempt-20261014T040039340Z/` 是有效的 3 seeds × 3 年 scripted itinerary，9/9 valid，不是應排除的舊 runner artifact。A 每 seed 淨額約 +9,023 G；743 gathers 工資 2,972 G，另有 2,330 次 `sell-gathered` 收入 8,755 G（無 item ID，不能拆成原料／裝備）；各 source 和 stamina rate 見 `economy-balance.md`。
- C 普通 Life 是不同的 wheat-heavy policy：每 seed +30 至 +38 G、359 wheat harvest、約 7,853 food、實際 crop gold 0。季節 crop 已 runtime 整合；`seasonal-farm-sell` 依 `farmCropChoices()` 和 planting guidance 種當季合法作物，收成後用 `tradeMaterial` 逐件賣出。六種實際種植的 crop 為 `field_turnip`、`spring_pea`、`marsh_rice`、`sun_pepper`、`orchard_apple`、`cave_mushroom`；三年 crop sales 為 77,580 G／seed（14,343 件），route net +101,218 至 +101,528 G。五種 crop 毛值高於 Lv.3–4 gather 最佳 2.80 G／stamina；turnip 低於。逐 crop season、成熟、yield、售金、food equivalent、stamina、G/stamina 與 G/mature-day 已列兩份報告。這個證據推翻「farming 是全面較差的賺金路徑」，但 wheat-only 仍偏 food／Farming XP；逐件售貨時間與 merchant demand/stock 未建模。
- Chore finding 保留為有條件風險：A 每 seed 只重複最低階 `starterSpear` 676 次，前 6 次共得 60 XP，後 670 次超過 practice cap、XP 為 0。C 的分層 craft-focused route 每 seed 241 crafts（2 `starterSpear`、44 `fieldArmor`、195 `ironShortSword`）到 Smithing Lv.6，故 676 並非 progression 必要量；低階超 cap policy 仍有 chore-risk。
- 未 import `run-normal-routes.mjs`：它在 module top-level 建立 attempt、啟動 Vite 並執行整組 Life／Adventure／Hybrid，沒有匯出的 policy 函式／純 runner seam。C 需要 economy-specific ledger 與 farm supply／seasonal sale actions，因此自行執行 economy itinerary，沿用 `route-validity.mjs` gate；兩 runner policy 不同，數值按各自 scripted itinerary 解讀。
- Runner action ceiling：A v3 每日 80 decisions；C 一般 variants 24 actions、farm supply 和 seasonal-farm-sell 80 actions。此為 harness safety policy，不是 UI 限制。Farm sale 每件一個 5 分鐘 public action，且報告的 farm G/stamina 不含移動與售賣時間。

## Reports 與保留的 attempts

- 已更新 `life-progression.md`、`economy-balance.md` 的實測 crop rows、wheat/gather 對照與 C2 proposals；修正 Phase7-G runtime 整合狀態。
- 所有 attempts 保留，未刪除。早期 C1 attempts `attempt-20261014T072719548Z/` 至 `attempt-20261014T075549012Z/` 保留供糧 policy 修正歷史；本次季節路線的無效嘗試 `attempt-20261014T081111708Z/`、`attempt-20261014T081631882Z/`、`attempt-20261014T082322910Z/`、`attempt-20261014T083220346Z/`、`attempt-20261014T083910637Z/`、`attempt-20261014T084811248Z/`、`attempt-20261014T085406445Z/`、`attempt-20261014T085932290Z/` 均因季節路線尚未完成 farming/crop-cycle policy 而未通過 validity，沒有當作最終證據。
- 最終 evidence：`attempt-20261014T090744303Z/`；15/15 route/seed valid，FarmBusiness supply 6/6 valid action，gold ledgers reconcile。
- r3 已新增 V4 counterfactual test 並執行 2/2 PASS；跑 counterfactual analyzer exit 0。沒有重跑 economy harness 或建立新 attempt；V4 後 engine rerun attempt 由 Lead 建立並保留。

## Lead pending

- `npm.cmd run check` 與其他整合檢查尚未執行，依 dispatch 留給 Lead。
- No `src/` changes; no commit, push, stash, reset, or attempt deletion.

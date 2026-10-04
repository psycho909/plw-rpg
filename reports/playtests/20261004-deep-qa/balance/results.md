# QA-02 經濟、裝備與傭兵平衡模擬

- 狀態：已執行純引擎模擬；沒有修改遊戲平衡。
- 來源：`738bc0010c549fa3fb2420437d171f5aa2a043a0`；Vite SSR 固定載入 `/tmp/plw-rpg-qa-source-738bc00`。
- 執行區間（UTC）：2026-10-04T02:58:04.747Z 至 2026-10-04T03:01:19.014Z。
- 來源檔 SHA-256：見 [raw-runs.json.gz](raw-runs.json.gz) 解壓後的 metadata.sourceHashes 與 [archive-storage.json](archive-storage.json)；八個引擎契約檔與 baseline manifest 全部吻合。
- 樣本：6 seeds × 7 policies × 3 horizons（總計 126 run records；若 smoke 子集請看 metadata）。
- 正常路線只呼叫 public engine actions、`walkTo` 與自然 `simulate`；fixture/refusal probe 在獨立區塊。

## 策略與口徑

- `farming_sale`：合法整地、播種、等小麥成熟、收割；累積新收食物後每批最多賣 20 份。
- `woodcutting_sale`、`stone_mining_sale`、`iron_mining_sale`：實際走到森林／礦區採集，回商店每批最多賣 20 份；體力不足回家免費休息，資源不足等隔日再生。
- `combat_bare`：未買裝、未雇傭兵；合法野外遭遇，低血用藥水，沒藥時撤退，於聚落免費休息。
- `combat_gear`：先用鐵礦採集與合法商店出售籌資；聚落解鎖後依現價買劍甲並以 `equip` 穿戴，再依相同戰鬥政策冒險。
- `combat_gear_hire_once`：同上，另於酒館開放後合法聘 healer + fighter 一次，觀察 3 日契約實際支出；契約到期後不自動續聘。
- 初始淨值定義為起始金幣 + 初始背包各品項依 `ITEMS[item].sell` 計價；終值用同一賣價計算。淨值變化包括庫存、裝備購入折價、消耗品與現金，不把初始免費物品算成收益。
- game days 按 `createGame` 的起始 worldTime 起算；每 run 計畫同時長，政策在剩餘時間不足時停止動作並以 `simulate` 精確補到 horizon。
- active action minutes 排除純等待；travel、passive wait、採集、耕作、交易、戰鬥、聘用與休息分鐘分開計算；同時保存 stamina、現金、拒絕、交易、契約、死亡、每 30 日 checkpoint 與序列化回讀。


## 多 seed 結果

| Horizon | Policy | Seeds | 淨值變化 mean / median / range | 現金變化 mean | Active action min mean | Travel min mean | Passive wait min mean | Stamina spent mean | Wage mean | 死亡 | 拒絕率 mean | Save/reload failures |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 30d | farming_sale | 6 | 2410.00 / 2410.00 / 2410.00…2410.00 | 2410.00 | 10570.0 | 4890.0 | 32630.0 | 684.0 | 0.00 | 0/6 | 0.000% | 0 |
| 30d | woodcutting_sale | 6 | 1960.00 / 1960.00 / 1960.00…1960.00 | 1912.00 | 11155.0 | 4865.0 | 32045.0 | 900.0 | 0.00 | 0/6 | 0.000% | 0 |
| 30d | stone_mining_sale | 6 | 1252.00 / 1252.00 / 1252.00…1252.00 | 1216.00 | 11892.0 | 6640.0 | 31308.0 | 760.0 | 0.00 | 0/6 | 0.000% | 0 |
| 30d | iron_mining_sale | 6 | 2832.00 / 2832.00 / 2832.00…2832.00 | 2736.00 | 11892.0 | 6640.0 | 31308.0 | 760.0 | 0.00 | 0/6 | 0.000% | 0 |
| 30d | combat_bare | 6 | 347.33 / 348.00 / 336.00…358.00 | 174.00 | 330.7 | 175.0 | 42869.3 | 144.0 | 0.00 | 0/6 | 0.000% | 0 |
| 30d | combat_gear | 6 | 2832.00 / 2832.00 / 2832.00…2832.00 | 2736.00 | 11892.0 | 6640.0 | 31308.0 | 760.0 | 0.00 | 0/6 | 0.000% | 0 |
| 30d | combat_gear_hire_once | 6 | 2832.00 / 2832.00 / 2832.00…2832.00 | 2736.00 | 11892.0 | 6640.0 | 31308.0 | 760.0 | 0.00 | 0/6 | 0.000% | 0 |
| 120d | farming_sale | 6 | 13000.00 / 13000.00 / 13000.00…13000.00 | 12825.00 | 42845.0 | 18770.0 | 129955.0 | 2308.0 | 0.00 | 0/6 | 0.000% | 0 |
| 120d | woodcutting_sale | 6 | 6016.00 / 6016.00 / 6016.00…6016.00 | 5944.00 | 28135.0 | 12805.0 | 144665.0 | 2120.0 | 0.00 | 0/6 | 0.000% | 0 |
| 120d | stone_mining_sale | 6 | 3822.00 / 3822.00 / 3822.00…3822.00 | 3774.00 | 30646.0 | 17680.0 | 142154.0 | 1800.0 | 0.00 | 0/6 | 0.000% | 0 |
| 120d | iron_mining_sale | 6 | 8992.00 / 8992.00 / 8992.00…8992.00 | 8864.00 | 30646.0 | 17680.0 | 142154.0 | 1800.0 | 0.00 | 0/6 | 0.000% | 0 |
| 120d | combat_bare | 6 | 1046.00 / 1047.00 / 1032.00…1054.00 | 522.67 | 1417.8 | 735.0 | 171382.2 | 424.0 | 0.00 | 0/6 | 0.000% | 0 |
| 120d | combat_gear | 6 | 5741.83 / 5742.50 / 5728.00…5753.00 | 5353.83 | 20996.5 | 12005.0 | 151803.5 | 1426.0 | 0.00 | 0/6 | 0.000% | 0 |
| 120d | combat_gear_hire_once | 6 | 5675.83 / 5676.50 / 5662.00…5687.00 | 5287.83 | 21045.0 | 12035.0 | 151755.0 | 1426.0 | 16.00 | 0/6 | 0.000% | 0 |
| 360d | farming_sale | 6 | 57495.00 / 57495.00 / 57495.00…57495.00 | 43625.00 | 131825.0 | 55710.0 | 386575.0 | 6620.0 | 0.00 | 0/6 | 0.000% | 0 |
| 360d | woodcutting_sale | 6 | 16540.00 / 16540.00 / 16540.00…16540.00 | 16540.00 | 70780.0 | 35855.0 | 447620.0 | 4450.0 | 0.00 | 0/6 | 0.000% | 0 |
| 360d | stone_mining_sale | 6 | 10370.00 / 10370.00 / 10370.00…10370.00 | 10370.00 | 74510.0 | 45400.0 | 443890.0 | 3800.0 | 0.00 | 0/6 | 0.000% | 0 |
| 360d | iron_mining_sale | 6 | 25120.00 / 25120.00 / 25120.00…25120.00 | 25120.00 | 74510.0 | 45400.0 | 443890.0 | 3800.0 | 0.00 | 0/6 | 0.000% | 0 |
| 360d | combat_bare | 6 | 2634.67 / 2639.00 / 2612.00…2652.00 | 1311.33 | 3932.8 | 2030.0 | 514467.2 | 1064.0 | 0.00 | 0/6 | 0.000% | 0 |
| 360d | combat_gear | 6 | 7339.83 / 7346.50 / 7277.00…7369.00 | 6151.83 | 23416.5 | 13265.0 | 494983.5 | 2066.0 | 0.00 | 0/6 | 0.000% | 0 |
| 360d | combat_gear_hire_once | 6 | 7273.83 / 7280.50 / 7211.00…7303.00 | 6085.83 | 23465.0 | 13295.0 | 494935.0 | 2066.0 | 16.00 | 0/6 | 0.000% | 0 |

## 裝備與傭兵交易實測

- sword：實際購買 24 次，金額 70 gold；交易每次 5 game minutes；stamina delta 依逐筆 raw transaction。
- armor：實際購買 24 次，金額 55 gold；交易每次 5 game minutes；stamina delta 依逐筆 raw transaction。
- Hire action：24 筆；個人 hire fee mean 25.00 gold；實際 term mean 3295.0 minutes；整 run dailyTick 實際薪資支出 mean 16.00 gold。

## Fighter + healer 合約窗配對試驗

- 每個 seed 先以合法鐵礦工作自然解鎖村莊、籌到裝備與 hire 費，再在酒館同一存檔分成 no-hire / hire-duo 兩個 save/reload 副本；control 花同樣 20 分鐘等待，雙方從同一 worldTime 開始戰鬥並跑到引擎的 `contractEnd` 邊界。這是正常可到達存檔分支，不是資源注入 fixture。
- 見 `paired-contract-trials.csv`；逐 seed 保留兩邊現金、淨值、招募費、薪資、戰鬥數、勝場、撤退、死亡及精確 term。
- 引擎只在 dailyTick 收薪，且先檢查 `contractEnd <= worldTime` 再收薪；因此在傍晚聘用的合約到第三個午夜時先到期。候選平衡/規則問題：名義 3 日契約可能低於72小時，且實際只觸發兩次日薪；所有實際分鐘、薪次與金額在 [raw-runs.json.gz](raw-runs.json.gz) 解壓後可核對，沒有更改規則。

## 初步觀察與候選平衡問題

- 此報告只描述此策略集、這些 seed 與固定 duration，不推論全部玩家；所有 30/120/360 日結果按 run 標記，拒絕控制與任何 stress fixture 不納入一般玩家發生率。
- 鐵礦的直接工作報酬是每次4 gold，並可依配置的賣價將取得鐵礦變現；CSV 的 realized cash、未售庫存淨值與往返交易時間分開保存，可比較淨收益而不是只比資源數。
- 戰鬥收入須扣裝備折價、雇用費、逐日薪資與藥水耗用；死亡率是每個 seed horizon 的實際死亡樣本率，不用無死亡的短 run 推估風險為零。
- 候選核對：3 日契約目前以日界計算終止，實際 term 依雇用時刻浮動，dailyTick 到期先移除再扣薪；由 paired trial 提供量化證據，交產品 Owner 判斷是否符合預期。
- 本次沒有調整任何遊戲平衡。

## 驗證與重現

- Engine loader：Node v24.19.0、Vite 7.3.6；Vite SSR 固定 root `/tmp/plw-rpg-qa-source-738bc00`。
- 重現 full matrix：`node reports/playtests/20261004-deep-qa/balance/runner.mjs --seeds=101,202,303,404,505,606 --days=30,120,360`。
- smoke matrix：`node reports/playtests/20261004-deep-qa/balance/runner.mjs --smoke`。
- 每個 policy × horizon checkpoint 自動呼叫 `python3 -B scripts/recorded_reports.py publish ...`；每次發布先 fsync 追加 `playlog.jsonl`。
- 所有 run 在初始化、gear 購買/equip、每次 hire 與結束後執行 `serialize`/`deserialize` state equality 驗證。
- Harness guard：每 run 最多 50000 public action calls、30000 policy loops、遭遇 turn 最多 50，同一 action 連續 3 次 refusal 即終止；所有 state numeric 欄位每動作後套 finite guard。

## 限制

- pure engine/headless 模擬不是 UI/瀏覽器測試；不涵蓋真實操作錯誤、視覺資訊、回應延遲或存檔媒介故障。
- 連續採礦／播種策略是明確程式化代表策略，不是玩家行為分布或最優解；交易往返已計入每批操作，最後殘留庫存以引擎 sell price 計淨值。
- 30 日時 tavern/blacksmith 常仍未解鎖；相關政策尊重自然鎖定並記錄未購買/未聘用，不設置聚落 stage、gold、skills 或 inventory。
- hire-once policy 只有第一次契約、到期不續聘；paired試驗則專門量出該份合約效益。
- setup skill 指示的環境安裝／啟動與本 QA 純引擎路線分屬 root workflow；本 worker 沒更動依賴或環境配置。

## 實際記錄完整性覆核

- 主矩陣 JSON／CSV 有 126 筆唯一案例，所有 21 個策略／horizon 組合各有 6 seeds；CSV 全欄位與 JSON 一致。126/126 均精確到達 30、120 或 360 日目標，沒有提前終止；主矩陣 324 次 save/reload hash roundtrip 全通過。
- 每筆現金 change 均等於 raw money flow 明細，`cash.reconciliationDifference` 全部為 0，沒有未分類現金流。配對兩分支的 12 筆現金 residual 也全為 0。
- 六個配對案例均為 3,300 分鐘（55 小時），control 與 hire-duo 都精確結束於同一到期邊界。每 seed 兩邊各勝 10 場；hire-duo 每 seed 淨值少 66 gold。兩份契約預期各觸發兩次日薪，實際合計四次 tick、16 gold。六組配對另有 72 次 save/reload hash roundtrip，全數通過。
- `paired-contract-trials.csv` 原有 `actualWageTicksEstimated` 欄位因 runner 匯出讀取錯誤屬性而六列空白；raw JSON 的 `estimatedWageTicksActuallyPaid` 都是 4。現行 CSV 投影已由修正後的 `makeContractCsv` 從 raw trials 重產，先前空白版本仍保留在 `playlog.jsonl`。runner 修正與逐 byte exporter 驗證詳見 [README.md](README.md)；raw metadata 的 runner hash 保留執行當時版本。
- 固定 snapshot、baseline manifest、目前 worktree 與 raw metadata 的八個引擎檔 hash 完全相符。Raw archive 是 [raw-runs.json.gz](raw-runs.json.gz)；壓縮封存可逐 byte還原為本機 `raw-runs.json` projection，兩者 SHA-256 與 bytes 見 [archive-storage.json](archive-storage.json)。
- 交接註明前一個 worker 在 usage limit 下中斷收尾。Raw 記錄本身有 22/22 checkpoints，最後為 `paired_contract_trials`，無 `fatal_error` checkpoint；本次直接核對完整資料，未重跑矩陣。

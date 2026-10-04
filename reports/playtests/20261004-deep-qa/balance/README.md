# QA-02 經濟、裝備與傭兵平衡檢查

本資料夾保存固定引擎版本下的經濟與戰鬥策略比較。模擬已完成，沒有修改遊戲平衡規則。

- 引擎來源 commit：`738bc0010c549fa3fb2420437d171f5aa2a043a0`；固定載入 `/tmp/plw-rpg-qa-source-738bc00`。
- 執行時間：2026-10-04 02:58:04–03:01:19 UTC；Node v24.19.0、Vite 7.3.6。
- 覆蓋：6 seeds × 7 策略 × 30／120／360 日，共 126 個主案例；另有 6 個同存檔分支的雇傭配對案例。
- 可讀的逐案例結果見 [results.md](results.md)；主矩陣 CSV 為 [raw-runs.csv](raw-runs.csv)，雇傭配對 CSV 為 [paired-contract-trials.csv](paired-contract-trials.csv)。完整 JSON 使用 [raw-runs.json.gz](raw-runs.json.gz)，hash 與還原指令記在 [archive-storage.json](archive-storage.json)。

## 比較基準與方法

每個主案例都從 `createGame(seed)` 的相同起始狀態開始：45 gold、初始淨值 80 gold、worldTime 480。每個政策都使用同一組六個 seed，固定跑至 30、120 或 360 遊戲日；起始淨值以現金加上初始背包按引擎售價估值，終值用同一口徑計算。政策建備裝或聘人所需的採集、旅行、交易、裝備與雇用成本全部計入，沒有直接設定聚落階段、金幣、技能或背包。

每個政策以公開引擎動作執行。案例都到達預定 worldTime；動作不足的尾段以自然 `simulate` 補足。各政策動作數與 active time 不強行配平，報告同時列出淨值、現金、移動、等待、體力與戰鬥數，便於判斷收益是用多少遊戲時間換得。

六個雇傭配對案例先以正常採礦與交易解鎖村莊、取得劍甲及雇傭金，再從同一份序列化存檔分成 no-hire 與 hire-duo。兩個分支起始 worldTime 相同，control 以 20 分鐘等待配平兩次 hire action 的時間，並在同一合約到期時間結束。這項比較隔離了同一合法狀態下雇用 healer 與 fighter 的短期支出和戰鬥效果。

## 主矩陣淨值變化

以下為每格六個 seed 的平均淨值變化（gold；終值減起值）。完整的現金與時間指標、中央値、範圍、拒絕率及逐案例記錄見 [results.md](results.md)。

| 遊戲時長 | farming_sale | iron_mining_sale | combat_bare | combat_gear | combat_gear_hire_once |
|---:|---:|---:|---:|---:|---:|
| 30 日 | 2,410.00 | 2,832.00 | 347.33 | 2,832.00 | 2,832.00 |
| 120 日 | 13,000.00 | 8,992.00 | 1,046.00 | 5,741.83 | 5,675.83 |
| 360 日 | 57,495.00 | 25,120.00 | 2,634.67 | 7,339.83 | 7,273.83 |

在這組固定策略下，30 日鐵礦路線淨值最高；120 與 360 日農作路線最高。帶裝備的戰鬥路線高於未帶裝備的戰鬥路線，但建裝採礦的成本與時間也計在結果中。主矩陣中 `combat_gear_hire_once` 在 30 日尚未自然解鎖酒館，因此與 `combat_gear` 相同；120／360 日一次聘用的淨值平均各少 66 gold。

## 雇傭配對觀察

六個 seed 的結果一致：雙方各打 10 場且各勝 10 場；hire-duo 的淨值變化每 seed 都比 control 少 66 gold。

| 指標 | Control | Hire duo |
|---|---:|---:|
| 淨值變化平均 | 204.17 | 138.17 |
| 實際淨值變化範圍 | 193–210 | 127–144 |
| 每 seed 勝場 | 10／10 | 10／10 |
| 每 seed 對 control 的淨值差 | — | -66 |

配對中每位傭兵雇用費 25 gold，兩人合計 50 gold；兩人日薪各 4 gold，實際共扣 16 gold、對應四次日薪 tick（每份契約兩次）。契約名義 3 日，但都在遊戲日 17:00 聘用並於第三個午夜邊界到期，實際 3,300 分鐘／55 小時。相同勝場下，費用與薪資合計正好解釋 -66 gold。這是供產品 Owner 判斷契約語義與短期平衡的候選觀察；本報告不替產品決定它是缺陷，也沒有調整規則。

## 完整性與驗證

- Raw metadata 的八個引擎契約檔 hash 同時符合 baseline manifest、固定 snapshot 與目前 worktree。Raw metadata 的 runnerSha256 是原始執行版本的歷史 hash `1e83b1ebd025d33278bda5c1a36d4e410a039aba441c0017326115bc0f94009d`；目前 runner 已在該次執行後修正，現行 hash 見下節。
- 主 JSON 與 CSV 為 126／126 唯一案例，所有欄位投影一致。21 個策略／時長組合各有 6 seeds，raw JSON 保存 22 個 checkpoint，最後一個為 `paired_contract_trials`。
- 126 個主案例全部精確走完預定遊戲日，沒有 run termination；現金差額、逐項 money flow 與 `cash.reconciliationDifference` 逐筆相符，126 個 residual 均為 0，沒有未分類現金流。
- 主矩陣 324 次序列化／反序列化 state hash roundtrip 全通過；6 組配對另有 72 次 roundtrip 全通過。這些檢查使用引擎 save service，不等同真瀏覽器 localStorage 或 IndexedDB 測試。
- 8 個獨立拒絕控制全部被拒絕且狀態未變；拒絕控制不納入正常策略的拒絕率。
- gzip 封存使用 `gzip -n`（mtime=0），解壓後 211,517,799 bytes 的 SHA-256 與保留的 raw JSON projection 完全相同；可重現命令與兩個檔案的 hash 見 [archive-storage.json](archive-storage.json)。

## 限制與未解事項

這是純引擎 headless 模擬，不驗證 UI 操作、瀏覽器儲存媒介、延遲或玩家操作失誤。七個程式化政策和六個 seed 不是玩家行為分布或最優解；0／126 死亡只代表本樣本沒有死亡，不代表一般死亡風險為零。30 日樣本尊重酒館與鐵匠鋪自然鎖定，因此相關政策不會強行聘人或買裝。雇傭主路線只聘一次、不續約；獨立配對只觀察一次合約窗。

交接紀錄指出，前一個 QA worker 的使用額度在包裝與收尾前中斷；可用的 raw 記錄仍有完整 22／22 checkpoint 與全部案例，最後 checkpoint 完成配對試驗，沒有 `fatal_error` checkpoint，所以沒有重跑矩陣。完整性檢查發現 `paired-contract-trials.csv` 的 `actualWageTicksEstimated` 欄原先空白，原因是 exporter 讀取了不存在的屬性；raw JSON 的 `estimatedWageTicksActuallyPaid` 為 4。已修正 exporter 並從六筆既有 raw trial 重新產生 CSV，舊 CSV 版本仍保留在 `playlog.jsonl`。


## Matrix 後的 CSV exporter 修正

`makeContractCsv` 現在從 `t.estimatedWageTicksActuallyPaid` 產生既有欄位 `actualWageTicksEstimated`。輸出值 4 是兩份契約的總 wage tick 數估計；raw 中 `expectedWageTicksPerContract` 為 `[2, 2]`，即每份契約各兩次，共四次。此次只修正已完成矩陣後的 CSV exporter，沒有重跑矩陣。

- 修正前 runner SHA-256：`1e83b1ebd025d33278bda5c1a36d4e410a039aba441c0017326115bc0f94009d`。
- 修正後 runner SHA-256：`cd0dfe63e83e2bd71d527cc36193fdbebeb1582c8b2a0ce67c3d9e7e560bbb26`。
- 驗證方式：從現行 `runner.mjs` 隔離執行原本的 `csvCell` 與 `makeContractCsv`，輸入 raw JSON 已保存的六份 paired trials；未啟動 Vite 或正常矩陣。產生的 CSV 與目前 `paired-contract-trials.csv` 逐 byte 相同，六列 `actualWageTicksEstimated` 全為 4。
- Raw JSON 及 gzip archive 沒有改寫。Raw JSON `meta.runnerSha256` 保留原始執行 hash `1e83b1ebd025d33278bda5c1a36d4e410a039aba441c0017326115bc0f94009d`，不代表後續修正後的 runner。

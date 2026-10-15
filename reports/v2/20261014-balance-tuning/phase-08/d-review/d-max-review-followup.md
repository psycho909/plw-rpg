# Phase8-D Max follow-up review

## 結論

原審查五項 findings 均已 **RESOLVED**。D2 的 runner-only 變體、資料來源與分母核算符合報告描述；未發現 `src/` 修改。新增一項 **P2 報告證據過度推論**：Owner 決策稱單一參數沒有中間平衡點，但 K1 在 No Intervention 與 Life 下呈現明確中間結果；且 G1 Adventure 的零危機 run 已被 validity gate 標為 INVALID。建議保留 Owner「KEEP V0」的產品選擇，收斂其證據敘述後再視為本次審查完全接受。

## 原審查 findings

1. **P1 危機數與 delta 的分母／期間標示 — RESOLVED。** `world-crisis-balance.md:9-16,38-52,101` 已分開標示三 seed 合計、平均每 seed-century 與平均每 seed-year。D2 表列的每 seed-century 為三 seed 總數除以 3，每 seed-year 為除以 300；危機 outcome delta 同樣用三 seed 合計及每 seed-century／year 表示，未再混用百年與年度單位。

2. **P2 每日預算漏計 action 內部 `simulate()` — RESOLVED。** 修正後 D1 runner 同時觀察外層與 action 內部推進的 tracked state；D1 corrected attempts `d-runner/d1-budget-corrected/attempt-20261015T023220480Z` 與 `attempt-20261015T023346153Z` 的 18 個 daily-balance rows 均滿足 `simulatedMinutes == elapsedMinutes`、elapsed 等於世界時間差、36,000 daily ticks／seed。三 seed 共 108,000 ticks。逐日 crisis outcome delta 與同一 attempt 的原始 `crises.json` resolution delta 相符，沒有差異。

   D2 `d-runner/d2-controlled/comparison-summary.json` 的 12 個精確 attempts 也都滿足 `accountingValid=true`、`simulatedMinutes == elapsedMinutes`，每個政策變體共 108,000 ticks；runner 累計 delta 與原始 `crises.json` 加總一致。G1 Adventure 的帳務閉合，但 0 crisis／0 phase transition，因此依 gate 標為 INVALID；它只能作為該次零事件的觀察值，不能當作有效的危機相位比較。

3. **P2 VALID gate 漏掉 continuation parity — RESOLVED。** `scripts/phase8/world-crisis-core.mjs:36` 現在會在任何 checkpoint `continuationEqual !== true` 時回傳 INVALID；`test_world_crisis_core.mjs:32-38` 對 false continuation 有拒絕案例。D1 summary 記錄 save/reload 與續跑 parity 54/54，D2 報告記錄 108/108。此環境直接執行 `node --test scripts/phase8/test_world_crisis_core.mjs` 時，在 Node test worker 啟動階段遭遇 `spawn EPERM`，未進入 assertions；因此本次不能獨立重跑該測試。程式與 fixture 證據支持修正已到位，測試通過紀錄來自 D1/D2 runner 報告。

4. **P3 No Intervention guard 平均與 raw 不一致 — RESOLVED。** 修正後三個 raw reductions 為 10,821.440、10,801.805、10,797.115，平均 10,806.7867；報告的三 seed 合計 −32,420.36 及每 seed-century −10,806.79 相符。

5. **P3 偶數樣本 median 取上中位數 — RESOLVED。** `world-crisis-core.mjs` 對偶數樣本取兩個中間值平均；對應測試以 `[30, 50]` 驗證中位數為 40。

## D2 controlled comparison 核對

- **Override 範圍 — 通過。** `run-world-crisis.mjs:57-75` 透過 Vite pre-transform 在載入中的 `simulation.ts` 只替換守衛係數；轉換前先確認公式及函式簽章恰好各一處。`run-world-crisis.mjs:269` 對新建 state 的 `state.threat.growthRate` 做記憶體覆寫。D2 manifests 記錄 `overrideScope` 為 in-memory only；attempt 的 HEAD 與來源 fingerprint 指向本次檢查的 engine 版本，工作樹 `git status` 沒有 `src/` 變更。

- **候選值來源 — 可追溯，惟應維持探索性解讀。** G1 `.299319489084277` 及 K1 guard `.0760057424580011` 來自舊 D1 帳務下觀察到的資料；G2 `.474659744542139` 是 V0 `.65` 與 G1 的中點。報告已揭露舊平均及其與修正後平均的差異，並另列以修正後平均重新推導、但尚未執行的替代值。故 D2 可用來比較這些明確候選；不應把 G1/K1 描述成由修正後帳務重新估算的精確值，也不應把未跑的替代值當成結果。此限制已有揭露，未另列 finding。

- **分母與指標 — 通過。** `analyze-threat-comparison.mjs:58-76` 以三 seed crisis count 為總數；平均每 seed-century 為總數除以 3，每 seed-year 除以 300。Threat band、Safety floor 比例以 108,000 daily ticks 為分母，checkpoint 指標取三 seed 平均。抽查 comparison summary 與表格數值一致。

## 新 finding

### P2 — Owner 決策把「受測值不足」寫成「不存在中間平衡點」

位置：`world-crisis-balance.md:151-153,201-212`。

K1 是單一 guard 係數變體，No Intervention 與 Life 的 Threat3 比例分別為 23.60% 與 18.85%，Year100 怪物平均為 31.52 與 23.18，危機數為 119 與 91（每 seed-century 39.7 與 30.3）。這些數據是介於 V0 飽和與 G1 低危機結果之間的觀察，與「單一參數只會在封頂與歸零間切換、沒有中間平衡點」的絕對敘述衝突。K1 Adventure 雖只有 22 場危機且缺 local defeat，也不會消除前兩個政策已呈現中間結果的事實。

此外，G1 Adventure 0 場危機的 run 明確因 `no-crisis-phase-evidence` 被標 INVALID；可保留為未觀察到危機的資料點，但不應把它當成已驗證的穩態或平衡結果。D2 只測了有限的三個候選與三種政策，不能據此推論不存在中間點。

**建議處理：** 保留 Owner 的 KEEP V0 決定；將理由改為「本輪有限候選中，沒有一個已證明符合三種政策的行為期待；G1 Adventure 為 INVALID 的零事件觀察，K1 在 Adventure 仍稀少且缺 local defeat；目前沒有核准的目標區間，因此本 phase 不改值」。若要主張不存在中間點，需另有覆蓋更完整候選範圍及目標門檻的證據。

## 最終 disposition

原五項 findings：**5/5 RESOLVED**。帳務閉合、108,000 ticks、危機 delta 對帳、override 範圍、來源完整性及 denominators 均通過抽查。D2 受測結果可作有限候選比較；唯一新 finding 是 Owner 決策敘述超出資料支持範圍。**暫不判定整份 Phase8-D review 完全接受；修正該敘述後可接受。** 本 follow-up 僅新增審查文件，未修改 `src/`，未 commit/push。
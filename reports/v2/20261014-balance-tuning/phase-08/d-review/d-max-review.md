# Phase8-D1 r2 Max 深度審查

## 結論

**需修正後重審。** D1 對來源程式、公開 API 路徑、繼承資格與受控 fixture 的說明大致正確；但危機頻率／人口變化的時間分母有高影響錯誤，逐日預算也沒有涵蓋行動內部的模擬時間。這使 P8-F05 對「危機過頻」及減壓效果的定量判斷目前不足以採納。

## 範圍與快照

- Ticket：`tickets/20261014-v2x-08d-world-crisis.md`；審查 D1 r2 的 `reports/v2/20261014-balance-tuning/phase-08/world-crisis-balance.md`、`d-runner/d1-summary.md`、D1 scripts 與其引用 attempts。依 `.scratch/20261014-phase8/review-d-max.md`，不審 D2 結果。
- 審查基準與 HEAD：`c489ff18ac656d3c483a5b9d1b59e3d61257270b`。D1 報告當時未追蹤，SHA-256 `823C2C0293C4DBB753C28C86E71D1CF7290C7A019F8DD4CD0FB61697DA54C19C`；相關 D1 scripts／attempts 亦為未追蹤交付。
- 已檢查 `git diff --cached -- <D1 paths>`、`git diff -- <D1 paths>`、`git ls-files --others --exclude-standard` 的 D1 路徑，以及 `git diff c489ff18...HEAD -- <D1 paths>`。HEAD 等於基準，tracked diff 為空；這次審查以工作樹中的未追蹤檔案及 raw attempts 為準。
- 六個主要 attempt manifest 的 engine HEAD 是 `5e223beb2ef056968861bc4c7125c1fb41da8728`，早於目前 HEAD；manifest 的 `srcFingerprint` 為 `6ab18dfe0259d99d4d74802c612b32268930926676e5d0312ae37513cda3f95d`，與目前 113 個 `src/` 檔案重算結果相同，且 `git diff 5e223beb...c489ff18 -- src` 為空。因此本審查確認 attempts 使用相同 engine source，但 runner／分析檔仍以工作樹內容審查。
- `.scratch/20261014-phase8/review-d-max.md` 指定的 D2 受控 attempt 已出現：`reports/v2/20261014-balance-tuning/phase-08/d-runner/d2-controlled/attempt-20261015T020119827Z/manifest.json`；D1 報告亦已含 D2 提案再決策段。兩者只記錄其存在，沒有把 D2 資料納入 D1 判斷。
- Reviewer：受指派的 g6-luna-max-core-engineer；未參與 D1 施工。角色名稱不作為實際模型 runtime 的證明。Standards 與 Spec 面向另經分開檢視。

## Standards 結果

- **大致符合：** D1 未修改 `src/`；runner 使用正式 `simulate()`、`farm()`、`tradeMaterial()`、`encounter()`、`combatTurn()`、`contributeCrisisFood()` 與 `chooseSuccessor()`。直接寫入 settlement 初始狀態僅出現在 `prosperous-controlled`／`struggling-controlled` fixture，並在報告標成 controlled。未見第二套世界模擬。
- **繼承合法性正確：** runner 按 `state.npcs` 順序選第一位存活且年滿 15 歲的 NPC，再呼叫公開 `chooseSuccessor()`；與 `src/App.vue` 清單條件和順序相符。死亡與接班紀錄可追溯。
- **Raw 抽查：** 六個 100 年主 attempts 均有 9 個 checkpoint；原始 checkpoints 的 save/reload 與 continuation 欄位皆為 true，所有記錄危機均有 outcome。作物銷售 raw rows 支持每 seed 45→1,241 gold；contribution probe 的 Readiness 數值亦與報告吻合。action-count 只當代理成本、不是金錢等價的限制有明示。
- **驗證證據：** D1 summary 記載 `node --test scripts/phase8/test_world_crisis_core.mjs` 2/2 PASS；本次未重跑測試或 100 年 attempts，採文件、程式及 raw artifact 檢查。此測試結果是 D1 summary 所報，非本次獨立執行。

## Spec 結果與 Findings

### P1 — 危機頻率與危機減壓數值的分母錯置

位置：`world-crisis-balance.md:9–16, 38–48, 52, 101`。

六個 100 年 summary 的 crisis counts（200–203）是三個 seeds 的合計，不是單一「世界世紀」的數量。例：No Intervention raw `summary.json` 記載 201 場，三個 seed 各 100 年，故平均是 **67 場／單 seed 百年**；六情境均約 66.7–67.7 場／單 seed 百年。報告第 52 行與 D2 提案第 101 行寫「每百年約 200–203 場」，會把危機過頻高估約三倍，且第 101 行據此支持維持現有頻率公式。

同段人口變化也把年均值誤標為百年值。No Intervention／Adventure／Mixed 的 raw `crises.json` 事件 delta 合計分別是 −957.45／−845.705／−715.295；除以三個 seed 後，每單 seed 百年約為 **−319.15／−281.90／−238.43 點**。第 48 行的 −2.4 至 −3.2 是把這些百年值再除以 100 後的年均量，不是每百年變化。第 40–44 行與第 48 行因此差約 100 倍。

**影響：** P8-F05 的危機頻率、危機減壓對比與 D2「保持公式」論據不能按目前文字解讀。

**解除條件：** 以明確標籤分開三 seed 合計、單 seed 百年平均與每年值；重算第 40–52、93、101 行相關表述及結論。若只修正報告與分析呈現，可由 raw attempts 重算，不必重跑未變更的 engine。

### P2 — 世界逐日預算漏計行動內部的模擬時間

位置：`scripts/phase8/run-world-crisis.mjs:226–234, 279–302`；`src/engine/actions.ts:25–32`。

runner 僅在外層 `simulate(state, D)` 前後累加 `days`、成長、守衛與危機變化；之後的 Life／Adventure policy actions 會呼叫公開動作，而 `actions.ts` 的 `cost()` 會再呼叫 `simulate(state, minutes)`。這些動作時間仍推進 canonical world state，卻沒有完整進入 `currentBalance`。因此該預算不能直接代表 36,000 個世界日的全部逐日變化。

Raw 數據可見同一問題：100 年 Adventure 每 seed 的 `daily-balance.days` 為 35,987、`growthAdded` 為 23,391.55；若列為 36,000 日百年，固定 +0.65/day 應是 +23,400。Mixed 為 35,902–35,903 日、+23,336.30–23,336.95。另 Mixed seed 40133 的 `daily-balance.crisisOutcomeDelta` 為 −164.995，但同 seed `crises.json` 的 applied delta 合計為 −160.995，相差 4 點。這表示事件預算至少有一處不能與原始事件記錄對帳。

**影響：** 第 36–48 行把 +0.65、守衛抵銷、危機與擊殺放進同一個百年預算；在目前 runner 計法下，這些項目可能漏算或不一致，精確減壓餘額與每日敘述不應當成完整帳本。Threat 3／population 接近上限的 checkpoint 觀察本身仍有效。

**解除條件：** 讓 balance instrumentation 覆蓋每一個實際時間前進與 canonical daily boundary，並將 crisis delta 按 raw crisis records 對帳；更新表格及由此支持的數值結論。至少須使每個 attempt 的時間與事件總額可重現地閉合。

### P2 — VALID gate 沒有驗證續跑一致性

位置：`scripts/phase8/world-crisis-core.mjs:23–34`；`scripts/phase8/test_world_crisis_core.mjs:19–29`。

`run-world-crisis.mjs` 記錄 `continuationEqual`，且目前 raw checkpoints 的 54/54 都為 true；但 `validateWorldRun()` 只拒絕 `saveReloadEqual !== true`，不檢查 continuation。單元測試亦沒有建立 `continuationEqual:false` 的 checkpoint。若未來續跑不一致，現行 gate 仍可能輸出 VALID。

**解除條件：** 將續跑一致性納入 validity gate，並加入 false 值會使結果 INVALID 的測試；重跑單元測試。這是 gate 缺口，不代表目前 54 個 raw checkpoint 失敗。

### P3 — No Intervention 守衛抵銷值與 raw 平均不符

位置：`world-crisis-balance.md:40–44`。

No Intervention 表列約 −10,809／世界世紀；三筆 raw `daily-balance.json` 守衛抵銷為 10,798.48、10,774.925、10,771.04，平均 **10,781.48**。雖差約 27.5 點（約 0.25%），仍不是這三筆 attempt 的平均值。請與 P1/P2 修表時一併重算，避免沿用近似或不同版本數字。

### P3 — 區間中位數對偶數樣本回傳上中位數

位置：`scripts/phase8/world-crisis-core.mjs:15–18`；`scripts/phase8/test_world_crisis_core.mjs:5–15`。

`sorted[Math.floor(n/2)]` 對偶數樣本取上中位數；測試兩個 interval `[30, 50]` 卻預期 50，標準中位數應為 40。D1 報告目前未引用此欄位，所以不影響上述結論，但 `summary.json` 的 `intervalDays.median` 對偶數樣本會偏高。建議修正偶數樣本算法與測試。

## 其餘 Spec 覆蓋與處置

- No Intervention、Life、Adventure、Mixed 與兩個 controlled 起始世界分開執行及標示；正常路線與 controlled fixture 沒有混成同一組結果。
- Director／Crisis 的 +0.65/day、守衛 ×0.035、危機 outcome bounded delta 來源讀取正確；主要問題在 runner 的完整時間帳及報告單位，而非這些公式的引用。
- 人口、Food 與 Prosperity 未崩潰的結論以「目前證據不支持」表述，措辭合適。報告亦承認 Threat 3／長期恢復未被扭轉，沒有把 checkpoint 當作低威脅恢復證據。
- controlled contribution 比較明示 action-count proxy；raw 值與報告相符。不過此代理只能支持同樣動作次數下的輸出差異，不能單獨證明不同貢獻在金錢／時間成本下沒有低成本支配者。報告現有 caveat 保留了這項限制。
- D1 summary 的主測試與 attempts 完成狀態可讀；錯誤的 per-century 危機敘述及不完整預算令目前報告尚不符合可採納條件。沒有檢查或宣告 D2 controlled comparison 的有效性。

## 最終處置

**D1 r2：需修正後重審（P1、兩項 P2）。** 先修正危機頻率／人口變化分母，補全或對帳逐日預算，並讓 VALID gate 覆蓋已記錄的 continuation invariant；更新報告和受影響測試後再做一次 scoped review。P3 數值與中位數問題可在同一輪低成本修正。未修改 engine source，未 commit／push。

# Phase10-E Review Follow-up

## Follow-up 對象與驗證

依前次 `e-review.md` 的三項 P2 與一項 P3，檢查更新後的 E 摘要、phase-10 正式報告、build correlation note，以及 `attempt-20261016T062357703Z-input-latency/closeout.json`、`runtime-closeout.json` 和 SHA manifest。未重跑瀏覽器或測試；數值取自保存的 run output。工作樹 HEAD 為 `29e7c4b9328c8ea7d58a71a4163a8d93643ea0db`，E source 工作樹乾淨。

## Findings

1. **P2 — 報告路徑：RESOLVED。**正式報告現位於 `reports/v2/20261016-final-qa-rc/phase-10/browser-regression.md` 與 `browser-stress-performance.md`，兩個要求路徑皆存在；`e-runner/` 保留原始執行證據。摘要中的相對連結亦指向根目錄報告。

2. **P2 — dist 指紋結論：RESOLVED。**E 摘要及兩份正式報告均已同步說明：runner 的 repo-relative hash `72dfd027…` 與 Phase10-A 的 dist-relative hash `7f5efed2…` 對應相同 dist 檔案內容，只是 hash 路徑慣例不同。`build-correlation-23ef273.txt` 保留兩種計算方式及對應值。報告已移除先前「無法視為指定 build 驗收」的相反結論。

3. **P2 — §9.3 輸入延遲：RESOLVED。**新的受控 search-latency run 有 manifest、closeout、原始 action trace、hash/round-trip 與 profile closeout。Closeout 記錄裝備搜尋 60 samples（P50／P95／max：5.3192／8.4854／9.1536 ms）、配方搜尋 60 samples（5.6432／9.9677／12.4491 ms），兩組 timeout 均為 0。另有 120 次可見選單開啟測試（39／46／85 ms；120 次 hit-test 與開啟成功，超過 200 ms 的樣本為 0）。量測以 CDP key event 到 DOM input 與可見結果更新為界，且報告明示 4 ms polling 與 controlled starting save 限制；此補足 §9.3 的 Input Latency 證據，不應當成自然進度或 20 分鐘逐鍵分布。

4. **P3 — 單次 2,004 ms 選單延遲：NOT RESOLVED（非阻擋）。**原 20 分鐘 run 的單點仍是有效歷史觀測，且沒有可確定根因的 frame／長工作追蹤。新 120 次重測最大 85 ms，支持該尖峰未重現，但不能解釋原事件。摘要仍如實保留 P3 outlier。依 §9.3，現有證據沒有 persistence、renderer lifecycle 或 memory risk，故不需 extended soak；後續若再出現，依當時證據做針對性診斷。

## 工件與整體處置

E 摘要記錄 bundle 為 4,623,121 bytes；依兩份正式報告及 `e-runner/` 現存檔案加總相符。短測 Chrome profile closeout 記錄清理前 57,595,242 bytes、`chromeProfileRemoved: true`；先前 regression/stress 清理證據也仍在。沒有 E 的產品 `src/` 變更。

**Disposition: PASS WITH FINDINGS。**前次三項 P2 均已解除。保留一項已揭露、未找出根因且短測未重現的 P3 歷史 latency outlier；它不阻擋 E 接受，也沒有證據要求 extended soak。跨瀏覽器／實體裝置仍是原報告所列的 **NOT TESTED**。

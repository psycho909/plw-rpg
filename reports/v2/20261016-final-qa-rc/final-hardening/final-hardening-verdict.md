# Final Data Integrity Hardening — Verdict

- 日期：2026-10-16。Ticket：[20261016-v2x-final-data-integrity](../../../../tickets/20261016-v2x-final-data-integrity.md)。
- 報告：
  - [B1 設計](b1-retention-design-review.md)
  - [S-02 設計](s02-equipment-lifecycle-review.md)
  - [Targeted Regression](targeted-regression.md)

## 判定

| 項目 | 判定 |
|---|---|
| **B1 — Legacy Journal Data Preservation** | **VERIFIED_FIXED** |
| **S-02 — Defender Equipment Lifecycle** | **OWNER DECISION REQUIRED** |

## 問題回答

1. **B1 是否真正解決了詳細歷史的保留問題？**
   - 是，在 archive 可用時。超大的舊 pending 會在任何 checkpoint 寫入前，原 id、原內容完整歸檔。瀏覽器驗證：5.16M 字元單筆、3,000 筆多世界，都完整歸檔。
   - archive 在載入期間持續不可用（約 18 秒的重試上限後）時，沿用已核准的 P2-01／O-01 壓縮政策，用 summary／gap marker 記錄可追溯的缺口。這是唯一無法完整保留的情境：完整副本只存在 localStorage 的舊 checkpoint 裡，要繼續遊戲就必須覆寫它。
2. **pending 上限是否嚴格維持？**
   - 是。所有 checkpoint 寫入仍經過 `save()` 內的 `compactPending()`，轉移期間不寫入任何 checkpoint。
   - 先前被拒絕的 proposal 會讓 checkpoint 超過上限，這次的設計不會。獨立 reviewer 已確認。
3. **S-02 是否解決了失效分配額占用的問題？**
   - 沒有改產品。測試證實，ledger 未滿 16 筆時，Owner 規則**已經成立**：效果停止、補位者能接受新裝備、不退還、不轉交、不重複獎勵、歷史保留。
   - 只有嚴重度 3、ledger 已滿 16 筆的情況下無法補位。要解決這個情況必須修改 save 驗證上限（建議方案 S2-A：有效 16 筆、歷史 32 筆），並定義什麼算「永久失格」，所以依授權停止。
4. **是否影響 Save Schema？**
   - B1：不影響。schema、journal 格式都不變，舊存檔可以讀。
   - S-02：目前沒有修改。S2-A 會改驗證上限，需要 Owner 授權，而且會造成無法降版。
5. **是否出現新的 Release Blocker？** 沒有。
6. **原本的 Engineering RC 是否仍然有效？**
   - RC 的結論對**舊快照**（`b1a1ff20`／dist `a018b478`）仍然有效。
   - 新 Source（B1）已在新 dist（`977d9883`／`600255a7`）上重新驗證：
     - 完整檢查：738 個測試全過。
     - O-01 瀏覽器：29/29。
     - Phase10-E production smoke：與 RC 完全一致。
     - 獨立審查：APPROVE。
   - 所以在新 commit 上，**ENGINEERING RC READY WITH FINDINGS 的結論仍然成立**。

## 剩餘風險

- B1：archive 在載入期間持續故障時，舊的詳細紀錄會被壓縮成 marker。逾時後才完成的歸檔，會在 archive 裡同時留下原始紀錄和涵蓋它的 marker。
- B1：只在載入超過上限的舊 pending 時，writer 就緒最多延後約 18 秒，期間顯示既有的「確認中」狀態。
- S-02：ledger 已滿的情境，以及轉職、退休的規則，等 Owner 決定。
- 沿用：B2 archive 總量沒有上限、S-03 實機未測、Safari／Firefox／實機未測、SEC-01..03、S-01 KEEP、Threat V0、Farming V4、Merchant NOT MODELED、Human Product DEFERRED。

## Owner 需要決定的事

S-02：是否授權方案 S2-A（ledger 歷史上限 16 → 32、有效上限 16；接受無法降版），以及「永久失格」的定義（死亡、接班、退休、轉職各自算不算）。

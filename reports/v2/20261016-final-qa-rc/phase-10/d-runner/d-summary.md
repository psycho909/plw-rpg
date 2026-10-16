# Phase10-D 摘要：Persistence & Long-world Stability

## 狀態

**D 執行、定向驗證與 L3 獨立稽核均完成；Owner 最終驗收待完成。** 本摘要不代表 Ticket 已 accepted，也不代表 Phase10 整體已驗收。

## 範圍與結果

- 依 Ticket `20261016-v2x-10d-persistence.md`、dispatch D 與 Feature Freeze 執行；沒有修改 `src/` 產品程式或存檔格式。新增 `src/services/phase10Persistence.test.ts`、`src/engine/phase10Determinism.test.ts`，以及 `scripts/phase10/d-long-world.mjs`。
- 存檔／遷移／確定性契約盤點及 coverage mapping：[`save-migration-determinism.md`](../save-migration-determinism.md)。新增的 NPC-linked request/arc round trip 與同 seed 合法 Boss 行動重播測試均通過。
- Phase8-D1 核心 long-world 證據可重用：從 `5e223be` 到 D 執行快照 `4a71d35`，engine/domain/data/services 僅 `wolfFamily.ts` presentation refactor 及其測試變化；模擬、保存、RNG 路徑未變。稽核時目前 HEAD 已到 `2330441d`；D snapshot 後只新增 Phase10-C 測試檔，沒有產品程式變更。
- 目前來源 No Intervention 3 seeds × 10／50／100 年確認 9/9 通過。每個 checkpoint 完整存檔重載及一天續跑相等、孤兒參照 0；JSON save payload 245,272–608,331 bytes。詳細數據、限制與 provenance：[`long-world.md`](../long-world.md)。
- 定向 Vitest 10 檔／238 測試全通過；runner syntax check 通過。精確命令與執行限制：[`test-results.md`](test-results.md)。全專案 check/build 交由 Phase10 lead。

## 最終 run

- Attempt：[`attempt-20261016T034911258Z`](attempt-20261016T034911258Z/summary.json)
- D run HEAD：`4a71d3599cdf17ac3dab189d88e16fabcebe5033`；稽核時目前 HEAD：`2330441d76ccfb42d064b8442709c26733ab48fd`（origin 同步）
- Source fingerprint：119 個追蹤 `src/` 檔案，`d312c8b3a95f96ba6609d2531fd770d2b19df3ac64a7796905c2c1fa29ecd305`
- 結果：PASS，9/9 checkpoints；save/reload 9/9，continuation 9/9，orphans 0。
- Runner model requested：`gpt-6-luna / max`（task label `g6-luna-max-core-engineer`）；實際 runtime 身分無法由工具確認，不作宣稱。

## 獨立稽核

L3 獨立稽核由 requested `gpt-6-luna / max` reviewer 在獨立 context 完成；實際 runtime 無法確認。結論 **通過、無 findings**，詳見 [`d-audit.md`](d-audit.md)。Reviewer 初讀時曾懷疑 progress row 欄位缺失，按最終 attempt 的精確路徑與 SHA-256 重查後撤回；九列資料皆一致。Owner 最終驗收仍待 Owner 執行。

本次 D 交付檔的 SHA-256 與位元組數彙總見 [`d-artifacts.sha256`](d-artifacts.sha256)。

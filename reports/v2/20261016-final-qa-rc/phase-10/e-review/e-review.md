# Phase10-E Review

## 範圍與快照

- Ticket：`tickets/20261016-v2x-10e-browser.md`；授權規格：`docs/specs/V2X-PHASE10-FINAL-QA-RC.md` §§9–10。
- Branch／HEAD：`v2x/reward-core`／`29e7c4b9328c8ea7d58a71a4163a8d93643ea0db`，與兩個 E attempt manifest 的 HEAD 一致。
- 審查內容：E regression／stress 報告與摘要、兩個 attempt 的 manifest、results、checkpoints、action trace、closeout、`scripts/phase10/e-regression.mjs`、`e-stress.mjs`；另讀 `a-check-run/build-correlation-23ef273.txt`。確認 requested root report paths 不存在、對應報告存在於 `e-runner/`。
- `git diff --cached -- <E paths>`、`git diff -- <E paths>` 對 E 交付無 tracked diff；`git ls-files --others --exclude-standard` 顯示 E 報告、runner evidence 與 scripts 為新檔。另檢查 `git status --short -- src`：沒有 E 造成的 source 工作樹變更。Correlation note 是既有檔案的未提交修改，已讀取其 diff，未修改。
- Reviewer：本次主 Agent，未參與 E 施工；實際 runtime 模型身份無法獨立觀測。Review 只讀取現有 artifacts 並重算 raw metrics，沒有重跑瀏覽器或測試。

## Standards／§9 覆蓋

- **§9.1 Browser Regression：**普通 fresh-save UI lane 涵蓋 New Game、Life／Adventure 路徑、交易與休息、基本 Craft／Equip、戰鬥與掉落、Boss 準備、世界歷史、Save／Reload、Modal／Keyboard。Normal Hybrid 只在短窗口檢查必需材料／技能／工作台阻擋；另以明確標記的 controlled fixture 檢查製作、裝備、回到冒險。危機、繼承、crafting cap 亦各自明確標為 controlled fixture；自然流程未觸發者沒有冒充正常路線完成。`results.json` 與 manifest 支持這項區分。
- **§9.2 Responsive：**報告記錄 320／375／768／1280／1920 px 主畫面矩陣，並補充 320×667、375×667／812、1280×768 的視窗／行動導覽檢查。Safari、Firefox、實體裝置均標成 **NOT TESTED**，沒有宣稱跨瀏覽器通過。
- **§9.3 Stress：**runner closeout 記錄 1,200.551 秒、5,358 actions、21 checkpoints、1,468 modal lifecycle、0 runner errors；checkpoint 的 IndexedDB error arrays 合計為 0。從 gzip `action-trace.ndjson.gz` 解壓並重新計算：3,213 個 click-to-visible-change 樣本，P95 56 ms、max 2,004 ms；131 個 save latency 樣本，P95 54 ms、max 80 ms。報告數字與 raw trace 相符。輸入文字未有獨立 latency 數值，E 報告有揭露此限制。
- **2,004 ms 尖峰：**raw trace 記錄 2026-10-16 05:55:28.191Z 的一次「開啟選單」尖峰；前後選單開啟／其他操作約 28–44 ms，沒有相鄰重現。紀錄沒有長工作、frame timing 或瀏覽器錯誤可供根因歸屬，因此原因仍未知；報告有列出 timestamp、最大值與相對 Phase9-F1 的差異，沒有讓 P95 掩蓋它。依 §9.3，現有證據未顯示 persistence、renderer lifecycle 或 memory risk：存檔延遲正常、IndexedDB errors 為 0，heap 在後續 checkpoint 回落，沒有錯誤或連續失控成長。此單點應保留為待觀察的 UI latency outlier；**目前不構成 extended soak 的依據**。若再次出現，應先做同條件選單延遲重現／診斷。

## §10 工件與建置身分

- E 摘要記錄 runner artifacts 共 4,209,666 bytes；本次依三個 attempt/root 檔案實際加總亦為 4,209,666 bytes。大型 action traces 與下載資料有 gzip、SHA-256 及 round-trip 證據；相同內容的兩份 action gzip 雖重複，總體仍僅約 4.2 MB，屬已揭露的有限重複。
- Regression 與 stress `runtime-closeout.json` 分別記錄 Chrome profile 已移除，清除前 74,367,018 與 127,720,631 bytes；scripts 的刪除路徑限制在該 attempt 目錄下名為 `chrome-profile` 的子目錄。符合 artifact／profile 管理要求。
- **P2 — E 報告路徑與要求不符：**review request 指定 `phase-10/browser-regression.md` 與 `phase-10/browser-stress-performance.md`；這兩個 root paths 不存在，檔案目前在 `phase-10/e-runner/`。請在交付前將正式報告放到指定位置，或明確調整索引與交付契約，避免下游按要求路徑找不到報告。
- **P2 — dist 指紋結論仍未同步：**E 報告與 `e-summary.md` 仍把 `72dfd027…` 和指定 `7f5efed2…` 解讀成不同 build，並據此限制驗收。Lead correlation note 說明兩者是同一 build 的不同 path convention：runner 將 repo-relative `dist/assets/...` 路徑納入 hash，Phase10-A 使用 dist-relative `assets/...`；內容檔案 hash 相同。故 correlation 解除了本次「build 不同」疑慮，但目前 E 文件仍保留相反結論。應同步更正報告及摘要，避免錯誤阻擋或誤述 build 身分。
- **P2 — §9.3 輸入延遲未量測：**報告明示 runner 沒有為文字輸入單獨計時。這不推翻已量測的 click/save 結果，但 §9.3 列有 Click / Input Latency，故輸入延遲仍是未驗證項目；在最終 Gate 中保留此缺口，或補上相稱的輸入量測後再宣稱完整涵蓋。

## Product Source

E 新增的是 `scripts/phase10/e-regression.mjs`、`e-stress.mjs` 與 QA evidence，沒有 E 的產品 `src/` 修改。兩個 runner 用受控存檔 fixture 檢查 UI 時會明確記錄 fixture provenance 與用途；沒有因測試而修改遊戲規則。

## Disposition

**PASS WITH FINDINGS；E 的瀏覽器／20 分鐘壓測執行證據成立，但 Phase10-E 文件交付需 follow-up。** 沒有 P0／P1 或已重現產品缺陷。追蹤三項 P2：補正正式報告位置、同步已解決的 dist 指紋結論，以及處理 §9.3 輸入延遲未量測的限制。另保留一項 P3 單次 2,004 ms 選單延遲 outlier；現有證據不足以歸因，也不足以觸發 extended soak。Human Product、未測瀏覽器與輸入延遲限制均不得宣稱已驗證。

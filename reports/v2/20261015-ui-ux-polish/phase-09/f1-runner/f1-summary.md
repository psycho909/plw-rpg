# Phase9-F1 執行摘要

**結果：PASS WITH FINDINGS。** production dist 的可見 UI 回歸與 20 分鐘 stress lane 已完成；一般 Hybrid 路徑在 fresh save 中受素材/進度條件限制，因此另外以清楚標記的受控起始存檔驗證 UI 端到端製作與裝備流程。

## 範圍與證據

- Regression attempt：`attempt-20261016T022825574Z-regression/`；195 actions、123 clicks、0 遮擋點擊拒絕、0 browser errors、51 screenshots。
- Stress attempt：`attempt-20261016T015258432Z-stress/`；要求 1,200 秒、實跑 1,200.924 秒；6,467 action records、21 checkpoints、1,862 modal cycles、0 errors；三次重載 parity 相等。
- 兩次皆使用 HEAD `c0a377b50e09b67664bc07b65d4e81a382daa53f`、src SHA-256 `d312c8b3a95f96ba6609d2531fd770d2b19df3ac64a7796905c2c1fa29ecd305`、production dist SHA-256 `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`；src/dist 指紋皆由排序相對路徑、逐檔 SHA-256 和串接結果 SHA-256 計算。Chrome 153.0.8010.53、Node v22.14.0、Windows x64。
- 報告：[`browser-regression.md`](../browser-regression.md)、[`browser-stress.md`](../browser-stress.md)、[`performance.md`](../performance.md)。

## 結果摘要

- Life 正常新存檔路線完成採集、鍛造、裝備比較/穿戴與鍛造熟練度檢查，未進入戰鬥。Adventure 正常路線完成探索、戰鬥、戰利品比較與下一目標。Fresh-save Hybrid 沒有自然取得配方所需進度與材料；受控 Hybrid fixture 已成功完成樹脂護衣製作、比較、穿戴與返回森林。Crisis、鍛造上限及 succession 也以分開標記的受控 fixture 檢視。
- 1280×768 及 375×667 的物品 modal 均成功開啟且沒有超界；375×667 無水平溢位。15 組響應尺寸檢查未見水平溢位、超界控制或小於 24px 的互動目標。存檔重載後 HUD、位置及玩家格座標相等。
- Stress 點擊至可見文字改變 n=4,238，P50 42ms、P95 55ms、max 200ms；DOM nodes median 2,656、JS listeners median 466、heap median 5.34 MB。IndexedDB 2→330 rows，21 個 checkpoint 無 IndexedDB errors 或 unhandled rejections。
- 受控 `starterSpear` 練習上限明確顯示「本配方已達熟練上限 Lv.3」；無材料時顯示「鍛造材料不足。」並停用提交鈕。Succession fixture 由引擎 `die()` 建立死亡狀態；modal Escape 不可關閉，29 位候選人，選擇後 HUD 為米拉 Lv.1、HP 100、體力 84、45 金。

## 需要保留的解讀

- Fresh-save Hybrid 的自然進度鏈仍未在此 bounded run 證實；受控 fixture 只驗證生產 UI 在合法材料、技能、站點條件滿足時可完成流程。
- Phase8-F inventory/collection 計時是 instrumentation gap；本次 runner 有有效計時，兩次延遲不可直接作版本比較。F1 的 action record 粒度不同於 Phase8-F，不比較吞吐量。
- 不延長到 60/120 分鐘：本次約 20 分鐘未見錯誤、重載差異或資源 runaway。未測 Safari、實體裝置、真人遊玩或 Fun Gate。
- `npm run check` 的 baseline 證據取自 E 階段既有記錄 `e-runner/npm-run-check-e.log`：41/41 test files、650/650 tests、TypeScript 與 production build 通過；F1 未重跑該套件。F1 只新增/修改 `scripts/phase9/f-*.mjs` 與 Phase9 報告，沒有修改 `src/`，未 commit/push。

## 驗證紀錄

- `node --check scripts/phase9/f-regression.mjs`：通過。
- `node scripts/phase9/f-regression.mjs`：最新 regression attempt 完成，exit 0。
- `node scripts/phase9/f-browser.mjs`：stress attempt 完成，exit 0。
- `git diff --check`：通過。

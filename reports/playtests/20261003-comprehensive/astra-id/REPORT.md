# 存檔 ID 續玩安全檢查

- 日期：2026-10-03 UTC；基準：694c6d76df67e3d3dd4da5aa98feba8581ecc2ba。
- 正式範圍：20261003-comprehensive-playtest；依使用者重大 Bug／疑慮交 Astra 授權委派。沿用 matt-skills-curated:tdd。
- 狀態：施工及引擎驗證完成；交主 Agent 瀏覽器交叉驗證與獨立 review。未 commit/push。

## 已確認原因與修復

這些案例均為**受控損壞存檔**，不是正常遊玩自然產生：

1. `nextNpcId=1` 的新世界被接受，15 日後新增 NPC 與既有 `npc-1` 重複，後續存檔不能重讀。Root 固定基準證據見相鄰 artifacts/id-integrity-baseline.json。
2. 兩格成熟作物改為相同 ID 被接受，收割使用 ID 篩除，會移除兩格而只領一格報酬。Root 同一基準報告保存重現。
3. 本單位額外固定基準執行：公開操作準備兩格並種一格，只將 `eventSequence` 從 5 改 3；讀回後正常種第二格得到 IDs `[4,4]`，成熟後一次收割兩格全消失、只取得 5 食物。見 reproduce-event-sequence.mjs / event-sequence-baseline.json。確認屬同一 ID 生成器缺乏連續性驗證後納入修復。

`deserialize()` 現在要求：

- `nextNpcId` 為安全正整數、保留一次遞增空間，且嚴格大於 characters 與 npcs 中 canonical `npc-N` 的 N，包括已繼承／已死亡的角色。
- 每格 crop ID 為安全正整數且互異。
- `eventSequence` 為安全非負整數、保留一次遞增空間；events、history、crops 的已有 ID 均為安全正整數且不能領先此計數器。
- `crops` 先完成 shape 檢查再做 unique 檢查，`[null]` 仍回傳標準「原始存檔已保留」錯誤。

未修改輸入 raw、saveVersion、存檔格式、模擬邏輯、party 規則或依賴；不對損壞資料猜測修復。

## TDD 與驗證

- `npc-red.log`：原有 34 測試通過，新 counter 拒絕案例因未拋錯而失敗；最小修正後 `npc-green.log` 35 通過。
- `crop-red.log`：原有 35 測試通過，新 duplicate crop 案例因未拋錯而失敗；`crop-green.log` 36 通過。
- `sequence-red.log`：原有 36 測試通過，新回退 sequence 案例因未拋錯而失敗；`sequence-green.log` 37 通過。
- `edge-cases.log`：56 通過。額外涵蓋無效 counter／crop ID、sequence 不得落後三個 collection、繼承角色獨有的最大 npc ID、正常四格逐格收割、500 年自然死亡與多次繼承、截斷 event list 與永久歷史、重讀後一致續玩。這是 GREEN 後邊界回歸，不宣稱每個案例獨立 RED。
- 唯一一次完整 `npm run check` exit 0：6 files / 123 tests 通過，vue-tsc 與 Vite build 通過；見 check.log。
- Root review 指出新增 unique guard 的 null crop 型別檢查順序問題，補一個測試獲得 `null-crop-red.log`（預期保留錯誤，實得 TypeError），調整順序後 `null-crop-green.log`：save suite 57/57 通過。這是完整 check 後唯一 production 調整，最終 `npm run build`（含 vue-tsc）exit 0，見 final-build.log。沒有重複執行全套 check。
- `verify-legacy.mjs` 載入固定基準的 producer，將其真正產生的 version 1 新世界、四格作物、500 年死亡角色與繼承存檔交由新版 validator；4 類均完整無變更讀回，見 legacy-results.json。初次同時啟動兩個 Vite SSR server 出現 HMR port 診斷但不影響結果；腳本現關閉 HMR，避免埠衝突。
- `git diff --check` exit 0。

## 最終來源 SHA256

- src/services/saveService.ts：`2a8cced65b901c2f616c022ee82f170c6b13d2ab486e7ddd0cab13aab5b98852`
- src/services/saveService.test.ts：`7abe5a70a1d1d9fd668885adb5af820b1806ea097cbf3fa291a3fe942c7c8a67`

## 限制

本單位只改 saveService 兩檔與本報告目錄，不改先前休息修復。瀏覽器原始資料保護／UI 及多 seed 長期整合由主 Agent 驗證。本次不聲稱涵蓋所有任意損壞存檔；counter 上限 guard 不是任意長未來永不耗盡的保證。

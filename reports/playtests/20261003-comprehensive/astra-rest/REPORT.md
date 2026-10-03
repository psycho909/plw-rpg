# 付費休息跨日金幣透支修復

- 基準：694c6d76df67e3d3dd4da5aa98feba8581ecc2ba；日期：2026-10-03 UTC。
- 委派：使用者要求重大 Bug 交 Astra；主 Agent 指派本單位。遵循 matt-skills-curated:tdd。
- 狀態：實作及引擎回歸完成，交主 Agent UI 交叉重現與最終 review；未 commit/push。

## 根因與最小修復

`rest()` 先檢查餘額，接著 `cost()` 推進時間，午夜 `dailyTick()` 先付傭兵日薪，最後 `rest()` 才扣服務費；此時可能負金幣。save validator 正確拒絕負金幣，造成正常遊玩後的新存檔不能讀回。

`cost()` 新增預設零的金幣費用參數；狀態、體力及金幣前置條件全部通過後，在時間推進前扣款。旅店 8 金幣及酒館 3 金幣共用此路徑，免費休息仍為零。日薪只使用付款後餘額，不足時沿用既有解約規則。未改存檔驗證規則、依賴或世界模擬。

付費服務開始後自然死亡仍已支付一次費用，時間正常推進，回傳角色離世而不恢復生命、不發成功休息事件。再次操作已死亡角色不扣款也不推進時間。這與既有體力費用及商店／聘僱預付款時序一致。

## 測試與證據

1. 在 `/tmp/plw-rest-integrity` 複製原始碼，沿用既有 node_modules，未先改共享來源。新增一個公開引擎操作測試：新世界 seed909 → 等村莊 → 17時 → 酒館聘僱 → 商店買兩份石頭 → 旅店休息。沒有直接寫入 state 欄位。初始 8 金幣預期最後 0、因工資不足解約且 serialize/deserialize 完整往返。
2. RED：`npm test -- src/engine/actions.test.ts` exit 1；17 passed / 1 failed；明確失敗 `expected -4 to be +0`。見 `red.log`。
3. 最小修正後同命令 GREEN：18 passed，exit 0。見 `green.log`。
4. 額外受控 fixture 回歸（明確直接設定 gold／壽命，不聲稱純遊玩）：旅店、酒館及免費休息跨午夜，餘額不足／足以付日薪；買不起不改任何 state；跨年自然死亡只扣一次且存檔可讀；死亡時免費休息拒絕。28 passed，exit 0，見 `edge-cases.log`。這些是 GREEN 後邊界驗證，未宣稱每個測試各自走 RED。
5. 主 Agent 解鎖後移入兩個指定 src 檔案。共享 repo `npm run check` exit 0：6 files / 101 tests 通過，vue-tsc 通過，Vite production build 成功。見 `check.log`。`git diff --check` exit 0。

## 交付來源 SHA256

- src/engine/actions.ts：`005e2a7f59ab076178e843d2021e5cbf3315b3ee9d07122358c76c6943313c6c`
- src/engine/actions.test.ts：`3aff2bf73da6044dc271a8285dbeaaaf354f11a3f8262716b9b4600c32b4b1b8`

## 範圍及限制

本單位只改上述兩個來源檔與本報告目錄。固定 baseline build 不變；本次 check 更新共享 dist 供修復驗證。瀏覽器 UI 及多 seed 長期測試由其他路線／主 Agent 執行，不在此宣称完成。既已寫入的負金幣存檔仍被拒絕，本修復預防新透支，沒有偷偷改寫或放寬舊存檔。

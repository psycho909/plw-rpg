# G-05 跨系統 determinism 摘要

分類：**VERIFIED SAFE IN TESTED SCOPE**

## Replay 序列

固定合法 seed `20261016` 建立初始世界；在商店以公開 `craft` 動作製作 starter spear。依既有危機測試建立合法觸發條件並由 `tryStartRegionalCrisis` 開始危機；模擬至 preparation，將 25 金幣貢獻至危機，再模擬進入 active。呼叫 `die` 讓玩家角色死亡，以 `chooseSuccessor` 選擇成年居民，然後繼續模擬一天。

危機觸發門檻及守衛職涯依既有 crisis fixture 設定；遊戲動作本身均使用引擎公開函式。模擬時長跨過每日邊界，符合引擎的危機階段推進時機。

## Controlled fixture fields

- Store position、wood／stone、gold、stamina：讓角色可在商店合法完成 starter spear 鍛造。
- Threat population／level／camp level 與 settlement safety：達到既有危機測試的合法觸發條件。
- NPC guard jobs 及 life career jobs：提供既有 crisis contribution 規則要求的後勤需求，使 gold contribution 可合法完成。

這些欄位只建立可達成公開動作的測試前置條件；兩條 replay 使用相同 seed、初始世界與前置設定，不直接修改操作結果或存檔內容。

## Reload 邊界

- A：全程連續執行，不存檔／載入。
- B：鍛造完成後、危機 preparation 貢獻完成後、successor 選定後，分別以 `deserialize(serialize(state, 0)).state` 新物件還原並繼續。
- 每個邊界均斷言 `serialize(restored, 0) === serialize(beforeReload, 0)`；三次 reload 均實際呼叫 `deserialize`，未丟出錯誤。

## 比較結果

兩條 replay 相同：RNG state、world time、active character identity、全角色及背包 inventory、NPC 與 NPC references、reward／loot／equipment、regional crisis phase／contributions、history、events，以及固定 save timestamp 序列化後的完整 game state。測試連續執行兩次均通過；指定 `vue-tsc --noEmit` 亦通過。

排除欄位：無。Save 使用固定 `now = 0`，使完整 serialized state 可直接比較，避免測試時鐘差異；此為固定輸入，不是忽略或剔除存檔欄位。

## 驗證

- `npx.cmd vitest run src/engine/postRcDeterminism.test.ts`：通過（連續兩次）。
- `npx.cmd vue-tsc --noEmit`：通過。

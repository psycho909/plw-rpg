# S-02 防衛者裝備分配重現

## 分類

**PRODUCT DECISION REQUIRED**

已確認死亡防衛者所屬裝備效果停止計分；其兩筆分配紀錄仍永久留在本場危機的 16 筆上限中。規格要求裝備支援實際改變防衛能力，但沒有說明防衛者受傷、退休、死亡或成為接班人後，裝備應失效、轉交或釋出分配額。因此目前證據不足以判定效果消失或額度占用違反產品契約。

## 重現步驟與觀察

測試檔：`src/engine/postRcS02Defender.test.ts`。

1. 以合法 `createGame` 狀態透過 `tryStartRegionalCrisis` 開始 severity 3 危機；只在受控測試 fixture 中建立 9 名成年 guard，8 名填滿目標防衛者，另 1 名作為補位者。
2. 透過 `contributeCrisisEquipment` 交付 8 把短劍與 8 件獸皮衣，使用量為 16/16 分配筆數、16/16 計分槽，equipment need shortage 為 0。
3. 透過既有 `die()` 將其中一名防衛者設為死亡，再呼叫 `deriveCivilDefense`。死亡者不在可用防衛者中，補位者進入 8 人目標；計分槽變成 14/16，裝備短缺為 2，裝備效果從約 4.2743 降至 3.7400（減少約 0.5343，正好是死亡者短劍與獸皮衣效果之和）。
4. 全域分配紀錄仍是 16/16，剩餘分配筆數 0。即使補位者有兩個空槽，`contributeCrisisEquipment` 仍回覆「目前沒有可用的防衛裝備欄位。」且不消耗待交付裝備。
5. `deserialize(serialize(state))` 成功，死亡者的兩筆裝備分配仍存在；狀態與序列化前相同。

受控 fixture 只為了快速構造足額防衛者與替補者；危機、裝備交付、死亡及存檔往返均使用既有引擎函式／公開 API。沒有修改產品程式碼或既有測試預期。

## 規格依據

- `docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md:242-246`：「Craft weapons / armor → Settlement defenders receive equipment support → Defense capability changes」。
- `docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md:2332-2334` 要求生活玩家能透過 Equipment 產生實際影響，且製作裝備能實際改善 Civil Defense。
- 上述條文沒有定義防衛者失去資格後的裝備生命週期或分配額回收政策。
- 實作依據：`src/engine/civilDefense.ts:137-150` 只從目前可用防衛者的前 `targetDefenders` 名單讀取分配並計算效果；`src/engine/crisisContributions.ts:79-82` 以全域 16 筆分配上限拒絕新交付。

## 修正建議

目前不提出程式修正：需先由產品決定防衛者不再有效時，已捐裝備是否失效，以及已用分配額能否釋出／轉交。若決定應釋額，最小修正位置會是 `src/engine/crisisContributions.ts` 的分配容量／重分配處及 `src/engine/civilDefense.ts` 的效果讀取處；須同步定義存檔 ledger 如何表示，不能只忽略死亡者的歷史列。

## 驗證

- `npx.cmd vitest run src/engine/postRcS02Defender.test.ts src/engine/crisisContributions.test.ts src/engine/civilDefense.test.ts`：3 個測試檔、32 項測試通過。
- `npx.cmd vue-tsc --noEmit`：通過。
- `git diff --check`：通過。

本項未執行完整 `npm.cmd run check`、瀏覽器 smoke 或獨立 review；依 common worker rules，完整 check 由 Root Lead 執行。

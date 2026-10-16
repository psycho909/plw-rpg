# S-02 S2-A ledger implementation summary

- Worker assignment: `sol-medium-s02-ledger`（派工識別，不宣稱後端模型／effort 已切換）。
- Authority: `tickets/20261017-v2x-s02-equipment-ledger.md`「Lead 契約」及 `.scratch/20261017-s02/dispatch-sol-medium-s02-ledger.md`。
- Base / HEAD: `c2cca1715d7dbf383028cc0950044e0b3765b81f`；變更保留在工作樹。
- Result: **worker implementation / specified verification PASS**；不代表 parent Ticket accepted 或獨立 Audit 通過。
- 未委派、未使用 herdr、未 commit／push，未改 Ticket 或其他 worker 的檔案。

## Diff summary

1. `src/domain/crisis.ts`：僅新增 `equipmentHistory: 32`；保留 `equipmentAllocations: 16`。
2. `src/engine/civilDefense.ts`：新增純函式 `isCivilDefenseAllocationReserved(state, allocation)`，只依 NPC 存在、存活及 career 非 retired 判定。交付與存檔驗證共用；不依傷勢、職業或隊伍身分釋放保留額度。
3. `src/engine/crisisContributions.ts`：history ≥ 32、reserved ≥ 16 或 shortage = 0 時沿用既有訊息拒絕，全部檢查發生在任何寫入之前。每人每 slot 與 instance 重複檢查保留。
4. `src/services/saveService.ts`：history 上限放寬為 32，逐列驗證後計算 reserved 並限制 ≤ 16。其餘每列、物品快照、唯一性及來源檢查保留。
5. `src/engine/postRcS02Defender.test.ts`、`src/engine/crisisContributions.test.ts`、`src/services/saveService.test.ts`：補齊上限／生命週期／相容性矩陣與拒絕原子性測試。

未修改 allocation shape、saveVersion、裝備數值、平衡、UI 文案或 recognition 公式；`regionalCrisisRecognition.ts` 仍加總全部歷史列。

## Validation order / trust boundary

1. `deserialize` 解析存檔；目前 V8 先正規化並檢查 reward 外形。
2. `validBase` 先以 `matches` 驗證基本資料結構（包括 NPC 陣列／布林欄位），再驗證 actor ID、NPC 工作與排程等欄位，最後才呼叫 `validRegionalCrisis` → `validRegionalCrisisContributions`。
3. ledger 先檢查長度 ≤ 32、每列欄位、ID、slot、donor、時間、物品快照與唯一性，才呼叫共用 reserved predicate。
4. 此刻 `life` 尚未完整驗證，因此 helper 使用 `state.life?.npcs?.[id]?.career` 安全讀取；缺失 career 不會被誤判為 retired 而釋放額度。NPC 陣列已在第 2 步驗證。
5. `validBase` 成功後，`deserialize` 隨即執行 `validLife`；無效 life 仍拒絕，沒有未經完整 life 驗證就回傳載入狀態的路徑。新增 null／空物件／null npcs／缺少 NPC life 的負向測試均回傳既有「原始存檔已保留」錯誤，沒有 TypeError。

依 Lead 契約，NPC 永久移除後不再使用原 ID；訪客離開與每日死亡清除後無法由剩餘狀態區分，本實作不推定原因，只將不在 `npcs` 的列視為永久失格。接班者移至 `characters`；退休依契約為單向狀態。此假設須由 Lead／Owner 最終確認，未擴增 schema 追蹤移除原因。

## RED evidence — current source before production edits

Command:

```powershell
npx.cmd vitest run src/engine/postRcS02Defender.test.ts
```

Exit 1；1 failed / 5 passed（6 tests）。預期原因：滿 16 歷史列後死亡補位應成功，但收到 `目前沒有可用的防衛裝備欄位。`。

```text
FAIL releases reserved capacity at 16 historical rows when an equipped defender dies
AssertionError: expected '目前沒有可用的防衛裝備欄位。' to be ''
Test Files 1 failed (1)
Tests 1 failed | 5 passed (6)
```

Command:

```powershell
npx.cmd vitest run src/services/saveService.test.ts
```

Exit 1；16 failed / 116 passed（132 tests）。17～32 每一個長度各一項測試，均因舊 16 列上限而被拒絕；0、1、16 列控制組通過。

```text
FAIL loads 17 ... 32 historical equipment rows unchanged with at most 16 reservations
Error: 存檔資料不完整。原始存檔已保留，請確認後重建世界。
Test Files 1 failed (1)
Tests 16 failed | 116 passed (132)
```

## GREEN evidence — final worker source

工作目錄：`D:\Codex\plw-rpg`。

```powershell
npx.cmd vitest run src/engine/postRcS02Defender.test.ts src/engine/crisisContributions.test.ts src/engine/civilDefense.test.ts src/services/saveService.test.ts src/engine/crisisResolution.test.ts src/engine/regionalCrisis.test.ts
```

Exit 0；**6 files / 198 tests passed**；Duration 28.48s（tests 25.46s）。

```text
Test Files 6 passed (6)
Tests 198 passed (198)
```

```powershell
npx.cmd vue-tsc --noEmit
```

Exit 0，無診斷。`git diff --check` exit 0；僅 Git 提示既有檔案的 LF 下次寫入將轉為 CRLF，無 whitespace error。

測試開發期間另有一次 fixture 失敗：連續補位的新 NPC 排在第九位備援 guard 後，超出 active slice，因此交付正確被拒絕。修正測試讓未參與該循環的備援 NPC 暫任 woodcutter，滿 32 筆後恢復 guard；產品 active slice 規則未修改。修正後指定套件通過；最後再強化 17 列結算與 shortage=0 原子性測試，得到上述最終 198 項結果。

## Owner items 1–14 map

| Item | Test / evidence |
| --- | --- |
| 1. 16/16、死亡後補位 | `postRcS02Defender`: `releases reserved capacity at 16 historical rows...`：有效欄位 16→14→15，歷史 16→17。 |
| 2. 16→17 存讀檔 | 同測試逐欄比較載入 state；死者兩筆歷史保留。 |
| 3. history 32 拒絕且 byte-identical | `bounds sequential death replacements...`：有效欄位 14、歷史 32，仍有 shortage，拒絕後固定 savedAt 的 serialize 完全一致，涵蓋 RNG、events/history、物品及聲望。 |
| 4. 受傷仍保留 16 額度 | `keeps all 16 reservations during temporary injury...`：有效欄位 14 但補位被拒絕，狀態 byte-identical。 |
| 5. 恢復使用同一筆 | 同參數化測試恢復後有效欄位回到 16，ledger 深比較完全一致；既有 injury/recovery 測試也保留實際時間推進。 |
| 6. retired 釋放 | `releases a full reservation after permanent retired...`：滿額退休後補位，17 列可讀。 |
| 7. 接班釋放 | 同參數化 `successor`：實際執行 die／chooseSuccessor，補位成功，歷史完整且無退款。 |
| 8. 轉職離開／回來不重算 | temporary `job`：離職期間拒絕補位，回 guard 後同 ledger 恢復 16；再次交付拒絕且無變更。另測 temporary `party`。 |
| 9. 連續死亡補位 | sequential 測試 8 次死亡、16 次交付，到 history 32；每次有效欄位為 15／16，各步皆存讀檔比較一致。 |
| 10. 無退款／物品複製／重複重大聲望 | permanent 測試歷史前 16 列不變且 inventory instances 為空；死亡補位與 duplicate 測試保留消耗檢查；`counts dead defender craft rows...` 確認重大 recognition 僅一次、後續聲望不再增加。 |
| 11. 危機結算重載一致 | `keeps dead defender gear history through crisis resolution...` 強化為 severity 3／17 列；active 前及途中重載，最終 outcome 與完整 serialize 相同。 |
| 12. 舊 ≤16 ledger | save 測試 0／1／16 列完整 round-trip；既有 authentic V5／V6 archived fixtures 的遷移測試一併通過。 |
| 13. 17～32 可讀 | save 參數化逐一檢查 17～32，保留 16 額度，序列化整份 raw 相同。 |
| 14. 重複 instance 安全拒絕 | `rejects duplicate instance contribution...` 以同 ID 重新放入物品陣列測試，拒絕後 serialize byte-identical。 |

額外 negatives：33 history／0 reserved、17 history／17 reserved 均拒絕。`crisisContributions` 的 zero shortage 測試使用 0 history／0 reserved，獨立證明 shortage=0 守衛且拒絕後 serialize 相同。既有 per-slot、instance、reward snapshot 驗證未放寬。

## Characterization assertion changes

- 原 `records factual S-02 allocation behavior...` 改名表達新契約：移除 `16 - history.length` 代表剩餘額度的舊假設；死亡後補位從「拒絕且 state 不變」改為成功、消耗物品、有效欄位增為 15；存讀檔預期從 16 改 17。死亡造成的效果下降與歷史快照檢查保留。
- 原結算重載測試從 1 列擴成完整 16 列加死亡補位的 17 列，保留原完整序列化一致性斷言；因此歷史長度改為 17。
- 既有 duplicate 測試新增 serialize 完全一致斷言，未放寬舊斷言。其餘 characterization 預期不變。

## Scope review and remaining risk

- 主 worker 自查 Standards：僅七個允許 source/test 檔案及本報告有本次變更；無依賴、新 schema、UI 或無關重構。Spec：共用 predicate、32/16 守衛、全歷史 recognition、相容性與 14 項矩陣符合 Lead 契約。此為施工者自查，**不是獨立 Audit**。
- 方法：`matt-skills-curated:implement`／`matt-skills-curated:tdd`（1.1.0），`ponytail:ponytail`（5.3.1）；依專案 Skill adaptation 按工作單位驗證，遵守派工不委派／不提交限制。
- 未執行 `npm.cmd run check` 全套／build、瀏覽器、獨立 Luna Max review、部署或遠端同步；本派工只要求上述六檔及 vue-tsc。Parent Ticket 的 full check、獨立 Audit、fingerprint、最終核准與 commit／push 由 Lead 接續，worker 未宣告 parent accepted。
- 超過 16 列的新存檔可能無法由舊 build 讀取；Owner 已接受不保證降版。歷史達 32 即停止新增，即使之後還有永久失格仍不釋放歷史空間，符合已核准邊界。
- 若未來允許 NPC ID 再利用、移除者返回或 retired 轉回，必須重審 reserved predicate 契約；本次依已核准不可逆規則實作。

Next action: Lead 對本工作樹變更執行獨立 review 與 parent Gate；本 worker 無 Git／發布動作。

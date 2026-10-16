# S-02 Defender Equipment Ledger（S2-A）— 修復報告

- 日期：2026-10-17。Ticket：[20261017-v2x-s02-equipment-ledger](../../../../tickets/20261017-v2x-s02-equipment-ledger.md)。
- Owner 決策：2026-10-17 授權 S2-A；同日 final sign-off 接受 VERIFIED_FIXED，並確認「訪客離開即釋放額度」為產品規則（§3）。S2-A 內容如下：
  - 有效／保留額度 16、歷史 ledger 32，紀錄形狀不變，不保證降版。
  - 永久失格：死亡、接班、`career === 'retired'`。
  - 暫時失格：轉職、受傷。
- 流程：Lead 先定契約，Codex `sol-medium-s02-ledger`（GPT-6.1 Sol medium）實作，Lead 跑完整檢查，再由 Codex `luna-max-s02-review`（GPT-6 Luna max，唯讀，沒有參與施工）獨立審查。

## 1. 結論

**S-02：VERIFIED_FIXED**

| 問題 | 回答 |
|---|---|
| 1. S-02 是否 VERIFIED_FIXED？ | 是。ledger 已滿 16 筆時，有防衛者永久失格後，補位者可以接受新裝備。只有修正前的程式會失敗（RED），修正後通過 |
| 2. 有效／保留 16、歷史 32 是否成立？ | 是。交付和存檔驗證共用同一個保留判斷；歷史達 32 筆時拒絕交付，狀態完全不變 |
| 3. 舊存檔能否由新版讀取？ | 能。0、1、16 列完整 round-trip；既有的 V5／V6 歸檔存檔遷移測試也通過 |
| 4. 是否有未解的 Release Blocker？ | 沒有。獨立審查：沒有 P0／P1，也沒有阻斷等級的 P2 |
| 5. 是否仍維持 ENGINEERING RC READY WITH FINDINGS？ | 是。新 Source 已通過完整檢查與獨立審查。受影響的是 engine 和存檔驗證，不是 UI 或瀏覽器的儲存路徑，見 §6 |

## 2. Source diff（產品程式）

| 檔案 | 變更 |
|---|---|
| `src/domain/crisis.ts` | 新增 `equipmentHistory: 32`，保留 `equipmentAllocations: 16` |
| `src/engine/civilDefense.ts` | 新增純函式 `isCivilDefenseAllocationReserved`：防衛者仍在 `npcs`、存活、且沒有 retired，才算保留 |
| `src/engine/crisisContributions.ts` | 交付時：歷史 ≥ 32、保留 ≥ 16 或 shortage = 0 就拒絕（沿用既有訊息），所有檢查都在寫入之前 |
| `src/services/saveService.ts` | 長度上限 16 改成 32；逐列驗證後計算保留數，必須 ≤ 16 |

沒有改：紀錄形狀、saveVersion、裝備數值、平衡、UI 文案、聲望公式（仍加總全部歷史）。

## 3. 永久與暫時失格的判定

| 狀態 | 保留額度 | 依據 |
|---|---|---|
| 存活、在名單中 | 保留 | — |
| 受傷 | 保留 | 仍在 `npcs` |
| 轉職離開 guard／mercenary | 保留 | 仍在 `npcs`；回來後同一筆紀錄恢復效果 |
| 在玩家隊伍中 | 保留 | 仍在 `npcs` |
| 死亡（當天，尚未清除） | 釋放 | `isAlive = false` |
| 死亡（每日清除後） | 釋放 | 已不在 `npcs`（`simulation.ts:313`） |
| 被選為接班人 | 釋放 | 從 `npcs` 移到 `characters`（`simulation.ts:503`） |
| 退休 | 釋放 | `career === 'retired'`，只會單向變更（`npcLife.ts:195`） |
| **訪客離開聚落** | 釋放 | 已不在 `npcs`（`simulation.ts:287`） |

**Owner 確認的產品規則（2026-10-17 final sign-off）**：訪客永久離開聚落（離開 `state.npcs`）後，即永久失去本場危機的防衛資格。
1. 已交付的裝備不退還、不轉交、不複製。
2. 原裝備效果停止計算，保留額度釋放。
3. 原始捐贈 ledger、物品來源與聲望紀錄都保留。
4. 不重新發放獎勵。
5. 歷史上限 32、保留上限 16、有效上限 16 都不變。
6. 暫時受傷、轉職、加入玩家隊伍時，仍保留額度。
7. 未來若新增訪客回歸或 NPC id 重用的機制，必須重新審查這條規則。

依據：死亡與訪客離開在每日清除後狀態相同；兩者都不可逆（NPC id 由 `nextNpcId++` 配發，沒有重用或重新加入的路徑），獨立 reviewer 已驗證。

## 4. 修復前後重現

- **RED**（修正前）：
  - `postRcS02Defender.test.ts`：16/16 死亡後補位，回傳「目前沒有可用的防衛裝備欄位。」，1 項失敗。
  - `saveService.test.ts`：17～32 列各一項，因舊的 16 列上限被拒絕，16 項失敗。
- **GREEN**（修正後）：6 個測試檔 198 項通過；`vue-tsc` 通過。

## 5. Regression 與存檔相容性

| Owner §5 項目 | 證據 |
|---|---|
| 1. 16/16 死亡後補位 | 有效欄位 16 → 14 → 15，歷史 16 → 17 |
| 2. 16 → 17 存讀檔 | 逐欄位比較；死者的 2 筆歷史保留 |
| 3. 歷史 32 拒絕 | 拒絕後固定 `savedAt` 的 serialize 完全相同（含 RNG、事件、物品、聲望） |
| 4. 受傷保留額度 | 有效 14、保留 16，補位被拒絕，狀態完全相同 |
| 5. 恢復 | 有效回到 16，ledger 完全相同 |
| 6. 退休釋放 | 滿額退休後補位成功，17 列可讀 |
| 7. 接班釋放 | 實際執行 `die`／`chooseSuccessor`，補位成功，不退款 |
| 8. 轉職與回歸 | 離職期間拒絕補位，回 guard 後恢復，不重複計分；另測了隊伍成員的情況 |
| 9. 連續死亡補位 | 8 次死亡、16 次交付到歷史 32；每一步都存讀檔比對 |
| 10. 不退款、不複製、不重複聲望 | 重大聲望只發一次 |
| 11. 結算前後存讀檔一致 | 嚴重度 3、17 列，active 前與途中重載，結果相同 |
| 12. 舊 ledger ≤ 16 | 0、1、16 列 round-trip；V5／V6 歸檔存檔遷移通過 |
| 13. 17～32 列可讀 | 參數化逐一測試 |
| 14. 重複交付同一物品 | 拒絕，serialize 完全相同 |
| 反向案例 | 33 列、保留數 17 的存檔都被拒絕 |

**驗證順序**：`validBase` 先驗證 NPC；保留數用安全讀取的 `life`（缺少 career 時不會被誤判為退休）；之後 `deserialize` 會執行 `validLife` 完整驗證 life。null 或空 life 的反向測試都回到既有的「原始存檔已保留」錯誤，沒有 TypeError。

**完整檢查**：`npm.cmd run check` 結果 **50 files／770 tests PASS**，`vue-tsc` 與 `vite build` 都通過。

## 6. Source／Build fingerprint 與 RC 影響

- Base `c2cca17`（dist `977d9883…`）；新 dist `da7f49e4…`（`sha256sum` 慣例）。實際 commit 與 `HEAD:src` 見 Ticket。
- 沒有跑 browser smoke：變更只在 engine 交付規則和存檔驗證。既有 runner 的瀏覽器危機 fixture 沒有裝備交付的操作，跑了也無法驗證這條路徑。存檔驗證由 `saveService.test.ts` 的 132 項測試涵蓋，包含 V5／V6 歸檔存檔。
- 剩餘相容性風險：超過 16 列的新存檔無法由舊 build 讀取，Owner 已接受。

## 7. 獨立審查

`luna-max-s02-review`：**APPROVE**，沒有 P0、P1，也沒有阻斷等級的 P2。
- 永久與暫時的分類、三種計數的一致性、驗證順序、聲望不重複，都已確認。
- 「移出 `npcs` 即永久失格」：審查判定合理；Owner 已在 2026-10-17 正式確認（見 §3）。
- 它的驗證：6 個測試檔 198 項通過、`git diff --check` 通過。

## 8. 剩餘風險

- 歷史達 32 筆後，即使之後還有人永久失格，也不會再釋放歷史空間。這是 Owner 核准的上限。
- 將來如果允許 NPC id 重用、被移除的 NPC 回歸，或退休可以改回，都必須重新審查保留判斷。

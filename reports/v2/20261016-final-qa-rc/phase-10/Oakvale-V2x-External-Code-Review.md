# Oakvale V2.x — External Independent Code Review

- 審查日期：2026-10-16
- 審查模式：READ-ONLY（未修改、commit 或 push 任何專案檔案；重現腳本僅存於暫存區）
- Verdict：**CHANGES REQUIRED**
- Release Blocker：**有（P1-01）**

---

## A. Executive Summary

| 項目 | 結論 |
|---|---|
| 審查是否完成 | 是。Pass 1（架構）→ Pass 2（深入程式碼）→ Pass 3（證據與判定）都做完了。 |
| 審查的 Source | `b11d7603b14219739cb7524105669dc187c23cf8`。目前 HEAD `1273511` 相對它只改了 tickets、reports、TODO，`src/` 與 `scripts/` 完全一致。 |
| 範圍 | Save／Migration／Journal、RNG／World Time、NPC／Succession、Combat／Loot／Crafting／Economy、Crisis／Director、Vue／Pinia／UI，以及測試品質。 |
| 獨立性 | 這是新的 Claude Code session，沒有承接任何開發 session。但工具在 session 開始時自動注入了 claude-mem 的歷史觀察標題（Phase10 協調紀錄），審查者只把它當背景，沒有當證據。所有結論都來自原始碼或審查者自己執行的結果。 |
| 整體風險 | **中高**。核心模擬、Determinism 與存檔驗證的設計很扎實，但存在一條一般 UI 操作就能觸發的路徑：存檔會變成無法重載。 |
| Release Engineering Verdict | **CHANGES REQUIRED**（P1-01 修好並重新審查之前，不建議進入 RC 驗收）。 |

---

## B. Source & Evidence Validation

- **Commit 核對：** `b11d760`、`29e7c4b`、`c0a377b` 三個 commit 都存在。
- **產品程式碼沒變過：** `c0a377b → b11d760` 之間 `src/` 只新增 4 個 Phase10 測試檔，沒有改產品程式碼。
- **指紋相符：** 123 個 tracked 檔案，`src/` 指紋 = `3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842`，與 handoff 記錄一致。
- **工作樹：** 沒有未提交的修改。

**讀過的模組：**
`saveService`、`playJournal`、`saveWriter`、`gameStore`、`gameLoop`、`random`、`events`、`calendar`、`simulation`、`actions`、`crafting`、`data/crafting` 與 6 個內容家族的配方、`rewardActions`、`rewardState`、`itemGeneration`（loot 部分）、`contentFamilies`／`wolfFamily`（encounter 與 boss）、`regionalCrisis`、`crisisContributions`、`civilDefense`、`livingEvents`、`npcLife`、`lifeState`、`identity`、`ownership`、`crops`、`App.vue`、`PixelWindow`／`modalFocus`、各 component 的 `:disabled` 與 action 呼叫點，以及關鍵測試。

**實際執行的驗證：**

| 驗證 | 結果 |
|---|---|
| 完整 `vitest run`（HEAD，src 與 b11d760 相同） | **45 files／658 tests PASS**，耗時 56.7 秒 |
| P1-01 最小重現（以 vite SSR 載入正式模組） | 持有 3：`resin = -1`，`deserialize` 拋錯。持有 4：正常。 |
| 配方重疊統計 | 28 個配方中有 **22 個**，影響素材清單包含自己的基本素材 |
| Journal 成長量測（模擬 store 的 advance 與 record） | x1：7,200 筆／1,475,590 字元每小時。x20：36,000 筆／7,471,236 字元每小時。 |
| 搜尋 `Math.random`／`Date.now`／`performance.now` | 遊戲規則中沒有使用。只出現在存檔 metadata、journal、game loop 計時。 |

**沒有執行的項目：** typecheck、production build、瀏覽器實測、long-world 重跑、100k Monte Carlo。這些已有 Phase10 證據，且沒有任何 finding 需要用它們重現。

---

## C. Confirmed Findings

### P1-01：影響素材與基本素材相同時，存量只檢查單筆、扣除卻分兩次，素材扣成負數，存檔永久無法重載

| 欄位 | 內容 |
|---|---|
| Severity / Category | **P1** / Data Integrity・Crafting・Save |
| 受影響檔案 | `src/engine/crafting.ts:215-225`（把影響素材附加成第二筆 input）、`:345-346`（逐筆比較 `current < required`）、`:443-446`（逐筆扣除）。`src/services/rewardValidation.ts:256-258`（stack 必須 ≥ 0）。`src/services/saveService.ts:535-540`（驗證失敗即拋錯）。UI：`src/components/PlaceWindow.vue:368,393`。 |
| Reviewed Commit | `b11d760` |
| 預期行為 | 同一種素材出現在多筆 input 時，應以**總需求量**和存量比較。存量不足要回傳 `materials_required`，且任何合法操作都不能產生驗證會拒絕的狀態。 |
| 實際行為 | 以 `slime_resin_guard_recipe` 為例：需要 resin×3，影響素材也選 resin。持有剛好 3 個時，plan 的 inputs 是 `[resin 3/3, wood 2/2, resin 1/3]`，`ok=true`，鍛造成功，resin 變成 **-1**。之後 `deserialize(serialize(state))` 拋出「存檔資料不完整」。 |
| 觸發條件 | 配方的 `allowedBiasMaterials` 包含它自己的 material input（22／28 個配方），且持有量介於該 input 需求量與需求量 + 1（不含）之間。玩家剛好湊齊材料時就會中。 |
| 最小重現 | `createGame(909)` → 建好 blacksmith → 站到 (12,9) → smithing 2、wood 2、`slime_resin=3`，時間 08:00 → `craft({ recipeId:'slime_resin_guard_recipe', influenceMaterial:'slime_resin' })` → `deserialize(serialize(s))` 拋錯。 |
| Root Cause | `blankContext` 把影響素材當成獨立的一筆 input，`transactionFailure` 逐筆比較時沒有依 materialId 加總。 |
| Impact | 同一 session 內仍可繼續玩，但每次自動存檔都寫入不合法狀態。下次載入時進入 `saveBlocked`，遊戲內唯一出路是「重建世界」，等於失去整個世界；玩家也白拿 1 個素材。原始 JSON 仍保留，hotfix 有機會救回，因此評為 P1 而非 P0；Owner 若視為永久遺失，可升為 P0。 |
| Confidence | 高（已重現） |
| 建議的最小修正 | 在 `blankContext`／`transactionFailure` 依 `(source, id)` 加總需求量後再比較存量；`craftInternal` 扣除前加一道防護，任何 stack 會變負數就直接 fail。不需要改配方資料。 |
| Regression Test | ① 22 個重疊配方逐一測：持有量等於基本需求時 `plan.ok=false`、`reasonCode='materials_required'`。② 持有量為需求 + 1 時鍛造成功、stack=0，且 `deserialize` 通過。③ UI projection 在不足時將按鈕設為 disabled。 |

**受影響配方（22／28）：**

| 配方 | 重疊素材 |
|---|---|
| slime_resin_guard_recipe | slime_resin |
| slime_glass_pike_recipe | slime_glass_shard |
| slime_moss_coat_recipe | slime_moss_core, slime_bog_mucus |
| slime_spring_blade_recipe | slime_spring_ichor |
| cave_insect_chitin_spear_recipe | cave_insect_chitin |
| cave_insect_leg_blade_recipe | cave_insect_leg, cave_insect_venom_gland |
| cave_insect_plate_vest_recipe | cave_insect_plate, cave_insect_sac |
| cave_insect_resin_coat_recipe | cave_insect_resin, cave_insect_chitin |
| wild_beast_tendon_spear_recipe | wild_beast_tendon |
| wild_beast_hide_coat_recipe | wild_beast_hide, wild_beast_fur |
| wild_beast_amber_cuirass_recipe | wild_beast_hide, wild_beast_antler |
| frontier_goblin_scrap_spear_recipe | frontier_goblin_scrap |
| frontier_goblin_plate_vest_recipe | frontier_goblin_plate, frontier_goblin_ironbits |
| frontier_goblin_wire_knife_recipe | frontier_goblin_slingcord, frontier_goblin_wire |
| frontier_goblin_signal_coat_recipe | frontier_goblin_signalcloth |
| fog_undead_cryptblade_recipe | fog_undead_bone, fog_undead_tendon |
| fog_undead_guardmail_recipe | fog_undead_cryptstone, fog_undead_shroud |
| fog_undead_boneknife_recipe | fog_undead_bone, fog_undead_wax |
| fog_undead_shroudcoat_recipe | fog_undead_shroud |
| mine_construct_shardpike_recipe | mine_construct_shard, mine_construct_joint |
| mine_construct_plateguard_recipe | mine_construct_plate, mine_construct_binding |
| mine_construct_bindingmail_recipe | mine_construct_binding |

**重現輸出：**

```text
{"owned":3,"planOk":true,"planInputs":[["slime_resin",3,3],["wood",2,2],["slime_resin",1,3]],"craftOk":true,"resinAfter":-1,"reload":"THROW: 存檔資料不完整。原始存檔已保留。"}
{"owned":4,"planOk":true,"planInputs":[["slime_resin",3,4],["wood",2,2],["slime_resin",1,4]],"craftOk":true,"resinAfter":0,"reload":"OK"}
```

---

### P2-01：Journal pending 沒有上限，IndexedDB 持續失敗時 localStorage 會被塞滿，連重建世界都存不下

| 欄位 | 內容 |
|---|---|
| Category | Persistence・Browser Storage |
| 受影響檔案 | `src/stores/gameStore.ts:20-24`（record）、`:45-63`（flush）、`:64-75`（`save`：只有存檔成功才觸發 flush）、`:76-81`（`reset` 保留 pending）、`:96-101`（每次 advance 都產生 record）。`src/engine/gameLoop.ts:242-255`。 |
| Reviewed Commit | `b11d760` |
| 預期行為 | IndexedDB 無法使用時能有界地降級，至少保留一條可以繼續遊戲或安全重建的路。 |
| 實際行為 | 每次時間推進都產生一筆 `time` record（x1 約每 0.5 秒一筆，x20 每 0.1 秒一筆），並寫入每一次 localStorage checkpoint。IndexedDB append 持續失敗時 pending 只增不減，實測 x20 每小時約 750 萬字元，超過常見約 500 萬字元的 localStorage 上限。之後 `save()` 一直失敗、`canProgress()` 擋住所有行動；`reset()` 帶著同一份 pending 也存不下；flush 又只在存檔成功後才觸發，整個 session 卡死。 |
| 觸發條件 | IndexedDB 持續無法寫入（無法開啟、被封鎖或配額耗盡），而 localStorage 仍可用。IndexedDB 本身也沒有上限（x1 約每小時 150 萬字元），長期遊玩後可能自行耗盡配額並觸發上述鏈。 |
| 最小重現 | 在 store 測試中讓 `appendBatch` 永遠 reject，`setItem` 在累計超過 5,000,000 字元後丟 quota 錯誤，迴圈呼叫 `advance(1)` 約 25,000 次。預期：`saveError` 出現、`speed=0`，`reset()` 後 `saved` 仍是舊 checkpoint。 |
| Root Cause | append-only journal 的 outbox 與 checkpoint 綁在一起，沒有上限或合併機制，失敗時也沒有退路。 |
| Impact | 單一瀏覽器 profile 無法再進行遊戲；重新整理後若 IndexedDB 仍失敗就持續卡住，唯一解法是清除網站資料（等於失去存檔）。 |
| Confidence | 程式路徑：高。實際瀏覽器觸發：未重現（需讓 IndexedDB 持續失敗）。 |
| 建議的最小修正 | ① 合併連續 `time` record（from／to 範圍加事件）。② 為 pending 設上限，超過時保留摘要並標記缺口。③ flush 不再只依附於存檔成功。④ `reset` 在使用者確認後可將 pending 移到匯出檔。 |
| Regression Test | 上述重現測試；並驗證合併後 checkpoint 大小有上限、`reset` 在配額壓力下能成功。 |

---

### P3-01：Phase8 經濟 runner 仍以 360 天為一年（證據標示問題，非產品缺陷）

- **位置：** `scripts/phase8/run-life-economy.mjs:19` 的 `ECONOMY_YEARS * 360 * 1440`，搭配 `scripts/phase8/economy-harness-core.mjs:2` 的 `ECONOMY_YEARS=3`。
- **問題：** `economy-balance.md` 所稱「3 遊戲年」實際為 1,080 天，即 **9 個遊戲年**；「第一年末」所取 day 359 實為第 3 年末。FMAX-P10 P2-01 只修正了 `run-world-crisis`，此 runner 未被處理。
- **影響：** 同一 horizon 的 Before／After 相對比較不受影響，但絕對的每年金幣數被高估 3 倍。
- **修正：** 在報告補註，或改用曆法常數重跑。
- **Regression：** runner 內斷言 `endAt === years * daysPerSeason * 4 * 1440`。

### P3-02：`convertCropGoodToFood` 沒有檢查角色狀態

- **位置：** `src/engine/rewardActions.ts:95-109`。
- **問題：** 未檢查角色存活、是否在戰鬥或礦坑，與其他 action 不一致。手機底部導覽可在戰鬥中切到「物品」並轉換。目前影響可忽略（戰鬥中用不到食物）。
- **修正：** 加上與 `actionBlocker` 相同的守衛。
- **Regression：** 戰鬥中或角色死亡時呼叫應被拒絕，狀態不變。

---

## D. Suspected Risks（未確認，不算缺陷）

| ID | 疑點 | 最小驗證方式 |
|---|---|---|
| S-01 | `regionalCrisis.baseCooldownDays: 360` 與精靈旅人 `cooldownDays: 360` 可能也是依 360 天一年設定，實際等於 3 個遊戲年。Phase6 報告記為「受控 baseline」，規格未定義期望頻率。 | Owner 確認意圖；若原意為「1 年」，應改用曆法常數。 |
| S-02 | 已交付給防衛者的裝備，只在該防衛者仍位於 `slice(0, targetDefenders)` 時計分。對方受傷、退休、死亡或被選為接班人後，裝備效果消失，但仍佔用分配上限。 | 測試：分配裝備 → 防衛者受傷 → 比較 `equipmentEffect` 與剩餘可分配欄位。 |
| S-03 | 世界時間流動時，每筆 tick 都序列化並寫入整個 state（約 8 萬至 38 萬字元）加上 pending；低階行動裝置在 x20 下的效能未量測。 | 實機於 x1／x20 量 30 分鐘 frame time 與存檔耗時。 |

---

## E. Test Coverage Gaps

1. **G-01：** `contentFamilies.test.ts:134-142` 測試影響素材等於基本素材時給了 **4 個** resin，正好避開 P1-01；沒有「剛好足量」的邊界測試。
2. **G-02：** 沒有「任何公開 action 之後，狀態都必須能通過 `deserialize`」的不變條件測試。P1-01 正屬此類，658 項測試皆未發現。
3. **G-03：** Store 測試把 quota 失敗模擬成一次性事件（`gameStore.test.ts:317-374`），且「archive 無法使用時照常進行」被當作預期行為；未測 pending 長期成長與配額的交互。
4. **G-04：** Phase10-E browser stress 將世界時間設為暫停（`scripts/phase10/e-stress.mjs:223-224`），20 分鐘只產生 259 筆 journal；瀏覽器中從未測過時間持續流動時的存檔與 journal 行為。
5. **G-05：** Determinism replay（`phase10Determinism.test.ts`）只是單回合 fixture（strength=1000）；Long-world 為 No Intervention、沒有接班。「鍛造、危機、接班後中途 save／reload」的 replay 未覆蓋。

---

## F. Accepted Product Findings（不算新 Bug）

- **P10-F03 Threat Saturation：** KEEP V0。本次未發現危機狀態轉移或重複結算的程式錯誤。
- **P10-F04 Merchant：** NOT MODELED。現有買賣價差（買價約為賣價 2 倍、城鎮 8 折）未發現套利或負數金額。
- **P10-F02 Crafting zero-XP chore、P10-F05 Human fun／retention：** DEFERRED。
- **IndexedDB quota 與成長量：** 仍屬已接受風險；本次補上實測數字（x1 約每小時 150 萬字元）。P2-01 則是新的程式路徑缺陷，與此項區分。
- **未驗證的瀏覽器與實機：** 例如 Safari ITP 可能清除儲存資料。
- **其他仍有效項目：** E-P3-01 延遲離群值、E-P3-02 validator wrapper、E-P3-03 TypeScript 環境、P7-D-HIST、P7-K-WOLF-DROP-DRIFT、Boss 風險理解與平衡。

---

## G. Minimal Remediation Plan

1. **必須先修：** P1-01。需求依 materialId 加總比較，扣除前加防護。補上 G-01 的 22 配方邊界測試與 G-02 的 post-action 存檔有效性斷言。
2. **建議修：** P2-01。合併 `time` record、為 pending 設上限、讓 flush 不再依附於存檔成功。補上 G-03 的長期配額測試，以及 G-04 的「時間流動」瀏覽器 smoke test。
3. **可延後：** P3-01（補報告註記）、P3-02（加守衛）、S-01（待 Owner 確認意圖）、S-02、S-03、G-05。

---

## H. Final Verdict

**`CHANGES REQUIRED`**：P1-01 已確認且可重現，一般 UI 操作即會導致存檔無法重載。修正並重新審查前，不應進入 RC 驗收。此結論不涉及 Human Product Gate。

### Final Audit Questions

- **Q1：** 有。P1-01 未被 658 項測試發現。
- **Q2：** 有兩條路徑會導致無法讀取或無法存檔：P1-01（不合法狀態寫入存檔）與 P2-01（IndexedDB 長期失敗）。其餘路徑都有保護：損壞或未知版本存檔會被拒絕並保留原始資料、不會靜默覆蓋；Web Locks 防止多分頁同時寫入；pending 先寫 checkpoint 再追加 IndexedDB，中斷後可補寫。
- **Q3：** 是。所有遊戲 RNG 經過 `rngState`；traits、career、dialogue 使用獨立 seeded stream；未使用 `Math.random` 或真實時間；年份一律依 120 天遊戲曆計算。僅 S-01 常數意圖待確認。
- **Q4：** Crafting 有重複扣抵與負數存量（P1-01）。Loot 與 Boss 冷卻以 frozen encounter 防止重抽；交易、委託、危機捐獻皆先檢查後扣除，未發現物品複製。
- **Q5：** 未發現破壞世界延續的缺陷。接班會清空同行者、建立新 life 並遞增 generation；已故 NPC 引用依 `npc-N < nextNpcId` 驗證可保留。僅 S-02 裝備效果為設計疑點。
- **Q6：** 擁有權正確。所有 UI 寫入經 `game.act`／`advance`，projection 唯讀，未使用 `v-html`。唯一的競爭或耗盡問題在 journal（P2-01）。
- **Q7：** 見 G-01 至 G-05。最關鍵為 G-01：測試剛好給 4 個素材，避開缺陷條件。
- **Q8：** 必修：P1-01。建議修：P2-01。S-01 至 S-03 為待驗證的產品或技術風險。
- **Q9：** 目前不行；P1-01 修好並重新審查後才可以。

---

## JSON Summary

```json
{
  "reviewedCommit": "b11d7603b14219739cb7524105669dc187c23cf8",
  "headAtReview": "127351178052086055bbd46448e25ff7050f7640",
  "srcFingerprint": "3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842",
  "reviewerModelRequested": "Claude Opus 5.5 — High Reasoning",
  "reviewerModelObserved": "claude-opus-5-5 (runtime self-report); reasoning effort UNKNOWN",
  "independentContext": "Fresh Claude Code session; harness auto-injected claude-mem history titles at start (not used as evidence)",
  "verdict": "CHANGES REQUIRED",
  "findingsBySeverity": { "P0": 0, "P1": 1, "P2": 1, "P3": 2 },
  "confirmedFindings": [
    { "id": "P1-01", "severity": "P1", "title": "Influence material double-count drives material stack negative; save becomes unloadable", "files": ["src/engine/crafting.ts:215-225,345-346,443-446", "src/services/rewardValidation.ts:256-258"], "reproduced": true, "affectedRecipes": 22 },
    { "id": "P2-01", "severity": "P2", "title": "Unbounded journal pending deadlocks save/reset under persistent IndexedDB failure", "files": ["src/stores/gameStore.ts:20-24,45-81,96-101"], "reproduced": "code-path + growth measured; browser not reproduced" },
    { "id": "P3-01", "severity": "P3", "title": "Phase8 economy runner uses 360-day year (evidence labeling)", "files": ["scripts/phase8/run-life-economy.mjs:19"] },
    { "id": "P3-02", "severity": "P3", "title": "convertCropGoodToFood lacks actor-state guard", "files": ["src/engine/rewardActions.ts:95-109"] }
  ],
  "suspectedRisks": [
    "S-01 crisis/elf cooldown 360 days may encode 360-day year",
    "S-02 allocated defender gear effect lost when defender leaves active slice",
    "S-03 per-tick full-state localStorage write performance at x20 unmeasured"
  ],
  "verificationLimitations": [
    "No browser/device runs",
    "No typecheck/build rerun",
    "No long-world/Monte Carlo rerun",
    "P2-01 not reproduced in a real browser"
  ],
  "verificationExecuted": [
    "vitest 45 files / 658 tests PASS at HEAD (src identical to b11d760)",
    "P1-01 SSR reproduction",
    "recipe overlap scan 22/28",
    "journal growth measurement x1/x20"
  ],
  "requiredFixes": ["P1-01"],
  "recommendedFixes": ["P2-01", "P3-01", "P3-02"],
  "releaseBlocking": true,
  "nextOwnerAction": "Approve a P1-01 fix ticket (aggregate input requirements + negative-stack guard + 22-recipe boundary tests + post-action save-validity invariant), then request re-review; decide P2-01 scope and S-01 intent."
}
```

# Phase8-B 戰鬥平衡報告

**狀態：B2 controlled matrix 已結束；本報告只整理證據與 B3 建議，沒有修改 src、沒有 commit/push。**

## 結論

- normal-route 與 controlled matrix 是兩種不同測量，以下分節呈現，未合併勝率。normal-route 是三個 seed、三年期的 scripted policy；controlled matrix 使用合法取得的裝備來源／樣式與受控目標 fixture。
- measured route 的 Wolf King 455/459 早期撤退，是路線 runner 在角色 HP 低於 28% 時撤退、之後重選仍合法的最高階目標所形成的重試迴圈。它不是一般玩家撤退率，也不是 Boss spawn 缺陷；但同一 early controlled matrix 的死亡結果仍顯示早期 Wolf King 有產品難度訊號，應與路線數字分開解讀。
- controlled matrix 在 Mid 的 Cave Insect Queen、Wild Beast Apex、Frontier Goblin Warlord 呈現嚴重且 ID 級差異；目前仍不足以確定應修改哪個引擎參數。結論是保留為 B3 待驗證項目，不做全面 Boss 調整。
- 沒有證據顯示存在一種低成本 build 能跨 Early／Mid／Late、四個 rank、Boss ID 與取得來源全面支配其他選擇。可用性與樣本格不同，且勝率、回合、傷害與 prep 成本互有取捨。

## 證據範圍與方法

normal-route 使用相同 seeds 61101–61103、三個遊戲年度。v3 為 control；measured 只把每日 Normal 開戰上限由三場改為一場，高階目標仍可選。這些政策是重複的 scripted itinerary，不代表真人遊玩分布。

| 證據組 | 最新資料 | 範圍與解讀 |
| --- | --- | --- |
| v3 normal-route control | `b-runner/normal-route-attempts/v3/attempt-20261014T045140077Z/` | 1,138 場：Normal 1,059、Boss 79；Elite／MiniBoss 為 0。 |
| measured normal-route | `b-runner/normal-route-attempts/measured/attempt-20261014T045339779Z/` | 2,076 場：Normal 174、Elite 64、MiniBoss 1,103、Boss 735。 |
| Route 對照摘要 | `b-runner/route-matrix-attempts/attempt-20261014T050130566Z/route-combat-matrix.json` | 48 Boss rows、58 route rows；只比較 scripted route，不填 controlled build/source/style cells。 |
| Controlled combat | `b-runner/controlled-matrix-attempts/` 下各 band/source 最新 attempts | 每個 cell 目標 100 samples × 3 seeds；每 band/source 85 cells。細節見 [Boss progression](boss-progression.md) 與 [裝備 build 分析](equipment-build-analysis.md)。 |

Controlled matrix 的有效戰鬥列使用 8 個 Boss ID 與代表性 Normal／Elite／MiniBoss targets。Runner 以合法 public acquisition 取得裝備，再把 source item 複製到獨立戰鬥 fixture；依 Phase7 band 經 public progression 設 level，設定世界 gates 後以 canonical encounter option projection 與 public encounter action 驗證。Goblin Chief 的合法前置條件明確設為 bossAlive。這仍是受控比較，不證明自然出現率。`NOT_APPLICABLE` 保留原本原因；`INCOMPLETE` 保留已取得的部分樣本，不當作 300 次完整結果。

## normal-route：v3 control 與 measured policy

| Policy | 遭遇 rank 數 | 路線解讀 |
| --- | --- | --- |
| v3 | Normal 1,059；Boss 79；Elite 0；MiniBoss 0 | Adventure／Hybrid 的 Normal 上限為每日三場；高階遭遇不受此上限限制。 |
| measured | Normal 174；Elite 64；MiniBoss 1,103；Boss 735 | 每日最多一場 Normal；未清空地區並保留更高階目標選擇。更高階遭遇可重複出現。 |

這些總數不可與 controlled matrix 的 100×3 samples 相加。v3 與 measured 都以三個 seed 執行，惟 measured 的政策和各路線的成長／備戰路徑不同。詳盡 per-ID、per-band 自然遭遇數列於 [Boss progression](boss-progression.md)。

### Wolf King 455/459 撤退：runner policy 與產品訊號分開

在 measured 的 **Adventure／Early** 子路線，Wolf King 共 459 場：4 勝、455 退、0 死，撤退率 99.1%。其 turns P10/P50/P90 為 3/4/4，potion 使用 0，gross damage taken P50 為 30，單場直接金幣 risk-adjusted reward 為 0.65。這是 `route-combat-matrix.json` 的 route row；同一 measured run 的 Hybrid／Early Wolf King 為 36 勝、0 退，顯示成長與路線差異會改變結果。

runner 在 `scripts/phase8/run-normal-routes.mjs` 以目前最高可用 rank 開戰；HP 低於 28% 或達 9 turns 便撤退，低於 55% 且有藥水時才喝藥。撤退不擊敗 Wolf King，因此狼族前序條件仍滿足、Boss 仍可遇見、勝利冷卻尚未開始；下一個可行日又選到同一最高階目標。455 次不是 455 個獨立玩家或新 Boss 出現機會，而是 scripted policy 在相同未解狀態反覆挑戰。

**判斷：** 99.1% 是 runner policy 結果，不是產品勝率或真人撤退率。Early controlled matrix 的 Wolf King 另外有 4,400 筆跨來源／樣式樣本，其中 4,370 勝、30 死，且 Potion mean 1.50、不同合法 cell 的 turns P50 落在 7–13；這是獨立的產品難度訊號。它不是 455/459 的成因，也不應用路線比率估算。

## 量測界線與來源追溯

- v3 與 measured route manifests 均記錄 HEAD `ea75684e1533b9d55a992495c256acfb58c5c4e6`，以及 113 個 `src/` 檔案的 fingerprint `38bb27070c0e52448d8bdb4a258c517b651cf2b6266d6606d97ea1a57301040d`，足以確認兩個 route attempt 的 src fingerprint 相同。Manifest 沒有 fingerprint Phase8 runner scripts，因此 HEAD 是記錄的 base commit，不足以證明 runner script 與 commit 完全一致。
- controlled matrix attempt manifests 只記 schema、job、cell 與 fixture 規則，沒有 HEAD、runner fingerprint 或 source fingerprint。不可把路線 fingerprint 倒填成 controlled matrix 的 fingerprint；Lead 執行記錄是 `b-runner/lead-exec-b2-matrix.log` 與 `b-runner/lead-exec-b2-bossgear.log`。
- Lead 回報：Phase8 scripts 的 node --check 通過、route-policy 13/13、controlled matrix helper 8/8、Boss save/reload 2/2；此報告未重跑驗證。`bossSaveReload.test.ts` 的 2/2 覆蓋 Goblin Chief 狀態往返及 Wolf King 勝利冷卻往返。
- 本報告是相對 Phase7／A5 v3 control 的 B2 比較；沒有產品數值 Before/After，因為 B2 是 runner／受控量測，未實作產品平衡修改。controlled matrix 的測試 source 與 delivery commit 關聯未由 attempt manifest 保存，故標為未能從 artifacts 確認。
- 獨立 review 尚無可引用紀錄；不宣稱已完成 review。此工作保留為未提交報告。

## Historical Failures

以下只作歷史追溯，不作本報告的數值來源：

- 早期 `scripts/phase8/combat-matrix.mjs:49` 語法錯誤造成 route policy 測試、manifest build 與 summary 失敗；Lead 後續修正後 node --check 全數通過、route-policy 13/13、manifest 與 route summary 通過。原失敗記錄保存在 `b-runner/lead-exec-b2.log`、`lead-exec-b2-rerun.log`。
- 初始 Wolf tie-break fixture 不含合法前序 Pack Leader 狀態，測試期望順序不合法；修正 fixture 後 13/13 通過。遊戲規則要求先擊敗 Pack Leader 才能遇到 Wolf King，並未因此改 engine。
- Boss Gear 初次 runner provenance 判斷把非 Legendary 的 null provenance 誤作無 Boss reward。Lead 查證 `src/engine/itemGeneration.ts:250` 後確認是 runner 偵測錯誤，最新 runner 改以專屬 Boss gear base／instance 判斷，沒有 engine defect。被取代的 FAIL attempts 保留在 Boss progression 的歷史清單，數值不納入彙總。

## B3 change proposals

本節依 spec §4 五問評估候選項。B3 目前沒有產品修改；「未修改」是目前決策，不代表候選問題不存在。

### H1：狼族追蹤／進度 tie-break

**NO ENGINE CHANGE。**

1. 原始問題：舊 v3 runner 在已擊敗的灰狼仍合法時重選灰狼，令後續狼鏈不曝光。
2. 證據：A5 v3 對 Adventure／Hybrid 記錄 552 場 Gray Wolf、0 場後續狼；B2 runner policy 修正後最新 route 對照出現 Alpha Wolf、Pack Leader、Wolf King。route-policy 最終測試 13/13 通過。
3. 預期改善的玩家決策／世界行為：只改善測試路線的狼鏈進度曝光；產品玩家的 encounter rule 不需改。
4. 實際修改：B2 僅 runner／fixture；沒有 src engine 修改。
5. 退化風險：腳本可能過度追逐狼族而降低自然路線代表性；已以 v3／measured 分開留檔。沒有產品規則退化證據。

### H2：全域 threat 門檻或 rank exposure

**NO CHANGE。**

1. 原始問題：v3 的高階內容暴露少，容易誤判為 Elite／MiniBoss 或 Boss 無法出現。
2. 證據：v3 Elite／MiniBoss 為 0；measured 有 64 Elite、1,103 MiniBoss、735 Boss，且 B2 記錄若干 legal-window N/A／NOT OBSERVED；自然路線不是 availability denominator。
3. 預期改善的玩家決策／世界行為：若問題成立，應提高合法高階目標可見度；但本次資料沒有證明全域門檻阻止一般玩家進展。
4. 實際修改：無；沒有調低 threat threshold 或改 spawn profile。
5. 退化風險：可能增加世界威脅、危機、材料／Boss reward 暴露，並影響非戰鬥 Life 路線；目前沒有足夠證據承擔此風險。

### H3：Mid Boss 數值／存活窗口

**NO CHANGE，列為需單 Boss 因果追查的候選。**

1. 原始問題：Mid controlled matrix 顯示 Cave Insect Queen 77/5,300 勝、Wild Beast Apex 1,030/5,300 勝、Frontier Goblin Warlord 396/5,000 勝；同 band 的 Slime Heart、Chief、Wolf King 則全勝。
2. 證據：B2 15 個最新 source/band attempts，Boss per-ID cell metrics 見 [boss-progression.md](boss-progression.md)。這是受控 gear/style fixture，不是自然 route win-rate。
3. 預期改善的玩家決策／世界行為：若後續確認是某 Boss 的攻擊／耐久數值不匹配，可讓備戰、撤退或選擇替代目標變成有意義的決策。
4. 實際修改：無；目前結果未 isolate 哪個 Boss stat 或 mechanic 造成差異，亦不設定 spec 未批准的 win-rate 門檻。
5. 退化風險：調整攻擊／HP 會跨 band 影響相同內容、戰鬥時間、藥水消耗、Boss reward pace 及 cooldown 循環；必須先以單 Boss 對照再決定。

### H4：Boss spawn profile／cooldown

**NO CHANGE。**

1. 原始問題：多個 ID × band 在三年 scripted routes 中沒有自然遭遇，部分 controlled acquisition cells 也缺 canonical legal witness。
2. 證據：route matrix 與 B2 cell-results 的 `NOT OBSERVED`／`NOT_APPLICABLE` 理由；六個內容 Boss 的 profile 仍有明確合法窗口，Wolf King 與內容 Boss 的 cooldown 規則亦有測試。
3. 預期改善的玩家決策／世界行為：若窗口確實過窄，擴大 profile 可能提升目標可見性；本資料沒有測出普通玩家的合法窗口機率或等待成本。
4. 實際修改：無；沒有改 profile、cooldown 或 bossProgress 門檻。
5. 退化風險：過度擴窗會增加 Boss reward 供應與重複挑戰，影響 progression；先補合法自然 witness／可見性觀測。

### 掉落 affix／Masterpiece 取得率

**NO CHANGE。**

1. 原始問題：有些 source/style cells 在預算內沒有取得目標 affix 或 Masterpiece。
2. 證據：Adventure Loot 36 個 bounded INCOMPLETE cells 到 18 次 acquisition；Masterpiece 64 個 cells 到 16 次 craft 未觀察到符合結果。
3. 預期改善的玩家決策／世界行為：若稀有度過高，提升命中可縮短重複刷取；目前只是右設限的「未觀察」資料，不能估實際機率。
4. 實際修改：無；未調高 bound，也未改 drop／craft 機率。
5. 退化風險：提升命中可能降低 build 差異、供應稀有裝備並改變經濟；目前沒有足夠的完整試次作決策。

## Root source correlation and B acceptance note (2026-10-14)

- Root recomputed the `src/` fingerprint with the runner's own method after all B2 runs: 113 files, `38bb27070c0e52448d8bdb4a258c517b651cf2b6266d6606d97ea1a57301040d` — identical to both route manifests. `src/` gained only `src/engine/bossSaveReload.test.ts` (created 12:47 local, before every controlled matrix job), so route and controlled matrix runs exercised the same product source. Base commit `ea75684`; product code identical to Phase7 delivery `b71201e`.
- Root product decision on H3: Mid controlled results are fight-to-death fixtures (77 win / 0 retreat / 5,223 death for Cave Insect Queen); natural routes retreat instead (0 deaths) and Late controlled wins are 65–97%. Treated as an intentional high-risk visible-before-beatable Boss tier, not a defect. **NO CHANGE** in B. Findings carried forward: **B-F1** Bosses visible long before they are beatable — goal/danger clarity handed to Phase8-E; **B-F2** large per-Boss difficulty spread (Slime Heart 100% Mid vs Queen 1.5%) recorded for F final review.
- A-F1 resolved in B: two long-world tests timed out on this Windows machine even when idle (500-year measured 24–25 s alone vs 30 s limit; 50-year 2.5 s alone vs default 5 s, exceeded under suite load). Timeouts raised to 90 s and 15 s (matching the existing 100-year 15 s); assertions unchanged. Failing evidence retained in `b-check-run/npm-run-check-windows-b.log`; passing `npm-run-check-windows-b-timeoutfix.log` (38 files / 629 tests + build).

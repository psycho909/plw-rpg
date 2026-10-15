# Phase8 Final Review Draft (F2)

**狀態：Draft，待 Lead 定稿。** 本文件依 Phase8 spec §§16–19 彙整已交付證據；Human Product gate 維持 DEFERRED。Normal fresh-save routes、controlled fixtures 與長世界參數對照各自回答不同問題，不可互相代替。未設定正式 target 的指標僅報觀察分布與限制。

## 11 Acceptance Gates

| Gate | Draft 判定 | Evidence and limits |
|---|---|---|
| Engineering | **PASS WITH FINDINGS** | Lead 記錄 `npm run check`：38 files / 631 tests、vue-tsc 與 build PASS（[`f-check-run/npm-run-check-9118454.log`](f-check-run/npm-run-check-9118454.log)）。A-F1 Windows long-world timeout 已調整並在後續 check 通過；測試環境 spawn EPERM 的歷史限制見 [`bugs.md`](bugs.md)。 |
| Combat Balance | **PASS WITH FINDINGS** | B controlled band/source samples 有不同進度結果，且未見單一 build 在所有情境無條件最優；controlled win rate 不代表 normal-play experience。詳見 [`combat-balance.md`](combat-balance.md)、[`equipment-build-analysis.md`](equipment-build-analysis.md)。 |
| Boss Progression | **PASS WITH FINDINGS** | B normal measured route 記錄 Boss 遭遇、勝利與撤退；B-F1/E-F2 記錄 eligibility reasons 可見，但缺少明確危險估計／建議等級。A v3 沒觀察到 Elite/MiniBoss 是 runner policy defect 證據，不能推論玩家暴露率。詳見 [`boss-progression.md`](boss-progression.md)、[`baseline.md`](baseline.md)。 |
| Equipment Diversity | **PASS WITH FINDINGS** | Controlled 組合顯示情境差異，沒有證明普遍最優 build；樣本與 fixture 限制見 B 報告。詳見 [`equipment-build-analysis.md`](equipment-build-analysis.md)。 |
| Reward Balance | **PASS WITH FINDINGS** | Loot controlled sample 保留 cohort 與 deterministic mirrors；normal routes 有素材、craft 與裝備變化資料。自然遭遇分布受 runner policy 影響。詳見 [`loot-reward-distribution.md`](loot-reward-distribution.md)、[`baseline.md`](baseline.md)。 |
| Life Progression | **PASS WITH FINDINGS** | C-F1 V4 同種子前後驗證降低 farming 銷售額；Life crops/skills 有可觀測成長。676 starterSpear crafts 中 670 次為零 XP，是 chore-risk 訊號，不能當成人類感受結論。詳見 [`life-progression.md`](life-progression.md)、[`economy-balance.md`](economy-balance.md)。 |
| Economy | **PASS WITH FINDINGS** | C controlled Buy→Craft→Sell 25 loops 中 24 次虧損；季節性採集製作路線仍有利潤。Merchant stock/restock **NOT MODELED**，因此不可據此判斷實際商店流動性或完整套利風險。詳見 [`economy-balance.md`](economy-balance.md)。 |
| World Balance | **PASS WITH FINDINGS** | D1 54/54 checkpoint parity 且人口、食物、繁榮持續；Threat 3 占 99.6–99.7%。D2 108 checkpoints 中 11/12 valid；G1 Adventure 無危機且無階段轉換而無效。Owner 決定 **KEEP V0**。詳見 [`world-crisis-balance.md`](world-crisis-balance.md)、[`long-world.md`](long-world.md)。 |
| Reward Pacing | **PASS WITH FINDINGS** | E-F1 將 1,276/1,423 no-progress 分為低信心「沒有可理解的下一目標」；147 是 runner daily-encounter-cap 限制。實際玩家目標理解 DEFERRED 至 Human gate。詳見 [`reward-pacing.md`](reward-pacing.md)。 |
| Stability | **PENDING F1** | Long-world D1/D2 與 Phase7-K 的 checkpoint/save-reload/continuation parity 已整理於 [`long-world.md`](long-world.md)。Browser regression、stress、實際 IndexedDB/quota 與 browser-visible storage 證據尚待 F1；不得以模擬 parity 代替。 |
| Human Product | **DEFERRED** | Phase8 自動化證據不驗證 Human Fun、Retention、玩家目標理解或 UX 清晰度。需 Owner 明確啟動人類評估。 |

## Browser-owned evidence placeholders (F1)

以下檔案由 F1 負責；F2 不建立或修改：

- Browser Regression — **PENDING F1**：[`browser-regression.md`](browser-regression.md)
- Browser Stress — **PENDING F1**：[`browser-stress.md`](browser-stress.md)
- Agent Role Playtests — **PENDING F1**：[`agent-role-playtests.md`](agent-role-playtests.md)
- Performance / Storage — **PENDING F1**：[`performance-storage.md`](performance-storage.md)

## Definition of Done (15)

| # | Draft 狀態 | Evidence-based disposition |
|---:|---|---|
| 1 | **PARTIAL** | A scripted routes 與 B controlled progress bands 提供遭遇／挑戰樣本；沒有代表人類玩家從 Early 到 Late 的證據。見 [`baseline.md`](baseline.md)、[`combat-balance.md`](combat-balance.md)。 |
| 2 | **PASS WITH FINDINGS** | Boss eligibility 與理由可見；Boss ID / band 風險差異有 controlled evidence。危險估計、建議等級和玩家理解未測。見 [`boss-progression.md`](boss-progression.md)。 |
| 3 | **PASS WITH FINDINGS** | B controlled build matrix 未顯示跨所有情境的無條件最優 build；不代表所有 build 都有平衡價值。見 [`equipment-build-analysis.md`](equipment-build-analysis.md)。 |
| 4 | **PASS WITH FINDINGS** | Normal routes 與 controlled craft/sell probes 顯示不同收益路徑；不同 runner policy 的結果分開呈現，merchant stock/restock 未建模。見 [`economy-balance.md`](economy-balance.md)、[`baseline.md`](baseline.md)。 |
| 5 | **PASS WITH FINDINGS** | V4 crops 有收成／收入能力變化；Smithing craft XP cap 同時呈現 676 總 craft、670 零 XP，為 chore-risk 訊號。見 [`life-progression.md`](life-progression.md)。 |
| 6 | **PASS WITH FINDINGS** | Controlled Buy→Craft→Sell 25 loops 有 24 次虧損；商店庫存與補貨未建模，不能宣稱已排除所有套利。見 [`economy-balance.md`](economy-balance.md)。 |
| 7 | **PASS WITH FINDINGS** | D1 V0 有持續危機，Threat 3 長期飽和；Owner 明確決定 KEEP V0，並保留 High finding。見 [`world-crisis-balance.md`](world-crisis-balance.md)。 |
| 8 | **PASS WITH FINDINGS** | D1 10/50/100 年 checkpoint 中人口、food、prosperity 持續，危機均解決；三個 seeds 和腳本情境限制見 [`long-world.md`](long-world.md)。 |
| 9 | **PARTIAL** | Controlled loot 與長世界資料可檢視生成結果；沒有自然玩家 loot / browser soak 證據，瀏覽器部分待 F1。見 [`loot-reward-distribution.md`](loot-reward-distribution.md)、[`long-world.md`](long-world.md)。 |
| 10 | **PASS WITH FINDINGS** | E 已量測 no-progress 並拆出低信心 goal clarity 與 runner policy cap；Human goal clarity 仍 DEFERRED。見 [`reward-pacing.md`](reward-pacing.md)。 |
| 11 | **PASS WITH FINDINGS** | 147/1,423 為 runner daily encounter cap 限制；其餘分類亦不構成人類等待結論。見 [`reward-pacing.md`](reward-pacing.md)。 |
| 12 | **PASS WITH FINDINGS** | D1/D2/Phase7-K 有 checkpoint save/reload 與續行 parity；Phase8 D 不是 migration 專項覆蓋。完整 check 包含既有測試，但本次沒有 migration 專項結果。見 [`long-world.md`](long-world.md) 與 check log。 |
| 13 | **PASS WITH FINDINGS** | D1 54/54 parity；D2 108/108 parity但只有 11/12 valid，G1 Adventure 無效；限制與來源分列。見 [`long-world.md`](long-world.md)。 |
| 14 | **PASS WITH FINDINGS** | 現有 findings 未標示未解 P0/P1 Product Defect 阻擋交付；D-F1 是 High product finding 並依 Owner 指示 KEEP V0，其他產品 findings 仍保留或 deferred。這是根據目前紀錄整理，待 Lead 定稿，不等同於新增 severity 判級。見 [`bugs.md`](bugs.md)、[`balance-findings.md`](balance-findings.md)。 |
| 15 | **PASS WITH FINDINGS** | V4 farming 有同種子 before/after；D2 variants 是 in-memory 對照而未套用產品 source。其他重大平衡修改沒有被此報告宣稱。見 [`economy-balance.md`](economy-balance.md)、[`long-world.md`](long-world.md)。 |

## Q1–Q7 evidence-only answers

### Q1 — Early 到 Late 是否一直有合理且可達成的下一挑戰？

目前證據不足以對人類玩家作全程結論。A v3 只代表固定 seeds 與 scripted policy；B 有 controlled progress-band 遭遇樣本，兩者均未量測玩家能否找到並理解下一挑戰。Elite/MiniBoss 在 A v3 未觀察到，且已由 B 歸因為 runner over-clearing 與 grayWolf tie-break 的 policy defect，不能作為玩家稀少遭遇的證據。Human goal clarity 延後至 Human gate。見 [`baseline.md`](baseline.md)、[`combat-balance.md`](combat-balance.md)、[`reward-pacing.md`](reward-pacing.md)。

### Q2 — Build、Crafting 與 Life 是否形成有意義的選擇？

B 的 controlled build/band matrix 未找到對所有情境都無條件最優的 build。C 有 V4 crop 成長、季節性 farming/crafting 收益及 Buy→Craft→Sell controlled loss 結果；Life route 的 670/676 零 XP crafts 暴露重複製作的 chore-risk。Merchant inventory/restock 未建模，玩家選擇是否易懂也未經 Human gate。見 [`equipment-build-analysis.md`](equipment-build-analysis.md)、[`life-progression.md`](life-progression.md)、[`economy-balance.md`](economy-balance.md)。

### Q3 — 新 Boss 是值得準備的冒險目標，還是只有更高數值？

Controlled tests 顯示 Boss ID × band 的風險差異，且不同 build 結果不一；normal measured route 有 Boss 勝利與撤退資料。這些證據支持存在情境與難度差異，但不足以證明人類認為值得準備。B-F1/E-F2 指出 eligibility reason 可見，明確 danger estimate/recommended level 缺席；玩家對價值的理解未測。見 [`boss-progression.md`](boss-progression.md)、[`combat-balance.md`](combat-balance.md)。

### Q4 — 沒有玩家介入時，世界是否合理演化？

D1 六個 scenario、三 seeds、10/50/100 年共 54 checkpoints 均有 save/reload 與續行 parity；所有危機均解決，無 Game Over/world reset，人口與 food/prosperity 維持。另一方面 V0 Threat 3 占 99.6–99.7%，所以聚落連續性不能解讀為威脅平衡良好。D2 顯示參數 tradeoff，且 G1 Adventure 因無危機無效。Owner 決定 KEEP V0。見 [`long-world.md`](long-world.md)、[`world-crisis-balance.md`](world-crisis-balance.md)。

### Q5 — 資源、金幣、裝備、作物與危機是否形成健康長期循環？

證據顯示 V4 季節作物收益、crafting 收入與 controlled trade probes；Boss、裝備及 loot 有不同測量 lane，D1 世界危機持續但 Threat 長期飽和。由於 merchant stock/restock 未建模、loot normal-player 樣本受 route policy 限制，且 long-world 只有三個 seeds，現有資料不足以宣稱整體循環已健康。見 [`economy-balance.md`](economy-balance.md)、[`loot-reward-distribution.md`](loot-reward-distribution.md)、[`long-world.md`](long-world.md)。

### Q6 — 下一個目標容易理解嗎？重複等待來自何處？

E 的 1,423 筆 no-progress 中，1,276 筆只可低信心歸類為「沒有可理解的下一目標」；147 筆是 runner daily encounter cap 限制，非合法世界等待。這些是 instrumented policy trace 的分類，不能推導人類理解或無聊程度。Boss eligible reasons 可見，但缺少危險預估／建議等級；Human goal clarity DEFERRED。見 [`reward-pacing.md`](reward-pacing.md)、[`boss-progression.md`](boss-progression.md)。

### Q7 — 是否為測試數字犧牲自由人生體驗？

交付資料明確將 normal route、measured route、controlled fixtures 與 runner 限制分開，未引入產品數值 target。A 的 Elite/MiniBoss 零值已標示為 runner policy defect；D2 參數變體未寫入產品 source，D-F1 依 Owner 決定保留 V0。這降低以 runner 指標直接改產品的風險，但 Human fun/retention 未測，無法對實際自由人生體驗作結論。見 [`baseline.md`](baseline.md)、[`long-world.md`](long-world.md)、[`balance-findings.md`](balance-findings.md)。

## Source correlation and review handoff

| Evidence lane | Tested base / source correlation | Note |
|---|---|---|
| A v3 normal baseline | A manifest base HEAD `eb4946c`; `src/` fingerprint `c07…` (see manifest in the attempt) | This is a scripted route policy; it is not a player probability. |
| B normal measured routes | B report and retained `b-runner/normal-route-attempts/` manifests | Different rank-selection policy from A v3; keep as diagnostic lane. |
| C V4 / D1 | D1 base HEAD `5e223be`; `src/` fingerprint `6ab18d…` | V4 source measured; D1 scenarios use that product source. |
| D2 controlled | Base HEAD `c489ff1`; same `src/` fingerprint `6ab18d…` | Growth/guard candidates were runner-only in-memory overrides. |
| Current delivery | HEAD `9118454` | Base HEAD is not runner SHA or source fingerprint. See per-report manifests and summaries for detail. |

Independent reviews are retained in [`d-review/`](d-review/) and [`e-review/e-max-review.md`](e-review/e-max-review.md); this F2 draft is not the Lead's final acceptance. F1 browser results and Lead adjudication remain pending.

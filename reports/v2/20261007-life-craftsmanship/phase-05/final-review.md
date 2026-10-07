# Phase5 最終工程驗收

Phase5 工程驗收：ACCEPTED / PASS WITH FINDINGS。正式終端與最終文件 delta review 均已接受。正常 runtime 接受依據為 [j-runtime-acceptance](j-runtime-acceptance.json)。

## Source 與範圍

Branch `v2x/reward-core`；受測 application source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`。79 個 src 檔與 425 項全量測試的 build 完全相符，見 [source correlation](source-commit-correlation.json)。後續 QA 文件提交另行識別，不把文件 commit 冒充 runtime source。

僅 Phase5 Life Reward & Craftsmanship：四項 data-driven recipes、共用裝備生成、素材偏向、smithing 能力與畢業上限、傑作、鍛造身份、有限售價加成、既有住宅工作台，以及 Adventure → Life → Adventure。未開始 Phase6–10／V3。

## 已有實際證據

- 全量 regression：425/425 tests、22/22 files、typecheck、production build 通過；見 [regression](regression.md)。
- 正常 Hybrid：6.26 秒、70 次 UI 操作、兩次 native save/reload；實際狼牙取得、扣除一份素材、item-2 製作／穿戴／保存、返程戰鬥成立，見 [hybrid-loop](hybrid-loop.md)。角色等級、生命、時間和 RNG 同時變化，單場勝利不是裝備因果效果證明。
- I：100000 次 craft-context 裝備生成、30 profiles、6624 combat rows／13248 實際戰鬥；不是 100000 次完整消耗資源的 craft transaction，見 [crafting-analysis](crafting-analysis.md)。
- 核心獨立 review 已接受；一般 UI 與 QA helper delta 已接受，見 [core review](j-core-independent-review.md)、[delta review](j-qa-delta-independent-review.md)。
- 真 Chromium Stress：1202.14 秒、8899 次 UI 操作、103 次 native save/reload、108 checkpoints；Life Agent：1803.22 秒、13936 次 UI 操作、155 reloads、158 checkpoints。兩者 supervisor COMPLETE_PASS、來源前後一致、所有 page/console/request/HTTP/rejection/storage/cleanup error 為零。先前五次正式失敗與 Life 中斷仍保留，見 [bugs](bugs.md)、[browser-stress](browser-stress.md)、[agent-life](agent-life.md)。

## 七項 Gate

| Gate | 最終工程判定 | 證據／限制 |
| --- | --- | --- |
| Engineering | PASS WITH FINDINGS | 425 tests/typecheck/build、migration/save/determinism、H/I/J runtime 及獨立 review；原 failure 與 QA evidence 限制保留 |
| Crafting System | PASS | 正常 Material → Craft → Valid Item／equip／save/reload 成立 |
| Material Meaning | PASS WITH FINDINGS | 19 paired contrasts 與正常素材扣除；低 skill 的 Common／無詞綴仍可能使早期收益不明顯 |
| Mastery | PASS | recipe unlock、quality floor、XP graduation、derived identity；Life Smithing1→5、153 crafts，不代表已探索全部進階目標 |
| Economy | PASS WITH FINDINGS | 30 bought-input profiles 期望 margins −63.65..−10.06g；正常交易守成本；不是完整長期市場平衡證明 |
| Adventure × Life | PASS WITH FINDINGS | H 實際素材→craft→equip→返程戰鬥，I actual controlled combat；單場 H 有等級／HP／RNG 混淆 |
| Life Reward | PASS WITH FINDINGS | 初期採集→製作→recipe/quality unlock→smith identity 的正常進展成立；後段 runner 在publicbench／低gold重複，住宅購置／進階station／傑作的自然目標未完整探索 |

Human：**DEFERRED / NOT APPLICABLE AT THIS STAGE**。Agent Exploratory 與 browser runtime 工程驗證不代替真人 Fun／Retention；本次不宣告 Product Fun Passed。

## Browser 性能範圍

Stress heap used 11.2–80.9 MB、終端55.4 MB；Life 9.9–80.2 MB、終端57.3 MB，reload 間波動而非持續上升。DOM／listeners 同樣回落。Stress save81138→154165B、Life81289→180913B；append-only IDB records29→6695／31→10303，journalPending=0、origin storage peak約1.92MB、零storage errors。裝備和NPC數隨正常遊玩成長，eventCount capped150。未觀察到觸發§56的短期不穩定、持續heap/DOM失控，亦未改 persistence/renderer architecture，因此不延長60/120分鐘。此20/30分鐘窗口不能排除更長期leak或資料累積問題。

## §76 五題證據回答

1. 冒險素材增加了可選 craft 偏向用途。Fang／Hide／Moon 的 paired comparisons 支持不同詞綴機率；正常 H 證明素材實際流入裝備。低 smithing 仍可能得到 Common／無詞綴，不能聲稱每次都有可見提升。
2. Craft 可選 recipe、投入素材並留下 maker／time／recipe provenance，也接入技能、身份與住宅 utility；生成仍含 RNG，玩家的主觀 fantasy 尚未真人驗證。
3. Recipe unlock、Smithing 3／5 的品質下限、素材詞綴偏向與有限 XP progression 提供逐步控制。Epic／Legendary 機率沒有因素材提升；傑作不是第六稀有度，也沒有額外 raw stat buff。
4. 鍛造師／傑作匠師身份、首次傑作 +3 reputation、住宅全天工作台與費用折扣已有系統證據。當前 runner 不購買住宅或主動追求所有進階配方；不能把 policy 的未覆蓋直接寫成產品功能失敗。Life 正常1→5、153次製作，產生鍛造師、礦工與冒險者身份，名聲26／熟面孔。30m可見starterSpear被金幣不足拒絕，planner longGoal仍提ironShortSword；目標與當下可做事有落差，不能混為已取得進階能力。無property購置、無browser傑作證據，該部分由定向system測試支持而非宣稱自然探索完成。
5. 正常狼牙 → craft → equip → save/reload → adventure 成立；I 的受控矩陣補足實際 combat outcome 比較。不是所有 crafted gear 都比 loot 強，也不能用 H 單場勝利排除等級／生命／RNG 混淆。

## 限制與產品發現

[life-reward-findings](life-reward-findings.md) 與 [bugs](bugs.md) 分開保存 Product Finding 和 defect。買入素材的負期望值不是完整市場／時間／stamina equilibrium 保證；短 Hybrid 不代替長時間測試；Agent 不是真人。Human validation 不阻擋這個開發階段的 Engineering QA，不宣告 Product Fun Passed。

## 交付

J 真實時長、性能趨勢與正式終端結果已完成獨立核對。最終文件 delta review ACCEPT（e80607d4…），正式 Ticket 已結案。QA交付commit為包含本文件與accepted Ticket的提交，Git同步由Root最終回報精確SHA與遠端核對；不改寫runtime source provenance。受測app commit始終為f9f969c9d3dfa3cbf1c379bec98eafab765b11cc。

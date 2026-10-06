# 長期世界驗證

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`。3 個 normal seeds **17／909／2026 × 10／50／100 年 PASS**。這是 headless engine validation，不能取代真 Browser Soak。

公開 simulate、save/load、自然死亡後公開 chooseSuccessor；沒有重建世界掩蓋人口／RNG。每年 batch 與逐日運行＋每年重載世界核心 state hash 完全一致，並檢查數值 finite、IDs、人口容量、生命資料／career／identity、NPC memory、ownership、reputation、event/history與save。原始 runner：[long-term-validation.mjs](engine/long-term-validation.mjs)。

| Seed | 年 | 總人口 | checkpoint bytes | history | 近期 events | reload 次數 |
| --- | --- | --- | --- | --- | --- | --- |
| 17 | 10 | 80 | 212,808 | 97 | 150 | 10 |
| 17 | 50 | 80 | 314,316 | 307 | 150 | 50 |
| 17 | 100 | 80 | 361,136 | 627 | 150 | 100 |
| 909 | 10 | 80 | 215,865 | 91 | 150 | 10 |
| 909 | 50 | 80 | 300,383 | 298 | 150 | 50 |
| 909 | 100 | 80 | 326,261 | 608 | 150 | 100 |
| 2026 | 10 | 80 | 232,932 | 103 | 150 | 10 |
| 2026 | 50 | 80 | 322,209 | 303 | 150 | 50 |
| 2026 | 100 | 80 | 348,663 | 622 | 150 | 100 |

這些 bytes 是 engine serialized checkpoint，**不含完整 browser IndexedDB journal**。UI只render有界列表，不把DOM穩定當作journal有界。被動基線沒有玩家生活行動，所以 ownership／reputation維持0；另以正常非空路線補驗。

## 非空 Ownership 與 Identity / Reputation

seed909正常 farm/gather/trade/homeRest，67遊戲日取得 home、land、farmBusiness，rep28、gold885；food100時 supplyFarmFood(1)容量不足且 state完全不變。後續10／50／100年每年save/reload、自然死亡及正常接續居民，100年 active npc-105。原alden所有權仍保留，不冒稱資產自動轉給繼承者（現行規則沒有自動繼承）。checkpoint bytes 220380／293264／329745。見 [ownership-lifecycle](engine/ownership-lifecycle.json)。

| 經過年數 | Active character / age | Active identities | Reputation | Farming actions |
| --- | --- | --- | --- | --- |
| 10 | alden / 26 | resident, farmer, skilledFarmer, farmOwner | 28 | 84 |
| 50 | alden / 66 | resident, farmer, skilledFarmer, farmOwner | 28 | 84 |
| 100 | npc-105 / 51 | resident, farmer | 0 | 0 |

100年原角色已自然死亡；其 life／milestones／名聲與原所有權仍留在世界，當前居民的身份和名聲獨立初始化。`activeCharacter.life` 與 `originalOwner.identity` 都有非空checkpoint實證；不是只檢查空資料。

身份從正常 actions／skills／career／ownership形成，沒有手選Class；不同play routes與identity tests補充主動路線。空被動世界的resident不代表多種身份已自然形成。

## Featured NPC 與社會防禦

每 seed 6 Featured NPC，精確ID／完整name觀察初始age/job/career/traits/concern、位置、skills、記憶與後續退休／受傷／恢復／死亡。每 seed 自然死亡6、退休6；career變更26／24／24，skills變更251／241／242，injury/recovery 63/63、63/63、62/62。見 [featured-npc-lifecycle](engine/featured-npc-lifecycle.json)。這可證實生命軌跡，不能代替真人回答「我記得哪個NPC」。

100年獨立boss事件按eventID＋精確message去重：seed17 18spawns、17success/25fail；909 14spawns、13/26；2026 18spawns、17/25。觀測成功比率40.5%／33.3%／40.5%，不是configuredchance的估計；各100年端點仍bossAlive。NPC不是每次輕鬆解決，亦非永遠無法處理，玩家介入效果需結合counterfactual與Agent route。

## 完整 Living Event Arc 與玩家後果

- seed17 road，自然day59 signal→61development→63reaction→70consequence。Life/Ignore未清怪：safety -8、prosperity -3、ironbuy16→20；Combat/Mixed正常兩場encounter＋attack＋交狩獵，HP100→66，helped且避免同樣損失。起點安全/繁榮已cap100，不能宣稱無上升就無作用。
- seed909 iron：正常購買10份鐵使reserve40→20，day115選到arc；正常交付／忽略改變reserve/infrastructure/prosperity/tradepenalty及price。這是**合法玩家促成需求**，不是被動世界自然短缺。
- 全被動3 seeds100年 minimum food78，未觀察自然food/ironarc。road約百年200次。不能手改food再稱自然世界；生活請求頻率不足列Product Finding。
- 現行road交付是hunt；不存在funding/evacuation API。Life不介入仍可存活，不等於Life對每種road危機都有同等參與途徑。

見 [arc-counterfactuals](engine/arc-counterfactuals.json)。state與買價真的改變，並非只出notification。

## Determinism / growth 與限制

最新src掃描0 Math.random callsites；相同2026seed＋正常farm/gather／save-reload exact full-state hash `c12244a14e136cd736230beb69ac4a0d004acd2136ace4813535b873507e0a76`，rng924864733。相關engine測試亦驗證RandomService延續。

近期events150、news60、arcs12、requests12；NPC memories/milestones與director最近事件有上限，major history最多20000。100年checkpoint合理保存與重載不代表完整低價值journal可無限成長；journal scalability另列performance工程finding。

原始instrumentation failures保留：serialize/player scope ReferenceError、writer錯誤0byte、年度timing算錯、NPC substring誤計8/9/9、boss 10/50年陣列被後續append污染。最後以snapshot copy完整重跑，所有checkpoint boss counters與自身events list一致；舊版本仍在playlog。沒有改app source／資料來讓測試通過。

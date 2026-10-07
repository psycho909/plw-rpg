# Phase6 — Regional Crisis model

## B implemented scope（已限定驗收）

Source commit `c449930520c4ef47a60de7c8f3c14867b69355f8`；base b82de85。Original post-test82src fingerprint85b0cdb5…的439tests/23files/typecheck/build證據保留於b-check-status.txt/b-source-freeze.json；隨後修復P2 severity coercion，獨立post-fix207tests與typecheckPASS，reviewed fingerprint12a3497858e3f654be2279fd97066e66cb05178e51cb0a9264faaf38e55a62fb。不能把original439fullrun冒充post-fixfullrun，不能把post-test snapshot冒充pre/postmanifest。

- Root GameState.regionalCrisis，單一Goblin/forest實例，seed+monotonicsequence ID。
- Phase union：dormant → warning → preparation → active → resolution → aftermath → cooldown → dormant。B正常runtime到resolution等待F的真實resolver；目前不宣告完整危機處理、consequence或民防貢獻已完成。
- Cause保存小型Threat/food/safety與條件快照，chiefOutcome保存角色／NPC成功介入事實。不複製world。
- CONFIG.regionalCrisis集中rule：monsterPopulation>=30、camp>=2且safety<=80／food<=55／chiefAlive之一，cooldown已到期才daily seeded draw0.18。ineligible不consumeRNG。
- Warning2日、Preparation5日、Active2日；Aftermath7日及cooldown360+severity30日為受控transition seam baseline，F再加入實際outcome-dependent後果與cooldown。I以多seeddistribution檢查spam，非產品最終率。
- Player/NPC Chief個體勝利以同hook更新crisis facts，不清phase、不保證聚落勝利；ordinaryhunt不累加specialleverage。既有NPC討伐保留。
- saveSchema4；V1/V2/V3先驗舊shape再補dormant，保留seed/time/RNG/人物/NPC/gear/life/history。存讀本身不advance世界，不reroll。
- world crisis不由死亡／繼承重置；合法歷史NPC ID可保留。新增daily emit已納入Phase5 craftCapacityBudget，nearMAX拒絕須原子。

## 尚待後續slice

C純Civil Defense/needs/likelihood已驗收，source `bd4901c28ed3fb8469d6fe5c82354b4e1128691e`，16focused/typecheck/independentreviewPASS；D生活貢獻、E camp/Chief介入及F分級後果/恢復均已限定驗收，最新F 411定向tests/typecheck/build與獨立Review PASS；G既有UI訊號與選擇施工中；H重大history/reputation；I多路線/長期simulation；J真Browser/獨立review/Gates。

Human DEFERRED / NOT APPLICABLE AT THIS STAGE。B測試中的forcedroll／手動phase/outcome為CONTROLLED FIXTURE，不是正常fresh-save遊玩。

F最新細節與原始證據見contribution-analysis.md/F章及f-core-independent-review.md；B停止resolution敘述僅歷史B scope，最新F canonicalruntime已自動結算，不代表I/J完成。

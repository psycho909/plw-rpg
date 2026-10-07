# Phase6 — Regional Crisis model

## B implemented scope（獨立審查中）

Base commit b82de85；post-test freeze82src，fingerprint85b0cdb5eb05a9ab650b083e6d962bbd44554e18f5ba79e7af87a091b5a6b663。全439tests/23files/typecheck/build通過，見b-check-status.txt與b-source-freeze.json。Post-test snapshot不冒充pre/postrunmanifest。

- Root GameState.regionalCrisis，單一Goblin/forest實例，seed+monotonicsequence ID。
- Phase union：dormant → warning → preparation → active → resolution → aftermath → cooldown → dormant。B正常runtime到resolution等待F的真實resolver；目前不宣告完整危機處理、consequence或民防貢獻已完成。
- Cause保存小型Threat/food/safety與條件快照，chiefOutcome保存角色／NPC成功介入事實。不複製world。
- CONFIG.regionalCrisis集中rule：monsterPopulation>=30、camp>=2且safety<=80／food<=55／chiefAlive之一，cooldown已到期才daily seeded draw0.18。ineligible不consumeRNG。
- Warning2日、Preparation5日、Active2日；Aftermath7日及cooldown360+severity30日為受控transition seam baseline，F再加入實際outcome-dependent後果與cooldown。I以多seeddistribution檢查spam，非產品最終率。
- Player/NPC Chief個體勝利以同hook更新crisis facts，不清phase、不保證聚落勝利；ordinaryhunt不累加specialleverage。既有NPC討伐保留。
- saveSchema4；V1/V2/V3先驗舊shape再補dormant，保留seed/time/RNG/人物/NPC/gear/life/history。存讀本身不advance世界，不reroll。
- world crisis不由死亡／繼承重置；合法歷史NPC ID可保留。新增daily emit已納入Phase5 craftCapacityBudget，nearMAX拒絕須原子。

## 尚待後續slice

C純Civil Defense/needs/outcome；D裝備/食物/金幣；E2–3Adventureleverage；F持久分級後果/恢復；G既有UI訊號與選擇；H重大history/reputation；I多路線/長期simulation；J真Browser/獨立review/Gates。

Human DEFERRED / NOT APPLICABLE AT THIS STAGE。B測試中的forcedroll／手動phase/outcome為CONTROLLED FIXTURE，不是正常fresh-save遊玩。

# Oakvale V2.x Phase0–3 — Final engineering review

本輪依正式規格§77完成第一個施工範圍：Baseline → Reward Data Model → Procedural Equipment → Wolf Family。正式權限與驗收正本是tickets/20261006-v2x-00至03；Phase4–10、完整50+怪物／100+物品、crafting/workshop/masterpiece及V3不在本輪。

## Source

工作分支：`v2x/reward-core`。Phase3測試的base commit為`6568b466390d06e6be0af2585e7524b9415204b8`，實際受測為新增Phase3的working-tree source，74個檔案SHA-256完整保存在source-freeze/build/full/regression/simulation/stress artifacts。交付source commit與這74個hash的逐檔對照見[correlation](phase-03/source-commit-correlation.json)。不能將base SHA單獨當作Phase3實作commit。

Phase1 source：f89c2c292aaadb6c22bc0453188661f22e4f15b2；Phase2 source：6568b466390d06e6be0af2585e7524b9415204b8。當前production assets的hash已記錄；當時build-status沒有獨立asset SHA清單，因此不聲稱跨時間逐byte對照。來源指紋、完整check build輸出與固定production runtime共同提供本輪證據。

## 已完成功能

- Typed reward registry與增量save migration；缺欄位取得合法default，保留世界、時間、RNG與既有資料。
- 3武器／2防具base、5品質、7詞綴及3狼族素材；實際kill→drop→inspect→equip→save→reload。共用原武器／防具兩部位，掉落原數值與所有權持久化；材料可交易。
- 物品頁20件分頁、部位／品質篩選、比較、素材與見聞收藏；角色視窗顯示穿戴獵獲裝備。
- 灰狼、傷痕灰狼、精英頭狼、狼群領袖、北林狼王依擊敗進展解鎖；rush、heavy strike、armor、howl、moon charge實際影響戰鬥，UI提示同一套mechanics。
- 兩traits、三controlled boss variants；world context與seeded RNG形成一次，逃跑／死亡／reload維持原form，勝利才清除並開始7遊戲日冷卻。狼王勝利不誤寫Goblin Chief記憶或清除其alive/warning；共享森林防禦反應保留。
- Phase1 R1已關閉：tagged family combat的canonical stats、HP範圍／回合／root boss crossguard；合法小數HP與untagged legacy／dungeon saves相容。

## Engineering evidence

| Gate / check | Actual result |
| --- | --- |
| Full regression |314tests／20files PASS；包含既有V1/V2，不僅新測試 |
| Typecheck / production build |vue-tsc PASS；Vite78modules PASS |
| Production browser regression |20Chromium checks PASS；controlledfixtures已個別揭露 |
| Integrated browser stress |1200.610秒／41CP／1425cycles／17647operations／7reloads PASS |
| Deterministic combat |12seeds×5definitions×2policies×2repeats=240fights；exact replay／midfight reload PASS |
| Long world / save |17/909/2026各10/50/100年、500canonicalgear／root boss／succession／reload PASS |
| Report regressions |2temporal metric tests＋1Markdown projection test PASS |
| Reviews |獨立Max核心Standards/Spec/harness review；獨立Medium證據與27metrics review；root最終整合 |

[Browser stress](phase-03/browser-stress.md)：2026-10-06台北15:06:02–15:26:02，Chromium151.0.7922.173。新正常save透過UI購藥、五狼族勝利、防禦提示、裝備、Boss midfight reload／flee／retrack／cooldown，再持續modal／gear／採集／休息／重載。無debug時間跳轉或手工state修改。worldTime480→13390，前進12910遊戲分鐘＝8天23小時10分鐘；population30，livingNPC29，finalLv7／gold322。

頁面例外0、unhandled rejection0、storage errors0；console有1筆favicon404。最後checkpoint的heap18.19MB、DOM2786、listeners529；heap峰40.56MB並有自然回落。save bytes最後checkpoint103002，origin estimate794592；actual final state的compact JSON103036B是估算，不能冒充最後browser counter。時間序列端點及checkpoint／final已分開，見[performance](phase-03/performance.md)。100年controlled saves477187–518204B；不代表100年持續玩家loot／append journal有界。

## Bugs、findings與限制

原始RED、fixture錯誤、compile失敗、13.163秒browser cooldown斷言失敗及summary日期混用均保留。Browser harness透過合法休息恢復population後確認六日冷卻；完整20分鐘retry另存。報表排序端點與Markdown缺cell已修正、保存重現並加regression；三份review JSON的literal-newline格式錯誤亦修正，完整parser與物件相等驗證通過。原錯誤版本未刪除。詳見[bugs](phase-03/bugs.md)。

Spec reviewer的「刪除optional family marker」P2提案與證據保留；root及另一獨立reviewer依Owner排除檔案修改的指示判定OUT OF SCOPE。正常code不單獨丟失marker；flee後root與合法legacy wolf可共存，不能一律拒絕此存檔。Tagged crossguard驗證仍通過；不宣稱抗任意tamper。

PF02 raw slot stats96.50%低於固定legacy比較，未計affix效用；清怪後forest recovery等待、材料完整用途尚待later crafting、共享camp用語均列[產品觀察](phase-03/reward-findings.md)，沒有為QA偷偷改設計。既有C01 export/interleaving、C02無界完整journal及C03 detached DOM/listener疑慮保持OPEN。這輪20分鐘stress不代替2小時soak、不清除C03；§57–62允許first-slice targeted/stress，無新明確線性成長證據，沒有宣稱新2小時soak通過。原生Safari／手機實機排除；headless世界模擬與真Chromium runtime分別記錄。

## Final gates

| Gate | Status |
| --- | --- |
| Phase0–3 Development / Engineering Gate |PASS WITH FINDINGS |
| Browser Stability Gate（本輪20分鐘scope）|PASS WITH FINDINGS |
| Agent automated UI validation |PASS WITH FINDINGS；不冒稱1–2小時exploratory或真人 |
| Human play / Fun Gate / Retention Survey |DEFERRED / NOT APPLICABLE AT THIS STAGE；不阻擋工程 |
| Full V2.x Product / retention readiness |NOT DECLARED；later phases不在本輪驗收 |

[最新Agent routing](../../../docs/agents/agent-routing.md)：Low機械執行、Medium日常工程、Max複雜核心／深度審查、Sol決策；直接選最低足以可靠完成的tier，不固定逐級試錯。原版與中間版已封存。Tool名稱採underscore對應固定role；實際模型telemetry不可取得時只記requested configuration，主Session切換不由文件假裝完成。

所有本機report／script版本以write_recorded先追加再發布current view。初始未執行261行harness draft曾未及封存的缺口仍明示，不能追溯聲稱保存了不存在的原稿。新source commit與remote equality由交付correlation驗證；無main／PR／merge／手動deploy。

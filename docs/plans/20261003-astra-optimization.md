# Astra 單機優化計畫

建議先完成三件事：驗證保存失敗後的繼續操作邊界、補足戰鬥與同行者回饋、讓長時間等待後的世界變化可讀。下一階段再量測新版紀錄的長期成本，據此改善歷史查閱與匯出；玩法擴充最後做，先用現有世界證明新選擇值得加入。

- 規劃基準：`4a955ddab91d22aafefc868ffea1cab6bcd4129f`，2026-10-03。
- Authority：[本輪 Ticket](../../tickets/20261003-astra-optimization-plan.md)。這是建議文件，不是候選功能的施工授權；本輪只寫本檔。
- 使用者指定 Astra，委派配置為 `gpt-6-astra`／`max`，優先於一般 Luna 預設；配置證據不代表後端模型遙測。前次委派因模型用量限制中斷，沒有當作已完成；本檔是接續分析的產出。
- 範圍為單機。伺服器、帳號、跨裝置同步、外部改檔／刪檔防護及部署不列入本輪改善。
- 本輪為程式與既有證據審讀，未重新執行 runtime 測試。未重現重大新 Bug；下列「待驗證」不可改稱已證實故障或卡頓。

## 先保留已證明可靠的部分

正常生活到第 181 日、冒險到 155.487 個遊戲日並擊敗自然森林 Boss 與同一次地下城三層首領，核心循環已可運作；長期引擎有 8 seeds × 500 年與 56 次自然繼承證據。這些包含公開等待或 headless 加速，不是同等實時遊玩長度。[完整測試](../../reports/playtests/20261003-comprehensive/README.md#L7)、[冒險](../../reports/playtests/20261003-comprehensive/adventure/report.md#L7)、[長期世界](../../reports/playtests/20261003-comprehensive/longevity/report.md#L5)

新版保存已有 136 tests／7 files、types/build、writer 4 tests、實際 Chromium 18/18 與兩項補充驗證。四項住宿／ID 修復及後續 IndexedDB 錯誤處理均已完成，不重新列成待修 Bug。[修復狀態](../../reports/playtests/20261003-comprehensive/BUGS.md#L3)、[單機保存結果](../../reports/playtests/20261003-local-autosave/README.md#L27)、[審查](../../reports/playtests/20261003-local-autosave/local-review.md#L20)

後續方案共同遵守：

1. 每次有效動作／世界推進立即保存進度與 pending；完整事件擷取不受 UI 150 筆上限影響。
2. 紀錄只能追加；同 ID 同內容去重、異內容拒絕；transaction complete 才 ACK，從**最新**狀態移除已確認 ID。
3. 保存失敗保留舊 raw 與記憶體進度；重建保留舊 archive/pending；舊 version 1 可讀。效能改善不得用節流保存、丟棄事件或刪除舊紀錄換取速度。
4. 維持單一模擬排程、引擎與 Vue 分離、seed 可重現，以及黑白像素、繁體中文、World First。沿用 PixelWindow／StatusNotice／PixelMeter 與現有 token，不新增常駐管理面板。

依據：[store `flushJournal/save/act`](../../src/stores/gameStore.ts#L31)、[journal `appendBatch`](../../src/services/playJournal.ts#L49)、[完整事件回歸](../../src/stores/gameStore.test.ts#L106)、[UI 契約](../UI.md#L25)、[視覺正本](../design/DESIGN.md#L99)。

## 候選與排序

「已確認」指原始碼／既有報告可核對的能力缺口，不等於每項都是 Bug。「待驗證」需先量測或最小重現。「新玩法」需另行決定產品規則。工作單位是可獨立驗收的一段改動，包含相稱驗證，不估算人日；L1／L2 依[專案風險定義](../governance/ai-governance.md#L34)。本計畫不推薦 L3 改造。

| 編號 | 建議 | 優先 | 性質 | 後續風險／改動量 | 依賴 |
| --- | --- | --- | --- | --- | --- |
| O1 | 保存失敗後的操作與復原邊界 | P1 | 靜態疑慮，待 runtime 重現 | 驗證 L1；修正 L2，1–2 單位 | 現有故障 harness |
| O2 | 戰鬥回合與聘用前職能說明 | P1 | 已確認回饋缺口 | L2，2 單位 | 現有 actions／journal 契約 |
| O3 | 等待／離線摘要與事件重要性 | P1 | 已確認呈現缺口 | L2，2 單位 | 完整事件 capture |
| O4 | 新版長玩成本量測，再精準優化 | P1，擴充紀錄前 | 效能假說 | 量測 L1；優化 L2，1＋條件式 1 單位 | 固定最新版 build |
| O5 | 同 origin 多分頁只有一個寫入者 | P2 | 已知限制的能力擴充 | L2，2–3 單位 | O1 的復原狀態定義 |
| O6 | 有界歷史查閱與大量紀錄匯出 | P2 | 新能力＋容量假說 | L2，2–3 單位 | O4；沿用 O3 分類 |
| O7 | 行動成本／停用原因共用來源 | P2 | 已確認重複與資訊缺口 | L2，2 單位 | 先選農作、採集、交易三類 |
| O8 | 生活經濟與世界壓力的下一個選擇 | P3 | 新玩法，先做平衡研究 | L2，研究 1＋每種核准玩法 1–2 單位 | O2、O3；一次只選一種玩法 |
| O9 | 當前版本的短回歸入口與證據關聯 | P2，隨改動建立 | 維護能力 | L1／跨 harness 時 L2，1–2 單位 | 既有 runner 與追加 writer |

### O1．把保存失敗的暫停變成可理解的復原狀態

**玩家收益／證據：** 失敗後不會誤以為已恢復安全遊玩。`save()` 會設 speed=0，但 [App `setSpeed`](../../src/App.vue#L40)、倍率按鈕與視窗底部「繼續時間」仍可直接寫 speed；[`advance/act`](../../src/stores/gameStore.ts#L66) 沒有 saveError gate。既有 [quota 案例](../../reports/playtests/20261003-local-autosave/README.md#L38) 證明首次暫停與成功重試，沒有涵蓋持續故障時再次按繼續。這是待重現邊界，不推翻已通過案例。

**最小範圍：** 先在可丟棄 context 注入持續 setItem 失敗，依序測動作、×20／視窗內繼續、等待與再次動作，比對記憶體時間、舊 raw、pending。若可持續累積未保存進度，建議在共用操作入口先要求 checkpoint 重試成功，才恢復推進；保留查看、匯出、重試與既有確認後重建。只有 journalError、但 checkpoint 仍成功時，維持現有可玩與補寫行為。

**完成條件／風險：** 故障持續時不因倍率／等待／快捷鍵繞過復原限制；恢復後保存最新狀態，目標 ID 各提交一次；雙故障及 reset 保留 pending 仍通過。這會調整故障期間可操作範圍，需在後續票明訂；不得將錯誤簡化成唯一 boolean 而失去「壞 raw／checkpoint 失敗／archive 待補寫」的差異。若最小案例不成立，留下證據並結案，不為假說重寫保存流程。

### O2．讓玩家看懂每一回合與同行者的價值

**玩家收益／證據：** 玩家可理解防禦、藥水、裝備與聘人的效果。[`combatTurn`](../../src/engine/actions.ts#L134) 會修改血量，但非終局回合沒有傷害／治療摘要事件；[`game.act`](../../src/stores/gameStore.ts#L70) 的空字串結果會取最後事件，可能仍是先前遭遇文案。[AdventureWindow](../../src/components/AdventureWindow.vue#L14) 只有生命條與四指令；[冒險報告](../../reports/playtests/20261003-comprehensive/adventure/report.md#L15) 也明示看不到各成員貢獻。另 [`hire`](../../src/engine/actions.ts#L95) 依目前隊伍人數分配 fighter/healer，而[酒館](../../src/components/PlaceWindow.vue#L63) 聘用前只列年齡／等級／可用狀態。

**最小範圍：** 在原計算處產生一筆既有格式的回合摘要，列實際主角／同伴傷害、實際治療與受傷，透過既有事件／journal 保存；戰鬥視窗保留最近回合的短文字，勝負後仍可讀。聘用按鈕附近顯示「這次聘用的戰鬥職能」、日薪與到期時間；預覽重用引擎分配規則，不把依聘用順序取得的角色寫成 NPC 固有人格。

**完成條件／風險：** 攻擊、防禦、藥水、低血護衛／治療、擊殺與死亡都有與實際數值一致的回饋；過量治療只顯示真正回復值。相同 seed／指令的生命、獎勵、RNG 與時間結果保持一致，新增事件仍可保存重載。1440／390px、鍵盤及 aria-live 驗證可讀、沒有逐字或多次搶讀。不加入動畫框架或改傷害公式；事件數增加納入 O4 量測。

### O3．讓時間跳躍留下可辨識的世界變化

**玩家收益／證據：** 等一季後能看懂田地、聚落、契約與森林發生什麼。[App `wait`](../../src/App.vue#L57) 只有通用完成文案，正常畫面只放[最後一則事件](../../src/App.vue#L123)；離線已有摘要，但公開等待沒有同等回顧。設計原有[事件分級](../design/DESIGN.md#L1392)及[世界資訊發現](../design/DESIGN.md#L1981)，不是要加每日任務。

**最小範圍：** 用該次完整 capture 建立暫態「這段時間」摘要，優先列聚落成長、Boss 預警／出現、成熟、契約終止與死亡；最多五條加數量摘要，從現有視窗展開。即時世界事件依 type 在 presentation 分類，重要訊息透過既有短提示，普通事件留日誌。使用原有地圖聚落／作物／威脅投影，摘要可指向相關地點；不建立新模擬實體。

**完成條件／風險：** 30 日／一年等待與離線都顯示正確起訖時間及實際事件，不用 `events.slice(-150)` 猜完整總數；受控超過 150 事件案例不漏計。普通事件不蓋掉尚未讀到的重大提醒，同一事件不重複通知；離開摘要後地圖仍是主要畫面。維持「視窗不自動暫停」及未知區域規則，敘述不得比角色可知的資訊更精確。摘要不是新增永久任務狀態。

### O4．量測最新保存路徑，改善已證明的熱點

**玩家收益／證據：** 長玩仍能順暢移動、可靠保存與匯出。[loop](../../src/engine/gameLoop.ts#L3) 每 100ms 檢查；每次有效推進會記錄及保存，ACK 後又保存。[新版 35.13 秒 ×20](../../reports/playtests/20261003-local-autosave/README.md#L34) archive 由 5 增至 357，這證明寫入頻率，不證明卡頓或一年容量。舊 [20 分鐘 soak](../../reports/playtests/20261003-comprehensive/soak/report.md#L3) 及 [500 年序列化量測](../../reports/playtests/20261003-comprehensive/longevity/report.md#L9) 都早於新 journal，不能拿來保證新路徑長玩成本。

**最小範圍：** 固定瀏覽器／裝置與來源，量 ×1／×20 的新世界及晚期世界；記錄輸入至畫面 p50/p95、同步 pack+setItem、IDB ACK 延遲、pending 最老年齡、紀錄數／bytes、匯出時間與記憶體趨勢。另以明確標記的 1萬／10萬筆 fixture 測匯出，與正常長玩分列。先找成本是否落在 [`packCheckpoint`](../../src/services/playJournal.ts#L14) 的 stringify→parse→stringify、IDB、[`syncNpcs`](../../src/engine/simulation.ts#L109) 的重複位置更新，或[地圖投影](../../src/components/WorldMap.vue#L16)，才選一處修改。

**完成條件／風險：** 先採「輸入 p95 < 100ms、同步 checkpoint p95 < 16ms」作待確認目標；出現反覆 >50ms 同步工作或 pending 持續累積就追查。門檻是建議驗收值，不是本輪量測結果。前後用同組場景比較；沒有瓶頸就不重構。任何優化都通過立即保存、220-event、慢 ACK 期間新操作、去重／衝突、失敗與 reset 回歸。只比較單次數字不能宣稱無洩漏；不以減少保存次數或提高資料上限代替修正。

### O5．防止同一瀏覽器的兩個遊戲分頁互相覆蓋

**玩家收益／證據：** 誤開第二頁時保護正在玩的世界。[UI 契約](../UI.md#L54) 已明示多分頁競爭限制；[`save`](../../src/stores/gameStore.ts#L50) 寫同一 SAVE_KEY，沒有分頁擁有權。這是已知能力範圍，不列成剛修好的 journal 再次失效。

**最小範圍：** 為同 origin／SAVE_KEY 建立單一可寫會話；優先評估瀏覽器既有 Web Locks，能力不足時採明確、保守的不可寫提示。鎖必須先於 store 初始化保存、離線演化及 loop；第二頁提供查看提示與重新接續入口。接手前讀最新 checkpoint；舊頁的 pagehide、重試及延遲 ACK 不得再覆寫新會話。鎖與交接只包住現有保存流程，先不引入可合併分支存檔。

**完成條件／風險：** 同時開兩頁、背景休眠、關閉主頁、重建後舊頁離開及慢 flush 交接皆有真瀏覽器案例；一次只有一頁推進，接手時間不倒退、pending 不消失、archive 不重複。重點是鎖的生命週期與異常關頁，不能只加一條警語或僅鎖定 setItem。依賴 O1 的復原政策，後續票須列明支援瀏覽器及 fallback。

### O6．讓世界過去的事情真正能查閱

**玩家收益／證據：** 能回看早年聚落成長與歷代角色，不必只翻原始 JSON。[WorldRecords](../../src/components/WorldRecords.vue#L30) 日誌／歷史各只顯最近 100 筆；第 500 年已有約 1,785 筆歷史。[`readAll`](../../src/services/playJournal.ts#L72) 使用 getAll，[`exportJournal`](../../src/stores/gameStore.ts#L77) 再組成完整 JSON／Blob。查閱限制已確認，大庫匯出是否過慢仍待 O4。

**最小範圍：** 先把現有歷史做每頁 50–100 筆的「較早／較新」查閱；再為 archive 增加只讀 cursor 分頁，保留 worldId 與遊戲時間，分清「重要歷史」及「完整操作紀錄」。全量匯出需有忙碌／失敗回饋；若 O4 證明 getAll 成本超標，再採分段匯出或逐段讀取的實際可用方案，不先承諾所有瀏覽器都能串流落盤。

**完成條件／風險：** 千筆歷史能到最早／最新，單頁 render 有界；多世界、重建前後、pending 與 archiveUnavailable 顯示清楚。1萬／10萬筆 fixture 匯出逐 ID 核對完整性及排序，取消／失敗不改存檔、不刪紀錄。分段產物需說明範圍及是否完整，不能把局部成功稱為完整匯出。若新增索引，另驗證 additive 升級與舊 DB 保留，不順帶改 GameState schema。

### O7．在行動前提供可信的成本與受阻原因

**玩家收益／證據：** 看得到「為什麼不能做」與這次會花多少時間／體力。[PlaceWindow](../../src/components/PlaceWindow.vue#L19) 重算售價，農作／採集區也重寫引擎條件；對照 [`farm/gather/trade`](../../src/engine/actions.ts#L21) 可見成本與可用條件散在兩端。採集時間隨技能變化，但 UI 只顯固定體力與報酬；目前是資訊不足與未來漂移風險，沒有證據說現有價格計算錯誤。

**最小範圍：** 先限農作、採集、交易，讓引擎提供純查詢的成本／可否執行／中文原因，由動作及 UI 共用；真正執行仍重新檢查當下狀態。停用旁顯示主要原因與下一步，例如回聚落休息、等成熟、營業時間或資源翌日恢復。不要為所有未來玩法建立通用 command framework。

**完成條件／風險：** 體力差 1、開關店邊界、四田全滿、錯區域、資源不足及穿戴最後一件，預覽與實際拒絕一致；查詢不改 state、時間或 RNG。原住宿先付款／午夜扣薪順序不動。仍需以引擎規則為準，避免只抽 UI helper 而保留兩套判定。

### O8．先研究可選路線，再增加一種世界循環

**玩家收益／證據：** 讓自由生活有實際取捨，長年世界也有可感變化。目前 [`gather`](../../src/engine/actions.ts#L43) 採石／採鐵共用技能、資源池、產量、體力與耗時，但[售價](../../src/data/config.ts#L27)分別為 3／8 金；從現有規則看，賣錢目的下採石缺乏優勢。生活路線於[第 91／181 日](../../reports/playtests/20261003-comprehensive/life/report.md#L13)解鎖村莊／城鎮；[晚期無治理樣本](../../reports/playtests/20261003-comprehensive/longevity/report.md#L9)皆達人口 80、town、Threat 3／Boss 存活。數值穩定符合 V1；「玩家後期覺得單調」尚無玩家研究佐證。

**最小範圍：** 先比較耕作、採木、採石、採鐵、冒險取得第一套裝備的動作數、遊戲日、淨收入與風險，再選一項局部差異，例如鐵礦的取得條件或成本，保留安全生活路線。下一階段可選一種「道路受威脅→守衛巡護→安全恢復」的自主循環，用既有 safety／threat／injury 與傳聞呈現；巡護代價只選一種，仍由 NPC 自主行動。這兩者是獨立的新玩法決策，不能因接受本計畫而自動調平衡。

**完成條件／風險：** 平衡研究先交可重現比較表及明確選定規則；改動後至少兩條生活／冒險路線仍可獨立成長，採石有可說明的價值。世界循環另以多 seed、1／10／50 年檢查波動、人口存續、預警先於 Boss、正常玩家可介入改善且不直接 Game Over；chunk 大小確定性仍成立。先一個循環、一個日常選擇，不擴張地圖、技能樹或任務系統。

### O9．把本次投入變成下次可快速重跑的證據

**玩家收益／證據：** 新玩法較不會破壞已驗收的生活、保存與繼承。現有 [`ui_helpers.py`](../../reports/playtests/20261003-comprehensive/ui_helpers.py#L1) 已有正常操作 helper，[報告 writer](../../scripts/README.md#L3) 也已可靠追加；各歷史報告綁定不同基準，不能直接拿舊 PASS 宣稱新 HEAD 通過。[單機 source-checks](../../reports/playtests/20261003-local-autosave/source-checks.json#L1) 是可重用的來源／build 關聯方式。

**最小範圍：** 保留歷史 runner 與結果，在 scripts 提供目前來源的短回歸入口，重用現有 helper：移動／農作／非終局戰鬥／住宿跨午夜／立即保存與重載／故障復原。統一記錄來源指紋、實際 HTTP 資產、遊玩方法、case 結果與 console 的 URL／位置；新結果寫入新的執行目錄並接既有 writer。不同 source 指紋的結果必須分開。

**完成條件／風險：** 一個明確命令可對指定本機 build 執行並產生非零 case 結果；故障時原命令 exit status、錯誤原因和追加版本保留。normal UI／公開等待／fixture／headless 標籤不混用。O1／O2／O3 各保留最接近改動的測例；只有保存／排程變動才重跑新版長 soak，世界公式改動才重跑長期矩陣。Linux Chromium 以外仍需另驗，不把未知 URL 的 404 指認為 favicon。

## 首輪三項與後續階段

1. **O1：最小故障重現與復原政策。** 先釐清可否繼續累積未保存進度；若成立，完成窄修正與雙故障／reset 回歸。結束條件是行為有證據、入口一致、原 pending 與 archive 保護不退步；不藉此重做 persistence。
2. **O2：戰鬥回饋＋聘用前職能。** 先讓現有玩法的決策有回應。結束條件是玩家可從回合摘要解釋血量變化與同行者作用，原戰鬥／經濟結果維持，桌機／手機／鍵盤可讀。
3. **O3：等待後的世界摘要。** 接上同一套重要事件呈現。結束條件是跨季／跨年／離線的真實事件能被理解、完整事件計數正確，關閉後回到地圖；不新增常駐面板或自動暫停。

首輪每項可獨立驗收後停止，不把全部候選綁成一次大改。O4 是擴充紀錄前的下一項量測門檻；O5／O6 依量測與分頁需求分票。O7 隨新增生活操作逐類整理。O9 伴隨這些改動納入測例，而非先興建測試平台。O8 最後分成平衡研究與一種世界循環，待產品規則確定才施工。

## 本輪證據與未確定項

已讀根 AGENTS／README／SUBAGENTS／本票及 workflow 適配；無更近 scoped AGENTS。完整讀取 SPEC、根 DESIGN 導覽、`docs/design/DESIGN.md`、UI 契約；核對 App、WorldMap、store、journal、saveService、gameLoop、simulation、actions、config、types、events、worldUI 與相關操作／共用視窗，及直接相關單元測試。指定的 comprehensive README／BUGS／WORLD、四條路線報告、local-autosave README／review／results／source-checks 均已檢視。

方法採 frontend-design 與 frontend-design-premium 的既有風格／互動檢查；codebase-design 僅用於行動查詢與保存介面的局部責任，不作整個 repo 重構。依本票唯讀／文件範圍，未執行 UI static audit、瀏覽器新操作、全測、裝置效能量測或修改正式設計契約；既有 PASS 是引用證據，不是本輪重跑結果。

仍待新證據：O1 的實際故障後操作結果、O4 的最新 build 長玩／大庫成本、O5 的分頁交接與瀏覽器支援，以及 O8 的玩家節奏偏好。極端 MAX_SAFE_INTEGER 耗盡維持已記錄低優先限制；新 local-autosave 那筆 console 404 未歸因，不以猜測新增修復項。本輪核對相對連結／行號、文件空白及差異；另重新計算 source-checks 的 8 個工作樹來源指紋，全部與目前檔案相符。這不等於重跑測試。主 Agent 負責 Ticket、整合與 Git 同步。

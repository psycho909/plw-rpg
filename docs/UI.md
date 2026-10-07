# 遊戲介面契約

視覺正本：[design/DESIGN.md](design/DESIGN.md)。V1 產品規則：[SPEC.md](../SPEC.md)；V2 正式規格：[V2-LIFE-EMERGENCE.md](specs/V2-LIFE-EMERGENCE.md)；本文件描述實際 UI 結果。使用者於 2026-10-03 指定重製，取代 SPEC 54–58 的固定側欄布局；玩法依對應規格，即時保存與追加紀錄依[單機保存 Ticket](../tickets/20261003-local-autosave-journal.md)。

## 視覺與 token 所有權

採既有 SCSS 執行期所有權：`src/style.scss :root` → 共用元件與遊戲畫面。設計文件第 12 節的色值映射為同名 CSS variables；不透過第二套 theme／CSS library 複製。

| 設計角色 | Runtime token | 使用者 |
| --- | --- | --- |
| 背景／表面／次表面 | --bg／--surface／--surface-alt | 地圖框、視窗、清單 |
| 文字／次文字 | --text／--text-muted | 所有元件 |
| 邊框／次邊框 | --border／--border-muted | 像素框、按鈕、分隔 |
| 選取反白 | --selected-bg／--selected-text | 主動作、選取、玩家格 |
| 繁體中文／數字字型 | --font-ui／--font-mono | 系統中文字型與等寬英文數字 |
| 像素／間距 | --pixel-unit／--border-width／--space-1…4 | 硬邊框、4／8／12／16px 節奏 |
| 圖格／視窗 | --tile-size／--panel-padding | 地圖自適應、視窗內距 |
| 捲軸 | --scrollbar-thumb／track／hover／active | 全域標準屬性與 WebKit fallback |
| 層級 | --z-hud | 畫面方向控制與情境提示；modal 用瀏覽器 top layer，訊息採自然流動布局 |

全介面零圓角、無漸層／陰影／模糊／閃爍。Emoji 只標示世界物件，保留原生顏色並提供中文名稱。英文與數字等寬，中文字使用可讀系統字型，不載入外部字型。動作立即回應；reduced-motion 不移動或動畫。

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Scrollbar | src/style.scss 全域規則 | 本文件 token 映射 | 地圖／視窗內部捲動 | 瀏覽器 computed style、窄螢幕 |
| Toast | src/components/StatusNotice.vue + gameStore.message | gameStore.act／save | 探索上方訊息、modal 內訊息 | 成功／失敗／dismiss／live region |
| CRUD | gameStore.save／reset + App.vue 確認流程 | SPEC 53、saveService | 手動存檔、自動存檔、重建確認 | 存檔重載、失敗保護、取消 |
| Identity／Reputation | App.vue + IdentityWindow.vue | `state.life.characters[activeCharacterId]` | 身分、聲望稱號、人生記事、名下產業；鍛造身分與傑作匠師稱號由 engine 身分投影形成，UI 只顯示 label | `identity.test.ts`、`lifeIntegration.test.ts` |
| NPC life | NpcWindow.vue | `state.life.npcs[npcId]` 與目前居民 state | 職涯、熟悉度、掛心事項、旅人狀態、記得與玩家有關的事 | `npcLife.test.ts`、`lifeIntegration.test.ts` |
| Property | PropertyWindow.vue | `state.life.properties`、`PROPERTY_DEFINITIONS` | 自宅、農地、農場事業及手動供糧 | `ownership.test.ts`、`lifeIntegration.test.ts` |
| Living news／requests | LifeNewsWindow.vue | `projectLivingNews`、`state.life.requests` | 地方／區域／傳聞／重大消息、近期委託 | `livingEvents.test.ts`、`lifeIntegration.test.ts` |
| World First map | WorldMap.vue + `projectWorld` | `GameState` 經 `worldProjection.ts`／`worldUI.ts` 投影 | 已探索圖格、居民、產業、作物和威脅標記 | `worldProjection.test.ts`、瀏覽器遊玩流程 |
| Procedural gear / discovery | InventoryWindow.vue、CharacterSheet.vue + `rewardProjection` | `state.reward`、rewards catalog、rewardActions / combatStats | 原生分類／部位／品質按鈕、20 件分頁、同部位比較、穿戴、出售確認、素材交易、有限見聞收藏 | `rewardProjection.test.ts`、Phase2 engine tests、reward-core production Browser 流程 |
| Adventure reward / comparison | PlaceWindow.vue + AdventureWindow.vue + `wolfRewardExpectation` / `rewardProjection` | `state.reward`、wolf loot configuration、current slot equipment | 追蹤目標逐列呈現真實 gear/rank/rarity/material/exclusive expectation；單一下一目標提示；戰鬥顯示 reward forecast；同窗比較 rarity、逐項能力差與 affix/special 差異 | `rewardProjection.test.ts`、Phase4 targeted browser、Adventure stress/playtest |
| Crafting / craftsmanship | Home／雜貨店／鐵匠鋪 `PlaceWindow.vue` 共用工作台 + `InventoryWindow.vue` gear detail + `CharacterSheet.vue` Smithing | `CRAFTING_RECIPES`、`planCraft` / `craft`、`state.reward.instances`、角色技能與持有素材、既有 life identity projection | 配方選取、合法性／成本／拒絕原因／實際站點與時段均由 engine plan 提供；可在既有 Home 檢視基礎／中階 recipe，所有服務費、站點與營業時間只讀 plan；仍由同一工作台互動。解鎖、熟練 XP 上限、畢業狀態、品質下限／機率與下一目標讀取 plan；鍛造能力不增加裝備原始數值。預設不加影響素材，只有 registry allowlist 會顯示為選項。F masterpiece 是既有裝備身分標記，不是新稀有度或通用戰力保證；現有 gear row/detail 與成功回饋呈現傑作、原製作者、時間及配方。G 鍛造師／傑作匠師標籤由 engine lifetime identity 投影形成，UI 不重算門檻；不新增 inspector 或 ownership panel | `craftingProjection.test.ts`、`rewardProjection.test.ts`、`gameStore.test.ts`、engine crafting tests、C fresh-save browser pilot；E/F/G UI browser flow；save/reload |

本機遊戲無表格選取、日期輸入、表單或 single-select；不建立無用 UI primitive。PixelWindow 是所有 modal 唯一 owner，PixelMeter 是生命／體力／熟練度／作物進度唯一 owner。清單篩選用原生按鈕群組，保持 aria-pressed。

## 導覽、焦點與時間

正常畫面只有地圖、日期／倍率、角色生命／體力／金幣、位置與簡短情境提示／最近一則事件。詳細內容共用 PixelWindow；世界在視窗後保持可見。

- WASD／方向鍵移動；Enter 開啟附近互動；Esc 開選單或關閉視窗；C 角色、I 物品、L 日誌、M 地圖。滑鼠與手機有對應按鈕。
- 快捷鍵忽略 IME、修飾鍵、文字輸入；modal 開啟時不移動玩家，不覆寫原生按鈕 Enter 行為。地圖一個 Tab 入口，方向鍵直接控制角色。
- 原生 dialog.showModal 負責背景 inert，PixelWindow 統一循環 Tab／Shift+Tab，避免焦點跑到瀏覽器介面。開啟聚焦內容／安全取消；Esc 只取消，關閉還原觸發者，觸發者已不存在則回地圖。繼任視窗不可關閉。
- 只允許一個 modal，內部導覽換內容，不疊加 dialog。訊息於 modal 內呈現，避免被 top layer 遮蔽。
- 選單提供「這一生」、「住所與產業」和「地方消息與委託」視窗；詳細資料以目前角色與世界 state 呈現，關閉視窗不改變模擬狀態。
- 世界時間照所選倍率流動，開視窗不自動暫停。背景分頁在同一 Session 透過單一 monotonic loop 補進延遲時間；頁面關閉後世界凍結，重新載入不做 offline advancement。持續顯示精簡時鐘；等待一季／一年明示會改變所有人的生命與契約，不能於戰鬥／地下城使用。
- 單一畫面無 URL 路由，視窗狀態不寫入存檔。物品選取與日誌篩選僅在視窗開啟期間暫存；關閉後回到預設。文件標題依當前視窗更新為「內容 — 橡谷」。

## 情境操作與復原

附近建築／NPC 的定義使用引擎 Manhattan distance ≤ 1；農作／採集仍依引擎區域條件。服務營業、價格、資源、體力、裝備與傭兵上限取自 config／actions。打烊時視窗保留營業時間與離開按鈕，操作停用；時間流動後條件即時重算。失敗顯示引擎中文原因，不跳離原操作視窗。

居民視窗顯示年齡、職涯、大家認得的角色、目前活動、位置、熟悉度、掛心事項與已知回憶。個人回憶只顯示與目前角色相關的部分；交談依職業、職涯、特質、已知記憶、玩家身分和聲望選擇對話，居民不會知道未親歷或未聽聞的事。NPC 保存有界結構化記憶，每種重要記憶會受距離、職業、特質或親身關係限制，避免形成全知或逐人好感度系統。

「這一生」視窗顯示目前角色累積的多重身分、聚落聲望稱號、最近人生記事和名下產業。身分由生活行為、技能、職涯或農場事業形成；聲望稱號與 NPC 對話會隨聚落聲望改變。聲望也會影響聘請傭兵：低於 -25 時無法簽約，每 25 點正聲望降低 1 金聘金，最多降低 4 金；基本聘金隨聚落階段為 20／25／30 金。實際資格和費用由 engine 顯示，UI 不重算公式。

「住所與產業」視窗提供自宅、農地和農場事業。取得條件依金幣、聲望、聚落階段、位置與先有農地等規則顯示；自宅可休息及存取儲物，農場事業需玩家親自供應食物，每次最多 10 份、每日最多 60 份，沒有離線或 AFK 收入。

「地方消息與委託」分為地方、區域、傳聞和重大消息，並列出未到期的食物、狩獵、鐵礦及傷者照料請求，可直接前往目標或交付點。消息與請求來自持續演化的世界狀態；視窗只投影有界的近期消息和開啟中的請求。

地圖由 `projectWorld` 將真實 `GameState` 投影為格子、居民、地標與可及性標記。未探索格不顯示居民、建築或地標。民居、農作和威脅蹤跡是 aggregate state 的呈現投影，產業標記讀取 ownership state；這些投影不新增模擬實體、碰撞或指定怪物機制。

物品清單＋選取詳情，裝備／藥水呼叫原 actions；沒有引擎背包容量，不顯示假的容量。日誌最新 100 筆、歷史最新 100 筆，居民最多 80，全部 render 有界資料。空分類有中文空狀態。

V2.x 物品視窗預設仍為「日常物品」，新增獵獲裝備、狼族素材與見聞收藏；沿用原生 aria-pressed 分類／篩選按鈕及同一 PixelWindow。程序裝備每頁最多 20 件，顯示持有且符合篩選的數量，換篩選回第一頁，物品變動後夾限有效頁碼；不刪除未顯示的物品。選取／分頁不寫入存檔。品質用中文文字，詳情列出實際能力、詞綴階級與同部位穿戴能力，不靠顏色或重新擲值。

固定與獵獲裝備共用武器／防具兩個部位，替換會留下原物品。穿戴呼叫引擎 action，自動保存並保留原視窗；戰鬥中停用。出售獨立裝備先在同一視窗內明示名稱、金額與永久移出背包的結果，預設聚焦「保留這件裝備」；取消回到原出售按鈕。實際出售仍受鐵匠鋪距離／營業與不得出售已穿戴物品限制，失敗保留原選取並顯示共用訊息。狼族素材在既有雜貨店出售，每次一份／5 分鐘，非新工坊。見聞只投影已知 catalog IDs，跨角色保留，不儲存每件普通物品的完整歷史。這些 UI 描述不代表 Phase2/3 工程 gate 或真人留存驗收已完成。

狼族追蹤沿用森林 `PlaceWindow`，只呈現五種現有狼族定義。`wolfEncounterOptions` 提供名稱、資格及下一個追蹤目標的原因，`encounterWolf` 才能形成遭遇；開視窗不抽 RNG 或生成 Boss。原尋找怪物、哥布林危機與地下城仍有自己的流程。`AdventureWindow` 對帶有 familyEncounter 的戰鬥使用 `wolfCombatPresentation` 顯示等級、階級、特性、Boss 變種與下一回合提示；提示來自引擎的同一機制，UI 不計算傷害。狼王形成時捕捉世界怪物量、安全及玩家既有戰鬥勝利 counter（所有戰鬥的介入 proxy），逃跑、死亡或重載後保留同一形態；勝利後七個遊戲日才能再次追蹤。這是單一狼族核心，不包含製作、其他家族或完整 V2.x content expansion。

Phase6-G 危機顯示沿用 `LifeNewsWindow` 地方消息作為唯一總覽，純函式 `projectCrisis` 讀取 `deriveCivilDefense` 與已保存的 `resolutionSummary`，不抽 RNG 或改世界。畫面以「吃緊／尚可／穩固」和逐項需求呈現防衛狀況，不顯示 readiness 原始分數；缺少舊版 summary 明確標成結果未知。危機警訊保留在探索畫面既有最近事件入口，備戰用品依序由 `contributeCrisisEquipment`、`contributeCrisisFood`、`contributeCrisisGold` 實際處理；不可回收裝備在同一視窗先確認保留或交付。酋長沿用現有戰鬥路徑，森林 `PlaceWindow` 使用 `startRegionalCampRaid` 開始真實營地遭遇，成果仍只由引擎於勝利時記錄。所有操作經 `gameStore.act`，PixelWindow 焦點／Escape 與背景世界時鐘維持原契約。

Phase4 Adventure reward UI 沿用上述森林與戰鬥視窗：森林列出的每個既有狼族目標都透過 RNG-free `wolfRewardExpectation` 顯示實際掉落等級、裝備機率、各品質機率、保底／機率素材與首領限定底材；UI 不另算機率或重複維護 balance 常數。`data-wolf-track`、`data-wolf-reward-expectation` 和唯一可見的 `data-adventure-goal` 是正式呈現節點，供真實 UI playtest 辨認當前目標與 reward expectation。戰鬥窗在狼族戰鬥顯示依相同投影生成的獎勵預期。下一目標只使用現有追蹤資格、收藏與真實獎勵設定；沒有未解鎖內容時提示已有的高品質追蹤或重挑首領，不建立任務標記海或不存在的新內容。裝備底材第一次進入 collection 時，既有 `loot.item` 事件訊息帶「新發現」；背包只讀目前仍在有界 events buffer 的原始事件。事件離開 buffer 後不重建新發現提示，收藏視窗僅顯示「收藏已記錄」與持久 collection ID。

獵獲裝備詳情在同一個物品視窗比較新裝備與目前同部位裝備，列出雙方稀有度、每項實際能力與帶正負號的差值，再分列雙方詞綴及特殊特性。此比較是部件資訊，不產生整體戰力分數，也不把某一數值較高稱為升級。詞綴說明遵循現有 combat formula：裂傷是每次命中額外固定傷害、不是持續傷害；穿透降低目標防禦，狼族硬皮啟動時穿透效果加倍；暴擊依機率造成雙倍傷害；格擋依機率令來襲傷害減半；減傷依百分比降低來襲傷害。新舊詞綴均保留文字用途，特殊狼族效果標明適用對象。品質始終以繁中名稱表示，不只用顏色區別。原有頁數、篩選、穿戴與出售確認/focus 流程維持原 contract。

儲存世界成功後保留目前位置與視窗，顯示「世界已儲存」。每次有效操作與時間推進立即保存，選單顯示「已存於此瀏覽器 · 操作後立即保存」。進度與待補寫紀錄保存在當前 origin 的 localStorage，完整紀錄追加至 IndexedDB，沒有網路同步。選單的「匯出遊玩紀錄」下載 JSON，包含歷次紀錄、待補寫內容及目前進度；不提供編輯、匯入紀錄或回退。

讀取失敗保留原始存檔並持續顯示保護提醒；進度保存失敗暫停時間，復原提示不自動消失，提供重試與匯出。已知進度保存失敗後，移動、操作、等待與恢復時間先重試保存目前進度，成功才繼續；首次失敗時已發生的操作留在記憶體與待補寫資料中。紀錄庫寫入失敗另提示待補寫，進度仍可保存時允許繼續遊玩；重試存檔或重載後補寫，兩項同時失敗時都顯示。紀錄庫無法讀取時，匯出明示舊紀錄尚未包含。重建不可逆覆蓋目前進度，保留舊遊玩紀錄；必須在 app-owned 視窗確認，預設聚焦「保留目前世界」。沒有可用的 Undo。多分頁保存防護依下段的單一使用權規則。

同一 origin 的遊戲分頁透過 Web Locks 保持單一存檔使用權；取得前僅讀取預覽、時間暫停且禁止操作。取得後重新讀取最新存檔再恢復正常運行。其他分頁不自動接管，提示先關閉使用中的遊戲頁面，再重新整理；不支援安全協調的瀏覽器也停止操作。未取得使用權的匯出讀取磁碟上的最新進度，不將舊預覽當作目前存檔。

探索時，存檔警告與一般訊息共用地圖上方的自然流動容器，長文字換行，兩者不重疊。確認存檔使用權時復原按鈕停用；競爭或協調不可用時提供「重新整理」，已取得使用權但保存失敗時提供「重試存檔」，損毀存檔仍提供「重建世界」。視窗開啟時訊息位於共用 footer。

## 響應式與驗證

桌機保留完整大地圖；平板與手機仍先呈現世界，窄螢幕用可捲動世界視野並跟隨玩家，M 地圖視窗可看全圖。手機底部簡短選單與方向鍵提供移動／互動。視窗受 viewport 與 safe-area 約束，長內容於視窗內捲動，關閉與操作可達。

驗證入口：`npm run check`、`npm run test -- src/presentation/worldProjection.test.ts`，以及 `reports/v2/20261006-reward-core/phase-02/targeted_browser.py` 的至少 10 分鐘 production Chromium 裝備閉環。V2 核心與保存失敗保護另由同階段 `browser-run/verify_browser.py` 驗證，使用 `PLW_NATIVE_V1` 指向已提交的原生 V1 fixture。Chromium 流程需 Playwright、Chromium 與已啟動的最新 build 靜態服務（預設 5202，可用 PLW_V2_URL 指定），不能以 build 或單元測試代替。無 Storybook／lint／formatter；本文件列出驗證入口，不表示這些檢查或 V2 真人 Fun Gate 已執行／通過。

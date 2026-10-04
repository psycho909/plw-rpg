# 遊戲介面契約

視覺正本：[design/DESIGN.md](design/DESIGN.md)。產品規則：[SPEC.md](../SPEC.md)；本文件描述 UI 結果。使用者於 2026-10-03 指定重製，取代 SPEC 54–58 的固定側欄布局；玩法依 SPEC，後續即時保存與追加紀錄依[單機保存 Ticket](../tickets/20261003-local-autosave-journal.md)。

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

本機遊戲無表格選取、日期輸入、表單或 single-select；不建立無用 UI primitive。PixelWindow 是所有 modal 唯一 owner，PixelMeter 是生命／體力／熟練度／作物進度唯一 owner。清單篩選用原生按鈕群組，保持 aria-pressed。

## 導覽、焦點與時間

正常畫面只有地圖、日期／倍率、角色生命／體力／金幣、位置與簡短情境提示／最近一則事件。詳細內容共用 PixelWindow；世界在視窗後保持可見。

- WASD／方向鍵移動；Enter 開啟附近互動；Esc 開選單或關閉視窗；C 角色、I 物品、L 日誌、M 地圖。滑鼠與手機有對應按鈕。
- 快捷鍵忽略 IME、修飾鍵、文字輸入；modal 開啟時不移動玩家，不覆寫原生按鈕 Enter 行為。地圖一個 Tab 入口，方向鍵直接控制角色。
- 原生 dialog.showModal 負責背景 inert，PixelWindow 統一循環 Tab／Shift+Tab，避免焦點跑到瀏覽器介面。開啟聚焦內容／安全取消；Esc 只取消，關閉還原觸發者，觸發者已不存在則回地圖。繼任視窗不可關閉。
- 只允許一個 modal，內部導覽換內容，不疊加 dialog。訊息於 modal 內呈現，避免被 top layer 遮蔽。
- 世界時間照所選倍率流動，開視窗不自動暫停。持續顯示精簡時鐘；等待一季／一年明示會改變所有人的生命與契約，不能於戰鬥／地下城使用。
- 單一畫面無 URL 路由，視窗狀態不寫入存檔。物品選取與日誌篩選僅在視窗開啟期間暫存；關閉後回到預設。文件標題依當前視窗更新為「內容 — 橡谷」。

## 情境操作與復原

附近建築／NPC 的定義使用引擎 Manhattan distance ≤ 1；農作／採集仍依引擎區域條件。服務營業、價格、資源、體力、裝備與傭兵上限取自 config／actions。打烊時視窗保留營業時間與離開按鈕，操作停用；時間流動後條件即時重算。失敗顯示引擎中文原因，不跳離原操作視窗。

NPC 資訊來自真實 NPC state，交談使用活動／職業與世界狀態模板，不保存新社交資料。畫面中的民居、農作格與怪物蹤跡是既有 aggregate state 的呈現投影，沒有新增實體／碰撞／指定怪物機制；迷霧不洩露建築、NPC 或內容。

物品清單＋選取詳情，裝備／藥水呼叫原 actions；沒有引擎背包容量，不顯示假的容量。日誌最新 100 筆、歷史最新 100 筆，居民最多 80，全部 render 有界資料。空分類有中文空狀態。

儲存世界成功後保留目前位置與視窗，顯示「世界已儲存」。每次有效操作與時間推進立即保存，選單顯示「已存於此瀏覽器 · 操作後立即保存」。進度與待補寫紀錄保存在當前 origin 的 localStorage，完整紀錄追加至 IndexedDB，沒有網路同步。選單的「匯出遊玩紀錄」下載 JSON，包含歷次紀錄、待補寫內容及目前進度；不提供編輯、匯入紀錄或回退。

讀取失敗保留原始存檔並持續顯示保護提醒；進度保存失敗暫停時間，復原提示不自動消失，提供重試與匯出。已知進度保存失敗後，移動、操作、等待與恢復時間先重試保存目前進度，成功才繼續；首次失敗時已發生的操作留在記憶體與待補寫資料中。紀錄庫寫入失敗另提示待補寫，進度仍可保存時允許繼續遊玩；重試存檔或重載後補寫，兩項同時失敗時都顯示。紀錄庫無法讀取時，匯出明示舊紀錄尚未包含。重建不可逆覆蓋目前進度，保留舊遊玩紀錄；必須在 app-owned 視窗確認，預設聚焦「保留目前世界」。沒有可用的 Undo。既有多分頁競爭存檔限制不在本次修改中改動。

探索時，存檔警告與一般訊息共用地圖上方的自然流動容器，長文字換行，兩者不重疊；重建／重試按鈕始終可點。視窗開啟時訊息位於共用 footer。

## 響應式與驗證

桌機保留完整大地圖；平板與手機仍先呈現世界，窄螢幕用可捲動世界視野並跟隨玩家，M 地圖視窗可看全圖。手機底部簡短選單與方向鍵提供移動／互動。視窗受 viewport 與 safe-area 約束，長內容於視窗內捲動，關閉與操作可達。

驗證：`npm run check`、`src/presentation/worldUI.test.ts`，以及 `reports/ui/20261003-world-first/verify.py` 的本機 Chromium 流程。無 DOM runner／Storybook／lint／formatter；不宣稱這些未配置的檢查通過。

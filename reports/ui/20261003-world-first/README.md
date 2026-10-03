# 世界優先 UI／UX 驗收紀錄

日期：2026-10-03。工作正本：[UI Ticket](../../../tickets/20261003-world-first-ui.md)、[PT-001 Ticket](../../../tickets/20261003-save-integrity.md)。視覺正本：[docs/design/DESIGN.md](../../../docs/design/DESIGN.md)，實際契約：[docs/UI.md](../../../docs/UI.md)。基準與審查時 HEAD：`ec0240bdfc056649f71cb4fd837233690116fb6a`，分支 `work`。

## 修改結果

`App.vue` 負責探索外框、單一視窗導覽、鍵盤與存檔復原；`WorldMap` 呈現真實 state，`worldUI.ts` 只建立附近互動與圖示投影；遊戲規則仍由既有 engine 負責。此次沒有改 Simulation、經濟、戰鬥、NPC 日程或存檔版本。Astra 的獨立修復只在 saveService 補上田地數整數驗證。

正常探索只保留大地圖、時鐘／倍率、位置、附近互動、主角生命／體力／金幣，以及最近一則事件。地圖在六種測試尺寸佔視窗高度約 61–79%；手機採跟隨玩家的可捲動視野，地圖視窗可查看全圖。

| 原固定內容 | 新入口／呈現 |
| --- | --- |
| 側欄與分頁導覽 | Esc 選單、C／I／L／M 快捷鍵與手機底部按鈕 |
| 完整角色與背包面板 | 角色／物品像素視窗；背包採清單＋選取詳情 |
| 遠端生活操作按鈕 | 到達區域或建築旁後的附近互動；保留真實費用與營業條件 |
| 聚落、居民、威脅數值面板 | 地圖與世界的按需分類；居民資訊與附近交談視窗 |
| 常駐完整日誌／歷史 | L 日誌、選單歷史；各顯示最近 100 筆 |
| 戰鬥／地下城與死亡提示 | 共用像素視窗；戰鬥沿用回合規則，死亡強制選繼任者 |
| 原生重建確認 | 遊戲視窗內明示不可復原，預設聚焦保留目前世界 |

繁體中文涵蓋探索、服務、角色、物品、NPC、日誌、世界歷史、離線摘要、儲存失敗與重建。保留 WASD、Lv. 與英文按鍵名稱作為遊戲符號，沒有引入外部字型。視窗打開時世界仍依選定倍率流動，視窗底部提供時鐘與暫停。

## 視覺與共用元件

`src/style.scss` 是唯一 runtime token owner：背景 `#080808`、表面 `#111111/#191919`、文字 `#f0f0f0/#aaaaaa`、邊框 `#eeeeee/#606060`、反白 `#eeeeee` 搭配 `#080808`；4／8／12／16px 間距、2px 硬邊框、方形按鈕、雙線視窗、分段進度、全域捲軸。沒有漸層、圓角、陰影、模糊或強制動畫；reduced-motion 保持靜態。

共用 `PixelWindow` 管理 modal、背景 inert、Tab／Shift+Tab、Esc 與焦點還原；`PixelMeter` 管理生命／體力／經驗／熟練度／作物生長；`StatusNotice` 管理成功與失敗訊息。各生活、角色、物品、居民、冒險與世界內容使用相同元件與 token。

| 物件 | 圖示／符號 |
| --- | --- |
| 玩家／地形 | 🙂；草地 ·、道路 ─│┼、森林 ♣🌲、農田 ≋、山地 ▲、水 ≈、迷霧 ░ |
| 建築 | 家 🏠、雜貨店 🏪、旅店 🛏️、酒館 🍺、鐵匠 ⚒️ |
| 居民 | 農夫 👨‍🌾、礦工 ⛏️、樵夫 🪓、守衛 🛡️、傭兵 ⚔️、商人 🧺 |
| 世界變化 | 整地 ▤、幼苗 🌱、成熟 🌾；灰狼 🐺、哥布林 👺、營地 🏕️／♜、酋長 👹、礦坑 🕳️ |

NPC 顯示實際位置與職業，同格多人有數量標記；文字與 accessible name 補足 Emoji。聚落階段增加民居投影，實際解鎖的酒館／鐵匠才出現在圖格。農田使用真正的整地、成長與成熟 state；怪物數量、威脅、營地與首領決定森林蹤跡。這些是既有 aggregate state 的投影，不建立新實體或假裝可逐隻指定怪物。迷霧不洩露未知物件內容。

## 實際驗證

本機 Chromium、Playwright Python 與獨立可丟棄 context；沒有開啟正式網站或使用者存檔。完整程式為 [verify.py](verify.py)，實際結果與 source SHA-256 指紋為 [results.json](artifacts/results.json)。最終流程 exit 0、107 項斷言 PASS、零 JavaScript page errors；指紋逐檔符合最終 source。審查結論保存於 Ticket Evidence。

```bash
cd /workspace/plw-rpg
npm run check
npm run dev -- --port 5173 --strictPort
# 另一個 shell，需 Playwright Python 與 /usr/bin/chromium
python reports/ui/20261003-world-first/verify.py
```

- 單元／type check／build：`npm run check` exit 0，6 files／90 tests PASS，vue-tsc 與 Vite 打包通過；沒有新增 npm 依賴。[完整輸出](artifacts/check.log)。
- 意義明確的回歸：附近服務／地區互動優先、世界投影不修改 state／迷霧、按鍵映射、存檔錯誤持續提示，以及 PT-001 小數首次拒絕／合法 0–4／農作載入後繼續 round-trip。這些行為先有預期原因的 RED，再 GREEN。
- 正常世界遊玩：移動、農作整地播種／兩日成熟收割、森林伐木、礦場採石採鐵、附近居民交談、商店買賣、自然成長解鎖村莊、酒館聘請傭兵、戰鬥防禦／藥水／勝利／逃跑、存檔重載。
- 明示 fixtures：城鎮商品折扣／買劍裝備、高能力角色三階段礦坑與退出、死亡繼任、打烊交易停用、損毀 JSON、小數田地、儲存配額錯誤、離線一分鐘。此類證據驗證 UI 與既有引擎接線，不代表新角色自然成長到城鎮或打贏全部 Boss 的平衡驗證。
- 1440×1000、1280×800、1024×768、768×1024、390×844、320×640：沒有 document 水平溢出；視窗在 viewport 內，鍵盤與滑鼠可移動、C／I／L／M、Tab／Shift+Tab、inert 背景、關閉還原、重建安全焦點與取消均有斷言。
- 六尺寸都直接按 WASD 與 Enter 啟動附近互動；地圖視窗的 Tab／Shift+Tab 跳過負 tabindex 的圖格。另以實際 10 秒自動存檔證明恢復成功會更新舊失敗訊息。
- 手機 reduced-motion、網路離線仍可本機移動與存檔；IME 組字不觸發遊戲按鍵。沒有手機實機／觸控硬體、Safari 或 Firefox 驗證。
- 官方 DESIGN lint：`@google/design.md designmd lint DESIGN.md` 與 `docs/design/DESIGN.md` 均 exit 0、0 errors／1 warning，警告是原 Markdown 沒有 YAML frontmatter。沒有配置 ESLint／formatter／Storybook，不宣稱不存在的 runner 通過。
- Premium strict 靜態檢查：以 skill 原版 `audit_project.py --mode strict` 執行，exit 0、0 findings，結果保存在 [premium-audit.json](artifacts/premium-audit.json)；只證明該靜態規則，不能取代瀏覽器或完整無障礙稽核。
- 雲端 onboarding 的 `/workspace/.cloud-onboarding/plw-rpg/smoke.py` 已同步新 UI，渲染、暫停、移動、完整農作、C／I／L／M 與存檔重載 exit 0、零 page errors。

Astra 另在 390／320 × 損毀／寫入失敗／極長讀取錯誤的六個 disposable Chromium 案例驗證訊息不重疊、復原／取消／重試、關閉訊息與移動；全部 PASS，正常點擊未使用 force。[獨立腳本](verify_notices.py)（啟動本機 Vite 5174 後執行）、[六案例結果](artifacts/notices-results.json)、[極長錯誤截圖](artifacts/notices-long-read-error-320.png)。保存腳本只將原 `/tmp` 輸出改到此 artifacts 目錄，斷言不變。

地圖 Tab 回歸由 Astra 於 1280／320 × Tab／Shift+Tab 先取得 [4 個 RED](artifacts/map-focus-red.json)，加負 tabIndex 排除後取得 [4 個 GREEN](artifacts/map-focus-green.json)，並核對 footer／close 循環、Esc 與觸發者還原。[獨立腳本](verify_map_focus.py) 以本機 5174 執行 `python reports/ui/20261003-world-first/verify_map_focus.py green`。主 Agent 最後的 107 檢查再涵蓋所有六尺寸。

## 截圖

- 探索：[桌機 1440](artifacts/exploration-1440.png)、[平板 768](artifacts/exploration-768.png)、[手機 390](artifacts/exploration-390.png)、[窄手機 320](artifacts/exploration-320.png)。
- 詳細視窗：[手機角色](artifacts/character-390.png)、[背包](artifacts/i-1440.png)、[世界地圖](artifacts/m-1440.png)。
- 生活與冒險：[成熟農田](artifacts/farm-mature.png)、[居民交談](artifacts/npc-conversation.png)、[雜貨店](artifacts/shop.png)、[酒館](artifacts/tavern.png)、[戰鬥](artifacts/battle.png)、[礦坑進度](artifacts/dungeon-progress.png)。
- 世界紀錄：[城鎮與威脅 fixture](artifacts/town-and-threat-fixture.png)、[篩選日誌](artifacts/filtered-log.png)、[歷史](artifacts/history.png)。
- 復原流程：[死亡繼任](artifacts/successor-mobile.png)、[儲存失敗](artifacts/storage-failure.png)、[小數存檔保護](artifacts/fractional-save-protected.png)、[離線摘要](artifacts/offline-summary.png)。

## 修正與限制

瀏覽器／審查發現並修正：native dialog 的焦點可跑至瀏覽器介面（補共用 Tab 循環）、附近 NPC 掩蓋森林主操作（地區優先，居民保留次要入口）、存檔失敗訊息被後續活動覆蓋（持續錯誤狀態）、一般訊息蓋住存檔復原按鈕（Astra 處理共用自然流動布局）、未知圖格洩漏建築文字（Astra 加探索判斷），以及地圖數百個負 tabindex 格被誤納入 Tab 循環（Astra 補 tabIndex 過濾）。自動存檔恢復後的舊失敗文字也已更新；較新玩家訊息保持原樣，具備 unit 與實際 autosave 證據。

Spec review 的文件暫存範圍與 Enter runtime 證據缺口已釐清／補測；選擇器歧義、非同步斷言與 Playwright evaluate 意外回傳 function 則修正測試腳本，不算遊戲 Bug。

依使用者指定，存檔完整性 PT-001 交給 Astra。僅新增 `Number.isSafeInteger(preparedPlots)`；首次載入小數就拒絕並沿用原始檔保護。修復不會自動修補已損毀的存檔。

V1 保留原本二元探索迷霧、aggregate 威脅與三階段地下城。差異化老化 portrait、多層知識迷霧、真正營地位置／商路碰撞、季節與年份專用轉場、CRT／音效及額外對話選項可作 V2；需要引擎資料或新的產品決策，未偽造其完成。本次沒有動畫型戰鬥演出或新任務系統，也沒有多分頁存檔競爭修復。

最終獨立 Luna／max Standards 與 Spec review 都無剩餘 blocker；兩個 reviewer 核對最後 staged source／保存結果，未自行重跑 suite。Spec 接受已揭露的 320×640 地圖約 61% 差異，保留手機控制與 HUD。32 個 source hashes 與最後程式逐檔一致，排序 manifest SHA-256：`4abb7b0512bd32889c6515559856a8c7b81a3d8c90b585e0e781efd488aca24a`。最終驗收與 Git 同步由主 Agent 負責，紀錄於兩張 Ticket。

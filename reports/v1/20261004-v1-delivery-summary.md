# Oakvale V1：完成、新增、優化與測試彙整

- 彙整日期：2026-10-04（UTC）。
- 專案：`psycho909/plw-rpg`，Persistent Living World RPG — Oakvale。
- 涵蓋期間：2026-10-02～2026-10-03 的 V1 開發、UI/UX 重製、兩輪多 Agent 遊玩、完整性修復、單機自動紀錄與 Astra 優化規劃。
- 程式與計畫基準：`3fa63919afe44543b4405b0fe3cda90fd1ab86dc`，`work` 分支。
- 本文件依使用者 2026-10-04「把這次 v1 完成、新增、優化的功能及測試的記錄都彙整成一個 markdown」要求建立；為單一 Session 的 L1 文件彙整，不改遊戲行為、不授權新功能施工。

## 1. 交付結果

V1 已具備可遊玩的生活與冒險循環，以及持續演化的 NPC、人口、聚落、威脅、Boss、死亡繼承與世界歷史。後續完成世界優先的黑白復古 UI、存檔完整性修復、操作後立即保存、單機追加遊玩紀錄、唯讀匯出及測試報告自動保存版本。

最新已保存的工程驗證為 **136 項測試／7 個測試檔、TypeScript 與 production build 通過**；單機報告 writer **4 項測試通過**；新增保存功能的實際 Chromium 驗證 **18/18 通過**，另有兩項故障補充驗證通過。完整遊玩已超過使用者指定的至少 30 個遊戲日，並實際擊敗自然生成的森林 Boss 與同一次地下城探索的守衛首領。

**已完成的優化與尚未實作的建議分開記錄。** Astra 後續提出的 9 項優化方案已有規劃文件，尚未實作成遊戲功能。

## 2. 已完成的 V1 遊戲功能

| 系統 | 已完成內容 |
| --- | --- |
| 世界與探索 | 24×16 格狀地圖；橡谷聚落、農田、森林、礦區、迷霧山谷；探索與移動推進時間，水域不可通行。 |
| 主角操作 | 玩家直接控制一名主角；WASD／方向鍵、畫面方向鈕、點地圖步行；附近建築與居民互動。 |
| 世界時間 | 日夜、四季、年份；每季 30 日、每年 120 日；暫停及 ×1／×5／×20 倍率；公開等待一日、一季或一年。 |
| 居民與生命週期 | 七種職業、工作／旅行／休息日程、技能成長、出生、移民、衰老、自然死亡與傷勢；人口與容量受世界規則限制。 |
| 耕作 | 四塊田；整地→播種→兩日成熟→收割；消耗體力與時間，耕作技能影響產量。 |
| 採集 | 伐木、採石、採鐵礦；資源消耗與每日再生；取得素材、金幣與技能經驗。 |
| 交易與裝備 | 雜貨店、鐵匠鋪；受位置、營業時間、金幣與聚落階段限制；城鎮商品折扣；武器／防具穿脫，不可出售最後一件穿戴中裝備。 |
| 休息 | 聚落免費休息、旅店住宿、酒館歇腳；恢復生命／體力，費用與經過時間依服務規則計算。 |
| 角色成長與物品 | 等級、EXP、四項生活／戰鬥技能、生命、體力、屬性、背包與治療藥水。 |
| 回合戰鬥 | 攻擊、防禦、藥水、逃跑；怪物與精英、裝備效果、勝利經驗、金幣與掉落；戰死進入繼承流程。 |
| 地下城 | 探索迷霧後發現廢棄礦坑；普通怪、精英、守衛首領三段遭遇；完成獲額外鐵礦，可離開、撤退與重新探索。 |
| 酒館與同行者 | 村莊解鎖；最多主角＋兩位同行者；聘金、每日薪資、三日契約；攻擊、低血治療／護衛、欠薪與到期解約。 |
| 聚落成長 | 小聚落→村莊→城鎮；自主成長影響容量、設施、商品與價格，村莊解鎖酒館與鐵匠鋪。 |
| 威脅與 Boss | 怪物人口、營地與威脅自然成長；兩次預警後生成哥布林酋長；影響安全、收入與居民傷勢；擊敗後歷史保留，世界繼續演化。 |
| 世界繼承 | 主角死亡後選成年 NPC 接續；保留世界時間、原角色與重要歷史，不因死亡重置世界。 |
| 日誌與歷史 | 近期事件與永久重要歷史；分類查閱；重大聚落、生命週期、威脅與 Boss 事件保存。 |
| 存檔與離線 | 本機保存、重新載入、最多 8 個真實小時的離線演化摘要；舊 version 1 存檔可讀，損毀資料保留原文並拒絕覆寫。 |

規格與驗收來源：[SPEC](../../SPEC.md)、[世界核心](../../tickets/20261002-v1-core-world.md)、[生活與冒險](../../tickets/20261002-v1-life-adventure.md)、[存檔交付](../../tickets/20261002-v1-persistence-delivery.md)。

## 3. 已完成的 UI/UX 新增與優化

依 [docs/design/DESIGN.md](../../docs/design/DESIGN.md) 與 [UI 契約](../../docs/UI.md)，將原先固定側欄、數值面板與完整日誌改為世界優先的復古 RPG 介面。

| 面向 | 完成結果 |
| --- | --- |
| 正常探索畫面 | 大地圖為主；保留精簡時鐘／倍率、位置、附近互動、生命／體力／金幣與最近一則事件。 |
| 視覺語言 | 繁體中文、黑白灰、像素硬邊框、方形按鈕、等寬數字與可讀中文字；Emoji 世界物件有文字標示。 |
| 情境操作 | 走到區域或建築旁啟動農作、採集、交易、休息、酒館與 NPC 互動；費用與限制沿用引擎。 |
| 按需資訊 | 角色、物品、日誌、歷史、居民、聚落、威脅、戰鬥與地下城改用共用像素視窗。 |
| 快捷鍵 | Esc 選單／關閉、C 角色、I 物品、L 日誌、M 地圖、Enter 互動；IME 組字與文字輸入不觸發遊戲快捷鍵。 |
| 焦點與復原 | 原生 modal、背景 inert、Tab／Shift+Tab 循環、關閉後還原焦點；重建確認預設聚焦保留目前世界。 |
| 響應式 | 桌機完整地圖、手機跟隨玩家的可捲動視野、全圖視窗、手機方向控制與底部選單。 |
| 世界可見變化 | 真實農作成長／成熟、聚落民居與設施、森林怪物蹤跡／營地／Boss；未探索圖格不洩露建築文字。 |
| 共用呈現層 | PixelWindow、PixelMeter、StatusNotice；SCSS 集中維護 runtime tokens；地圖投影與引擎規則分離。 |
| 儲存失敗提示 | 長文字自然換行，訊息不遮擋復原按鈕；重試、取消與匯出可達；恢復後更新舊錯誤，保留較新的行動訊息。 |

開啟視窗時世界仍依所選倍率流動，可從視窗底部暫停。地圖、民居與怪物圖示是既有 aggregate state 的呈現投影，沒有新增可逐隻選取的怪物、建築碰撞或地下城步行地圖。

實測尺寸為 **1440×1000、1280×800、1024×768、768×1024、390×844、320×640**。最小 320×640 的地圖高度約 61%，其餘約 70～79%；這項設計差異已在 review 揭露並接受。

來源：[UI 完整驗收與截圖](../ui/20261003-world-first/README.md)、[UI 重製 Ticket](../../tickets/20261003-world-first-ui.md)。

## 4. 新增的單機自動保存與遊玩紀錄

### 4.1 進度立即保存

- 每次有效操作與世界時間推進立即保存；操作途中已變更狀態但最後回傳失敗，例如休息期間自然死亡，也保存變更。
- 10 秒自動保存、隱藏頁面與離頁保存保留為補充。
- 進度與待補寫紀錄放在同一筆 localStorage checkpoint，避免只保存進度卻丟失當次待送紀錄。
- localStorage 寫入失敗時暫停時間，持續顯示原因與重試／匯出入口，保留舊 raw 與最新記憶體進度。
- 損毀原檔不會被啟動保存或一般操作自動覆寫；確認重建後才開始新世界。

### 4.2 完整追加紀錄

- IndexedDB 保存建立、舊檔啟用、操作、時間推進、離線進度及重建等紀錄。
- 舊檔首次啟用追加紀錄時明示從此開始；更早的完整遊玩紀錄不追溯補齊。
- 每筆含固定 ID、world ID、主角 ID、世界起訖時間、結果與完整事件；完整事件不受畫面近期 150 筆限制影響。
- 相同 ID／相同內容重送只保留一筆；相同 ID／不同內容拒絕覆寫，保留待送資料並顯示衝突原因。
- transaction 完成後才確認追加成功；清理從最新 queue 移除已確認 ID，不拿等待前的舊世界快照覆寫新操作。
- 紀錄庫失敗時 pending 隨 checkpoint 保存，重載後補寫；重建世界保留舊 archive 與 pending，新的世界使用新 world ID。
- 遊戲介面不提供紀錄編輯、刪除、匯入或回退功能。

### 4.3 唯讀匯出

選單可下載 JSON，包含既有 archive、待補寫內容與目前 checkpoint。紀錄庫無法讀取時，明示匯出尚未包含全部舊紀錄；主進度保存失敗時仍可匯出記憶體內容作為保留資料。

目前採**單機、應用程式只能追加**的範圍。依使用者最新限制，未製作伺服器、帳號、跨裝置同步或外部修改／刪除檔案的防護；不宣稱本機檔案具有不可竄改保證。

來源：[單機保存 Ticket](../../tickets/20261003-local-autosave-journal.md)、[Chromium 驗證](../playtests/20261003-local-autosave/README.md)、[source 指紋與最終 checks](../playtests/20261003-local-autosave/source-checks.json)。

## 5. 新增的測試紀錄自動保存

`scripts/recorded_reports.py` 已接到五條主要測試 harness 與新增單機保存驗證。

1. 每次發布文字／JSON 報告，先追加同目錄 `playlog.jsonl`。
2. 保存產生時間、產生者、檔名、完整 UTF-8 內容的壓縮版本、byte count 與 checksum。
3. append、flush、fsync 成功後，才原子更新可讀的最新報告。
4. 可解碼並核對完整版本；封存失敗不覆蓋舊報告，checksum 不符會拒絕讀取。
5. 保留失敗／blocked 的測試嘗試與工具修正，不把舊失敗改成成功紀錄。

先前已完成的廣測報告以 `initial-capture` 保存當時版本，沒有追溯補出不存在的中間版本。接入 writer 後的重新執行才會逐次追加；新增單機驗證自執行開始就逐 checkpoint 保存。

Linux 實測通過；Windows 的鎖定分支使用 mock 檢查取得／釋放同一 byte，未宣稱 Windows 實機驗收。遊戲本身不需要 Python。

來源：[writer 使用方式與契約](../../scripts/README.md)、[4 項 writer 檢查](../playtests/20261003-local-autosave/writer-check.json)。

## 6. 已修復的 Bug 與審查問題

### 6.1 已確認的遊戲／存檔缺陷

| 編號 | 發現方式／問題 | 修復與驗證結果 |
| --- | --- | --- |
| PT-001 | 受控損毀存檔：`preparedPlots=0.5` 首次載入被接受，正常整地累積至 4.5，下一次重載失敗。 | Astra 增加安全整數驗證；首次拒絕、原文保護、合法 0～4 與正常農作往返通過；RED→GREEN 與 UI 回歸完成。 |
| CPT-001 | 正常操作：付費休息跨午夜，先扣同行者日薪再收住宿費，餘額變負並使存檔無法載入。 | Astra 改為服務開始前先付費，再推進時間及結算薪資；不足額、零餘額、跨午夜、死亡及保存重載回歸通過。 |
| CPT-002 | 受控損毀存檔：下一個 NPC 編號落後，移民後生成重複 ID，後續存檔失效。 | 首次載入驗證 allocator 連續性，拒絕碰撞資料並保留 raw；引擎與瀏覽器驗證通過。 |
| CPT-003 | 受控損毀存檔：重複作物 ID，收割一株卻移除兩株，只取得一份產量。 | 首次拒絕重複作物 ID；正常四田逐一收割、原檔保護及往返驗證通過。 |
| CPT-004 | 受控損毀存檔：事件序號回退，後續播種生成重複作物 ID。 | 事件序號不得落後現有 events／history／crops 的 ID；首次拒絕、原文保護與正常流程驗證通過。 |

以上修復未自動改寫既有損毀存檔、放寬 validator 或更換存檔版本。使用者指定重大 Bug／疑慮交 Astra，已依此委派並整合驗收。

來源：[PT-001 歷史與重現](../playtests/20261003/BUGS.md)、[CPT-001～004 與處置](../playtests/20261003-comprehensive/BUGS.md)。

### 6.2 UI 與單機紀錄審查中完成的修正

| 類別 | 已完成修正 |
| --- | --- |
| UI 復原 | 長錯誤與一般訊息不再遮擋重建／重試；390／320px 六個故障案例正常點擊通過。 |
| 未探索資訊 | 迷霧圖格不顯示未知建築名稱。 |
| 鍵盤焦點 | 地圖視窗 Tab／Shift+Tab 跳過負 tabindex 圖格，保留合理焦點循環。 |
| 自動保存訊息 | 恢復成功會更新舊儲存失敗文字，較新玩家行動訊息不被覆蓋。 |
| 報告 writer 平台鎖 | POSIX-only 鎖改成平台標準函式庫；Linux 實測與 Windows byte-lock mock 通過。 |
| 雙重儲存錯誤 | localStorage 與 IndexedDB 同時失敗時，兩種原因都可見，復原按鈕可達。 |
| Store 錯誤原因 | 保留 repository 的拒絕原因，移除沒有證據的「進度已存入」提示；慢 reject 期間新操作及 pending 保留。 |
| IndexedDB 中止順序 | 避免 request error 先以 null 拒絕並吞掉原因；terminal abort 才拒絕，保留衝突／quota 原因與待送內容；RED→GREEN、真瀏覽器通過。 |

審查還修正報告引用、source／build 指紋、typecheck exit code 證據與測試 fixture 隔離。Playwright 參數、選擇器、誤寫的 checkpoint 名稱等 harness 問題保留歷史，但不算遊戲 Bug。

來源：[UI 審查與限制](../ui/20261003-world-first/README.md)、[完整測試最終 review](../playtests/20261003-comprehensive/final-review.md)、[單機紀錄最終 review](../playtests/20261003-local-autosave/local-review.md)。

## 7. 測試紀錄彙整

各輪數字對應不同版本與測試目的，**不將重跑、回歸或相同案例相加成唯一測試總數**。正常 UI、公開等待、引擎加速與受控故障注入分開記錄。

### 7.1 V1 初版與第一輪多 Agent 遊玩

| 階段／路線 | 實際結果 |
| --- | --- |
| V1 初版全量檢查 | 77/77 程式測試、TypeScript、production build 通過；涵蓋 simulation 28、actions 17、saveService 27、store 4、loop 1。初版安裝／依賴 audit 紀錄為 0 vulnerabilities，非本彙整日重跑結果。 |
| 初版瀏覽器全流程 | 新世界→移動→耕作→採集→買賣→裝備→戰鬥→酒館→地下城→保存／重載→死亡繼承；390px 窄螢幕可操作。 |
| 第一輪生活 | 10.56 遊戲日；四田、未成熟／未整地拒絕、採集、交易、藥水、體力、營業、休息、居民日程與重載。 |
| 第一輪冒險 | 兩場森林勝利、攻擊／防禦／藥水／逃跑、Lv.1→Lv.2、迷霧探索、礦坑第一層及退出；三季等待後成村、裝備與聘用成功。當輪未完成整座地下城與森林 Boss。 |
| 第一輪存檔 | 正常保存與關頁後續玩；另測 8.5 小時離線、非法 JSON、不支援版本、缺結構，確認上限與原文保護。 |
| 第一輪世界 | UI 等待 64 年；主角 16→80 歲自然死亡、選成年居民繼承；人口 80、城鎮、威脅 3／Boss 與歷史延續。 |
| 第一輪補充 | 鍵盤、倍率、自動保存；受控注入重現 PT-001，當輪僅紀錄，之後修復。 |

四條 Agent 路線皆預設 seed 909、各自獨立 browser context，不代表四種 seed。來源：[初版交付](../../tickets/20261002-v1-persistence-delivery.md)、[第一輪整合報告](../playtests/20261003/README.md)。

### 7.2 UI 重製與完整性整合

- 全量 **90 項／6 檔**測試、型別檢查與 build 通過。
- Chromium **107 項斷言、六種 viewport**通過，0 JavaScript page errors；包含鍵盤、焦點、視窗、正常操作、壞原檔與 quota 保護。
- 正常生活流程與城鎮／高能力戰鬥／死亡／離線等受控 fixture 明確分列。
- 390／320px × 損毀／寫入失敗／極長讀取錯誤，共六案例正常 click 通過。
- Premium strict 靜態檢查 0 findings；DESIGN lint 0 errors、1 個缺 YAML frontmatter 的 warning。未配置 ESLint／formatter／DOM unit runner，沒有宣稱其通過。
- 雲端 onboarding smoke 已更新新 UI，渲染、暫停、移動、完整農作、快捷鍵與存檔重載 exit 0，0 page errors。

來源：[UI 驗收](../ui/20261003-world-first/README.md)、[107 項結果與 source 指紋](../ui/20261003-world-first/artifacts/results.json)。

### 7.3 第二輪大範圍、完整性與長時間遊玩

使用者確認「至少一個月」指 **至少 30 個遊戲日**。本輪固定基準 `694c6d7`，五路線完成。

| 路線 | 方法／時長 | 結果與重點 |
| --- | --- | --- |
| 生活／經濟 | 正常 UI；公開等待；約 15 分 01 秒 | 到第 **181 日**；五條情境、176 項操作、159 checkpoint、158 次重載比對；四田分批成熟、採集、交易、休息、Town 折扣、裝備與營業邊界；0 page errors。 |
| 冒險／Boss | 正常 UI；公開等待；完整成功跑約 57.856 秒 | 經過 **155.487 遊戲日**；37 checkpoint、7 場完成勝利；正常賺錢、裝備、兩種同行者、同一次礦坑三層 clear、自然森林 Boss 擊敗、戰鬥中重載與薪資／到期；0 page errors。 |
| 保存／故障 | 正常往返＋受控損毀／API 注入 | 基準 **13 案：11 PASS、2 個缺陷**；正常、死亡、戰鬥、離線 0／未來／負值／8 小時上限、raw 保護、容量與停用保存。缺陷經修復後另有驗證，不將原失敗改成 PASS。 |
| 長期世界 | 公開引擎 headless 加速；非實時 UI | **8 seeds 各 500 年**，共 4,000 世界年；484,000 日步、4,000 年度檢查、56 次自然死亡／繼承、4,056 精確存檔往返；數值、人口、日曆、歷史、ID 與存續通過。 |
| 連續瀏覽器 | 真實 **1,200.293 秒（20 分鐘）**、UI ×20；不注入時間 | 20 checkpoint、自然跨季、3 次重載；0 page errors；保留 1 筆 console 404，依服務 log 關聯 favicon。最終為第 1 年夏 4 日。 |

長期 seeds：`0、1、42、321、909、4294967295、7、20261003`。另有相同總時間三年、以 1 分鐘／1 小時／1 日／30 日步長推進的確定性比較，序列化結果一致。

森林 Boss 路線實際從警告、自然生成、準備隊伍到擊敗；最終存檔含 `boss.defeated`，隔日仍有薪資與威脅演化。地下城三層使用同一次 run 驗證；先前不完整 run 的誤命名 checkpoint 已排除，保留歷史。

修復快照另完成 **124 項／6 檔**全量檢查、型別／build 與 **107 項 UI 回歸**；測試 fixture 隔離後定向 57 項及明確 exit 0 的 typecheck 通過。最終修復引擎再完成 8×500 年、4,000 年度保存與 56 次繼承；正常四田逐一收割、四類壞 raw 保護、500 年世界桌機／390px 載入、8-seed 全圖 308 內陸格與每 seed 84 個拒絕檢查通過。

來源：[第二輪整合](../playtests/20261003-comprehensive/README.md)、[生活](../playtests/20261003-comprehensive/life/report.md)、[冒險](../playtests/20261003-comprehensive/adventure/report.md)、[存檔](../playtests/20261003-comprehensive/persistence/report.md)、[長期世界](../playtests/20261003-comprehensive/longevity/report.md)、[20 分鐘 soak](../playtests/20261003-comprehensive/soak/report.md)、[世界觀／系統映射](../playtests/20261003-comprehensive/WORLD.md)。

### 7.4 最新單機立即保存與追加紀錄

最終固定 build 5186，2026-10-03 **15:38:53～15:39:42 UTC**，Chromium **18/18 PASS**。

| 類別 | 實際驗證 |
| --- | --- |
| 操作立即保存 | 移動後 checkpoint 與紀錄在按手動保存前已更新；無效移動不憑空新增操作紀錄。 |
| 正常 30 日 | UI 等待一季，推進 43,200 分鐘；單筆 time 紀錄保存該次實際 3 個自然事件。 |
| 新版短 soak | 真實 **35.13 秒、×20**；推進 1,408 分鐘；archive **5→357**、ID 全唯一、pending 0。這不是前輪 20 分鐘 soak。 |
| 失敗補寫 | IndexedDB readwrite 失敗後 pending 保存在 checkpoint，重載後該 ID 補寫一次。 |
| 去重與衝突 | 相同內容重播不重複；異內容同 ID 拒絕，原 archive body 不變、pending 保留、原因可見。 |
| 匯出／修復 | 匯出 archive、pending 與 checkpoint；修復衝突後正常補寫，保留期間新紀錄。 |
| localStorage 故障 | quota 失敗：舊 raw 逐 byte 不變、暫停、記憶體資料可匯出；恢復 API 後從正常選單重試保存最新進度。 |
| 快速操作 | 同一 browser task 派送 12 個真實按鈕 handler，12 個目標 ID 全部唯一追加，世界推進 60 分鐘。 |
| 重建世界 | 新 world ID；先前 375 個 archive ID 保留，另追加 reset；舊未補寫紀錄不丟失。 |
| 響應式與錯誤 | 1440／390px 選單無水平溢位；0 page errors、觀察到的 HTTP failures 0；1 筆未歸因 URL 的 console 404 保留。 |

兩項主 Agent 同 build 補充通過：

- **390px 雙故障復原：** localStorage 與 IndexedDB 同時失敗，兩個原因可見、舊 raw 不變、暫停與匯出可用；恢復後目標 ID 各提交一次。
- **紀錄庫失敗期間重建：** 舊 pending 完整物件保留；恢復後舊 archive、舊 pending 與新 reset 各一次，世界仍是新 world ID。

正式程式回歸另證明：單次 **220 個事件**完整保存，超過 UI 150 筆上限不漏；休息跨年自然死亡雖回傳失敗，死亡、扣款、480 分鐘與事件仍立即保存。不能將 220-event fixture 說成正常 30 日 UI 的事件數。

最終檢查為 **136/136（7 files）＋typecheck／build＋writer 4/4**。獨立審查期間解碼 97 版主 playlog；後續整體 artifact 檢查當時解碼 237 版，並檢查 68 JSON、13 Python、126 PNG、21 Markdown與 source 指紋。這些是當時該檢查範圍的數量，不是整個專案所有證據的總數；格式檢查也不代表重跑遊戲。

來源：[最終瀏覽器紀錄](../playtests/20261003-local-autosave/README.md)、[18 案 JSON](../playtests/20261003-local-autosave/results.json)、[雙故障](../playtests/20261003-local-autosave/root-dual-failure.json)、[pending 重建](../playtests/20261003-local-autosave/root-reset-pending.json)、[136 項 log](../playtests/20261003-local-autosave/astra-idb-abort.log)、[型別與 build log](../playtests/20261003-local-autosave/final-build.log)、[artifact 檢查](../playtests/20261003-local-autosave/final-artifact-check.json)。

## 8. 審查與 SPEC 完整性

- AC-01～20 已有對應驗證，涵蓋主角控制、NPC 生命週期、農作與戰鬥、地下城、隊伍、聚落、威脅／Boss、歷史、保存、離線、純引擎與自動測試。[映射表](../playtests/20261003-comprehensive/README.md)
- V1 初版獨立 reviewer 在完整結論前因額度中斷；依專案 L2 fallback 由主 Agent 分別核對 Standards／Spec，沒有宣稱完整獨立 review。
- 後續 UI 重製、休息／ID 修復、完整遊玩報告與單機追加紀錄完成一般 L2 獨立 review；指紋、來源、規格及解除後 findings 有紀錄，最終無未解阻擋項。
- 遊玩 workers 使用明確 `gpt-6-luna/max` 配置；重大 Bug／疑慮與優化規劃依使用者指定 Astra。配置是路由證據，不是後端模型遙測。
- 主 Agent 負責整合、最終驗收、文件與 Git；一般 review 不等於 L3 Independent Audit 或部署授權。

審查來源：[休息修復](../playtests/20261003-comprehensive/rest-fix-review.md)、[ID 修復](../playtests/20261003-comprehensive/id-fix-review.md)、[完整測試最終審查](../playtests/20261003-comprehensive/final-review.md)、[單機最終審查](../playtests/20261003-local-autosave/local-review.md)。

## 9. Astra 已完成規劃、尚未實作的優化

以下均為**建議／待驗證方案**，不可算成本次已新增功能。

| 編號 | 建議 | 優先與狀態 |
| --- | --- | --- |
| O1 | 保存失敗後的操作與復原邊界 | 首輪第 1 項；先重現持續故障時恢復倍率／等待／動作，再決定窄修正。 |
| O2 | 戰鬥逐回合傷害、治療、護衛摘要；聘用前職能說明 | 首輪第 2 項；改善資訊回饋，維持戰鬥結果與現有聘用規則。 |
| O3 | 等待／離線的世界變化摘要與重要事件呈現 | 首輪第 3 項；使用完整 capture，幫助理解跨季／跨年變化。 |
| O4 | 新版 journal 長玩、寫入與大庫匯出成本量測 | 擴充紀錄前；先證明瓶頸，再優化，不能以延後保存或丟事件換效能。 |
| O5 | 同 origin 多分頁單一寫入者與安全接手 | 後續能力擴充；目前多分頁競爭仍是已知限制。 |
| O6 | 有界歷史分頁、只讀 archive 查閱與大量紀錄匯出 | 後續；大庫成本須先量測，保留完整性與失敗提示。 |
| O7 | 共用行動成本、可用條件與中文停用原因 | 後續；先農作／採集／交易，預覽不改 state 或 RNG。 |
| O8 | 生活經濟比較與一種 NPC 自主世界循環 | 較後階段；先研究採石／採鐵等取捨，再選定新玩法，未調平衡。 |
| O9 | 當前版本的短回歸入口與來源／build 證據關聯 | 隨改動建立；重用現有 helper／writer，保存每次執行版本。 |

來源：[Astra 完整計畫、風險、依賴與驗收](../../docs/plans/20261003-astra-optimization.md)、[規劃 Ticket](../../tickets/20261003-astra-optimization-plan.md)。

## 10. 已知限制與未涵蓋範圍

| 項目 | 目前狀態 |
| --- | --- |
| 單機資料 | origin／瀏覽器各自獨立；無伺服器、帳號或跨裝置同步。應用程式只追加，外部改檔／刪檔防護依使用者要求先不處理。 |
| 多分頁 | 同一 origin 多頁競爭保存尚未改善；列入 Astra O5。 |
| 極端計數器 | 人工 MAX_SAFE_INTEGER 附近的耗盡政策仍有低優先限制；正常 500 年樣本未到達，不保證無限接續。 |
| console 404 | 舊 soak 有服務 log 關聯 favicon；新版紀錄測試那筆沒有 URL，尚未歸因。兩者不合併說成同一原因，也不改寫錯誤數為零。 |
| 平台覆蓋 | 雲端 Chromium 為主；未完成 Safari、Firefox、實體手機／觸控硬體與 Windows harness 實機驗收。初版 Windows 開發／依賴檢查另有歷史紀錄。 |
| 儲存保證 | localStorage 與 IndexedDB 不是同一原子交易；未驗證硬體斷電永不遺失，故障時提供 pending／重試／匯出。 |
| 長期效能 | 20 分鐘 UI soak 早於新 journal；新版只另有 35.13 秒短 soak。尚不能由此推論最新版數月實時運行的成本或無記憶體洩漏。 |
| 地下城與世界圖示 | 三段遭遇而非步行地下城；民居／怪物蹤跡是狀態投影，非新增獨立模擬實體。 |
| 額外玩法與演出 | 未新增大型任務、家族／社交樹、技能樹、AI 對話、音效／CRT 或戰鬥動畫系統。 |

## 11. 環境、網站與 Git 交付版本

雲端已可用既有 Node.js 24.19.0、npm 11.9.0、Python Playwright 與 Chromium 執行開發／遊玩驗證；UI onboarding smoke 已同步新操作。應用程式沿用 Vue／Pinia／TypeScript／Vite／Vitest，未為後續 UI、追加紀錄或本次彙整新增依賴。

早期 V1 已建立 [正式網站](https://plw-rpg.vercel.app)，並驗證 Vercel Git integration：`main` 更新自動建立 READY production deployment。正式部署採 Node 22、`npm ci`、`npm run build`、`dist`。這是早期交付已保存的驗證，本彙整日沒有重新驗證正式網站。

2026-10-04 彙整時 `git ls-remote` 確認：

- `origin/main`：`8945fa76343a3efed38b21e4615d269f9ebef529`。
- `origin/work`：`3fa63919afe44543b4405b0fe3cda90fd1ab86dc`（加入本彙整文件前）。

**本次 UI 重製、後續完整性修復與單機追加紀錄已在 work 交付，尚未合併 main。** 因此早期正式網站的部署驗證，不代表網站已包含 work 的全部新功能。

| Commit | 已交付內容 |
| --- | --- |
| `75662ae` | V1 核心遊戲、初版測試與交付。 |
| `fbe2691`／`3840cd1` | V1／Vercel 部署紀錄與結案。 |
| `6bb387d`／`ec0240b` | 第一輪多 Agent 遊玩與 Bug 紀錄、結案。 |
| `d9d2b4d`／`694c6d7` | World First UI、PT-001、完整驗收與結案。 |
| `fb5679f`／`4a955dd` | 第二輪廣測、CPT 修復、單機立即保存與追加紀錄、結案。 |
| `ebd9f6a`／`3fa6391` | Astra 優化計畫與規劃結案。 |

來源：[README](../../README.md)、[Vercel 交付 Ticket](../../tickets/20261003-vercel-production.md)。本次彙整只提交／同步 work，不合併 main、不操作部署。

## 12. 驗證入口與本彙整的核對方式

目前程式與 writer 的基本檢查可在 repository root 執行：

```bash
npm run check
python3 -B -m unittest discover -s scripts -p 'test_*.py'
```

瀏覽器流程需要 Playwright、Chromium、與測試來源一致的本機 build。重跑方式請依[UI 驗收](../ui/20261003-world-first/README.md)、[完整廣測](../playtests/20261003-comprehensive/README.md)與[單機保存驗證](../playtests/20261003-local-autosave/README.md)各自版本及固定服務說明；初輪舊 UI runner 不直接用來驗收新版 UI。新執行要保存新版本與來源指紋，不能拿舊 PASS 代替。

2026-10-04 本次工作為文件彙整：實際核對 CHANGELOG、Ticket、報告、JSON、review、Git 版本與來源連結；確認僅新增本 Markdown，檢查 Markdown 空白、相對檔案連結及重點數值。沒有重新執行遊戲測試、build、依賴 audit 或正式網站驗收；本文所有 runtime 數據均保留原執行日期與階段。

文件核對結果：48 個相對引用有效；136／7、writer 4、browser 18、生活 176 操作／159 checkpoint、冒險 37 checkpoint／7 場勝利、8×500 年／56 次繼承／4,056 次往返與 1,200.293 秒等重點數值符合原始 JSON。8 個來源指紋與既有驗證版本一致；staged diff 空白檢查通過，提交範圍只有本 Markdown。此為主 Agent 的 L1 文件自查，非獨立 runtime 驗證。


## 13. 後續八項深度 QA（2026-10-04）

前十二節保留前階段的交付與驗證歷史。本節追加最新單機來源 `c22de4e636215b11057e2a37b0fc4eaf826a8234` 的測試；完整方法、紀錄與限制見[八項 QA 彙整](../playtests/20261004-deep-qa/README.md)。未合併 main、未部署。

- 最新固定 build 真 Chromium 長測：台灣時間 15:22:33.511 至 17:22:33.730，active 7,200.219 秒，120 次取樣；正常 ×20 推進約 200.05 遊戲日。72,013 筆匯出紀錄通過 ID、內容、序號、時間連續性及 checkpoint 驗證。沒有注入時計或強制 GC；自然觀察 Boss 生成，這段長測未與 Boss 戰鬥。
- 記憶體／容量與介面反應見[趨勢圖與分析](../playtests/20261004-deep-qa/soak/clean-run/profile-summary.json)。無 JavaScript page error；另有 favicon 404。單一 headless 情境不能證明所有情境沒有 leak。Astra 確認舊 selector-wait 的 DOM 累積來自測試工具保留，乾淨長測移除該干擾。
- 完成 126 經濟情境與 6 組傭兵配對、15 條各 1,440 日 Threat 路線、人口爆炸／歸零、13 合法死亡繼承與 4 非法輸入拒絕；×20／跨日跨年／Modal／地下城與傭兵保存交叉有真瀏覽器紀錄。收益與契約時間差異列為平衡候選觀察，未直接改公式。
- Astra 修復 checkpoint 保存失敗後仍可恢復倍率或推進動作的 O1 問題；最新 143 tests／7 files、type check、build 與 Chromium 8/8 保存復原回歸通過。詳見[修復與回歸](../playtests/20261004-deep-qa/recovery/README.md)。
- Chromium 12 項、Firefox ESR 12 項 smoke 通過。原生 Safari、iPhone／Android 實機缺少硬體或連線入口，仍待驗收；手機 viewport 不算實機。

長時間監看依使用者要求指定 GPT-6 Luna／low；留存監看至第 90 分鐘，harness 自動完成兩小時後由 root 核對終點。各 QA 報告版本保存在本機追加 archive；不保證防止外部修改或刪除。完整大型原始經濟資料以可逐 byte 還原的 gzip 交付。

後續結案：使用者於2026-10-04明確排除原生Safari與手機實機測試；本輪平台驗收保留已通過的Chromium／Firefox，修訂範圍已完成。上述實機未驗收描述為先前狀態，排除項目不列PASS。QA完整紀錄提交1c0115e並同步work。

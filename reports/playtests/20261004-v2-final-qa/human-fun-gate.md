# Oakvale V2 Human Fun Gate 測試包

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`（V2工程受測來源；交付QA文件commit另見README）。
狀態：**READY FOR HUMAN TEST / Human Fun Gate: PENDING / V2 Product Gate: NOT YET APPROVED**。

這份表尚未由真正玩家填寫。Agent Exploratory Playtest、Playwright、soak與engine模擬不代填真人答案。

## 測試準備

取得 work 候選版本，先用 `git rev-parse HEAD` 記錄所玩 commit；本次受測 source 為上方 SHA，交付文件的 commit 可以不同但 app source 必須一致。執行 `npm ci`（需要安裝時）、`npm run build`，再執行 `npx vite preview --host 127.0.0.1`，於自己的環境開啟終端顯示的 production preview 位址。使用支援 Web Locks 的 Chromium 或 Firefox，以 localhost／HTTPS 執行。只開一個遊戲分頁；若顯示另一頁使用中，先關閉該頁再重新整理讀取最新進度。使用獨立browser profile避免覆寫想保留的存檔；首次遊玩可用新世界，也可以另記V1 migration體驗。

自由玩 **1～2小時實際時間**。×1／×5／×20／暫停都可自行選；開窗不會自動暫停。請從現在世界的資訊決定下一步，無須為了填表完成每項功能。若迷惑、無聊或想停止，請照實記錄。選單「匯出遊玩紀錄」可保存客觀行為，原始資料只在你的瀏覽器，沒有伺服器／跨裝置同步。

可自然選生活、冒險或混合路線。需要提示時再看選單「旅人筆記」「這一生」「住所與產業」「地方消息與委託」；第一次不知道要做什麼也是有用結果，不必隱藏。若用時間快進等公開UI請記錄，不能改存檔為富有角色後當作正常新玩家。

## 遊玩背景與觀察欄（真人填寫）

| 欄位 | 真正玩家紀錄 |
| --- | --- |
| 玩家代號（不必提供個資） | 待填 |
| branch / commit / browser / 裝置 | 待填 |
| worldSeed / 新Save或migration / 路線 | 待填 |
| 開始遊玩時間（含時區） | 待填 |
| 結束遊玩時間（含時區） | 待填 |
| 實際遊玩分鐘／中斷及暫停時間 | 待填 |
| 遊戲內起訖日期／角色代數 | 待填 |
| 最有趣時刻：時間、發生什麼、為什麼 | 待填 |
| 最無聊時刻：時間、發生什麼、為什麼 | 待填 |
| 最困惑時刻：時間、發生什麼、為什麼 | 待填 |
| 第一次想停止遊玩的時間點／原因 | 待填 |
| 第一次產生「再做一下」的時間點／原因 | 待填 |
| 是否主動改變原本計畫？觸發原因？ | 待填 |
| 是否在意任何NPC？名字與原因？ | 待填 |
| 是否在意任何資產？是哪個？ | 待填 |
| 是否在意任何世界事件？是哪件？ | 待填 |
| 新存檔對照：路線／動機／歷史的差異 | 待填或未執行 |
| 不同seed對照：各seed／NPC／事件／選擇差異 | 待填或未執行 |
| Long-life scenario：人生延續／死亡留下什麼的觀察 | 待填或未執行 |
| bug／卡住：時間、操作、預期與實際 | 待填 |

## 八題正式回饋（不得由Agent代答）

| 題目 | 真正玩家回答 |
| --- | --- |
| Q1 你現在最想做什麼？為什麼？ | 待填 |
| Q2 你記得哪一個NPC？為什麼？ | 待填 |
| Q3 你記得哪一件世界事件？為什麼？ | 待填 |
| Q4 你覺得自己的角色現在是什麼樣的人？ | 待填 |
| Q5 有什麼東西是你覺得真正屬於自己的？ | 待填 |
| Q6 你覺得自己的行為真的改變過世界嗎？什麼地方？ | 待填 |
| Q7 如果你的角色現在死亡，你覺得他留下了什麼？ | 待填 |
| Q8 你現在還想繼續玩嗎？如果想，下一件最想做的事情是什麼？如果不想，原因是什麼？ | 待填 |

## 每10～15分鐘的選填速記

時間／上一件事 → 現在下一個目標／原因 → 新資訊或意外事件 → 是否感覺前進 → 是否想停。

這是供玩家回憶用的自由速記，不是要求邊玩邊填大量表格。也可結束後參考自己的遊玩匯出。

## 規格 Phase V2-7 對照項

依正式規格§51，最終真人驗收除1～2小時遊玩、Memory／Motivation QA，還需記錄 **Long-life scenario、New Save comparison、Different Seed comparison**。可分開session，記下各段實際時長、存檔與來源；若尚未做或無證據，對應欄標「未執行」，Human／Product判定仍PENDING，不能把它當已通過。

新世界原生UI使用預設seed909。現行UI沒有seed selector；不同seed可由測試主持人事先用本包[seed17](seeds/seed-17.json)／[seed2026](seeds/seed-2026.json) canonical defaults準備獨立測試profile，方法及hash見[provenance](seeds/provenance.json)。這些是public createGame(seed)→serialize的正常45g／worldTime480初始世界，不可改資源、能力或時間。請透明記錄是原生UI或主持人fixture初始化，所有後續遊玩正常UI；沒有這項準備時先做原生新世界遊玩，對照項保留未執行，不能假稱玩家已比較。不是要求玩家自行改存檔，也不是新增seed功能。

Long-life可另記一段正常保存／繼承的人生觀察；engine的100年模擬只能提供工程證據，不能代替玩家描述人生延續與留下什麼。八題仍由真正玩家回答。

## 回饋分析規則

**正向訊號**：「我還差一點就…」「我想看看…」「我想先…」「那個NPC…」「我的農場…」「那隻Boss…」「我上次…」「下一次…」可能代表Personal Goal、Attachment或Anticipation。記錄具體事物與事件，不只勾Yes。

**負向訊號**：「不知道」「都可以」「就是一直…」「沒有特別」「反正系統會自己跑」「我不知道為什麼要做」。區分Reward Drought（沒有值得注意的新事）、Goal Drought（不知道下一步）、Repetition Wall（知道目標但只剩重複）、Meaningless Reward（資源增加但無用途）。不因單一句話直接判定整個產品失敗，與時間線及行為一起分析。

待真正真人證據後，工程／browser達標且玩家能自然描述自己的一段人生、提出下一個自主目標，再評估Product Gate。大量「不知道」則列Product Findings與改善方向，交使用者決策；不私自大改V2，不開始V3。

## 最終真人判定（目前空白）

- 回饋來源／實際遊玩時長：待填
- Personal Goal：待評估
- NPC／Ownership／World Attachment：待評估
- Meaningful Choice / Consequence：待評估
- Anticipation / Retention：待評估
- Human Fun Gate：**PENDING**
- Product Gate：**NOT YET APPROVED**

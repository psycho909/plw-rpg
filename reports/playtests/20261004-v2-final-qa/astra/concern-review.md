# Astra 重大疑慮窄範圍審查

- Source SHA: `c02b600c6f5f1533374d671b707d333c86d852d7`；凍結 production build `/tmp/plw-v2-final-qa-dist`，JS `index-3j-oQD-G.js` SHA-256 `69f6943b69d9ea376f9d11d4f62277656eea43e0173fa0d24374a76f4f6ff00c`。
- Build manifest: `../build-manifest.json` SHA-256 `6d1ae189d7aa0859d524f07937f834ebdcab115066b43e403381f8c4d9201e00`。
- Reviewed at: 2026-10-05T00:40:05.052940+00:00。
- Scope: 唯讀審查兩项疑慮；未修改 app source、既有玩家資料、balance 或 schema。本報告透過 `recorded_reports.write_recorded` 追加版本。
- 判定：目前沒有已證實的 P0/P1 correctness bug。A 是 P2 工程 scalability／低價值紀錄需求缺口；B 是 P2 產品 agency／事業效用 finding。不得因此宣稱 Engineering 整體 PASS 或 V2 產品通過。
- Human Fun Gate: **PENDING**；V2 Product Gate: **NOT YET APPROVED**。本審查不等於真人 Fun Gate。

## A：每個時間 tick 都保存並追加紀錄

### 已確認行為與量測

`src/engine/gameLoop.ts:5` 的 timer 為 100ms，但只有累積到至少 1 遊戲分鐘才呼叫 advance。`realSecondMinutes=2`：前景 ×1 約每秒 2 次、×5／×20 最高約每秒 10 次。因此「所有倍率都是 10 筆／秒」不精確。

`src/stores/gameStore.ts:83` 每次有效 advance 均建立含 UUID、現實時間、from/to、角色、固定訊息、events 的 time record，即使 events=[]。save 同步序列化完整 GameState＋pending 到 localStorage；正常 IDB ACK 後 flushJournal 再保存一次，故一個 advance 通常可造成兩次完整 checkpoint 序列化。IDB 存的是 PlayRecord，**不是每筆複製整個世界**。`src/services/playJournal.ts` 只追加及去重，沒有低價值 time 合併；export 以 getAll()＋一次 JSON.stringify／Blob 讀出全檔。未證明 export 已失敗，但其峰值記憶體和耗時會隨累積檔量增加。

既有真 Chromium 證據：`../soak/attempt-03/raw_profiles.jsonl`、`results-incomplete.json`，同 source/build。該 run 在 1026.725 秒停止，17 checkpoints，**INCOMPLETE，不能當成兩小時 stability PASS**。

| 指標 | CP1（60.131s） | CP17（1020.126s） | 解讀 |
|---|---:|---:|---|
| IDB records | 603 | 10,210 | 960s 增 9,607，10.007 records/s |
| IDB storage estimate usage | 521,630 B | 2,430,748 B | 端點淨增約 119,320 B/min；非穩定物理斜率 |
| localStorage bytes | 81,587 | 83,779 | current checkpoint 目前小，不能代表完整 journal 小 |
| pending JSON bytes（journalBytesApprox） | 75 | 75 | 只量待補寫 checkpoint metadata，不能解讀為 IDB 全檔量 |
| events / major history | 7 / 1 | 10 / 2 | 世界內有界 view 與完整 IDB archive 是兩層 |

CP2～5 的 storage estimate 約每分鐘增加 520KB，但 CP6／11／16 均下降（例如 CP10 3,721,282→CP11 1,444,834）。符合底層儲存整理可能造成的非單調量測；未直接觀察 compaction，不將其原因寫成已證實。不能報「IDB 永遠以 500KB/min 線性成長」。records 數則持續增加，這點不依賴物理儲存量估測。

100 遊戲年是 120×1440×100=17,280,000 遊戲分鐘。假設固定 ×20、前景 timer 無延誤、無 action 快轉，約 120 真實小時及 **432 萬** time records；×1 約 2400 小時及 1728 萬 records。這是由程式推導的容量風險，**不是已完成的 browser longevity 或 export 測試**。`../engine/long-term-results.json` 的 100 年 pure-engine save/reload PASS 不會走 gameStore／IDB，不能反證此風險。

### 契約與 severity

1. V2 §34 要將 Transient／Gameplay／Major History／Debug Journal 分層，避免細碎事件永久累積成世界史；`events.ts` 已將 world events 限 150、major history 限 20,000。因此 A 不是已證實的「world history 上限失效」。
2. `tickets/20261003-local-autosave-journal.md` 明訂每次有效操作與 advance 立即保存、擷取全部 events、固定 ID 冪等補寫、重建保留舊記錄、不可靜默丟 outbox。不能以最近 N 筆截斷 IDB、忽略事件或降低保存可靠度來消除數字。
3. 最新 QA 提出的「完整 journal 不應無限累積低價值純 time」目前確實未滿足：每個有前進的 tick 都有新空事件 record。列為 **P2 engineering scalability／需求缺口**，不是宣告完全符合後僅附一句可選優化。V2 §47 本身要求追蹤而未提供 quota／延遲數值門檻；現有17分鐘資料沒有證明存檔、匯出或正常遊戲被阻斷，故不能憑未量測的未來故障升成 P1 correctness。

本次QA必須揭露，Engineering performance 對「長期完整 journal 有界／可匯出」只能列 **未充分驗證且有已確認 growth finding**。是否把 P2 修復列為本次交付前置由 root 依使用者最新 acceptance 整合；本 reviewer 不藉此私改凍結 source。若 root 認定目前「不累積低價值時間紀錄」為硬性出貨條件，應修復或將該條列 FAIL，不能改名為 optional 後宣稱通過。

### 最窄無損方向（尚未實作／未執行 RED）

先保留全部已追加 records、不刪除／覆寫既有 ID、保持每次 advance 的世界與 pending 同筆立即持久化。只調整**未來事件為空、連續、同 world/character 的純時間紀錄表示法**：使用 checkpoint 內可恢復的 time span，於有事件、玩家 action、角色或世界切換、明確 save/export 邊界封存；固定 ID 的 immutable segment 只有封存後追加，ACK 仍依目前 queue 清除已確認 ID。若「完整」包含每次原始 tick 的 at/from/to/id，需在 segment 內採可逆壓縮保存全部 tick 欄位，不能聲稱 from/to 聚合與逐筆完整資料等價。接受只記連續時間語意時才用單一 span 取代 tick 粒度。保持舊格式讀取／匯出，不能讓同 ID 內容變動觸發既有 mismatch。

這能降低每 tick 的 record/transaction 放大；保留全部重大事件及全部既有紀錄，就不可能保證整份 archive 在無限遊玩下固定 bytes。應精確訂出低價值 tick 開銷上限及真實事件增長量，不給無限完整檔案的恆定大小承諾。future chunked/cursor export 可減少 getAll 記憶體峰值，屬另一個窄範圍項目。

可供後續修復使用的最小 RED：正常開場＋×20 前進一段無事件時間，驗證每次 world checkpoint 都落盤、時間仍可 reload，但封存 record 數不隨100ms tick逐筆放大；另測 event／action／死亡繼承／reset 邊界、IDB失敗＋reload重送、重覆ACK／同ID不同內容拒絕及新舊混合全檔匯出，證明事件序列與舊records byte-for-byte守恆。當前舊格式會在 record 數要求失敗；測試數值門檻需先定義，不能拿「資料有增長」本身當 RED。

## B：Life 生存與 Life 危機介入的差別

### 靜態事實與現有證據

- `ownership.ts:161` farm business 唯一主動世界輸出為 supplyFarmFood；合法供應會扣食物、加 settlement.food、聲望、供應量、記憶及里程碑。food=100 時在 mutation 前以「聚落糧倉空間不足」拒絕，沒有已知扣料／記帳錯誤。
- `simulation.ts:174` 日產糧=農夫×1.4＋1.8－人口×0.12－Boss存在時1，並 clamp 0..100。正常 run3 已在 CP17 food=100；`long-term-results.json` 三 seeds 的10年 checkpoint 全為 food=100。這足以顯示飽和風險，尚不足證明任何世界永遠不缺糧。
- `livingEvents.ts` food arc 只在 food≤24 才有權重；road arc 的 requestKind 在 `data/livingEvents.ts` 固定 hunt。供應 farm food 不會完成 road request，也不會將 road outcome 轉 helped。
- iron／medicine 請求存在非戰鬥解法；不是所有 Life 危機路徑都不存在。但不能用處理別種 crisis 等同已證明 Life 可處理 road。
- V2 §10.3 承認普通農夫的一生是完整人生；§11 要一種事業做深、農業有限影響；§21 明示 Wolf threat→Hunting Request，沒有承諾每一種危機必有無戰鬥解法。§24 允許安靜時期。單次糧倉滿或單種請求限定hunt不構成 P1實作違約。

### 判定與產品含義

**P2 Product Finding：自然經濟可能長期消除農場事業的主要使用需求，而主導危機需要狩獵，導致 Life 的 Ownership→World Reaction→Consequence 循環偏弱。** 正常Life能不打Boss活下去，只證明生存合法；房屋可休息／儲物、財產能保存，只證明 ownership 功能可用。它們都不能代替「玩家相信自己的生活選擇能改變與自己相關的危機」。這直接影響 Fun Gate Q5（屬於自己的東西）、Q6（改變世界）、Q8（繼續玩原因），但是否有趣仍需真人回答。

目前未發現足以正當化重設經濟、road追加外交／捐款路線、V3 faction/server或其他大功能的 correctness 證據。最窄後续方向是先量測正常農場取得時間之後的有效供應機會、具體需求訊號與影響回饋；若長期零使用機會成立，再就既有供需／請求條件提出單一產品調整，保持正常世界需求，不以debug降低food製造通過。不要放寬容量守衛讓滿倉照樣扣玩家資源。

### 待補資料與結論邊界

已請 engine worker 以正常公開 action 取得非空 ownership，記錄供應成功／blocked；從自然生成危機 checkpoint 做克隆的介入／忽略對照，且區分 storage/save acceptance、Life survival 和 crisis agency。這部分完成後再追加本報告版本；目前不將尚未完成的 counterfactual 寫成 PASS。Life browser 本輪仍在進行，已有自宅、休息／儲物與收穫回饋，不以早期無危機樣本推斷100年Life都缺乏介入。

## 驗證範圍

本 reviewer 執行：根 AGENTS／README／本票與舊journal票契約核對；V2相關章節及store／journal／loop／ownership／events／livingEvents／simulation唯讀追蹤；Python解析run3既有raw重新計算record/storage增長；檢查src無工作樹改動。未新增或運行程式 regression、未完成2小時soak、未進行真人測試。新報告後續以writer archive checksum及內容核對驗證。


## 接續復核與证據更新規則

- 復核時間：2026-10-05T03:51:44.419785+00:00；HEAD 與 Source SHA 均為 `c02b600c6f5f1533374d671b707d333c86d852d7`。重新核對 build manifest 所列全部 source hashes，差異 **0**；`git diff --name-only -- src` 為空。
- 本次重新計算 attempt-03 CP1→CP17：間隔 **959.995 秒**，增 **9,607 records**，平均 **10.0073438 records/s**；IDB estimate 淨增 **1,909,118 B**，折合 **119,320.5 B/min**。CP6／11／16 的 usage 下降亦已逐筆核對。這是舊 run 的歷史量測，不代表 attempt-04 結果。
- 重新讀取 loop、store、journal、ownership、daily economy、request completion 與 V2 §10.3／11／21／34／45／47 契約，維持上述兩項 P2；未發現可重現的 P0／P1 correctness 證據，因此本次不提出 source 修復或未執行的 RED。
- 補充 B 的邊界：`livingEvents.ts:539` 的正常食物購買會減少聚落 food（每份 0.2），因此「food=100 時不能供應」不能推導成「任何正常操作都無法再供應」。刻意買空糧倉後再供應可驗證程式通路，卻不足以證明自然需求與農場事業的長期產品價值。必須分開報告自然供應機會與由玩家交易造成的供應機會。
- 既有 `engine/long-term-results.json` 的三 seed 100 年 PASS 是純 engine 被動世界與 save/reload 證據；既有 checkpoints 的 properties=0，不能當作非空 ownership 長期保存或農場介入成功的驗收。對這部分須引用後續正常公開 action 的專門報告。
- attempt-04 與 engine counterfactual 結果尚未納入本次結論。root 收齊後可透過同一 writer 追加：實際開始／結束時間與 elapsed、至少120個CP、來源／build指紋、journal count與logical export bytes、storage非單調變化、save/export延遲、錯誤、正常UI coverage、Life/Combat/Mixed同危機起點與具體世界結果。不要以舊run或相同source取代新run完成證據；即使兩小時通過，也不可宣稱百年browser archive／export已驗證。

本次證據快照（均對應上述 source；hash 固定的是本次讀取版本，後續更新須新增版本）：

| Artifact | SHA-256 |
|---|---|
| `../soak/attempt-03/raw_profiles.jsonl` | `2923f4b842a23737e0c376913f66b3815788055cd75d02719e6aec3eb3a875c2` |
| `../soak/attempt-03/results-incomplete.json` | `f3989a407ec2e4023060f8bf18cea01f834727e652a15b1d38609b41e5929fb6` |
| `../engine/long-term-results.json` | `ea80f436657527eb4568e390b8a2152457a20241df8acfd4284236778cb604e3` |

發布前讀取既有 astra archive 的所有版本並驗證 checksum，最新版本與 report 完全一致；本次以 `recorded_reports.write_recorded` 追加，發布後再次核對。僅更新本目錄報告與版本紀錄，不 commit／push。Human **PENDING**、Product **NOT YET APPROVED** 保持不變。


## C：CDP DOM／heap 成長追加診斷

同 source `c02b600c6f5f1533374d671b707d333c86d852d7` 的 [獨立 forced-GC 診斷](forced-gc-review.md) 已完成，212.895真實秒，使用另一個可丟棄Chromium profile，完全未操作正式soak的GC或CDP。GC1前後 nodes5439→4864、listeners1360→881、JS used12.11→5.19MB、embedder10.69→4.80MB；30秒正常loop後GC2的nodes=4870。確認部分累積可回收，但未回到初始nodes2165，原因未定，不能說完全只是延遲GC，也沒有足夠證據判成持續leak。列 **P2 待追蹤效能疑慮**，不是P0／P1；正式兩小時natural-GC結果仍需独立判讀。完整steps、UTC、三個served assets hashes、原始錯誤與限制都保留在引用報告及raw JSON；本診斷不代表Engineering或Product通過。

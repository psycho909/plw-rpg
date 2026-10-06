# Performance / Data Growth

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`。正式 Chromium Soak 已完成 7204.975 秒／120 checkpoints；以下是實際採樣與局限。

## 量測邊界

正式Soak每60秒保存正常runtime採樣，不強制GC；DOM document內現存元素數與CDP DOM counters不同。JS used heap、embedder heap、RSS及listeners分別記錄，不把單一峰值直接稱記憶體洩漏。localStorage checkpoint、pending queue、完整IndexedDB archive分開量測。Engine百年save不含完整browser journal。

## 已完成的獨立GC診斷

最新source正常UI、全新獨立profile，約215.7秒；每30秒開關角色／物品／地點／地圖。只在此診斷profile呼叫`HeapProfiler.collectGarbage`，正式Soak未使用。見 [原始診斷](profiling/forced-gc-diagnostic.json) 與 [可重現helper](profiling/forced-gc-diagnostic.py)。

| 點 | CDP nodes | listeners | JS heap MB | embedder MB | process RSS MB |
| --- | --- | --- | --- | --- | --- |
| initial（未強制GC） | 2170 | 438 | 6.107 | 6.956 | 811.262 |
| 180秒自然runtime | 5413 | 1364 | 12.193 | 10.490 | 922.591 |
| GC1 | 4865 | 884 | 6.598 | 5.129 | 830.255 |
| 其後30秒、GC2前 | 4885 | 931 | 27.837 | 5.217 | — |
| GC2 | 4870 | 884 | 6.623 | 5.113 | 814.211 |

兩次GC後JS/embedder/RSS大幅回落，支持「部分可回收」。GC後nodes仍高於最初；最初並非post-GC同條件採樣，且未分析retainer snapshot，因此**不能宣稱沒有長期洩漏**。最終Soak趨勢待足兩小時後補入。

## 已確認的資料成長finding

**P2 scalability：完整IndexedDB journal持續追加低粒度時間紀錄。** 正常active advance會留下完整不可覆寫歷史；pending queue小並不代表archive小。讀取／匯出使用完整`getAll`、JSON／Blob，長期成本可能累積。未觀察達quota或save失敗前，不升級為P1資料損失。建議後續以lossless分段／cursor匯出控制RAM與讀取成本；既有紀錄不得自行刪除或截斷。是否合併未來低價值時間紀錄需先明確定義紀錄完整性契約。

Engine三seed100年checkpoint 326,261～361,136 bytes；正常非空ownership route100年329,745 bytes，皆可save/reload。近期events150/news60/arcs12/requests12等有界，不代表journal有界；major history仍隨世界增加。

## 完整兩小時自然 GC 趨勢

[圖](profiling/trends.png)、[CSV](profiling/checkpoints.csv)、[統計](profiling/summary.json)均出自本次 attempt06。Root已視覺檢查PNG。圖／表的first/last為checkpoint1／120，不是建世界瞬間。CP30／31在重載後仍有2個CDP documents，CP32才回到1；per-document統計排除這兩筆，使用CP1–29／32–59／60–89／90–120，完整120筆整體統計與CSV不變。重載標記只代表control checkpoint，不證明GC或無leak，見[分段修正證據](review/profile-boundary-fix.md)。

| 指標 | checkpoint1 | checkpoint120 | 120點採樣峰值／範圍 |
| --- | --- | --- | --- |
| JS used heap | 14,933,996 B | 16,911,592 B | 6,450,224～65,551,796 B |
| Embedder heap | 7,693,928 B | 11,799,008 B | peak35,137,440 B |
| Chromium process-tree RSS | 879,263,744 B | 972,259,328 B | peak1,003,753,472 B；共享頁可重複計算 |
| 當前document元素 | 887 | 886 | 879～944，未持續增加 |
| CDP DOM nodes（含detached） | 2,577 | 34,417 | peak35,643；重載後大幅回落 |
| CDP listeners | 757 | 5,996 | peak7,381 |
| localStorage checkpoint字節 | 81,587 | 144,945 | +63,358；與完整journal不同 |
| Browser storage estimate | 523,382 B | 13,482,616 B | peak21,405,099 B；估值會下降，不代表record被刪除 |
| IndexedDB archive record count | 605 | 72,065 | 持續增加；endSnapshot稍後為72,094 |

較晚的post-export end採樣另有JS heap54,872,784 B、process-tree RSS1,008,807,936 B與CDP34,581 nodes；不把checkpoint120誤稱匯出後最終瞬間。

Heap呈自然GC波動，當前document元素數穩定；CDP detached nodes／listeners在每輪document內明顯增加，仍保留 **P2 C03 retention observation**。獨立強制GC診斷支持部分可回收，但沒有retainer分析，不能寫「沒有leak」。正式Soak沒有強制GC。

完整UI export為24,313,993 bytes：72,068筆已歸檔紀錄＋5筆互不重複pending，合計72,073唯一紀錄；已歸檔ordinal連續1～72,068。匯出checkpoint worldTime290548；正常×20仍運作至endSnapshot290652，因此不可把晚採样IDB72,094與較早export cutoff差額誤稱匯出遺漏。[獨立匯出核對](review/soak-export-check.json)保存hash、角色代數與邊界。

## 操作延遲與穩定性

正常UI round-trip p95（NumPy線性插值）：開窗226.46ms／關窗138.72ms／移動273.11ms／manual save176ms。Save/reload/continue三次為1159.9／1503.7／1720ms；17核心欄位在pre-app reload exact match，包含當時的新繼承角色。這些包含Playwright及兩個animation frames，**不是直接localStorage／IndexedDB API寫入延遲**，也不是手機或真人體感證據。

Page errors0／unhandled rejections0／resource failures0／interruptions0；console1筆favicon404。CP36／88／92有dialog關閉driver timeout，後續操作／存檔／世界仍運行；不能稱UI全程零failure。

Plot helper首次執行遇到read-only Matplotlib／fontconfig cache warnings，Matplotlib以/tmp fallback完成，exit0且PNG可讀；屬環境工具diagnostics，非遊戲runtime錯誤。正式source／rawSoak沒有因此修改。

100年engine checkpoint約0.33～0.36MB仍可保存／重載，但不含72k筆browser journal，不能拿它證明單機全歷史無成長成本。現況沒有quota／save failure證據，維持P2 scalability，未升為P1。以上不宣告主觀流暢或好玩。

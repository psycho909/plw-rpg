# Phase10-D：Long-world 與保存穩定性

## 結果

**依遊戲曆法執行的 No Intervention 3 seeds × 10／50／100 個遊戲年：9/9 通過。** 每個檢查點的完整 GameState save/reload equality 與重載後一天 continuation equality 均成立；明確孤兒參照掃描共 0。

最新 runner attempt：[`attempt-20261016T065808351Z`](d-runner/attempt-20261016T065808351Z/summary.json)。執行 HEAD `e9f2efc90ad7da46331245a8ee229a3296187fcf`；123 個追蹤 `src/` 檔案的 fingerprint 為 `3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842`。Manifest 記錄曆法設定及每年分鐘數。

## 曆法修正與歷史證據限制

遊戲曆法一年是 `CONFIG.daysPerSeason * CONFIG.seasons.length`，目前為 30 × 4 = 120 天；每一天 1,440 分鐘，因此一年為 172,800 分鐘。`src/engine/calendar.ts` 以四季長度計算遊戲年份。Phase10 runner 已改為從 `CONFIG.daysPerSeason * CONFIG.seasons.length * CONFIG.minutesPerDay` 推導年長，並以新存檔 `worldTime` 為基準累計。

修正前的 D attempt [`attempt-20261016T034911258Z`](d-runner/attempt-20261016T034911258Z/summary.json) 將一年設為 360 天，所以其標示的 10／50／100 實際是 30／150／300 個遊戲年。原始 attempt 保留；[`calendar-correction.json`](d-runner/attempt-20261016T034911258Z/calendar-correction.json) 說明正確解讀。該次 parity 與參照掃描仍是有效的更長時間測試，但不能代表指定的 10／50／100 年檢查點。

Phase8 `scripts/phase8/run-world-crisis.mjs:272,346,372` 也使用 360 天作為一年；Phase8-D「10／50／100 年」因此實際是 30／150／300 個遊戲年。這是 Phase8 歷史證據的時間尺度限制，不是產品缺陷。原模擬與保存 parity 可作為更長時間路徑的證據，但不能用來聲稱已涵蓋精確的 10／50／100 個遊戲年；本次正確曆法的 Phase10 run 補上該證據。Phase8-D1 的資料與測量限制見 [`Phase8 long-world consolidation`](../../../20261014-balance-tuning/phase-08/long-world.md)。

## 方法

- 情境為正常新存檔：`createGame(seed)`，沒有 fixture override，也沒有玩家操作。
- 每個檢查點從新存檔的 `worldTime` 起累計指定遊戲年數。曆法為每季 30 天、每年 4 季、每天 1,440 分鐘，即每個遊戲年 172,800 分鐘；各年終點分別為起始時間加 1,728,000、8,640,000、17,280,000 分鐘。新存檔起始 `worldTime=480`，所以 checkpoint 為 1,728,480、8,640,480、17,280,480。
- 使用匯出的 `simulation.simulate()` 推進；每個 horizon 以 `serialize`／`deserialize` 比較完整 GameState，並比較 live 與重載狀態各續跑一天後的完整狀態。
- 完整狀態包含 `rngState`、`worldTime`、characters、NPCs、reward、crisis、events、history 等。`lastSavedAt` 固定為 `0`，因其是保存 metadata 而非模擬狀態。
- 另掃描 actor、party、property、arc/request、memory、crisis contribution/recovery、reward owner 參照；每個檢查點也經 `deserialize` 嚴格驗證。
- 存檔大小是 `serialize` 輸出的 UTF-8 JSON payload bytes，不代表 IndexedDB/localStorage 的實體使用量或瀏覽器配額。

## 九個檢查點

| Seed | 遊戲年 | `worldTime` | RNG | 人口／存活 NPC | Safety | Prosperity | Boss spawns | 危機數 | History | 金幣 | 開啟 request | JSON bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 40131 | 10 | 1,728,480 | 2,286,315,972 | 80／79 | 26.35 | 100.000 | 3 | 3 | 106 | 3,600 | 0 | 227,386 |
| 40131 | 50 | 8,640,480 | 571,579,292 | 80／79 | 25.00 | 97.782 | 9 | 11 | 311 | 3,600 | 1 | 273,518 |
| 40131 | 100 | 17,280,480 | 3,607,647,442 | 80／80 | 43.35 | 99.416 | 19 | 22 | 666 | 3,645 | 0 | 379,777 |
| 40132 | 10 | 1,728,480 | 4,088,973,152 | 80／79 | 25.00 | 100.000 | 1 | 2 | 97 | 3,600 | 0 | 211,769 |
| 40132 | 50 | 8,640,480 | 578,678,778 | 80／79 | 25.00 | 100.000 | 8 | 11 | 312 | 3,600 | 1 | 271,558 |
| 40132 | 100 | 17,280,480 | 3,567,353,305 | 80／80 | 26.95 | 100.000 | 14 | 23 | 651 | 3,645 | 0 | 343,933 |
| 40133 | 10 | 1,728,480 | 2,511,802,615 | 80／79 | 39.20 | 95.368 | 4 | 3 | 109 | 3,600 | 2 | 232,366 |
| 40133 | 50 | 8,640,480 | 3,961,099,355 | 79／78 | 25.00 | 99.748 | 15 | 11 | 335 | 3,555 | 1 | 337,962 |
| 40133 | 100 | 17,280,480 | 2,781,464,139 | 80／80 | 29.05 | 100.000 | 21 | 22 | 669 | 3,645 | 0 | 352,927 |

所有 checkpoint 的 settlement stage 均為 town；food 與 infrastructure 均為 100；Threat level 為 3、monster population 為 100，Boss 均存活且沒有自然擊敗。Character 的存活數在 10／50 年都是 1，100 年都是 0。Material units 與 reward instances 均為 0；每個 checkpoint 的事件清單都是 150 列。全部 9 個 checkpoint 的 `saveReloadEqual` 與 `continuationEqual` 為 true，孤兒參照為 0。

108 次危機結果合計為 29 decisive success、16 costly success、38 setback、25 local defeat；108 次 recovery 都是 `not_required`，pending、granted、cancelled 均為 0。這是 No Intervention 的模擬結果，不代表玩家介入後的危機處理體驗。

No Intervention 中玩家角色到 100 年時已死亡，沒有 succession event；每個 seed 仍只有一筆 character record。這是因 runner 沒有發出玩家繼承操作，不能據此判定一般 succession 路徑失敗。

## 判讀與限制

- 三個 seeds 是有限樣本；結果顯示測試路徑上的世界持續運作、存檔往返及一天續跑一致，不代表所有玩家路徑。
- 本次修正直接以遊戲曆法計算 10／50／100 年。修正前 Phase10 attempt 與 Phase8-D 長跑都以 360 天作一年，應按 30／150／300 個遊戲年解讀；保留其較長 horizon parity 證據，不再把它們當成精確年數的證據。
- 100 個遊戲年模擬不是人類玩家遊玩 100 年；No Intervention 不執行角色接替、戰鬥或 UI 行動。
- JSON payload bytes 不能推論瀏覽器儲存容量；本次沒有瀏覽器 quota 或真實瀏覽器重載驗證。

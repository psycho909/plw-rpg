# Phase10-D：Long-world 與保存穩定性

## 結果

**目前來源的 No Intervention 3 seeds × 10／50／100 年確認：9/9 通過。** 九個檢查點都完成完整 GameState save/reload equality、重載後一天 continuation equality 及明確孤兒參照掃描；孤兒參照共 0。

最終 runner attempt：[`attempt-20261016T034911258Z`](d-runner/attempt-20261016T034911258Z/summary.json)。原始 checkpoint、進度、manifest 與 SHA-256 清單均在同一目錄。D 執行快照 HEAD `4a71d3599cdf17ac3dab189d88e16fabcebe5033`；該快照的 119 個追蹤 `src/` 檔案 fingerprint 為 `d312c8b3a95f96ba6609d2531fd770d2b19df3ac64a7796905c2c1fa29ecd305`。目前 HEAD 是 `2330441d76ccfb42d064b8442709c26733ab48fd`；D snapshot 之後僅新增 Phase10-C 測試 `src/engine/phase10GoalContinuity.test.ts`，沒有產品程式變更。

## Phase8 證據可重用性

依 dispatch 指定重做：

```text
git diff 5e223beb2ef056968861bc4c7125c1fb41da8728 HEAD -- src/engine src/domain src/data src/services
```

以 pinned D run HEAD `4a71d359` 比對，差異僅有 `src/engine/wolfFamily.ts` 與 `src/engine/wolfFamily.test.ts`。production 差異抽出 wolf core presentation 文字，供遭遇準備資訊與戰鬥提示共用；測試差異驗證該文字。沒有模擬、存檔、RNG、domain、data 或 services 的行為差異。目前 HEAD 相較 D snapshot 新增的 Phase10-C 測試不進入產品程式。據此重用 Phase8-D1 的核心模擬證據，並以本次 D snapshot 9 個檢查點補上保存大小與孤兒參照確認。

Phase8-D1 六個情境 × 三個 seeds × 10／50／100 年，共 54/54 檢查點 parity；No Intervention 三個 seed-century 共 201 次危機。來源說明與測量限制見 [`Phase8 long-world consolidation`](../../../20261014-balance-tuning/phase-08/long-world.md)：D1 沒有提供可比較的存檔大小系列，本次測量補足這項資料。

## 方法

- 情境為正常新存檔：`createGame(seed)`，不設定 fixture、不修改遊戲狀態、不執行玩家操作。
- 每個 horizon 從新存檔的 `worldTime` 起累計 `year × 360 × 1440` 分鐘。新存檔起始 `worldTime=480` 分鐘；runner 將此基準與 horizon 定義寫入 manifest。
- 使用匯出的 `simulation.simulate()` 推進；在每個 horizon 以 `serialize`／`deserialize` 比對完整 GameState，並比較 live 與重載狀態各續跑一天後的完整狀態。
- 完整狀態包含 `rngState`、`worldTime`、characters、NPCs、reward、crisis、events、history 等。`lastSavedAt` 固定為 `0`，因其是保存 metadata 而非模擬狀態。
- 另掃描 actor、party、property、arc/request、memory、crisis contribution/recovery、reward owner 參照；每個檢查點也經 `deserialize` 嚴格驗證。
- 存檔大小是 `serialize` 輸出的 UTF-8 JSON payload bytes，不代表 IndexedDB/localStorage 的實體使用量或瀏覽器配額。

## 九個檢查點

| Seed | 年 | `worldTime` | RNG | 人口／存活 NPC | Safety | 怪物人口 | Boss 存活 | 危機數 | History | JSON bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | ---: | ---: | ---: |
| 40131 | 10 | 5,184,480 | 3,891,835,974 | 80／79 | 91.45 | 100.00 | 是 | 7 | 206 | 257,895 |
| 40131 | 50 | 25,920,480 | 1,773,724,382 | 80／80 | 32.55 | 100.00 | 是 | 33 | 1,003 | 416,157 |
| 40131 | 100 | 51,840,480 | 2,543,071,289 | 80／80 | 42.50 | 100.00 | 是 | 67 | 1,963 | 608,331 |
| 40132 | 10 | 5,184,480 | 3,112,267,658 | 80／79 | 100.00 | 79.77 | 否 | 7 | 196 | 245,272 |
| 40132 | 50 | 25,920,480 | 2,033,081,726 | 80／80 | 25.00 | 100.00 | 是 | 34 | 967 | 370,073 |
| 40132 | 100 | 51,840,480 | 2,712,596,725 | 80／80 | 25.05 | 100.00 | 是 | 67 | 1,937 | 571,317 |
| 40133 | 10 | 5,184,480 | 500,929,316 | 80／79 | 90.25 | 100.00 | 是 | 7 | 219 | 308,504 |
| 40133 | 50 | 25,920,480 | 3,330,749,791 | 80／80 | 25.05 | 100.00 | 是 | 34 | 993 | 395,865 |
| 40133 | 100 | 51,840,480 | 3,533,602,474 | 80／80 | 25.00 | 100.00 | 是 | 67 | 1,953 | 576,604 |

所有檢查點的 settlement stage 均為 town，food、prosperity、infrastructure 均為 100。三個 seed 到 100 年時 NPC 存活數均為 80，總 actor gold 為 3,645、玩家角色 gold 為 45；materials 與 reward instances 均為 0。開啟中的 request 除 seed 40133 的 100 年檢查點有 1 件外均為 0；該 request 及其關聯通過往返比對與參照掃描。九個檢查點的 arc/request/actor 等孤兒參照全為 0。

Threat 3 延續至 50／100 年；自然 Boss defeat 數為 0。100 年危機累計 201 次，結果共 65 decisive success、37 costly success、66 setback、33 local defeat；每次 recovery 均為 `not_required`，沒有 pending/granted/cancelled。History 保留 196–219 列（10 年）、967–1,003 列（50 年）、1,937–1,963 列（100 年）；events 維持 150 列。

No Intervention 中玩家角色 10 年時仍存活，50／100 年時已死亡；每個 seed 均只有 1 筆 character record、0 succession event，因 runner 沒有執行玩家繼承操作。這描述無玩家介入情境，不代表接續遊戲的 succession 行為失敗。

## 判讀與限制

- 三個 seeds 是有限樣本；結果顯示測試路徑上的世界持續運作、存檔往返及一天續跑一致，不代表所有玩家路徑。
- 10／50／100 年是從 `createGame(seed).worldTime` 起計的模擬年數。過去 smoke attempt 使用絕對 worldTime 當 horizon，與多 horizon run 的 10／50 年 checkpoint 相差 480 分鐘；該 smoke attempt 保留但由本次修正基準後的完整 run 取代，不納入結果。最終 run 的 checkpoint `worldTime` 已精確等於起點加指定模擬年數。
- 100 年模擬不是人類玩家遊玩 100 年；No Intervention 不執行角色接替、戰鬥或 UI 行動。
- JSON payload bytes 不能推論瀏覽器儲存容量；本次沒有瀏覽器 quota 或真實瀏覽器重載驗證。

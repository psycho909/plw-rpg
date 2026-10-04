# QA-03 / QA-04：Threat 與人口深度測試

本目錄記錄三條 Threat 策略和人口壓力案例。模擬在凍結的純 engine source 上執行；瀏覽器案例載入 final build `http://127.0.0.1:5192/`。所有策略都有固定種子、固定有限預算，並於每個遊戲日檢查人口登錄一致性。

## 來源與重現

- 測試日：2026-10-04 UTC。
- engine source：`/tmp/plw-rpg-qa-source-738bc00`，commit `738bc0010c549fa3fb2420437d171f5aa2a043a0`。
- baseline：`reports/playtests/20261004-deep-qa/baseline/manifest.json`，SHA-256 `efa756a586fc23f2f2b6712c2358d41f7a9a82cf4abe3c6b682825a52212b3cb`。harness 會在執行前比對下列 source 檔案雜湊；純 engine 執行不使用 Vite 網頁或 5191。

| 凍結檔案 | SHA-256 |
| --- | --- |
| `src/data/config.ts` | `89990929c7dc4b9b7400de10d97b69ba73e1008fb59a45581467776b768f5e80` |
| `src/domain/types.ts` | `dc140e180dc574b44ef6bd6068c959d378526f56636220fbecb85459fbcc8f80` |
| `src/engine/actions.ts` | `005e2a7f59ab076178e843d2021e5cbf3315b3ee9d07122358c76c6943313c6c` |
| `src/engine/calendar.ts` | `e587ce1d1e149fea987f5a3ab6013872528d5d74beafcb0f40d2fe476abf5524` |
| `src/engine/events.ts` | `4412f6888221b757202dcebd1f8e0dea30a4ea9ee58c3d20efa1b2d9e3689c8f` |
| `src/engine/random.ts` | `b0844202733996c5dd2f123a32ad800c433b22c02ddf0e744c163e880b612734` |
| `src/engine/simulation.ts` | `8934de8cd84e68e0fa15b197352636c9636d726283757b9342779531d6fa09d8` |
| `src/services/saveService.ts` | `2a8cced65b901c2f616c022ee82f170c6b13d2ab486e7ddd0cab13aab5b98852` |

engine run `world-1791082531083-93440` 於 2026-10-04 02:55:30.965–02:55:39.385 UTC 完成；Node `v24.19.0`、Linux x64、Vite `7.3.6`。final browser run `browser-population-1791082466` 於 02:54:26–02:55:06 UTC 執行，實際載入 `http://127.0.0.1:5192/` 並收到 HTTP 200；使用 headless Chromium `151.0.7922.173`。其 production build 指紋是 `index.html` SHA-256 `c05d86559e72706f8acfd1b979aab9cb530c0769022c3e0134c1b6a91a99b911`，app asset `index-BicP0bQ_.js` SHA-256 `24c25d4370be890fe10194c1b3a9d85e2bb9289a8d67bcc6757da11e3fc2c8c9`。瀏覽器請求、時刻和 bundle hash 取自 [browser-population-results.json](browser-population-results.json)；這是 5192 的實際執行證據。

重跑命令：

```sh
cd /workspace/plw-rpg
node reports/playtests/20261004-deep-qa/world/run.mjs
node reports/playtests/20261004-deep-qa/world/make_browser_fixtures.mjs
# 只執行 browser_population.py 前，需有 final build 在 5192 提供服務；此 QA 沒有啟停該 server。
python3 -B reports/playtests/20261004-deep-qa/world/browser_population.py
```

`run.mjs` 固定 seeds `[411, 912, 2026, 6124, 99173]`、最多 1440 個遊戲日、三種策略，以及 day 30/120/360/1440 checkpoint。預設完成 15 個策略/seed runs、21,600 個逐日 row、60 個 checkpoint，約 8.4 秒。所有迴圈都有上限：總模擬日數 1440；清怪策略每日最多 2 次 encounter；單場 combat 最多 99 turns（達到 100 turns 會 fail）。

每個遊戲日驗證 NPC/角色 ID 唯一、active character 恰好一列且不在 NPC 表、`nextNpcId` 不會重用現有 NPC ID，party 合約仍指向存活 NPC。60 個 checkpoint、15 個 run 結尾及 6 個可接受人口 fixture 狀態都跑 `serialize()` / `deserialize()` 並要求 state 完全相等，共 81 次成功 round-trip。validator 對 1001 NPC rows 的案例預期拒絕，屬預期驗證，不算遊戲缺陷。

## 規則與策略

自然起始人口為 30，hamlet capacity 40；村莊與城鎮容量分別為 60、80。`CONFIG.maxPopulation` 為 80，階段 growth thresholds 為 village 85、town 230。人口到容量以下、food/prosperity 條件成立時，每 15 日可有 immigration、每 30 日可有 birth。這三個策略都從自然新遊戲開始，三者在所有 checkpoint 的人口完全相同：day 30 為 33/40、day 120 為 42/60、day 360 為 66/80、day 1440 為 80/80；首次達到 40/60/80 人口分別在 day 105/300/510。這是容量隨聚落階段提升後的正常增長，不是超容量 fixture。

| 策略 | 可重現的公開操作 | 1440 日每種子結果 |
| --- | --- | --- |
| `abandon` | 0 玩家動作，只呼叫日界線 `simulate()` | 0 kills；day 58 起有 warning，day 108 進 critical，day 122 Boss 出生且到結尾仍存活；2 warnings；每 seed 188 次 NPC injury event；安全度最低 30.3–31.1（day 480），結尾 76.2–77.3。 |
| `clear` | 最多每日 2 次公開森林 encounter；HP <55 或 stamina <8 時公開回村休息，戰鬥中 HP <=35 時才使用公開 potion turn；不改 threat、不改裝備、不雇傭隊伍 | 每 seed 492 場真實勝利/492 encounters；每次 kill 必須看到公開 `combat.won`，且 threat population 精確下降 5（最低為 0）。0 warning／Boss／NPC injury；終局 threat 0.335、low、safety 100；111 次公開休息。 |
| `normal` | 每個七日週期第 1 日一次森林 encounter、第 4 日一次公開 wood gathering；第 6 日在 HP <55 或 stamina <35 時回村休息，HP <=50 時才於戰鬥使用公開 potion turn | 每 seed 206 場真實勝利/206 encounters、206 次 gathering、105 次公開休息；0 warning／Boss／NPC injury；終局 threat 1.675、low、safety 100。 |

`clear` 和 `normal` 的 encounter 都透過公開移動、`encounter()`、`combatTurn()` 完成。勝場只在 `combat.won` event 出現、且 threat population 滿足 `max(0, before - 5)` 後計入；沒有直接改 threat 數字。因此清怪量是真實 public combat 行為，不是測試器替 threat 扣值。

下表補上逐日投影中的經濟與聚落安全數字。Gold 是 active character 的錢包；day 1 欄位已包含當日策略動作，變化量是 day 1 到 day 1440 的差，不代表開局到結尾的聚落總收入。NPC deaths 順序固定為 seeds `[411, 912, 2026, 6124, 99173]`；五個 seed 在三路線都各為 `[1, 2, 1, 0, 0]`，全部是自然老化死亡，玩家死亡、戰鬥死亡和 succession 均為 0。`injuries` 是 harness 捕捉到的 `npc.injured` 事件數。

| 策略 | Active gold：day 1 → day 1440 | Gold 變化 | 最低 safety（日期）→ day 1440 | 結尾 guards | 每 seed NPC deaths |
| --- | ---: | ---: | --- | ---: | --- |
| `abandon` | 45 → 45 | 0 | 30.3–31.1（day 480）→ 76.2–77.3 | 9 | 1 / 2 / 1 / 0 / 0 |
| `clear` | 61–69 → 4,917–4,985 | +4,852–4,916 | 88.25（day 1）→ 100 | 9 | 1 / 2 / 1 / 0 / 0 |
| `normal` | 53–57 → 2,901–2,937 | +2,848–2,880 | 88.25（day 1）→ 100 | 9 | 1 / 2 / 1 / 0 / 0 |

`abandon` 每個 seed 有 188 次 NPC injury 事件；`clear` 和 `normal` 都是 0。這些是每個 seed 的實際結果，不是期望值或估計值。

### 逐日 checkpoint 摘要

數字為各 checkpoint 的累積有效 kills；strategy/seed 的列在該 checkpoint 一致。Safety 的 day 360/1440 abandon 為跨五種子範圍；其他 safety 值五種子相同。完整逐日表另見 [daily-series.json](daily-series.json)。

| 策略 | 日數 | kills | threat / phase | warnings | Boss | 人口/容量 | guards | safety |
| --- | ---: | ---: | --- | ---: | --- | --- | ---: | ---: |
| abandon | 30 | 0 | 27.300 / low | 0 | 無 | 33/40 | 4 | 95.5 |
| abandon | 120 | 0 | 71.100 / critical | 2 | 尚未出生 | 42/60 | 5 | 100 |
| abandon | 360 | 0 | 100 / critical | 2 | 1 spawned，alive | 66/80 | 7 | 41.4–42.0 |
| abandon | 1440 | 0 | 100 / critical | 2 | 1 spawned，alive | 80/80 | 9 | 76.2–77.3 |
| clear | 30 | 17 | 0.510 / low | 0 | 無 | 33/40 | 4 | 95.5 |
| clear | 120 | 52 | 0.475 / low | 0 | 無 | 42/60 | 5 | 100 |
| clear | 360 | 132 | 0.405 / low | 0 | 無 | 66/80 | 7 | 100 |
| clear | 1440 | 492 | 0.335 / low | 0 | 無 | 80/80 | 9 | 100 |
| normal | 30 | 5 | 2.300 / low | 0 | 無 | 33/40 | 4 | 95.5 |
| normal | 120 | 18 | 0.475 / low | 0 | 無 | 42/60 | 5 | 100 |
| normal | 360 | 52 | 1.215 / low | 0 | 無 | 66/80 | 7 | 100 |
| normal | 1440 | 206 | 1.675 / low | 0 | 無 | 80/80 | 9 | 100 |

NPC 自然死亡在 1440 日內每 seed 為 0–2 人；三路線玩家死亡及 succession 都為 0。`abandon` 每 seed 共 188 次 `npc.injured` event，`clear`／`normal` 為 0。引擎逐日欄位記錄 safety、`safetyDelta`、settlement prosperity、food、infrastructure 及 active character gold / 每日 gold delta。此 source 沒有聚落總收入帳或建物/地塊毀損事件欄位；所有策略的 `destructionEvents` 都是 0，所以結果只能對上述代理指標下結論，不能據此聲稱完整的經濟或物件毀損稽核。

## QA-04 人口案例

### 合法 schema 的受控超容量 fixture

[`population-overcapacity-save.json`](population-overcapacity-save.json) 由 `createGame(73004)` 和初始 NPC schema row 複製而來，使用唯一遞增 ID，包含 1000 個 NPC rows + 1 個 active character，共 1001 位存活者，原始容量 40。decoder 接受這份 save；validator 限制 NPC/character rows 各不超過 1000，沒有 `live population <= settlement capacity` 的限制。這份人工 fixture 遠超自然 80 人上限，因此只作渲染、長時間更新和保存壓力測試，不代表玩家自然可達人口。

純 engine 對此 fixture 跑 30 日，容量由 40 依正常階段升到 60，但人口保持 1001，沒有強制驅逐；每天仍通過唯一 ID 與 registry assertion，反序列化亦保留超容量資料。額外再造 1001 個 NPC rows（總存活人口 1002）的 save 被 validator 預期拒絕；沒有把非法輸入的拒絕算成 bug。完整日樣本和接受／拒絕結果見 [population-cases.json](population-cases.json) 與 [browser-fixtures.json](browser-fixtures.json)。

在 5192 final build 用 headless Chromium 實測：1,319,813-byte fixture 載入成功；居民 dialog 顯示 1000 個 resident buttons，地圖顯示 384 tiles。Playwright `wait_for_timeout(30000)` 的實際間隔為 30.001 秒；測試在這段 wait 前讀取起始時間，並在點擊暫停及 1.5 秒 pause-settle 後讀取結尾，worldTime 從 1197 到 2447（增加 1250 game minutes）。這個世界時間差包含等待區間以外的原生 UI／暫停處理延遲，恰為 25 個 50-minute engine ticks；若只用 `30 × 40` 會得到約 1200 分鐘，但不應把兩次 state 讀數當作精準 30.001 秒的時鐘區間，也不應據此判定倍率失敗。人口和 ID 計數仍為 1001/1000。瀏覽器 memory 與 DOM 記錄為：初載 heap 10,952,923 bytes、877 DOM nodes、localStorage 1,323,870 bytes；居民 dialog heap 14,157,164 bytes、3897 DOM nodes；地圖開始時 heap 21,722,295 bytes、1676 nodes；x20 執行至暫停完成期間的 33 筆採樣中，`usedJSHeapSize` 峰值 116,380,646 bytes；結尾 heap 15,724,862 bytes、1688 nodes、localStorage 1,319,918 bytes。這是 Chromium 診斷採樣值，不是固定記憶體上限或效能基準。

公開手動儲存後 reload，1001 人、1000 NPC rows、active `alden`、世界時間和 history 完整一致；IndexedDB 有 217 records、無 pending journal。公開遊玩紀錄匯出成功，檔案 [population-export.json](population-export.json) 為 2,817,316 bytes，217 records、0 pending，SHA-256 `638beffad4ae3265c81244e2f29e513d10d8e9f9de219e7c84c14a43066195b5`。browser result 在 ×20 checkpoint 記錄一筆未辨識 URL 的 console 404 訊息；page errors、save alerts 和保存警告皆為空，測試結果為 passed。由於 harness 不會因 console error 失敗，這裡不宣稱 console-clean，也不把未定位的 404 歸類為遊戲 bug。

### 0 人口與死亡繼承

[`population-zero-save.json`](population-zero-save.json) 由 `createGame(73005)` 後對全部居民呼叫公開 `die()` 建立；有 0 位存活居民、29 個死亡 NPC rows、active character `alden` 已死亡。decoder 接受；初始 no-heir 狀態在 UI 顯示「等待新居民抵達 · 15 日」。這是控制案例，不宣稱自然遊戲一定走到零人口。

純 engine 受控案例第 14 日仍為 0 人，沒有成年繼承候選，過早選擇被拒；第 15 日移入成年候選 `npc-30`，公開 `chooseSuccessor()` 接受並將其轉成 active character；第 30 日人口為 3。這三個保存狀態都通過 serialize/deserialize 完整往返，詳見 [population-cases.json](population-cases.json)。

Playwright 在 390×844 viewport 透過可見 15-day wait 操作，從 worldTime 1271 推進 21,600 分鐘至 22871，沒有 fake clock；移民 `npc-30` 成為 1 位居民及可繼承成年候選。透過 successor UI 選擇後，active character 變成存活的 `npc-30`，NPC rows 降至 0，character rows 為 2；手動保存再 reload 後仍是同一位 active heir、人口 1，ID 無重複且頁面無 page errors。reload 約多推進 1 遊戲分鐘至 22872 後才暫停，這是瀏覽器啟動時間造成的自然 autoplay tick，不是測試時鐘替換。完整 UI checkpoint 見 [browser-population-results.json](browser-population-results.json)。

## 原始產物與失敗紀錄

- [results.json](results.json)：完整 seed/strategy 結果、source hashes、環境與配置；run `world-1791082531083-93440` 有 15 runs，`errors` 為空。
- [daily-series.json](daily-series.json)：15 個 run 的全部 21,600 逐日 row，含 threat/warnings/Boss、人口/容量、guards/safety/safety delta、prosperity/food/infrastructure/gold delta、injuries/deaths/destruction/arrival 等欄位。
- [checkpoints.json](checkpoints.json)：60 個 checkpoint state 摘要與 serialize hash；另有 15 個 run-end round-trip 結果保存在 `results.json`。
- [population-cases.json](population-cases.json)、[browser-fixtures.json](browser-fixtures.json) 及兩份 [population-overcapacity-save.json](population-overcapacity-save.json)／[population-zero-save.json](population-zero-save.json)：人工 fixture 的來源、合法性、雜湊和人口結果。
- [browser-population-results.json](browser-population-results.json) 與 [population-export.json](population-export.json)：Chromium checkpoint、heap/DOM/localStorage/save/reload/export 原始結果及實際匯出。
- [playlog.jsonl](playlog.jsonl)：`scripts.recorded_reports.write_recorded` 每次發佈自動追加的完整 archive；281 筆 `zlib-base64` 紀錄的解壓長度與 SHA-256 均已唯讀核對，無不符。archive 保留最初兩次 harness smoke-run 失敗：第一次 `calendar` helper 未載入，第二次 `captureEvents` helper 未載入；這是 harness 接線錯誤，不是遊戲行為故障。現有 [failure.json](failure.json) 仍是第二次 smoke-run 的失敗 projection（02:36:35 UTC），不是成功結果或最新 projection；成功 run 由 `results.json` 表示，且其 `errors` 為空。歷史 `playlog.jsonl` 未重寫或刪除。

測試期間只在 `reports/playtests/20261004-deep-qa/world/` 寫入 harness、fixture 與報告；沒有改遊戲 source、其他路線、舊報告或依賴，也沒有重啟/停止其他 server。

# Phase6 J Browser Performance & Journal Growth

此頁比較兩個 frozen-source Chromium formal runs 的 60-second checkpoint 資料。記錄為可觀測負載變化，不是以固定上限判定性能或 memory leak。

| Lane | checkpoints | 最大間隔 | IndexedDB records | localStorage bytes | JS heap used bytes (first → last; max) | DOM nodes first → last | JS listeners first → last | 可見 UI save/reload 延遲 min/median/max |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Stress (1200s) | 21 rows (20 scheduled + final) | 61.60s | 9 → 1135 | 79,961 → 222,578 | 4,244,480 → 10,572,900 (max 24,641,584) | 2,163 → 4,598 | 445 → 922 | 300.53/315.43/328.57ms |
| Agent crisis (1800s) | 31 rows (30 scheduled + final) | 62.07s | 10 → 1601 | 79,961 → 234,195 | 4,250,488 → 6,970,104 (max 33,482,784) | 2,163 → 2,148 | 445 → 441 | 277.09/301.56/342.76ms |

## 觀察

- IndexedDB store `oakvale-play-journal` 從初始 9 / 10 records，分別增加到 1135 / 1601。這確認 journal 寫入隨長跑增加；checkpoint 看到的 `journalPending` 保持 0，沒有觀察到 pending backlog。
- localStorage 增長分別為 79,961 → 222,578 bytes 與 79,961 → 234,195 bytes。history/event count 分別為 1 → 87 / 1 → 150 與 1 → 96 / 1 → 150。
- Stress 的 end heap 高於 first checkpoint；其 checkpoint max 為 24,641,584 bytes。Agent run first→last heap 增加（4,250,488→6,970,104 bytes），中間 max 為 33,482,784 bytes。由於未做 GC 控制或多輪重複，不能將波動解讀為 leak 或無 leak。
- Stress DOM/listeners 多數 checkpoints 在約 2,138–2,992 nodes / 441–564 listeners，304s 短暫到 4,571/935 後下一 checkpoint 回到 2,312/468；結尾 1,202s 又到 4,598/922。Agent 在 488s 到 3,992/665，549s 回落到 2,317/465，結尾 1,802s 為 2,148/441。所有 checkpoints 的 openDialogs 都是 0；CDP DetachedScriptStates 除初始 2 與少數讀值為 2 外，其餘皆為 0，未呈持續增加。DOM/listener 有短暫尖峰，並非單調或持續攀升；目前沒有證據可歸因於 modal，因 checkpoints 均無開啟 dialog。最後 stress checkpoint 的升高仍保留為觀察點，但相鄰較早樣本已回到基線區間，且 save/reload latency、errors 未見惡化。
- UI save/reload 測量為瀏覽器可見 save + reload 完整操作的 wall time。stress 有 3 次 periodic + 1 次 aftermath reload；agent 有 5 次 periodic reload，沒有第二次危機 aftermath reload。
- Browser errors 四類皆 0，storage errors / rejected promises 0。兩條 lane 來源相同：HEAD `bd316cb326e5fbc20087c0154d6e3f294a5daac7`, fingerprint `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`。

## 限制

每個 checkpoint 取樣是單一 run、單一 fresh seed 909。Stress 在 1202s 的 terminal DOM/listener 值 4,598/922 是未解釋的 endpoint anomaly（前一樣本 1,154s 回到 2,140/442；無 open dialog）。獨立 reviewer 不建議單憑目前證據擴展 60–120 分鐘 soak，因未見 persistent heap rise、detached DOM growth、journal acceleration、latency decline、duplicate crisis 或 reload drift；但也不把最後一次 DOM/listener 尖峰宣稱已恢復，應留作 finding，若需要關閉該 finding，做短的 post-reload targeted sample。記錄可證明本次 journal growth 與操作延遲，但不足以建立跨裝置性能預算、長期斜率或 leak 結論。Agent lane 的 1800 秒 arc 不完整，見 `agent-crisis.md`。20k major-history serialization/UI profile 是另一個 controlled benchmark，見 `j-history-profile/j-history-profile.json`；不可與 normal soak 合併宣稱。


## Controlled exact 20k history profile

此 benchmark 使用相同 20,000 筆 engine-emitted major history（SHA-256 `171c50e5e5f09f9fdf78e1a2708cb1f75d212153a642dcdab06e1f238ec0bb26`），save 為 2,670,488 bytes；no-F 與 F-sensitive clone 共用完全相同 history，序列化/reload 成功。資料來自 `j-history-profile/j-history-profile.json`，controlled profile 不代表正常 soak。

| Case | Engine public action | Chromium boot | visible UI action | localStorage writes | storage after action |
|---|---|---:|---:|---:|---:|
| no-F boundary | `movePlayer` 0.581ms | 443.97ms | 108.67ms | 10.8 / 10.6ms | 2,670,572 B; journal pending 0 |
| F-sensitive active boundary | `movePlayer` 0.234ms | 412.05ms | 82.27ms | 10.9ms | 2,670,904 B; pending 1 |
| camp preflight / UI | `startRegionalCampRaid` 22.760ms (empty result; preflight only) | 357.39ms | 169.20ms | 11.1ms | 2,671,095 B; pending 1 |

The engine action records retain history count 20,000 and identical history hash. Across the three controlled UI profiles, median boot was 412.05ms, median visible action 108.67ms, and median storage write 10.9ms. `startRegionalCampRaid` was measured as clone preflight and returned an empty result; report its 22.760ms as a preflight/rejected attempt, not a successful raid. These are three individual controlled cases, with no claim of statistical performance bounds.

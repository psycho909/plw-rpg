# Oakvale V2 最終 QA 交付紀錄

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`；branch `work`。只做V2工程／Agent驗證與真人驗收前置，沒有開始V3。

| 工作 | 實際狀態 | 文件 |
| --- | --- | --- |
| Baseline／immutable production build | 58 source hashes＋3 assets；app source未變 | [baseline](baseline.md)、[manifest](build-manifest.json) |
| 全量V1/V2 regression | 229 tests／14 files、typecheck/build PASS；Chromium28／Firefox8，補驗11＋非空戰鬥/party交叉重載PASS | [regression](regression.md) |
| 原生V1 migration | 7 fixtures守恆／defaults／idempotence／save-reload PASS | [原始migration](engine/migration-results.json) |
| Active Idle | ×1/×5/×20／pause／各視窗、55s實際freeze/close無offline PASS | [browser](browser/extended-idle.json) |
| 兩小時最新Browser Soak | attempt06完成7204.975s／120checkpoints／3reload，台灣2026-10-06 03:04:08→05:04:13；舊失敗獨立保留、不合併時長 | [soak](browser-soak.md) |
| Life Agent Exploratory | 保守有效3609.642s，達60m最低線 | [Life](agent-playtest-life.md) |
| Adventure Agent Exploratory | 保守有效3745.531s，達60m最低線；兩次地下城Boss／裝備／同行 | [Adventure](agent-playtest-adventure.md) |
| Hybrid Agent Exploratory | 可信02/03/04合計4384.601s（73m4.601），原段01正式credit0；所有未觀察／除錯缺口排除 | [Hybrid](agent-playtest-hybrid.md) |
| Long-term／NPC／ownership／RNG | 3seeds×10/50/100年；非空所有權／身份長期追蹤與完整arc後果PASS | [long-term](long-term.md) |
| Performance／Fun Signals | 完整2h圖／CSV／統計與三路10～15分鐘audit完成；保留growth／retention findings | [performance](performance.md)、[fun-signal-audit](fun-signal-audit.md) |
| Human Fun Gate | READY FOR HUMAN TEST；八題及觀察欄空白、PENDING | [真人測試包](human-fun-gate.md) |
| V2 Product Gate | NOT YET APPROVED | [final-review](final-review.md) |

本輪使用真正headless Chromium app runtime：DOM、JS timers、IndexedDB、正常UI；不是純engine simulation。正常seed909由UI建立；17/2026由最新public createGame→serialize canonical defaults初始化，未改資源／時間／能力，見[seed provenance](seeds/provenance.json)。所有探索稱Agent Exploratory Playtest，不稱真人。

P1雙頁覆寫及P2開場復原在441修復、RED/GREEN與獨立review保留；受控export交錯、journal growth、DOM retention及P3提示維持明示finding，見[bug總表](bugs.md)。產品動機問題另外記錄，不偷偷重設。

長程序改用永久stdout/stderr檔案，避免模型quota斷開toolpipe造成程序失敗；app未變，5197服務恢復後3assets exactmatch，見[server recovery](review/server-recovery.json)。最新模型指示：修BUG GPT-6 Luna/max、長測GPT-6 Luna/low。任何無人觀察quota缺口不計Agent時長。

原始failure／partial／舊c02結果保留，不冒充最新source。先前含歷史metadata的索引完整封存於[historical README](baseline-old/qa-readme-before-durable-resume.md)，每目錄playlog追加版本＋checksum。外部檔案修改／刪除防護與server不在scope；原生Safari／手機實機已排除。

## Gate 與交付

Engineering Gate: **PASS WITH FINDINGS**。Browser Stability Gate: **PASS WITH FINDINGS**。Agent Exploratory Gate: **PASS WITH FINDINGS**。Human Fun Gate: **PENDING**。V2 Product Gate: **NOT YET APPROVED**。真人測試包：**READY FOR HUMAN TEST**；未填寫任何真人答案，不表示V2失敗或已證明好玩。

Soak初始worldTime481→end290652，共290171遊戲分鐘（約201.508天）；×20搭配正常UI操作／rest成本，未改worldTime。已歸檔72,068筆ordinal1～72,068＋5筆獨立pending，完整UI export24,313,993 bytes。正常三次戰鬥死亡與UI繼承，最後第4代npc-3 alive。See [export check](review/soak-export-check.json)。

[完整效能圖](profiling/trends.png)與[統計](profiling/summary.json)：liveDOM879～944；JS heap採樣6.45～65.55MB，最後16.91MB；CDP detached nodes/listeners增加，仍有retention finding。Journal持續成長，checkpoint小不代表完整歷史小。

超過Git單檔限制的Hybrid04版本log無損gzip，原檔留在本地，repo追蹤壓縮檔與metadata；所有335歷史版本／latest projection gzip-only驗證通過。See [包裝證據](review/archive-packaging.md)。沒有刪除／截斷歷史版本。

[獨立Standards/Spec review](review/terminal-evidence-review.md)與[artifact integrity](artifact-integrity.json)在最終交付前核對。受測app source為上方441完整SHA；本次QA文件commit可由 `git log -- reports/playtests/20261004-v2-final-qa` 找到，屬QA-only，source58檔指紋相同，不需用文件commit冒稱另一個受測build。

最終獨立Standards／Spec審查：PASS WITH FINDINGS；原始歷史provenance缺口保留並與最新受測結果分開，不能補標成最新source。完整artifact validation已有PASS，最後publication版本會再次核對後隨work提交。

# Bug 與工程疑慮總表

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`。本輪工程／runtime驗證已完成；Product Findings另外放在fun-signal-audit，不混同功能錯誤。

| Severity / ID | 問題 | 證據與狀態 | 影響 / 處置 |
| --- | --- | --- | --- |
| P0 | 尚未發現 | 不是宣稱不存在 | 本輪7204.975s runtime與regression未發現P0 |
| P1 B01 | 同origin多分頁可用舊state覆寫新checkpoint | 舊source實際485→480、位置7,10→7,9；RED保存；441修復；12 browser lifecycle checks GREEN | Web Locks單一writer、其餘頁唯讀；source已commit。見astra與review/save-writer-review |
| P2 B02 | Fresh opening writer競爭／不支援時復原按鈕不可達 | 原9-check RED保存、修復後9/9 GREEN | 441 footer recovery可達、writer pending禁起身；不重建世界 |
| P2 C01 | Blocked export跨journal snapshot／ACK邊界可能少一筆 | review/save-export-race.probe.ts 受控Promise交错最小RED；實際IndexedDB時序尚未重現；OPEN | source record仍在archive，不能稱永久資料遺失。集中修復候選；需要真實adapter排程驗證與一致snapshot合併 |
| P2 C02 | 完整IndexedDB journal持續增長／全量getAll匯出成本 | 正常runtime逐tick追加；2h實測72068已歸檔＋5pending，24,313,993 bytes UI export；OPEN scalability finding | pending不等於全部archive；禁止自行截斷不可改紀錄，建議無損分段／cursor |
| P2 C03 | 長runtime CDP DOM nodes/listeners增長 | 正式2h CDP nodes最高35,643／listeners7,381，liveDOM879～944；獨立215s GC部分回收；OPEN performance observation | 尚無retainer證據，不宣稱confirmed leak；依完整趨勢調整嚴重度 |
| P3 B03 | writer警告同時出現在persistent warning與StatusNotice | 靜態UI／review確認；OPEN | 訊息重複，存檔權限保護仍有效 |
| P3 B04 | 不支援Web Locks時重新整理無法增加browser能力 | 已提示需支援browser／安全origin；OPEN UX註記 | 可精簡復原文案；不能把reload說成一定修好 |
| P3 B05 | favicon.ico 404 | 完成的正式Soak捕捉一筆startup console HTTP404、完整URL保留 | 無遊戲操作／保存失敗；報告仍計入console error，非零錯誤宣稱 |

## 原始失敗保存

- `astra/`：雙頁data-loss RED、初次full suite timeout、Blob test typing failure、opening RED/GREEN與修復manifest。
- `review/`：export interleaving原始assertion失敗、專用config；probe副檔名不混入229個既有tests，不把預期失敗改寫為PASS。
- `soak/attempt-01`～`attempt-04`：原source／不足時長／末尾exact-locator export failure與錯誤actor guard保留。attempt05因工具stdout管線於配額中斷後失效，4081.453秒／68checkpoints結束，原`BrokenPipeError`保留；不能計為兩小時。attempt06採detached process及檔案stdout重新從零計時，不合併舊時長。啟動wrapper的sys.path/import失敗發生在child已啟動之後，保存metadata並修復wrapper，沒有重複啟動child；見soak/launcher-reliability.md。
- `engine/`及playlog：fixture runner作用域、年度計時、NPC substring重複計數、boss snapshot alias等instrumentation失敗；改helper後同source完整重跑，不改遊戲資料讓test過。
- 三路探索保留driver EOF／locator／screenshot等technical失敗；有效觀察時間需扣除實際受影響區間。

## 後續集中修復候選順序

測試期間若有資料損失／阻擋即時修復並重測最新source；其餘先保存最小repro。後續候選為C01、C02／C03診斷及P3文案；本次交付仍明示其OPEN狀態，不將未完成修復列為已通過。修BUG模型依使用者最新指示GPT-6 Luna／max；長測GPT-6 Luna／low。產品動機、內容頻率及資產價值需使用者設計判斷，不當作bug偷偷重設。

## 最新正式 Soak 與交付的 instrumentation findings

Attempt06完成7204.975s／120 checkpoints／3reload，完整UI archive下載驗證通過；CP36／88／92的dialog close locator timeout原始錯誤保留，後續world/save正常，不偽裝UI全PASS。正常戰鬥造成三名角色死亡、經UI繼承至第4代npc-3；不是修改state。最後匯出與endSnapshot採樣時刻不同，archive72,068／pending5／稍後IDB72,094需按邊界判讀。

Hybrid04超過100MiB的QA版本log採無損gzip；原檔不截斷／不刪除，完整335versions與projection重建PASS。QA包裝、profile helper分段與報告計時更正屬instrumentation，沒有為了測試修改產品設計。

**本輪沒有把所有OPEN P2／P3寫成已修復。** 已修B01／B02有RED→GREEN；C01仍是受控排程疑慮、C02／C03需後續處理，P3提示／favicon保留。產品發現PF01～PF07另列。

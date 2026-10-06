# 獨立 QA 證據審查（PRELIMINARY）

審查時間：2026-10-05 20:46 UTC。審查對象為 tickets/20261004-v2-final-qa.md 指定的 V2 QA 證據；受測來源 441e3c2b435f199a50cb78ee5b19521bcc084593。只讀核對原始產物、來源雜湊、保存前後狀態與彙總計算；沒有執行 app tests、啟動或連接瀏覽器、操作 soak/harness、修改 app source 或 Git。此報告尚非最終驗收。

## 已核實證據

- build-manifest.json 記錄 frozen source 441e3c2b435f199a50cb78ee5b19521bcc084593、58 個 source hashes、3 個 production assets、229 tests / 14 files 與 typecheck/build exit code 0。我逐一重算目前 58 個 source SHA-256，全部符合 manifest；supplemental Chromium 證據也記錄 immutable dist 與 served assets 全部匹配。
- Regression log 為 229/229 tests、14/14 files PASS；typecheck 與 production build PASS。原有 Chromium 28 checks / 無 errors、Firefox 8 checks、idle/pause/reload 與 7 個 V1 migration fixture 的既有證據仍與 frozen source 相符。七個 fixture 均記錄舊世界/RNG/時間欄位保留、defaults、V2 reload、idempotence 與 deterministic continuation PASS。
- engine/long-term-results.json 為 PASS；3 seeds（17、909、2026）各有 10/50/100 年 checkpoint。runner 記錄年度單批與逐日呼叫、每年序列化/重載結果一致；engine 文件明確把 headless engine 結果與 Browser Soak 分開。相關 long-term、RNG、featured-NPC、ownership、arc evidence 記錄的 source hash 均匹配 manifest 子集。Instrumention 的舊失敗保留並記錄修正後同來源重跑。
- review/active-dungeon-party-reload.json 是 Chromium rendered-UI supplement，來源 441；測試時間 20:36:26.748–20:36:52.670 UTC，不計 Agent/Soak 時數。它載入既有 Adventure save，保留已裝備裝備、Lucy party、自宅，透過 UI 進入 dungeon combat、暫停並存檔，再 reload 並以一次可見攻擊繼續。保存與 reload 前 app initialization 比較的 21 個 simulation root fields 完全相同；23 個 root fields 唯一差異是 lastSavedAt。reload 恢復 active combat；攻擊後 combat 清除且 dungeon stage 往前。page/console errors 均為 0。兩次 duplicate-tab preflight failure 留在 priorAttemptSummaries，並說明發生於 gameplay/save action 前，沒有 state mutation。
- Adventure raw cutoff 由 13:56:40.485 到最後 direct observation 15:02:37.145 計為 3,956.660 秒；扣 harness union 143.229 與明示未觀察區間 67.900，得到 3,745.531 秒。3956.92 秒的 outer read-only capture clock仍保留作歷史值，且 prior accounting 3745.791/3956.92 明確標為 superseded，不再作正式 credit。Action/observation arrays 的封存前後投影相同。
- Hybrid 正式時數獨立從 attempt-02 原始 timestamp 重算：segment02 為 932.685 − 1.169 harness − 225.461 explicit gap = 706.055；segment03 為 601.068 − 50.574 − 99.358 = 451.136；segment04 為 3,603.209 − 241.843 harness − 133.956 explicit review gap = 3,227.410。三段合計 4,384.601 秒；segment01 正式 credit 為 0，因 600 秒 debug reserve 是估值而非可驗證上界。segment04 的 3,000 秒目標與三段 3,600 秒最低門檻均達到；我核實數字但仍等最終合併文件與 gate review。
- Hybrid segment03 最後 observation 的 worldTime/RNG 為 162409 / 3886205941；segment04 同 profile/seed/source/actor 的 resume 讀到 expected worldTime 164545，首個正常 UI observation 為 164547，RNG 仍為 3886205941。期間 19:26:30.723 至 19:40:50.050 UTC 未直接觀察且 save worldTime 前進 2,136 分鐘。該 gap 未計入有效秒數，原因未由證據確定；報告不應宣稱兩段之間沒有世界狀態變化。segment01 到 segment02 的 2,132 分鐘未觀察變化也維持相同限制。
- Human test package 的觀察欄與 Q1–Q8 仍空白；Human Fun Gate 是 PENDING、V2 Product Gate 是 NOT YET APPROVED。README 記錄使用者的模型指示為修 BUG GPT-6 Luna/max、長測 GPT-6 Luna/low；此記錄不構成 backend 遙測證據。
- Bug register 將修復的 P1/P2 save findings 與仍 OPEN 的 C01 export interleaving、C02 journal growth、C03 DOM/listener retention、B03/B04 UX 與 B05 favicon error 分開。fun-signal-audit 另列 Product Findings，不把設計風險冒充功能 bug。舊 failure，包括 attempt05 4081.453 秒 BrokenPipe / 68 checkpoints、預期 RED 的隔離 export probe、instrumentation failure 及 supplement preflight failure，均保留；不與 default 229 PASS 混算。

## 仍待終端核對的項目

1. Browser Soak attempt06 的起始門檻為 2026-10-05T19:04:08.048Z，需至少 7,200 秒、120 checkpoints、3 reload/export 檢查及完整 UI journal export。Coordinator 在 20:44 UTC 回報 5,940 秒／99 checkpoints；那時尚未到時間門檻。此審查不碰執行中的 browser/harness，也不以 attempt05 或舊 source 補時。
2. 全 QA collection 的最終 archive SHA/provenance、journal export unique IDs/ordinals、plain/gzip 雙封存、解壓及 fresh-clone lossless verification 尚待 soak 與 Hybrid04 封存安靜後一併完成。review/interim-archive-integrity.json 明示排除當時 active attempt06 與 Hybrid04，不能當作全 collection 結案。
3. review/active-dungeon-party-reload.md 中七個 screenshot markdown links 以 repo-root 的 reports/... 字串當作相對 URL；從該 nested Markdown 所在目錄解析時七個都失效。目標圖檔確實存在，JSON 中記錄的 root-relative path 有效。已通知 owner 修正；此處待修後複核，不改該文件。
4. README.md 與 final-review.md 尚待 Soak 後的最終文件同步；它們目前仍把總 Gate/Hybrid 狀態列為進行中。agent-playtest-hybrid.md 與 hybrid-final/README.md 已列出 segment02–04 4,384.601 秒並標記 READY FOR FINAL REVIEW。最終 verdict 必須以終端 archive 與一致投影為準。

## Disposition

目前獨立確認 regression/type/build、短程瀏覽器、V1 migration、engine long-term 與新增 active dungeon save/reload supplement 的記錄；Life 有效時間為 3,609.642 秒、Adventure 為 3,745.531 秒、Hybrid 02–04 原始 accounting 合計 4,384.601 秒。Browser Stability 與整體 Engineering/Agent final review 尚未結案；全 collection archive 與 soak export 仍待驗。維持 PRELIMINARY。Human Fun Gate 必須保持 PENDING，V2 Product Gate 必須保持 NOT YET APPROVED。

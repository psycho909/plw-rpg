# Phase4 — Adventure Reward Loop

狀態：ACCEPTED（Phase4 工程），正式正本 [ticket](../../../../tickets/20261006-v2x-04-adventure-loop.md)。不開始 Phase5–10／V3。

本輪 source commit `39621ec9b5833f24c4105d5bf705ff2b984da3a2`；測試時 base HEAD 為 d3c6899，加上 ALL74 working source 指紋 `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`。逐檔 Git blob 相等證明見 [delivery-source.json](delivery-source.json)；旧 Phase3 source／QA 不冒充本輪。

A baseline → B risk/reward → C build utility → D boss identity → E UX → F simulations → G runtime/review 已完成。全量330tests/typecheck/build、100000loot awards、4320 paired rows／8640combat fights、20targeted Chromium checks、1200.691s正常browser stress及1800.857s正常Agent探索通過；受控出售補測另列8checks／1reload。各 gate PASS WITH FINDINGS，HumanGate DEFERRED / NOT APPLICABLE AT THIS STAGE；不宣告真人樂趣／retention／完整產品ready。

## Reports

[最終交付](final-review.md) · [Baseline](baseline.md) · [Loot](loot-analysis.md) · [Combat builds](build-analysis.md) · [Boss](boss-reward.md) · [Browser regression](browser-regression.md) · [Stress](browser-stress.md) · [Agent探索](agent-adventure.md) · [Reward／產品觀察](reward-findings.md) · [Bugs／原始失敗](bugs.md) · [最終獨立審查](final-runtime-results-independent-review.md) · [受控出售](controlled-gear-sale/README.md)。

## Provenance／保留規則

原 whole aggregate final-runtime-status.json 為 FAILED，永久保留；本輪最終接受的是相同source及production HTTP assets的独立成功重試。每個runtime原JSON有baseSHA、逐檔source、helpers/harness/HTTPbuild hashes、真實時長與唯一rawlogs。首輪stress31.919sFAIL、舊30mAgent目標substringconfound及出售selectorFAIL皆保留，成功不刪失敗。

Authored report/script 透過 scripts.recorded_reports.write_recorded，先追加完整壓縮內容與SHA256到同目錄playlog.jsonl，再原子投影；唯一rawlogs及原規格CRLF不改寫。龐大archive/playlog.jsonl原檔保留本機，完整位元組以無損XZ交付（非僅hash）；[封存與恢復](evidence-archive/README.md)／manifest記record checks與完整解壓roundtrip。不是防止本機檔案被刪改的保證。

正常stress／探索使用fresh角色與真UI，沒有inject資源／worldTime／手工state；controlled fixture明示獨立，不能推論正常進度。Actualfinal與lastCP／distributionpeak分開。§41未有新延長觸發條件；歷史C01–03仍open。

Low負責runner與機械整理，Medium負責UI／QA一般工程／分析／獨立review，Max負責核心變更與deep review，Root做範圍與gate整合。工具名稱underscores只反映requested model／effort，不宣稱後端model telemetry或Session已切換。

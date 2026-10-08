# Oakvale V2.x Phase6 — 最終工程交付

**整體工程驗收：PASS WITH FINDINGS。** Phase6 A–J 的單一 Goblin 區域危機、民防、生活／冒險介入、後果、恢復、歷史／聲望與 UI 已完成工程驗證。本文件不宣告真人產品驗收或遊戲好玩。

## Source 與驗證範圍

- Branch：`v2x/reward-core`。
- 最新全量及 Browser 測試 commit：`bd316cb326e5fbc20087c0154d6e3f294a5daac7`；production 最後變更在 `4399579ea67703f2f5ea7ac03d3f2c249ce94eef`，其後為 QA／文件。
- 91 個 source 檔案的 sorted-JSON SHA-256：`c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`。I、J 前後相同；production JS `index-C5oR9znA.js`。
- Node 24.19.0、npm 11.9.0、Vitest 4.1.11、Vite 7.3.6、Chromium 151.0.7922.173；完整環境、OS、工具版本及歷史 baseline 見 [baseline.md](baseline.md)。
- 本次交付 commit 僅新增 QA 工具／原始證據與文件；不將舊 build 的結果冒充新 source，也不重跑未改動的已通過全量測試。

## 實際驗證

| 項目 | 結果與證據 |
| --- | --- |
| 全量 Regression | 28 檔、531 tests；typecheck、production build 全通過。涵蓋既有 V1–V2、Phase0–6 save/migration/determinism/succession；[regression.md](regression.md) |
| 真 Chromium Stress | 正常 fresh 1,201.08 秒（20分1秒），總 1,207.49 秒；21 checkpoint rows；一次完整正常危機、实际介入、結算與餘波重讀；[browser-stress.md](browser-stress.md) |
| Agent Crisis Playtest | 正常 fresh 1,800.20 秒（30分0秒），總 1,806.75 秒；31 checkpoint rows；結束時第二危機 active，本 lane 沒有餘波重讀；[agent-crisis.md](agent-crisis.md) |
| 效能／儲存 | 零 page/console/request/HTTP/storage/unhandled rejection 錯誤；IndexedDB records 9→1,135／10→1,601，pending 全程零；UI save/reload 約277–343ms；heap/DOM 限制見 [performance.md](performance.md) |
| 多世界結算 | 10,000 次 canonical resolution 的 deterministic stratified sweep，另500組公共支援配對／1,000次結算；全部 save checks 通過。不是 IID Monte Carlo／真人獲勝率；[crisis-balance.md](crisis-balance.md) |
| 長世界 | 3 seeds，各100年（每年120日）；10／50／100年 checkpoint、IDs、finite、save/reload及下一日延續通過；[long-world.md](long-world.md) |
| 大歷史 | 20,000 筆 engine-emitted major history，2,670,488-byte save，三組真 Chromium UI 案例通過；拒絕的 camp preflight 不算成功突襲；[performance.md](performance.md) |
| 繼承 | 受控死亡存檔透過真 UI 選成年既有居民，保留 worldSeed/rngState/worldTime、危機、地圖、其他居民及死者；[browser-regression.md](browser-regression.md) |

兩個正式 Browser run 使用同一 fresh seed 909、獨立 context／port，沒有注入 state 或 debug time。可見 x20 及既有等待一日等 canonical UI action 混合執行；真實時長不含受控案例。每60秒取樣最大間隔約62秒。完整世界時間、人口可觀測限制、threat/boss/events/history、操作、儲存與 latency 見各 lane 報告。兩個 Browser seed 不構成多 Seed；多 Seed 驗證由 I 的世界模擬另提供。

## 八項 Gate

| Gate | 最終判定 | 主要依據／限制 |
| --- | --- | --- |
| Engineering | PASS WITH FINDINGS | 531 tests/type/build、原始 RED／修復、獨立核心及 QA review；保留 QA helper 自動標籤缺陷，由離線驗證覆核 |
| Crisis Lifecycle | PASS WITH FINDINGS | 正常 Stress 完整 arc；補測直接保存同一危機 ID。正式長測 ID 依單一 canonical 階段連續性推論 |
| Civil Defense | PASS | 純模型、守衛可用性、實際裝備／供給、canonical resolver 的定向及大批驗證 |
| Life Contribution | PASS WITH FINDINGS | 食物／金幣／裝備公共動作各500次接受，消耗／存讀一致；正常補測沒有合法支援機會，不稱正常獲取資源後捐贈完成 |
| Adventure Contribution | PASS | 共用實際戰鬥、營地成功重大貢獻、Chief 定向驗證及完整正常危機後果；不將戰鬥進入或回合數算成功次數 |
| Role Freedom | PASS WITH FINDINGS | 正常非戰鬥世界完成危機；不戰鬥的公共介入可改變結果。恢復安全閥只覆蓋規格指定情況 |
| Consequence | PASS | 四種 outcome 實際改變威脅、供給、安全、繁榮及有限傷勢；保存／重讀不重施後果 |
| Recovery | PASS WITH FINDINGS | 餘波／冷卻、一次援助及成年繼承通過；不是任意人口歸零必然恢復的承諾 |

Browser Stability Gate：**PASS WITH FINDINGS**。Agent Exploratory Gate：**PASS WITH FINDINGS**。30分鐘場的單獨完整 arc 未通過；整體所需至少一條由20分鐘 Stress 提供。工程證據及獨立審查支持上述工程結論，不代表真人樂趣結論。

## 五個產品／世界問題

1. **不戰鬥能影響危機嗎？** 能。公共 food/gold/gear 準備改變 actual resolver probability；500配對平均30.85%→49.81%。資源是受控输入、不是正常農作／交易獲得，且不能拆成每項的獨立因果效果。正常 seed909 的補測沒有支援短缺，不虛構此處的玩家貢獻。
2. **冒險介入有獨特作用嗎？** 有。營地成功／Chief 介入減少危機 demand，承擔戰鬥成本與風險，沿用既有戰利品；正式 run 記錄营地重大貢獻及結算。不是 NPC 每次代打的證明。
3. **沒有玩家，NPC 世界能成功或失敗嗎？** 民防依實際居民條件有上下界，正常不戰鬥補測可完成危機；模型允許四種 outcome。10,000批次中的 NoPlayer 是受控死亡／零居民／恢復場景，不能當自然 NPC 自治成功率。
4. **失敗之後能繼續嗎？** 能。setback／local defeat 有有限後果、餘波及冷卻，世界不因此重建；指定零人口恢復與继承通過。任何時點人口歸零的全覆蓋不是此次承諾。
5. **是同一世界，還是孤立活動？** 危機使用現有 threat、Chief、居民工作／傷勢、食物、聚落、實際裝備、角色歷史／聲望與同一 seeded RNG／存檔。世界狀態有真實後果；沒有新增另一套獨立戰鬥或資源世界。

## Bug、工具故障及產品發現

- P0：未發現已確認產品 Bug。
- P1：D01 歷史 defender 被清除後內部存檔無法重讀，已修復並獨立驗證。
- P2：B01 severity 型別、D02 farmer 提示、E01 event capacity、F02 部分動作提交、F03 unsafe time cost 已修復；F01 保存結算／恢復缺口隨 F 實作完成。極限 counter 問題不當一般玩家 P1。
- P3：沒有已確認且未修的產品 Bug；初期生活目標指引、重複操作訊號與 Stress 終點 DOM/listener 差異是 [Product Findings](crisis-findings.md)，不是假定已確診的 Bug。
- selector、dict 存取、browserErrors 初始化、死亡 modal、save metadata 比較、受控 server favicon、早期統計 grouping 等 QA 工具錯誤／中斷，全部保留原失敗。[bugs.md](bugs.md) 列修復與證據，不把它們混作產品故障。

## 補充同 ID 非戰鬥證據

`j-normal-arc-runs/20261008T035215Z-pid60577` 保存 seed909、同一 `goblin-regional:0000038d:1` 的 warning→preparation→active→aftermath。正常 UI 等待，没有 combat／state 注入，沒有可用的食物／金幣支援及可捐 gear。

原 runner `FAILED` 保留：它把 explicit Save 造成的 `lastSavedAt` 變化當成完整 save 比較失敗。另行 [semantic review](j-normal-arc-semantic-review.md) 忽略唯一 timestamp metadata，保留原差異；worldTime、rngState、worldSeed、crisis、ledger、history 及其他核心欄位完全一致。這提供 lifecycle／reload continuity 的有條件證據；**Life contribution NOT EXERCISED**，不把等待算捐贈、不改原始結果。沒有為 QA 重新製造短缺或強制玩家戰鬥。

## 審查與驗收邊界

A–H 高風險 production 實作已有各階段獨立 Max／適用 Medium review；I/J 的 runner／統計／原始結果由獨立 Medium 覆核，實作者不自充最終審查。最新 [獨立 QA review](j-final-independent-review.md) 與版本 archive 保留最初 FAIL。

Human validation：**DEFERRED / NOT APPLICABLE AT THIS STAGE**。本輪是 Development QA／Phase6 engineering delivery，未宣告 build ready for human product testing；沒有以 Agent 回答取代真人問卷，也沒有 V2 Product Gate Passed。

必要13文件：baseline.md、crisis-model.md、civil-defense.md、contribution-analysis.md、crisis-simulation.json、crisis-balance.md、long-world.md、browser-regression.md、browser-stress.md、agent-crisis.md、bugs.md、crisis-findings.md、final-review.md。另附 regression/performance/independent reviews 和原始 artifacts；所有 QA 報告以 recorded_reports 追加保存版本。

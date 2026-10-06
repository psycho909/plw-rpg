# Oakvale V2 最終 QA Coverage / Provenance Review（中期）

- Review time: 2026-10-05 00:27 UTC
- Ticket: `tickets/20261004-v2-final-qa.md`（`in_progress`）
- Baseline / HEAD: `c02b600c6f5f1533374d671b707d333c86d852d7` / 同一 commit，branch `work`
- Scope: 只讀核對 QA harness、結果、source/build/seed provenance 與相關 app runtime；未改 app source、未重跑 regression。
- Reviewer: 未參與 QA artifact 產生的獨立 coverage/provenance reviewer；本環境沒有可核實的模型遙測，因此不聲稱特定後端模型。
- Disposition: **中期、不得視為 final QA 或 Product Gate 核准**。真 Browser Soak 和三條 Agent route 尚未達時長；Human Fun Gate 依規定維持 PENDING。

## Standards

本輪 app source 相對指定 HEAD 沒有變更；baseline 列出的 57 個 `src/` SHA-256 均與目前檔案一致。只讀重算 `/tmp/plw-v2-final-qa-dist` 三個 production asset 與 `http://127.0.0.1:5195` 實際 served asset 的 SHA-256，均符合 `build-manifest.json`。QA report 使用 `scripts/recorded_reports.write_recorded` 保存 append-only 的壓縮版本與 checksum；這能核對已保存的版本，不能保證本機檔案不被事後刪改，repo README 已有此限制說明。

Soak 是 headless Chromium，但開啟完整 production app，使用真實 Chromium 計時、DOM、IndexedDB 與 Playwright UI 操作。`soak/harness.py:220-246` 透過可見「起身」及「×20」控制啟動，`411-417` 使用 monotonic wall clock 排 checkpoint，`421-460` 以 UI 處理事件、視窗與按鍵；clock/RNG/state 讀取只用於觀測。app runtime 的 `src/engine/gameLoop.ts:8-33` 以 100 ms timer 取實際經過時間，再呼叫 store 的 `advance`。此次確認的 soak 流程沒有直接呼叫 simulation 或注入遊戲時間。

## Spec / Coverage

| 範圍 | 證據與 review 結果 |
|---|---|
| 全量 regression | `regression-initial.log` 記錄 14 個 test files、222 tests、typecheck 與 production build 通過。這是 baseline 的既有結果，本 reviewer 未重跑。 |
| Browser / idle | Chromium 28 checks、Firefox 8 checks；`browser/persistent-idle.json` 另記錄真實關閉 persistent Chromium、等待約 4 秒、同 profile 重開後核心 save 欄位相同，以及 lifecycle freeze/resume catch-up。瀏覽器證據明確是 headless，不聲稱 Safari 或手機實機。 |
| V1 migration | 7 fixtures 的 `migration-results.json` 為 PASS。`fixtures/manifest.json` 指向 V1 commit `75662ae3b5aa4045976a2844b41c01d4bbcef340`；我用 `git show <commit>:<path>` 確認 4 個 V1 engine/save source hash 一致。generator 以 V1 `createGame`、公開動作與 V1 `serialize()` 產生 `saveVersion: 1`、沒有 V2 `life` 欄位的 fixtures；V2 validator 比對 legacy data、V2 defaults、save/reload、idempotence 及 deterministic continuation（`engine/generate-v1-fixtures.mjs:21-40,128-143`；`engine/validate-v1-migration.mjs:46-99`）。這支持「native V1」來源判定。 |
| 多 seed 10/50/100 年 | `engine/long-term-results.json`、`featured-npc-lifecycle.json` 現為 PASS；執行 seed 17、909、2026 各 10、50、100 game years，年 batch 與逐日計算加逐年 serialize/reload 比對（`engine/long-term-validation.mjs:23-32`）。這是直接呼叫 V2 engine 的 long simulation，證明 engine 長期性，不替代 browser soak。 |
| Seed / source / build | baseline、build manifest、route artifacts 均指向指定 source commit。seed 17 / 2026 由當前 source 的 public `createGame(seed) → serialize` 建立；Life / soak 使用 UI 的預設 seed 909。Hybrid 現已揭露啟動 wrapper 只改 `lastSavedAt` 並初始化 `playJournal.worldId` metadata，沒有改 `worldTime`、RNG、角色或遊戲資源；精確 wrapper timestamp 已不可追溯，已按限制揭露，不把它說成完整 untouched save（`hybrid/observations.json:7-10,181-189`）。 |
| 2 小時真 Browser Soak | 最新發布的 `soak/results.json` 是 run3：1026.725 秒、17 checkpoints、狀態 `incomplete`。依 root 的 run update，run3 不抵扣，attempt4 重新起算；因此本 gate **PENDING**，不得把中斷時數相加，也不把尚未完成判為產品 fail。Ticket 要求至少 7200 秒及 120 checkpoints。 |
| Life / Adventure / Hybrid Agent route | README 尚列三路 RUNNING，當前記錄未證明每路完成至少 60 分鐘有效探索，均維持 **PENDING**。Agent evidence 是 agent 產生的探索資料，不是人類 Fun Gate 回饋。 |
| Human / Product Gate | `human-fun-gate.md` 的 8 題均留白，明確標示 Human Fun Gate `PENDING`、Product Gate `NOT YET APPROVED`；此狀態正確。 |

## Findings

### Spec / Coverage findings

1. **中：Adventure 的當前 fun-signal audit 不是有效的獨立 10 分鐘判斷。** `adventure/play.py:230-242` 目前由固定 helper 產生行動理由，再以 `why` 非空直接記 `goalDrought=false`；`rewardDrought` 只看等級或事件數增加，`repetitionWall` 與 `meaninglessReward` 留 `null`。這些規則會自動偏向「沒有 drought」，無法證明 agent 在每個區間真有檢視 reward/retention 訊號或自主改變計畫。需以實際 Agent 觀察及選擇取代此自動結論，並保存對應 evidence；root 已要求 route driver 修正。本 finding 僅限制 Agent/retention coverage，不是產品 bug。

2. **中：browser route 的 build fingerprint 關聯目前部分間接。** soak 與 persistent-idle 有本次實際 served asset hashes；Adventure 報告只有 source commit 與 manifest 路徑，Hybrid 報告有 source commit 但未在 route artifact 中記錄 served hashes（Hybrid 的 browser URL/profile 亦由啟動命令而非 report manifest 綁定）。目前 5195 的 served assets 與 manifest 相符，且全 route 使用同一 frozen URL；但若驗收文字要求每份 browser artifact 可直接追溯實際載入的 build，應在各 route 結果附 manifest reference 與起始 served JS/CSS/index hashes。Engine-only 結果已有 source commit/source SHA，毋須附 browser build hash。

3. **低：QA README 狀態摘要落後於結果。** `README.md:13-15` 仍把 00:04 的 soak run3 列為目前 RUNNING，且多 seed仍列 RUNNING；最新 soak result 已是 incomplete，而多 seed與 featured-NPC 結果 JSON 已 PASS。最終回報前需把摘要與新 soak attempt、route 結果、已完成 long-term 結果同步。這是 evidence/documentation consistency issue，不代表 engine QA 失敗。

## Product findings（Agent evidence only）

Life 路線首 15 分鐘記錄了可理解的自選近程目標：存 80 金買房；伐木有明確賣價與技能成長。該記錄也指出作物成熟等待偏長、靠重複伐木接近房價可能形成 repetition wall，而更高階產業的聲望取得路徑尚不清楚（`life/agent-playtest-life.md` 的首個 15-minute checkpoint）。這是值得真人 Fun Gate 驗證的產品風險，不能直接當作產品 fail 或 bug。

## Bugs

本次只讀 coverage/provenance review **未確認 app product bug**。setup、selector 或 reporter 失敗應保留為 harness/process evidence；不把它們冒稱為產品缺陷。

## Final review exit conditions

- 新 soak attempt 單次達 7200 真實秒且至少 120 checkpoints，附起訖 fingerprint、保存與 reload 證據。
- Life、Adventure、Hybrid 分別完成至少 60 分鐘有效 Agent exploratory；Adventure 修正自動 drought 結論並保留每 10 分鐘的 agent 判斷與所見狀態。
- browser route artifact 可追溯該次實際 served build，或在最終報告記錄等價且可重現的 build 綁定方式。
- 更新 QA README 與 final review，保留所有舊失敗/中斷版本，Human Fun Gate 仍標為 PENDING，直到真正玩家回覆。

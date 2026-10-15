# Phase8-E Max Review

## 結論

**需修正分析與報告後再接受。** 未發現足以支持 E 階段修改遊戲程式的直接證據；但 no-progress 分類和 capped-craft 替代選項分析各有一項會影響 P8-F02 結論的資料問題。Loot rerun 的決策合理，normal 與 controlled 證據也有分開。

## 審查範圍與快照

- 授權來源：`.scratch/20261014-phase8/review-e-max.md`；Ticket：`tickets/20261014-v2x-08e-reward-pacing.md`。
- Spec：`docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §3 P8-F02、§4、§9、§10 Loot／Normal Play、§13、§17。
- 基準與 HEAD：`5e223beb2ef056968861bc4c7125c1fb41da8728`（`git rev-parse 5e223be` 與 `git rev-parse HEAD` 相同）。
- 審查檔案：`reward-pacing.md`、`loot-reward-distribution.md`、`e-runner/e1-summary.md`，指定的六個 `scripts/phase8` pacing／loot scripts，以及 instrumented attempt `20261014T102419801Z`、loot attempt `20261014T100851766Z` 的主要 manifest、summary 與抽查 raw seed。
- 工作樹：這批 E 報告、script 與 artifacts 為未追蹤檔；E 範圍 staged／unstaged diff 與 `5e223be...HEAD` diff 均空。`git status --short` 未見 E 的 `src/` 修改。其他 Phase8 工作樹項目不納入審查。`rg --files -g AGENTS.md` 僅找到根目錄 `AGENTS.md`。
- Reviewer：依 dispatch 指派為 `g6-luna-max-deep-reviewer`，未參與 E 施工；目前環境無法獨立驗證實際 model runtime，因此不把角色名稱當成 runtime 證據。

實際唯讀差異檢查：

- 下列範圍的 `git diff --cached`、`git diff`、`git diff --name-status 5e223be...HEAD` 均無已追蹤差異：

  ```text
  reports/v2/20261014-balance-tuning/phase-08/reward-pacing.md
  reports/v2/20261014-balance-tuning/phase-08/loot-reward-distribution.md
  reports/v2/20261014-balance-tuning/phase-08/e-runner/e1-summary.md
  scripts/phase8/pacing-analysis-core.mjs
  scripts/phase8/run-pacing-drought.mjs
  scripts/phase8/run-pacing-instrumented.mjs
  scripts/phase8/analyze-pacing-instrumented.mjs
  scripts/phase8/run-loot-pacing.mjs
  scripts/phase8/test_pacing_analysis.mjs
  ```

  實際執行的三個 diff 命令使用以上完整路徑清單：

  ```text
  git diff --cached -- reports/v2/20261014-balance-tuning/phase-08/reward-pacing.md reports/v2/20261014-balance-tuning/phase-08/loot-reward-distribution.md reports/v2/20261014-balance-tuning/phase-08/e-runner/e1-summary.md scripts/phase8/pacing-analysis-core.mjs scripts/phase8/run-pacing-drought.mjs scripts/phase8/run-pacing-instrumented.mjs scripts/phase8/analyze-pacing-instrumented.mjs scripts/phase8/run-loot-pacing.mjs scripts/phase8/test_pacing_analysis.mjs
  git diff -- reports/v2/20261014-balance-tuning/phase-08/reward-pacing.md reports/v2/20261014-balance-tuning/phase-08/loot-reward-distribution.md reports/v2/20261014-balance-tuning/phase-08/e-runner/e1-summary.md scripts/phase8/pacing-analysis-core.mjs scripts/phase8/run-pacing-drought.mjs scripts/phase8/run-pacing-instrumented.mjs scripts/phase8/analyze-pacing-instrumented.mjs scripts/phase8/run-loot-pacing.mjs scripts/phase8/test_pacing_analysis.mjs
  git diff --name-status 5e223be...HEAD -- reports/v2/20261014-balance-tuning/phase-08/reward-pacing.md reports/v2/20261014-balance-tuning/phase-08/loot-reward-distribution.md reports/v2/20261014-balance-tuning/phase-08/e-runner/e1-summary.md scripts/phase8/pacing-analysis-core.mjs scripts/phase8/run-pacing-drought.mjs scripts/phase8/run-pacing-instrumented.mjs scripts/phase8/analyze-pacing-instrumented.mjs scripts/phase8/run-loot-pacing.mjs scripts/phase8/test_pacing_analysis.mjs
  ```

- `git ls-files --others --exclude-standard` 篩選上述 E 報告、scripts 與兩個指定 evidence attempts：確認本次審查內容為未追蹤檔；逐一讀取交付文件、檢視 scripts 與本次 claims 直接相關的實作區塊，並抽查 evidence。
- Loot 歷史差異：`git diff --name-status e05cc78..HEAD -- src/data src/engine src`、`git diff --stat e05cc78..HEAD -- src/data/content/caveInsects.ts src/data/content/fogUndead.ts src/data/content/frontierGoblins.ts src/data/content/mineConstructs.ts src/data/content/wildBeasts.ts src/data/contentRegistry.ts src/data/rewards.ts src/engine/itemGeneration.ts`，並讀取該範圍變更行。

## Findings

### P1 — 147 個 runner 遭遇上限 no-op 被誤列為合理世界等待

- 證據：`scripts/phase8/analyze-pacing-instrumented.mjs:38-45` 在仍有 eligible Normal `encounterOptions` 時，因 v3 當日上限已用完而分類為 `legitimate world wait`。上限是 runner policy：`scripts/phase8/route-policy.mjs:2,52-55`；instrumented runner 在 `scripts/phase8/run-pacing-instrumented.mjs:475` 套用它。`reward-pacing.md:47,61` 因此報告 runner policy defect 0、legitimate world wait 147，並明載這 147 是「仍有合法 Normal 目標」但 policy 隔日再走。
- 影響：這些 no-op 是 runner 的日上限造成，並非世界狀態阻止玩家行動。把它們歸成世界等待違反 §9 要求的 runner／world 區分，會低估 runner-limited outcomes、誇大 legitimate world wait。
- 建議：將 147 筆獨立標為 runner-policy-limited（或修正既有 runner 分類），重算 route 分類與 E-F1 摘要。此分類本身不證明遊戲有缺陷，也不要求改 `src/`。

### P1 — capped-craft 選項證據與零 XP craft 事件錯位

- 證據：`scripts/phase8/analyze-pacing-instrumented.mjs:62-66` 先把 craft decisions 收成完整序列，再獨立篩出 `zeroXpCrafts`，最後以零 XP 子序列的 index 讀取未篩選的 `craftDecisions[index]`。Life seed 的 raw `seed-life-61101.json:117085,117102,117119,117136,117159,117176` 顯示前六次 craft 各獲 10 XP；第一筆零 XP craft 在 `:117193`。因此零 XP craft #1 被配到 craft decision #1，而應對到第七個 craft decision；後續事件同樣錯位。`analysis-summary-r6.json:930,944,958` 的零 XP 數為每個 Life seed 670；`e1-summary.md:30` 卻把 676 個總 craft 數寫成「676-per-Life-seed zero-XP crafts」。
- 影響：`reward-pacing.md:59,78`「零 XP craft 當下沒有可給 smithing XP 的合法配方、且有交易替代」的逐事件結論，來自錯配的決策快照，不能由目前分析結果支持；e1-summary 的 676 也錯把總 craft 數當成零 XP 數。
- 建議：用 craft event ID／時間與實際 action decision 對齊，再重算替代配方與其他合法行動；修正 e1-summary 的 676/670 數字並更新 E-F3。先前六次有 XP 的 craft 是明確的索引偏移證據。

### P2 — Loot attempt 未保存主樣本 RNG seed 與 runner 指紋

- 證據：`scripts/phase8/run-loot-pacing.mjs:42` 以 `createGame(40131 + cohortIndex)` 建立 24 組主樣本，但 `summary.json` 僅保存 cohort totals；manifest `loot-attempt-20261014T100851766Z/manifest.json:3-5` 只記 source commit、每 cohort 次數與 cohort 數。Mirror seeds 雖在 runner `:60-68` 產生，輸出只保存總數與 pass flag（`:74`），沒有保存 seed 清單或 runner hash。Source commit 已記錄，缺口是重現主樣本所需的 seed mapping 及當次 runner 身分。
- 影響：§17 要求保留 Seed／Sample／Scenario 與 Source Fingerprint；目前 artifact 不能單靠 manifest／summary 還原執行時 seed 與 runner 版本。runner 原始碼現仍在工作樹，但未納入這份 attempt provenance。
- 建議：未來 manifest 保存各 cohort seed、mirror seed 或完整 seed formula，以及 runner SHA-256；目前的 source commit 與本審查所存 script hash 可供有限追溯，但不取代 attempt 內 provenance。

### P3 — Boss 首次 engagement 至首次 win 的 route elapsed time 容易被讀成單場戰鬥時間

- 證據：`scripts/phase8/analyze-pacing-instrumented.mjs:121-126,134-140` 分別選 route 中第一筆 Boss engagement 與第一筆 Boss win，再相減；不要求兩者是同一遭遇或同一 Boss ID。`analysis-summary-r6.json:1668-1671` 對 Adventure 61103 記錄首次 engagement 為 `wild_beast_apex`、首次勝利為 `frontier_goblin_warlord`；raw seed `seed-adventure-61103.json:13` 記有 18 次 retreat。`reward-pacing.md:51` 將結果描述為「145,469 minutes after engagement」。
- 影響與建議：算術是 route-level elapsed interval，但這不是連續交戰或單場 time-to-kill；請明寫「首次 Boss engagement 到首次 Boss 勝利的經過遊戲時間，期間多次撤退且 Boss ID 不同」，避免把 145,469 分鐘讀成單場 Boss 戰時間。

## Standards 與 Spec 結果

- **Standards：需修正上述分析與 evidence traceability。** 本次未編輯 `src/`、未執行測試、未 commit。review 是唯讀；report 在此處依授權新增。
- **Spec §9：未完全符合。** No-progress 分類錯置；E-F3 的逐事件替代選項證據錯配。
- **Spec §10、§17：部分符合。** Normal route、instrumented companion、controlled loot 分開呈現；instrumented manifest 記錄 HEAD、src fingerprint、seeds、v3 policy，raw evidence 亦保留。Loot attempt 則缺主樣本 seed／runner fingerprint。數值 bins 被明確標為描述性分析區間，沒有把它們當作產品門檻。
- **Loot rerun 判斷：PASS。** `e05cc78..HEAD` 的 family content diff 有 weighted equipment／裝備內容變更，且 registry 加入 farm-crop pack；`src/data/rewards.ts`、`src/engine/itemGeneration.ts` 在此區間無變更。舊 Phase7 樣本不能單獨代表新內容，重跑當前 award path 合理。抽查 current summary 的 24 cohorts × 4,167 = 100,008 calls、各 rank gear totals 與報告相符；controlled generation 沒有與正常路線 encounter frequency 混算。
- **v3 policy fidelity／validity gates：PASS（靜態檢查）。** `run-normal-routes.mjs` 與 instrumented runner 的 `adventureStep`、`lifeStep`、`runCombatAction` 函式逐字比較相同，且共用 `route-policy.mjs`；instrumented runner 呼叫 `evaluateRouteValidity`（`run-pacing-instrumented.mjs:714-717`）。E1 summary 記載 9/9 route-seed validity PASS。
- **E2 NO CHANGE：目前仍可作為暫定決定。** 已檢 UI 程式顯示 Boss／wolf eligibility reason 及 wolf reward expectation（`src/components/PlaceWindow.vue:133-149,197-201,236-262`），但沒有玩家可見性、理解或偏好證據；沒有證據要求 E 階段改動遊戲數值。先修正 runner analysis，不將 runner-only 結果推成產品改動。

## 驗證與限制

此 reviewer 未重跑 `node --check`、unit test 或長時間模擬。`e-runner/e1-summary.md:16-24,38-41` 記錄 worker 曾執行相關 syntax checks、`test_pacing_analysis` 3/3、pacing／loot run 與 analyzer；本 review 只讀取該紀錄與保存的 artifacts，不把它們稱為本次重驗。Raw spot-check 使用 instrumented attempt `20261014T102419801Z`、loot attempt `20261014T100851766Z`，未逐列重算所有 50,889 decisions 或 100,008 loot calls。

審查快照 SHA-256（工作樹未追蹤檔）：

| 檔案 | SHA-256 |
| --- | --- |
| `reward-pacing.md` | `80b3e97f472a51b3f4f457fb9aa86230153e668e38313048e861486d6b7c372b` |
| `loot-reward-distribution.md` | `cd2de7289ffab433f1162adeb1af609a9d9f8d17fa84055957c0e4a3fa380741` |
| `e1-summary.md` | `a2917acb9a1102583a4986f1ebbb25a36043b48737acd5b09e9002bd2ac7f24d4` |
| `pacing-analysis-core.mjs` | `492732017682ed6e4fbe568c0c7401aea0fcaafb1f43cadd0e7af68fc3755de7` |
| `run-pacing-drought.mjs` | `bad51139d553c41a871c88ee7bfdbc2e7f1dcb7de3d0d095b425296102d0e232` |
| `run-pacing-instrumented.mjs` | `65c0181b2f730e9825f5d0f228f8865e3d40d764d70a9e03d1997ae729e89248` |
| `analyze-pacing-instrumented.mjs` | `dc3adf6d250e8e1b137bb5b69c429b2714cf97ef0629ce6a40cdfabf37b431ad` |
| `run-loot-pacing.mjs` | `4e07af5ad54bf4d97fa977316fae57e97e6a7f1d2336ffe1497e883f2c3fc90b` |
| `test_pacing_analysis.mjs` | `e80355b56ae27fb138cedeb6bb0da2afbab55229e1915d1182947d3e3c8d6f9b` |
| `instrumented manifest.json` | `f10b55ab926757d2dc85efd414ed8b3087aecc091e9a51f7a1b03bd7909a07b2` |
| `analysis-summary-r6.json` | `a8b9101ab960fd8392a40b8decf97478339d4562a701802e30e4cf9d6fd00964` |
| `boss-visibility.json` | `9d408fab3e485977f3138a27cd92e68c278589c83333e50d23c5746ef2d3dde1` |
| `seed-life-61101.json` | `7659d1f786159a84657ab44baed0db0b3af367ffc8d900d1645ea13c447b263f` |
| `completion.json` | `3a18da15c230164f8b42208adebb91fb04ce42438be7a61ca82f667e6e3942fd` |
| `loot manifest.json` | `9056a512d902d20b93c76200cad321cccec4e85dff28cffb44e04e442853d2d67` |
| `loot summary.json` | `9b82bf6593512e5f78f6e1d8afb1ab8c5e6304f830e3731e787964a123431b70` |

## Disposition

**需修正後再接受報告。** 最小解除條件：修正 147 筆 runner-cap 分類；以正確 event/decision join 重算零 XP craft 替代選項並修正 676/670 誤述。P2 loot provenance 與 P3 Boss interval 說明應在正式收尾前補齊。沒有本次 review 支持的 E 階段 `src/` 改動提案。

# 大範圍完整性與長時間遊玩：一般 L2 Review

## 身分與審查快照

- 角色：未參與本輪修復的獨立一般 L2 reviewer；不是 L3 Audit。任務指定 GPT-6 Luna Max／`max` 路由；本環境沒有後端 runtime 遙測，故只記錄路由要求，不推定實際執行模型。
- Work Authority：[完整遊玩 Ticket](../../../tickets/20261003-comprehensive-playtest.md)。基準與 HEAD 依委派資訊為 `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`。
- 範圍：`src/engine/actions.ts`／`actions.test.ts`、`src/services/saveService.ts`／`saveService.test.ts`、`CHANGELOG.md` 兩項相關修復，以及本目錄完整報告／證據與該 Ticket。平行 server／typed-command 工作及其取消後的單機追加紀錄工作均不作為本次 runtime 證據。
- 明確禁止 Git，因此未執行 `git diff`、`git status`、`git rev-parse` 或提交操作，也未獨立核對 staged／unstaged 清單；依委派資訊識別工作樹為四個 source 檔的 unstaged 修改及報告新檔。實際 source 內容以四組 `diff -u /tmp/plw-rpg-baseline-694c6d76/<path> <path>` 與 `sha256sum` 對照具體基準快照。沒有施工；本 reviewer 唯一寫入是本報告。
- 閱讀 `AGENTS.md`、根 `README.md`、`docs/agents/review.md`、`docs/agents/skill-workflows.md`、`docs/SUBAGENTS.md`、Ticket、`SPEC.md`、`docs/UI.md`、CHANGELOG，以及完整綜合遊玩報告和其引用證據。依一般 review 路由使用 `matt-skills-curated:code-review`（`skill://plugins_6a78e83987748191afc0c56e12172fce/code-review/SKILL.md`；版本未提供）；專案 Review Contract／Skill adaptation 允許單一獨立 reviewer 分開檢查 Standards 與 Spec，故未拆成固定雙 Agent。

四個 source 檔的 SHA-256 均與先前的 `rest-fix-review.md`／`id-fix-review.md` 最終快照相同；四檔基準指紋也與 `artifacts/baseline.json` 及固定 source archive 一致。

| 檔案 | 基準 SHA-256 | 審查 SHA-256 |
| --- | --- | --- |
| `src/engine/actions.ts` | `03adf7e51cc7e0ea417f33fbf404c7b3836195041762276aceeb1c41d54cba5e` | `005e2a7f59ab076178e843d2021e5cbf3315b3ee9d07122358c76c6943313c6c` |
| `src/engine/actions.test.ts` | `2461065dede9733ebc785b7bef1f835af37e71fd8e47fa5e156d93c62279082a` | `3aff2bf73da6044dc271a8285dbeaaaf354f11a3f8262716b9b4600c32b4b1b8` |
| `src/services/saveService.ts` | `84fdc59920c77eec2e0ede1d0b48c8e958d4c8362a9fcfe84e3a1cc674b6578a` | `2a8cced65b901c2f616c022ee82f170c6b13d2ab486e7ddd0cab13aab5b98852` |
| `src/services/saveService.test.ts` | `66f3e7d6b784a4fef03aa69785bf80116417367f2d4bdd26fa9ddb268bbc559f` | `6dc6560c38677a4326ecaf2bf64c2cee3a0a3f0a4e09bfd6bacb34b562ce0482` |

## Standards

程式差異沒有未解的 Standards finding。`actions.ts:12` 先驗證並扣住宿費，再推進時間，避免跨午夜傭兵薪資和住宿費共用同一筆尚未扣除的金額；無額外費用的既有呼叫仍以 `gold = 0`，測試涵蓋零餘額及不足額拒絕、日薪解約／扣薪邊界、跨午夜往返存檔，以及恢復期間自然死亡。`saveService.ts:24`、`:45` 與 `:50` 在既有 shape check 後驗證 NPC allocator、作物唯一 ID 與事件序號不落後，未改寫輸入 raw；null crop 的短路順序仍先於欄位讀取。新增驗證留在原有純 validator，沒有改存檔版本。

[CHANGELOG 修復項目](../../../CHANGELOG.md)第 22–23 行分別對應正常跨午夜付費休息及三類損毀 ID／序號問題；[BUGS.md](BUGS.md)保留缺陷重現、分類與處置。`BUGS.md` 的極端安全整數耗盡限制仍明示為 OBS-002；本輪沒有把有限的 seed／年數測試延伸成無限接續保證。

既有驗證證據可對到審查 source hash：修復快照的 `final-check.log` 記錄 124 tests、六個 test files、`vue-tsc` 與 production build 成功；測試 fixture 隔離後 `review-fixtures-check.log` 記錄 57／57。原 `review-fixtures-types.log` 只有 npm notice，無法獨立證明型別檢查；整合者補上 [明確 type recheck 記錄](artifacts/review-fixtures-type-recheck.json)，其中 `./node_modules/.bin/vue-tsc --noEmit` exit 0，且 `saveService.ts`／`saveService.test.ts` 指紋與本次審查一致。這解除該證據缺口。此 reviewer 沒有重跑測試、build 或 Playwright harness；當前 full-check 不作為歷史快照證據。

## Spec

現有 SPEC／Ticket 要求的是同一世界中的生活、NPC／聚落／威脅演化、戰鬥、地下城、Boss、死亡繼承及存檔延續。報告把正常 UI、公開等待、headless 年度模擬與受控存檔 fixture 分開，沒有宣稱尚未實作的任務、家族或社交系統已驗證。

### 遊玩證據

- 生活路線以新 seed-909 世界從公開 UI 遊玩 181 個遊戲日；五個情境通過、176 項操作、159 個 checkpoint 中 158 次 reload 比對通過，0 page error。數字和 [life report／results](life/report.md) 一致。
- 冒險路線的完整成功重跑為 155.487 個遊戲日，歷時約 57.856 秒公開 UI 操作，7 場勝利。最後一次接手後完成整條 run；同一次地下城 run 的 stage 0→3、森林自然 Boss 生成與擊敗、`boss.defeated` raw history 及隔日世界延續都有 JSON checkpoint 支持。先前 `prior-economy-party.json` 中名為 floor3 的 checkpoint 是重入後第二層，報告明確不將它算作三層 clear。Harness selector／Playwright 參數錯誤被記為 HARNESS，沒有混成遊戲 page error。
- Persistence baseline 是 13 案：11 通過、2 個受控損毀資料缺陷；修復後 raw 保留、序號和正常逐田收割驗證另列。它們沒有被混成正常玩法結果。
- 原始 longevity baseline source tree hash `da0e9930463141a4dea8e5d12289433d4aafa01005e98f847b108a37ffdbb68e` 與固定 archive 的 13 個 source 檔重算一致；8 seed × 500 年、56 次自然死亡／繼承、4,056 次 exact save round-trip 均由 [結果](longevity/results.json) 支持。最終修復 source 的 8×500 年／4,000 年度往返另由 `final-integrity-results.json` 支持，不取代 baseline 結果。
- Soak 使用本機固定 build，真實 monotonic elapsed 1,200.293 秒，20 checkpoint、3 次同 context reload、0 pageerror；保留 1 筆 `/favicon.ico` 404 console error。主 harness 移動 API 參數錯誤造成的 20 個 `position_changed=false` 樣本不當成遊戲失敗或效能數據；短補充 context 的 ArrowRight 18.1 ms 與一次 save→reload→app resave 單獨記錄。相關限制在 [soak report](soak/report.md) 明確說明。
- 修復版 UI 回歸保存 107 checks／6 viewport，0 pageerror。其 `results.json` 的 `saveService.test.ts` hash 是 test-fixture 隔離編輯前的 `7abe5a70…`；當時三個 runtime source hash 與本次審查相同，之後該測試檔只有 fixture 隔離變更，並有上述 57 tests 及 final-hash typecheck 證據。故 UI 結果支持修復 runtime 行為，但不代表整份 source hash map 與最後測試檔完全相同。`movement-results.json` 也記錄了精確來源：基線 `simulation.ts`／`saveService.ts` 加上只變更休息交易順序的 `actions.ts`；它只作地圖移動補充證據，不宣稱是固定 commit 的完整重跑。

本次靜態檢查：本目錄 28 JSON 全部可解析、118 PNG 的 signature/chunk CRC/IEND 有效、10 Python harness 通過 AST parse；這些是可讀性／格式檢查，沒有執行 harness。16 份相關 Markdown（含根 README、本報告與該 Ticket）的內部目標重掃無失效連結。審查過程發現並由整合者修正三項報告引用：favicon log 改成既存的 `soak/http-404-evidence.txt`、未生成的 Boss 後世界延續 PNG 改連含該 checkpoint 的 JSON，並移除取消 server ticket 的死連結／封存承諾。修正後連結檢查通過。

## Review 中修正

- **F-01（Spec／證據邊界，已解除）：** 綜合 README 原先把單機追加紀錄寫成已另行驗證，但沒有證據連結。整合者改成「另由新 Ticket 處理」並連到存在的 `tickets/20261003-local-autosave-journal.md`；本 review 不替該 Ticket 的實作或驗收背書。
- **F-02（證據記錄，已解除）：** 原 `review-fixtures-types.log` 只有 npm notice，無法證明命令成功。整合者新增明確記錄的 `vue-tsc --noEmit` recheck JSON，記錄 exit 0 與兩個最終 source hash；README 已改連新證據。
- **F-03（引用完整性，已解除）：** 刪除取消 server 工作後，綜合 README 留有指向不存在 Ticket 的連結及封存承諾。整合者移除該引用，改述目前單機範圍；README 修正後重掃 15 份文件，加入本報告後最終 16 份均無失效內部目標。
- **F-04（引用完整性，已解除）：** BUGS 的 favicon server log 路徑曾少連字號，已改為既存 `soak/http-404-evidence.txt`；冒險報告曾連到未生成的 Boss 後世界 PNG，已改連包含 `world-continues-after-boss` checkpoint 的 `results.json`。兩個目標均存在。

## Disposition

四個 source 檔在本次 L2 scope 內沒有未解程式 finding；固定快照、路線報告、已知 harness 限制與修復後驗證彼此可辨識，review 發現的報告證據／連結問題均已解除。本次一般 L2 review 無未解 finding。Ticket 目前仍是 `in_progress`、Acceptance 尚未勾選；依委派指示，整合者最後更新 Ticket 與 Git sync 不作為本 review finding。本報告不核准提交、push、發布或整體 Ticket 結案。

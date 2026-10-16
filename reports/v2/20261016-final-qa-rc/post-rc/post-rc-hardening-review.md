# Oakvale V2.x — Post-RC Technical Hardening Review

- 日期：2026-10-16。Ticket：[20261016-v2x-post-rc-hardening](../../../../tickets/20261016-v2x-post-rc-hardening.md)。
- Baseline：HEAD = origin `6a15a2b`，工作樹乾淨；`HEAD:src` `b1a1ff20…`，與 RC 受測的 `76595c5` 相同。
- **產品 Source 本輪沒有變更**。最終 commit 只新增 2 個測試檔、1 個 QA runner、報告與 Ticket。dist 仍是 `a018b478…`（`sha256sum` 慣例）／`9ce31ea5…`（runner 慣例），與 RC 相同。
- 流程：Task A、B、E 由 Claude Lead 執行。Task C、D 與 B1 修正提案由 Codex worker 執行（Owner 2026-10-16 同意這一輪可以使用 Codex worker）：
  - `luna-high-s02-defender`
  - `luna-medium-g05-determinism`
  - `sol-medium-b1-retention`

  獨立審查由 `luna-max-hardening-review` 負責，它沒有參與施工，以唯讀方式審查。
- 最終驗證：`npm.cmd run check` 結果 **50 files／721 tests PASS**，`vue-tsc` 與 `vite build` 都通過。測試數比 RC 多的部分是本輪新增的 G-05、S-02 測試。

## A. Security Audit（唯讀，未修改任何全域設定）

| ID | 結果 | 風險 | Owner 動作 |
|---|---|---|---|
| SEC-01 ponytail 5.3.1 | **VERIFIED SAFE IN TESTED SCOPE**（程式行為）；trusted_hash 演算法 **UNVERIFIED** | 低 | 決定保留或移除 3 筆 `trusted_hash` |
| SEC-02 Orca／Herdr hooks | **VERIFIED SAFE IN TESTED SCOPE**；Orca 本機服務端 **UNVERIFIED** | 低～中 | 確認 Orca 的用途；不用時移除 `hooks.json` 中的 Orca 項目 |
| SEC-03 trusted project `herring` | 路徑**已不存在**，是失效的信任紀錄 | 低 | 移除 `[projects."C:\\Users\\pc\\orca\\workspaces\\dv3-dito-web\\herring"]` |

**SEC-01 — ponytail 5.3.1**

- 來源：`https://github.com/DietrichGebert/ponytail.git`，commit `6f1c2bf`（release v5.3.1，2026-10-16）。
- Hash 為什麼改變：hook 指令文字在 commit `8aa6740`（2026-10-12，#1078）由 `require('node:path')…replaceAll` 改成 `require('path')…split().join()`，這次更新同時改到 3 個 hook，與 3 筆 hash 變更一致。Codex 計算 hash 的方式無法重現，這部分標為 UNVERIFIED。
- 實際行為：
  - SessionStart 會在 Codex 的 `PLUGIN_DATA` 寫入模式旗標，並讀取 plugin 內的 `SKILL.md`。它會把 ponytail 規則注入模型 context，這會影響 agent 的行為。另外會執行 `git ls-files`（timeout 1 秒）產生程式碼地圖。
  - UserPromptSubmit 會依使用者指令寫入模式旗標，或寫入 `%APPDATA%/ponytail` 設定。
  - SubagentStart 會注入規則；用到的 `vm` 只用來比對 regex，有 100 ms timeout。
  - 沒有任何網路呼叫、外傳或 eval 外部內容。statusline 複製只在 Claude 環境發生，Codex 環境不會。
- 本輪的 Codex worker 是在 ponytail 已被信任的狀態下執行的，所以 ponytail 規則會注入它們的 context。我已審過 worker 的產出，沒有發現偏離 dispatch 的情況。

**SEC-02 — Orca／Herdr hooks**

- `herdr-agent-state.ps1`（Herdr v8 integration）：只在 `HERDR_ENV=1` 且為 SessionStart 時，執行 `herdr pane report-agent-session` 回報 session id，沒有網路或檔案寫入。
- `codex-hook.cmd`（Orca）掛在 10 個事件上，做兩件事：
  1. 如果環境變數 `ORCA_AGENT_HOOK_ENDPOINT` 指向一個存在的檔案，就用 `call` 執行它。這是一個間接執行點，但能設定這個環境變數的人本來就能執行程式。
  2. 如果 `ORCA_AGENT_HOOK_PORT`、`TOKEN`、`PANE_KEY` 都有設定，就把完整的 hook payload（包含 prompt、工具輸入與輸出）POST 到 `127.0.0.1`，帶 token，timeout 1.5 秒。
- 輸出全部丟棄、永遠 `exit 0`，所以它不能改變工具權限的決定。在 Herdr session 中沒有設定 ORCA 變數（本 shell 已確認），所以這個 hook 等於什麼都不做。
- `claude-hook-impl.cmd` 是同樣的模式。Orca app 收到 payload 後如何處理：**UNVERIFIED**。

**SEC-03 — herring 專案**

- 父目錄 `dv3-dito-web` 在 10-13 21:11 建立，目前是空的；`herring` 已不存在，推測是被移除的 Orca worktree。
- 現在沒有實際效果。但如果之後有人在同一路徑建立目錄，它會直接被 Codex 信任。

## B. Technical Findings

| 項目 | 分類 | 摘要 |
|---|---|---|
| B1 舊 pending 保留 | **CONFIRMED DEFECT（P3）＋ PRODUCT DECISION REQUIRED** | 見下文。修正提案已存成 patch，**沒有套用** |
| B2 IndexedDB 長期成長 | **VERIFIED SAFE IN TESTED SCOPE**（≤50 小時 x1 規模）；更大規模與 eviction **NOT TESTED** | 見下文 |
| S-02 防衛者裝備 | **PRODUCT DECISION REQUIRED** | 規格沒有定義防衛者離開防衛名單後，裝備與分配額該如何處理 |
| G-05 跨系統 determinism | **VERIFIED SAFE IN TESTED SCOPE** | Craft → Crisis → Save → Reload → Succession → Continue 的 replay 前後等價 |
| S-03 x1／x20 效能 | **VERIFIED SAFE IN TESTED SCOPE**（桌面 Chrome，含 CPU 4 倍降速模擬）；實體低階手機 **NOT TESTED** | 見下文 |

### B1 — 舊 pending 保留

- **壓縮時機**：取得 writer 時，`loadCheckpoint(true)` 之後會立刻同步呼叫 `save()`，`save()` 在序列化前就呼叫 `compactPending()`（O-01，`76595c5`）。
- **能否在壓縮前匯出**：不能。可寫入的分頁在第一次存檔前沒有任何操作的時間點。唯讀分頁讀到的 localStorage 也已經被 writer 壓縮過。
- **archive 是否已經有同樣內容**：一般沒有。pending 裡的紀錄只會在 archive 確認寫入後才被移除，只有遺失 ack 的情況下才可能重複。
- **marker**：summary 與 gap marker 會依世界正確記錄缺口，這點已由 RC O-01 驗證。合併多個世界時會失去個別來源，這是既有的 Owner 決策。
- **確認的回歸（RED）**：Lead 用暫存 probe 測試，IndexedDB 正常、checkpoint 放得進配額的條件下：
  - HEAD：只有 2 個 marker 進入 archive，原始的 400,000 字元舊紀錄被丟棄。
  - 修正前的 `b21ce0c`：舊紀錄會進入 archive。

  O-01 讓沒有必要壓縮的情況下也刪除了詳細歷史。這只影響遊玩紀錄，不影響遊戲狀態。
- **修正提案**：[`b1-retention-proposal.patch`](b1-retention-proposal.patch)，sha256 `c9ec3225…`，可直接套用到 `6a15a2b`。
  - 內容：`save()` 先照原樣寫入，只有遇到配額 DOMException 時才 `compactPending()` 並重試一次。
  - Worker 證據：RED 是 2 個測試失敗，GREEN 是 3 個檔案 65 個測試通過。
  - Lead 驗證：`npm run check` 50 files／723 tests PASS；套用後的瀏覽器 O-01 測試 28/28，其中 A3 確認舊紀錄完整進入 archive（5,163,330 字元）。證據在 `runner/b1-proposal-attempt-20261016T151101010Z-o01/`。
- **獨立審查結果：CHANGES REQUIRED**：如果舊 pending 放得進 localStorage 但歸檔失敗，checkpoint 裡的 pending 會暫時超過 P2-01 的 256 筆／256,000 字元上限，直到下一次 `record()` 才壓縮。時間流動時下一次 `record()` 不到 1 秒就會發生，但暫停狀態下會一直超過上限。
- **Lead 判斷**：這是兩條已核准規則之間的衝突：P2-01 的上限，以及「刪除詳細歷史需要 Owner 授權」。所以**沒有套用到產品**，產品維持 RC 驗證過的 O-01 行為。

### B2 — IndexedDB 長期成長

依據：受控資料、production Chrome 155、獨立 origin。

| Archive 規模（x1 等量） | IndexedDB usage | 匯出時間 | 匯出 Blob | 匯出後 heap | 最長 long task |
|---|---|---|---|---|---|
| 1 小時（400 筆，1.54M 字元） | 3.2 MB | 51 ms | 4.7 MB | 10 MB | 191 ms |
| 10 小時（4,000 筆，15.4M） | 10.5 MB | 449 ms | 45.5 MB | 65 MB | 248 ms |
| 50 小時（20,000 筆，77.2M） | 16.5 MB | 2,330 ms | 227 MB | 155 MB | 1,294 ms |

- 實際遊玩時的成長（E lane）：x1 每分鐘約 0.10 MB，大約每小時 6 MB；x20 每分鐘約 0.52 MB，大約每小時 31 MB。
- 桌面 quota 約 10.7 GB。
- `readAll()` 只在匯出時呼叫，會把整個 archive 和縮排 JSON 一次載入記憶體，所以記憶體和時間都隨歷史量線性成長。依推估，大約數百小時 x1 遊玩後，`JSON.stringify` 可能撞到 V8 的字串上限，手機也會更早遇到記憶體壓力。這部分**沒有重現**，是推論。
- 沒有發現資料完整性問題。storage 失敗與重試已在 RC 驗證過（B1–B9）。
- **NOT TESTED**：瀏覽器 eviction、行動裝置 quota、超過 50 小時的匯出。
- 不實作 retention、截斷或串流匯出；如果要做，需要 Owner 另開 Ticket。

### S-02 — 防衛者裝備

依據：`src/engine/postRcS02Defender.test.ts`；`luna-high-s02-defender-summary.md`。

- 重現過程：severity 3 危機、8 名防衛者，交付 16/16 件裝備；其中一名防衛者經 `die()` 死亡後：
  - 補位者進入目標名單。
  - 計分槽從 16/16 變成 14/16，裝備效果從 4.2743 降到 3.7400，剛好是死者那兩件裝備的效果。
  - 全域分配紀錄仍是 16/16，補位者無法再接受裝備（「目前沒有可用的防衛裝備欄位。」）。
  - 存讀檔後結果相同。
- 規格（`docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md:242-246, 2332-2334`）只要求裝備實際影響 Civil Defense，沒有定義防衛者失去資格後裝備的生命週期，或分配額要不要回收。
- 沒有明確違反規格，所以**不修改規則**。需要 Owner 決定：裝備要失效、轉交，還是釋出分配額。

### G-05 — 跨系統 determinism

依據：`src/engine/postRcDeterminism.test.ts`。

- 用 seed `20261016` 和公開 API 跑完整流程：
  1. craft starter spear。
  2. `tryStartRegionalCrisis`。
  3. 推進到 preparation，貢獻 25 金。
  4. 推進到 active。
  5. `die`，再 `chooseSuccessor`。
  6. 繼續推進 1 天。
- 對照組 A 連續執行；B 組在 3 個分界點用 `deserialize(serialize())` 產生**新物件**接續執行，每個分界點都檢查 round-trip 是否相同。
- 比對項目：RNG、時間、角色身分、背包與裝備、NPC、reward、危機的 phase 與貢獻、history、events，以及完整的序列化狀態，**全部相同**。沒有排除任何欄位；save 時間固定為 `now=0`。
- 受控的前置欄位（商店位置與素材、危機觸發條件）都已在測試與 summary 中標示。
- 獨立審查結果：VERIFIED SAFE。測試連續跑兩次都通過。

### S-03 — 效能

依據：production dist、Chrome 155、每個 lane 60 秒。

| Lane | 每秒存檔 | tick p50／p95／max（含 advance＋存檔） | setItem p95 | checkpoint 大小 | Frame p95 | Long task | 重載續行 |
|---|---|---|---|---|---|---|---|
| fresh x1 | 4.1 | 0／1.2／2.3 ms | 0.2 ms | 79k | 16.8 ms | 1 次（151 ms，暖機期） | ✓ |
| fresh x20 | 20.1 | 1.0／1.3／4.7 ms | 0.2 ms | 79–82k | 16.8 ms | 0 | ✓ |
| high-history x1（10 遊戲年） | 4.1 | 0／3.4／4.8 ms | 1.2 ms | 202k | 16.8 ms | 0 | ✓ |
| high-history x20 | 20.1 | 2.8／3.7／6.5 ms | 0.9 ms | 202k | 16.8 ms | 0 | ✓ |
| high-history x20＋CPU 4 倍降速（桌面模擬） | 20.1 | 10.5／14.7／23.5 ms | 3.9 ms | 202k | 16.8 ms | 0 | ✓ |

- 沒有頁面錯誤，也沒有 save error。heap 在 60 秒內最多從 7 MB 長到 30 MB。
- x20 每秒序列化約 4 MB 字元，但在受測範圍內，主執行緒時間只占不到 1.5%；CPU 4 倍降速模擬下約 15%。
- **沒有必要重構**。實體低階手機：**NOT TESTED**。CPU 降速是桌面模擬，不代表實機結果。

## C. Fixes

本輪**沒有套用任何產品修正**。

- B1 修正提案已經過 RED → GREEN → 完整 check → 瀏覽器驗證 → 獨立審查，但審查判定 CHANGES REQUIRED（與 P2-01 的上限衝突），所以只以 patch 形式交付，等待 Owner 決定：
  1. **核准提案**：明確接受「checkpoint 放得進配額時，pending 可以暫時超過上限，直到下一次 record()」這個例外，保留舊的詳細紀錄。
  2. **維持現狀**（O-01 行為）：遇到超大舊 pending 時接受詳細紀錄遺失。
  3. **另開 Ticket**，讓兩者同時成立：壓縮後把被丟掉的紀錄保留在記憶體中，等歸檔完成後才捨棄。這會改到 `compactPending`／`flushJournal`，風險較高。

## D. Remaining Risks（不阻擋 Engineering RC）

- B1：舊的超大 pending 在載入時會失去詳細紀錄（等待 Owner 決策）。
- B2：archive 總量沒有上限；`readAll()` 匯出時會一次載入全部，記憶體隨歷史量線性成長。超過 50 小時規模、eviction、行動裝置 quota 都是 NOT TESTED。
- S-02：防衛者裝備的生命週期需要 Owner 決策。
- S-03：實體低階手機 NOT TESTED；x20 的 IndexedDB 每小時約成長 31 MB。
- SEC-01／02／03：需要 Owner 處理信任紀錄。
- 沿用 RC：Safari、Firefox、實機 NOT TESTED；lost-ack 會造成重疊範圍；S-01 KEEP CURRENT VALUES；Threat KEEP V0；Merchant NOT MODELED；Human Product DEFERRED。

## E. Final Verdict

**HARDENING COMPLETE WITH FINDINGS**

- **Engineering RC 結論仍有效**：產品 Source 和 dist 跟 RC 受測版本完全相同（`b1a1ff20`／`a018b478`）。新增的只有測試、runner 和文件，所以 RC 的 PASS 證據仍然涵蓋目前的產品。
- 如果 Owner 核准 B1 提案，產品 Source 會改變。屆時要用新 Source 補驗證：完整 check、O-01 瀏覽器驗證（提案版本已跑過 28/28，但需要在正式 commit 上重跑），以及針對 P2-01 例外的回歸測試（歸檔失敗且 checkpoint 放得進配額的情境）。不能直接沿用 RC 的 PASS。

## QA artifacts

`post-rc/` 共 9 個檔案，約 7.4 萬 bytes：
- B2／E 量測：`runner/attempt-20261016T151529894Z-storage-perf/`（results＋manifest；Chrome profile 156 MB，已刪除）。
- B1 提案的瀏覽器結果：results＋manifest；截圖已刪除，manifest 中列出的 PNG 不再保存。
- patch 與 4 份 summary（含本報告）。

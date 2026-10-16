# Phase10-D 曆法修正 follow-up 獨立稽核

## Reviewer 身分與結論

- Reviewer requested model / effort：`gpt-6-luna` / `max`（任務名稱 `g6_luna_max_deep_reviewer`）。
- 實際 runtime：無法由目前可觀察資訊確認；任務名稱不證明後端 runtime。
- 本次獨立重審以唯讀比對程式、報告、JSON/JSONL 與 sidecar hashes；沒有重跑 runner、長跑或測試。
- **曆法修正與九列資料核對通過；前一版本報告的「無 findings」結論已被本次曆法 finding 取代。** 歷史曆法 finding 已由修正後 runner、重跑與報告更正關閉。更新 summary 後的 `d-artifacts.sha256` 已逐項核對通過；本次更新本報告會改變其 hash，整合者將更新該列並再做最後全表複核。Owner 最終驗收仍待完成。

## 檢查範圍與 source scope

檢查 `scripts/phase10/d-long-world.mjs`、新 attempt `attempt-20261016T065808351Z/`、舊 attempt 的 `calendar-correction.json` 與 `manifest.sha256`，以及 `long-world.md`、`save-migration-determinism.md`、`d-summary.md`、`test-results.md`、`d-artifacts.sha256`。

Follow-up 的工作樹程式差異只有 `scripts/phase10/d-long-world.mjs`；`git diff --name-only -- src` 為空，未修改 `src/`。runner 差異將 horizon 文字、`endAt` 與 checkpoint threshold 改為依 `CONFIG.daysPerSeason * CONFIG.seasons.length * CONFIG.minutesPerDay` 計算，並把實際曆法值記入 manifest（runner 行 44、180–196、208）。D pinned snapshot `4a71d3599cdf17ac3dab189d88e16fabcebe5033` 到本次執行 HEAD `e9f2efc90ad7da46331245a8ee229a3296187fcf` 的 tracked `src/` 差異是四個新增測試檔：Phase10-D persistence/determinism、Phase10-C goal continuity 與 Phase10 integration；沒有產品邏輯檔差異。新 attempt 記錄 123 個 tracked `src/` 檔案，fingerprint `3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842`；該 run 的 manifest HEAD 與目前 HEAD 相同。

## Finding 與處置

### D-CAL-01：原年長換算把標示年數延長為三倍

- **Severity：P2（對應 Final review finding `P2-01`）；狀態：已由 follow-up 關閉。** 這是長跑證據的時間尺度問題，不是產品缺陷。
- 原 D runner 以 `year * 360 * minutesPerDay` 計算標示的 10／50／100 年；但 `src/data/config.ts:4` 的遊戲曆法是每季 30 天、每年 4 季、每天 1,440 分鐘，即每遊戲年 120 天、172,800 分鐘。因此原 attempt 的標籤實際對應 30／150／300 個遊戲年；原版稽核將其當作精確 10／50／100 年而判無 findings，該結論不再有效。
- 舊 attempt `attempt-20261016T034911258Z/manifest.json` 記錄原公式。旁置的 `calendar-correction.json` 明列原標籤、120 天曆法、實際 30／150／300 年，並說明 raw attempt 保留、其 parity 只代表較長 horizon。舊 attempt 的 `manifest.sha256` 已包含這份 correction 檔；五項實際檔案 SHA-256 與大小逐項吻合。原 parity 與 orphan 證據仍可作為較長時間路徑證據，不能支持精確指定年數。
- Phase8 `scripts/phase8/run-world-crisis.mjs:272,346,372` 也用 360 天乘以標籤年數。以目前 120 天遊戲年解讀，Phase8-D 標示的 10／50／100 年對應約 30／150／300 個遊戲年。`long-world.md:15` 已將此說明為歷史證據時間尺度限制，沒有把 Phase8 結果冒稱為本次精確年數 run。
- Follow-up 已將 runner 公式改為 `CONFIG.daysPerSeason * CONFIG.seasons.length * CONFIG.minutesPerDay`，並以各 seed 新存檔的 `worldTime` 為起點。新 manifest 記錄 `daysPerSeason=30`、`seasonsPerYear=4`、`daysPerGameYear=120`、`minutesPerDay=1440`、`minutesPerGameYear=172800`。修正後的曆法基準精確落在年末 checkpoint：10 年 `1,728,480`、50 年 `8,640,480`、100 年 `17,280,480`（起點 `480` 加上年數 × `172,800`）。
- `test-results.md:19-27` 記錄修正後的 runner syntax check 與 3 seeds × 10／50／100 年 run；`long-world.md:11-20,49`、`save-migration-determinism.md:5,34,39` 與 `d-summary.md:5,11-22` 均一致描述新舊證據。Vitest 10 files／238 tests 是修正前的原測試證據；報告明確說明本次未改 `src/`、未重跑 Vitest，未把舊測試結果冒稱為 follow-up 重跑。

## 新 attempt 九列與 sidecar 核對

`attempt-20261016T065808351Z/summary.json` 記錄 `PASS`、9/9 checkpoints、save/reload 9/9、continuation 9/9、orphans 0；progress 中九列均記錄 `saveReloadEqual:true`、`continuationEqual:true`、`orphanCount:0`。以下 JSON 數值與 `long-world.md:22-39` 表格一致：

| Seed | 遊戲年 | worldTime | rngState | saveBytes | Save/reload | Continuation | Orphans |
|---:|---:|---:|---:|---:|:---:|:---:|---:|
| 40131 | 10 | 1,728,480 | 2,286,315,972 | 227,386 | true | true | 0 |
| 40131 | 50 | 8,640,480 | 571,579,292 | 273,518 | true | true | 0 |
| 40131 | 100 | 17,280,480 | 3,607,647,442 | 379,777 | true | true | 0 |
| 40132 | 10 | 1,728,480 | 4,088,973,152 | 211,769 | true | true | 0 |
| 40132 | 50 | 8,640,480 | 578,678,778 | 271,558 | true | true | 0 |
| 40132 | 100 | 17,280,480 | 3,567,353,305 | 343,933 | true | true | 0 |
| 40133 | 10 | 1,728,480 | 2,511,802,615 | 232,366 | true | true | 0 |
| 40133 | 50 | 8,640,480 | 3,961,099,355 | 337,962 | true | true | 0 |
| 40133 | 100 | 17,280,480 | 2,781,464,139 | 352,927 | true | true | 0 |

新 attempt 的 `manifest.sha256` 所列四項檔案及舊 attempt sidecar 所列五項檔案（含 `calendar-correction.json`）均與實際 SHA-256、byte size 相符。新 attempt 核對值如下：

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `manifest.json` | 1,557 | `239e67b3826137708a378e00aadf06ce311394131462af1b02a744e2f638d0f0` |
| `checkpoints.json` | 18,587 | `15381aa7e974df1b797ae671deec79b01300452abbacc95fcc78f75282b7ac53` |
| `progress.jsonl` | 1,518 | `d256734c6c2d4f45c65a248fa33e2153fd10659b75803c608aca11560ea50c61` |
| `summary.json` | 336 | `196a06abd36321ff632951f57f8283d0c8af3a3bc70b5024ca2f09f71bd12fd2` |

## Aggregate hash 清單複核

整合者更新 summary 並重建後，`d-artifacts.sha256` 共 19 條；本 reviewer 於 2026-10-16 07:09:09 UTC（15:09:09 Asia/Taipei）逐項比對，19/19 路徑存在且 SHA-256、byte size 均相符。新 attempt 內層 sidecar 4/4、舊 attempt（含 `calendar-correction.json`）內層 sidecar 5/5 也相符。更新後的 `d-summary.md:5,27` 已標示獨立稽核與證據包完整性核對完成，Owner 最終驗收待進行；狀態與本次稽核一致。

本次報告更新會改變 aggregate 清單中的 `d-audit.md` hash。依整合者安排，需更新該列後再做最後全表複核；此為本次稽核文件變更引出的最後 hash 同步步驟，不是新的 finding。

## 最終判定

曆法 finding 已透過設定來源計算、保留並更正舊 evidence、正確曆法的新 attempt 與一致報告關閉；九列 worldTime、save/reload parity、continuation parity、orphans、per-attempt hashes 與更新後 aggregate 清單均相符。**本 follow-up 的曆法與執行證據判定通過，沒有其他日曆、checkpoint 或 scope finding。** 本報告更新後仍需同步其 aggregate hash 並最後複核全表；Owner 最終驗收待完成。本 reviewer 未執行長跑或重新執行測試。

## Post-audit closeout

核對時間：2026-10-16 07:09:09 UTC（15:09:09 Asia/Taipei）。整合者更新 summary 後，本 reviewer 核對 aggregate manifest 19/19、new sidecar 4/4、old sidecar 5/5 全部通過；曆法 finding closed；Owner acceptance pending。加入本段與本次修訂後，`d-audit.md` 自身的 aggregate hash 需由 integrator 更新，並再執行最後一次 19 條全表複核。

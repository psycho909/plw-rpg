# Phase 10-E Chromium 壓力與效能觀察

## 執行識別

- 使用剛建置的 production `dist/`，Node `v22.14.0`、Windows x64、Chrome `153.0.8010.53`，以 Chromium/CDP 執行整合互動 20 分鐘。
- HEAD `29e7c4b9328c8ea7d58a71a4163a8d93643ea0db`；runner repo-relative dist fingerprint `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`。它與 dispatch 的 dist-relative fingerprint `7f5efed239807081c82b1ba48d8b6c1befb24291642509deb32e29cf134d5e00` 是同一 build 的不同路徑慣例，詳見 [build correlation](a-check-run/build-correlation-23ef273.txt) 與 [browser-regression.md](browser-regression.md#執行範圍與識別)。
- 完成時間 1,200.551 秒；5,358 筆動作紀錄、21 checkpoints、1,468 次 modal lifecycle。`closeout.json` 的 run errors 為 0，no-progress class counts 為空。

## 量測

21 checkpoints 的摘要；heap 為 V8 used heap，IndexedDB JSON bytes 是資料列投影大小，不代表資料庫檔案大小。

| 指標 | Phase10-E | Phase9-F1 參考 |
|---|---:|---:|
| 窗口／動作 | 1,200.551 秒／5,358 | 1,200.924 秒／6,467 |
| modal lifecycle | 1,468 | 1,862 |
| 點擊後可見變化，n／median／P95／max | 3,213／42／56／2,004 ms | 4,238／42／55／200 ms |
| 手動存檔延遲，n／median／P95／max | 131／38／54／80 ms | 未提供同口徑壓測分布；Phase9-F1 有 3/3 reload parity |
| inventory open，checkpoint median／max | 48／96 ms | P95 63 ms |
| collection open，checkpoint median／max | 44／54 ms | P95 56 ms |
| JS heap，checkpoint min／median／max | 4.00／5.82／13.01 MiB | median 5.34 MiB |
| DOM nodes，checkpoint min／median／max | 2,126／2,897／3,425 | median 2,656 |
| JS listeners，checkpoint min／median／max | 417／489／555 | median 466 |
| IndexedDB rows，checkpoint min／median／max | 2／131／259 | 2–30 rows |
| IndexedDB JSON projection，min／median／max | 1,369／36,983／78,244 bytes | 1,369–101,164 bytes |
| IndexedDB errors／unhandled rejections | 0／0 | 0／0 |

## 判讀與限制

- **孤立延遲尖峰：** 3,213 次可見變化量測中，中位數與 P95 與 F1 接近；最大值 2,004 ms 是一次「開啟選單」，在 2026-10-16 05:55:28Z。未再出現同等尖峰；次高為 465 ms（等待 1 日）。此值超出 F1 最大值 200 ms，列為需追蹤的單次 UI latency finding，不能用 P95 掩蓋。
- **短時輸入／選單重測：** `node scripts/phase10/e-stress.mjs input` 於 06:23:57–06:24:35Z 使用同一 production dist 執行 controlled search-latency starting save。引擎只預置一件合法 `starterSpear` 作為篩選資料；120 次文字輸入均透過可見 UI。裝備搜尋欄與配方搜尋欄各 60 次 keydown（交替輸入 `z` 及 Backspace 清空）；每次均確認搜尋值與可見結果數改變。計時從 CDP keyDown 呼叫前到輪詢首次看到輸入值及結果數都更新，4 ms 輪詢間隔。裝備搜尋 P50／P95／max = 5.32／8.49／9.15 ms；配方搜尋 = 5.64／9.97／12.45 ms；120/120 無逾時。另以可見 UI 開啟選單並 Escape 關閉 120 次：P50／P95／max = 39／46／85 ms，120 次均命中可見按鈕、選單均開啟，沒有 >200 ms 樣本；20 分鐘測試的 2,004 ms 尖峰在此次短測未重現。短測 runner errors 為 0。
- 各 checkpoint heap／DOM/listener 在窗口內有波動與階梯變化，沒有伴隨錯誤或連續失控成長的證據；目前樣本為單一 Chrome session，不能推廣到其他瀏覽器或長於 20 分鐘的使用情境。
- 131 次存檔延遲皆有成功確認；最後一筆為 46 ms。IndexedDB journal 成長至 259 rows、JSON projection 78,244 bytes，五個下載事件均完成。全程 IndexedDB errors、unhandled rejections、runner errors 均為 0。
- 輸入量測使用 CDP keyDown／keyUp，並要求 DOM 中搜尋值及篩選結果數都改變後才記錄延遲；量測用 4 ms 輪詢，因此延遲值包含 CDP 往返與輪詢觀測粒度。這是 controlled starting save 的短測，不是自然 fresh-save 進度證據，也不是 20 分鐘壓測的逐鍵分布。
- Chrome profile 清理前 127,720,631 bytes；`runtime-closeout.json` 確認清理成功。
- Phase9 比較資料：`reports/v2/20261015-ui-ux-polish/phase-09/browser-stress.md` 與 `performance.md`；Phase9-F1 的 reload parity 為 3/3。這次 E runner 沒有另外做 reload parity 壓測。

## 證據與保留

- `e-runner/attempt-20261016T054713528Z-stress/closeout.json`、`checkpoints.json`、`checkpoint-trace.ndjson`、`artifact-sha256.json`、`runtime-closeout.json` 與 `checkpoint-stress-final.png`。
- 短測 successful attempt：`e-runner/attempt-20261016T062357703Z-input-latency/closeout.json`、`controlled-search-checkpoint.json`、`actions.ndjson.gz`、`artifact-sha256.json` 與 `runtime-closeout.json`。兩個早期短測 runner setup failure 保留於各自 `e-runner/attempt-*input-latency/` 目錄；均發生在量測開始前，profile 清理證據也有保留。
- 動作原始資料 14,376,626 bytes 已 gzip；`actions.ndjson.gz`、`action-trace.ndjson.gz` 是同內容（同 SHA-256）的雙份產物，各 655,585 bytes；round-trip 驗證成功。checkpoint trace 125,073 bytes 保持明文。
- UI 下載的 journal JSON 原始 391,307 bytes 已 gzip 為 `downloads/oakvale-play-records.json.gz`（25,832 bytes）；SHA-256 與 gzip round-trip 記錄在 `e-artifact-sha256.json`。

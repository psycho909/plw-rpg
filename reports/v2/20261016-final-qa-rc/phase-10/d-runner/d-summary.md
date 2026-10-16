# Phase10-D 摘要：Persistence & Long-world Stability

## 狀態

**曆法修正、精確年數長跑、獨立稽核與證據包完整性核對均完成；Owner 最終驗收待進行。** 本摘要不代表 Ticket 已 accepted，也不代表 Phase10 整體已驗收。

## 範圍與結果

- 依 Ticket `20261016-v2x-10d-persistence.md`、dispatch D 與 Feature Freeze 執行；本次只修改 `scripts/phase10/d-long-world.mjs` 與 D 範圍報告，沒有修改 `src/` 產品程式或存檔格式。
- 修正 runner 年長計算，使用 `CONFIG.daysPerSeason * CONFIG.seasons.length * CONFIG.minutesPerDay`。目前遊戲年為 120 天／172,800 分鐘，manifest 明列曆法設定與換算值。
- 精確命令 `node scripts/phase10/d-long-world.mjs --seeds=40131,40132,40133 --years=10,50,100` 通過：9/9 checkpoint、save/reload 9/9、continuation 9/9、orphan references 0，JSON payload 211,769–379,777 bytes。精確數據見 [`long-world.md`](../long-world.md)。
- 原 attempt `attempt-20261016T034911258Z` 已保留並重新標示為 30／150／300 個遊戲年；解讀補充見其 [`calendar-correction.json`](attempt-20261016T034911258Z/calendar-correction.json)。其較長 horizon parity 仍有效，但不能替代精確 10／50／100 年檢查點。
- Phase8 `run-world-crisis.mjs` 使用相同 360 天／年慣例，故 Phase8-D「10／50／100 年」同樣是 30／150／300 個遊戲年。這是歷史證據限制，不是產品缺陷；詳見 [`long-world.md`](../long-world.md)。
- 存檔／遷移／確定性契約盤點與定向 Vitest 證據見 [`save-migration-determinism.md`](../save-migration-determinism.md) 及 [`test-results.md`](test-results.md)。10 個檔案、238 個測試是在修正 runner 前執行；本次重新執行 runner syntax check 與完整長跑。

## 最終精確曆法 run

- Attempt：[`attempt-20261016T065808351Z`](attempt-20261016T065808351Z/summary.json)
- 執行 HEAD：`e9f2efc90ad7da46331245a8ee229a3296187fcf`
- Source fingerprint：123 個追蹤 `src/` 檔案，`3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842`
- 曆法：30 天／季 × 4 季／年 × 1,440 分鐘／天 = 172,800 分鐘／遊戲年；checkpoint `worldTime` 為 1,728,480、8,640,480、17,280,480。
- 結果：PASS，9/9 checkpoints；全部 save/reload 與 continuation parity 通過；orphans 0。
- Runner requested role：`gpt-6-luna / max`（task label `g6-luna-max-core-engineer`）；實際 runtime 身分無法由工具確認，不作宣稱。

## 獨立稽核

舊版 D 稽核不涵蓋本次 calendar fix 與重跑結果，不能作為此修正的獨立稽核。follow-up 獨立稽核已記錄於 [`d-audit.md`](d-audit.md)，並關閉曆法 finding。最終 aggregate hash 清單列出 19 個 D 交付檔案，重建後逐項核對通過；兩個 attempt 的內層清單也分別通過 4/4 與 5/5。L3 的 Owner 最終核准仍待 Owner 執行。

本次 D 交付檔的 SHA-256 與位元組數彙總見 [`d-artifacts.sha256`](d-artifacts.sha256)。

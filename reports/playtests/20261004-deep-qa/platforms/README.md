# QA-08 瀏覽器與平台 Smoke

**最終結果：Chromium 與 Firefox ESR 共24/24 cases通過；使用者最新明確排除原生Safari與手機實機測試，本轮QA-08結案。** 這份報告只完成 QA-08，不代表 `tickets/20261004-deep-qa.md` 的其他七條路線已通過。

以下runtime與原先平台阻塞描述保留執行當時的歷史；已排除平台不列PASS，也不再阻塞本輪驗收。

最新完整 run 為 2026-10-04 07:52:14–07:52:45 UTC，狀態 `complete-with-platform-blockers`。最終單次結果見 [smoke.json](smoke.json)，完整 console、page error、request、resource、IndexedDB 與效能快照見 [browser-events.json](browser-events.json)。每次 checkpoint 和報告更新都經 `scripts.recorded_reports.write_recorded` 寫入；[playlog.jsonl](playlog.jsonl) 是 append-only 歷程，保留先前中斷與修正中的 harness 結果，不要把較早的 partial snapshot 當成最終 run。

## Build 與平台指紋

測試只使用本機固定 production build `http://127.0.0.1:5193/`。Run 先抓取頁面及引用的 JS/CSS，並與 [baseline/final-manifest.json](../baseline/final-manifest.json) 的 build hashes 比對；`matchesBaselineBuild` 為 `true`。

| 產物 | SHA-256 |
| --- | --- |
| `index.html` | `c05d86559e72706f8acfd1b979aab9cb530c0769022c3e0134c1b6a91a99b911` |
| `assets/index-BicP0bQ_.js` | `24c25d4370be890fe10194c1b3a9d85e2bb9289a8d67bcc6757da11e3fc2c8c9` |
| `assets/index-B0QR5Rvd.css` | `cb53c449ba9875b40c40ecfba8fd4eb473b63903a19ebb4f3dbb810dcfc65fb8` |

來源標記是 `738bc00 + O1 recovery patch (exact sourceHashes)`，來源 commit 為 `738bc0010c549fa3fb2420437d171f5aa2a043a0`。這個歷史 manifest 標記記錄的是建置當時尚未提交、已核對的 O1 recovery patch；不宣稱起始 commit 單獨包含 patch。執行本次最終 smoke 前，修正已提交為 `c22de4e636215b11057e2a37b0fc4eaf826a8234`；[source-commit.json](../baseline/source-commit.json) 核對該提交的 35 個來源 hash 與固定 build 完全相同。每個來源檔案的 SHA-256、差異摘要、套件來源與套件雜湊、Firefox runtime 限制及硬體盤點都保存在 [platform_inventory.json](platform_inventory.json)。

執行環境是 Debian GNU/Linux 13、Python 3.12.14。Chromium 151.0.7922.173 使用 Playwright 1.62.0；Firefox ESR 153.4.0 使用官方 geckodriver 0.37.1，兩個瀏覽器都在 Linux headless container 執行。Firefox 套件解開在 `/tmp`，沒有安裝 host package；需為這個 Firefox process 設定 `LD_LIBRARY_PATH`。容器的預設 Firefox content process 讀取唯讀 `/proc/self/uid_map` 時收到 signal 11，所以本次 Firefox process 使用 `MOZ_DISABLE_CONTENT_SANDBOX=1` 和 Firefox pref `security.sandbox.content.level=0`。這是 process-local 相容設定，沒有修改 host 或全域設定；因此 Firefox 結果不能代表啟用預設 sandbox 的一般桌面環境。

## 重現方式

在 repository 根目錄執行：

```bash
PLW_QA08_URL=http://127.0.0.1:5193/ python3 reports/playtests/20261004-deep-qa/platforms/qa08_smoke.py
```

執行前需讓同一個 frozen production build 在 localhost `5193` 回應。Harness 只接受 `localhost`／`127.0.0.1`，並在啟動瀏覽器前驗證 build hash；不使用舊的 `5191`／`5192` server。命令建立可丟棄的瀏覽器工作階段，不連正式網站、不載入正式玩家存檔，也不需要遊戲來源修改或新增依賴。每個 Firefox sandbox 相容參數只傳給本次 geckodriver／Firefox process。

桌面流程在 1440×1000 開始。農田種植、等待兩日、收割均使用公開 UI 操作，沒有注入時鐘。隊伍與戰鬥流程使用 seed 909 的受控 save fixture：在 app mount 前把聚落狀態設為 town、確保酒館建築可用、選一位合法成年 NPC 設為傭兵，並調整玩家金幣與戰鬥能力讓 smoke 可快速完成；僱用、移動、遭遇與戰鬥操作仍由瀏覽器 UI 完成。Fixture 不改來源檔案，也不代表其發生率或自然進程。

Chromium fixture 透過 page init script 在新分頁 document 啟動前載入，並用 tab-local `sessionStorage` marker 限制為單次注入，避免 reload 時重灌初始 fixture。Firefox 使用同 profile 的空白同源分頁，在導覽至 app 前寫入 fixture。重載追蹤保存 reload 前 raw、應用 pagehide handler 後 raw、可用時的 document-start raw，以及 reload 後 raw。Chromium document-start snapshot 由 Playwright init script 在應用程式碼前擷取。

## 通過案例

下表每個共用案例都在兩個瀏覽器各執行一次。Chromium case IDs 為 QA08-01–10；Firefox ESR 對應為 QA08-13–22。

| 驗證 | Chromium | Firefox ESR |
| --- | --- | --- |
| 開啟有指紋核對的 frozen build | PASS | PASS |
| 角色對話框鍵盤導覽、Tab focus 與 Escape 關閉 | PASS | PASS |
| 透過 UI 整地、播種 | PASS | PASS |
| 透過 UI 等待兩日、確認成熟並收割 | PASS | PASS |
| app mount 前載入受控 town fixture | PASS | PASS |
| 酒館透過 UI 僱用隊員 | PASS | PASS |
| 森林遭遇、戰鬥操作與結束 | PASS | PASS |
| 手動存檔及 reload 保留世界、角色、隊伍 | PASS | PASS |
| reload 前後 IndexedDB 可讀，record IDs 唯一 | PASS | PASS |
| 匯出 IndexedDB 紀錄與目前 checkpoint | PASS | PASS |

Chromium 另外以 Playwright mobile viewport/touch emulation 驗證 390×844 與 412×915 CSS viewport（QA08-11、QA08-12）：實際 viewport 符合要求、沒有水平 overflow、mobile nav 顯示，`maxTouchPoints=1` 且 coarse pointer 為 true。這是 viewport emulation，user agent 仍是 Linux HeadlessChrome。

Firefox 的兩個補充窄窗檢查也通過，但 Linux window resize 沒有達到要求尺寸：請求 390×844 時 document client/visual viewport 為 488×690；請求 412×915 時為 488×761（inner window 寬 500）。這兩項只記錄 Firefox 的實際窄窗響應，不作為 390 或 412 viewport 證據，也不代表手機硬體。

Chromium IndexedDB 在 reload 前後分別有 16／17 筆記錄；Firefox 分別有 14／14 筆。兩邊 ID 都唯一。匯出均包含 archive、current checkpoint，pending 為 0；Chromium 匯出 17 筆、Firefox ESR 匯出 14 筆。

Reload trace 顯示 Chromium reload 時 `fixtureInjectedOnReload=false`；save 前至 pagehide、pagehide 至 document start 的 top-level 變更都只有 `lastSavedAt`。reload 後隊伍、位置與世界狀態保留，遊戲時間只前進一分鐘。Firefox 的 pagehide snapshot 同樣只改 `lastSavedAt`，隊伍與位置保留。兩個瀏覽器完整 raw trace 有獨立檔案及 SHA-256：

- [Chromium reload storage trace](chromium-reload-storage-trace-20261004T075214+0000.json)
- [Firefox ESR reload storage trace](firefox-esr-reload-storage-trace-20261004T075214+0000.json)

本次 app page error 為 0，request failure 為 0，受測 HTML/JS/CSS response 都是 200。唯一 console error 是本機 server 對 `/favicon.ico` 回 404；沒有影響遊戲載入或 smoke 的 JS/CSS。Firefox WebDriver log 保存在 [geckodriver-session.log](geckodriver-session.log)。

## 截圖與匯出

所有 screenshot 的瀏覽器、標籤、bytes 與 SHA-256 收錄於 [smoke.json](smoke.json)。常用畫面：

| 證據 | Chromium | Firefox ESR |
| --- | --- | --- |
| 角色視窗與鍵盤焦點 | [PNG](chromium-character-modal.png) | [PNG](firefox-esr-character-modal.png) |
| 已播種農田 | [PNG](chromium-farm-planted.png) | [PNG](firefox-esr-farm-planted.png) |
| 兩日後成熟農田 | [PNG](chromium-farm-mature.png) | [PNG](firefox-esr-farm-mature.png) |
| 酒館已僱用隊員 | [PNG](chromium-party-hired.png) | [PNG](firefox-esr-party-hired.png) |
| reload 後畫面 | [PNG](chromium-after-reload.png) | [PNG](firefox-esr-after-reload.png) |
| 390×844 viewport/window 檢查 | [PNG](chromium-390x844-home.png) | [PNG](firefox-esr-390x844-home.png) |
| 412×915 viewport/window 檢查 | [PNG](chromium-412x915-home.png) | [PNG](firefox-esr-412x915-home.png) |

UI 匯出原件：[Chromium](chromium-play-record-export.json)；[Firefox ESR](firefox-esr-play-record-export.json)。各自的 SHA-256、筆數與 archive metadata 也在 `smoke.json`。`playlog.jsonl` 保留較早的 incomplete runs；其中的 fixture/reload 與 WebDriver adapter 問題已在 harness 修正。最終 run 是 24 PASS、0 FAIL、0 harness error。

## 未驗收的平台與解除條件

| 平台 | 狀態 | 證據與所需連線 |
| --- | --- | --- |
| 原生 macOS Safari | BLOCKED | 執行環境是 Debian，沒有 Safari、macOS host 或遠端 browser service。需提供可由本 task 連線的 macOS Safari WebDriver／`safaridriver` host，或核准的遠端 Safari service。 |
| iPhone 實機 | BLOCKED | 沒有 iPhone、USB/device node、Xcode `xcrun`／`simctl` 或遠端裝置服務。需提供實際 iPhone Safari session 的可連線 macOS host 或實機雲服務；Simulator/viewport 不算實機。 |
| Android 實機 | BLOCKED | 沒有 Android device、USB passthrough、`adb`／emulator 或遠端裝置服務。需連接已授權的實體 Android（`adb devices -l` 可見且可操作 Chrome），或提供核准的遠端實機服務；viewport 不算實機。 |
| Linux WebKit | BLOCKED | 沒有已安裝 binary/cache；Playwright WebKit CDN host 不在目前 allowlist，因此未發送下載請求。需提供已核准的 WebKit runtime 或允許的 remote WebKit service。 |

待使用者提供可連線裝置或服務名稱及連線入口後，才能續做原生 Safari、iPhone、Android 實機 smoke；需要認證時透過環境設定提供，不在 chat 傳送憑證。現有 viewport 結果不替代這些平台。

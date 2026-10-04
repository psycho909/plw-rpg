# Modal 記憶體疑慮診斷

本次視窗反覆開關後的 retained DOM 訊號，分類為**已確認的測試工具 artifact**。同一固定遊戲 build 移除 Python Playwright 的 selector 等待後，地圖與物品視窗的節點／監聽器都能回到基準；原生 dialog 也能獨立重現 visible 等待造成的保留。這個訊號不構成修改 Vue 或遊戲原始碼的依據。**本報告不宣稱整個遊戲沒有 memory leak，也不取代至少 7,200 秒的 QA-01 soak。**

來源為 [final-manifest.json](../baseline/final-manifest.json) 的 `738bc00 + O1 recovery patch (exact sourceHashes)`，不能簡稱為起點 commit 單獨包含修復。補測使用目前 localhost 5193 服務；三個 HTTP 資產 SHA-256 與該 manifest 完全一致，來源檔案指紋在診斷前後也一致。舊 probe 的 5192 僅是當時服務位置。

1. **範圍與隔離**：本 worker 只寫此目錄，所有 harness、checkpoint、JSON、heap snapshot 與此文件皆透過 `scripts.recorded_reports.write_recorded` 追加版本後發布。沒有修改遊戲 source、固定 build、其他 worker 路線、套件、主 soak 或 Git。每個 runtime case 使用新 context，瀏覽器程序由診斷 harness 自行啟動與關閉；強制 GC、heap snapshot 與 console 試驗只作用在這些可丟棄頁面。
2. **執行環境**：Python Playwright 與其 driver 皆為 **1.62.0**；`/usr/bin/chromium` 回報 **151.0.7922.173**、Linux headless，viewport 1440×1000。版本與 coreBundle SHA-256 在 [followup-probe.json](followup-probe.json)，角色及精確模型路由在 [diagnosis-metadata.json](diagnosis-metadata.json)。
3. **角色與方法**：Orchestrator 的實際 spawn 參數為 `gpt-6-astra`／`max`／`fork_turns=none`，工具接受 `/root/astra_memory_finish`。這是選用及路由證據，沒有後端模型遙測。使用 `matt-skills-curated:diagnosing-bugs`，依專案適配沿用已存在的紅訊號及四個可證偽假設；另讀取 onboarding/runtime skills。沒有再派 agent。

既有紅訊號與七組控制，保存於 [probe.py](probe.py)、[probe.json](probe.json) 及其版本紀錄。原始 root 對照在 [modal-gc-probe.json](../root-checks/modal-gc-probe.json) 與 [modal-gc-followup.json](../root-checks/modal-gc-followup.json)：60 次暫停 modal 循環後，GC 仍留 37,828 nodes；延遲 GC、恢復真實時鐘及累積 120 次循環後仍留 73,549 nodes。這證明當時有強保留，但原 harness 全程含 visible／detached selector 等待，無法單獨把保留歸因給遊戲。

| 既有 control，均完成 40 次 | GC 後 nodes | GC 後 listeners | 判讀 |
| --- | ---: | ---: | --- |
| 地圖 keyboard + selector waits | 2,111 → 82,031 | 414 → 16,320 | 紅訊號重現 |
| 物品 keyboard + selector waits | 2,111 → 5,871 | 414 → 960 | 紅訊號重現 |
| 物品 keyboard，無 selector | 2,111 → 2,111 | 414 → 414 | 精確回基準 |
| 物品 native key dispatch + close click | 2,111 → 2,111 | 414 → 414 | 精確回基準 |
| 同上，先呼叫 dialog.close() | 2,111 → 2,111 | 414 → 414 | 不需此介入即可回收 |
| 原生 dialog showModal/remove | 4 → 4 | 0 → 0 | 可回收 |
| 原生 dialog showModal/close/remove | 4 → 4 | 0 → 0 | 可回收 |

補測 [followup_probe.py](followup_probe.py) 於 **2026-10-04 07:23:47–07:24:09 UTC** 執行，六個 case 全部完成，逐次檢查 open 與 detached 的實際布林結果。App 經正常 UI 暫停，以真正 `keyboard.press('m')`／`keyboard.press('Escape')` 開關；不注入世界時間、存檔 fixture 或遊戲 state。每次開／關後都等 15 ms；selector 組只額外加入表列操作。所有 page.evaluate 均只回傳 undefined、布林、數字或純資料，harness 沒有明確建立／保存 DOM handle。每 20 次先測量，再 settle 200 ms、兩次 `HeapProfiler.collectGarbage`，兩次之間各等 100 ms；connected elements 始終為 app 882、原生 3。

| 補測控制 | 次數 | GC 後 nodes | GC 後 listeners | GC 後 used JS heap 增量 |
| --- | ---: | ---: | ---: | ---: |
| 地圖 keyboard，零 selector | 40 | 2,111 → 2,111 | 414 → 414 | +635,216 bytes |
| 相同步驟 + visible／detached waits | 40 | 2,111 → 82,031 | 414 → 16,320 | +24,179,004 bytes |
| 原生 dialog，零 selector | 20 | 4 → 4 | 0 → 0 | +124,292 bytes |
| 原生 dialog + visible wait | 20 | 4 → 144 | 0 → 46 | +1,250,128 bytes |
| 原生 dialog + detached wait | 20 | 4 → 4 | 0 → 13 | +726,528 bytes |
| 原生 dialog + locator.is_visible() | 20 | 4 → 4 | 0 → 13 | +763,040 bytes |

因此不是所有 selector 查詢都造成相同保留；本機已縮小至 **visible `Locator.wait_for()` 的回傳 handle 路徑**。零 selector 的 JS heap 仍有暖機後增量，DOM 回基準不等於所有 heap 配置均為零，更不代表整場長玩沒有其他成長來源。

實際 heap retaining path 見 [retaining-paths.json](retaining-paths.json)。分析器從 snapshot node 0 做 breadth-first traversal，排除 weak edge，保存 node ID、detachedness 與完整最短路徑；沒有聲稱做過 retained-size 或 dominator 歸因。

```text
snapshot root
  → (GC roots)
  → (Global handles)
  → internal "83 / DevTools console"（其餘節點索引不同）
  → detached <dialog …>
```

20 次原生 visible wait 的 snapshot 有 **20 個 detached dialog**，每個都有直接的 inspector global-handle 保留邊；零 selector snapshot 有 **0 個 dialog**。另外四次真實地圖 visible wait 的 snapshot 有 **4 個 detached 遊戲 dialog**，同樣由該全域 handle 直接保留。六份原始 `.heapsnapshot` 均保存於本目錄，合計 54,920,638 bytes；個別 SHA-256、大小及 node ID 在 retaining-paths.json 與各 run JSON。

[retainer_probe.py](retainer_probe.py)／[retainer-probe.json](retainer-probe.json) 於 **07:27:26–07:27:36 UTC** 完成三組補充 case。每組透過額外 CDP session 啟用 Runtime 事件觀察，console 與 exception 事件都是 0。四次原生 visible wait 的 32 nodes／30 listeners，以及四次地圖的 10,103 nodes／2,028 listeners，在 `Runtime.discardConsoleEntries` 加兩次 GC 後都未減少。因此 **DevTools console 是快照中的 edge 名稱，不能據此聲稱遊戲 console.log 或 console buffer 是原因**；此跨 session 清除也未證明釋放了 Playwright 所持有的 remote handles。

唯讀檢視本機套件提供更精確的實作連結，節錄與檔案 SHA-256 保存在 [playwright-source-evidence.json](playwright-source-evidence.json)：

| 實作位置 | 實際行為 |
| --- | --- |
| Python `_impl/_locator.py:742–750` | `Locator.wait_for()` await `Frame.wait_for_selector()`，未保留／dispose 回傳值，也未要求 `omitReturnValue` |
| Python `_impl/_frame.py:386–399` | `wait_for_selector()` 回傳 `Optional[ElementHandle]` |
| driver `coreBundle.js:23216` | 只有 `omitReturnValue` 時提早 dispose 並回傳 null；否則 visible／attached 會取得並採用 element handle |
| Python `_impl/_connection.py:202` | protocol owner 加入 connection／parent object registry，於 dispose 時移除 |
| JavaScript `coreBundle.js:58234` | JS `Locator.waitFor` 明確送 `omitReturnValue: true` |

這條本機 binding／remote-handle 路徑，與 visible 循環保留、detached 回傳 null、布林 `is_visible` 不保留 dialog、無 Vue 的最小控制與兩類 heap retaining roots 一致。報告範圍限定此環境已安裝的版本；未推論所有 Playwright 版本或 upstream 修復歷史。沒有修改 runtime 套件。

重現命令，工作目錄 `/workspace/plw-rpg`，前提為同一固定 build 已在 5193 服務：

```bash
python -B reports/playtests/20261004-deep-qa/memory-diagnosis/followup_probe.py
python -B reports/playtests/20261004-deep-qa/memory-diagnosis/retainer_probe.py
python -B reports/playtests/20261004-deep-qa/memory-diagnosis/analyze_evidence.py
```

前兩個命令實際 exit 0，run status 為 `completed_observation`；紅控制表示工具保留被重現，不能把紅控制標成「沒有 leak」。第三個命令只分析已保存 snapshot／讀取套件來源，不啟動 browser；[evidence-checks.json](evidence-checks.json) 的 **14/14 證據一致性檢查通過**。它驗證 case 次數、資產指紋、節點／事件數據及實際保留邊；不能當成產品回歸測試數。

目前可解除的是「這些 modal retained-DOM 數字已證明遊戲 source leak」的疑慮。Orchestrator 已以不使用 selector 等待的新主 soak 收集獨立資料；本 worker 沒有連線或施加 GC。前次約 1,620 秒即因 stdout BrokenPipe 中断的 run，不能計入 7,200 秒門檻或寫為 PASS；新主 soak 的完成與容量／效能驗收仍由該路線實際結果決定。

未執行項目：`page.wait_for_selector()` 後明確 `handle.dispose()` 的 intervention 對照、逐筆 CDP remote-handle release protocol trace、其他 Playwright／瀏覽器版本、長期 retained-size／dominator 追蹤，以及本診斷範圍內的兩小時測試。Orchestrator 要求完成已在執行的最小 probe 後收斂，因此沒有加做或聲稱它們通過。無 source fix、無 dependency upgrade，也無需由此訊號新增產品 regression test。

本 worker 依 Scope 做 Standards／Spec 自查與檔案內容驗證，非 Independent Audit；Git／整合驗收由 Orchestrator 擁有。

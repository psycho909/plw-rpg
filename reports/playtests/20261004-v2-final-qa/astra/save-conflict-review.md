# Hybrid 存檔衝突：診斷與窄幅修復

- Work Authority：`tickets/20261004-v2-final-qa.md`；baseline `c02b600c6f5f1533374d671b707d333c86d852d7`。
- 結論：**已確認 HIGH / P1 進度遺失 bug**。QA driver 的 persistent restore 選頁錯誤觸發多頁；產品本身沒有跨頁 writer 排他保護，正常手動開兩頁也會失去較新進度。
- 修復版本：目前 working tree，source／build hashes 見 `save-writer-build.json`。5196 僅為診斷 build；不能當作 root 尚未凍結的新正式 QA source 或兩小時 soak。

## 證據與界線

1. 既有 `hybrid-restored-tab-repro.json` 已在 04:31 獨立新 profile 正常 close/relaunch 得到 `about:blank`＋恢復的遊戲頁。舊 driver 選 `ctx.pages[0]` 並 goto，造成兩頁 ×20／×1 分歧。
2. 接手先將原 Hybrid `results.json`、`interactive.py` 保存至 `forensic-20261005-0846/`，附 SHA256 manifest；profile 原始副本保存於 `/tmp/plw-hybrid-forensic-profile-20261005-0846`。工具 session 34119 已不存在，正常程序清單亦無原 Hybrid driver／profile 瀏覽器；因此未宣稱取得 04:31 的 live pages。
3. 正常開啟上述 profile 的另一份副本，未 goto、未 seed、未執行遊戲操作，讀到空白頁＋**兩個 5195 遊戲頁**。兩頁皆 ×1，raw worldTime 70537／70539，HP73、gold102、pos7,9。見 `forensic-20261005-0846/reopened-copy-pages.json`、兩份 raw checkpoint／截圖。原 profile 本身未啟動、未修改。此項是恢復證據，並非 04:31 live page count。
4. 獨立新 profile，完全正常 UI 重現：兩頁暫停於 time480／pos7,9；A 向下移動並存檔至 time485／pos7,10；B 按存檔後 raw 回到 time480／pos7,9；新開 C 讀到舊進度。`save-conflict-repro.py` 的保全 assertion 以預期原因 exit 1。見 `save-conflict-red.json`、兩份 raw 與三張截圖。
5. 所有無人操作時段均不計 Agent playtime；舊資料與原始 failure 保留，不把這次診斷當作 Hybrid 正常遊玩補時，也不把旧source soak 當作修復版結果。

## 最小修復

- 新增 `src/services/saveWriter.ts`，使用 origin 內 `oakvale-v1:writer` Web Locks exclusive lifetime lease，`ifAvailable` 爭用失敗就停止；不以 timestamp／localStorage CAS 假裝原子鎖，不定時過期，不偷偷接管。
- `gameStore` 啟動先唯讀預覽；取得鎖後重新讀取最新 checkpoint，才可初始化紀錄、遷移保存、save、advance、act、reset、startLife、setSpeed 與 flush journal。所有寫入使用同一 writer gate；onScopeDispose 停止操作並釋放 lease。
- blocked 頁面關閉其他頁後必須重新整理，才能重新讀取最新 checkpoint 並競爭 ownership。即使原頁暫停／凍結，也不被另一頁奪走存檔權。
- 沒有 Web Locks 或 API request 拒絕時 fail closed，明確提示支援瀏覽器／安全 origin；沒有 production Node bypass。Node tests 使用顯式 fake lock manager，另測非同步 grant、拒絕、爭用、dispose。
- blocked 匯出改讀最新已保存 checkpoint／pending journal，避免把舊頁預覽當成目前進度匯出。原 owner quota failure 的記憶體進度／重試／journal 追加語義保留。
- App 沿用既有 warning、modal 與恢復按鈕。pending 顯示停用「確認中」；blocked 顯示「重新整理」；quota owner 仍為「重試存檔」。原 modal watcher 納入 asynchronous ready／opening，保留死亡／戰鬥／地下城優先順序。
- 原 Hybrid driver 保持 forensic 原貌；root 已指示新正式 source 由新 route owner／新 profile 處理。新 driver 必須先選恢復的同 origin 唯一 app 頁；不可逕將 pages[0] 空白頁 goto 為第二個 app。若恢復多 app，應明確記錄並處理，不默認成功。

## 實際驗證

- Unit RED：`save-writer-unit-red.log`，第二頁 save 應 false 卻為 true；修復後通過。blocked export 另先觀察 time480≠預期485 的 RED，再修正。
- 相關三套：store／saveService／playJournal 共 **110 tests / 3 files PASS**。
- 首次 `npm run check`：228 PASS／1 timeout（100年 lifeIntegration 6227ms 超原有5000ms），保存 `save-writer-full-check-initial.log`，無 assertion mismatch，build 因 test exit1 未執行。
- 不改 timeout／assertion，改用單 worker 減少 CPU 競爭：`npm test -- --maxWorkers=1` **229 tests / 14 files PASS**，見 `save-writer-full-serial.log`。
- 最後 pending／恢復 UI 微調後：store **30 PASS**，`npm run build` typecheck＋production build PASS，見 `save-writer-final-targeted.log`、`save-writer-final-build.log`；source hashes 可追溯。
- 最新 build 使用相同 UI-only RED repro：time485／pos7,10 保留，新 C 亦讀到正確進度，`save-conflict-green.json` PASS。
- 最新 `save-writer-browser.json` **12 checks PASS**：明確衝突提示、第二頁暫停、凍結 owner 仍排他、390px 無横向溢出、關 owner 不偷偷接管、點擊實際「重新整理」按鈕讀取完整最新 state／無離線補時、新 owner 正常移動、persistent close/reopen 完整 state 守恆、正確重用唯一恢復頁、reopened 正常操作、unsupported 不建立 save。
- mobile screenshot 已人工檢視：warning／重新整理按鈕可讀，無新 UI 結構；diagnostic Python parse 與 `git diff --check -- src` 通過。

## Review 與剩餘工作

施工者自查了 Standards（最窄 scope、無依賴／schema 變更、fail closed、沒有修改正式存檔）與 Spec（多頁不能丟進度、重載最新 state、保留 quota／journal）。獨立 review／最終 commit、凍結正式新 source、完整正式 browser regression／新兩小時 soak 由 root 整合，尚不可宣稱完成。

Web Locks 協定只保護採用此修復的頁面；舊版本已開啟的頁面不會遵守新 lease。發佈修復後應關閉舊版本遊戲頁再使用新版；本輪正式 QA 必須使用新的單 app profile。既有 Hybrid 存檔已丟失的進度沒有以人工 state 修改還原。未驗證原生 Safari／真實手機裝置，390px Chromium 僅為窄 viewport。

採用 skill：cloud-environment-onboarding:setup／cloud-environment-runtime（環境讀取）；matt-skills-curated:diagnosing-bugs／tdd；frontend-design-premium:frontend-design＋frontend-design-premium（沿用既有 docs/UI.md、docs/design/DESIGN.md 與警告元件）。沒有以 skill 新增批准流程。

## 獨立 review P2：新世界開場的復原控制

Reviewer 發現 fresh loser／unsupported 的開場不可關閉，原版 modal footer 只有 warning，世界層的重新整理按鈕被 modal 遮蔽；「起身」可點但 store 正確拒絕，形成無反應操作。以 `save-writer-opening-repro.py` 取得 **7項預期失敗／2項原有通過** 的 RED，保存 `save-writer-opening-red.json` 及三情境原始 screenshot。

窄修僅在 App 開場「起身」加 `disabled=!writerReady`，並在既有 footer warning 內復用 `recoverSave`：取得中 disabled「確認中」，blocked 顯示可用「重新整理」。不透過關閉 opening 繞過生命起始流程，也不改死亡／戰鬥 modal 優先級。

最新版再次 store **30 PASS**、typecheck/build PASS；`save-writer-opening-green.json` **9/9 PASS**，包含 fresh loser 關掉 owner 後點 footer 重新整理、獲權並正常起身；unsupported 沒有建立 save 且復原控制可達；延遲 lease grant 時起身和確認中皆停用，取得權限後起身恢復可用。390px fresh loser modal screenshot 已檢視，按鈕／warning 可讀。source/build hashes 已更新於同一 manifest，root 將於正式 source freeze 後再跑全量驗證。

非阻擋 P3：owner 衝突／unsupported 同時經既有 `saveError` persistent warning 與 `message` StatusNotice 呈現，畫面會重複顯示相同說明。控制可用性與資料安全不受影響；root 指示記錄後固定 build，不再調整文案呈現。P2 已由獨立 reviewer 關閉；本 agent 停止 source 變更，正式全量／兩小時驗證交由 root。

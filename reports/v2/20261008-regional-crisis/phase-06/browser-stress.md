# Phase6 J BrowserStress — 正式 Chromium 長跑

**Disposition: STRESS DURATION PASS; NORMAL FRESH ARC PASS; HUMAN VALIDATION DEFERRED.** 此為 script/policy-driven 探索性 QA，非人工遊玩或趣味性驗收。

## 執行與來源

- Run `20261008T013358Z-pid56003`，stress lane；正式瀏覽器執行 1207.49s，normal fresh lane 1201.08s（門檻 1200s）。新 fresh world，seed 909，未注入 world/state/debug time。run status `PASS_J_BROWSER_NORMAL_ARC`，policy controller 為「visible-world goal selection with recorded reasons」，model inference `none`。
- Frozen source HEAD `bd316cb326e5fbc20087c0154d6e3f294a5daac7`，91 source files fingerprint `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`；run 前後 source stable。production build check `npm run check` exit 0（531 tests + type/build 記錄於 `j-build-status.json`）。Requested tier GPT-6 Luna / low；backend runtime verified = false。
- 21 個 metric checkpoints；最大相鄰間隔 61.60s；涵蓋開始與結束。正式 UI policy turn 741，有可見世界觀察與非空 reason 的 turn 741。選擇分布：wait_one_day 391、move_toward_north_forest 142、inspect_local_news 118、visible_speed_x20 39、fulfill_visible_resident_request 24，其餘為準備檢查、營地行動及戰鬥。末次理由是「讀取目前可見世界與危機階段 cooldown；若無更急迫的居民／防衛需求，前進一個世界日觀察變化。」這是記錄的 script policy reason，不代表人類動機。

## 正常 fresh crisis arc

自然 fresh run 觀察到 warning → preparation → active → aftermath，afterward save/reload 驗證成功。原始 trace 的 validator 計數為 19 個 crisis-phase UI action choices（2 次戰鬥發起 + 17 次戰鬥回合），這是選擇事件數，不是成功 outcome 或貢獻數；runner 自己的較窄 `normalCrisisActionCount=4` 也只是 action taxonomy count。結果為 setback，成功檢查 aftermath save/reload：phase `cooldown`、outcome `setback`，reload invariants `{}`。Arc flag `complete=True`。四次可見 UI save/reload（3 periodic + aftermath）；延遲 300.53–328.57ms，中位數 315.43ms。

正式 run worldTime 從 509 到 745533；結局是實際 setback：readiness 79.8279、threatDemand 75.313、successChance 0.56238；monster population +4、boss progress +7.18、food −8、safety −5、prosperity −4，2 位居民受傷各 3 日。major crisis events 3 筆（warning、major contribution、resolved），全域 event count 1→150、history 1→87；現有 checkpoint 不提供聚落總人口欄位，因此不推算人口。Recovery status `not_required`。trace 有一筆 major `regional-crisis.contribution.major` 事件（event id 66，文字為「奧登成功擊退危機營地的哥布林」），以及 id 75 setback resolution。該 checkpoint trace 沒有 actor ID、crisis ID 或 contribution ledger；因此不據此判斷是 NPC 自動處理，也不把它說成 Life inventory / food-gold ledger contribution。截圖與逐步 phase trace 在 run 目錄。

## Browser、儲存與錯誤

- page / console / request / HTTP failures：0 / 0 / 0 / 0；storage errors 與 unhandled rejections：0；每 checkpoint journal pending = 0。
- IndexedDB `oakvale-play-journal` records 9 → 1135；localStorage 79,961 → 222,578 bytes；history 1 → 87；events 1 → 150。Journal 明確成長，pending queue 沒有累積。
- JS heap used 4,244,480 → 10,572,900 bytes（本 run checkpoint maximum 24,641,584）；DOM nodes 2,163 → 4,598（max 4,598）；JS listeners 445 → 922（max 935）。這些是觀測值，沒有設定記憶體門檻，不據此宣稱 leak-free。

## 獨立 controlled lanes 與限制

6 個 controlled fixture lanes 都完成，status `PASS_WITH_FIXTURES_SEPARATE`；它們與 normal fresh arc 分開。這個單一 seed 不是 multiseed 結果。此前的 selector / modal / successor-dialog 失敗（186s、339s SIGKILL、493s）均保留在既有 run 目錄，沒有用本次完成覆蓋。此結果是技術 QA，不替代人工驗收；Human `DEFERRED / NOT APPLICABLE AT THIS STAGE`。

Raw evidence: `j-browser-runs/20261008T013358Z-pid56003/j-browser-result.json`, `checkpoints.jsonl`, `normal-phase-trace.jsonl`, `operations.jsonl`。

# Phase8-F 角色路線自動化探索

## 方法與限制

Life、Adventure、Hybrid 各用獨立 fresh Chrome profile/save，分開執行要求 1,800 秒的可見 UI 路線；每 lane 實際約 1,804 秒、31 checkpoints。Chrome `153.0.8010.53`、Node `v22.14.0`、Windows x64；production build HEAD `9118454fe6520ae6a1fdb6283858ee1ead8fc5ab`，`src/` SHA-256 `23d8f619f94b1d8296eb5f6ecf34cad22f0cf71f650e1a7d271280195a42cba2`，`dist/` SHA-256 `f3749ad74cd6f221e17545e2742b9d09c476067d66422ac45735a11e2067fb02`。僅經可見按鈕／鍵盤控制，不使用狀態注入或 debug time skip。

「no progress」是相鄰畫面文字／時鐘是否改變的 runner heuristic，並依失敗原因歸為 resource、goal、UI、runner、wait；不是遊戲任務成功率。路線沒有明確的完成目標旗標，所以不把 UI 有變化直接稱為目標達成。可見路線快照中未出現死亡／繼承字樣；runner 沒有獨立的死亡／succession telemetry，故僅記為未觀察到，不能解讀為該機制不會發生。

## 各路線結果

| 路線 | Action records / 路線步數 | 主要路線步驟 | No-progress（按路線步數） | Reload |
|---|---:|---|---|---:|
| Life | 9,604 / 1,532 | 採集 384、交易 382、休息 192、等待 1 日 192、地方消息 190、收割 140、播種 52 | 241：resource 63、goal 109、UI 69（15.7%） | 5 次 state parity 相等；2 次 reload 顯示預期的戰鬥恢復視窗 |
| Adventure | 7,432 / 1,361 | 休息 397、檢視物品 396、尋找怪物 326、等待 1 日 171、戰鬥攻擊 71 | 507：goal 389、resource 118（37.3%） | 5 次；全部相等 |
| Hybrid | 7,456 / 1,289 | 休息 280、檢視物品 214、尋找怪物 151、等待 1 日 129、交易 129、採集 129、播種 66（其餘為路線子步驟） | 274：goal 274（21.3%） | 5 次；全部相等 |

所有 lane 的 closeout 都記錄 0 個 page exception、console error、failed request 或 HTTP 4xx/5xx。no-progress 次數是依各 lane 的 route-step records 計算；其他 action records 包含每次可見按鈕、鍵盤與結果紀錄，兩種計數不可混為一談。

Life 的兩次 reload 檢查時間為 `2026-10-15T05:43:06.247Z` 與 `2026-10-15T05:48:06.701Z`。reload 前 `state.combat` 已 active，畫面提示「返回戰鬥 繼續」，戰鬥視窗本身關閉；reload 後應用程式重新開啟該 active battle window。兩次比較只有 `dialog` 欄位由空值變為哥布林酋長戰鬥視窗，其餘被比較的世界／角色欄位均相等。這是預期的 resume-combat UI 行為與觀察紀錄，不是存檔／reload state defect。

另有 F-F1 runner defect：`2026-10-15T05:41:46.881Z` Life route 首次進入哥布林酋長戰鬥；action trace 沒有記錄對戰鬥按鈕的明確 click。`browser-suite.mjs` 的 `clickText` 先以按鈕文字找元素，再將元素中心座標送入 CDP mouse click；Life 步驟「生活路線開啟森林」是在 place window 已開啟後，文字匹配到 context prompt `北方森林 互動`，座標可能穿過 prompt/window overlay 點到上層「挑戰哥布林酋長」。這是 runner 最可能的原因，不是產品強制開戰證據。因此 Life lane 的「無戰鬥」觀察自 `05:41:46.881Z` 起無效，不得作為結果；也不得把這次遭遇歸因成產品行為。未來 runner 應以可見且 topmost 的元素事件（例如 `element.click()`）操作，或先檢查 `elementFromPoint(x,y)` 確認命中元素就是目標按鈕。

## Phase7 對照

Phase7 的 Life／Adventure／Hybrid 報告將既有 mixed heuristic 分別標示為「未建立」：混合路線曾有 840 actions、289 waits、247 no-progress，不能證明角色路線掌握度。本次把三種策略真正分開執行並記錄各自的步驟與 no-progress reason class，改善可觀測性；仍然是 scripted exploration，沒有真人可玩性、路線效益或 Fun Gate 結論。

原始資料：`f-browser/attempt-20261015T052301581Z-role-life/`、`attempt-20261015T055353925Z-role-adventure/`、`attempt-20261015T062609140Z-role-hybrid/`，各含 `manifest.json`、`actions.ndjson`、`action-trace.ndjson`、`checkpoint-trace.ndjson`、`checkpoints.json`、`closeout.json`。Hybrid 初次啟動 timeout 的 `attempt-20261015T062432278Z-role-hybrid/` 保留但排除；將 game-shell readiness timeout 延至 60 秒後，以新 profile 成功重跑。

# Codex Worker 指派指南（Herdr）

主 Agent（Lead）負責拆解、指派、審核、整合、commit 與 push；Codex worker 只做被指派的單一工作單位。派給 Codex 時一律透過 Herdr 啟動獨立、具名的 Codex worker，不用背景 `codex exec`。角色、Scope 與驗收原則仍以 [Subagent 規則](../SUBAGENTS.md) 與 [Agent Routing & Naming Rules](agent-routing.md) 為準；本文件只定義 Codex worker 的模型選擇與 Herdr 操作。

## 1. 模型選擇（Owner 2026-10-16 指示）

| 模型 | 建議用途 | Codex 參數 |
|---|---|---|
| Luna Medium | 一般 HTML／SCSS／JS 實作 | `-m gpt-6-luna -c model_reasoning_effort=medium` |
| Luna High | Medium 無法解決的中高難度問題 | `-m gpt-6-luna -c model_reasoning_effort=high` |
| Luna Max | 特殊高推理任務、獨立 Code Review | `-m gpt-6-luna -c model_reasoning_effort=max` |
| GPT-6.1 Sol Medium | 複雜工程問題、重大邏輯錯誤、反覆失敗的任務 | `-m gpt-6.1-sol -c model_reasoning_effort=medium` |

- 每個 worker 另加 `-c windows.sandbox=unelevated`（原因見 §3）。
- 一律明確傳入 `-m` 與 effort；不依賴 `~/.codex/config.toml` 的預設值（目前為 Sol／max）。
- 依任務直接選最低且可靠足夠的模型，可跳級；同一根因失敗後依上表升級，不重複相同失敗的嘗試。
- 獨立 Code Review 使用未參與施工的 Luna Max worker。

## 2. 命名與 Sandbox

- Worker 名稱為「模型＋effort＋任務」：`<luna|sol>-<medium|high|max>-<task>`（Owner 2026-10-16 指示），例如 `luna-medium-header-ui`、`luna-high-journal-fix`、`luna-max-p10r-review`、`sol-medium-save-bug`。任務以 1–2 個英文短詞描述，全名符合 Herdr 規則 `[a-z][a-z0-9_-]{0,31}`（最長 32 字元）且同時存活時唯一。
- Dispatch 檔名與 worker 名稱一致：`.scratch/<task>/dispatch-<worker 名稱>.md`。
- Reviewer／explorer：`-s read-only`，結果以最後訊息回報。
- Engineer／fixer：`-s workspace-write`，只可修改 dispatch 指定的檔案；不 commit、不 push。

## 3. 啟動

Lead 須在 Herdr pane 內（`HERDR_ENV=1`）；否則停止並回報。

```powershell
herdr pane layout --pane $env:HERDR_PANE_ID          # 寬 pane 往右切，窄／高 pane 往下切
$id = (herdr pane split --current --direction right --cwd "$PWD" --no-focus | ConvertFrom-Json).result.pane.pane_id
herdr agent start luna-max-p10r-review --kind codex --pane $id -- -m gpt-6-luna -c model_reasoning_effort=max -c windows.sandbox=unelevated -s read-only
```

`-c windows.sandbox=unelevated` 為必要參數：全域設定的 elevated sandbox 每次執行命令都要更新 `node_repl.exe` 的 ACL，而 Codex 桌面版與 app-server daemon 執行中會鎖住該檔（os error 32），導致 worker 所有命令回報 `setup refresh had errors`（2026-10-16 實測；診斷見 `~/.codex/.sandbox/sandbox.<date>.log`）。

啟動被確認畫面擋住（`agent_not_ready`／`blocked`）時，先用 `herdr agent read <name> --source detection` 看畫面再處理：

| 畫面 | 處理 |
|---|---|
| Codex 版本更新 | Skip（升級須 Owner 同意） |
| Folder trust（本 repo） | Trust and continue（`d:\codex\plw-rpg` 已信任） |
| Hooks trust | Continue without trusting |
| 其他 approval／問題 | 停止並詢問 Owner |

處理後 `herdr agent wait <name> --until idle --timeout 30000`。

## 4. 指派內容

Prompt 指向 `.scratch/<task>/dispatch-<name>.md`，不把長規格塞進命令列。Worker 會載入 AGENTS.md 而可能誤當主 Agent 再委派，因此 dispatch 開頭須寫明「你就是被指派的 `<name>` worker，親自執行，不得委派、不得使用 herdr」。Dispatch 檔必須包含：

- Ticket、目標與 Acceptance；已確認的契約與參考檔。
- 單一 owner 的可修改檔案清單；禁止事項（不 commit／push、不改 schema／數值等）。
- 驗證命令（定向測試、`npx.cmd vue-tsc --noEmit`）；完整 `npm.cmd run check` 由 Lead 執行。
- 輸出：施工者寫 `<evidence 目錄>/<name>-summary.md`（修改、RED／GREEN、風險）；reviewer 在最後訊息回報 verdict 與依嚴重度排序的 findings（file:line、失敗情境、建議）。

```powershell
herdr agent prompt luna-max-p10r-review "Read .scratch/<task>/dispatch-luna-max-p10r-review.md and do exactly that." --wait
```

長任務以背景執行 `--wait`，不輪詢。互相獨立且寫入範圍不重疊時才平行開多個 worker。

## 5. 收件與驗收

1. `herdr agent read <name> --source recent-unwrapped --lines 200` 讀結果；讀不全時請 worker 把結果寫成 Markdown 檔並只回傳路徑。
2. Lead 檢查實際 diff 與證據，執行完整驗證；worker 回報不等於通過。
3. 接受後由 Lead 更新 Ticket Evidence、commit、push。
4. Worker 任務完成且後續不再使用時立即 `herdr pane close <pane_id>` 關閉（Owner 2026-10-16 指示），不保留閒置 worker；修正後需要複審時，可保留同一獨立 reviewer 到複審結束。只關閉自己建立的 pane，不關閉非自己建立的 pane、tab、workspace。

`blocked`、timeout 或 stalled 時先 `herdr agent get`／`agent read` 判斷，不盲目重送 prompt。

完成條件：每個 worker 有明確模型／effort、單一 owner Scope 與 dispatch 檔；結果經 Lead 驗證後才寫入 Ticket 並 commit。

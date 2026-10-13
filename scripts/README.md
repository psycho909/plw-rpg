# 本機遊玩測試紀錄

`recorded_reports.py` 在每次發布文字／JSON 報告前，先以追加模式保存同目錄的 `playlog.jsonl`，flush／fsync 成功後原子更新可讀報告。每行保存時間、產生者、檔名、完整 UTF-8 內容（zlib-base64）及內容 checksum。鎖定使用 Linux／macOS 的 `fcntl` 與 Windows 的 `msvcrt` 標準函式庫；本輪在 Linux 實測，Windows 分支以 mock 驗證取得／釋放同一個 byte，尚未在 Windows 實機驗證。沒有編輯或刪除紀錄的命令；目前不處理外部檔案修改／刪除，也沒有伺服器。

以下重現命令使用本次雲端 Linux 的 Python 3；瀏覽器 harness 使用現有 Playwright 與 `/usr/bin/chromium`。Windows 需另外提供 Python 3 啟動器與 Chromium，本輪未作 Windows harness 實機驗收。遊戲本身不依賴 Python。

Python harness 使用：

```python
from scripts.recorded_reports import write_recorded
write_recorded(output / "results.json", json.dumps(result, ensure_ascii=False), producer="browser")
```

Node harness 呼叫本機 Python CLI，將文字透過 stdin 傳入。以下命令在 repo root 執行，不呼叫外部服務：

```bash
python3 -B -m unittest discover -s scripts -p 'test_*.py'
python3 -B scripts/recorded_reports.py publish reports/playtests/example/results.json < /tmp/result.json
python3 -B scripts/recorded_reports.py capture reports/playtests/example/results.json
```

`validate_content_batch.mjs` 在解析 pack 前，先於報告目錄的 `.qa-runs/<timestamp-uuid>/` 寫入原始 pack bytes、`src/data/content` 下的 TypeScript authoring modules，以及 validator、runner、baseline、publisher、lockfile、TypeScript 設定和 runner 設定輸入。每次執行使用新的目錄並以 exclusive-create 寫檔；`manifest.json` 記錄輸入與來源雜湊、source fingerprint、實際 Git HEAD／branch，以及 Node 版本／平台／架構，並清楚說明來源快照不證明它產生了已提供的 pack。`outcome.json`、每個 child check 的 stdout／stderr／exit status 在 malformed JSON、validation errors 或 child failure 時仍會寫入；不能建立證據檔案時命令失敗。可讀報告仍透過 `recorded_reports.py publish` 追加版本後更新。

Child check 的 PASS 取決於實際 process exit/error/signal，不依賴輸出文字。Run report 分列 content validation 狀態與整體 validator／child-check 結果；publisher 失敗另存狀態、stdout 和 stderr。Run report 將目前 HEAD 與 source fingerprint 和歷史 Phase 7-B contract anchor 分開呈現；controlled witness 會包含實際 settlement stage。Node file writes 使用 `flush: true`；這不證明目錄項目已同步，也不構成完整的斷電耐久保證。本機快照不是防篡改儲存，也不宣稱來源與輸入間未驗證的生成關係。

原生 Node 腳本測試獨立執行：

```bash
node --test scripts/test_validate_content_batch.mjs
```

`published` 是這次發布自動追加的版本；`initial-capture` 只表示封存時的既有檔案，不能證明更早的版本曾自動記錄。2026-10-03 完整測試的五條主要 harness 已接上 writer；原本完成的結果以初始封存保留，本次單機瀏覽器驗證從執行開始逐 checkpoint 追加。

讀取完整版本：

```python
import json
from pathlib import Path
from scripts.recorded_reports import decode_record
for line in Path("reports/playtests/20261003-local-autosave/playlog.jsonl").read_text(encoding="utf-8").splitlines():
    record = json.loads(line)
    content = decode_record(record)  # 驗證 byte count／checksum，回傳完整原文
```

成功判準：版本只追加，舊版本仍可讀回；封存失敗時不覆蓋原報告；內容損壞時 decode 拒絕。遊戲的瀏覽器 IndexedDB 保存與本工具分開驗證，見 [單機紀錄 Ticket](../tickets/20261003-local-autosave-journal.md)。

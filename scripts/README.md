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

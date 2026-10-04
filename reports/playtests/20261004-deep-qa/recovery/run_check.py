"""Capture exact commands and source hashes through the append-only report writer."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

label, *command = sys.argv[1:]
if not label or not command or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for c in label):
    raise SystemExit("Usage: run_check.py safe-label command [arguments...]")
files = ["src/stores/gameStore.ts", "src/stores/gameStore.test.ts", "src/App.vue"]
result = {"command": command, "cwd": str(ROOT), "startedAt": datetime.now(timezone.utc).isoformat(),
          "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
          "sourceHashes": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in files}}
run = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
result.update(exitCode=run.returncode, finishedAt=datetime.now(timezone.utc).isoformat(), log=f"{label}.log")
write_recorded(OUT / f"{label}.log", run.stdout, producer="astra-recovery-check")
write_recorded(OUT / f"{label}.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="astra-recovery-check")
print(run.stdout, end="")
print(json.dumps(result, ensure_ascii=False))
raise SystemExit(run.returncode)

"""Run the requested baseline gates and archive their exact outputs."""
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded


def publish(name, content, producer="v2x-baseline-runner"):
    write_recorded(OUT / name, content, producer=producer)


def version(command):
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    return {"command": command, "exitCode": result.returncode,
            "stdout": result.stdout.strip(), "stderr": result.stderr.strip()}


tracked_changes_before = [
    "M TODO.md",
    "?? docs/specs/V2X-REWARD-RETENTION.md",
    "?? reports/v2/20261006-reward-core/",
    "?? tickets/20261006-v2x-00-baseline.md",
    "?? tickets/20261006-v2x-01-data-model.md",
    "?? tickets/20261006-v2x-02-equipment-slice.md",
    "?? tickets/20261006-v2x-03-monster-slice.md",
]
source_hashes = {}
for source in sorted((ROOT / "src").rglob("*")):
    if source.is_file():
        source_hashes[str(source.relative_to(ROOT))] = hashlib.sha256(source.read_bytes()).hexdigest()
meta = {
    "branch": subprocess.run(["git", "branch", "--show-current"], cwd=ROOT,
                              text=True, capture_output=True, check=True).stdout.strip(),
    "sourceCommit": subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT,
                                    text=True, capture_output=True, check=True).stdout.strip(),
    "initialWorkingTreeStatusBeforeRunner": tracked_changes_before,
    "node": version(["node", "--version"]),
    "npm": version(["npm", "--version"]),
    "python": version(["python3", "--version"]),
    "chromium": version(["/usr/bin/chromium", "--version"]),
    "platform": platform.platform(),
    "machine": platform.machine(),
    "playwright": "python package installed; browser version recorded by browser run",
    "sourceSha256": source_hashes,
}
publish("environment.json", json.dumps(meta, ensure_ascii=False, indent=2))

commands = [
    ("test", ["npm", "run", "test", "--", "--maxWorkers=1"]),
    ("build", ["npm", "run", "build"]),
]
statuses = []
for label, command in commands:
    print("START", label, "::", " ".join(command), flush=True)
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    publish(f"{label}-stdout.txt", result.stdout, producer=f"v2x-baseline-{label}")
    publish(f"{label}-stderr.txt", result.stderr, producer=f"v2x-baseline-{label}")
    status = {"label": label, "command": command, "exitCode": result.returncode,
              "stdoutBytes": len(result.stdout.encode()), "stderrBytes": len(result.stderr.encode()),
              "stdoutTail": result.stdout[-12000:], "stderrTail": result.stderr[-12000:]}
    statuses.append(status)
    publish(f"{label}-status.json", json.dumps(status, ensure_ascii=False, indent=2),
            producer=f"v2x-baseline-{label}")
    print("DONE", label, "exit", result.returncode,
          "stdout bytes", status["stdoutBytes"], "stderr bytes", status["stderrBytes"], flush=True)
    if result.returncode:
        print(result.stdout[-5000:], file=sys.stdout, flush=True)
        print(result.stderr[-5000:], file=sys.stderr, flush=True)
    # The build still runs even if the test suite fails, preserving both gate results.
publish("gates-status.json", json.dumps(statuses, ensure_ascii=False, indent=2))
sys.exit(1 if any(item["exitCode"] for item in statuses) else 0)

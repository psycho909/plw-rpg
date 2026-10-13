"""Run the approved merged Phase 7 authoring pack through the CLI validator."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[5]
PHASE = ROOT / "reports/v2/20261008-content-expansion/phase-07"
sys.path.insert(0, str(PHASE))
from qa_browser_support import provenance  # noqa: E402


def main() -> int:
    directory = Path(__file__).resolve().parent
    pack = PHASE / "g-integration-run/merged-validator-run/packs/seven-pack-combined.json"
    report = PHASE / "content-validation.md"
    before = provenance(ROOT, PHASE / "qa-browser-preparation/phase7-build-status.json", [])
    command = ["npm", "run", "validate:content", "--", "--pack", str(pack.relative_to(ROOT)), "--report", str(report.relative_to(ROOT))]
    started = datetime.now(timezone.utc)
    began = time.monotonic()
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    ended = datetime.now(timezone.utc)
    (directory / "stdout.txt").write_text(result.stdout, encoding="utf-8")
    (directory / "stderr.txt").write_text(result.stderr, encoding="utf-8")
    after = provenance(ROOT, PHASE / "qa-browser-preparation/phase7-build-status.json", [])
    record = {
        "schema": "phase7-content-validation-run-v1",
        "status": "PASS" if result.returncode == 0 and before["sourceFingerprint"] == after["sourceFingerprint"] else "FAIL",
        "command": command,
        "startedAtUTC": started.isoformat(),
        "endedAtUTC": ended.isoformat(),
        "durationSeconds": round(time.monotonic() - began, 3),
        "exitCode": result.returncode,
        "head": before["head"],
        "sourceFingerprintBefore": before["sourceFingerprint"],
        "sourceFingerprintAfter": after["sourceFingerprint"],
        "sourceStable": before["sourceFingerprint"] == after["sourceFingerprint"],
        "packPath": str(pack.relative_to(ROOT)),
        "reportPath": str(report.relative_to(ROOT)),
        "stdoutPath": "stdout.txt",
        "stderrPath": "stderr.txt",
    }
    (directory / "result.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, ensure_ascii=False, indent=2))
    return 0 if record["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

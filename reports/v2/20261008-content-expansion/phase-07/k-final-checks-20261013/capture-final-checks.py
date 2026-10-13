"""Run and retain the final whole-repository and content validation commands."""
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


def run(name: str, command: list[str], directory: Path) -> dict[str, object]:
    started = datetime.now(timezone.utc)
    began = time.monotonic()
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    ended = datetime.now(timezone.utc)
    (directory / f"{name}.stdout.txt").write_text(result.stdout, encoding="utf-8")
    (directory / f"{name}.stderr.txt").write_text(result.stderr, encoding="utf-8")
    return {
        "command": command,
        "startedAtUTC": started.isoformat(),
        "endedAtUTC": ended.isoformat(),
        "durationSeconds": round(time.monotonic() - began, 3),
        "exitCode": result.returncode,
        "stdoutPath": f"{name}.stdout.txt",
        "stderrPath": f"{name}.stderr.txt",
    }


def main() -> int:
    directory = Path(__file__).resolve().parent
    build_path = PHASE / "qa-browser-preparation/phase7-build-status.json"
    before = provenance(ROOT, build_path, [])
    checks = {
        "schema": "phase7-final-checks-v1",
        "status": "RUNNING",
        "startedAtUTC": datetime.now(timezone.utc).isoformat(),
        "head": before["head"],
        "sourceFingerprintBefore": before["sourceFingerprint"],
        "distFingerprintBefore": before["distFingerprint"],
        "commands": {},
    }
    checks["commands"]["npm-run-check"] = run("npm-run-check", ["npm", "run", "check"], directory)
    checks["commands"]["npm-run-validate-content"] = run("npm-run-validate-content", ["npm", "run", "validate:content"], directory)
    after = provenance(ROOT, build_path, [])
    checks.update({
        "endedAtUTC": datetime.now(timezone.utc).isoformat(),
        "sourceFingerprintAfter": after["sourceFingerprint"],
        "distFingerprintAfter": after["distFingerprint"],
        "sourceStable": before["sourceFingerprint"] == after["sourceFingerprint"],
        "distStable": before["distFingerprint"] == after["distFingerprint"],
    })
    codes = [item["exitCode"] for item in checks["commands"].values()]
    checks["status"] = "PASS" if codes == [0, 0] and checks["sourceStable"] and checks["distStable"] else "FAIL"
    (directory / "result.json").write_text(json.dumps(checks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(checks, ensure_ascii=False, indent=2))
    return 0 if checks["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

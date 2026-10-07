"""Root-released Phase 5 J full check with reproducible provenance evidence.

Prepared only by default. Run with --go after Root's UI freeze and release.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
PHASE = Path(__file__).resolve().parent
RUNS = PHASE / "j-full-check-runs"
BUILD_STATUS_PATH = PHASE / "build-status.json"
CHECK_STATUS_PATH = PHASE / "j-full-check-status.json"
ATTRIBUTION = {
    "requestedAgent": "g6_luna_low_phase5_qa_runner",
    "requestedModel": "gpt-6-luna",
    "requestedEffort": "low",
    "backendRuntimeVerified": False,
}
OWNED_FILES = (
    "reports/v2/20261007-life-craftsmanship/phase-05/phase05_j_full_check.py",
    "scripts/recorded_reports.py",
)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def capture_inputs(support: Any) -> dict[str, str]:
    return {
        name: support.sha_file(ROOT / name)
        for name in support.BUILD_INPUTS
        if (ROOT / name).is_file()
    }


def capture_owned(support: Any) -> dict[str, str]:
    return {
        name: support.sha_file(ROOT / name)
        for name in OWNED_FILES
        if (ROOT / name).is_file()
    }


def capture_snapshot(support: Any) -> dict[str, Any]:
    sources = support.file_map(ROOT, "src")
    inputs = capture_inputs(support)
    owned = capture_owned(support)
    dist = support.file_map(ROOT, "dist")
    return {
        "head": support.git_head(ROOT),
        "sourceSha256": sources,
        "sourceFingerprint": support.mapping_fingerprint(sources),
        "sourceFileCount": len(sources),
        "buildInputs": inputs,
        "buildInputsFingerprint": support.mapping_fingerprint(inputs),
        "ownedFilesSha256": owned,
        "ownedFilesFingerprint": support.mapping_fingerprint(owned),
        "distSha256": dist,
        "distFingerprint": support.mapping_fingerprint(dist),
    }


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="run only after Root releases the frozen UI")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: wait for Root's UI freeze/release, then pass --go")
        return 0

    # Import the shared Phase 5 fingerprint contract by its script directory.
    sys.path.insert(0, str(PHASE))
    import phase05_browser_support as support

    npm = shutil.which("npm")
    if npm is None:
        raise RuntimeError("npm is unavailable in PATH; full check was not started")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    run_dir = RUNS / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    stdout_path = run_dir / "stdout.log"
    stderr_path = run_dir / "stderr.log"
    before = capture_snapshot(support)
    write_json(run_dir / "source-before.json", before)
    started = now_utc()
    command = [npm, "run", "check"]
    environment = {
        "python": sys.version,
        "pythonExecutable": sys.executable,
        "nodeVersion": subprocess.run([shutil.which("node") or "node", "--version"], cwd=ROOT,
                                       text=True, capture_output=True, check=False).stdout.strip(),
        "npmVersion": subprocess.run([npm, "--version"], cwd=ROOT, text=True,
                                     capture_output=True, check=False).stdout.strip(),
    }
    with stdout_path.open("wb") as stdout, stderr_path.open("wb") as stderr:
        completed = subprocess.run(command, cwd=ROOT, stdout=stdout, stderr=stderr, check=False)
    ended = now_utc()
    after = capture_snapshot(support)
    write_json(run_dir / "source-after.json", after)
    write_json(run_dir / "environment.json", environment)
    (run_dir / "exit-code.txt").write_text(f"{completed.returncode}\n", encoding="utf-8")
    (run_dir / "start-utc.txt").write_text(started + "\n", encoding="utf-8")
    (run_dir / "end-utc.txt").write_text(ended + "\n", encoding="utf-8")

    source_stable = before["sourceSha256"] == after["sourceSha256"]
    inputs_stable = before["buildInputs"] == after["buildInputs"]
    owned_stable = before["ownedFilesSha256"] == after["ownedFilesSha256"]
    head_stable = before["head"] == after["head"]
    stable = source_stable and inputs_stable and owned_stable and head_stable
    passed = completed.returncode == 0 and stable
    status = "PASS" if passed else ("INVALIDATED" if completed.returncode == 0 else "FAIL")

    check_report = {
        "phase": "Phase5-J frozen full regression, typecheck, and production build",
        "runId": run_id,
        "status": status,
        "exitCode": completed.returncode,
        "startUTC": started,
        "endUTC": ended,
        "headBefore": before["head"],
        "headAfter": after["head"],
        "sourceFileCountBefore": before["sourceFileCount"],
        "sourceFileCountAfter": after["sourceFileCount"],
        "sourceMapBefore": before["sourceSha256"],
        "sourceMapAfter": after["sourceSha256"],
        "sourceFingerprintBefore": before["sourceFingerprint"],
        "sourceFingerprintAfter": after["sourceFingerprint"],
        "sourceStableDuringRun": source_stable,
        "buildInputsBefore": before["buildInputs"],
        "buildInputsAfter": after["buildInputs"],
        "buildInputsStableDuringRun": inputs_stable,
        "ownedFilesBefore": before["ownedFilesSha256"],
        "ownedFilesAfter": after["ownedFilesSha256"],
        "ownedFilesStableDuringRun": owned_stable,
        "headStableDuringRun": head_stable,
        "distBefore": before["distSha256"],
        "distAfter": after["distSha256"],
        "distFingerprintAfter": after["distFingerprint"],
        "environment": environment,
        "runner": ATTRIBUTION,
        "command": command,
        "rawStdout": str(stdout_path.relative_to(PHASE)),
        "rawStderr": str(stderr_path.relative_to(PHASE)),
        "rawExitCode": str((run_dir / "exit-code.txt").relative_to(PHASE)),
        "buildStatusPublished": False,
    }

    # This is the only build-status projection accepted by browser support.
    # Preserve any older value unless this exact run built a stable current dist.
    if passed:
        (run_dir / "build-status.json").write_text(
            json.dumps({
                "phase": check_report["phase"],
                "runId": run_id,
                "runDirectory": str(run_dir),
                "command": command,
                "startedAtUTC": started,
                "finishedAtUTC": ended,
                "exitCode": completed.returncode,
                "headBefore": before["head"],
                "headAfter": after["head"],
                "sourceSha256": after["sourceSha256"],
                "sourceSha256After": after["sourceSha256"],
                "sourceFileCount": after["sourceFileCount"],
                "sourceStableDuringRun": source_stable,
                "buildInputs": after["buildInputs"],
                "buildInputsStableDuringRun": inputs_stable,
                "harnessSha256": after["ownedFilesSha256"],
                "harnessStableDuringRun": owned_stable,
                "distSha256": after["distSha256"],
                "distFileCount": len(after["distSha256"]),
                "distIndexSha256": after["distSha256"].get("dist/index.html"),
                "stdoutPath": str(stdout_path),
                "stderrPath": str(stderr_path),
            }, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        support.publish_recorded(ROOT, BUILD_STATUS_PATH, json.loads((run_dir / "build-status.json").read_text()),
                                 producer="g6_luna_low_phase5_qa_runner")
        check_report["buildStatusPublished"] = True

    support.publish_recorded(ROOT, CHECK_STATUS_PATH, check_report,
                             producer="g6_luna_low_phase5_qa_runner")
    print(f"{status}: npm run check exit={completed.returncode}; run={run_dir}")
    return completed.returncode if completed.returncode else (0 if passed else 2)


if __name__ == "__main__":
    raise SystemExit(main())

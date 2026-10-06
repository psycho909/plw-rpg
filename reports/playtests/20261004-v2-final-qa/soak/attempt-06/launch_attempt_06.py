#!/usr/bin/env python3
"""Launch attempt 06 detached from the agent terminal with durable combined output."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))
SOAK = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
HARNESS = OUT / "harness.py"
MANIFEST_PATH = SOAK.parent / "build-manifest.json"
BUILD = Path("/tmp/oakvale-v2-final-441e3c2-dist")
URL = "http://127.0.0.1:5197"
SOURCE = "441e3c2b435f199a50cb78ee5b19521bcc084593"
BASELINE = "c02b600c6f5f1533374d671b707d333c86d852d7"
START_TOKEN = f"START {SOURCE}"
LOG = OUT / "harness.stdout.log"
LOCK = OUT / "attempt-06-launch.lock"
LAUNCH_REPORT = OUT / "launcher.json"
SOAK_ENV = {
    "PLW_SOAK_URL": URL,
    "PLW_SOAK_BASELINE": BASELINE,
    "PLW_SOAK_BUILD": str(BUILD),
    "PLW_SOAK_TARGET_SECONDS": "7200",
    "PLW_SOAK_OUT": str(OUT),
    "PLW_SOAK_SOURCE_LABEL": SOURCE,
    "PLW_SOAK_SOURCE_STATUS": "frozen post-Web-Locks source; final browser QA",
    "PLW_SOAK_MANIFEST": str(MANIFEST_PATH),
}
RUN_ARTIFACTS = (
    "attempt-06-launch.lock", "launcher.json", "harness.stdout.log", "results.json",
    "checkpoints.json", "raw_profiles.jsonl", "oakvale-play-records.json",
    "start.png", "hour-1.png", "end.png",
)


def sha256_bytes(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def verify_runtime() -> tuple[dict, dict]:
    manifest_body = MANIFEST_PATH.read_bytes()
    manifest = json.loads(manifest_body)
    if manifest.get("sourceCommit") != SOURCE:
        raise RuntimeError(f"unexpected sourceCommit: {manifest.get('sourceCommit')!r}")
    if str(manifest.get("url", "")).rstrip("/") != URL:
        raise RuntimeError(f"unexpected runtime URL: {manifest.get('url')!r}")
    if Path(manifest.get("immutableDist", "")) != BUILD:
        raise RuntimeError(f"unexpected immutable build path: {manifest.get('immutableDist')!r}")
    expected = manifest.get("assetsSha256")
    if not isinstance(expected, dict) or not expected:
        raise RuntimeError("build manifest has no assetsSha256 map")
    actual = {}
    served = {}
    for name, digest in expected.items():
        path = BUILD / ("index.html" if name in ("index.html", "/") else name.lstrip("/"))
        local_hash = sha256_bytes(path.read_bytes())
        if local_hash != digest:
            raise RuntimeError(f"immutable build asset mismatch: {name}")
        request_path = "/" if name in ("index.html", "/") else "/" + name.lstrip("/")
        with urlopen(URL + request_path, timeout=12) as response:
            if response.status != 200:
                raise RuntimeError(f"served asset returned HTTP {response.status}: {request_path}")
            served_hash = sha256_bytes(response.read())
        if served_hash != digest:
            raise RuntimeError(f"served asset mismatch: {name}")
        actual[name] = local_hash
        served[name] = served_hash
    return manifest, {
        "sourceCommit": SOURCE,
        "url": URL,
        "immutableDist": str(BUILD),
        "manifestSha256": sha256_bytes(manifest_body),
        "buildAssetsMatch": actual == expected,
        "servedAssetsMatch": served == expected,
        "assetsSha256": served,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-token", required=True,
                        help="must equal START followed by the frozen app source SHA")
    args = parser.parse_args()
    if args.start_token != START_TOKEN:
        raise SystemExit(f"refusing start: exact token required: {START_TOKEN}")
    if Path.cwd().resolve() != ROOT:
        raise SystemExit(f"run from repository root: {ROOT}")
    if OUT.name != "attempt-06":
        raise SystemExit(f"refusing output directory: {OUT}")
    if not HARNESS.is_file() or not MANIFEST_PATH.is_file():
        raise SystemExit("attempt-06 harness or build manifest is missing")
    manifest, runtime = verify_runtime()
    preflight_path = OUT / "preflight.json"
    if not preflight_path.is_file():
        raise SystemExit("attempt-06 preflight.json is missing; run preflight.py first")
    preflight = json.loads(preflight_path.read_text(encoding="utf-8"))
    if preflight.get("status") != "passed":
        raise SystemExit(f"attempt-06 preflight did not pass: {preflight.get('status')!r}")
    for name in RUN_ARTIFACTS:
        if (OUT / name).exists():
            raise SystemExit(f"refusing to reuse attempt-06 output: {OUT / name}")
    # Create a durable one-shot lock before spawning. A second invocation cannot
    # truncate the log or reset report files if the terminal disappears.
    lock_fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(lock_fd, "w", encoding="utf-8") as lock_file:
        lock_file.write(json.dumps({"createdAtUtc": datetime.now(timezone.utc).isoformat(),
                                    "launcherPid": os.getpid(), "attempt": "attempt-06"}) + "\n")
        lock_file.flush()
        os.fsync(lock_file.fileno())

    child_env = os.environ.copy()
    child_env.update(SOAK_ENV)
    argv = [sys.executable, str(HARNESS)]
    try:
        with LOG.open("xb", buffering=0) as log_file:
            process = subprocess.Popen(
                argv,
                cwd=ROOT,
                env=child_env,
                stdin=subprocess.DEVNULL,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                close_fds=True,
            )
    except BaseException as exc:
        body = {
            "attempt": "attempt-06", "status": "launch_failed",
            "createdAtUtc": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "error": f"{type(exc).__name__}: {exc}", "runtimeVerification": runtime,
            "sourceCommit": manifest.get("sourceCommit"), "harness": str(HARNESS),
            "log": str(LOG), "environment": SOAK_ENV,
        }
        from scripts.recorded_reports import write_recorded
        write_recorded(LAUNCH_REPORT, json.dumps(body, ensure_ascii=False, indent=2) + "\n", producer="soak-launcher")
        raise

    body = {
        "attempt": "attempt-06", "status": "launched",
        "createdAtUtc": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        "launcherPid": os.getpid(), "harnessPid": process.pid,
        "detachedSession": True, "startNewSession": True,
        "sourceCommit": manifest.get("sourceCommit"), "baselineCommit": BASELINE,
        "runtimeVerification": runtime,
        "harness": str(HARNESS), "harnessSha256": sha256_bytes(HARNESS.read_bytes()),
        "command": argv, "workingDirectory": str(ROOT),
        "stdin": "DEVNULL", "stdout": str(LOG), "stderr": "STDOUT",
        "targetElapsedSeconds": 7200, "environment": SOAK_ENV,
        "preflightSha256": sha256_bytes(preflight_path.read_bytes()),
        "profilePolicy": "harness creates a new unique temp profile; never reuses attempt-05",
    }
    from scripts.recorded_reports import write_recorded
    write_recorded(LAUNCH_REPORT, json.dumps(body, ensure_ascii=False, indent=2) + "\n", producer="soak-launcher")
    try:
        print(f"ATTEMPT06_LAUNCH_READY pid={process.pid} log={LOG}", flush=True)
    except BrokenPipeError:
        # The harness owns its permanent log and is detached already.
        pass


if __name__ == "__main__":
    main()

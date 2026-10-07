"""Phase 6-G focused browser launcher; starts only after Root release and matching build."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time

from g_browser_support import now_utc, provenance, publish, validate_build, verify_http_dist


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir(): return candidate
    raise RuntimeError("Cannot locate repository root")

ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261008-regional-crisis/phase-06"
LAUNCHER = Path(__file__).resolve(); DRIVER = PHASE / "g_browser_runner.py"; SUPPORT = PHASE / "g_browser_support.py"; FIXTURE = PHASE / "g_browser_fixture_generator.py"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "g-build-status.json"))


def server_code() -> str:
    return r'''import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.split('?',1)[0] == '/favicon.ico': self.send_response(204); self.end_headers()
  else: super().do_GET()
 def do_HEAD(self):
  if self.path.split('?',1)[0] == '/favicon.ico': self.send_response(204); self.end_headers()
  else: super().do_HEAD()
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),partial(Handler,directory=sys.argv[2])).serve_forever()
'''


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true"); parser.add_argument("--mode", choices=("focused",), default="focused")
    parser.add_argument("--seconds", type=int, default=300); parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", default="low")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: pass --go after Root writes a matching g-browser-release.json"); return 0
    marker_path = PHASE / "g-browser-release.json"
    if not marker_path.is_file(): raise RuntimeError("Root g-browser-release.json is missing; no run started")
    marker = json.loads(marker_path.read_text(encoding="utf-8")); build = validate_build(ROOT, BUILD_PATH)
    own = [LAUNCHER, DRIVER, SUPPORT, FIXTURE]; before = provenance(ROOT, BUILD_PATH, own)
    if marker.get("authorized") is not True or args.mode not in marker.get("authorizedModes", []): raise RuntimeError("Root release marker does not authorize this run")
    for key in ("head", "sourceFingerprint", "buildStatusSha256", "distFingerprint", "qaFilesSha256"):
        if marker.get(key) != before.get(key): raise RuntimeError(f"Root release {key} does not match current evidence")
    for key in ("ticketSha256", "specSha256", "releaseInputSha256"):
        if not marker.get(key): raise RuntimeError(f"Root release lacks {key}")
    if not 30 <= args.seconds <= 900: parser.error("focused mode duration must be 30..900 seconds")
    RUNS = PHASE / "g-browser-runs"; RUNS.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-pid{os.getpid()}"
    run_dir = RUNS / run_id; run_dir.mkdir(exist_ok=False)
    with socket.socket() as sock: sock.bind(("127.0.0.1", 0)); port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}"; server_log = (run_dir / "server.log").open("wb")
    server = subprocess.Popen([sys.executable, "-c", server_code(), str(port), str((ROOT / "dist").resolve())], cwd=ROOT, stdout=server_log, stderr=subprocess.STDOUT)
    runner = None; code = 1; launcher = {"status": "PREFLIGHT", "runId": run_id, "mode": args.mode, "startUTC": now_utc(), "url": url,
        "sourceBefore": before, "releaseMarker": marker, "buildStatusPath": str(BUILD_PATH)}
    try:
        deadline = time.monotonic() + 30; http = None; last_error = None
        while time.monotonic() < deadline:
            if server.poll() is not None: raise RuntimeError(f"Owned production server exited: {server.returncode}")
            try: http = verify_http_dist(ROOT, url, build); break
            except BaseException as exc: last_error = exc; time.sleep(.25)
        if http is None: raise RuntimeError(f"Serving current dist failed readiness: {last_error}")
        launcher["servedAssets"] = http
        env = os.environ.copy(); env["PLW_BUILD_STATUS"] = str(BUILD_PATH)
        command = [sys.executable, str(DRIVER), "--go", "--mode", args.mode, "--seconds", str(args.seconds), "--run-id", run_id,
                   "--url", url, "--run-dir", str(run_dir), "--execution-model", args.execution_model, "--execution-effort", args.execution_effort]
        launcher["runnerCommand"] = command
        runner = subprocess.Popen(command, cwd=PHASE, env=env, stdout=(run_dir / "runner.stdout.log").open("wb"), stderr=(run_dir / "runner.stderr.log").open("wb"))
        launcher["runnerPID"] = runner.pid; launcher["status"] = "RUNNING"
        code = runner.wait(); launcher["runnerExitCode"] = code
    except BaseException as exc:
        launcher["status"] = "FAILED_LAUNCH"; launcher["error"] = f"{type(exc).__name__}: {exc}"; code = 1
    finally:
        if runner is not None and runner.poll() is None:
            runner.terminate()
            try: runner.wait(timeout=10)
            except subprocess.TimeoutExpired: runner.kill(); runner.wait(timeout=10)
        if server.poll() is None: server.terminate()
        try: launcher["serverExitCode"] = server.wait(timeout=10)
        except subprocess.TimeoutExpired: server.kill(); launcher["serverExitCode"] = server.wait(timeout=10)
        server_log.close(); launcher["endUTC"] = now_utc()
        try:
            after = provenance(ROOT, BUILD_PATH, own); launcher["sourceAfter"] = after
            launcher["sourceStableDuringRun"] = before == after
            if not launcher["sourceStableDuringRun"]: launcher["status"] = "FAILED_PROVENANCE_CHANGED"; code = 1
        except BaseException as exc: launcher["provenanceError"] = str(exc); launcher["status"] = "FAILED_PROVENANCE_CHECK"; code = 1
        launcher["launcherExitCode"] = code
        try: publish(ROOT, run_dir / "launcher-status.json", launcher, "phase6-g-browser-launcher")
        except BaseException as exc: launcher["reportPublishError"] = str(exc)
        print(json.dumps(launcher, ensure_ascii=False, indent=2), flush=True)
    return code

if __name__ == "__main__": raise SystemExit(main())

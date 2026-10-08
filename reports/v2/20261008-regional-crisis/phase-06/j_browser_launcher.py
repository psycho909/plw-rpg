"""Phase 6-J browser launcher; starts only after the authorized J task and matching build."""
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

from j_browser_support import now_utc, provenance, publish, validate_build, verify_http_dist


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir(): return candidate
    raise RuntimeError("Cannot locate repository root")

ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261008-regional-crisis/phase-06"
LAUNCHER = Path(__file__).resolve(); DRIVER = PHASE / "j_browser_runner.py"; SUPPORT = PHASE / "j_browser_support.py"; FIXTURE = PHASE / "j_fixture_generator.py"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "j-build-status.json"))
RUNS = PHASE / "j-browser-runs"


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
    parser.add_argument("--go", action="store_true"); parser.add_argument("--mode", choices=("stress", "agent-crisis", "dry"), default="dry")
    parser.add_argument("--seconds", type=int); parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", default="low")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: Phase 6-J task is authorized; pass --go with current matching production build evidence"); return 0
    limits = {"stress": (1200, 1800), "agent-crisis": (1800, 3600), "dry": (20, 120)}
    minimum, maximum = limits[args.mode]
    seconds = args.seconds if args.seconds is not None else minimum
    if not minimum <= seconds <= maximum: parser.error(f"{args.mode} duration must be {minimum}..{maximum} seconds")
    build = validate_build(ROOT, BUILD_PATH)
    own = [LAUNCHER, DRIVER, SUPPORT, FIXTURE]; before = provenance(ROOT, BUILD_PATH, own)
    RUNS.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-pid{os.getpid()}"
    run_dir = RUNS / run_id; run_dir.mkdir(exist_ok=False)
    with socket.socket() as sock: sock.bind(("127.0.0.1", 0)); port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}"; server_log = (run_dir / "server.log").open("wb")
    server = subprocess.Popen([sys.executable, "-c", server_code(), str(port), str((ROOT / "dist").resolve())], cwd=ROOT, stdout=server_log, stderr=subprocess.STDOUT)
    runner = None; code = 1; launcher = {"status": "PREFLIGHT", "runId": run_id, "mode": args.mode, "startUTC": now_utc(), "url": url,
        "sourceBefore": before, "buildStatus": build, "buildStatusPath": str(BUILD_PATH), "durationSecondsRequested": seconds,
        "authorization": "Phase 6-J explicitly released by Root; no separate marker required"}
    try:
        deadline = time.monotonic() + 30; http = None; last_error = None
        while time.monotonic() < deadline:
            if server.poll() is not None: raise RuntimeError(f"Owned production server exited: {server.returncode}")
            try: http = verify_http_dist(ROOT, url, build); break
            except BaseException as exc: last_error = exc; time.sleep(.25)
        if http is None: raise RuntimeError(f"Serving current dist failed readiness: {last_error}")
        launcher["servedAssets"] = http
        env = os.environ.copy(); env["PLW_BUILD_STATUS"] = str(BUILD_PATH)
        command = [sys.executable, str(DRIVER), "--go", "--mode", args.mode, "--seconds", str(seconds), "--run-id", run_id,
                   "--url", url, "--run-dir", str(run_dir), "--execution-model", args.execution_model, "--execution-effort", args.execution_effort]
        launcher["runnerCommand"] = command
        launcher["runnerCommand"] = command
        runner = subprocess.Popen(command, cwd=PHASE, env=env, stdout=(run_dir / "runner.stdout.log").open("wb"), stderr=(run_dir / "runner.stderr.log").open("wb"))
        launcher["runnerPID"] = runner.pid; launcher["status"] = "RUNNING"
        code = runner.wait(); launcher["runnerExitCode"] = code
        launcher["status"] = "COMPLETE" if code == 0 else "FAILED_RUN"
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

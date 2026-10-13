"""Phase 7 browser launcher. It is inert until --go and Root's frozen release manifest."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time

from qa_browser_support import now_utc, provenance, publish, sha_file, validate_build, verify_http_dist

ROOT = Path(__file__).resolve().parents[4]
PHASE = ROOT / "reports/v2/20261008-content-expansion/phase-07"
PREP = PHASE / "qa-browser-preparation"
DRIVER = PHASE / "qa_browser_runner.py"
SUPPORT = PHASE / "qa_browser_support.py"
LAUNCHER = Path(__file__).resolve()
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PREP / "phase7-build-status.json"))
RELEASE_PATH = Path(os.environ.get("PHASE7_BROWSER_RELEASE", PREP / "phase7-browser-release.json"))
RUNS = PHASE / "qa-browser-runs"
MODE_DURATION_BOUNDS = {"regression": (60, 300), "stress": (1200, 7200), "content-agent": (60, 3600)}
MODE_DEFAULT_DURATION_SECONDS = {"regression": 60, "stress": 1200, "content-agent": 3600}
RUNNER_HEARTBEAT_TIMEOUT_SECONDS = 120
RUNNER_HEARTBEAT_POLL_SECONDS = 1


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


def terminate_runner_process_tree(runner, grace_seconds: int = 10) -> dict:
    """Terminate the runner process group so its Chromium descendants are stopped too."""
    if runner.poll() is not None:
        return {"runnerExitCode": runner.returncode, "terminationSignal": "already_exited", "reapTimedOut": False}
    sent = "SIGTERM"
    try:
        if os.name == "posix":
            os.killpg(runner.pid, signal.SIGTERM)
        else:
            runner.terminate()
    except ProcessLookupError:
        pass
    except OSError:
        runner.terminate()
    try:
        return {"runnerExitCode": runner.wait(timeout=grace_seconds),
                "terminationSignal": sent, "reapTimedOut": False}
    except subprocess.TimeoutExpired:
        sent = "SIGKILL"
        try:
            if os.name == "posix":
                os.killpg(runner.pid, signal.SIGKILL)
            else:
                runner.kill()
        except ProcessLookupError:
            pass
        except OSError:
            runner.kill()
        try:
            exit_code = runner.wait(timeout=grace_seconds)
            return {"runnerExitCode": exit_code, "terminationSignal": sent, "reapTimedOut": False}
        except subprocess.TimeoutExpired:
            return {"runnerExitCode": runner.poll(), "terminationSignal": sent, "reapTimedOut": True}


def monitor_runner_process(runner, heartbeat_path: Path, timeout_seconds: int = RUNNER_HEARTBEAT_TIMEOUT_SECONDS,
                           poll_interval: int = RUNNER_HEARTBEAT_POLL_SECONDS, clock=time.monotonic,
                           sleeper=time.sleep) -> dict:
    """Wait for child exit or stop it after a stale atomic runner heartbeat."""
    started = clock()
    last_heartbeat = None
    while True:
        exit_code = runner.poll()
        if exit_code is not None:
            return {"timedOut": False, "status": "RUNNER_EXITED", "runnerExitCode": exit_code,
                    "lastHeartbeat": last_heartbeat}
        try:
            payload = json.loads(heartbeat_path.read_text(encoding="utf-8"))
            heartbeat_time = payload.get("heartbeatMonotonic")
            if payload.get("schema") == "phase7-runner-heartbeat-v1" and isinstance(heartbeat_time, (int, float)):
                last_heartbeat = payload
        except (OSError, ValueError, TypeError):
            pass
        now = clock()
        last_time = last_heartbeat.get("heartbeatMonotonic", started) if last_heartbeat else started
        age = max(0.0, now - last_time)
        if age >= timeout_seconds:
            termination = terminate_runner_process_tree(runner)
            return {"timedOut": True, "status": "STALE_HEARTBEAT_TIMEOUT",
                    "timeoutSeconds": timeout_seconds, "heartbeatAgeSeconds": round(age, 2),
                    "lastHeartbeat": last_heartbeat, "lastHeartbeatStage":
                        last_heartbeat.get("stage") if last_heartbeat else "no_heartbeat_received",
                    "lastHeartbeatTurn": last_heartbeat.get("turn") if last_heartbeat else None,
                    "detectedUTC": datetime.now(timezone.utc).isoformat(), **termination}
        sleeper(min(poll_interval, max(0.01, timeout_seconds - age)))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="Start only after Root records Phase 7 release/freeze")
    parser.add_argument("--mode", choices=("regression", "stress", "content-agent"), default="regression")
    parser.add_argument("--seconds", type=int)
    parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", default="low")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: no server or browser launched. Root release + frozen production build are required before --go.")
        return 0
    if not RELEASE_PATH.is_file():
        parser.error(f"Root release manifest is missing: {RELEASE_PATH}")
    release_bytes = RELEASE_PATH.read_bytes()
    release = json.loads(release_bytes)
    build = validate_build(ROOT, BUILD_PATH)
    before = provenance(ROOT, BUILD_PATH, [LAUNCHER, DRIVER, SUPPORT])
    expected = {
        "head": before["head"],
        "sourceFingerprint": before["sourceFingerprint"],
        "buildStatusSha256": sha_file(BUILD_PATH),
        "distFingerprint": before["distFingerprint"],
    }
    if release.get("status") != "RELEASED":
        parser.error("Root release manifest status must be exactly RELEASED")
    mismatches = {key: {"release": release.get(key), "current": value} for key, value in expected.items() if release.get(key) != value}
    if mismatches:
        parser.error(f"Frozen release/build correlation mismatch: {json.dumps(mismatches, ensure_ascii=False)}")
    minimum, maximum = MODE_DURATION_BOUNDS[args.mode]
    seconds = args.seconds if args.seconds is not None else MODE_DEFAULT_DURATION_SECONDS[args.mode]
    if seconds < minimum or seconds > maximum:
        parser.error(f"{args.mode} duration must be {minimum}..{maximum} seconds")
    RUNS.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-pid{os.getpid()}"
    run_dir = RUNS / run_id
    run_dir.mkdir(exist_ok=False)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}"
    server_log = (run_dir / "server.log").open("xb")
    server = subprocess.Popen([sys.executable, "-c", server_code(), str(port), str((ROOT / "dist").resolve())],
                              cwd=ROOT, stdout=server_log, stderr=subprocess.STDOUT)
    runner = None
    code = 1
    status = {"schema": "phase7-browser-launcher-v1", "runId": run_id, "mode": args.mode,
              "startUTC": now_utc(), "url": url, "runDir": str(run_dir), "releasePath": str(RELEASE_PATH),
              "releaseSha256": __import__("hashlib").sha256(release_bytes).hexdigest(), "release": release,
              "buildStatusPath": str(BUILD_PATH), "buildStatus": build, "sourceBefore": before,
              "durationSecondsRequested": seconds, "status": "PREFLIGHT"}
    try:
        deadline = time.monotonic() + 30
        last_error = None
        served = None
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise RuntimeError(f"Owned production static server exited: {server.returncode}")
            try:
                served = verify_http_dist(ROOT, url, build)
                break
            except Exception as exc:
                last_error = exc
                time.sleep(.25)
        if served is None:
            raise RuntimeError(f"Frozen production dist readiness failed: {last_error}")
        status["servedAssets"] = served
        env = os.environ.copy()
        env["PLW_BUILD_STATUS"] = str(BUILD_PATH)
        command = [sys.executable, str(DRIVER), "--go", "--mode", args.mode, "--seconds", str(seconds),
                   "--run-id", run_id, "--url", url, "--run-dir", str(run_dir),
                   "--execution-model", args.execution_model, "--execution-effort", args.execution_effort]
        status["runnerCommand"] = command
        status["status"] = "RUNNING"
        with (run_dir / "runner.stdout.log").open("xb") as stdout, (run_dir / "runner.stderr.log").open("xb") as stderr:
            runner = subprocess.Popen(command, cwd=PHASE, env=env, stdout=stdout, stderr=stderr,
                                      start_new_session=(os.name == "posix"))
            status["runnerPID"] = runner.pid
            supervision = monitor_runner_process(runner, run_dir / "runner-heartbeat.json")
        status["runnerSupervisor"] = supervision
        status["runnerExitCode"] = supervision["runnerExitCode"]
        if supervision["timedOut"]:
            status["status"] = "FAILED_RUNNER_HEARTBEAT_TIMEOUT"
            status["error"] = (f"Runner heartbeat stale for {supervision['heartbeatAgeSeconds']}s; "
                f"last stage={supervision['lastHeartbeatStage']} turn={supervision['lastHeartbeatTurn']}")
            status["watchdog"] = supervision
            code = 1
        else:
            code = supervision["runnerExitCode"]
            status["status"] = "COMPLETE" if code == 0 else "FAILED_RUN"
    except BaseException as exc:
        status["status"] = "FAILED_LAUNCH"
        status["error"] = f"{type(exc).__name__}: {exc}"
        code = 1
    finally:
        if runner is not None and runner.poll() is None:
            status["runnerCleanup"] = terminate_runner_process_tree(runner)
        if server.poll() is None:
            server.terminate()
        try:
            status["serverExitCode"] = server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            status["serverExitCode"] = server.wait(timeout=10)
        server_log.close()
        status["endUTC"] = now_utc()
        try:
            status["sourceAfter"] = provenance(ROOT, BUILD_PATH, [LAUNCHER, DRIVER, SUPPORT])
            status["sourceStableDuringRun"] = status["sourceBefore"] == status["sourceAfter"]
            if not status["sourceStableDuringRun"]:
                status["status"] = "FAILED_PROVENANCE_CHANGED"
                code = 1
        except Exception as exc:
            status["provenanceError"] = str(exc)
            status["status"] = "FAILED_PROVENANCE_CHECK"
            code = 1
        status["launcherExitCode"] = code
        try:
            publish(ROOT, run_dir / "launcher-status.json", status, "g6-luna-low-phase7-browser-launcher")
        except Exception as exc:
            status["reportPublishError"] = str(exc)
            (run_dir / "launcher-status.raw-fallback.json").write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(status, ensure_ascii=False, indent=2), flush=True)
    return code


if __name__ == "__main__":
    raise SystemExit(main())

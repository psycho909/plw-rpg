"""Phase 5 browser QA launcher; inert unless --go and Root release evidence match."""
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
from typing import Any

from phase05_browser_support import owned_http_server_code, provenance, publish_recorded, validate_build, verify_http_dist


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir():
            return candidate
    raise RuntimeError(f"Cannot find project root above {script}")


ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261007-life-craftsmanship/phase-05"
RUNS = PHASE / "browser-runs"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "build-status.json"))
LAUNCHER = Path(__file__).resolve()
DRIVER = PHASE / "phase05_browser_driver.py"
SUPPORT = PHASE / "phase05_browser_support.py"
ALLOWED_DURATION = {"stress": (1200, 1800), "life": (1800, 3600), "hybrid-short": (0, 3600)}


def utc_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-pid{os.getpid()}"


def allocate_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def owned_files() -> list[Path]:
    return [LAUNCHER, DRIVER, SUPPORT]


def current_provenance() -> dict[str, Any]:
    return provenance(ROOT, BUILD_PATH, owned_files())


def validate_release(mode: str, provenance_now: dict[str, Any]) -> dict[str, Any]:
    path = PHASE / "browser-release.json"
    if not path.is_file():
        raise RuntimeError("Root browser-release.json is missing; prepared QA cannot start")
    release = json.loads(path.read_text(encoding="utf-8"))
    if release.get("authorized") is not True:
        raise RuntimeError("Root browser-release.json does not authorize execution")
    if mode not in release.get("authorizedModes", []):
        raise RuntimeError(f"Root browser-release.json does not authorize mode {mode}")
    for key in ("sourceFingerprint", "buildStatusSha256", "distFingerprint"):
        value_key = {"sourceFingerprint": "sourceFingerprint", "buildStatusSha256": "buildStatusSha256",
                     "distFingerprint": "distFingerprint"}[key]
        if release.get(key) != provenance_now.get(value_key):
            raise RuntimeError(f"Root release {key} does not match current source/build/dist evidence")
    if release.get("qaFilesSha256") != provenance_now.get("ownedHarnessAndHelperSha256"):
        raise RuntimeError("Root release QA script/helper fingerprints do not match these driver files")
    validate_build(ROOT, BUILD_PATH)
    return release


def publish(path: Path, status: dict[str, Any]) -> None:
    publish_recorded(ROOT, path, status, "phase5-browser-qa-launcher")


def start_server(port: int, run_dir: Path):
    log = (run_dir / "server.log").open("wb")
    try:
        process = subprocess.Popen([sys.executable, "-c", owned_http_server_code(), str(port), str((ROOT / "dist").resolve())],
                                   cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
    except BaseException:
        log.close()
        raise
    return process, log


def stop_server(server: subprocess.Popen | None, log: Any) -> tuple[int | None, list[str]]:
    errors = []
    exit_code = None
    if server is not None:
        try:
            if server.poll() is None:
                server.terminate()
            try:
                exit_code = server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                exit_code = server.wait(timeout=10)
        except BaseException as error:
            errors.append(f"{type(error).__name__}: {error}")
    if log is not None:
        try: log.close()
        except BaseException as error: errors.append(f"{type(error).__name__}: {error}")
    return exit_code, errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="start the selected released browser QA run")
    parser.add_argument("--mode", choices=tuple(ALLOWED_DURATION))
    parser.add_argument("--seconds", type=int)
    parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", choices=("low", "medium", "max"), default="low")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: pass --go after Root records a matching browser-release.json")
        return 0
    if not args.mode:
        parser.error("--mode is required with --go")
    low, high = ALLOWED_DURATION[args.mode]
    seconds = args.seconds if args.seconds is not None else (high if args.mode == "hybrid-short" else low)
    if seconds < low or seconds > high:
        parser.error(f"{args.mode} duration must be between {low} and {high} seconds")
    before = current_provenance()
    release = validate_release(args.mode, before)
    run_id = utc_id()
    run_dir = RUNS / f"{args.mode}-{run_id}"
    run_dir.mkdir(parents=True, exist_ok=False)
    status_path = run_dir / "launcher-status.json"
    port = allocate_port()
    url = f"http://127.0.0.1:{port}"
    status: dict[str, Any] = {
        "state": "PREFLIGHT", "runId": run_id, "mode": args.mode, "durationSecondsRequested": seconds,
        "runnerExecution": {"requestedModel": args.execution_model, "requestedEffort": args.execution_effort,
                            "backendRuntimeVerified": False, "providedBy": "explicit launcher arguments"},
        "policyExecution": {"controller": "deterministic runner-driven policy", "modelInference": "none",
                            "adaptationInputs": "visible UI plan and read-only current-state telemetry"},
        "startUTC": datetime.now(timezone.utc).isoformat(), "sourceBefore": before,
        "releaseMarker": release, "url": url, "port": port,
    }
    server = None
    runner: subprocess.Popen | None = None
    log = None
    exit_code = 1
    runner_started = False
    try:
        status["buildStatus"] = validate_build(ROOT, BUILD_PATH)
        server, log = start_server(port, run_dir)
        status.update({"state": "SERVER_STARTING", "ownedServerPID": server.pid})
        publish(status_path, status)
        deadline = time.monotonic() + 30
        last_error: BaseException | None = None
        http = None
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise RuntimeError(f"Owned loopback production server exited early with {server.returncode}")
            try:
                http = verify_http_dist(ROOT, url, status["buildStatus"])
                break
            except BaseException as error:
                last_error = error
                time.sleep(.25)
        if http is None:
            raise RuntimeError(f"HTTP production readiness failed: {last_error}")
        status.update({"state": "RUNNER_STARTING", "httpReadiness": http,
                       "runnerStartUTC": datetime.now(timezone.utc).isoformat()})
        publish(status_path, status)
        command = [sys.executable, str(DRIVER), "--go", "--mode", args.mode, "--seconds", str(seconds),
                   "--execution-model", args.execution_model, "--execution-effort", args.execution_effort,
                   "--run-id", run_id, "--url", url, "--run-dir", str(run_dir)]
        status["runnerCommand"] = command
        env = os.environ.copy()
        env["PLW_BUILD_STATUS"] = str(BUILD_PATH)
        with (run_dir / "runner.stdout.log").open("wb") as stdout, (run_dir / "runner.stderr.log").open("wb") as stderr:
            runner = subprocess.Popen(command, cwd=PHASE, env=env, stdout=stdout, stderr=stderr)
            runner_started = True
            status["runnerPID"] = runner.pid
            status["state"] = "RUNNING"
            publish(status_path, status)
            exit_code = runner.wait()
        status.update({"runnerExitCode": exit_code, "runnerEndUTC": datetime.now(timezone.utc).isoformat(),
                       "state": "COMPLETE" if exit_code == 0 else "FAILED"})
    except BaseException as error:
        status.update({"state": "FAILED_PREFLIGHT_OR_LAUNCH", "error": f"{type(error).__name__}: {error}"})
        exit_code = 1
    finally:
        cleanup_errors = []
        if runner is not None and runner.poll() is None:
            try:
                runner.terminate()
                try: runner.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    runner.kill()
                    runner.wait(timeout=10)
            except BaseException as error:
                cleanup_errors.append(f"runner {runner.pid}: {type(error).__name__}: {error}")
        status["ownedServerExitCode"], server_errors = stop_server(server, log)
        cleanup_errors.extend(server_errors)
        status["cleanupErrors"] = cleanup_errors
        if status["cleanupErrors"]:
            status["state"] = "FAILED_CLEANUP"
            exit_code = 1
        try:
            after = current_provenance()
            status["sourceAfter"] = after
            status["sourceStableDuringRun"] = before == after
            if not status["sourceStableDuringRun"]:
                status["state"] = "FAILED_PROVENANCE_CHANGED"
                exit_code = 1
        except BaseException as error:
            status["sourceAfterError"] = f"{type(error).__name__}: {error}"
            status["state"] = "FAILED_PROVENANCE_CHECK"
            exit_code = 1
        status["runnerStarted"] = runner_started
        status["endUTC"] = datetime.now(timezone.utc).isoformat()
        status["launcherExitCode"] = exit_code
        publish(status_path, status)
        print(json.dumps(status, ensure_ascii=False, indent=2), flush=True)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())

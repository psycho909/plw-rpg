"""Detached, durable supervisor for explicitly released Phase 5 browser runs.

The public command is inert without --go. With --go it validates the explicit
Root release marker, records an invocation, starts a separate-session worker,
and returns immediately. The worker owns only the launcher process group.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
from typing import Any, Callable
import uuid

from phase05_browser_support import provenance


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir():
            return candidate
    raise RuntimeError(f"Cannot find project root above {script}")


ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261007-life-craftsmanship/phase-05"
RUNS = PHASE / "browser-runs"
INVOCATIONS = RUNS / "j-invocations"
LAUNCHER = PHASE / "phase05_browser_launcher.py"
DRIVER = PHASE / "phase05_browser_driver.py"
SUPPORT = PHASE / "phase05_browser_support.py"
SUPERVISOR = Path(__file__).resolve()
RELEASE = PHASE / "browser-release.json"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "build-status.json"))
ALLOWED_DURATION = {"stress": (1200, 1800), "life": (1800, 3600), "hybrid-short": (0, 3600)}
RESULT_NAME = {mode: f"{mode}-result.json" for mode in ALLOWED_DURATION}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent,
                                         prefix=".supervisor-", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def append_jsonl(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
        stream.flush()
        os.fsync(stream.fileno())


def spawn_detached_process(command: list[str], *, cwd: Path | str,
                           env: dict[str, str] | None = None) -> subprocess.Popen:
    """Start an independent session with no inherited terminal or exec pipes."""
    return subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            start_new_session=True, close_fds=True)


def source_pins(release: dict[str, Any]) -> dict[str, Any]:
    try:
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True,
                              capture_output=True, timeout=5, check=True).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        head = None
    paths = {"supervisor": SUPERVISOR, "launcher": LAUNCHER, "driver": DRIVER, "support": SUPPORT}
    return {
        "sourceCommit": head,
        "provenance": provenance(ROOT, BUILD_PATH, [LAUNCHER, DRIVER, SUPPORT]),
        "releaseMarkerPath": str(RELEASE),
        "releaseMarkerSha256": sha256_file(RELEASE),
        "releaseMarker": {key: release.get(key) for key in (
            "authorized", "authorizedModes", "stage", "sourceCommitBase", "sourceFingerprint",
            "buildStatusSha256", "distFingerprint", "qaFilesSha256", "humanGate")},
        "harnessFilesSha256": {key: sha256_file(path) for key, path in paths.items()},
    }


def validate_requested_release(mode: str) -> dict[str, Any]:
    if not RELEASE.is_file():
        raise RuntimeError("Root browser-release.json is missing; supervisor remains inert")
    release = read_json(RELEASE)
    if release is None:
        raise RuntimeError("Root browser-release.json is invalid JSON")
    if release.get("authorized") is not True or mode not in release.get("authorizedModes", []):
        raise RuntimeError(f"Root browser-release.json does not authorize {mode}")
    return release


def create_invocation(mode: str, seconds: int, execution_model: str, execution_effort: str) -> tuple[str, Path, str, dict[str, Any]]:
    release = validate_requested_release(mode)
    invocation_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + f"-{mode}-{uuid.uuid4().hex[:8]}"
    invocation_dir = INVOCATIONS / invocation_id
    invocation_dir.mkdir(parents=True, exist_ok=False)
    token = uuid.uuid4().hex
    launcher_command = [sys.executable, str(LAUNCHER), "--go", "--mode", mode, "--seconds", str(seconds),
                        "--execution-model", execution_model, "--execution-effort", execution_effort]
    metadata: dict[str, Any] = {
        "invocation": invocation_id,
        "mode": mode,
        "durationSecondsRequested": seconds,
        "executionModelArgument": execution_model,
        "executionEffortArgument": execution_effort,
        "runnerExecution": {"requestedModel": execution_model, "requestedEffort": execution_effort,
                            "backendRuntimeVerified": False},
        "launcherCommand": launcher_command,
        "cwd": str(ROOT),
        "createdAtUTC": utc_now(),
        "callerPID": os.getpid(),
        "launchMethod": "detached supervisor worker + launcher subprocess; start_new_session=True; DEVNULL stdio",
        "workerToken": token,
        "state": "SUPERVISOR_STARTING",
        "releaseMarkerSha256": sha256_file(RELEASE),
        "sourcePins": source_pins(release),
        "requestedRunResultPath": None,
        "launcherExitCode": None,
        "launcherEndUTC": None,
        "canonicalResultPresent": False,
        "canonicalResultStatus": None,
        "passEligible": False,
    }
    write_json(invocation_dir / "execution.json", metadata)
    worker_command = [sys.executable, str(SUPERVISOR), "--_worker", str(invocation_dir), "--_token", token]
    try:
        worker = spawn_detached_process(worker_command, cwd=ROOT)
    except OSError as error:
        metadata.update({"state": "FAILED_TO_DETACH", "supervisorError": f"{type(error).__name__}: {error}",
                         "endUTC": utc_now(), "passEligible": False})
        write_json(invocation_dir / "execution.json", metadata)
        raise
    metadata.update({"supervisorPID": worker.pid, "supervisorProcessGroupId": worker.pid,
                     "state": "SUPERVISOR_DETACHED", "supervisorDetached": True})
    write_json(invocation_dir / "execution.json", metadata)
    return invocation_id, invocation_dir, token, metadata


def locate_browser_run(mode: str, launcher_pid: int) -> Path | None:
    matches = list(RUNS.glob(f"{mode}-*-pid{launcher_pid}"))
    return matches[0] if len(matches) == 1 else None


def process_alive(pid: int | None) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        stat = Path(f"/proc/{pid}/stat").read_text(encoding="utf-8")
        fields_after_name = stat[stat.rfind(")") + 1:].split()
        if fields_after_name and fields_after_name[0] == "Z":
            return False
        return True
    except OSError:
        return False


def file_observation(path: Path | None) -> dict[str, Any] | None:
    if path is None:
        return None
    try:
        stat = path.stat()
        return {"path": str(path), "sizeBytes": stat.st_size,
                "modifiedAtUTC": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(timespec="milliseconds"),
                "ageSeconds": round(max(0.0, time.time() - stat.st_mtime), 2)}
    except OSError:
        return None


def send_owned_group_signal(process: subprocess.Popen, sig: int) -> None:
    """Signal only the process group created for this exact launcher Popen."""
    try:
        os.killpg(process.pid, sig)
    except ProcessLookupError:
        pass


def _canonical_result(path: Path | None) -> tuple[bool, dict[str, Any] | None]:
    if path is None or not path.is_file():
        return False, None
    value = read_json(path)
    if value is None or not isinstance(value.get("status"), str):
        return False, None
    return True, value


def _valid_number(value: Any) -> bool:
    return type(value) in (int, float) and math.isfinite(value)


def _mapping_fingerprint(value: Any) -> str | None:
    if not isinstance(value, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in value.items()):
        return None
    body = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(body).hexdigest()


def _pass_guard_failures(exit_code: int, result: dict[str, Any], launcher_status: dict[str, Any] | None,
                         metadata: dict[str, Any], result_path: Path) -> list[str]:
    failures: list[str] = []
    mode = metadata.get("mode")
    run_id = result.get("runId")
    if exit_code != 0:
        failures.append("launcher wait exit code is not zero")
    if result.get("status") != "PASS":
        failures.append("canonical result status is not PASS")
    if mode not in ALLOWED_DURATION or result.get("mode") != mode:
        failures.append("canonical result mode does not match invocation mode")
    if (not isinstance(run_id, str) or not run_id or not launcher_status
            or launcher_status.get("runId") != run_id or launcher_status.get("mode") != mode):
        failures.append("canonical result runId/mode does not match launcher status")
    if isinstance(run_id, str) and mode in RESULT_NAME:
        expected_path = result_path.parent / RESULT_NAME[mode]
        if (result_path.resolve() != expected_path.resolve()
                or result_path.name != RESULT_NAME[mode]
                or result_path.parent.name != f"{mode}-{run_id}"):
            failures.append("canonical result path is not the unique actual run directory for its mode/runId")
    else:
        failures.append("canonical result does not identify a valid actual run")
    if launcher_status is None or launcher_status.get("state") != "COMPLETE":
        failures.append("launcher status is not COMPLETE")
    if not launcher_status or launcher_status.get("launcherExitCode") != 0 or launcher_status.get("runnerExitCode") != 0:
        failures.append("launcher/runner status exit code is not zero")
    if not launcher_status or launcher_status.get("sourceStableDuringRun") is not True:
        failures.append("launcher source stability guard is not true")

    requested = metadata.get("durationSecondsRequested")
    target = result.get("durationTargetSeconds")
    if not _valid_number(requested) or target != requested:
        failures.append("canonical result target does not match the requested invocation duration")
    if not launcher_status or launcher_status.get("durationSecondsRequested") != requested:
        failures.append("launcher requested duration does not match the invocation")
    actual = result.get("durationSeconds")
    declared_minimum = result.get("durationMinimumSeconds")
    hard_minimum = ALLOWED_DURATION.get(mode, (float("inf"), 0))[0]
    required_minimum = max(hard_minimum, declared_minimum) if _valid_number(declared_minimum) else float("inf")
    if not _valid_number(actual) or not _valid_number(declared_minimum):
        failures.append("canonical actual duration or minimum duration is missing/non-finite")
    elif actual < required_minimum:
        failures.append("canonical actual duration is below the hard or declared minimum")
    observed = metadata.get("launcherElapsedSeconds")
    if not _valid_number(observed) or observed < required_minimum:
        failures.append("supervisor-observed launcher runtime is below the hard or declared minimum")
    try:
        started_at = datetime.fromisoformat(result["startUTC"])
        ended_at = datetime.fromisoformat(result["endUTC"])
        timestamp_duration = (ended_at - started_at).total_seconds()
        if (not _valid_number(actual) or timestamp_duration < required_minimum
                or abs(timestamp_duration - actual) > 1.0):
            failures.append("canonical start/end timestamps do not substantiate its actual duration")
    except (KeyError, TypeError, ValueError):
        failures.append("canonical start/end timestamps are missing or invalid")

    pins = metadata.get("sourcePins") if isinstance(metadata.get("sourcePins"), dict) else {}
    frozen = pins.get("releaseMarker") if isinstance(pins.get("releaseMarker"), dict) else {}
    before, after = result.get("sourceBefore"), result.get("sourceAfter")
    if result.get("sourceStableDuringRun") is not True:
        failures.append("canonical result sourceStableDuringRun is not true")
    if not isinstance(before, dict) or not isinstance(after, dict) or before != after:
        failures.append("canonical sourceBefore/sourceAfter are missing or differ")
    else:
        pinned_provenance = pins.get("provenance")
        if not isinstance(pinned_provenance, dict) or before != pinned_provenance:
            failures.append("canonical provenance does not exactly match the frozen invocation snapshot")
        for manifest_key, fingerprint_key in (("sourceSha256", "sourceFingerprint"),
                                               ("buildInputsSha256", "buildInputsFingerprint"),
                                               ("distSha256", "distFingerprint")):
            if _mapping_fingerprint(before.get(manifest_key)) != before.get(fingerprint_key):
                failures.append(f"canonical {manifest_key} manifest does not match its fingerprint")
        if before.get("head") != pins.get("sourceCommit"):
            failures.append("canonical source HEAD does not match frozen invocation HEAD")
        if frozen.get("sourceCommitBase") != pins.get("sourceCommit"):
            failures.append("frozen release commit base does not match invocation HEAD")
        for provenance_key, marker_key in (("sourceFingerprint", "sourceFingerprint"),
                                           ("buildStatusSha256", "buildStatusSha256"),
                                           ("distFingerprint", "distFingerprint"),
                                           ("ownedHarnessAndHelperSha256", "qaFilesSha256")):
            if before.get(provenance_key) != frozen.get(marker_key):
                failures.append(f"canonical {provenance_key} does not match frozen release pins")
        if not launcher_status or launcher_status.get("sourceBefore") != before or launcher_status.get("sourceAfter") != after:
            failures.append("launcher source provenance does not match canonical result provenance")
    result_marker = result.get("releaseMarker")
    status_marker = launcher_status.get("releaseMarker") if launcher_status else None
    for label, marker in (("result", result_marker), ("launcher", status_marker)):
        if not isinstance(marker, dict) or any(marker.get(key) != value for key, value in frozen.items()):
            failures.append(f"{label} release marker does not match frozen invocation marker")
    return failures


def _classify(exit_code: int, result: dict[str, Any] | None, launcher_status: dict[str, Any] | None,
              metadata: dict[str, Any], result_path: Path | None) -> tuple[str, bool, list[str]]:
    if result is None:
        return "INTERRUPTED_NO_RESULT", False, []
    failures = _pass_guard_failures(exit_code, result, launcher_status, metadata, result_path) if result_path else [
        "canonical result path is unavailable"]
    return ("COMPLETE_PASS", True, []) if not failures else ("FAILED_WITH_RESULT", False, failures)


def supervise_child(command: list[str], *, invocation_dir: Path, requested_seconds: float,
                    grace_seconds: float = 120, result_path: Path | Callable[[], Path | None],
                    heartbeat_seconds: float = 10, metadata: dict[str, Any] | None = None,
                    should_stop: Callable[[], bool] | None = None) -> dict[str, Any]:
    """Own one child session until wait() returns, timeout, or explicit stop."""
    if requested_seconds < 0 or grace_seconds < 0 or heartbeat_seconds <= 0:
        raise ValueError("durations must be nonnegative and heartbeat must be positive")
    invocation_dir.mkdir(parents=True, exist_ok=True)
    state = dict(metadata or {})
    state.update({"state": "LAUNCHER_STARTING", "launcherCommand": command,
                  "launcherStartUTC": utc_now(), "launcherExitCode": None,
                  "launcherEndUTC": None, "watchdogSeconds": requested_seconds + grace_seconds,
                  "watchdogTriggered": False, "canonicalResultPresent": False,
                  "canonicalResultStatus": None, "passEligible": False,
                  "launcherStdoutPath": str(invocation_dir / "launcher.stdout.log"),
                  "launcherStderrPath": str(invocation_dir / "launcher.stderr.log")})
    write_json(invocation_dir / "execution.json", state)
    with (invocation_dir / "launcher.stdout.log").open("wb") as stdout, \
            (invocation_dir / "launcher.stderr.log").open("wb") as stderr:
        child = subprocess.Popen(command, cwd=ROOT, stdin=subprocess.DEVNULL,
                                 stdout=stdout, stderr=stderr, start_new_session=True,
                                 close_fds=True)
        state.update({"state": "RUNNING", "launcherPID": child.pid,
                      "launcherProcessGroupId": child.pid, "launcherDetached": True,
                      "runnerPID": None, "browserRunDirectory": None})
        write_json(invocation_dir / "execution.json", state)
        started = time.monotonic()
        deadline = started + requested_seconds + grace_seconds
        watchdog = False
        externally_stopped = False
        resolved_result: Path | None = None
        while True:
            if callable(result_path):
                resolved_result = result_path()
            else:
                resolved_result = result_path
            browser_dir = locate_browser_run(state.get("mode", ""), child.pid) if state.get("mode") else None
            launcher_status_path = browser_dir / "launcher-status.json" if browser_dir else None
            launcher_status = read_json(launcher_status_path) if launcher_status_path else None
            if browser_dir:
                state["browserRunDirectory"] = str(browser_dir)
                state["launcherStatusPath"] = str(launcher_status_path)
                state["requestedRunResultPath"] = str(browser_dir / RESULT_NAME[state["mode"]])
            if launcher_status:
                state["runnerPID"] = launcher_status.get("runnerPID")
                state["ownedServerPID"] = launcher_status.get("ownedServerPID")
            if child.poll() is not None:
                externally_stopped = should_stop is not None and should_stop()
                break
            if should_stop is not None and should_stop():
                externally_stopped = True
                state["stopRequested"] = True
                state["stopRequestedAtUTC"] = utc_now()
                send_owned_group_signal(child, signal.SIGTERM)
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    send_owned_group_signal(child, signal.SIGKILL)
                break
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                watchdog = True
                state["watchdogTriggered"] = True
                state["watchdogTriggeredAtUTC"] = utc_now()
                send_owned_group_signal(child, signal.SIGTERM)
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    send_owned_group_signal(child, signal.SIGKILL)
                break
            try:
                child.wait(timeout=min(heartbeat_seconds, remaining))
            except subprocess.TimeoutExpired:
                pass
            if callable(result_path):
                resolved_result = result_path()
            if state.get("mode"):
                browser_dir = locate_browser_run(state["mode"], child.pid)
            operation_path = browser_dir / "operations.jsonl" if browser_dir else None
            checkpoint_path = browser_dir / "checkpoints.jsonl" if browser_dir else None
            runner_pid = state.get("runnerPID")
            now = time.monotonic()
            heartbeat = {
                "atUTC": utc_now(), "elapsedSeconds": round(now - started, 2),
                "launcherPID": child.pid, "launcherAlive": child.poll() is None,
                "runnerPID": runner_pid, "runnerAlive": process_alive(runner_pid),
                "ownedServerPID": state.get("ownedServerPID"),
                "ownedServerAlive": process_alive(state.get("ownedServerPID")),
                "operationLog": file_observation(operation_path),
                "checkpointLog": file_observation(checkpoint_path),
                "resultPath": str(resolved_result) if resolved_result else None,
                "canonicalResultPresent": bool(resolved_result and resolved_result.is_file()),
            }
            append_jsonl(invocation_dir / "supervisor-heartbeat.jsonl", heartbeat)
            state["lastHeartbeatUTC"] = heartbeat["atUTC"]
            state["lastObservedLauncherAlive"] = heartbeat["launcherAlive"]
            state["lastObservedRunnerAlive"] = heartbeat["runnerAlive"]
            state["lastOperationLog"] = heartbeat["operationLog"]
            state["lastCheckpointLog"] = heartbeat["checkpointLog"]
            state["supervisorHeartbeatAgeSeconds"] = 0
            write_json(invocation_dir / "execution.json", state)
        exit_code = child.wait()
    launcher_end = utc_now()
    launcher_elapsed = round(time.monotonic() - started, 3)
    state["launcherElapsedSeconds"] = launcher_elapsed
    if callable(result_path):
        resolved_result = result_path()
    result_present, result = _canonical_result(resolved_result)
    if resolved_result is not None:
        state["requestedRunResultPath"] = str(resolved_result)
    status_path = (resolved_result.parent / "launcher-status.json") if resolved_result else None
    launcher_status = read_json(status_path) if status_path else None
    terminal, pass_eligible, guard_failures = _classify(exit_code, result, launcher_status, state, resolved_result)
    if watchdog or externally_stopped:
        # A stop or watchdog never becomes success, even if a late result appeared.
        terminal, pass_eligible = ("INTERRUPTED_NO_RESULT", False) if not result_present else ("FAILED_WITH_RESULT", False)
    state.update({
        "state": terminal,
        "launcherExitCode": exit_code,
        "launcherEndUTC": launcher_end,
        "launcherElapsedSeconds": launcher_elapsed,
        "endUTC": launcher_end,
        "watchdogTriggered": watchdog,
        "stopRequested": externally_stopped,
        "canonicalResultPresent": result_present,
        "canonicalResultPath": str(resolved_result) if result_present and resolved_result else None,
        "canonicalResultSha256": sha256_file(resolved_result) if result_present and resolved_result else None,
        "canonicalResultStatus": result.get("status") if result else None,
        "launcherStatus": launcher_status,
        "launcherStatusPath": str(status_path) if status_path else None,
        "runnerExitCode": launcher_status.get("runnerExitCode") if launcher_status else None,
        "runnerEndUTC": launcher_status.get("runnerEndUTC") if launcher_status else None,
        "passEligible": pass_eligible,
        "passGuardFailures": guard_failures,
    })
    if terminal == "INTERRUPTED_NO_RESULT":
        state["interruptionReason"] = ("watchdog deadline exceeded without canonical result" if watchdog else
                                        "launcher exited without canonical result")
    elif externally_stopped:
        state["interruptionReason"] = "owned launcher process group stopped by explicit supervisor request"
    write_json(invocation_dir / "execution.json", state)
    (invocation_dir / "exit-code.txt").write_text(f"{exit_code}\n", encoding="utf-8")
    (invocation_dir / "end-utc.txt").write_text(f"{launcher_end}\n", encoding="utf-8")
    return state


def _worker(invocation_dir: Path, token: str) -> int:
    metadata_path = invocation_dir / "execution.json"
    deadline = time.monotonic() + 30
    metadata = None
    while time.monotonic() < deadline:
        metadata = read_json(metadata_path)
        if metadata and metadata.get("workerToken") == token and metadata.get("supervisorPID") == os.getpid():
            break
        time.sleep(.02)
    if not metadata or metadata.get("workerToken") != token or metadata.get("supervisorPID") != os.getpid():
        if metadata and metadata.get("workerToken") == token:
            metadata.update({"state": "INTERRUPTED_NO_RESULT", "passEligible": False,
                             "interruptionReason": "detached launcher did not complete its parent PID handshake",
                             "supervisorInterruptionObservedAtUTC": utc_now()})
            write_json(metadata_path, metadata)
        return 2
    metadata.pop("workerToken", None)
    try:
        current_release = validate_requested_release(metadata["mode"])
        current_pins = source_pins(current_release)
    except (OSError, RuntimeError, KeyError) as error:
        metadata.update({"state": "FAILED_RELEASE_PREFLIGHT", "supervisorError": f"{type(error).__name__}: {error}",
                         "endUTC": utc_now(), "passEligible": False})
        write_json(metadata_path, metadata)
        return 1
    if (sha256_file(RELEASE) != metadata.get("releaseMarkerSha256")
            or current_pins != metadata.get("sourcePins")):
        metadata.update({"state": "FAILED_RELEASE_PREFLIGHT",
                         "supervisorError": "Release marker or pinned source changed after detached invocation creation",
                         "sourcePinsObservedBeforeLaunch": current_pins, "endUTC": utc_now(),
                         "passEligible": False})
        write_json(metadata_path, metadata)
        return 1
    control_path = invocation_dir / "supervisor-control.json"
    signal_state = {"requested": False}
    def request_stop(_signum: int, _frame: Any) -> None:
        signal_state["requested"] = True
    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    def stop_requested() -> bool:
        value = read_json(control_path)
        return signal_state["requested"] or bool(value and value.get("stop") is True)
    try:
        outcome = supervise_child(
            metadata["launcherCommand"], invocation_dir=invocation_dir,
            requested_seconds=metadata["durationSecondsRequested"], grace_seconds=120,
            result_path=lambda: _result_for_invocation(read_json(metadata_path) or metadata), heartbeat_seconds=10,
            metadata=metadata, should_stop=stop_requested,
        )
        current_release = read_json(RELEASE) or {}
        current_pins = source_pins(current_release)
        outcome["sourcePinsAfter"] = current_pins
        outcome["sourcePinsStable"] = current_pins == metadata.get("sourcePins")
        if not outcome["sourcePinsStable"]:
            outcome["passEligible"] = False
            if outcome.get("canonicalResultPresent"):
                outcome["state"] = "FAILED_WITH_RESULT"
            else:
                outcome["state"] = "INTERRUPTED_NO_RESULT"
                outcome["interruptionReason"] = "source or release pins changed before supervisor finalization"
        write_json(metadata_path, outcome)
        return 0 if outcome.get("passEligible") else 1
    except BaseException as error:
        metadata.update({"state": "SUPERVISOR_ERROR", "supervisorError": f"{type(error).__name__}: {error}",
                         "endUTC": utc_now(), "passEligible": False})
        write_json(metadata_path, metadata)
        return 1


def _result_for_invocation(metadata: dict[str, Any]) -> Path | None:
    launcher_pid = metadata.get("launcherPID")
    mode = metadata.get("mode")
    if not isinstance(launcher_pid, int) or mode not in RESULT_NAME:
        return None
    browser_dir = locate_browser_run(mode, launcher_pid)
    return browser_dir / RESULT_NAME[mode] if browser_dir else None


def reconcile_status(invocation_dir: Path) -> dict[str, Any] | None:
    """Replace stale active labels when the detached observer is gone."""
    path = invocation_dir / "execution.json"
    metadata = read_json(path)
    if metadata is None or metadata.get("state") not in {
            "SUPERVISOR_STARTING", "SUPERVISOR_DETACHED", "LAUNCHER_STARTING", "RUNNING",
            "SUPERVISOR_LOST_LAUNCHER_ALIVE"}:
        return metadata
    supervisor_pid = metadata.get("supervisorPID")
    if process_alive(supervisor_pid):
        return metadata
    launcher_pid = metadata.get("launcherPID")
    if process_alive(launcher_pid):
        metadata.update({"state": "SUPERVISOR_LOST_LAUNCHER_ALIVE", "passEligible": False,
                         "supervisorInterruptionObservedAtUTC": utc_now(),
                         "supervisorInterruptionReason": "launcher remains alive but detached supervisor is gone"})
        write_json(path, metadata)
        return metadata
    result_path = Path(metadata["requestedRunResultPath"]) if metadata.get("requestedRunResultPath") else None
    if result_path is None and isinstance(launcher_pid, int) and metadata.get("mode") in RESULT_NAME:
        browser_dir = locate_browser_run(metadata["mode"], launcher_pid)
        result_path = browser_dir / RESULT_NAME[metadata["mode"]] if browser_dir else None
    present, result = _canonical_result(result_path)
    if present:
        metadata.update({"state": "FAILED_WITH_RESULT", "canonicalResultPresent": True,
                         "canonicalResultPath": str(result_path), "canonicalResultStatus": result.get("status"),
                         "passEligible": False,
                         "supervisorInterruptionObservedAtUTC": utc_now(),
                         "supervisorInterruptionReason": "supervisor exited before it recorded the exact launcher wait status"})
    else:
        metadata.update({"state": "INTERRUPTED_NO_RESULT", "canonicalResultPresent": False,
                         "canonicalResultPath": None, "launcherExitCode": None, "launcherEndUTC": None,
                         "passEligible": False, "supervisorInterruptionObservedAtUTC": utc_now(),
                         "interruptionReason": "detached supervisor ended without a canonical result; launcher end and exit are unknown"})
    write_json(path, metadata)
    return metadata


def launch_detached(mode: str, seconds: int, execution_model: str, execution_effort: str) -> dict[str, Any]:
    invocation_id, invocation_dir, token, metadata = create_invocation(mode, seconds, execution_model, execution_effort)
    # The worker reads its pid/token handshake after this parent has persisted them.
    print(json.dumps({"invocation": invocation_id, "directory": str(invocation_dir),
                      "supervisorPID": metadata["supervisorPID"], "state": metadata["state"]},
                     ensure_ascii=False), flush=True)
    return metadata


def _owned_launcher_group(invocation_dir: Path) -> tuple[int, int]:
    metadata = read_json(invocation_dir / "execution.json")
    if metadata is None:
        raise RuntimeError("Invocation metadata is missing or invalid")
    pid, pgid = metadata.get("launcherPID"), metadata.get("launcherProcessGroupId")
    if not isinstance(pid, int) or not isinstance(pgid, int) or pid != pgid:
        raise RuntimeError("Invocation does not identify a separately owned launcher process group")
    try:
        current_group = os.getpgid(pid)
        command_line = Path(f"/proc/{pid}/cmdline").read_bytes().replace(b"\0", b" ")
    except OSError as error:
        raise RuntimeError(f"Cannot verify the recorded launcher process: {error}") from error
    if current_group != pgid or str(LAUNCHER).encode() not in command_line:
        raise RuntimeError("Recorded PID no longer matches its owned launcher process group")
    return pid, pgid


def _command() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="required to launch a released browser run")
    parser.add_argument("--mode", choices=tuple(ALLOWED_DURATION))
    parser.add_argument("--seconds", type=int)
    parser.add_argument("--execution-model", default="gpt-6-luna")
    parser.add_argument("--execution-effort", choices=("low", "medium", "max"), default="low")
    parser.add_argument("--status", metavar="INVOCATION_ID")
    parser.add_argument("--stop", metavar="INVOCATION_ID", help="stop only the recorded owned launcher process group")
    parser.add_argument("--_worker", metavar="INVOCATION_DIR", help=argparse.SUPPRESS)
    parser.add_argument("--_token", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args._worker:
        if not args._token:
            parser.error("internal worker token missing")
        return _worker(Path(args._worker), args._token)
    if args.status:
        if Path(args.status).name != args.status or "/" in args.status or "\\" in args.status:
            parser.error("invocation ID must be a single generated path component")
        path = INVOCATIONS / args.status / "execution.json"
        value = reconcile_status(path.parent)
        if value is None:
            parser.error(f"unknown or invalid invocation {args.status}")
        print(json.dumps(value, ensure_ascii=False, indent=2))
        return 0
    if args.stop:
        if Path(args.stop).name != args.stop or "/" in args.stop or "\\" in args.stop:
            parser.error("invocation ID must be a single generated path component")
        invocation_dir = INVOCATIONS / args.stop
        pid, pgid = _owned_launcher_group(invocation_dir)
        write_json(invocation_dir / "supervisor-control.json", {"stop": True, "requestedAtUTC": utc_now(),
                                                                 "requestedByPID": os.getpid(),
                                                                 "ownedLauncherPID": pid,
                                                                 "ownedProcessGroupId": pgid})
        os.killpg(pgid, signal.SIGTERM)
        print(json.dumps({"invocation": args.stop, "stoppedProcessGroupId": pgid}, ensure_ascii=False))
        return 0
    if not args.go:
        print("PREPARED ONLY: pass --go with an authorized Root browser-release.json")
        return 0
    if not args.mode:
        parser.error("--mode is required with --go")
    low, high = ALLOWED_DURATION[args.mode]
    seconds = args.seconds if args.seconds is not None else (high if args.mode == "hybrid-short" else low)
    if seconds < low or seconds > high:
        parser.error(f"{args.mode} duration must be between {low} and {high} seconds")
    try:
        launch_detached(args.mode, seconds, args.execution_model, args.execution_effort)
    except (OSError, RuntimeError, ValueError) as error:
        parser.error(str(error))
    return 0


def main() -> int:
    return _command()


if __name__ == "__main__":
    raise SystemExit(main())

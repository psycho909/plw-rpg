"""Durability and terminal-state checks for the detached Phase 5 supervisor."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

PHASE = Path(__file__).resolve().parent
sys.path.insert(0, str(PHASE))
from phase05_browser_supervisor import (  # noqa: E402
    _classify, reconcile_status, spawn_detached_process, supervise_child,
)

PYTHON = sys.executable


def fake_child_source(result_path: Path | None, *, exit_code: int = 0, sleep_seconds: float = 0.0,
                      result_status: str = "PASS") -> str:
    result_literal = repr(str(result_path)) if result_path is not None else "None"
    return f'''import json, pathlib, sys, time
path = {result_literal}
time.sleep({sleep_seconds!r})
if path:
    result_path = pathlib.Path(path)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.write_text(json.dumps({{"status": {result_status!r}}}) + "\\n")
    (result_path.parent / "launcher-status.json").write_text(json.dumps({{
        "state": "COMPLETE" if {exit_code} == 0 else "FAILED",
        "launcherExitCode": {exit_code}, "runnerExitCode": {exit_code},
        "sourceStableDuringRun": True
    }}) + "\\n")
sys.exit({exit_code})
'''


def complete_pass_evidence(directory: Path, *, mode: str = "life", run_id: str = "20261007T100000Z-pid4242"):
    minimum = {"stress": 1200, "life": 1800, "hybrid-short": 0}[mode]
    started = datetime(2026, 10, 7, 9, 30, tzinfo=timezone.utc)
    ended = started + timedelta(seconds=minimum)
    result_path = directory / f"{mode}-{run_id}" / f"{mode}-result.json"
    harness = {
        "reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py": "launcher-sha",
        "reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py": "driver-sha",
        "reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_support.py": "support-sha",
    }
    def fingerprint(values: dict[str, str]) -> str:
        body = json.dumps(values, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(body).hexdigest()

    source_files = {"src/App.vue": "a" * 64, "src/engine/actions.ts": "b" * 64}
    build_inputs = {"package.json": "c" * 64, "vite.config.ts": "d" * 64}
    dist_files = {"dist/index.html": "e" * 64, "dist/assets/index.js": "f" * 64}
    provenance = {
        "head": "f9f969c9d3dfa3cbf1c379bec98eafab765b11cc",
        "sourceSha256": source_files, "sourceFingerprint": fingerprint(source_files),
        "buildInputsSha256": build_inputs, "buildInputsFingerprint": fingerprint(build_inputs),
        "distSha256": dist_files, "distFingerprint": fingerprint(dist_files),
        "buildStatusPath": "/workspace/plw-rpg/reports/v2/20261007-life-craftsmanship/phase-05/build-status.json",
        "buildStatusSha256": "1" * 64,
        "ownedHarnessAndHelperSha256": harness, "recordedReportsSha256": "2" * 64,
    }
    pins = {
        "sourceCommit": provenance["head"],
        "provenance": dict(provenance),
        "releaseMarker": {"sourceCommitBase": provenance["head"],
                           "sourceFingerprint": provenance["sourceFingerprint"],
                           "buildStatusSha256": provenance["buildStatusSha256"],
                           "distFingerprint": provenance["distFingerprint"], "qaFilesSha256": harness},
    }
    result = {
        "status": "PASS", "mode": mode, "runId": run_id,
        "durationSeconds": float(minimum), "durationMinimumSeconds": minimum,
        "durationTargetSeconds": minimum, "startUTC": started.isoformat(),
        "endUTC": ended.isoformat(), "sourceStableDuringRun": True,
        "sourceBefore": provenance, "sourceAfter": dict(provenance),
    }
    status = {"state": "COMPLETE", "mode": mode, "runId": run_id,
              "durationSecondsRequested": minimum,
              "launcherExitCode": 0, "runnerExitCode": 0, "sourceStableDuringRun": True,
              "sourceBefore": provenance, "sourceAfter": dict(provenance),
              "releaseMarker": dict(pins["releaseMarker"])}
    result["releaseMarker"] = dict(pins["releaseMarker"])
    metadata = {"invocation": "supervisor-invocation-id", "mode": mode,
                "durationSecondsRequested": minimum, "sourcePins": pins}
    return result_path, result, status, metadata


def evidence_child_source(result_path: Path, result: dict, launcher_status: dict, *, exit_code: int = 0) -> str:
    result_json = json.dumps(result)
    status_json = json.dumps(launcher_status)
    return f'''import pathlib, sys
path = pathlib.Path({str(result_path)!r})
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text({result_json!r} + "\\n")
(path.parent / "launcher-status.json").write_text({status_json!r} + "\\n")
sys.exit({exit_code})
'''


class BrowserSupervisorTests(unittest.TestCase):
    def test_clean_pass_requires_zero_exit_and_canonical_result(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            path, result, status, metadata = complete_pass_evidence(directory, mode="hybrid-short")
            outcome = supervise_child(
                [PYTHON, "-c", evidence_child_source(path, result, status)],
                invocation_dir=directory, requested_seconds=.1, grace_seconds=.2,
                result_path=path, heartbeat_seconds=.02, metadata=metadata,
            )
        self.assertEqual(outcome["state"], "COMPLETE_PASS")
        self.assertEqual(outcome["launcherExitCode"], 0)
        self.assertTrue(outcome["canonicalResultPresent"])
        self.assertIsNotNone(outcome["launcherEndUTC"])

    def test_complete_life_and_stress_metadata_satisfies_full_hard_minimum(self) -> None:
        for mode, expected_minimum in (("stress", 1200), ("life", 1800)):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as temp:
                path, result, status, metadata = complete_pass_evidence(Path(temp), mode=mode)
                metadata["launcherElapsedSeconds"] = expected_minimum
                state, pass_eligible, failures = _classify(0, result, status, metadata, path)
                self.assertEqual(state, "COMPLETE_PASS")
                self.assertTrue(pass_eligible)
                self.assertEqual(failures, [])

    def test_short_actual_duration_cannot_pass_even_when_requested_target_is_long(self) -> None:
        for label, actual, declared_minimum in (("below-hard-minimum", 1799.99, 1800),
                                                 ("lowered-declared-minimum", 1799.99, 0),
                                                 ("infinite-actual", float("inf"), 1800)):
            with self.subTest(case=label), tempfile.TemporaryDirectory() as temp:
                directory = Path(temp)
                path, result, status, metadata = complete_pass_evidence(directory, mode="life")
                result["durationSeconds"] = actual
                result["durationMinimumSeconds"] = declared_minimum
                outcome = supervise_child(
                    [PYTHON, "-c", evidence_child_source(path, result, status)],
                    invocation_dir=directory, requested_seconds=.1, grace_seconds=.2,
                    result_path=path, heartbeat_seconds=.02, metadata=metadata,
                )
                self.assertEqual(outcome["state"], "FAILED_WITH_RESULT")
                self.assertFalse(outcome["passEligible"])
                self.assertTrue(any("duration" in reason.lower() for reason in outcome["passGuardFailures"]))

    def test_stress_actual_duration_must_meet_its_independent_1200_second_minimum(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            path, result, status, metadata = complete_pass_evidence(directory, mode="stress")
            result["durationSeconds"] = 1199
            result["endUTC"] = (datetime.fromisoformat(result["startUTC"]) + timedelta(seconds=1199)).isoformat()
            outcome = supervise_child(
                [PYTHON, "-c", evidence_child_source(path, result, status)],
                invocation_dir=directory, requested_seconds=.1, grace_seconds=.2,
                result_path=path, heartbeat_seconds=.02, metadata=metadata,
            )
        self.assertEqual(outcome["state"], "FAILED_WITH_RESULT")
        self.assertFalse(outcome["passEligible"])

    def test_result_mode_and_run_id_must_match_invocation_and_launcher_status(self) -> None:
        cases = (("result-mode", "result", "mode", "stress"),
                 ("result-run-id", "result", "runId", "20261007T100001Z-pid9999"),
                 ("launcher-mode", "status", "mode", "stress"),
                 ("launcher-run-id", "status", "runId", "20261007T100001Z-pid9999"))
        for label, owner, field, wrong in cases:
            with self.subTest(case=label), tempfile.TemporaryDirectory() as temp:
                directory = Path(temp)
                path, result, status, metadata = complete_pass_evidence(directory)
                (result if owner == "result" else status)[field] = wrong
                outcome = supervise_child(
                    [PYTHON, "-c", evidence_child_source(path, result, status)],
                    invocation_dir=directory, requested_seconds=.1, grace_seconds=.2,
                    result_path=path, heartbeat_seconds=.02, metadata=metadata,
                )
                self.assertEqual(outcome["state"], "FAILED_WITH_RESULT")
                self.assertFalse(outcome["passEligible"])

    def test_result_must_be_in_its_matching_unique_actual_run_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            path, result, status, metadata = complete_pass_evidence(directory)
            wrong_path = directory / "life-unrelated-run-id" / "life-result.json"
            outcome = supervise_child(
                [PYTHON, "-c", evidence_child_source(wrong_path, result, status)],
                invocation_dir=directory, requested_seconds=.1, grace_seconds=.2,
                result_path=wrong_path, heartbeat_seconds=.02, metadata=metadata,
            )
        self.assertEqual(outcome["state"], "FAILED_WITH_RESULT")
        self.assertFalse(outcome["passEligible"])

    def test_source_guard_must_be_true_stable_and_match_frozen_release_pins(self) -> None:
        cases = ("missing-flag", "false-flag", "different-after", "missing-before", "wrong-frozen-head",
                 "wrong-source-fingerprint", "wrong-build-hash", "wrong-dist-fingerprint", "wrong-helper-hash",
                 "wrong-source-manifest-entry")
        for case in cases:
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temp:
                directory = Path(temp)
                path, result, status, metadata = complete_pass_evidence(directory)
                if case == "missing-flag":
                    result.pop("sourceStableDuringRun")
                elif case == "false-flag":
                    result["sourceStableDuringRun"] = False
                elif case == "different-after":
                    result["sourceAfter"] = {**result["sourceBefore"], "head": "other-head"}
                elif case == "missing-before":
                    result.pop("sourceBefore")
                elif case == "wrong-source-manifest-entry":
                    source_map = dict(result["sourceBefore"]["sourceSha256"])
                    source_map["src/App.vue"] = "0" * 64
                    result["sourceBefore"] = {**result["sourceBefore"], "sourceSha256": source_map}
                    result["sourceAfter"] = dict(result["sourceBefore"])
                else:
                    changed_key = {"wrong-frozen-head": "head", "wrong-source-fingerprint": "sourceFingerprint",
                                   "wrong-build-hash": "buildStatusSha256", "wrong-dist-fingerprint": "distFingerprint",
                                   "wrong-helper-hash": "ownedHarnessAndHelperSha256"}[case]
                    result["sourceBefore"] = {**result["sourceBefore"], changed_key: "wrong-pin"}
                    result["sourceAfter"] = dict(result["sourceBefore"])
                outcome = supervise_child(
                    [PYTHON, "-c", evidence_child_source(path, result, status)],
                    invocation_dir=directory, requested_seconds=.1, grace_seconds=.2,
                    result_path=path, heartbeat_seconds=.02, metadata=metadata,
                )
                self.assertEqual(outcome["state"], "FAILED_WITH_RESULT")
                self.assertFalse(outcome["passEligible"])

    def test_nonzero_launcher_exit_with_result_is_failed_not_pass(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            outcome = supervise_child(
                [PYTHON, "-c", fake_child_source(directory / "life-result.json", exit_code=7,
                                                    result_status="FAILED")],
                invocation_dir=directory, requested_seconds=2, grace_seconds=.2,
                result_path=directory / "life-result.json", heartbeat_seconds=.02,
            )
        self.assertEqual(outcome["state"], "FAILED_WITH_RESULT")
        self.assertEqual(outcome["launcherExitCode"], 7)

    def test_abrupt_exit_without_result_is_interrupted_no_result(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            outcome = supervise_child(
                [PYTHON, "-c", "import os; os._exit(9)"],
                invocation_dir=directory, requested_seconds=2, grace_seconds=.2,
                result_path=directory / "missing-result.json", heartbeat_seconds=.02,
            )
        self.assertEqual(outcome["state"], "INTERRUPTED_NO_RESULT")
        self.assertEqual(outcome["launcherExitCode"], 9)
        self.assertFalse(outcome["canonicalResultPresent"])
        self.assertFalse(outcome["passEligible"])

    def test_watchdog_kills_only_owned_group_and_never_passes_without_result(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            unrelated = subprocess.Popen([PYTHON, "-c", "import time; time.sleep(30)"],
                                          stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                          stderr=subprocess.DEVNULL)
            try:
                outcome = supervise_child(
                    [PYTHON, "-c", "import time; time.sleep(30)"],
                    invocation_dir=directory, requested_seconds=.05, grace_seconds=.05,
                    result_path=directory / "missing-result.json", heartbeat_seconds=.01,
                )
                self.assertIsNone(unrelated.poll(), "watchdog touched a process outside its owned group")
            finally:
                unrelated.terminate()
                unrelated.wait(timeout=3)
        self.assertEqual(outcome["state"], "INTERRUPTED_NO_RESULT")
        self.assertTrue(outcome["watchdogTriggered"])
        self.assertFalse(outcome["canonicalResultPresent"])
        self.assertFalse(outcome["passEligible"])
        self.assertIsNotNone(outcome["launcherExitCode"])

    def test_detached_worker_outlives_short_lived_launch_command(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            done = directory / "worker-finished"
            child = "import pathlib,time; time.sleep(.35); pathlib.Path(%r).write_text('done')" % str(done)
            module_dir = str(PHASE)
            outer = (
                "import sys; sys.path.insert(0, %r); "
                "from phase05_browser_supervisor import spawn_detached_process; "
                "spawn_detached_process([sys.executable, '-c', %r], cwd=%r)"
                % (module_dir, child, str(directory))
            )
            finished = subprocess.run([PYTHON, "-c", outer], cwd=directory, capture_output=True, text=True,
                                      timeout=5, check=False)
            self.assertEqual(finished.returncode, 0, finished.stderr)
            deadline = time.monotonic() + 3
            while time.monotonic() < deadline and not done.exists():
                time.sleep(.02)
            self.assertTrue(done.exists(), "detached worker died with its launching command")

    def test_stale_running_metadata_becomes_interrupted_without_result(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            metadata_path = directory / "execution.json"
            metadata_path.write_text(json.dumps({
                "state": "RUNNING", "supervisorPID": 99999999, "launcherPID": os.getpid(),
                "mode": "life", "passEligible": False,
            }) + "\n")
            alive = reconcile_status(directory)
            self.assertEqual(alive["state"], "SUPERVISOR_LOST_LAUNCHER_ALIVE")
            alive["launcherPID"] = 99999998
            metadata_path.write_text(json.dumps(alive) + "\n")
            outcome = reconcile_status(directory)
        self.assertEqual(outcome["state"], "INTERRUPTED_NO_RESULT")
        self.assertFalse(outcome["passEligible"])
        self.assertIsNone(outcome["launcherExitCode"])


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Run frozen Phase 4 final QA after an explicit Root release.

This driver is intentionally inert unless invoked with --go. It captures unique
raw logs, source/config/harness fingerprints and runtime status, then archives
status projections through scripts.recorded_reports.write_recorded.
"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlsplit
import uuid


ROOT = Path(__file__).resolve().parents[5]
PHASE = ROOT / "reports/v2/20261006-reward-core/phase-04"
OUT_ROOT = PHASE / "final-runs"
BUILD_STATUS_PATH = PHASE / "build-status.json"
FINAL_STATUS_PATH = PHASE / "final-runtime-status.json"
URL = "http://127.0.0.1:5202"
STRESS_SECONDS = 1200
ADVENTURE_SECONDS = 1800
HEARTBEAT_SECONDS = 60
KNOWN_STALE_SERVER_PIDS = {4506}

BASE_CONFIG_PATHS = ("package.json", "package-lock.json", "index.html")
HARNESS_PATHS = (
    "reports/v2/20261006-reward-core/phase-04/archive/final-runtime-driver.py",
    "reports/v2/20261006-reward-core/phase-04/archive/runner_paths.py",
    "reports/v2/20261006-reward-core/phase-04/simulation.config.ts",
    "reports/v2/20261006-reward-core/phase-04/loot_monte_carlo.test.ts",
    "reports/v2/20261006-reward-core/phase-04/combat_simulation.test.ts",
    "reports/v2/20261006-reward-core/phase-04/archive/verify_browser.py",
    "reports/v2/20261006-reward-core/phase-04/archive/phase04_stress_browser.py",
    "reports/v2/20261006-reward-core/phase-04/archive/phase04_adventure_playtest.py",
    "reports/v2/20261006-reward-core/phase-04/archive/adventure_policy.py",
    "reports/v2/20261006-reward-core/phase-04/archive/adventure-controls.json",
    "reports/v2/20261004-life-emergence/fixtures/native-v1.json",
    "scripts/recorded_reports.py",
)
NATIVE_V1_DEFAULT = ROOT / "reports/v2/20261004-life-emergence/fixtures/native-v1.json"

SIMULATION_BUILDS = (
    "legacy", "earlygear", "raw", "crit", "bleed", "penetration", "affixControl", "defense",
    "common", "rare", "epic", "eliteDrop", "miniBossDrop", "boss", "bossStandardBody",
)
SIMULATION_POWERBANDS = ("early", "edge", "ready")
SIMULATION_TARGETS = (
    ("grayWolf", "public-natural", None),
    ("alphaWolf", "public-natural", None),
    ("alphaWolf", "controlled-armored-elite", None),
    ("wolfKing", "public-natural", "wellFed"),
    ("wolfKing", "public-natural", "starved"),
    ("wolfKing", "public-natural", "moonlit"),
)
SIMULATION_POLICIES = ("attack", "cue")
SIMULATION_RANKS = ("grayWolf", "scarredWolf", "alphaWolf", "packLeader", "wolfKing")
TARGETED_BROWSER_REQUIRED_CHECKS = frozenset({
    "opening freezes time and resists Escape/resume",
    "modal retains Active Idle and pause flushes elapsed time",
    "real x5 clock advances without fake timers",
    "real x20 clock advances without fake timers",
    "reload never awards offline advancement",
    "native committed V1 world migrates with every legacy field/RNG/time preserved",
    "detached character projection updates potion/equipment in an open modal",
    "home purchase/storage update live and conserve real items",
    "NPC life details render from actual resident projections",
    "NPC career refreshes in a live modal across midnight",
    "quota preserves disk/pending, blocks x20, and recovers before the next action",
    "controlled real Chromium page freeze/resume catches in-session elapsed time",
    "invalid save remains protected from movement and speed controls",
    "full journal export includes V2 checkpoint and unique append-only records",
    "no uncaught browser exceptions",
})
TARGETED_BROWSER_REQUIRED_PREFIXES = ("single modal:", "responsive browser viewport")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def file_map(paths: tuple[str, ...]) -> dict[str, str]:
    result: dict[str, str] = {}
    for relative in paths:
        path = ROOT / relative
        if not path.is_file():
            raise FileNotFoundError(f"Required final QA input is missing: {relative}")
        result[relative] = sha256_file(path)
    return result


def source_map() -> dict[str, str]:
    files = [(path.relative_to(ROOT).as_posix(), path)
             for path in (ROOT / "src").rglob("*") if path.is_file()]
    files.sort(key=lambda item: item[0])
    if not files:
        raise RuntimeError("Refusing final QA: src/ is empty")
    return {relative: sha256_file(path) for relative, path in files}


def config_paths() -> tuple[str, ...]:
    candidates = set(BASE_CONFIG_PATHS)
    for pattern in ("vite.config.*", "vitest.config.*", "tsconfig*.json", ".npmrc"):
        candidates.update(path.name for path in ROOT.glob(pattern) if path.is_file())
    return tuple(sorted(candidates))


def source_fingerprint() -> str:
    source = source_map()
    payload = json.dumps(source, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def assert_source_manifest_complete() -> None:
    source = source_map()
    if not source:
        raise RuntimeError("Refusing final QA: src/ is empty")


def repo_preflight() -> dict:
    if Path.cwd().resolve() != ROOT:
        raise RuntimeError(f"Run from repository root {ROOT}; cwd is {Path.cwd().resolve()}")
    top = Path(git("rev-parse", "--show-toplevel")).resolve()
    if top != ROOT or not (ROOT / ".git").exists():
        raise RuntimeError(f"Unexpected Git root: {top}")
    expose_repo_import_path(top)
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    if package.get("scripts", {}).get("check") != "npm run test && npm run build":
        raise RuntimeError("package.json check script differs from the frozen QA contract")
    if not NATIVE_V1_DEFAULT.is_file():
        raise FileNotFoundError(f"Targeted browser fixture missing: {NATIVE_V1_DEFAULT}")
    assert_source_manifest_complete()
    controls_path = ROOT / "reports/v2/20261006-reward-core/phase-04/archive/adventure-controls.json"
    controls = json.loads(controls_path.read_text(encoding="utf-8")) if controls_path.is_file() else None
    if not controls or controls.get("stop") is not False:
        raise RuntimeError("Adventure control must exist and remain non-stopping for the full adaptive run")
    node = subprocess.check_output(["node", "--version"], cwd=ROOT, text=True).strip()
    npm = subprocess.check_output(["npm", "--version"], cwd=ROOT, text=True).strip()
    return {
        "root": str(ROOT),
        "head": git("rev-parse", "HEAD"),
        "branch": git("branch", "--show-current"),
        "workingTree": git("status", "--porcelain=v1").splitlines(),
        "node": node,
        "npm": npm,
        "sourceSha256": source_map(),
        "configurationSha256": file_map(config_paths()),
        "harnessSha256": file_map(HARNESS_PATHS),
        "sourceFingerprint": source_fingerprint(),
        "adventureControls": controls,
    }


def expose_repo_import_path(root: Path) -> None:
    """Make repository-level helper packages importable from an archived entrypoint."""
    resolved = Path(root).resolve()
    if resolved != ROOT or not (resolved / "scripts/recorded_reports.py").is_file():
        raise RuntimeError(f"Cannot expose report helpers from unconfirmed repository root: {resolved}")
    root_text = str(resolved)
    if root_text in sys.path:
        sys.path.remove(root_text)
    sys.path.insert(0, root_text)


def assert_browser_helper_roots() -> dict[str, str]:
    """Use the helpers' shared marker finder without launching any browser."""
    helper = ROOT / "reports/v2/20261006-reward-core/phase-04/archive/runner_paths.py"
    import importlib.util
    spec = importlib.util.spec_from_file_location("phase4_runner_paths", helper)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load browser helper root guard: {helper}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = {}
    for relative in (
        "reports/v2/20261006-reward-core/phase-04/archive/verify_browser.py",
        "reports/v2/20261006-reward-core/phase-04/archive/phase04_stress_browser.py",
        "reports/v2/20261006-reward-core/phase-04/archive/phase04_adventure_playtest.py",
    ):
        found = module.assert_project_root(module.resolve_project_root(ROOT / relative))
        if found.resolve() != ROOT:
            raise RuntimeError(f"Browser helper found wrong project root: {relative} -> {found}")
        result[relative] = str(found)
    return result


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        candidate = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        if candidate and (candidate.endswith(".js") or candidate.endswith(".css")):
            self.assets.append(candidate)


def local_http_get(path: str) -> tuple[int, dict[str, str], bytes]:
    parts = urlsplit(URL)
    if parts.hostname != "127.0.0.1" or parts.port != 5202:
        raise RuntimeError(f"Unexpected production URL: {URL}")
    connection = http.client.HTTPConnection(parts.hostname, parts.port, timeout=3)
    try:
        connection.request("GET", path, headers={"Host": "127.0.0.1:5202"})
        response = connection.getresponse()
        payload = response.read()
        return response.status, {k.lower(): v for k, v in response.getheaders()}, payload
    finally:
        connection.close()


def check_production_assets() -> dict:
    status, headers, html = local_http_get("/")
    if status != 200 or not html:
        raise RuntimeError(f"Production readiness GET / returned {status} with {len(html)} bytes")
    disk_html = (ROOT / "dist/index.html").read_bytes()
    if html != disk_html:
        raise RuntimeError("HTTP index.html bytes do not match current dist/index.html")
    parser = AssetParser()
    parser.feed(html.decode("utf-8"))
    if not parser.assets:
        raise RuntimeError("Production index has no JS/CSS bundles")
    verified: list[dict] = []
    for asset in parser.assets:
        relative = asset.split("?", 1)[0].lstrip("/")
        disk_path = (ROOT / "dist" / relative).resolve()
        if ROOT.joinpath("dist").resolve() not in disk_path.parents:
            raise RuntimeError(f"Bundle path escapes dist/: {asset}")
        if not disk_path.is_file():
            raise FileNotFoundError(f"Production bundle missing: {disk_path}")
        code, asset_headers, payload = local_http_get("/" + relative)
        disk_payload = disk_path.read_bytes()
        if code != 200 or not payload or payload != disk_payload:
            raise RuntimeError(f"Production bundle mismatch: {asset} HTTP {code}")
        verified.append({
            "urlPath": "/" + relative,
            "httpStatus": code,
            "contentType": asset_headers.get("content-type"),
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
        })
    return {
        "url": URL,
        "indexStatus": status,
        "indexContentType": headers.get("content-type"),
        "indexBytes": len(html),
        "indexSha256": hashlib.sha256(html).hexdigest(),
        "distIndexSha256": hashlib.sha256(disk_html).hexdigest(),
        "bundles": verified,
        "ready": True,
    }


def listening_pids() -> set[int]:
    completed = subprocess.run(["ss", "-ltnp", "( sport = :5202 )"], cwd=ROOT,
                               text=True, capture_output=True, check=False)
    if completed.returncode:
        raise RuntimeError(f"Could not inspect port 5202: {completed.stderr.strip()}")
    return {int(pid) for pid in re.findall(r"pid=(\d+)", completed.stdout)}


def process_identity(pid: int) -> tuple[list[str], Path | None]:
    cmdline_path = Path(f"/proc/{pid}/cmdline")
    cwd_path = Path(f"/proc/{pid}/cwd")
    if not cmdline_path.exists():
        return [], None
    args = [part.decode(errors="replace") for part in cmdline_path.read_bytes().split(b"\0") if part]
    try:
        cwd = cwd_path.resolve()
    except OSError:
        cwd = None
    return args, cwd


def process_active(pid: int) -> bool:
    stat_path = Path(f"/proc/{pid}/stat")
    try:
        remainder = stat_path.read_text(encoding="utf-8").rsplit(") ", 1)[1]
    except (FileNotFoundError, IndexError, PermissionError):
        return False
    fields = remainder.split()
    return bool(fields) and fields[0] != "Z"


def ensure_production_server(logs: Path, record_progress) -> tuple[dict, subprocess.Popen | None, tuple]:
    expected = ["python3", "-m", "http.server", "5202", "--bind", "127.0.0.1", "--directory", "dist"]
    owners = listening_pids()
    if owners:
        try:
            readiness = check_production_assets()
            return ({"action": "reused-matching-listener", "pids": sorted(owners),
                     "stdoutLog": None, "stderrLog": None, **readiness}, None, ())
        except Exception as readiness_error:
            identities = {pid: process_identity(pid) for pid in owners}
            if owners != KNOWN_STALE_SERVER_PIDS:
                raise RuntimeError(
                    f"Port 5202 is occupied by unapproved listener(s) {sorted(owners)}; "
                    f"readiness failed ({readiness_error}); refusing to stop another process"
                ) from readiness_error
            pid = next(iter(owners))
            args, cwd = identities[pid]
            if args != expected or cwd != ROOT:
                raise RuntimeError(
                    f"Known PID {pid} no longer matches expected server identity; "
                    f"command={args!r}, cwd={str(cwd)!r}; refusing to signal it"
                ) from readiness_error
            record_progress("stopping-known-stale-server", {
                "pid": pid, "commandLine": args, "cwd": str(cwd),
                "reason": str(readiness_error), "signal": "SIGTERM",
            })
            os.kill(pid, signal.SIGTERM)
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline and process_active(pid):
                time.sleep(0.2)
            if process_active(pid) or pid in listening_pids():
                raise RuntimeError(f"Known stale PID {pid} did not exit after normal SIGTERM")

    stdout_path = logs / "production-server-stdout.log"
    stderr_path = logs / "production-server-stderr.log"
    stdout = stdout_path.open("ab")
    stderr = stderr_path.open("ab")
    process = subprocess.Popen(
        [sys.executable, "-m", "http.server", "5202", "--bind", "127.0.0.1", "--directory", "dist"],
        cwd=ROOT, stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr, start_new_session=True,
    )
    process._phase4_log_streams = (stdout, stderr)  # type: ignore[attr-defined]
    try:
        deadline = time.monotonic() + 15
        last_error: Exception | None = None
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError(f"Production server exited with {process.returncode}")
            try:
                readiness = check_production_assets()
                return ({"action": "started-by-final-qa-driver", "pid": process.pid,
                         "stdoutLog": stdout_path.relative_to(ROOT).as_posix(),
                         "stderrLog": stderr_path.relative_to(ROOT).as_posix(), **readiness}, process, (stdout, stderr))
            except Exception as error:
                last_error = error
                time.sleep(0.25)
        raise RuntimeError(f"Production server did not become ready: {last_error}")
    except Exception:
        stop_owned_server(process, (stdout, stderr))
        raise


def stop_owned_server(process: subprocess.Popen | None, streams: tuple) -> dict | None:
    if process is None:
        return None
    if process.poll() is None:
        process.terminate()
    try:
        return_code = process.wait(timeout=10)
    except subprocess.TimeoutExpired as error:
        raise RuntimeError("Driver-owned production server did not stop after SIGTERM") from error
    finally:
        for stream in streams:
            try:
                stream.close()
            except Exception:
                pass
    return {"pid": process.pid, "signal": "SIGTERM", "exitCode": return_code}


class FinalRunner:
    def __init__(self, root: Path, run_id: str, logs: Path) -> None:
        self.root = root
        self.run_id = run_id
        self.logs = logs
        self.started = utc_now()
        self.status: dict = {
            "schemaVersion": 1,
            "producer": "g6-luna-low-phase4-qa-runner",
            "status": "IN_PROGRESS",
            "runId": run_id,
            "root": str(root),
            "startUTC": self.started,
            "headAtStart": git("rev-parse", "HEAD"),
            "branchAtStart": git("branch", "--show-current"),
            "environment": {
                "node": subprocess.check_output(["node", "--version"], cwd=root, text=True).strip(),
                "npm": subprocess.check_output(["npm", "--version"], cwd=root, text=True).strip(),
                "chromium": subprocess.check_output(["/usr/bin/chromium", "--version"], cwd=root, text=True).strip(),
            },
            "sourceSha256AtStart": source_map(),
            "sourceFingerprintAtStart": source_fingerprint(),
            "configurationSha256AtStart": file_map(config_paths()),
            "harnessSha256AtStart": file_map(HARNESS_PATHS),
            "phases": [],
            "heartbeats": [],
            "server": None,
        }
        self.last_publish = 0.0
        self.publish()

    def publish(self) -> None:
        from scripts.recorded_reports import write_recorded
        self.status["updatedUTC"] = utc_now()
        write_recorded(FINAL_STATUS_PATH, json.dumps(self.status, ensure_ascii=False, indent=2) + "\n",
                       producer="g6-luna-low-phase4-qa-runner")
        self.last_publish = time.monotonic()

    def update(self, stage: str, detail: dict | None = None, *, force: bool = True) -> None:
        self.status["currentStage"] = stage
        self.status["updatedUTC"] = utc_now()
        if detail:
            self.status.setdefault("stageDetails", {})[stage] = detail
        if force:
            self.publish()

    def phase_snapshot(self) -> dict:
        assert_source_manifest_complete()
        return {
            "head": git("rev-parse", "HEAD"),
            "sourceSha256": source_map(),
            "sourceFingerprint": source_fingerprint(),
            "configurationSha256": file_map(config_paths()),
            "harnessSha256": file_map(HARNESS_PATHS),
        }

    def run_command(self, name: str, command: list[str], env_overrides: dict[str, str] | None = None) -> dict:
        before = self.phase_snapshot()
        started = utc_now()
        stdout_path = self.logs / f"{name}-stdout.log"
        stderr_path = self.logs / f"{name}-stderr.log"
        env = os.environ.copy()
        if env_overrides:
            env.update(env_overrides)
        with stdout_path.open("ab") as stdout, stderr_path.open("ab") as stderr:
            process = subprocess.Popen(command, cwd=self.root, env=env, stdin=subprocess.DEVNULL,
                                       stdout=stdout, stderr=stderr, start_new_session=True)
            last_heartbeat = time.monotonic()
            while process.poll() is None:
                if time.monotonic() - last_heartbeat >= HEARTBEAT_SECONDS:
                    self.status["heartbeats"].append({
                        "atUTC": utc_now(), "running": {name: process.pid},
                        "stage": name, "command": command,
                    })
                    self.status["currentStage"] = name
                    self.publish()
                    last_heartbeat = time.monotonic()
                time.sleep(1)
            return_code = process.returncode
        ended = utc_now()
        after = self.phase_snapshot()
        result = {
            "name": name, "command": command, "envOverrides": env_overrides or {},
            "startUTC": started, "endUTC": ended, "exitCode": return_code,
            "headBefore": before["head"], "headAfter": after["head"],
            "sourceSha256Before": before["sourceSha256"], "sourceSha256After": after["sourceSha256"],
            "sourceFingerprintBefore": before["sourceFingerprint"],
            "sourceFingerprintAfter": after["sourceFingerprint"],
            "sourceStableDuringRun": before["sourceSha256"] == after["sourceSha256"] and before["head"] == after["head"],
            "configurationSha256Before": before["configurationSha256"], "configurationSha256After": after["configurationSha256"],
            "configurationStableDuringRun": before["configurationSha256"] == after["configurationSha256"],
            "harnessSha256Before": before["harnessSha256"], "harnessSha256After": after["harnessSha256"],
            "harnessStableDuringRun": before["harnessSha256"] == after["harnessSha256"],
            "rawStdout": stdout_path.relative_to(self.root).as_posix(),
            "rawStderr": stderr_path.relative_to(self.root).as_posix(),
        }
        self.status["phases"].append(result)
        self.update(name, result)
        from scripts.recorded_reports import write_recorded
        safe_name = re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-")
        write_recorded(PHASE / f"{safe_name}-status.json",
                       json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                       producer="g6-luna-low-phase4-qa-runner")
        return result

    @staticmethod
    def require_valid_phase(result: dict) -> None:
        if result["exitCode"] != 0:
            raise RuntimeError(f"{result['name']} exited {result['exitCode']}; raw logs and status preserved")
        if not result["sourceStableDuringRun"] or not result["configurationStableDuringRun"] or not result["harnessStableDuringRun"]:
            raise RuntimeError(f"{result['name']} input fingerprints changed during the run; raw logs and status preserved")


def publish_build_status(runner: FinalRunner, check_result: dict) -> dict:
    build_status = {
        "schemaVersion": 1,
        "producer": "g6-luna-low-phase4-qa-runner",
        "phase": "final-production-check-and-build",
        "runId": runner.run_id,
        "root": str(ROOT),
        "HEAD": check_result["headBefore"],
        "head": check_result["headBefore"],
        "headAfter": check_result["headAfter"],
        "branch": runner.status["branchAtStart"],
        "startUTC": check_result["startUTC"],
        "endUTC": check_result["endUTC"],
        "command": check_result["command"],
        "exitCode": check_result["exitCode"],
        "sourceSha256": check_result["sourceSha256Before"],
        "sourceSha256After": check_result["sourceSha256After"],
        "sourceFingerprint": check_result["sourceFingerprintBefore"],
        "sourceFingerprintAfter": check_result["sourceFingerprintAfter"],
        "sourceStableDuringRun": check_result["sourceStableDuringRun"],
        "configurationSha256": check_result["configurationSha256Before"],
        "configurationSha256After": check_result["configurationSha256After"],
        "configurationStableDuringRun": check_result["configurationStableDuringRun"],
        "harnessSha256": check_result["harnessSha256Before"],
        "harnessSha256After": check_result["harnessSha256After"],
        "harnessStableDuringRun": check_result["harnessStableDuringRun"],
        "rawStdout": check_result["rawStdout"],
        "rawStderr": check_result["rawStderr"],
        "sourceFileCount": len(check_result["sourceSha256Before"]),
    }
    from scripts.recorded_reports import write_recorded
    write_recorded(BUILD_STATUS_PATH, json.dumps(build_status, ensure_ascii=False, indent=2) + "\n",
                   producer="g6-luna-low-phase4-qa-runner")
    return build_status


def publish_final_simulation_copies(runner: FinalRunner, phase_result: dict) -> dict:
    loot_path = PHASE / "final-loot-distribution.json"
    combat_path = PHASE / "final-combat-balance.json"
    loot = json.loads(loot_path.read_text(encoding="utf-8"))
    combat = json.loads(combat_path.read_text(encoding="utf-8"))
    if loot.get("totalAwards") != 100000:
        raise RuntimeError(f"Final loot report has unexpected totalAwards: {loot.get('totalAwards')}")
    seeds = combat.get("seeds", [])
    rows = combat.get("rows", [])
    if len(seeds) != 8 or not rows or combat.get("actualFightRuns") != len(rows) * 2:
        raise RuntimeError(f"Final combat report has unexpected seed/row counts: {len(seeds)} / {len(rows)}")
    if loot.get("sourceSha256") != phase_result["sourceSha256After"] or combat.get("sourceSha256") != phase_result["sourceSha256After"]:
        raise RuntimeError("Final simulation report source fingerprints do not match runner snapshot")
    if loot.get("sourceCommit") != phase_result["headAfter"] or combat.get("sourceCommit") != phase_result["headAfter"]:
        raise RuntimeError("Final simulation report HEAD does not match runner snapshot")
    expected_loot_harness = phase_result["harnessSha256After"]["reports/v2/20261006-reward-core/phase-04/loot_monte_carlo.test.ts"]
    expected_combat_harness = phase_result["harnessSha256After"]["reports/v2/20261006-reward-core/phase-04/combat_simulation.test.ts"]
    if loot.get("harnessSha256") != expected_loot_harness or combat.get("harnessSha256") != expected_combat_harness:
        raise RuntimeError("Final simulation reports do not match frozen simulation harness hashes")
    if loot.get("sourceFingerprint") != phase_result["sourceFingerprintAfter"] or combat.get("sourceFingerprint") != phase_result["sourceFingerprintAfter"]:
        raise RuntimeError("Final simulation report sourceFingerprint does not match the runner manifest")
    metadata = {
        "runId": runner.run_id,
        "startUTC": phase_result["startUTC"], "endUTC": phase_result["endUTC"],
        "exitCode": phase_result["exitCode"],
        "sourceStableDuringRun": phase_result["sourceStableDuringRun"],
        "harnessStableDuringRun": phase_result["harnessStableDuringRun"],
        "sourceSha256": phase_result["sourceSha256After"],
        "sourceFingerprint": phase_result["sourceFingerprintAfter"],
        "harnessSha256": phase_result["harnessSha256After"],
        "actualLootAwards": loot["totalAwards"],
        "actualCombatRows": len(rows), "combatSeeds": seeds,
        "builds": combat.get("builds"), "powerbands": combat.get("powerbands"),
        "targets": combat.get("targets"), "policies": combat.get("policies"),
        "repeatedFightPairs": combat.get("repeatedFightPairs"),
        "actualFightRunsWithExactReplayAndReload": len(rows) * 2,
        "rawStdout": phase_result["rawStdout"], "rawStderr": phase_result["rawStderr"],
    }
    loot["finalRun"] = metadata
    combat["finalRun"] = metadata
    from scripts.recorded_reports import write_recorded
    write_recorded(PHASE / "final-loot-distribution.json", json.dumps(loot, ensure_ascii=False, indent=2) + "\n",
                   producer="g6-luna-low-phase4-qa-runner")
    write_recorded(PHASE / "final-combat-balance.json", json.dumps(combat, ensure_ascii=False, indent=2) + "\n",
                   producer="g6-luna-low-phase4-qa-runner")
    return {"lootAwards": loot["totalAwards"], "combatRows": len(rows), "combatSeeds": seeds,
            "actualFightRunsWithExactReplayAndReload": combat["actualFightRuns"]}


def validate_simulation_report_data(label: str, loot: dict, combat: dict, expected_awards: int,
                                    expected_seeds: int, phase_result: dict) -> dict:
    if expected_awards not in (1000, 100000):
        raise RuntimeError(f"{label} simulation expectedAwards must be exactly 1000 or 100000")
    if expected_seeds not in (1, 8):
        raise RuntimeError(f"{label} simulation expectedSeeds must be exactly 1 or 8")
    expected_per_rank = expected_awards // len(SIMULATION_RANKS)
    if expected_awards % len(SIMULATION_RANKS):
        raise RuntimeError(f"{label} awards cannot be split evenly among the five wolf ranks")
    if loot.get("totalAwards") != expected_awards or loot.get("awardsPerRank") != expected_per_rank:
        raise RuntimeError(f"{label} loot awards/rank denominator do not match {expected_awards} total and {expected_per_rank} per rank")
    cohorts = loot.get("cohorts")
    if not isinstance(cohorts, dict) or set(cohorts) != set(SIMULATION_RANKS):
        raise RuntimeError(f"{label} loot cohort set must contain exactly {', '.join(SIMULATION_RANKS)}")
    expected_rank_names = {"grayWolf": "normal", "scarredWolf": "normal", "alphaWolf": "elite",
                           "packLeader": "miniBoss", "wolfKing": "boss"}
    for rank in SIMULATION_RANKS:
        cohort = cohorts[rank]
        if not isinstance(cohort, dict) or cohort.get("awards") != expected_per_rank:
            raise RuntimeError(f"{label} {rank} cohort denominator must be {expected_per_rank}")
        if cohort.get("rank") != expected_rank_names[rank]:
            raise RuntimeError(f"{label} {rank} has unexpected rank metadata: {cohort.get('rank')}")
        gear_drops, no_gear = cohort.get("gearDrops"), cohort.get("noGearAwards")
        if type(gear_drops) is not int or type(no_gear) is not int or gear_drops + no_gear != expected_per_rank:
            raise RuntimeError(f"{label} {rank} gear/no-gear denominator does not sum to {expected_per_rank}")
        exclusive = cohort.get("bossExclusiveBase")
        if type(exclusive) is not int or exclusive != (gear_drops if rank == "wolfKing" else 0):
            raise RuntimeError(f"{label} {rank} boss-exclusive base count does not match its rank denominator")

    seeds = combat.get("seeds")
    rows = combat.get("rows")
    if not isinstance(seeds, list) or len(seeds) != expected_seeds or len(set(seeds)) != expected_seeds:
        raise RuntimeError(f"{label} combat report must contain {expected_seeds} unique seeds")
    if not isinstance(rows, list):
        raise RuntimeError(f"{label} combat rows must be a list")

    builds = combat.get("builds")
    if not isinstance(builds, list) or len(builds) != len(SIMULATION_BUILDS) or set(builds) != set(SIMULATION_BUILDS):
        raise RuntimeError(f"{label} combat build set does not match the approved {len(SIMULATION_BUILDS)} profiles")
    powerbands = combat.get("powerbands")
    if not isinstance(powerbands, dict) or set(powerbands) != set(SIMULATION_POWERBANDS):
        raise RuntimeError(f"{label} combat powerband set must be {SIMULATION_POWERBANDS}")
    targets = combat.get("targets")
    if not isinstance(targets, list):
        raise RuntimeError(f"{label} combat targets must be a list")
    target_keys = []
    for target in targets:
        if not isinstance(target, dict) or not isinstance(target.get("id"), str):
            raise RuntimeError(f"{label} combat target metadata is malformed")
        target_keys.append((target["id"], target.get("fixture", "public-natural"), target.get("variant")))
    if len(target_keys) != len(SIMULATION_TARGETS) or set(target_keys) != set(SIMULATION_TARGETS):
        raise RuntimeError(f"{label} combat target set does not match the six approved targets")
    policies = combat.get("policies")
    if not isinstance(policies, list) or len(policies) != len(SIMULATION_POLICIES) or set(policies) != set(SIMULATION_POLICIES):
        raise RuntimeError(f"{label} combat policy set does not match the approved policies")

    expected_row_count = expected_seeds * len(SIMULATION_BUILDS) * len(SIMULATION_POWERBANDS) * len(SIMULATION_TARGETS) * len(SIMULATION_POLICIES)
    if len(rows) != expected_row_count:
        raise RuntimeError(f"{label} combat rows are truncated/oversized: got {len(rows)}, expected {expected_row_count} ({540 * expected_seeds})")
    expected_keys = {
        (seed, band, build, target, fixture, variant, policy)
        for seed in seeds for band in SIMULATION_POWERBANDS for build in SIMULATION_BUILDS
        for target, fixture, variant in SIMULATION_TARGETS for policy in SIMULATION_POLICIES
    }
    actual_keys = []
    for row in rows:
        if not isinstance(row, dict):
            raise RuntimeError(f"{label} combat contains a malformed row")
        key = (row.get("seed"), row.get("powerband"), row.get("build"), row.get("target"),
               row.get("targetFixture"), row.get("variant"), row.get("policy"))
        actual_keys.append(key)
    actual_key_set = set(actual_keys)
    if len(actual_key_set) != len(actual_keys):
        raise RuntimeError(f"{label} combat rows contain duplicate scenario keys")
    if actual_key_set != expected_keys:
        missing = len(expected_keys - actual_key_set)
        extra = len(actual_key_set - expected_keys)
        raise RuntimeError(f"{label} combat scenario matrix mismatch: {missing} missing, {extra} unexpected tuples")
    expected_fights = expected_row_count * 2
    if combat.get("metricRows") != expected_row_count or combat.get("repeatedFightPairs") != expected_row_count:
        raise RuntimeError(f"{label} combat row/pair metadata does not equal {expected_row_count}")
    if combat.get("actualFightRuns") != expected_fights:
        raise RuntimeError(f"{label} actualFightRuns must equal {expected_fights}")

    seeds = combat.get("seeds", [])
    expected_source = phase_result["sourceSha256After"]
    expected_fp = phase_result["sourceFingerprintAfter"]
    expected_head = phase_result["headAfter"]
    for report_name, report in (("loot", loot), ("combat", combat)):
        if report.get("sourceSha256") != expected_source or report.get("sourceFingerprint") != expected_fp:
            raise RuntimeError(f"{label} {report_name} source fingerprint does not match its run snapshot")
        if report.get("sourceCommit") != expected_head:
            raise RuntimeError(f"{label} {report_name} source commit does not match its run snapshot")
    expected_loot_harness = phase_result["harnessSha256After"]["reports/v2/20261006-reward-core/phase-04/loot_monte_carlo.test.ts"]
    expected_combat_harness = phase_result["harnessSha256After"]["reports/v2/20261006-reward-core/phase-04/combat_simulation.test.ts"]
    if loot.get("harnessSha256") != expected_loot_harness or combat.get("harnessSha256") != expected_combat_harness:
        raise RuntimeError(f"{label} simulation report harness hashes do not match the run snapshot")
    return {
        "runLabel": label, "lootAwards": loot["totalAwards"], "combatRows": len(rows),
        "expectedRows": expected_row_count, "expectedActualFightRuns": expected_fights,
        "combatSeeds": seeds, "actualFightRuns": combat.get("actualFightRuns"),
        "builds": combat.get("builds"), "powerbands": combat.get("powerbands"),
        "targets": combat.get("targets"), "policies": combat.get("policies"),
        "sourceFingerprint": expected_fp,
    }


def validate_simulation_outputs(label: str, expected_awards: int, expected_seeds: int,
                                phase_result: dict) -> dict:
    loot_path = PHASE / f"{label}-loot-distribution.json"
    combat_path = PHASE / f"{label}-combat-balance.json"
    if not loot_path.is_file() or not combat_path.is_file():
        raise FileNotFoundError(f"{label} simulation did not publish both loot and combat reports")
    loot = json.loads(loot_path.read_text(encoding="utf-8"))
    combat = json.loads(combat_path.read_text(encoding="utf-8"))
    return validate_simulation_report_data(label, loot, combat, expected_awards, expected_seeds, phase_result)


def validate_targeted_browser_checks(checks: object) -> dict:
    if not isinstance(checks, list) or not checks:
        raise RuntimeError("Targeted browser report has no checks")
    names = {check.get("name") for check in checks if isinstance(check, dict) and isinstance(check.get("name"), str)}
    missing = sorted(TARGETED_BROWSER_REQUIRED_CHECKS - names)
    missing_prefixes = [prefix for prefix in TARGETED_BROWSER_REQUIRED_PREFIXES
                        if not any(name.startswith(prefix) for name in names)]
    if missing or missing_prefixes:
        details = []
        if missing:
            details.append(f"missing required checks: {', '.join(missing)}")
        if missing_prefixes:
            details.append(f"missing required check groups: {', '.join(missing_prefixes)}")
        raise RuntimeError("Targeted browser check contract failed (" + "; ".join(details) + ")")
    return {"checkCount": len(checks), "requiredCheckCount": len(TARGETED_BROWSER_REQUIRED_CHECKS),
            "requiredGroups": list(TARGETED_BROWSER_REQUIRED_PREFIXES), "status": "PASS"}


def parse_helper_report(path: Path, expected_source: dict[str, str], harness_path: str) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"Browser helper did not produce its report: {path}")
    report = json.loads(path.read_text(encoding="utf-8"))
    hashes = report.get("source_sha256", report.get("sourceSha256"))
    if hashes != expected_source:
        raise RuntimeError(f"Browser report source hashes do not match final runner snapshot: {path.name}")
    reported_harness = report.get("harnessSha256")
    expected_harness = sha256_file(ROOT / harness_path)
    if reported_harness != expected_harness:
        raise RuntimeError(f"Browser report harness hash mismatch: {path.name}")
    return report


def run_parallel_long_tests(runner: FinalRunner) -> list[dict]:
    definitions = [
        ("stress", [sys.executable, "reports/v2/20261006-reward-core/phase-04/archive/phase04_stress_browser.py"],
         {"PLW_V2_URL": URL, "PLW_STRESS_SECONDS": str(STRESS_SECONDS), "PLW_BUILD_STATUS": str(BUILD_STATUS_PATH)}),
        ("adventure", [sys.executable, "reports/v2/20261006-reward-core/phase-04/archive/phase04_adventure_playtest.py"],
         {"PLW_V2_URL": URL, "PLW_ADVENTURE_SECONDS": str(ADVENTURE_SECONDS), "PLW_BUILD_STATUS": str(BUILD_STATUS_PATH),
          "PLW_ADVENTURE_CONTROL_FILE": str(PHASE / "archive/adventure-controls.json"),
          "PLW_NATIVE_V1": str(NATIVE_V1_DEFAULT)}),
    ]
    before = runner.phase_snapshot()
    procs: dict[str, tuple[subprocess.Popen, object, object, dict, Path, Path]] = {}
    launch_times: dict[str, str] = {}
    try:
        for name, command, overrides in definitions:
            stdout_path = runner.logs / f"{name}-stdout.log"
            stderr_path = runner.logs / f"{name}-stderr.log"
            stdout = stdout_path.open("ab")
            stderr = stderr_path.open("ab")
            env = os.environ.copy(); env.update(overrides)
            launch_times[name] = utc_now()
            try:
                process = subprocess.Popen(command, cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
                                           stdout=stdout, stderr=stderr, start_new_session=True)
            except Exception:
                stdout.close(); stderr.close()
                raise
            procs[name] = (process, stdout, stderr, overrides, stdout_path, stderr_path)
    except Exception:
        for process, stdout, stderr, _, _, _ in procs.values():
            if process.poll() is None:
                process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                pass
            stdout.close(); stderr.close()
        raise
    phases: dict[str, dict] = {}
    last_heartbeat = time.monotonic()
    while procs:
        completed_names: list[str] = []
        for name, (process, stdout, stderr, overrides, stdout_path, stderr_path) in list(procs.items()):
            code = process.poll()
            if code is None:
                continue
            ended = utc_now()
            stdout.flush(); stderr.flush()
            stdout.close(); stderr.close()
            phases[name] = {
                "name": name,
                "pid": process.pid,
                "executionIsolation": "separate subprocess and independently launched Playwright Chromium context",
                "command": definitions[0 if name == "stress" else 1][1],
                "envOverrides": overrides,
                "startUTC": launch_times[name],
                "endUTC": ended,
                "exitCode": code,
                "rawStdout": stdout_path.relative_to(ROOT).as_posix(),
                "rawStderr": stderr_path.relative_to(ROOT).as_posix(),
                "reportPath": (PHASE / ("stress-browser.json" if name == "stress" else "adventure-agent-playtest.json")).relative_to(ROOT).as_posix(),
            }
            completed_names.append(name)
        for name in completed_names:
            del procs[name]
        if completed_names:
            runner.status["longRuns"] = phases
            runner.status["longRunsCompleted"] = sorted(phases)
            runner.publish()
        if time.monotonic() - last_heartbeat >= HEARTBEAT_SECONDS:
            heartbeat = {"atUTC": utc_now(), "running": {name: item[0].pid for name, item in procs.items()},
                         "completed": {name: phases[name]["exitCode"] for name in phases}}
            runner.status["heartbeats"].append(heartbeat)
            runner.status["currentStage"] = "parallel-stress-and-adventure"
            runner.publish()
            last_heartbeat = time.monotonic()
        if procs:
            time.sleep(5)
    after = runner.phase_snapshot()
    for phase in phases.values():
        phase.update({
            "startFingerprint": before,
            "endFingerprint": after,
            "sourceStableDuringRun": before["sourceSha256"] == after["sourceSha256"] and before["head"] == after["head"],
            "configurationStableDuringRun": before["configurationSha256"] == after["configurationSha256"],
            "harnessStableDuringRun": before["harnessSha256"] == after["harnessSha256"],
        })
        if phase["exitCode"] != 0 or not phase["sourceStableDuringRun"] or not phase["configurationStableDuringRun"] or not phase["harnessStableDuringRun"]:
            raise RuntimeError(f"{phase['name']} failed or input fingerprints changed; raw logs preserved")
    runner.status["phases"].extend(phases[name] for name, _, _ in definitions)
    return [phases["stress"], phases["adventure"]]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="required explicit Root final-QA release")
    args = parser.parse_args()
    if not args.go:
        parser.error("inert by default; wait for Root release, then pass --go")

    preflight = repo_preflight()
    preflight["browserHelperProjectRoots"] = assert_browser_helper_roots()
    run_id = "final-qa-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + "-" + uuid.uuid4().hex[:8]
    logs = OUT_ROOT / run_id
    logs.mkdir(parents=True, exist_ok=False)
    runner = FinalRunner(ROOT, run_id, logs)
    runner.status["preflight"] = preflight
    runner.publish()
    server_process: subprocess.Popen | None = None
    server_streams: tuple = ()
    exit_code = 1
    try:
        runner.update("npm-check-and-production-build")
        check_result = runner.run_command("npm-check", ["npm", "run", "check"])
        build_status = publish_build_status(runner, check_result)
        runner.require_valid_phase(check_result)

        runner.update("production-http-readiness")
        server, server_process, server_streams = ensure_production_server(logs, runner.update)
        server["sourceSha256"] = source_map()
        server["head"] = git("rev-parse", "HEAD")
        server["buildStatusPath"] = BUILD_STATUS_PATH.relative_to(ROOT).as_posix()
        server["buildSourceMatchesCurrent"] = build_status["sourceSha256"] == server["sourceSha256"]
        if not server["buildSourceMatchesCurrent"] or server["head"] != build_status["head"]:
            raise RuntimeError("Production server/current source no longer match the build-status snapshot")
        runner.status["server"] = server
        runner.update("production-http-readiness", server)
        from scripts.recorded_reports import write_recorded
        write_recorded(PHASE / "production-readiness-status.json",
                       json.dumps(server, ensure_ascii=False, indent=2) + "\n",
                       producer="g6-luna-low-phase4-qa-runner")

        def assert_matching_build(stage: str) -> dict:
            current = runner.phase_snapshot()
            if current["head"] != build_status["head"] or current["sourceSha256"] != build_status["sourceSha256"]:
                raise RuntimeError(f"{stage}: current HEAD/src do not match build-status")
            if current["sourceFingerprint"] != build_status["sourceFingerprint"]:
                raise RuntimeError(f"{stage}: current TypeScript runner source fingerprint does not match build-status")
            if build_status["exitCode"] != 0 or build_status["sourceStableDuringRun"] is not True:
                raise RuntimeError(f"{stage}: build-status is not successful and source-stable")
            if current["configurationSha256"] != build_status["configurationSha256"]:
                raise RuntimeError(f"{stage}: configuration does not match build-status")
            if current["harnessSha256"] != build_status["harnessSha256"]:
                raise RuntimeError(f"{stage}: harness does not match build-status")
            roots = assert_browser_helper_roots()
            return {"stage": stage, "head": current["head"], "sourceSha256": current["sourceSha256"],
                    "configurationSha256": current["configurationSha256"],
                    "harnessSha256": current["harnessSha256"], "browserHelperProjectRoots": roots}

        runner.update("full-final-loot-and-combat-simulation")
        sanity_gate = assert_matching_build("simulation-sanity")
        runner.status.setdefault("buildMatchGates", []).append(sanity_gate)
        runner.publish()
        expected_commit = build_status["head"]
        expected_fingerprint = build_status["sourceFingerprint"]
        simulation_command = ["npx", "vitest", "run", "--config",
                              "reports/v2/20261006-reward-core/phase-04/simulation.config.ts"]
        sanity = runner.run_command("final-sanity", simulation_command, {
            "PHASE4_LOOT_AWARDS": "1000", "PHASE4_COMBAT_SEEDS": "1", "PHASE4_RUN_LABEL": "sanity",
            "PHASE4_EXPECT_SOURCE_COMMIT": expected_commit,
            "PHASE4_EXPECT_SOURCE_FINGERPRINT": expected_fingerprint,
        })
        runner.require_valid_phase(sanity)
        sanity_counts = validate_simulation_outputs("sanity", 1000, 1, sanity)
        sanity_status = {**sanity, **sanity_counts, "status": "PASS"}
        from scripts.recorded_reports import write_recorded
        write_recorded(PHASE / "final-sanity-status.json",
                       json.dumps(sanity_status, ensure_ascii=False, indent=2) + "\n",
                       producer="g6-luna-low-phase4-qa-runner")
        runner.status["finalSanity"] = sanity_status
        runner.publish()

        final_sim_gate = assert_matching_build("full-final-simulation")
        runner.status.setdefault("buildMatchGates", []).append(final_sim_gate)
        runner.publish()
        sim = runner.run_command("final-simulation", simulation_command, {
            "PHASE4_LOOT_AWARDS": "100000", "PHASE4_COMBAT_SEEDS": "8", "PHASE4_RUN_LABEL": "final",
            "PHASE4_EXPECT_SOURCE_COMMIT": expected_commit,
            "PHASE4_EXPECT_SOURCE_FINGERPRINT": expected_fingerprint,
        })
        runner.require_valid_phase(sim)
        simulation_counts = validate_simulation_outputs("final", 100000, 8, sim)
        sim_status = {**sim, **simulation_counts, "status": "PASS"}
        write_recorded(PHASE / "final-simulation-status.json",
                       json.dumps(sim_status, ensure_ascii=False, indent=2) + "\n",
                       producer="g6-luna-low-phase4-qa-runner")
        simulation_counts = publish_final_simulation_copies(runner, sim)
        runner.status["finalSimulationCounts"] = simulation_counts
        runner.publish()

        runner.update("targeted-production-browser-regression")
        runner.status.setdefault("buildMatchGates", []).append(assert_matching_build("targeted-browser"))
        runner.publish()
        browser_result = runner.run_command("targeted-browser",
            [sys.executable, "reports/v2/20261006-reward-core/phase-04/archive/verify_browser.py"],
            {"PLW_V2_URL": URL, "PLW_NATIVE_V1": str(NATIVE_V1_DEFAULT)})
        runner.require_valid_phase(browser_result)
        browser_report = parse_helper_report(PHASE / "browser.json", browser_result["sourceSha256After"],
            "reports/v2/20261006-reward-core/phase-04/archive/verify_browser.py")
        browser_check_validation = validate_targeted_browser_checks(browser_report.get("checks"))
        browser_status = {**browser_result, "checks": browser_report.get("checks"),
                          "checkValidation": browser_check_validation,
                          "errorCount": len(browser_report.get("errors", [])),
                          "fixtureCount": len(browser_report.get("fixtures", [])),
                          "browser": browser_report.get("browser"),
                          "sourceStableDuringRun": browser_report.get("sourceStableDuringRun"),
                          "harnessStableDuringRun": browser_report.get("harnessStableDuringRun"),
                          "helpersStableDuringRun": browser_report.get("helpersStableDuringRun"),
                          "helperStartUTC": browser_report.get("startUTC"),
                          "helperEndUTC": browser_report.get("endUTC")}
        if (browser_status["errorCount"] != 0 or browser_status["sourceStableDuringRun"] is not True
                or browser_status["harnessStableDuringRun"] is not True
                or browser_status["helpersStableDuringRun"] is not True):
            raise RuntimeError("Targeted browser report contains errors or unstable inputs")
        write_recorded(PHASE / "browser-regression-status.json",
                       json.dumps(browser_status, ensure_ascii=False, indent=2) + "\n",
                       producer="g6-luna-low-phase4-qa-runner")

        runner.update("parallel-stress-and-adventure")
        runner.status.setdefault("buildMatchGates", []).append(assert_matching_build("stress-and-adventure"))
        runner.publish()
        long_results = run_parallel_long_tests(runner)
        for result in long_results:
            report_path = ROOT / result["reportPath"]
            expected_source = result["startFingerprint"]["sourceSha256"]
            harness = ("reports/v2/20261006-reward-core/phase-04/archive/phase04_stress_browser.py"
                       if result["name"] == "stress" else
                       "reports/v2/20261006-reward-core/phase-04/archive/phase04_adventure_playtest.py")
            report = parse_helper_report(report_path, expected_source, harness)
            result["reportStatus"] = report.get("status", "complete")
            result["reportStartUTC"] = report.get("startUTC")
            result["reportEndUTC"] = report.get("endUTC")
            result["reportDurationSeconds"] = report.get("durationSeconds", report.get("actualDurationSeconds"))
            result["browserVersion"] = report.get("browser", report.get("browserVersion"))
            if result["name"] == "stress":
                result["reportChecks"] = report.get("checks")
                result["reportOperations"] = report.get("operations")
                if report.get("status") != "PASS" or (report.get("durationSeconds") or 0) < STRESS_SECONDS:
                    raise RuntimeError("Stress report did not pass its full real-time duration gate")
                if (report.get("gearModalCycles") or report.get("cycles") or 0) < 100:
                    raise RuntimeError("Stress report did not reach its required gear/modal cycle count")
            else:
                result["completedThirtyMinutePlaytest"] = report.get("completedThirtyMinutePlaytest")
                result["decisionCount"] = len(report.get("decisionLog", []))
                if report.get("status") != "PASS" or report.get("completedThirtyMinutePlaytest") is not True:
                    raise RuntimeError("Adventure report did not pass its full 30-minute playtest gate")
                if (report.get("actualDurationSeconds") or 0) < ADVENTURE_SECONDS:
                    raise RuntimeError("Adventure report actual duration is shorter than 1800 seconds")
        final_fingerprint = runner.phase_snapshot()
        runner.status.update({
            "status": "PASS",
            "endUTC": utc_now(),
            "headAtEnd": final_fingerprint["head"],
            "sourceSha256AtEnd": final_fingerprint["sourceSha256"],
            "sourceFingerprintAtEnd": final_fingerprint["sourceFingerprint"],
            "configurationSha256AtEnd": final_fingerprint["configurationSha256"],
            "harnessSha256AtEnd": final_fingerprint["harnessSha256"],
            "sourceStableForEntireRun": runner.status["sourceSha256AtStart"] == final_fingerprint["sourceSha256"] and runner.status["headAtStart"] == final_fingerprint["head"],
            "configurationStableForEntireRun": runner.status["configurationSha256AtStart"] == final_fingerprint["configurationSha256"],
            "harnessStableForEntireRun": runner.status["harnessSha256AtStart"] == final_fingerprint["harnessSha256"],
            "longRuns": {item["name"]: item for item in long_results},
        })
        if not runner.status["sourceStableForEntireRun"] or not runner.status["configurationStableForEntireRun"] or not runner.status["harnessStableForEntireRun"]:
            runner.status["status"] = "FAILED_INPUTS_CHANGED"
            raise RuntimeError("Source/config/harness changed during final QA")
        runner.publish()
        exit_code = 0
    except Exception as error:
        runner.status["status"] = "FAILED"
        runner.status["failure"] = {"atUTC": utc_now(), "type": type(error).__name__, "message": str(error)}
        runner.status["endUTC"] = utc_now()
        runner.publish()
        print(f"FINAL QA FAILED: {type(error).__name__}: {error}", file=sys.stderr, flush=True)
        exit_code = 1
    finally:
        try:
            server_stop = stop_owned_server(server_process, server_streams)
            if server_stop:
                runner.status["driverOwnedServerStop"] = server_stop
                runner.publish()
        except Exception as error:
            runner.status["serverCleanupFailure"] = {"type": type(error).__name__, "message": str(error)}
            runner.status["status"] = "FAILED_SERVER_CLEANUP"
            runner.publish()
            exit_code = 1
        runner.status["exitCode"] = exit_code
        runner.status["endUTC"] = runner.status.get("endUTC", utc_now())
        runner.publish()
    print(json.dumps({
        "runId": run_id,
        "status": runner.status.get("status"),
        "exitCode": exit_code,
        "statusReport": FINAL_STATUS_PATH.relative_to(ROOT).as_posix(),
        "buildStatus": BUILD_STATUS_PATH.relative_to(ROOT).as_posix(),
        "rawLogsDirectory": logs.relative_to(ROOT).as_posix(),
    }, ensure_ascii=False), flush=True)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())

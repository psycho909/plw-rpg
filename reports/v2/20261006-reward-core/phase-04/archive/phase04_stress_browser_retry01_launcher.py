"""Durable, provenance-checked launcher for the Phase 4 browser stress retry.

This launcher is intentionally inert without --go. It starts only its own
loopback HTTP server and records each run under a unique final-runs directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[5]
PHASE = ROOT / "reports/v2/20261006-reward-core/phase-04"
HARNESS = PHASE / "archive/phase04_stress_browser_retry01.py"
BUILD_STATUS = PHASE / "build-status.json"
RUNTIME_STATUS = PHASE / "final-runtime-status.json"
EXPECTED_SOURCE_FINGERPRINT = "71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245"
EXPECTED_HEAD = "d3c689985e7e4553a85148ba2a5ea3be7685cb1f"
PORT = 5215
URL = f"http://127.0.0.1:{PORT}"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_map() -> dict[str, str]:
    files = sorted((p for p in (ROOT / "src").rglob("*") if p.is_file()),
                   key=lambda p: p.relative_to(ROOT).as_posix())
    return {p.relative_to(ROOT).as_posix(): sha(p) for p in files}


def source_fingerprint(values: dict[str, str]) -> str:
    payload = json.dumps(values, ensure_ascii=False, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def git_head() -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


def provenance() -> dict:
    helpers = {
        "runner_paths.py": PHASE / "archive/runner_paths.py",
        "scripts.recorded_reports.py": ROOT / "scripts/recorded_reports.py",
    }
    source = source_map()
    return {
        "head": git_head(),
        "sourceSha256": source,
        "sourceFingerprint": source_fingerprint(source),
        "launcherSha256": sha(Path(__file__).resolve()),
        "harnessSha256": sha(HARNESS),
        "helperSha256": {name: sha(path) for name, path in helpers.items()},
        "buildStatusSha256": sha(BUILD_STATUS),
    }


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths: list[str] = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        path = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        if path and path.split("?", 1)[0].endswith((".js", ".css")):
            self.paths.append(path.split("?", 1)[0].lstrip("/"))


def http_bytes(path: str) -> tuple[int, bytes]:
    with urlopen(URL + path, timeout=3) as response:
        return response.status, response.read()


def verify_http_dist() -> dict:
    code, index = http_bytes("/")
    disk_index = (ROOT / "dist/index.html").read_bytes()
    if code != 200 or index != disk_index:
        raise RuntimeError(f"HTTP index mismatch: status={code}, bytes={len(index)}")
    parser = Assets()
    parser.feed(index.decode("utf-8"))
    if not parser.paths:
        raise RuntimeError("dist/index.html references no JS/CSS bundle")
    stored = json.loads(RUNTIME_STATUS.read_text(encoding="utf-8")).get("server", {})
    expected_index_sha = stored.get("indexSha256")
    if not expected_index_sha or hashlib.sha256(index).hexdigest() != expected_index_sha:
        raise RuntimeError("HTTP/dist index bytes differ from final-runtime-status server.indexSha256")
    expected_bundles = {item.get("urlPath", "").lstrip("/"): item.get("sha256")
                        for item in stored.get("bundles", [])}
    if set(parser.paths) != set(expected_bundles):
        raise RuntimeError("dist bundle paths differ from final-runtime-status server.bundles")
    bundles = []
    for relative in parser.paths:
        path = (ROOT / "dist" / relative).resolve()
        if ROOT.joinpath("dist").resolve() not in path.parents or not path.is_file():
            raise RuntimeError(f"Invalid/missing dist asset: {relative}")
        status, body = http_bytes("/" + relative)
        disk = path.read_bytes()
        if status != 200 or body != disk:
            raise RuntimeError(f"HTTP asset differs from dist/: {relative} ({status})")
        digest = hashlib.sha256(body).hexdigest()
        if digest != expected_bundles.get(relative):
            raise RuntimeError(f"HTTP/dist bundle differs from final-runtime-status: {relative}")
        bundles.append({"path": relative, "bytes": len(body), "sha256": digest})
    return {"indexBytes": len(index), "indexSha256": hashlib.sha256(index).hexdigest(), "bundles": bundles}


def record(path: Path, payload: dict) -> None:
    sys.path.insert(0, str(ROOT))
    from scripts.recorded_reports import write_recorded
    write_recorded(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                   producer="v2x-phase4-stress-browser-retry01-launcher")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--go", action="store_true", help="start the approved 1200-second runner")
    args = parser.parse_args()
    if not args.go:
        parser.error("inert by default; --go is required after RootGO")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + f"Z-pid{os.getpid()}"
    run_dir = PHASE / "final-runs" / f"stress-browser-retry01-{run_id}"
    run_dir.mkdir(parents=True, exist_ok=False)
    status_path = run_dir / "launcher-status.json"
    start = provenance()
    status = {"runId": run_id, "state": "PREFLIGHT", "startUTC": datetime.now(timezone.utc).isoformat(),
              "port": PORT, "url": URL, "provenanceBefore": start}
    server = None

    def publish():
        record(status_path, status)

    try:
        if start["head"] != EXPECTED_HEAD:
            raise RuntimeError(f"HEAD mismatch: {start['head']}")
        if start["sourceFingerprint"] != EXPECTED_SOURCE_FINGERPRINT:
            raise RuntimeError(f"source fingerprint mismatch: {start['sourceFingerprint']}")
        build = json.loads(BUILD_STATUS.read_text(encoding="utf-8"))
        if build.get("exitCode") != 0 or build.get("sourceStableDuringRun") is not True or build.get("sourceSha256") != start["sourceSha256"]:
            raise RuntimeError("build-status does not attest to the current full source map")

        server_log = (run_dir / "server.log").open("wb")
        server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", "dist"],
                                  cwd=ROOT, stdout=server_log, stderr=subprocess.STDOUT)
        status.update({"state": "SERVER_STARTING", "serverPID": server.pid, "serverCommand": "python -m http.server 5215 --bind 127.0.0.1 --directory dist"})
        (run_dir / "server-pid.txt").write_text(f"{server.pid}\n", encoding="utf-8")
        publish()
        deadline = time.monotonic() + 30
        http_evidence = None
        last_error = None
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise RuntimeError(f"owned HTTP server exited early with {server.returncode}; see server.log")
            try:
                http_evidence = verify_http_dist()
                break
            except Exception as exc:
                last_error = exc
                time.sleep(.25)
        if http_evidence is None:
            raise RuntimeError(f"HTTP readiness failed: {last_error}")
        status.update({"state": "RUNNING", "httpReadiness": http_evidence,
                       "runnerStartUTC": datetime.now(timezone.utc).isoformat()})
        publish()

        env = os.environ.copy()
        env.update({"PLW_V2_URL": URL, "PLW_BUILD_STATUS": str(BUILD_STATUS), "PLW_STRESS_SECONDS": "1200"})
        with (run_dir / "runner.stdout.log").open("wb") as stdout, (run_dir / "runner.stderr.log").open("wb") as stderr:
            runner = subprocess.Popen([sys.executable, str(HARNESS)], cwd=ROOT, env=env, stdout=stdout, stderr=stderr)
            (run_dir / "runner-pid.txt").write_text(f"{runner.pid}\n", encoding="utf-8")
            status["runnerPID"] = runner.pid
            publish()
            exit_code = runner.wait()

        status.update({"state": "COMPLETE" if exit_code == 0 else "FAILED", "runnerExitCode": exit_code,
                       "runnerEndUTC": datetime.now(timezone.utc).isoformat(), "provenanceAfter": provenance()})
        status["provenanceStable"] = status["provenanceBefore"] == status["provenanceAfter"]
        if not status["provenanceStable"]:
            status["state"] = "FAILED_PROVENANCE_CHANGED"
            exit_code = 1
        return_code = exit_code
    except BaseException as exc:
        status.update({"state": "FAILED", "error": f"{type(exc).__name__}: {exc}",
                       "provenanceAfter": provenance()})
        status["provenanceStable"] = status["provenanceBefore"] == status["provenanceAfter"]
        return_code = 1
    finally:
        status["endUTC"] = datetime.now(timezone.utc).isoformat()
        status["launcherExitCode"] = return_code
        if server is not None:
            status["ownedServerPID"] = server.pid
            if server.poll() is None:
                server.terminate()
                try:
                    server.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait()
            status["ownedServerExitCode"] = server.returncode
        publish()
        print(json.dumps(status, ensure_ascii=False, indent=2), flush=True)
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())

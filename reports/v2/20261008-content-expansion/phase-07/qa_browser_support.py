"""Phase 7 production Chromium harness provenance and telemetry helpers.

Adapted from the Phase 6 J browser support module. This file is intentionally
independent of game catalog IDs so it can be frozen before the final content UI.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Any
from urllib.parse import urlsplit
from urllib.request import urlopen
from html.parser import HTMLParser

BUILD_INPUTS = ("package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "index.html")
CORE_SAVE_METADATA_KEYS = frozenset({"lastSavedAt", "playJournal"})


def sha_bytes(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def file_map(root: Path, directory: str) -> dict[str, str]:
    base = root / directory
    paths = sorted((p for p in base.rglob("*") if p.is_file()), key=lambda p: p.relative_to(root).as_posix()) if base.is_dir() else []
    return {p.relative_to(root).as_posix(): sha_file(p) for p in paths}


def fingerprint(values: dict[str, str]) -> str:
    body = json.dumps(values, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return sha_bytes(body)


def provenance(root: Path, build_path: Path, owned_files: list[Path]) -> dict[str, Any]:
    source = file_map(root, "src")
    inputs = {name: sha_file(root / name) for name in BUILD_INPUTS if (root / name).is_file()}
    dist = file_map(root, "dist")
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    return {
        "head": head,
        "sourceSha256": source,
        "sourceFingerprint": fingerprint(source),
        "buildInputsSha256": inputs,
        "buildInputsFingerprint": fingerprint(inputs),
        "distSha256": dist,
        "distFingerprint": fingerprint(dist),
        "buildStatusPath": str(build_path.resolve()),
        "buildStatusSha256": sha_file(build_path) if build_path.is_file() else None,
        "buildStatusSourceSha256": json.loads(build_path.read_text(encoding="utf-8")).get("sourceSha256") if build_path.is_file() else None,
        "qaFilesSha256": {p.resolve().relative_to(root.resolve()).as_posix(): sha_file(p) for p in owned_files if p.is_file()},
        "recordedReportsSha256": sha_file(root / "scripts/recorded_reports.py"),
    }


def validate_build(root: Path, path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError(f"Missing frozen production build status: {path}")
    status = json.loads(path.read_text(encoding="utf-8"))
    current = provenance(root, path, [])
    if status.get("exitCode") != 0 or status.get("sourceStableDuringRun") is not True:
        raise RuntimeError("Build status is not successful and source-stable")
    for key in ("headBefore", "headAfter"):
        if status.get(key) != current["head"]:
            raise RuntimeError(f"Build status {key} differs from current HEAD")
    if status.get("sourceSha256") != current["sourceSha256"]:
        raise RuntimeError("Build source manifest differs from recursive current src/ hashes")
    recorded_inputs = status.get("buildInputs", status.get("inputSha256After", {}))
    if any(recorded_inputs.get(name) != digest for name, digest in current["buildInputsSha256"].items()):
        raise RuntimeError("Build input manifest differs from current files")
    if status.get("distSha256") != current["distSha256"]:
        raise RuntimeError("Build dist manifest differs from current dist/ hashes")
    return status


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths: list[str] = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        raw = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        path = urlsplit(raw or "").path.lstrip("/")
        if path.endswith((".js", ".css")):
            self.paths.append(path)


def http_bytes(url: str):
    with urlopen(url, timeout=8) as response:
        return response.status, response.read()


def verify_http_dist(root: Path, url: str, build: dict[str, Any]) -> dict[str, Any]:
    status, index = http_bytes(url + "/")
    disk = (root / "dist/index.html").read_bytes()
    if status != 200 or index != disk:
        raise RuntimeError(f"Served index mismatch ({status})")
    parser = Assets()
    parser.feed(index.decode("utf-8"))
    if not parser.paths or len(set(parser.paths)) != len(parser.paths):
        raise RuntimeError("Missing/duplicate built assets")
    verified = []
    for relative in parser.paths:
        path = (root / "dist" / relative).resolve()
        if root.joinpath("dist").resolve() not in path.parents or not path.is_file():
            raise RuntimeError(f"Invalid asset {relative}")
        code, body = http_bytes(url + "/" + relative)
        digest = sha_bytes(path.read_bytes())
        if code != 200 or body != path.read_bytes() or build.get("distSha256", {}).get(f"dist/{relative}") != digest:
            raise RuntimeError(f"Served/build asset mismatch: {relative}")
        verified.append({"path": relative, "status": code, "bytes": len(body), "sha256": digest})
    return {"index": {"status": status, "bytes": len(index), "sha256": sha_bytes(index)}, "assets": verified}


def append_jsonl(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as output:
        output.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
        output.flush()
        os.fsync(output.fileno())


def publish(root: Path, path: Path, payload: dict[str, Any], producer: str) -> None:
    sys.path.insert(0, str(root))
    from scripts.recorded_reports import write_recorded
    write_recorded(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n", producer=producer)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def attach_early_capture(page) -> None:
    """Capture save-write latency/errors and rejected promises before app startup."""
    page.add_init_script("""(() => {
      window.__qaSaveWrites=[]; window.__qaStorageErrors=[]; window.__qaUnhandled=[];
      window.__qaLongTasks=[];
      try { new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__qaLongTasks.push({startTime:entry.startTime,duration:entry.duration})}).observe({type:'longtask',buffered:true}) } catch {}
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){const start=performance.now();try{return original.call(this,key,value)}
        catch(error){window.__qaStorageErrors.push({key,error:String(error)});throw error}
        finally{if(key==='oakvale-v1')window.__qaSaveWrites.push({elapsedMs:performance.now()-start,bytes:new TextEncoder().encode(value).length,at:Date.now()})}};
      addEventListener('unhandledrejection',event=>window.__qaUnhandled.push(String(event.reason)));
    })();""")


def save_latency_sample(page) -> dict[str, Any]:
    """Drain one telemetry interval so checkpoints never repeat lifetime arrays."""
    return page.evaluate("""() => {
      const take=key=>{const value=window[key]||[];window[key]=[];return value};
      return {writes:take('__qaSaveWrites'),storageErrors:take('__qaStorageErrors'),
        unhandledRejections:take('__qaUnhandled'),longTasks:take('__qaLongTasks')};
    }""")


def core_save_payload(raw: Any) -> dict[str, Any]:
    """Return full serialized GameState while excluding only timestamp/journal metadata."""
    if not isinstance(raw, dict) or raw.get("__parseError"):
        raise ValueError("Save payload is absent or invalid JSON")
    return {key: value for key, value in raw.items() if key not in CORE_SAVE_METADATA_KEYS}


def core_save_differences(before: Any, after: Any) -> dict[str, dict[str, str]]:
    """Compare every persisted GameState field; diagnostics are top-level field hashes."""
    left, right = core_save_payload(before), core_save_payload(after)
    keys = sorted(set(left) | set(right))
    return {key: {"beforeSha256": sha_bytes(json.dumps(left.get(key), ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()),
                  "afterSha256": sha_bytes(json.dumps(right.get(key), ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())}
            for key in keys if left.get(key) != right.get(key) or (key in left) != (key in right)}


def reload_payload_proof(baseline: Any, persisted_at_load: Any, runtime_saved_after_load: Any) -> dict[str, Any]:
    """Separate storage retention from proof that the loaded runtime reserialized correctly."""
    storage_differences = core_save_differences(baseline, persisted_at_load)
    runtime_differences = core_save_differences(baseline, runtime_saved_after_load)
    return {
        "storageRetentionDifferences": storage_differences,
        "runtimeReloadDifferences": runtime_differences,
        "storageRetained": not storage_differences,
        "runtimeSavedMatchesBaseline": not runtime_differences,
        "accepted": not storage_differences and not runtime_differences,
    }


def validate_controlled_fixture_case(case: Any) -> dict[str, Any]:
    """Require target-specific visible evidence and actual visible operations."""
    if not isinstance(case, dict) or not isinstance(case.get("name"), str) or not case["name"].strip():
        raise ValueError("Controlled fixture requires a nonempty name")
    expected = case.get("expectedVisible")
    operations = case.get("operations")
    after_reload = case.get("expectedAfterReload", expected)
    if not isinstance(expected, list) or not expected or any(not isinstance(item, str) or not item.strip() for item in expected):
        raise ValueError(f"Fixture {case.get('name')} requires nonempty expectedVisible labels")
    if not isinstance(operations, list) or not operations:
        raise ValueError(f"Fixture {case.get('name')} requires at least one expected visible operation")
    for operation in operations:
        if not isinstance(operation, dict) or not all(isinstance(operation.get(key), str) and operation[key].strip()
                                                       for key in ("buttonLabel", "expectedVisibleAfter")):
            raise ValueError(f"Fixture {case['name']} operation requires buttonLabel and expectedVisibleAfter")
    if not isinstance(after_reload, list) or not after_reload or any(not isinstance(item, str) or not item.strip() for item in after_reload):
        raise ValueError(f"Fixture {case['name']} requires nonempty expectedAfterReload labels")
    if not isinstance(case.get("storageState"), str) or not isinstance(case.get("sha256"), str):
        raise ValueError(f"Fixture {case['name']} requires storageState and sha256")
    return {"expectedVisible": expected, "operations": operations, "expectedAfterReload": after_reload}


def reload_due(mode: str, elapsed_seconds: float, already_done: bool, next_scheduled: float) -> bool:
    """Regression always gets one reload; longer lanes use their normal schedule."""
    return (mode == "regression" and not already_done) or elapsed_seconds >= next_scheduled

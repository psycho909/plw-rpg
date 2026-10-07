"""Shared provenance, HTTP, telemetry, and artifact support for Phase 5 QA.

This module does not start a browser or modify a save by itself.
"""
from __future__ import annotations

from datetime import datetime, timezone
from html.parser import HTMLParser
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit
from urllib.request import urlopen
from typing import Any


SAVE_KEY = "oakvale-v1"
BUILD_INPUTS = ("package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "index.html")


def sha_bytes(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def file_map(root: Path, directory: str) -> dict[str, str]:
    base = root / directory
    if not base.is_dir():
        return {}
    files = sorted((path for path in base.rglob("*") if path.is_file()),
                   key=lambda path: path.relative_to(root).as_posix())
    return {path.relative_to(root).as_posix(): sha_file(path) for path in files}


def mapping_fingerprint(values: dict[str, str]) -> str:
    body = json.dumps(values, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return sha_bytes(body)


def git_head(root: Path) -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()


def provenance(root: Path, build_status: Path, owned_files: list[Path]) -> dict[str, Any]:
    """Fingerprint all src files (tracked and untracked), build inputs, dist, and harness helpers."""
    source = file_map(root, "src")
    inputs = {name: sha_file(root / name) for name in BUILD_INPUTS if (root / name).is_file()}
    dist = file_map(root, "dist")
    return {
        "head": git_head(root),
        "sourceSha256": source,
        "sourceFingerprint": mapping_fingerprint(source),
        "buildInputsSha256": inputs,
        "buildInputsFingerprint": mapping_fingerprint(inputs),
        "distSha256": dist,
        "distFingerprint": mapping_fingerprint(dist),
        "buildStatusPath": str(build_status.resolve()),
        "buildStatusSha256": sha_file(build_status),
        "ownedHarnessAndHelperSha256": {
            str(path.resolve().relative_to(root.resolve())): sha_file(path) for path in owned_files
        },
        "recordedReportsSha256": sha_file(root / "scripts/recorded_reports.py"),
    }


def validate_build(root: Path, build_status: Path) -> dict[str, Any]:
    if not build_status.is_file():
        raise RuntimeError(f"Missing production build status: {build_status}")
    status = json.loads(build_status.read_text(encoding="utf-8"))
    source = file_map(root, "src")
    inputs = {name: sha_file(root / name) for name in BUILD_INPUTS if (root / name).is_file()}
    dist = file_map(root, "dist")
    if status.get("exitCode") != 0 or status.get("sourceStableDuringRun") is not True:
        raise RuntimeError("Production build status is not successful and source-stable")
    if status.get("sourceSha256") != source:
        raise RuntimeError("Build source manifest differs from recursive current src/ (including untracked files)")
    if status.get("buildInputs") != inputs:
        raise RuntimeError("Build input/config manifest differs from current files")
    if status.get("distSha256") != dist:
        raise RuntimeError("Build dist asset manifest differs from current dist/")
    return status


class ReferencedAssets(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.paths: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        raw = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        path = urlsplit(raw or "").path.lstrip("/")
        if path.endswith((".js", ".css")):
            self.paths.append(path)


def http_bytes(url: str) -> tuple[int, bytes]:
    with urlopen(url, timeout=8) as response:
        return response.status, response.read()


def verify_http_dist(root: Path, url: str, build_status: dict[str, Any]) -> dict[str, Any]:
    status, index = http_bytes(url + "/")
    disk_index = (root / "dist/index.html").read_bytes()
    if status != 200 or index != disk_index:
        raise RuntimeError(f"Served index differs from dist bytes (HTTP {status})")
    parser = ReferencedAssets()
    parser.feed(index.decode("utf-8"))
    if not parser.paths or len(set(parser.paths)) != len(parser.paths):
        raise RuntimeError("Production index has no unique JS/CSS assets")
    dist = build_status.get("distSha256", {})
    verified = []
    for relative in parser.paths:
        disk_path = (root / "dist" / relative).resolve()
        if root.joinpath("dist").resolve() not in disk_path.parents or not disk_path.is_file():
            raise RuntimeError(f"Invalid or missing production asset: {relative}")
        code, body = http_bytes(url + "/" + relative)
        expected = disk_path.read_bytes()
        digest = sha_bytes(expected)
        if code != 200 or body != expected or dist.get(f"dist/{relative}") != digest:
            raise RuntimeError(f"HTTP, dist, or build-status asset bytes differ: {relative}")
        verified.append({"path": relative, "status": code, "bytes": len(body), "sha256": digest})
    code, favicon = http_bytes(url + "/favicon.ico")
    if code != 204 or favicon:
        raise RuntimeError(f"Owned server favicon response must be empty HTTP 204; got {code}/{len(favicon)}")
    return {"index": {"status": status, "bytes": len(index), "sha256": sha_bytes(index)},
            "assets": verified, "favicon": {"status": code, "bytes": 0}}


def append_jsonl(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as output:
        output.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
        output.flush()
        os.fsync(output.fileno())


def publish_recorded(root: Path, path: Path, payload: dict[str, Any], producer: str) -> None:
    sys.path.insert(0, str(root))
    from scripts.recorded_reports import write_recorded
    write_recorded(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n", producer=producer)


def attach_early_error_capture(page: Any) -> None:
    """Install before navigation: storage writes, rejected promises, and original save observation."""
    page.add_init_script("""(() => {
      window.__qaStorageErrors = [];
      window.__qaRejections = [];
      try {
        const save = localStorage.getItem('oakvale-v1');
        window.__qaPreAppSaveObservation = {readyState: document.readyState, present: save !== null, error: null};
      } catch (error) {
        window.__qaPreAppSaveObservation = {readyState: document.readyState, present: null, error: String(error)};
      }
      const original = Storage.prototype.setItem;
      window.__qaSaveLatency = [];
      Storage.prototype.setItem = function(key, value) {
        const started = performance.now();
        try { return original.call(this, key, value); }
        catch (error) { if (key === 'oakvale-v1') window.__qaStorageErrors.push(String(error)); throw error; }
        finally { if (key === 'oakvale-v1') window.__qaSaveLatency.push(performance.now() - started); }
      };
      addEventListener('unhandledrejection', event => window.__qaRejections.push(String(event.reason)));
    })();""")


def owned_http_server_code() -> str:
    """HTTP server with the single known favicon response and ordinary behavior for all other requests."""
    return r'''import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
class Handler(SimpleHTTPRequestHandler):
    def _favicon(self):
        if urlsplit(self.path).path != "/favicon.ico": return False
        self.send_response(204); self.end_headers(); return True
    def do_GET(self):
        if not self._favicon(): super().do_GET()
    def do_HEAD(self):
        if not self._favicon(): super().do_HEAD()
server = ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), partial(Handler, directory=sys.argv[2]))
server.daemon_threads = True
server.serve_forever()
'''


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()

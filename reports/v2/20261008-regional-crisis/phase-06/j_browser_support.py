"""Phase 6-G browser support, adapted from the Phase 5 recorded runner helpers."""
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


def sha_bytes(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def file_map(root: Path, directory: str) -> dict[str, str]:
    base = root / directory
    if not base.is_dir():
        return {}
    paths = sorted((p for p in base.rglob("*") if p.is_file()), key=lambda p: p.relative_to(root).as_posix())
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
        "sourceSha256": source, "sourceFingerprint": fingerprint(source),
        "buildInputsSha256": inputs, "buildInputsFingerprint": fingerprint(inputs),
        "distSha256": dist, "distFingerprint": fingerprint(dist),
        "buildStatusPath": str(build_path.resolve()),
        "buildStatusSha256": sha_file(build_path) if build_path.is_file() else None,
        "buildStatusSourceSha256": json.loads(build_path.read_text(encoding="utf-8")).get("sourceSha256") if build_path.is_file() else None,
        "qaFilesSha256": {p.resolve().relative_to(root.resolve()).as_posix(): sha_file(p) for p in owned_files},
        "recordedReportsSha256": sha_file(root / "scripts/recorded_reports.py"),
    }


def validate_build(root: Path, path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError(f"Missing current production build status: {path}")
    status = json.loads(path.read_text(encoding="utf-8"))
    current = provenance(root, path, [])
    if status.get("exitCode") != 0 or status.get("sourceStableDuringRun") is not True:
        raise RuntimeError("Build status is not successful and source-stable")
    for key in ("headBefore", "headAfter"):
        if status.get(key) != current["head"]: raise RuntimeError(f"Build status {key} differs from current HEAD")
    if status.get("sourceSha256") != current["sourceSha256"]:
        raise RuntimeError("Build source manifest differs from recursive current src/ hashes")
    recorded_inputs=status.get("buildInputs",status.get("inputSha256After",{}))
    if any(recorded_inputs.get(name) != digest for name,digest in current["buildInputsSha256"].items()):
        raise RuntimeError("Build input manifest differs from current files")
    if status.get("distSha256") != current["distSha256"]:
        raise RuntimeError("Build dist manifest differs from current dist/ hashes")
    return status


class Assets(HTMLParser):
    def __init__(self):
        super().__init__(); self.paths: list[str] = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        raw = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        path = urlsplit(raw or "").path.lstrip("/")
        if path.endswith((".js", ".css")): self.paths.append(path)


def http_bytes(url: str):
    with urlopen(url, timeout=8) as response: return response.status, response.read()


def verify_http_dist(root: Path, url: str, build: dict[str, Any]) -> dict[str, Any]:
    status, index = http_bytes(url + "/")
    disk = (root / "dist/index.html").read_bytes()
    if status != 200 or index != disk: raise RuntimeError(f"Served index mismatch ({status})")
    parser = Assets(); parser.feed(index.decode("utf-8"))
    if not parser.paths or len(set(parser.paths)) != len(parser.paths): raise RuntimeError("Missing/duplicate built assets")
    verified = []
    for relative in parser.paths:
        path = (root / "dist" / relative).resolve()
        if root.joinpath("dist").resolve() not in path.parents or not path.is_file(): raise RuntimeError(f"Invalid asset {relative}")
        code, body = http_bytes(url + "/" + relative)
        expected = path.read_bytes(); digest = sha_bytes(expected)
        if code != 200 or body != expected or build.get("distSha256", {}).get(f"dist/{relative}") != digest:
            raise RuntimeError(f"Served/build asset mismatch: {relative}")
        verified.append({"path": relative, "status": code, "bytes": len(body), "sha256": digest})
    return {"index": {"status": status, "bytes": len(index), "sha256": sha_bytes(index)}, "assets": verified}


def append_jsonl(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as output:
        output.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
        output.flush(); os.fsync(output.fileno())


def publish(root: Path, path: Path, payload: dict[str, Any], producer: str) -> None:
    sys.path.insert(0, str(root))
    from scripts.recorded_reports import write_recorded
    write_recorded(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n", producer=producer)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def attach_early_capture(page) -> None:
    """Capture save-write latency/errors and rejected promises before app startup."""
    page.add_init_script("""(() => {
      window.__jSaveWrites=[]; window.__jStorageErrors=[]; window.__jUnhandled=[];
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){const start=performance.now();try{return original.call(this,key,value)}
        catch(error){window.__jStorageErrors.push({key,error:String(error)});throw error}
        finally{if(key==='oakvale-v1')window.__jSaveWrites.push({elapsedMs:performance.now()-start,bytes:new TextEncoder().encode(value).length,at:Date.now()})}};
      addEventListener('unhandledrejection',event=>window.__jUnhandled.push(String(event.reason)));
    })();""")


def save_latency_sample(page) -> dict[str, Any]:
    return page.evaluate("""() => ({writes:window.__jSaveWrites||[],storageErrors:window.__jStorageErrors||[],
      unhandledRejections:window.__jUnhandled||[]})""")

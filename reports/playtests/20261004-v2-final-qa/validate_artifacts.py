"""Verify frozen app source and lossless QA report archives.

Run from the repository root after report writers and playtests are closed:
  python3 -B reports/playtests/20261004-v2-final-qa/validate_artifacts.py
  python3 -B reports/playtests/20261004-v2-final-qa/validate_artifacts.py --self-test

Self-test uses temporary synthetic files only. Full validation publishes its two JSON
projections through scripts.recorded_reports.write_recorded.
"""
from __future__ import annotations

import argparse
import base64
from contextlib import contextmanager
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys
import tempfile
import zlib

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(OUT / "review"))

import package_large_archives as archive_tools
from scripts.recorded_reports import decode_record, write_recorded

REQUIRED = [
    "README.md", "baseline.md", "regression.md", "browser-soak.md",
    "agent-playtest-life.md", "agent-playtest-adventure.md", "agent-playtest-hybrid.md",
    "long-term.md", "performance.md", "fun-signal-audit.md", "human-fun-gate.md", "final-review.md",
]
SHARD_NAME = re.compile(r"^playlog\.jsonl\.gz\.part-(\d+)$")
SELF_REFERENTIAL = {"artifact-integrity.json", "artifact-manifest.json"}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _archive_groups() -> dict[str, dict]:
    groups: dict[str, dict] = {}
    for path in sorted(OUT.rglob("*")):
        if not path.is_file() or "__pycache__" in path.parts:
            continue
        if path.name == "playlog.jsonl":
            logical = path
            groups.setdefault(str(logical.relative_to(OUT)), {"logical": logical, "raw": None, "direct": None, "parts": []})["raw"] = path
        elif path.name == "playlog.jsonl.gz":
            logical = path.with_name("playlog.jsonl")
            groups.setdefault(str(logical.relative_to(OUT)), {"logical": logical, "raw": None, "direct": None, "parts": []})["direct"] = path
        else:
            match = SHARD_NAME.fullmatch(path.name)
            if match:
                logical = path.with_name("playlog.jsonl")
                groups.setdefault(str(logical.relative_to(OUT)), {"logical": logical, "raw": None, "direct": None, "parts": []})["parts"].append((int(match.group(1)), path))
    for group in groups.values():
        group["parts"].sort(key=lambda item: item[0])
    return groups


@contextmanager
def _open_logical(group: dict):
    if group["raw"] is not None:
        with group["raw"].open("rb") as stream:
            yield stream
    elif group["direct"] is not None:
        with gzip.open(group["direct"], "rb") as stream:
            yield stream
    else:
        parts = [path for _, path in group["parts"]]
        with archive_tools.open_gzip_parts(parts) as stream:
            yield stream


def _compressed_parts(group: dict) -> list[Path]:
    if group["direct"] is not None and group["parts"]:
        raise ValueError("both playlog.jsonl.gz and gzip shards are present")
    if group["direct"] is not None:
        return [group["direct"]]
    if group["parts"]:
        indexes = [index for index, _ in group["parts"]]
        if indexes != list(range(1, len(indexes) + 1)):
            raise ValueError(f"gzip shard sequence has a gap or does not start at 1: {indexes}")
        return [path for _, path in group["parts"]]
    return []


def _hash_concatenated_files(paths: list[Path]) -> tuple[int, str]:
    h = hashlib.sha256()
    size = 0
    for path in paths:
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                h.update(chunk)
                size += len(chunk)
    return size, h.hexdigest()


def _latest_projection(path: Path, body: str) -> bool:
    return path.is_file() and path.read_bytes() == body.encode("utf-8")


def _read_archive(group: dict, archive_errors: list) -> dict:
    logical = group["logical"]
    logical_name = str(logical.relative_to(OUT))
    raw = group["raw"]
    gzip_parts = _compressed_parts(group)
    errors = archive_errors
    raw_info = None
    gzip_info = None
    if raw is not None:
        raw_size = raw.stat().st_size
        raw_info = {"path": str(raw.relative_to(OUT)), "bytes": raw_size, "sha256": digest(raw)}
        if raw_size >= archive_tools.MAX_SINGLE_BLOB_BYTES and not gzip_parts:
            errors.append({"kind": "oversized-raw-without-gzip", "file": logical_name, "bytes": raw_size})
    if gzip_parts:
        for path in gzip_parts:
            size = path.stat().st_size
            if size >= archive_tools.MAX_SINGLE_BLOB_BYTES:
                errors.append({"kind": "gzip-file-at-or-over-single-blob-limit", "file": str(path.relative_to(OUT)), "bytes": size})
        compressed_size, compressed_hash = _hash_concatenated_files(gzip_parts)
        expanded_size, expanded_hash = archive_tools.sha256_gzip_parts(gzip_parts)
        gzip_info = {
            "paths": [str(path.relative_to(OUT)) for path in gzip_parts],
            "compressedBytes": compressed_size,
            "compressedSha256": compressed_hash,
            "expandedBytes": expanded_size,
            "expandedSha256": expanded_hash,
        }
        if raw_info is not None and (raw_info["bytes"], raw_info["sha256"]) != (expanded_size, expanded_hash):
            errors.append({"kind": "plain-gzip-logical-mismatch", "file": logical_name, "plainBytes": raw_info["bytes"], "plainSha256": raw_info["sha256"], "gzipExpandedBytes": expanded_size, "gzipExpandedSha256": expanded_hash})
    if raw_info is None and gzip_info is None:
        errors.append({"kind": "archive-has-no-readable-representation", "file": logical_name})
        return {"file": logical_name, "rawPresent": False, "representations": [], "versions": 0, "latestProjectionsMatched": 0, "actualSourceCommitsByReport": {}}

    latest = {}
    evidence: dict[str, set[str]] = {}
    count = 0
    with _open_logical(group) as stream:
        for line_number, line in enumerate(stream, 1):
            try:
                entry = json.loads(line.decode("utf-8"))
                body = decode_record(entry)
                name = entry["file"]
                if not isinstance(name, str) or Path(name).name != name or name in {"", ".", ".."}:
                    raise ValueError("record projection name must be one safe filename")
                latest[name] = body
                count += 1
                try:
                    _source_value = json.loads(body)
                except (TypeError, json.JSONDecodeError):
                    pass
                else:
                    archive_tools._source_commits(_source_value, name, evidence)
            except Exception as exc:
                errors.append({"kind": "archive-invalid", "file": logical_name, "line": line_number, "error": str(exc)})

    matched = 0
    for name, body in latest.items():
        projection = logical.parent / name
        if not _latest_projection(projection, body):
            errors.append({"kind": "latest-projection-mismatch", "file": str(projection.relative_to(OUT))})
        else:
            matched += 1
    return {
        "file": logical_name,
        "rawPresent": raw is not None,
        "representations": [item for item in (raw_info, gzip_info) if item is not None],
        "versions": count,
        "latestProjectionsMatched": matched,
        "actualSourceCommitsByReport": {name: sorted(commits) for name, commits in sorted(evidence.items())},
        "actualSourceCommitStatus": "explicit-report-labels-found" if evidence else "not-established-by-record-content",
    }


def _load_archive_metadata(errors: list) -> tuple[dict[str, dict], dict | None]:
    path = OUT / "review" / "archive-packaging.json"
    if not path.is_file():
        return {}, None
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append({"kind": "archive-packaging-metadata-invalid", "error": str(exc)})
        return {}, None
    records = {}
    for item in document.get("archives", []):
        raw_name = item.get("originalRawPath")
        if not isinstance(raw_name, str):
            errors.append({"kind": "archive-packaging-metadata-invalid", "error": "archive entry has no originalRawPath"})
            continue
        raw_path = (OUT / raw_name).resolve()
        try:
            raw_path.relative_to(OUT)
        except ValueError:
            errors.append({"kind": "archive-packaging-metadata-invalid", "file": raw_name, "error": "originalRawPath escapes QA output"})
            continue
        if raw_path.name != "playlog.jsonl":
            errors.append({"kind": "archive-packaging-metadata-invalid", "file": raw_name, "error": "originalRawPath is not a playlog.jsonl"})
            continue
        records[raw_name] = item
    return records, document


def _validate_archive_metadata(records: dict[str, dict], document: dict | None, groups: dict[str, dict], summaries: dict[str, dict], errors: list) -> None:
    if document is None:
        if any(group["direct"] is not None or group["parts"] for group in groups.values()):
            errors.append({"kind": "gzip-without-packaging-metadata"})
        return
    build_manifest = json.loads((OUT / "build-manifest.json").read_text(encoding="utf-8"))
    for raw_name, item in records.items():
        group = groups.get(raw_name)
        summary = summaries.get(raw_name)
        if group is None or summary is None or not summary["rawPresent"] and not summary["representations"]:
            errors.append({"kind": "archive-metadata-representation-missing", "file": raw_name})
            continue
        actual_paths = [path for _, path in group["parts"]]
        if group["direct"] is not None:
            actual_paths = [group["direct"]]
        expected_parts = item.get("compressedParts", [])
        expected_paths = [part.get("path") for part in expected_parts]
        actual_rel = [str(path.relative_to(OUT)) for path in actual_paths]
        if expected_paths != actual_rel:
            errors.append({"kind": "archive-metadata-parts-mismatch", "file": raw_name, "metadataParts": expected_paths, "actualParts": actual_rel})
        for part, expected in zip(actual_paths, expected_parts):
            actual_size = part.stat().st_size
            actual_hash = digest(part)
            if actual_size != expected.get("bytes") or actual_hash != expected.get("sha256"):
                errors.append({"kind": "archive-compressed-part-hash-mismatch", "file": str(part.relative_to(OUT))})
        compressed_size, compressed_hash = _hash_concatenated_files(actual_paths) if actual_paths else (0, "")
        if (compressed_size, compressed_hash) != (item.get("compressedBytes"), item.get("compressedSha256")):
            errors.append({"kind": "archive-compressed-hash-mismatch", "file": raw_name})
        expanded_size = summary["representations"][-1].get("expandedBytes") if summary["representations"] and "expandedBytes" in summary["representations"][-1] else None
        expanded_hash = summary["representations"][-1].get("expandedSha256") if summary["representations"] and "expandedSha256" in summary["representations"][-1] else None
        if (expanded_size, expanded_hash) != (item.get("originalRawBytes"), item.get("originalRawSha256")):
            errors.append({"kind": "archive-original-hash-mismatch", "file": raw_name})
        raw_path = OUT / raw_name
        if raw_path.exists():
            if (raw_path.stat().st_size, digest(raw_path)) != (item.get("originalRawBytes"), item.get("originalRawSha256")):
                errors.append({"kind": "archive-raw-source-hash-mismatch", "file": raw_name})
        if item.get("collectionSourceCommit") != document.get("collectionSourceCommit"):
            errors.append({"kind": "collection-source-provenance-mismatch", "file": raw_name})
        if item.get("collectionSourceCommit") != build_manifest.get("sourceCommit"):
            errors.append({"kind": "collection-source-does-not-match-build-manifest", "file": raw_name})
        discovered = summary.get("actualSourceCommitsByReport", {})
        recorded = item.get("actualSourceCommitsByReport", {})
        if discovered != recorded:
            errors.append({"kind": "actual-source-provenance-mismatch", "file": raw_name, "metadata": recorded, "archive": discovered})


def validate() -> dict:
    manifest = json.loads((OUT / "build-manifest.json").read_text(encoding="utf-8"))
    source = manifest["sourceCommit"]
    errors = []
    changed = [
        name for name, expected in manifest["sourceSha256"].items()
        if not (ROOT / name).is_file() or digest(ROOT / name) != expected
    ]
    if changed:
        errors.append({"kind": "app-source-changed", "files": changed})
    required = {}
    for name in REQUIRED:
        path = OUT / name
        present = path.is_file()
        source_present = present and source in path.read_text(encoding="utf-8")
        required[name] = {"exists": present, "sourceCommitPresent": source_present}
        if not all(required[name].values()):
            errors.append({"kind": "required-document", "file": name, **required[name]})

    metadata_records, metadata_document = _load_archive_metadata(errors)
    groups = _archive_groups()
    summaries = {}
    archives = []
    for logical_name, group in sorted(groups.items()):
        try:
            summary = _read_archive(group, errors)
        except Exception as exc:
            errors.append({"kind": "archive-unreadable", "file": logical_name, "error": str(exc)})
            summary = {"file": logical_name, "rawPresent": group["raw"] is not None, "representations": [], "versions": 0, "latestProjectionsMatched": 0, "actualSourceCommitsByReport": {}}
        summaries[logical_name] = summary
        archives.append(summary)
    _validate_archive_metadata(metadata_records, metadata_document, groups, summaries, errors)

    excluded = {"artifact-manifest.json", "artifact-integrity.json"}
    files = {
        str(path.relative_to(OUT)): {"bytes": path.stat().st_size, "sha256": digest(path), "qaCollectionSourceCommit": source}
        for path in sorted(OUT.rglob("*"))
        if path.is_file()
        and path.name not in excluded
        and path.name != "playlog.jsonl"
        and "__pycache__" not in path.parts
    }
    result = {
        "sourceCommit": source,
        "status": "PASS" if not errors else "FAIL",
        "frozenSourceFileCount": len(manifest["sourceSha256"]),
        "changedSourceFiles": changed,
        "requiredDocuments": required,
        "archives": archives,
        "archivePackagingMetadata": {"present": metadata_document is not None, "archiveCount": len(metadata_records)},
        "errors": errors,
        "scope": "Frozen app source and each logical report archive (plain or gzip); raw+gzip copies count once after exact SHA/byte comparison. Fresh clones can validate gzip-only representations and latest projections. Subjective fun remains a separate human gate.",
    }
    write_recorded(
        OUT / "artifact-manifest.json",
        json.dumps({
            "sourceCommit": source,
            "files": files,
            "provenance": "qaCollectionSourceCommit identifies the frozen QA collection build; it is not a claim about each artifact's actual app source. Historical source labels remain in each report record and archive-packaging.json. Absent ignored raw playlogs are not listed as present files; their original path, bytes, and hash are retained in archive-packaging.json.",
            "exclusions": "Manifest/integrity projections and plain playlog.jsonl files are excluded from recursive file hashing. Compressed playlogs and shards are included. Logical archive bytes and every archived version checksum are verified separately.",
        }, ensure_ascii=False, indent=2) + "\n",
        producer="root-artifact-review",
    )
    write_recorded(
        OUT / "artifact-integrity.json",
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        producer="root-artifact-review",
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def _synthetic_entry(file_name: str, body: str, version: int) -> dict:
    data = body.encode("utf-8")
    return {
        "version": 1,
        "id": f"synthetic-{version}",
        "recordedAt": "2026-01-01T00:00:00+00:00",
        "producer": "self-test",
        "kind": "published",
        "file": file_name,
        "encoding": "zlib-base64",
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "content": base64.b64encode(zlib.compress(data)).decode("ascii"),
    }


def self_test() -> dict:
    body1 = json.dumps({"sourceCommit": "441e3c2b435f199a50cb78ee5b19521bcc084593", "view": 1})
    body2 = json.dumps({"sourceCommit": "441e3c2b435f199a50cb78ee5b19521bcc084593", "view": 2})
    raw_bytes = (json.dumps(_synthetic_entry("report.json", body1, 1)) + "\n").encode() + (json.dumps(_synthetic_entry("report.json", body2, 2)) + "\n").encode()
    with tempfile.TemporaryDirectory(prefix="qa-artifact-validator-self-test-") as temp_name:
        temp = Path(temp_name)
        raw = temp / "playlog.jsonl"
        packed = temp / "playlog.jsonl.gz"
        raw.write_bytes(raw_bytes)
        with packed.open("wb") as output:
            with gzip.GzipFile(filename="", fileobj=output, mode="wb", mtime=0) as compressor:
                compressor.write(raw_bytes)
        equality = archive_tools.verify_raw_matches_gzip(raw, [packed])
        if equality != {"bytes": len(raw_bytes), "sha256": hashlib.sha256(raw_bytes).hexdigest()}:
            raise AssertionError("plain/gzip equality check returned unexpected metadata")
        # Simulate a fresh clone with only the compressed archive and verify each record and latest view.
        latest = {}
        count = 0
        with gzip.open(packed, "rb") as stream:
            for line in stream:
                entry = json.loads(line.decode("utf-8"))
                latest[entry["file"]] = decode_record(entry)
                count += 1
        if count != 2 or latest.get("report.json") != body2:
            raise AssertionError("gzip-only archive could not reconstruct all versions/latest projection")
        raw.write_bytes(raw_bytes + b"tamper\n")
        try:
            archive_tools.verify_raw_matches_gzip(raw, [packed])
        except archive_tools.ArchiveMismatchError:
            mismatch_detected = True
        else:
            raise AssertionError("plain/gzip mismatch was not detected")
        packed_bytes = packed.read_bytes()
        middle = len(packed_bytes) // 2
        shard_a = temp / "playlog.jsonl.gz.part-00001"
        shard_b = temp / "playlog.jsonl.gz.part-00002"
        shard_a.write_bytes(packed_bytes[:middle])
        shard_b.write_bytes(packed_bytes[middle:])
        shard_size, shard_hash = archive_tools.sha256_gzip_parts([shard_a, shard_b])
        if (shard_size, shard_hash) != (len(raw_bytes), hashlib.sha256(raw_bytes).hexdigest()):
            raise AssertionError("gzip shards failed byte-stream reconstruction")
    return {
        "status": "PASS",
        "syntheticPlainGzipEquality": True,
        "syntheticMismatchDetection": mismatch_detected,
        "freshCloneGzipOnlyVersions": count,
        "freshCloneGzipOnlyLatestProjection": True,
        "syntheticGzipShardReconstruction": True,
        "repoArtifactsTouched": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true", help="exercise synthetic plain/gzip equality, mismatch, gzip-only reading, and shards")
    args = parser.parse_args()
    if args.self_test:
        print(json.dumps(self_test(), ensure_ascii=False, indent=2))
        return
    result = validate()
    if result["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

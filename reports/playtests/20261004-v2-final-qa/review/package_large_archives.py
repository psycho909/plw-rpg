"""Losslessly gzip a closed, oversized QA playlog without deleting its raw source.

Run from the repository root:
  python3 -B reports/playtests/20261004-v2-final-qa/review/package_large_archives.py self-test
  python3 -B reports/playtests/20261004-v2-final-qa/review/package_large_archives.py verify reports/playtests/20261004-v2-final-qa/path/playlog.jsonl
  python3 -B reports/playtests/20261004-v2-final-qa/review/package_large_archives.py pack reports/playtests/20261004-v2-final-qa/path/playlog.jsonl --writer-closed "closure evidence"

The pack command requires an explicit writer-closed assertion and only accepts source
playlogs at or above the 100 MiB single-file threshold. It keeps the source untouched.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import BinaryIO, Iterable, Iterator

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
REVIEW = Path(__file__).resolve().parent
MAX_SINGLE_BLOB_BYTES = 100 * 1024 * 1024
SHARD_BYTES = MAX_SINGLE_BLOB_BYTES - 1
CHUNK_BYTES = 1024 * 1024
SOURCE_KEYS = {"sourcecommit", "sourcegitcommit", "appsourcecommit", "buildsourcecommit", "sourcerevision", "sourcesha"}
sys.path.insert(0, str(ROOT))


class ArchiveMismatchError(ValueError):
    pass


class _PartConcatenatingRaw(io.RawIOBase):
    """Present byte shards as one read-only stream without assembling another file."""

    def __init__(self, paths: Iterable[Path]):
        super().__init__()
        self._paths = iter(paths)
        self._current: BinaryIO | None = None

    def readable(self) -> bool:
        return True

    def readinto(self, buffer) -> int:
        view = memoryview(buffer)
        total = 0
        while total < len(view):
            if self._current is None:
                try:
                    self._current = next(self._paths).open("rb")
                except StopIteration:
                    break
            count = self._current.readinto(view[total:])
            if count:
                total += count
            else:
                self._current.close()
                self._current = None
        return total

    def close(self) -> None:
        if self._current is not None:
            self._current.close()
            self._current = None
        super().close()


@contextmanager
def open_gzip_parts(paths: list[Path]):
    if not paths:
        raise FileNotFoundError("No gzip archive or gzip shards were found")
    if len(paths) == 1:
        with gzip.open(paths[0], "rb") as source:
            yield source
        return
    buffered = io.BufferedReader(_PartConcatenatingRaw(paths))
    try:
        with gzip.GzipFile(fileobj=buffered, mode="rb") as source:
            yield source
    finally:
        buffered.close()


def sha256_stream(stream: BinaryIO) -> tuple[int, str]:
    digest = hashlib.sha256()
    size = 0
    while True:
        chunk = stream.read(CHUNK_BYTES)
        if not chunk:
            break
        digest.update(chunk)
        size += len(chunk)
    return size, digest.hexdigest()


def sha256_file(path: Path) -> tuple[int, str]:
    with path.open("rb") as source:
        return sha256_stream(source)


def sha256_gzip_parts(paths: list[Path]) -> tuple[int, str]:
    with open_gzip_parts(paths) as source:
        return sha256_stream(source)


def verify_raw_matches_gzip(raw_path: Path, gzip_parts: list[Path]) -> dict:
    raw_size, raw_hash = sha256_file(raw_path)
    expanded_size, expanded_hash = sha256_gzip_parts(gzip_parts)
    if (raw_size, raw_hash) != (expanded_size, expanded_hash):
        raise ArchiveMismatchError(
            "plain and gzip logical archives differ: "
            f"raw={raw_size}/{raw_hash}, gzip-expanded={expanded_size}/{expanded_hash}"
        )
    return {"bytes": raw_size, "sha256": raw_hash}


def gzip_parts_for(raw_path: Path) -> list[Path]:
    direct = raw_path.with_name(raw_path.name + ".gz")
    if direct.is_file():
        return [direct]
    return sorted(
        raw_path.parent.glob(raw_path.name + ".gz.part-*"),
        key=lambda path: int(path.name.rsplit("-", 1)[-1]),
    )


def iter_lines(stream: BinaryIO) -> Iterator[bytes]:
    while True:
        line = stream.readline()
        if not line:
            return
        yield line


def _source_commits(value, report_path: str, found: dict[str, set[str]]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = re.sub(r"[^a-z0-9]", "", str(key).casefold())
            if normalized in SOURCE_KEYS and isinstance(child, str) and re.fullmatch(r"[0-9a-f]{7,40}", child):
                found.setdefault(report_path, set()).add(child)
            _source_commits(child, report_path, found)
    elif isinstance(value, list):
        for child in value:
            _source_commits(child, report_path, found)


def scan_source_provenance(stream: BinaryIO) -> dict:
    """Collect only explicit report source labels; never infer from collection metadata."""
    from scripts.recorded_reports import decode_record

    evidence: dict[str, set[str]] = {}
    scan_errors = []
    scan_error_count = 0
    for line_number, line in enumerate(iter_lines(stream), 1):
        try:
            entry = json.loads(line)
            body = decode_record(entry)
            try:
                parsed = json.loads(body)
            except (TypeError, json.JSONDecodeError):
                continue
            _source_commits(parsed, str(entry.get("file", "<unknown>")), evidence)
        except Exception as exc:
            scan_error_count += 1
            if len(scan_errors) < 20:
                scan_errors.append({"line": line_number, "error": str(exc)})
    return {
        "actualSourceCommitsByReport": {name: sorted(commits) for name, commits in sorted(evidence.items())},
        "actualSourceCommitStatus": "explicit-report-labels-found" if evidence else "not-established-by-record-content",
        "provenanceScanErrorCount": scan_error_count,
        "provenanceScanErrorsSample": scan_errors,
    }


def _resolve_source(raw: str) -> Path:
    supplied = Path(raw)
    candidate = (supplied if supplied.is_absolute() else ROOT / supplied).resolve()
    try:
        candidate.relative_to(OUT)
    except ValueError as exc:
        raise ValueError(f"Source must be inside {OUT}") from exc
    name = re.sub(r"\.gz\.part-\d+$", "", candidate.name)
    if name.endswith(".gz"):
        name = name[:-3]
    return candidate.with_name(name)


def _discover(raw_path: Path) -> tuple[Path | None, list[Path]]:
    raw = raw_path if raw_path.is_file() else None
    parts = gzip_parts_for(raw_path)
    return raw, parts


def verify_command(raw_path: Path) -> dict:
    raw, parts = _discover(raw_path)
    if raw is None and not parts:
        raise FileNotFoundError(f"No raw or gzip archive found for {raw_path}")
    result = {"logicalArchive": str(raw_path.relative_to(OUT)), "representations": []}
    if raw is not None:
        raw_size, raw_hash = sha256_file(raw)
        result["representations"].append({"kind": "plain", "path": str(raw.relative_to(OUT)), "bytes": raw_size, "sha256": raw_hash})
    if parts:
        expanded_size, expanded_hash = sha256_gzip_parts(parts)
        packed_parts = []
        packed_bytes = 0
        for part in parts:
            size, digest = sha256_file(part)
            packed_parts.append({"path": str(part.relative_to(OUT)), "bytes": size, "sha256": digest})
            packed_bytes += size
        result["representations"].append({
            "kind": "gzip" if len(parts) == 1 else "gzip-shards",
            "parts": packed_parts,
            "compressedBytes": packed_bytes,
            "expandedBytes": expanded_size,
            "expandedSha256": expanded_hash,
        })
        if raw is not None:
            result["plainGzipEquality"] = verify_raw_matches_gzip(raw, parts)
    return result


def _collection_source_commit() -> str | None:
    manifest_path = OUT / "build-manifest.json"
    if not manifest_path.is_file():
        return None
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8")).get("sourceCommit")
    except Exception:
        return None


def _write_archive_metadata(record: dict) -> None:
    from scripts.recorded_reports import write_recorded

    path = REVIEW / "archive-packaging.json"
    if path.is_file():
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise ValueError(f"Existing metadata is unreadable; refusing to replace it: {exc}") from exc
    else:
        document = {
            "schemaVersion": 1,
            "collectionSourceCommit": _collection_source_commit(),
            "collectionSourceCommitMeaning": "The latest QA collection/build-manifest source. It does not relabel each historical report's actual app source.",
            "archives": [],
        }
    if any(item.get("originalRawPath") == record["originalRawPath"] for item in document["archives"]):
        raise ValueError(f"Metadata already contains {record['originalRawPath']}; refusing duplicate")
    document["archives"].append(record)
    write_recorded(path, json.dumps(document, ensure_ascii=False, indent=2) + "\n", producer="qa-archive-packaging")


def pack_command(raw_path: Path, closure_evidence: str) -> dict:
    if not closure_evidence.strip():
        raise ValueError("--writer-closed requires a non-empty closure evidence note")
    if not raw_path.is_file():
        raise FileNotFoundError(f"Raw source playlog is missing: {raw_path}")
    initial_stat = raw_path.stat()
    if initial_stat.st_size < MAX_SINGLE_BLOB_BYTES:
        raise ValueError(f"Raw source is {initial_stat.st_size} bytes, below the 100 MiB packaging threshold")
    direct = raw_path.with_name(raw_path.name + ".gz")
    first_part = raw_path.with_name(raw_path.name + ".gz.part-00001")
    if direct.exists() or first_part.exists():
        raise FileExistsError(f"Archive destination already exists beside {raw_path}")
    before_identity = (initial_stat.st_dev, initial_stat.st_ino, initial_stat.st_size, initial_stat.st_mtime_ns)
    raw_digest = hashlib.sha256()
    raw_bytes = 0
    with tempfile.TemporaryDirectory(prefix=".qa-archive-", dir=raw_path.parent) as temp_name:
        temp_dir = Path(temp_name)
        gzip_temp = temp_dir / "packed.gz"
        with raw_path.open("rb") as source, gzip_temp.open("wb") as output:
            with gzip.GzipFile(filename="", fileobj=output, mode="wb", compresslevel=9, mtime=0) as compressor:
                while True:
                    chunk = source.read(CHUNK_BYTES)
                    if not chunk:
                        break
                    raw_digest.update(chunk)
                    raw_bytes += len(chunk)
                    compressor.write(chunk)
            output.flush()
            os.fsync(output.fileno())
        raw_hash = raw_digest.hexdigest()
        after_stat = raw_path.stat()
        after_identity = (after_stat.st_dev, after_stat.st_ino, after_stat.st_size, after_stat.st_mtime_ns)
        after_size, after_hash = sha256_file(raw_path)
        if before_identity != after_identity or (raw_bytes, raw_hash) != (after_size, after_hash):
            raise RuntimeError("Source changed while packaging; no archive was published")
        expanded_size, expanded_hash = sha256_gzip_parts([gzip_temp])
        if (expanded_size, expanded_hash) != (raw_bytes, raw_hash):
            raise ArchiveMismatchError("Compressed archive failed source byte/hash equality check")
        compressed_bytes, compressed_hash = sha256_file(gzip_temp)
        representation_parts = []
        published = []
        if compressed_bytes < MAX_SINGLE_BLOB_BYTES:
            final_path = direct
            os.link(gzip_temp, final_path)
            published.append(final_path)
            part_paths = [final_path]
        else:
            part_paths = []
            with gzip_temp.open("rb") as archive:
                index = 1
                while True:
                    chunk = archive.read(SHARD_BYTES)
                    if not chunk:
                        break
                    temp_part = temp_dir / f"part-{index:05d}"
                    with temp_part.open("xb") as output:
                        output.write(chunk)
                        output.flush()
                        os.fsync(output.fileno())
                    final_part = raw_path.with_name(f"{raw_path.name}.gz.part-{index:05d}")
                    os.link(temp_part, final_part)
                    published.append(final_part)
                    part_paths.append(final_part)
                    index += 1
        try:
            for part in part_paths:
                size, digest = sha256_file(part)
                representation_parts.append({"path": str(part.relative_to(OUT)), "bytes": size, "sha256": digest})
            published_expanded_size, published_expanded_hash = sha256_gzip_parts(part_paths)
            if (published_expanded_size, published_expanded_hash) != (raw_bytes, raw_hash):
                raise ArchiveMismatchError("Published gzip representation failed full equality verification")
            with open_gzip_parts(part_paths) as stream:
                provenance = scan_source_provenance(stream)
            record = {
                "originalRawPath": str(raw_path.relative_to(OUT)),
                "originalRawBytes": raw_bytes,
                "originalRawSha256": raw_hash,
                "compressedRepresentation": "gzip" if len(part_paths) == 1 else "gzip-shards",
                "compressedBytes": compressed_bytes,
                "compressedSha256": compressed_hash,
                "compressedParts": representation_parts,
                "writerClosedAssertion": closure_evidence,
                "sourceStability": "source identity/size/mtime and full SHA-256 were unchanged during packaging",
                "byteEquality": "decompressing the published gzip representation reproduces the original raw bytes exactly",
                "collectionSourceCommit": _collection_source_commit(),
                **provenance,
            }
            _write_archive_metadata(record)
        except Exception:
            for path in published:
                path.unlink(missing_ok=True)
            raise
    return {
        "status": "PASS",
        "originalRawPath": str(raw_path.relative_to(OUT)),
        "originalRawBytes": raw_bytes,
        "originalRawSha256": raw_hash,
        "compressedRepresentation": "gzip" if len(part_paths) == 1 else "gzip-shards",
        "compressedBytes": compressed_bytes,
        "compressedSha256": compressed_hash,
        "compressedParts": representation_parts,
        "collectionSourceCommit": _collection_source_commit(),
        **provenance,
    }


def self_test() -> dict:
    with tempfile.TemporaryDirectory(prefix="qa-archive-self-test-") as temp_name:
        temp = Path(temp_name)
        raw = temp / "sample.jsonl"
        packed = temp / "sample.jsonl.gz"
        body = b'{"file":"report.json","version":1}\n{"file":"report.json","version":2}\n'
        raw.write_bytes(body)
        with packed.open("wb") as output:
            with gzip.GzipFile(filename="", fileobj=output, mode="wb", mtime=0) as compressor:
                compressor.write(body)
        equality = verify_raw_matches_gzip(raw, [packed])
        if equality != {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}:
            raise AssertionError("Synthetic equality metadata mismatch")
        raw.write_bytes(body + b"tamper\n")
        try:
            verify_raw_matches_gzip(raw, [packed])
        except ArchiveMismatchError:
            mismatch_detected = True
        else:
            raise AssertionError("Synthetic plain/gzip mismatch was not detected")
    return {"status": "PASS", "syntheticPlainGzipEquality": True, "syntheticMismatchDetection": mismatch_detected, "repoArtifactsTouched": False}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("self-test", help="verify synthetic equality and mismatch detection")
    verify_parser = subparsers.add_parser("verify", help="hash/decompress archive representations")
    verify_parser.add_argument("path")
    pack_parser = subparsers.add_parser("pack", help="gzip a closed raw playlog without deleting it")
    pack_parser.add_argument("path")
    pack_parser.add_argument("--writer-closed", required=True, metavar="EVIDENCE")
    args = parser.parse_args()
    try:
        if args.command == "self-test":
            result = self_test()
        elif args.command == "verify":
            result = verify_command(_resolve_source(args.path))
        else:
            result = pack_command(_resolve_source(args.path), args.writer_closed)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Validate and losslessly XZ-compress a frozen Phase 4 playlog.

Run only after all report writers are stopped:
  python3 reports/v2/20261006-reward-core/phase-04/snapshot_phase04_playlog.py --confirm-frozen

The source playlog is read-only and remains in place. Outputs live outside
archive/ so this script's recorded manifest cannot alter the snapshot input.
"""
from __future__ import annotations

import argparse
import hashlib
import lzma
import json
import os
from pathlib import Path
import sys
import tempfile
from datetime import datetime, timezone

def find_checkout(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir():
            return candidate
    raise RuntimeError(f"could not find checkout root from {start}")


ROOT = find_checkout(Path(__file__).resolve().parent)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.recorded_reports import decode_record, write_recorded  # noqa: E402


PHASE = Path(__file__).resolve().parent
SOURCE = PHASE / "archive" / "playlog.jsonl"
OUTPUT = PHASE / "evidence-archive"
MAX_SINGLE_XZ = 90_000_000
PART_BYTES = 50_000_000
CHUNK_BYTES = 1024 * 1024
XZ_FILTERS = [{"id": lzma.FILTER_LZMA2, "dict_size": 32 * 1024 * 1024,
               "mode": lzma.MODE_NORMAL, "nice_len": 64, "mf": lzma.MF_BT4,
               "depth": 0}]


def stream_hash(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    total = 0
    with path.open("rb") as stream:
        while block := stream.read(CHUNK_BYTES):
            digest.update(block)
            total += len(block)
    return digest.hexdigest(), total


def validate_and_compress(source: Path, xz_path: Path) -> dict:
    before = source.stat()
    raw_digest = hashlib.sha256()
    raw_bytes = 0
    record_count = 0
    latest_by_file: dict[str, dict] = {}

    with source.open("rb") as raw, lzma.open(
        xz_path, "wb", format=lzma.FORMAT_XZ, check=lzma.CHECK_SHA256,
        filters=XZ_FILTERS,
    ) as xz:
        for line_number, line in enumerate(raw, 1):
            raw_digest.update(line)
            raw_bytes += len(line)
            if not line.endswith(b"\n"):
                raise ValueError(f"line {line_number} has no JSONL newline")
            try:
                entry = json.loads(line)
                body = decode_record(entry).encode("utf-8")
            except Exception as exc:
                raise ValueError(f"invalid recorded report at line {line_number}: {exc}") from exc
            record_count += 1
            latest_by_file[entry["file"]] = {
                "sha256": hashlib.sha256(body).hexdigest(),
                "bytes": len(body),
                "line": line_number,
            }
            xz.write(line)
    with xz_path.open("rb") as compressed:
        os.fsync(compressed.fileno())

    after = source.stat()
    stable = (before.st_size == after.st_size and before.st_mtime_ns == after.st_mtime_ns
              and raw_bytes == after.st_size)
    if not stable:
        raise RuntimeError("source changed during snapshot; discard this output and retry after writers freeze")
    after_sha256, after_bytes = stream_hash(source)
    if after_sha256 != raw_digest.hexdigest() or after_bytes != raw_bytes:
        raise RuntimeError("full source re-hash changed after validation; discard this output")
    latest_matches = []
    latest_missing = []
    latest_mismatches = []
    for name, expected in sorted(latest_by_file.items()):
        projection = source.parent / name
        if not projection.is_file():
            latest_missing.append(name)
            continue
        actual_sha, actual_bytes = stream_hash(projection)
        if actual_sha == expected["sha256"] and actual_bytes == expected["bytes"]:
            latest_matches.append(name)
        else:
            latest_mismatches.append({"file": name, "recordLine": expected["line"],
                                      "expectedSha256": expected["sha256"],
                                      "actualSha256": actual_sha,
                                      "expectedBytes": expected["bytes"],
                                      "actualBytes": actual_bytes})
    return {
        "rawBytes": raw_bytes,
        "rawSha256": raw_digest.hexdigest(),
        "rawBytesAfter": after_bytes,
        "rawSha256After": after_sha256,
        "recordCount": record_count,
        "latestProjectionCheck": {
            "publishedFileCount": len(latest_by_file),
            "matchingProjectionCount": len(latest_matches),
            "matchingProjections": latest_matches,
            "absentProjectionCount": len(latest_missing),
            "absentProjections": latest_missing,
            "mismatchCount": len(latest_mismatches),
            "mismatches": latest_mismatches,
            "interpretation": "Archive record integrity and current-projection matching are separate checks; absent historical projections are reported, not treated as corruption.",
        },
        "sourceSizeBefore": before.st_size,
        "sourceSizeAfter": after.st_size,
        "sourceMtimeNsBefore": before.st_mtime_ns,
        "sourceMtimeNsAfter": after.st_mtime_ns,
    }


def split_file(source: Path, destination_dir: Path, stem: str) -> list[dict]:
    parts = []
    with source.open("rb") as stream:
        index = 1
        while True:
            part = destination_dir / f"{stem}.part-{index:03d}.xzpart"
            remaining = PART_BYTES
            digest = hashlib.sha256()
            written = 0
            with part.open("wb") as out:
                while remaining:
                    block = stream.read(min(CHUNK_BYTES, remaining))
                    if not block:
                        break
                    out.write(block)
                    digest.update(block)
                    written += len(block)
                    remaining -= len(block)
                out.flush()
                os.fsync(out.fileno())
            if not written:
                part.unlink()
                break
            parts.append({"path": part.relative_to(PHASE).as_posix(),
                          "bytes": written, "sha256": digest.hexdigest()})
            index += 1
    return parts


def verify_xz_round_trip(path: Path, expected_sha256: str, expected_bytes: int) -> None:
    digest = hashlib.sha256()
    total = 0
    with lzma.open(path, "rb", format=lzma.FORMAT_XZ) as stream:
        while block := stream.read(CHUNK_BYTES):
            digest.update(block)
            total += len(block)
    if total != expected_bytes or digest.hexdigest() != expected_sha256:
        raise RuntimeError("XZ decompression did not reproduce the original JSONL bytes")


def verify_concatenated_parts(parts: list[dict], expected_sha256: str, expected_bytes: int) -> None:
    digest = hashlib.sha256()
    total = 0
    for part in parts:
        path = PHASE / part["path"]
        with path.open("rb") as stream:
            while block := stream.read(CHUNK_BYTES):
                digest.update(block)
                total += len(block)
    if total != expected_bytes or digest.hexdigest() != expected_sha256:
        raise RuntimeError("concatenated XZ parts differ from the verified original XZ stream")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-frozen", action="store_true",
                        help="assert Root confirmed all archive writers have stopped")
    args = parser.parse_args()
    if not args.confirm_frozen:
        parser.error("refusing to snapshot until Root confirms archive writers are frozen")
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    stem = f"phase04-playlog-{stamp}"
    fd, temp_name = tempfile.mkstemp(prefix=f".{stem}-", suffix=".tmp.xz", dir=OUTPUT)
    os.close(fd)
    temp_xz = Path(temp_name)
    try:
        raw = validate_and_compress(SOURCE, temp_xz)
        xz_sha, xz_bytes = stream_hash(temp_xz)
        verify_xz_round_trip(temp_xz, raw["rawSha256"], raw["rawBytes"])
        manifest = {
            "schemaVersion": 1,
            "status": "VALIDATED_AND_COMPRESSED",
            "createdAtUTC": datetime.now(timezone.utc).isoformat(),
            "source": SOURCE.relative_to(PHASE).as_posix(),
            "validation": "Each JSONL line parsed and checked with scripts.recorded_reports.decode_record; compressed bytes retain original JSONL bytes.",
            **raw,
            "xzBytes": xz_bytes,
            "xzSha256": xz_sha,
            "xzFormat": "XZ",
            "xzPresetBasis": 6,
            "xzPresetNote": "preset 6 tuning with the dictionary explicitly raised to 32 MiB",
            "xzDictionaryBytes": 32 * 1024 * 1024,
            "xzCheck": "SHA-256",
            "roundTripVerified": True,
        }

        if xz_bytes <= MAX_SINGLE_XZ:
            target = OUTPUT / f"{stem}.jsonl.xz"
            os.replace(temp_xz, target)
            manifest["artifactMode"] = "single-xz"
            manifest["artifacts"] = [{"path": target.relative_to(PHASE).as_posix(),
                                      "bytes": xz_bytes, "sha256": xz_sha}]
        else:
            parts = split_file(temp_xz, OUTPUT, stem)
            verify_concatenated_parts(parts, xz_sha, xz_bytes)
            manifest["artifactMode"] = "split-xz-concatenation"
            manifest["partBytesLimit"] = PART_BYTES
            manifest["artifacts"] = parts
            manifest["concatenatedXzSha256"] = xz_sha
            manifest["concatenatedXzBytes"] = xz_bytes

        manifest_path = OUTPUT / f"{stem}.manifest.json"
        body = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
        write_recorded(manifest_path, body, producer="phase04-playlog-snapshot")
        if manifest["artifactMode"] == "single-xz":
            recovery = (f"# Phase 4 playlog recovery\n\n"
                        f"Manifest: `{manifest_path.name}`\n\n"
                        f"The original raw journal remains at `{SOURCE.relative_to(PHASE).as_posix()}`. "
                        f"The validated byte-exact snapshot is `{manifest['artifacts'][0]['path']}`.\n\n"
                        f"Run `xz -dc {manifest['artifacts'][0]['path']} > recovered-playlog.jsonl`, "
                        f"then compare its SHA-256 and byte count with `rawSha256` and `rawBytes` in the manifest.\n")
        else:
            names = " ".join(Path(part["path"]).name for part in manifest["artifacts"])
            recovery = (f"# Phase 4 playlog recovery\n\n"
                        f"Manifest: `{manifest_path.name}`\n\n"
                        f"The original raw journal remains at `{SOURCE.relative_to(PHASE).as_posix()}`. "
                        f"Reassemble the parts in listed order: `cat {names} > recovered-playlog.xz`. "
                        f"Compare the compressed SHA-256 with `concatenatedXzSha256`, then run "
                        f"`xz -dc recovered-playlog.xz > recovered-playlog.jsonl` and compare its SHA-256 "
                        f"and byte count with `rawSha256` and `rawBytes`.\n")
        readme_path = OUTPUT / "README.md"
        write_recorded(readme_path, recovery, producer="phase04-playlog-snapshot")
        print(json.dumps({"manifest": manifest_path.relative_to(PHASE).as_posix(),
                          "recoveryReadme": readme_path.relative_to(PHASE).as_posix(),
                          "rawBytes": raw["rawBytes"], "rawSha256": raw["rawSha256"],
                          "recordCount": raw["recordCount"], "xzBytes": xz_bytes,
                          "artifactMode": manifest["artifactMode"],
                          "artifacts": manifest["artifacts"]}, ensure_ascii=False, indent=2))
    finally:
        temp_xz.unlink(missing_ok=True)


if __name__ == "__main__":
    main()

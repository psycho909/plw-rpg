#!/usr/bin/env python3
"""Offline validation of the normal UI export produced by harness.py."""
from __future__ import annotations

import hashlib, json, sys
from collections import Counter
from datetime import datetime
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

OUT = Path(__file__).resolve().parent
EXPORT = OUT / "oakvale-play-records.json"

def body(record: dict) -> dict:
    return {k: v for k, v in record.items() if k != "ordinal"}

def fingerprints_match(results: dict, expected: dict) -> bool:
    valid_expected = (isinstance(expected, dict) and len(expected) == 3
                      and "index.html" in expected
                      and sum(name.startswith("assets/") and name.endswith(".js") for name in expected) == 1
                      and sum(name.startswith("assets/") and name.endswith(".css") for name in expected) == 1
                      and all(isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value)
                              for value in expected.values()))
    return bool(valid_expected and all(results.get(name) == expected
                                       for name in ("fingerprintStart", "fingerprintEnd", "buildHashes")))


def main() -> None:
    raw = EXPORT.read_bytes()
    exported = json.loads(raw.decode("utf-8"))
    results = json.loads((OUT / "results.json").read_text(encoding="utf-8"))
    archive = [r for r in exported.get("records", []) if isinstance(r, dict)]
    pending = [r for r in exported.get("pending", []) if isinstance(r, dict)]
    archive_by_id = {}
    archive_duplicate_ids = []
    archive_body_mismatches = []
    for row in archive:
        key = row.get("id")
        if key in archive_by_id:
            archive_duplicate_ids.append(key)
            if body(archive_by_id[key]) != body(row): archive_body_mismatches.append(key)
        else: archive_by_id[key] = row
    pending_by_id = {}
    pending_duplicate_ids = []
    pending_body_mismatches = []
    for row in pending:
        key = row.get("id")
        if key in pending_by_id:
            pending_duplicate_ids.append(key)
            if body(pending_by_id[key]) != body(row): pending_body_mismatches.append(key)
        else: pending_by_id[key] = row
    overlap = sorted(set(archive_by_id) & set(pending_by_id))
    overlap_mismatches = [key for key in overlap if body(archive_by_id[key]) != body(pending_by_id[key])]

    ordinals = [r.get("ordinal") for r in archive]
    ordinal_valid = all(isinstance(x, int) and x > 0 for x in ordinals)
    ordinal_sorted = ordinal_valid and ordinals == sorted(ordinals)
    ordinal_contiguous = ordinal_sorted and ordinals == list(range(1, len(ordinals) + 1))

    unique_records = dict(archive_by_id)
    for key, row in pending_by_id.items():
        unique_records.setdefault(key, row)
    archive_order = sorted(archive_by_id.values(), key=lambda r: r.get("ordinal", 0))
    archive_position = {r.get("id"): i for i, r in enumerate(archive_order)}
    merged = sorted(unique_records.values(), key=lambda r: (
        r.get("at", -1), archive_position.get(r.get("id"), len(archive_order)),
        r.get("from", -1), r.get("to", -1)))
    chain_gaps = []
    for i, (previous, current) in enumerate(zip(merged, merged[1:]), start=1):
        if previous.get("to") != current.get("from"):
            chain_gaps.append({"index": i, "previousId": previous.get("id"), "previousTo": previous.get("to"),
                               "currentId": current.get("id"), "currentFrom": current.get("from"),
                               "delta": (current.get("from", 0) - previous.get("to", 0)),
                               "previousKind": previous.get("kind"), "currentKind": current.get("kind")})
    checkpoint = exported.get("checkpoint") or {}
    journal = checkpoint.get("playJournal") or {}
    checkpoint_world_time = checkpoint.get("worldTime")
    initial_world_time = (results.get("initialGameState") or {}).get("worldTime")
    first = merged[0] if merged else None
    last = merged[-1] if merged else None
    chain = {
        "mergedRecordCount": len(merged), "recordKinds": dict(Counter(r.get("kind") for r in merged)),
        "worldIds": sorted({r.get("worldId") for r in merged}), "checkpointWorldId": journal.get("worldId"),
        "initialWorldTime": initial_world_time, "firstFrom": first.get("from") if first else None,
        "firstTo": first.get("to") if first else None, "lastFrom": last.get("from") if last else None,
        "lastTo": last.get("to") if last else None, "exportCheckpointWorldTime": checkpoint_world_time,
        "firstRecordStartsAtInitialTime": first is not None and isinstance(initial_world_time, int) and first.get("from") == initial_world_time,
        "lastRecordEndsAtExportCheckpoint": last is not None and isinstance(checkpoint_world_time, int) and last.get("to") == checkpoint_world_time,
        "continuityGapCount": len(chain_gaps), "continuityGaps": chain_gaps[:100],
        "archiveOrdinalCount": len(ordinals), "archiveOrdinalsStrictlyIncreasing": ordinal_sorted,
        "archiveOrdinalsContiguousFromOne": ordinal_contiguous,
        "archiveDuplicateIdCount": len(archive_duplicate_ids), "archiveBodyMismatchCount": len(archive_body_mismatches),
        "pendingDuplicateIdCount": len(pending_duplicate_ids), "pendingBodyMismatchCount": len(pending_body_mismatches),
        "archivePendingOverlapCount": len(overlap), "archivePendingBodyMismatchCount": len(overlap_mismatches),
        "archiveAvailable": exported.get("archiveAvailable"), "exportedAt": exported.get("exportedAt"),
        "fileBytes": len(raw), "fileSha256": hashlib.sha256(raw).hexdigest(),
        "soakLastSampleWorldTime": ((results.get("observations") or [{}])[-1].get("browser") or {}).get("worldTime"),
        "pausedEndSnapshotWorldTime": (results.get("endSnapshot") or {}).get("worldTime"),
    }
    chain["exportCheckpointDeltaFromLastSoakSample"] = (
        None if chain["soakLastSampleWorldTime"] is None or checkpoint_world_time is None
        else checkpoint_world_time - chain["soakLastSampleWorldTime"])
    chain["endSnapshotDeltaFromExportCheckpoint"] = (
        None if chain["pausedEndSnapshotWorldTime"] is None or checkpoint_world_time is None
        else chain["pausedEndSnapshotWorldTime"] - checkpoint_world_time)
    chain["uniqueRecordIds"] = all(isinstance(k, str) and bool(k) for k in unique_records)
    chain["allRecordsUseCheckpointWorldId"] = all(r.get("worldId") == journal.get("worldId") for r in merged)
    chain["continuityPass"] = (not chain_gaps and chain["firstRecordStartsAtInitialTime"]
                               and chain["lastRecordEndsAtExportCheckpoint"])
    chain["identityPass"] = (chain["uniqueRecordIds"] and not archive_duplicate_ids
                             and not archive_body_mismatches and not pending_duplicate_ids
                             and not pending_body_mismatches and not overlap_mismatches
                             and chain["allRecordsUseCheckpointWorldId"])
    chain["activeUtcDurationSeconds"] = (datetime.fromisoformat(results["endedAtUtc"])
                                         - datetime.fromisoformat(results["startedAtUtc"])).total_seconds()
    chain["lastSampleElapsedSeconds"] = (results.get("observations") or [{}])[-1].get("elapsedSeconds", 0)
    chain["durationPass"] = (results.get("status") == "completed"
                             and chain["activeUtcDurationSeconds"] >= 7200
                             and chain["lastSampleElapsedSeconds"] >= 7200
                             and results.get("elapsedSeconds", 0) >= 7200
                             and len(results.get("observations", [])) >= 120)
    expected_build = json.loads((OUT.parents[1] / "baseline/final-manifest.json").read_text())["buildHashes"]
    chain["fingerprintPass"] = fingerprints_match(results, expected_build)
    chain["expectedBuildHashes"] = expected_build
    chain["exportHashPass"] = chain["fileSha256"] == results.get("exportSha256")
    chain["snapshotPass"] = (chain["endSnapshotDeltaFromExportCheckpoint"] == 0
                             and chain["exportCheckpointDeltaFromLastSoakSample"] is not None
                             and chain["exportCheckpointDeltaFromLastSoakSample"] >= 0)
    chain["pass"] = all(chain[k] for k in (
        "continuityPass", "identityPass", "archiveOrdinalsContiguousFromOne",
        "durationPass", "fingerprintPass", "exportHashPass", "snapshotPass")) and exported.get("archiveAvailable") is True
    text = json.dumps(chain, ensure_ascii=False, indent=2) + "\n"
    write_recorded(OUT / "export-chain-validation.json", text, producer="root-clean-soak-validator")
    print(text, end="")
    raise SystemExit(0 if chain["pass"] else 1)

if __name__ == "__main__": main()

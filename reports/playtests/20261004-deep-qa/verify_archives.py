"""Read-only reconciliation of this QA run's append archives and projections."""
import hashlib
import gzip
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import decode_record


def verify(base):
    seen_ids = set()
    result = {"base": str(base), "archives": [], "failures": []}
    for archive in sorted(base.rglob("playlog.jsonl")):
        latest = {}
        count = 0
        try:
            with archive.open(encoding="utf-8") as stream:
                for number, line in enumerate(stream, 1):
                    entry = json.loads(line)
                    decode_record(entry)
                    if entry["id"] in seen_ids:
                        raise ValueError(f"Duplicate record UUID at line {number}")
                    seen_ids.add(entry["id"])
                    count += 1
                    if entry["kind"] == "published":
                        latest[entry["file"]] = entry["sha256"]
            for name, expected in latest.items():
                projection = archive.parent / name
                digest = hashlib.sha256()
                if projection.is_file():
                    with projection.open("rb") as stream:
                        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                            digest.update(chunk)
                elif projection.with_name(projection.name + ".gz").is_file():
                    # Git transports the losslessly compressed large projection.
                    with gzip.open(projection.with_name(projection.name + ".gz"), "rb") as stream:
                        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                            digest.update(chunk)
                else:
                    raise FileNotFoundError(f"Missing projection or gzip equivalent: {projection}")
                actual = digest.hexdigest()
                if actual != expected:
                    raise ValueError(f"Projection checksum mismatch: {projection}")
            result["archives"].append({"path": str(archive.relative_to(base)), "records": count,
                                       "latestProjections": len(latest), "status": "pass"})
        except Exception as error:
            result["failures"].append({"path": str(archive.relative_to(base)), "error": str(error)})
    result["records"] = len(seen_ids)
    result["status"] = "pass" if not result["failures"] else "fail"
    return result


if __name__ == "__main__":
    result = verify(Path(__file__).resolve().parent)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["status"] == "pass" else 1)

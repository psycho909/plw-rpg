"""Append each published playtest report version before replacing its current view.

No server or protection against filesystem edits. The JSONL is the full local
version archive; the named report is its latest readable projection.
"""
import argparse
import base64
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import uuid
import zlib


@contextmanager
def archive_lock(log, platform=os.name):
    if platform == "nt":
        import msvcrt
        log.seek(0)
        msvcrt.locking(log.fileno(), msvcrt.LK_LOCK, 1)
        try:
            yield
        finally:
            log.seek(0)
            msvcrt.locking(log.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        import fcntl
        fcntl.flock(log, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(log, fcntl.LOCK_UN)


def _append(path, body, producer, kind, project):
    path = Path(path).resolve()
    if path.name == "playlog.jsonl":
        raise ValueError("The version archive cannot be published as a report")
    path.parent.mkdir(parents=True, exist_ok=True)
    data = body.encode("utf-8")
    entry = {"version": 1, "id": str(uuid.uuid4()),
             "recordedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
             "producer": producer, "kind": kind, "file": path.name,
             "encoding": "zlib-base64", "bytes": len(data),
             "sha256": hashlib.sha256(data).hexdigest(),
             "content": base64.b64encode(zlib.compress(data)).decode("ascii")}
    line = (json.dumps(entry, ensure_ascii=False) + "\n").encode("utf-8")
    # Append mode and a directory-wide lock also serialize independent publishers.
    with (path.parent / "playlog.jsonl").open("ab") as log, archive_lock(log):
        log.write(line)
        log.flush()
        os.fsync(log.fileno())
        if project:
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".report-", delete=False) as output:
                    temporary = Path(output.name)
                    output.write(data)
                    output.flush()
                    os.fsync(output.fileno())
                os.replace(temporary, path)
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
    return entry


def write_recorded(path, body, *, producer="playtest"):
    """Publish a version; an archive failure leaves the previous view intact."""
    return _append(path, body, producer, "published", True)


def capture_existing(path, *, producer="initial-capture"):
    """Archive the present version without claiming earlier automatic recording."""
    return _append(path, Path(path).read_text(encoding="utf-8"), producer, "initial-capture", False)


def decode_record(entry):
    data = zlib.decompress(base64.b64decode(entry["content"]))
    if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
        raise ValueError("Recorded report content does not match its checksum")
    return data.decode("utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["publish", "capture"])
    parser.add_argument("path", type=Path)
    parser.add_argument("--producer", default="playtest")
    args = parser.parse_args()
    if args.mode == "capture":
        capture_existing(args.path, producer=args.producer)
    else:
        write_recorded(args.path, sys.stdin.read(), producer=args.producer)

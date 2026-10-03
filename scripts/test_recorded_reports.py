import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from recorded_reports import archive_lock, capture_existing, decode_record, write_recorded


class RecordedReportsTests(unittest.TestCase):
    def test_windows_lock_releases_the_same_byte_after_appending(self):
        calls = []
        with tempfile.TemporaryFile("a+b") as log:
            fake = SimpleNamespace(LK_LOCK=1, LK_UNLCK=2,
                                   locking=lambda fd, mode, size: calls.append((mode, size, log.tell())))
            with patch.dict("sys.modules", {"msvcrt": fake}):
                with archive_lock(log, platform="nt"):
                    log.write(b"published")
                    log.flush()
            self.assertEqual(calls, [(1, 1, 0), (2, 1, 0)])

    def test_versions_survive_republication_and_capture_is_distinct(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"
            write_recorded(path, '{"紀錄": 1}\n', producer="test")
            log = path.parent / "playlog.jsonl"
            first = log.read_bytes()
            write_recorded(path, '{"紀錄": 2}\n', producer="test")
            capture_existing(path)
            self.assertTrue(log.read_bytes().startswith(first))
            entries = [json.loads(line) for line in log.read_text().splitlines()]
            self.assertEqual([e["kind"] for e in entries], ["published", "published", "initial-capture"])
            self.assertEqual([decode_record(e) for e in entries], ['{"紀錄": 1}\n', '{"紀錄": 2}\n', '{"紀錄": 2}\n'])
            self.assertEqual(len({e["id"] for e in entries}), 3)
            self.assertEqual(path.read_text(), '{"紀錄": 2}\n')

    def test_failed_archive_preserves_previous_report(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "report.md"
            write_recorded(path, "previous")
            with patch("recorded_reports.os.fsync", side_effect=OSError("disk failure")):
                with self.assertRaises(OSError):
                    write_recorded(path, "new")
            self.assertEqual(path.read_text(), "previous")

    def test_checksum_detects_damaged_content(self):
        with tempfile.TemporaryDirectory() as directory:
            entry = write_recorded(Path(directory) / "report.md", "record")
            entry["sha256"] = "0" * 64
            with self.assertRaises(ValueError):
                decode_record(entry)


if __name__ == "__main__":
    unittest.main()

"""Isolated import-path regression for the archived final QA entrypoint."""
from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


DRIVER_PATH = Path(__file__).with_name("final-runtime-driver.py").resolve()
ROOT = DRIVER_PATH.parents[5]


class FinalRuntimeStartupTests(unittest.TestCase):
    def test_absolute_entrypoint_can_import_recorded_writer_after_root_confirmation(self):
        code = r"""
import importlib, runpy, sys
from pathlib import Path
driver_path = Path(sys.argv[1])
root = Path(sys.argv[2])
module = runpy.run_path(str(driver_path), run_name='phase4_startup_smoke')
sys.path[:] = [item for item in sys.path if Path(item or '.').resolve() != root]
assert str(root) not in sys.path
module['expose_repo_import_path'](root)
writer = importlib.import_module('scripts.recorded_reports')
assert callable(writer.write_recorded)
print('recorded-writer-import-ok')
"""
        with tempfile.TemporaryDirectory(prefix="phase4-driver-startup-") as cwd:
            result = subprocess.run(
                [sys.executable, "-c", code, str(DRIVER_PATH), str(ROOT)],
                cwd=cwd, text=True, capture_output=True, check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("recorded-writer-import-ok", result.stdout)


if __name__ == "__main__":
    unittest.main()

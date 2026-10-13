"""Assertion-level watchdog regression against immutable HEAD e05 launcher."""
from pathlib import Path
import ast
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[7]
BASELINE = "e05cc78f1ef452e2672df223f2febf48444dcbd3"
SOURCE = subprocess.run(["git", "show", f"{BASELINE}:reports/v2/20261008-content-expansion/phase-07/qa_browser_launcher.py"], cwd=ROOT, check=True, capture_output=True, text=True).stdout

class BaselineWatchdogRegression(unittest.TestCase):
    def test_launcher_wait_is_bounded_by_runner_heartbeat(self):
        tree = ast.parse(SOURCE)
        unbounded_wait_lines = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr == "wait" and isinstance(node.func.value, ast.Name) and node.func.value.id == "runner" and not node.args and not node.keywords:
                unbounded_wait_lines.append(node.lineno)
        print(f"baseline={BASELINE}; unbounded runner.wait() lines={unbounded_wait_lines}")
        self.assertEqual(unbounded_wait_lines, [], "launcher blocks forever without runner heartbeat supervision")

if __name__ == "__main__":
    unittest.main(verbosity=2)

"""Pure producer/consumer contract checks for helper-published reports."""
from __future__ import annotations

import ast
import importlib.util
import json
from pathlib import Path
import unittest


ARCHIVE = Path(__file__).resolve().parent
DRIVER_PATH = ARCHIVE / "final-runtime-driver.py"
SPEC = importlib.util.spec_from_file_location("phase4_final_runtime_driver_reports", DRIVER_PATH)
assert SPEC is not None and SPEC.loader is not None
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


def published_filename(helper: Path) -> str | None:
    tree = ast.parse(helper.read_text(encoding="utf-8"), filename=str(helper))
    out_is_helper_directory = False
    published: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            value = node.value
            if any(isinstance(target, ast.Name) and target.id == "OUT" for target in targets):
                out_is_helper_directory = ast.unparse(value) == "Path(__file__).resolve().parent"
        if isinstance(node, ast.Call) and ast.unparse(node.func) == "write_recorded" and node.args:
            first = node.args[0]
            if (isinstance(first, ast.BinOp) and isinstance(first.op, ast.Div)
                    and isinstance(first.left, ast.Name) and first.left.id == "OUT"
                    and isinstance(first.right, ast.Constant) and isinstance(first.right.value, str)):
                published.add(first.right.value)
    if not out_is_helper_directory or len(published) != 1:
        return None
    return published.pop()


class HelperReportContractTests(unittest.TestCase):
    def test_consumers_point_to_actual_helper_publication_directory(self):
        expected = {
            "verify_browser.py": "browser.json",
            "phase04_stress_browser.py": "stress-browser.json",
            "phase04_adventure_playtest.py": "adventure-agent-playtest.json",
        }
        for helper_name, filename in expected.items():
            with self.subTest(helper=helper_name):
                self.assertEqual(published_filename(ARCHIVE / helper_name), filename)
        self.assertEqual(driver.BROWSER_REPORT_DIR, driver.PHASE / "archive")
        self.assertEqual(driver.BROWSER_REPORT_DIR / "browser.json", ARCHIVE / "browser.json")
        self.assertEqual(driver.BROWSER_REPORT_DIR / "stress-browser.json", ARCHIVE / "stress-browser.json")
        self.assertEqual(driver.BROWSER_REPORT_DIR / "adventure-agent-playtest.json",
                         ARCHIVE / "adventure-agent-playtest.json")

    def test_real_targeted_browser_report_matches_source_harness_and_checks(self):
        report_path = ARCHIVE / "browser.json"
        report = json.loads(report_path.read_text(encoding="utf-8"))
        source = report["source_sha256"]
        final_source = report["finalSourceSha256"]
        self.assertEqual(len(source), 74)
        self.assertEqual(source, final_source)
        self.assertEqual(len(source["src/main.ts"]), 64)
        self.assertEqual(report["sourceCommit"], report["endSourceCommit"])
        parsed = driver.parse_helper_report(
            report_path, source, "reports/v2/20261006-reward-core/phase-04/archive/verify_browser.py")
        validation = driver.validate_targeted_browser_checks(parsed.get("checks"))
        self.assertEqual(validation["status"], "PASS")
        self.assertEqual(len(parsed["checks"]), 20)
        self.assertEqual(parsed["errors"], [])
        self.assertEqual(parsed["status"], "PASS")
        for flag in ("sourceStableDuringRun", "sourceCommitStableDuringRun",
                     "harnessStableDuringRun", "helpersStableDuringRun"):
            with self.subTest(flag=flag):
                self.assertIs(parsed[flag], True)


if __name__ == "__main__":
    unittest.main()

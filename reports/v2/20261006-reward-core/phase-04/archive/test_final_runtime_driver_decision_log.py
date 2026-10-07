"""Pure validation tests for required adaptive-agent decision evidence."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


DRIVER_PATH = Path(__file__).with_name("final-runtime-driver.py")
SPEC = importlib.util.spec_from_file_location("phase4_final_runtime_driver_decision_log", DRIVER_PATH)
assert SPEC is not None and SPEC.loader is not None
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class AdventureDecisionLogTests(unittest.TestCase):
    def test_empty_and_missing_logs_are_rejected(self):
        for value in (None, [], {}):
            with self.subTest(value=value), self.assertRaisesRegex(RuntimeError, "nonempty list"):
                driver.validate_adventure_decision_log(value)

    def test_malformed_entries_and_empty_or_nonstring_fields_are_rejected(self):
        invalid_values = (
            ["decision"],
            [{}],
            [{"wanted": "goal", "why": "reason"}],
            [{"wanted": " ", "why": "reason", "decision": "act"}],
            [{"wanted": "goal", "why": None, "decision": "act"}],
            [{"wanted": "goal", "why": "reason", "decision": ""}],
        )
        for value in invalid_values:
            with self.subTest(value=value), self.assertRaises(RuntimeError):
                driver.validate_adventure_decision_log(value)

    def test_valid_decision_records_are_accepted(self):
        value = [{"wanted": "reach the alpha wolf", "why": "visible goal and recovered HP",
                  "decision": "track alpha wolf"}]
        self.assertEqual(driver.validate_adventure_decision_log(value), 1)


if __name__ == "__main__":
    unittest.main()

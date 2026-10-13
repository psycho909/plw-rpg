"""Focused preparation-only contract tests; no Playwright/browser/network usage."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
PHASE = HERE.parent
sys.path.insert(0, str(PHASE))

from qa_browser_runner import MODE_DURATION_BOUNDS, drain_browser_events  # noqa: E402
from qa_browser_support import (core_save_differences, reload_due, reload_payload_proof,
                                validate_controlled_fixture_case)  # noqa: E402


class BrowserContracts(unittest.TestCase):
    def test_default_regression_requires_and_schedules_normal_reload(self):
        self.assertEqual(MODE_DURATION_BOUNDS["regression"][0], 60)
        self.assertTrue(reload_due("regression", 0, False, 300))
        self.assertFalse(reload_due("regression", 59, True, 300))
        self.assertTrue(reload_due("regression", 300, True, 300))
        self.assertFalse(reload_due("stress", 299, False, 300))
        self.assertTrue(reload_due("stress", 300, False, 300))

    def test_core_reload_comparison_excludes_only_timestamp_and_journal(self):
        before = {"worldSeed": 12, "rngState": 34, "worldTime": 56,
                  "characters": [{"inventory": {"ore": 3}, "equipment": {"weapon": "pike"}}],
                  "npcs": [{"id": "npc-1"}], "crops": [{"cropId": "wheat"}],
                  "threat": {"bossAlive": True, "bossForms": ["elder"]},
                  "reward": {"collection": ["fang"]}, "regionalCrisis": {"phase": "warning"},
                  "history": [{"id": 8}], "lastSavedAt": 100,
                  "playJournal": {"pending": [{"id": "a"}]}}
        after = json.loads(json.dumps(before))
        after["lastSavedAt"] = 200
        after["playJournal"] = {"pending": []}
        self.assertEqual(core_save_differences(before, after), {})
        after["worldTime"] += 1
        self.assertEqual(set(core_save_differences(before, after)), {"worldTime"})

    def test_reload_rejects_changed_runtime_even_when_local_storage_is_unchanged(self):
        before = {"worldSeed": 12, "rngState": 34, "worldTime": 56,
                  "npcs": [{"id": "npc-1", "mood": "calm"}]}
        persisted_at_load = json.loads(json.dumps(before))
        runtime_after_visible_save = json.loads(json.dumps(before))
        runtime_after_visible_save["worldTime"] += 7
        runtime_after_visible_save["npcs"][0]["mood"] = "hostile"
        proof = reload_payload_proof(before, persisted_at_load, runtime_after_visible_save)
        self.assertTrue(proof["storageRetained"])
        self.assertFalse(proof["runtimeSavedMatchesBaseline"])
        self.assertEqual(set(proof["runtimeReloadDifferences"]), {"npcs", "worldTime"})
        self.assertFalse(proof["accepted"])

    def test_reload_accepts_runtime_core_match_with_only_documented_metadata_changes(self):
        before = {"worldSeed": 12, "worldTime": 56, "lastSavedAt": 100,
                  "playJournal": {"pending": [{"id": "a"}]}}
        loaded = json.loads(json.dumps(before))
        runtime = json.loads(json.dumps(before))
        loaded["lastSavedAt"] = 150
        runtime["lastSavedAt"] = 200
        runtime["playJournal"] = {"pending": []}
        proof = reload_payload_proof(before, loaded, runtime)
        self.assertTrue(proof["storageRetained"])
        self.assertTrue(proof["runtimeSavedMatchesBaseline"])
        self.assertTrue(proof["accepted"])

    def test_controlled_fixture_requires_expected_target_operation_and_reload_labels(self):
        valid = {"name": "family-boss", "storageState": "boss.json", "sha256": "abc",
                 "expectedVisible": ["巨獸族首領"],
                 "operations": [{"buttonLabel": "挑戰巨獸", "expectedVisibleAfter": "回合制戰鬥"}],
                 "expectedAfterReload": ["回合制戰鬥", "巨獸族首領"]}
        self.assertEqual(validate_controlled_fixture_case(valid)["expectedVisible"], ["巨獸族首領"])
        for field in ("expectedVisible", "operations", "expectedAfterReload"):
            invalid = dict(valid)
            invalid[field] = []
            with self.subTest(field=field), self.assertRaises(ValueError):
                validate_controlled_fixture_case(invalid)

    def test_browser_events_are_written_once_and_status_is_counter_plus_bounded_tail(self):
        class FakePage:
            def evaluate(self, _script):
                return {"writes": [{"elapsedMs": 1.5, "bytes": 12}],
                        "storageErrors": [], "unhandledRejections": [],
                        "longTasks": [{"duration": index + 51} for index in range(20)]}

        status = {"browserEventCounts": {}, "browserEventTails": {}}
        with tempfile.TemporaryDirectory(dir=HERE) as temporary:
            summary = drain_browser_events(FakePage(), Path(temporary), status)
            raw = [json.loads(line) for line in (Path(temporary) / "browser-events.jsonl").read_text().splitlines()]
        self.assertEqual(len(raw), 21)
        self.assertEqual(status["browserEventCounts"], {"saveWrites": 1, "longTasks": 20})
        self.assertEqual(len(status["browserEventTails"]["longTasks"]), 12)
        self.assertEqual(summary["saveWriteLatencyMs"], {"samples": 1, "max": 1.5, "mean": 1.5})


if __name__ == "__main__":
    unittest.main()

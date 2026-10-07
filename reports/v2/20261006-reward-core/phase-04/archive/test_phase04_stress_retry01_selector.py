import ast
import unittest
from pathlib import Path


ARCHIVE = Path(__file__).resolve().parent
CANDIDATE = ARCHIVE / "phase04_stress_browser_retry01.py"
ORIGINAL = ARCHIVE / "phase04_stress_browser.py"


class StressRetry01SelectorTests(unittest.TestCase):
    def test_retry_uses_the_rendered_boss_button_and_checks_canonical_row_attributes(self):
        module = ast.parse(CANDIDATE.read_text(encoding="utf-8"))
        functions = {node.name: node for node in module.body if isinstance(node, ast.FunctionDef)}
        self.assertIn("boss_track_row", functions)
        source = ast.get_source_segment(CANDIDATE.read_text(encoding="utf-8"), functions["boss_track_row"])
        self.assertIn('page.locator(".wolf-track-row[data-wolf-track][data-rank]")', source)
        self.assertIn('has=page.get_by_role("button", name="北林狼王", exact=True)', source)
        self.assertIn('row.get_attribute("data-wolf-track") != "wolfKing"', source)
        self.assertIn('row.get_attribute("data-rank") != "boss"', source)

    def test_boss_reward_assertion_uses_the_semantic_row_without_quoted_value_selector(self):
        source = CANDIDATE.read_text(encoding="utf-8")
        self.assertIn("boss_row = boss_track_row(page)", source)
        self.assertIn('boss_row.locator("[data-wolf-reward-expectation]")', source)
        self.assertNotIn('.wolf-track-row[data-wolf-track="wolfKing"][data-rank="boss"]', source)

    def test_retry_report_projection_is_separate_and_original_failure_is_preserved(self):
        source = CANDIDATE.read_text(encoding="utf-8")
        original = ORIGINAL.read_text(encoding="utf-8")
        self.assertIn('"stress-browser-retry01.json"', source)
        self.assertIn('"stress-browser.json"', original)
        self.assertIn("boss_row = page.locator", original)


if __name__ == "__main__":
    unittest.main()

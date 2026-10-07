"""Regression test for capturing rendered reward text before dialog teardown."""
import ast
import unittest
from pathlib import Path


ARCHIVE = Path(__file__).resolve().parent
CANDIDATE = ARCHIVE / "phase04_stress_browser_retry01.py"


class DetachedDialogLifecycleTests(unittest.TestCase):
    def test_regression_reproduces_original_read_after_close_failure(self):
        class FakeRewardLocator:
            attached = True

            def locator(self, _selector):
                return self

            def inner_text(self):
                if not self.attached:
                    raise RuntimeError("locator detached after dialog close")
                return "月牙獵矛"

        reward = FakeRewardLocator()
        reward.attached = False  # Original flow closes Escape before reading.
        with self.assertRaisesRegex(RuntimeError, "detached"):
            reward.locator("[data-wolf-reward-expectation]").inner_text()

    def test_reward_text_is_captured_before_close_unloads_the_row(self):
        module = ast.parse(CANDIDATE.read_text(encoding="utf-8"))
        function = next(node for node in module.body
                        if isinstance(node, ast.FunctionDef)
                        and node.name == "capture_boss_reward_before_close")
        isolated = ast.Module(body=[function], type_ignores=[])
        namespace = {"Locator": object}
        exec(compile(isolated, str(CANDIDATE), "exec"), namespace)

        class FakeRewardLocator:
            attached = True

            def locator(self, _selector):
                return self

            def inner_text(self):
                if not self.attached:
                    raise RuntimeError("locator detached after dialog close")
                return "月牙獵矛"

        reward = FakeRewardLocator()

        def close_dialog():
            reward.attached = False

        self.assertEqual(namespace[function.name](reward, close_dialog), "月牙獵矛")
        self.assertFalse(reward.attached)


if __name__ == "__main__":
    unittest.main()

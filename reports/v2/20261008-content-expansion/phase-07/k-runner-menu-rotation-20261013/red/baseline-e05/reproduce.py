"""Behavioral regression repro against immutable baseline HEAD e05."""
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[7]
PHASE = ROOT / "reports/v2/20261008-content-expansion/phase-07"
sys.path.insert(0, str(PHASE))
BASELINE = "e05cc78f1ef452e2672df223f2febf48444dcbd3"
SOURCE = subprocess.run(
    ["git", "show", f"{BASELINE}:reports/v2/20261008-content-expansion/phase-07/qa_browser_runner.py"],
    cwd=ROOT, check=True, capture_output=True, text=True).stdout
namespace = {"__name__": "phase7_baseline_e05_runner", "__file__": str(PHASE / "qa_browser_runner.py")}
exec(compile(SOURCE, f"{BASELINE}:qa_browser_runner.py", "exec"), namespace)


class Button:
    def __init__(self, label):
        self.label = label

    def get_attribute(self, name):
        return self.label if name == "aria-label" else None

    def inner_text(self, timeout=None):
        return self.label

    def is_visible(self):
        return True

    def is_enabled(self):
        return True


class Locator:
    def __init__(self, items=()):
        self.items = list(items)
        self.last = self.items[-1] if self.items else None

    def count(self):
        return len(self.items)

    def nth(self, index):
        return self.items[index]

    def all(self):
        return self.items


class Dialog:
    def __init__(self):
        self.buttons = Locator([Button(label) for label in (
            "地方消息與委託", "這一生", "住所與產業", "角色", "物品", "日誌", "地圖與世界", "世界歷史", "旅人筆記")])

    def get_by_role(self, _role):
        return self.buttons


class Page:
    def __init__(self):
        self.dialog = Dialog()

    def locator(self, _selector):
        return Locator([self.dialog])

    def get_by_role(self, _role):
        return self.dialog.buttons


class BaselineChooserRegression(unittest.TestCase):
    def test_visible_menu_destination_does_not_repeat_three_times(self):
        page = Page()
        chooser = namespace["choose_visible_action"]
        selected = [chooser(page, turn, {})[0].inner_text() for turn in range(1, 4)]
        print(f"baseline={BASELINE}; selected={selected}")
        self.assertEqual(len(set(selected)), 3, "menu chooser repeats its first visible action instead of rotating")


if __name__ == "__main__":
    unittest.main(verbosity=2)

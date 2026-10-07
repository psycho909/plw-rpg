"""Pure RED/GREEN check for the actual controlled-runner gear button labels."""
import re
import unittest


RARITIES = r"(?:普通|精良|稀有|史詩|傳說)"
CAPTURED_ARIA = {
    "spear": "稀有 獵矛 Lv.5",
    "moonFangSpear": "稀有 月牙獵矛 Lv.7",
}
# InventoryWindow.vue renders two adjacent spans: rarity+base, then Lv.N.
# Playwright's has_text filter can see their concatenated textContent without a separator.
CAPTURED_TEXT_NODES = {
    "spear": ("稀有 獵矛", "Lv.5"),
    "moonFangSpear": ("稀有 月牙獵矛", "Lv.7"),
}


class GearSelectorRegexTest(unittest.TestCase):
    def test_red_strict_whitespace_fails_on_adjacent_button_text_nodes(self):
        for base, fragments in CAPTURED_TEXT_NODES.items():
            name = "獵矛" if base == "spear" else "月牙獵矛"
            old = re.compile(rf"^{RARITIES} {name}\s+Lv\.")
            self.assertFalse(old.search("".join(fragments)))

    def test_green_optional_whitespace_matches_captured_aria_and_text_nodes(self):
        for base, aria in CAPTURED_ARIA.items():
            name = "獵矛" if base == "spear" else "月牙獵矛"
            fixed = re.compile(rf"^{RARITIES} {name}\s*Lv\.")
            self.assertRegex(aria, fixed)
            self.assertRegex("".join(CAPTURED_TEXT_NODES[base]), fixed)


if __name__ == "__main__":
    unittest.main(verbosity=2)

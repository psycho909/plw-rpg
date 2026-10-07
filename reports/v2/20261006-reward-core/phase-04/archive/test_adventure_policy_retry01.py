import unittest

from adventure_policy_retry01 import select_target


class TargetGoalSpecificityTests(unittest.TestCase):
    def test_specific_visible_wolf_goal_beats_eligible_generic_label(self):
        eligible = [
            {"label": "灰狼", "definitionId": "grayWolf"},
            {"label": "傷痕灰狼", "definitionId": "scarredWolf"},
        ]
        visible_goal = "追蹤傷痕灰狼，繼續認識北林狼族。"

        target, reason = select_target(eligible, ["grayWolf"], ["grayWolf"], visible_goal)

        self.assertEqual(target["definitionId"], "scarredWolf")
        self.assertIn("visible goal", reason)

    def test_exact_generic_goal_still_selects_generic_target(self):
        eligible = [
            {"label": "灰狼", "definitionId": "grayWolf"},
            {"label": "傷痕灰狼", "definitionId": "scarredWolf"},
        ]

        target, _reason = select_target(eligible, [], [], "追蹤灰狼，繼續認識北林狼族。")

        self.assertEqual(target["definitionId"], "grayWolf")


if __name__ == "__main__":
    unittest.main()

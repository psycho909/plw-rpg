import unittest

from adventure_policy import (choose_gear_candidate, current_baseline, duration_evidence,
                              item_score, page_items, parse_visible_expectation,
                              select_target, slot_from_visible_detail)


def gear(instance_id, *, attack=0, defense=0, affinity=0):
    return {"instanceId": instance_id, "ownerId": "hero", "baseId": "newBossBase",
            "rolledStats": {"attack": attack, "defense": defense, "critical": 0,
                             "penetration": 0, "bleed": 0, "block": 0, "reduction": 0},
            "affinity": affinity}


class AdventurePolicyTests(unittest.TestCase):
    def test_equipped_instance_cannot_be_selected_for_equip_even_with_goal_synergy(self):
        equipped = gear("currently-worn", attack=20)
        candidate = {"item": equipped, "delta": 99, "hasGoalSynergy": True}
        selected, keep = choose_gear_candidate([candidate], {"currently-worn"})
        self.assertIsNone(selected)
        self.assertIsNone(keep)

    def test_unworn_positive_candidate_selected_but_non_upgrade_is_keep_evidence(self):
        upgrade = {"item": gear("new", attack=9), "delta": 2, "hasGoalSynergy": False}
        weak = {"item": gear("weak", attack=4), "delta": -3, "hasGoalSynergy": False}
        selected, keep = choose_gear_candidate([weak, upgrade], set())
        self.assertEqual(selected["item"]["instanceId"], "new")
        self.assertIs(keep, selected)
        selected, keep = choose_gear_candidate([weak], set())
        self.assertIsNone(selected)
        self.assertEqual(keep["item"]["instanceId"], "weak")

    def test_empty_and_legacy_fixed_slots_use_the_actual_save_equipment(self):
        state = {"characters": [{"id": "hero", "equipment": {"weapon": "sword", "armor": "armor"}}],
                 "reward": {"instances": [], "equipped": {}}}
        self.assertEqual(current_baseline(state, "hero", "weapon"),
                         {"score": 7.0, "source": "legacy-fixed-equipment", "legacyEquipment": "sword"})
        self.assertEqual(current_baseline(state, "hero", "armor")["score"], 5.0)
        state["characters"][0]["equipment"]["weapon"] = None
        self.assertEqual(current_baseline(state, "hero", "weapon")["score"], 0.0)

    def test_reward_instance_is_the_same_slot_baseline_when_currently_equipped(self):
        current = gear("worn", attack=11)
        state = {"characters": [{"id": "hero", "equipment": {"weapon": "sword"}}],
                 "reward": {"instances": [current], "equipped": {"hero": {"weapon": "worn"}}}}
        self.assertEqual(current_baseline(state, "hero", "weapon"),
                         {"score": 11.0, "source": "currently-equipped-reward-instance", "instanceId": "worn"})

    def test_page_mapping_preserves_offset_for_items_after_first_twenty(self):
        items = [{"instanceId": str(i)} for i in range(43)]
        visible = page_items(items, page_index=1)
        self.assertEqual(visible[0], (20, items[20]))
        self.assertEqual(visible[-1], (39, items[39]))
        final_page = page_items(items, page_index=2)
        self.assertEqual(final_page, [(40, items[40]), (41, items[41]), (42, items[42])])

    def test_slot_comes_from_visible_comparison_and_supports_new_base_ids(self):
        future_base = gear("future", attack=8)
        self.assertEqual(slot_from_visible_detail(future_base, "Epic · 武器 · Lv.2"), "weapon")
        self.assertEqual(item_score(future_base, "weapon"), 8)
        future_armor = gear("future-armor", defense=7)
        self.assertEqual(slot_from_visible_detail(future_armor, "Rare · 防具 · Lv.3"), "armor")

    def test_visible_boss_forecast_parses_sparse_rarities_and_exclusive_ui_name(self):
        rendered = "若擊退：獵裝 100% · 掉落 Lv.7 · 品質 稀有 85%、史詩 14%、傳說 1% · 首領限定裝備：月牙獵矛"
        expectation = parse_visible_expectation(rendered)
        self.assertEqual(expectation["gearChance"], 1.0)
        self.assertEqual(expectation["rarityChances"], {"rare": .85, "epic": .14, "legendary": .01})
        self.assertEqual(expectation["exclusiveGear"], ["月牙獵矛"])

    def test_visible_stat_delta_controls_upgrade_when_static_rubric_is_negative(self):
        item = gear("visible-upgrade", attack=5)
        candidate = {"item": item, "delta": -99, "hasGoalSynergy": False,
                     "hasVisibleStatImprovement": True}
        selected, _ = choose_gear_candidate([candidate], set())
        self.assertIs(selected, candidate)

    def test_target_policy_uses_readable_goal_then_unseen_collection_and_observed_expectation(self):
        options = [
            {"label": "精英頭狼", "definitionId": "alphaWolf"},
            {"label": "北林狼王", "definitionId": "wolfKing"},
        ]
        target, reason = select_target(options, [], [], "目前目標：北林狼王")
        self.assertEqual(target["definitionId"], "wolfKing")
        self.assertIn("visible goal", reason)
        target, reason = select_target(options, ["alphaWolf"], [], "")
        self.assertEqual(target["definitionId"], "wolfKing")
        self.assertIn("unseen", reason)
        target, reason = select_target(options, ["alphaWolf", "wolfKing"], ["alphaWolf", "wolfKing"], "")
        self.assertIsNone(target)
        self.assertIn("no new visible goal", reason)
        expectations = {
            "alphaWolf": {"gearChance": .6, "rarityChances": {"rare": .8}, "exclusiveGear": []},
            "wolfKing": {"gearChance": 1, "rarityChances": {"epic": .8}, "exclusiveGear": ["moonFangSpear"]},
        }
        target, reason = select_target(options, ["alphaWolf", "wolfKing"], ["alphaWolf", "wolfKing"], "",
                                       reward_expectations=expectations)
        self.assertEqual(target["definitionId"], "wolfKing")
        self.assertIn("expected reward value", reason)
        target, reason = select_target(options, ["alphaWolf", "wolfKing"], ["alphaWolf", "wolfKing"],
                                       "Next: moonFangSpear", reward_expectations=expectations)
        self.assertEqual(target["definitionId"], "wolfKing")
        self.assertIn("exclusive reward", reason)
        self.assertIsNone(select_target([], [], [], "")[0])

    def test_controlled_early_stop_reports_actual_time_without_claiming_30_minutes(self):
        stopped = duration_evidence("STOPPED_BY_CONTROL_FILE", 411.2)
        self.assertFalse(stopped["completed"])
        self.assertIn("actual only: 411.2 seconds", stopped["claim"])
        completed = duration_evidence("PASS", 1800)
        self.assertTrue(completed["completed"])


if __name__ == "__main__":
    unittest.main()

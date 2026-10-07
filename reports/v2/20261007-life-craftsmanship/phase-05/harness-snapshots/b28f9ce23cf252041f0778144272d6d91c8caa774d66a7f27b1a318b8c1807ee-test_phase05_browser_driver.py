"""Focused regressions for the normal-UI browser driver's completion summaries."""
from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import time
import unittest
import re

PHASE = Path(__file__).resolve().parent
sys.path.insert(0, str(PHASE))
import phase05_browser_driver as browser_driver  # noqa: E402
from phase05_browser_driver import (  # noqa: E402
    BrowserDriver, combat_victory_observed, mark_completed_if_in_progress, recipe_skill_locked,
    region_label_from_map_tile, required_smithing_level, resource_action_pattern,
)

ROOT = PHASE.parents[3]
CONFIG_SOURCE = (ROOT / "src/data/config.ts").read_text(encoding="utf-8")
REWARDS_SOURCE = (ROOT / "src/data/rewards.ts").read_text(encoding="utf-8")
WORLD_UI_SOURCE = (ROOT / "src/presentation/worldUI.ts").read_text(encoding="utf-8")
WORLD_MAP_SOURCE = (ROOT / "src/components/WorldMap.vue").read_text(encoding="utf-8")
WORLD_PROJECTION_SOURCE = (ROOT / "src/presentation/worldProjection.ts").read_text(encoding="utf-8")
PLACE_SOURCE = (ROOT / "src/components/PlaceWindow.vue").read_text(encoding="utf-8")
INVENTORY_SOURCE = (ROOT / "src/components/InventoryWindow.vue").read_text(encoding="utf-8")
APP_SOURCE = (ROOT / "src/App.vue").read_text(encoding="utf-8")
DRIVER_SOURCE = (PHASE / "phase05_browser_driver.py").read_text(encoding="utf-8")
REGIONS_SOURCE = CONFIG_SOURCE.split("export const REGIONS", 1)[1].split("export const BUILDINGS", 1)[0]
BUILDINGS_SOURCE = CONFIG_SOURCE.split("export const BUILDINGS", 1)[1].split("export const ITEMS", 1)[0]
REGION_LABELS = dict(re.findall(r"^\s+(\w+): \{ name: '([^']+)'", REGIONS_SOURCE, re.MULTILINE))
BUILDING_LABELS = dict(re.findall(r"^\s+(\w+): \{ name: '([^']+)'", BUILDINGS_SOURCE, re.MULTILINE))


class EmptyLocator:
    def count(self) -> int:
        return 0

    def all_inner_texts(self) -> list[str]:
        return []


class EmptyPage:
    def locator(self, _selector: str) -> EmptyLocator:
        return EmptyLocator()


class TextLocator:
    def __init__(self, text: str = "", attributes: dict[str, str] | None = None, children: dict[str, "TextLocator"] | None = None):
        self.text = text
        self.attributes = attributes or {}
        self.children = children or {}

    def count(self) -> int:
        return 1

    def is_visible(self) -> bool:
        return True

    def is_disabled(self) -> bool:
        return False

    def inner_text(self) -> str:
        return self.text

    def get_attribute(self, name: str) -> str | None:
        return self.attributes.get(name)

    def locator(self, selector: str) -> "TextLocator":
        return self.children.get(selector, EmptyTextLocator())


class EmptyTextLocator(TextLocator):
    def count(self) -> int:
        return 0


class WorldInteractionPage:
    def __init__(self, action_text: str, map_tiles: dict[str, TextLocator]):
        self.action = TextLocator(action_text)
        self.map_tiles = map_tiles

    def locator(self, selector: str) -> TextLocator:
        if selector == ".nearby-trigger":
            return EmptyTextLocator()
        if selector == ".context-action":
            return self.action
        if selector.startswith('.world-map .tile[data-position="'):
            return self.map_tiles.get(selector, EmptyTextLocator())
        return EmptyTextLocator()


class UnsupportedCDP:
    def send(self, command: str) -> dict:
        raise RuntimeError(f"{command} is unavailable")


class BrowserDriverLifecycleTest(unittest.TestCase):
    def make_state(self, *, world_time: int, food: int, fang: int, instances: list[dict]) -> dict:
        return {
            "characters": [{"id": "hero", "inventory": {"food": food}, "gold": 10,
                            "stamina": 20, "skills": {"smithing": {"level": 1}}}],
            "activeCharacterId": "hero", "worldTime": world_time, "rngState": 3,
            "eventSequence": 0, "events": [], "history": [], "playJournal": {"pending": []},
            "reward": {"materials": {"hero": {"wolfFang": fang}}, "instances": instances,
                       "equipped": {"hero": {}}}, "npcs": [], "threat": {}, "dungeon": {},
        }

    def test_life_first_and_second_ten_minute_notes_keep_reward_deltas(self) -> None:
        states = [
            self.make_state(world_time=100, food=2, fang=1, instances=[{"instanceId": "gear-1", "recipeId": "starterSpear"}]),
            self.make_state(world_time=150, food=3, fang=2, instances=[
                {"instanceId": "gear-1", "recipeId": "starterSpear"},
                {"instanceId": "gear-2", "recipeId": "fieldSpear", "baseId": "spear", "rarity": "rare"},
            ]),
        ]
        current = {"state": states[0]}
        with tempfile.TemporaryDirectory() as temp:
            run_dir = Path(temp)
            driver = BrowserDriver(EmptyPage(), run_dir, {"lifeNotes": []}, None)
            driver.started -= 610
            driver.last_life_note = driver.started
            driver.recent_actions = ["visible rest"]
            driver.state = lambda: current["state"]
            driver.workbench_observation = lambda: {"available": False, "selectedMaterial": None}
            driver.control = lambda: {"focus": "balanced"}

            driver.timed_note("life")
            self.assertEqual(len(driver.result["lifeNotes"]), 1)
            self.assertIsNone(driver.last_recipe_choice)

            current["state"] = states[1]
            driver.last_life_note -= 600
            driver.timed_note("life")

        self.assertEqual(len(driver.result["lifeNotes"]), 2)
        second = driver.result["lifeNotes"][1]
        self.assertEqual(second["shortReward"]["inventoryDelta"], {"food": 1})
        self.assertEqual(second["shortReward"]["ownedMaterialDelta"], {"wolfFang": 1})
        self.assertEqual(second["shortReward"]["worldTimeDelta"], 50)
        self.assertEqual(second["shortReward"]["newInstances"][0]["instanceId"], "gear-2")

    def test_hybrid_normal_return_promotes_only_in_progress_to_pass(self) -> None:
        result = {"mode": "hybrid-short", "status": "IN_PROGRESS"}
        mark_completed_if_in_progress(result)
        self.assertEqual(result["status"], "PASS")

    def test_hybrid_blocked_outcome_is_not_overwritten(self) -> None:
        result = {"mode": "hybrid-short", "status": "BLOCKED_TARGETED_CRAFT_PLANNER"}
        mark_completed_if_in_progress(result)
        self.assertEqual(result["status"], "BLOCKED_TARGETED_CRAFT_PLANNER")

    def test_live_planner_smithing_requirement_drives_locked_and_unlocked_policy(self) -> None:
        actual_rendered_copy = "鍛造熟練度\n需求 Lv.3／目前 Lv.1"
        required = required_smithing_level(actual_rendered_copy)
        self.assertEqual(required, 3)
        self.assertTrue(recipe_skill_locked(required, current_level=1))
        self.assertFalse(recipe_skill_locked(required, current_level=3))
        self.assertIsNone(required_smithing_level("鍛造熟練度 —"))

    def test_hybrid_requires_terminal_victory_after_return_encounter(self) -> None:
        start = {"combat": {"enemy": "wolf"}, "eventSequence": 40}
        unfinished = {"combat": {"enemy": "wolf", "hp": 1}, "eventSequence": 41,
                      "events": [{"id": 41, "type": "combat.turn"}]}
        resolved_without_outcome = {"combat": None, "eventSequence": 41,
                                    "events": [{"id": 41, "type": "combat.turn"}]}
        victory = {"combat": None, "eventSequence": 42,
                   "events": [{"id": 42, "type": "combat.won"}]}
        self.assertFalse(combat_victory_observed(start, unfinished))
        self.assertFalse(combat_victory_observed(start, resolved_without_outcome))
        self.assertTrue(combat_victory_observed(start, victory))

    def test_unsupported_profile_commands_are_recorded_as_limitations_not_run_failures(self) -> None:
        result = {"status": "IN_PROGRESS"}
        driver = BrowserDriver(EmptyPage(), Path(tempfile.gettempdir()), result, UnsupportedCDP())
        driver.initialize_profiling()
        self.assertEqual(result["status"], "IN_PROGRESS")
        self.assertEqual(len(result["profilingLimitations"]), 4)
        self.assertFalse(result["profilingCapabilities"]["Memory.getDOMCounters"])

    def test_optional_building_navigation_reports_absent_capability_without_routing(self) -> None:
        result: dict = {}
        driver = BrowserDriver(EmptyPage(), Path(tempfile.gettempdir()), result, None)
        driver.state = lambda: {"settlement": {"buildings": ["house", "store"]},
                                "tiles": [{"building": "tavern"}]}
        routed: list[str] = []
        driver.navigate_place = routed.append

        self.assertFalse(driver.navigate_optional_place("tavern"))
        self.assertEqual(routed, [])
        self.assertEqual(result["optionalSurfaceAvailability"][0]["target"], "tavern")
        self.assertFalse(result["optionalSurfaceAvailability"][0]["available"])

    def test_optional_building_navigation_uses_real_built_target_when_available(self) -> None:
        driver = BrowserDriver(EmptyPage(), Path(tempfile.gettempdir()), {}, None)
        driver.state = lambda: {"settlement": {"buildings": ["house", "tavern"]},
                                "tiles": [{"building": "tavern"}]}
        routed: list[str] = []
        driver.navigate_place = routed.append

        self.assertTrue(driver.navigate_optional_place("tavern"))
        self.assertEqual(routed, ["tavern"])

    def test_pause_clock_closes_dialogs_before_underlying_visible_control(self) -> None:
        driver = BrowserDriver(EmptyPage(), Path(tempfile.gettempdir()), {}, None)
        order: list[str] = []
        closes = iter((True, False))
        driver.close_dialog = lambda: (order.append("close"), next(closes))[1]
        driver.exact_button = lambda _label: TextLocator(attributes={"aria-pressed": "false"})
        driver.act = lambda _locator, _label: order.append("pause")

        driver.pause_clock()

        self.assertEqual(order, ["close", "close", "pause"])

    def test_resource_action_labels_match_icon_prefixed_accessible_names(self) -> None:
        visible_names = {"伐木": "🪵 伐木", "採石": "🪨 採石", "採鐵礦": "⛏️ 採鐵礦"}
        for action, accessible_name in visible_names.items():
            with self.subTest(action=action):
                self.assertIsNone(re.fullmatch(action, accessible_name))
                self.assertIsNotNone(resource_action_pattern(action).search(accessible_name))

    def test_mine_interaction_uses_live_map_region_name(self) -> None:
        mine = REGION_LABELS["mine"]
        tile = TextLocator(attributes={"aria-label": f"18, 7：{mine}"})
        page = WorldInteractionPage(f"⛰️ {mine} Enter 互動", {
            '.world-map .tile[data-position="18,7"]': tile,
        })
        driver = BrowserDriver(page, Path(tempfile.gettempdir()), {}, None)
        driver.state = lambda: {
            "characters": [{"id": "hero", "position": {"x": 18, "y": 7}, "currentRegion": "mine"}],
            "activeCharacterId": "hero",
            "tiles": [{"x": 18, "y": 7, "regionId": "mine", "walkable": True}],
        }
        clicked: list[str] = []
        driver.act = lambda _locator, label, **_kwargs: clicked.append(label)

        driver.nearby("mine")

        self.assertEqual(len(clicked), 1)
        self.assertIn(mine, clicked[0])

    def test_store_interaction_uses_live_building_name(self) -> None:
        store = BUILDING_LABELS["store"]
        tile = TextLocator(
            attributes={"aria-label": f"10, 8：{REGION_LABELS['village']}，{store}"},
            children={".building-name": TextLocator(store)},
        )
        page = WorldInteractionPage(f"🏪 {store} Enter 互動", {
            '.world-map .tile[data-position="10,8"]': tile,
        })
        driver = BrowserDriver(page, Path(tempfile.gettempdir()), {}, None)
        driver.state = lambda: {
            "characters": [{"id": "hero", "position": {"x": 10, "y": 7}, "currentRegion": "village"}],
            "activeCharacterId": "hero",
            "settlement": {"buildings": ["store"]},
            "tiles": [{"x": 10, "y": 8, "regionId": "village", "walkable": True, "building": "store"}],
        }
        clicked: list[str] = []
        driver.act = lambda _locator, label, **_kwargs: clicked.append(label)

        driver.nearby("store")

        self.assertEqual(len(clicked), 1)
        self.assertIn(store, clicked[0])

    def test_farm_route_falls_back_to_actual_farmland_region_id(self) -> None:
        state = {
            "characters": [{"id": "hero", "position": {"x": 0, "y": 0}, "currentRegion": "village"}],
            "activeCharacterId": "hero",
            "tiles": [
                {"x": 0, "y": 0, "regionId": "village", "walkable": True},
                {"x": 1, "y": 0, "regionId": "farmland", "walkable": True},
            ],
        }
        driver = BrowserDriver(EmptyPage(), Path(tempfile.gettempdir()), {}, None)
        driver.state = lambda: state
        driver.exact_button = lambda label: label
        clicked: list[str] = []
        driver.act = lambda _locator, label, **_kwargs: clicked.append(label)

        driver.route_to("farm")

        self.assertEqual(len(clicked), 1)
        self.assertIn("farm", clicked[0])

    def test_region_name_parser_uses_current_source_registry_labels(self) -> None:
        self.assertGreaterEqual(len(REGION_LABELS), 5)
        for index, name in enumerate(REGION_LABELS.values()):
            with self.subTest(region=name):
                self.assertEqual(region_label_from_map_tile(f"18, 7：{name}，當前地標", 18, 7), name)

    def test_world_interaction_labels_are_exposed_from_the_live_ui_registry(self) -> None:
        self.assertIn("label: REGIONS[region].name", WORLD_UI_SOURCE)
        self.assertIn("label: BUILDINGS[id].name", WORLD_UI_SOURCE)
        self.assertIn(':aria-label="cell.label"', WORLD_MAP_SOURCE)
        self.assertIn(':data-position="cell.key"', WORLD_MAP_SOURCE)
        self.assertIn('class="building-name"', WORLD_MAP_SOURCE)
        self.assertIn("${tile.x}, ${tile.y}：", WORLD_PROJECTION_SOURCE)

    def test_live_planner_material_shortages_choose_the_matching_world_region_and_action(self) -> None:
        driver = BrowserDriver(EmptyPage(), Path(tempfile.gettempdir()), {}, None)
        driver.state = lambda: {"activeCharacterId": "hero", "reward": {"materials": {"hero": {}}}}
        cases = (
            ("木材 ×3 ／持有 0", {"wood": 0}, ("wood", "forest", "伐木")),
            ("石材 ×2 ／持有 0", {"stone": 0}, ("stone", "mine", "採石")),
            ("鐵礦 ×2 ／持有 0", {"iron": 0}, ("iron", "mine", "採鐵礦")),
        )
        for row, inventory, expected in cases:
            with self.subTest(row=row):
                self.assertEqual(driver.missing_base_input({"inputRows": [row]}, inventory), expected)

    def test_hybrid_required_material_overrides_balanced_reserve_policy(self) -> None:
        choose = getattr(browser_driver, "choose_material_choice")
        options = [("none", 0), ("wolfFang", 1), ("moonStone", 1)]
        self.assertEqual(choose(options, focus="balanced", required_material="wolfFang"), "wolfFang")
        self.assertEqual(choose(options, focus="balanced"), "none")
        with self.assertRaisesRegex(AssertionError, "wolfFang"):
            choose([("none", 0), ("wolfFang", 0)], focus="balanced", required_material="wolfFang")

    def test_hybrid_material_contract_requires_pressed_controls_matching_provenance_and_one_debit(self) -> None:
        validate = browser_driver.validate_required_material_craft
        item = {"instanceId": "item-2", "material": "wolfFang", "craftProvenance": {
            "recipeId": "starterSpear", "influenceMaterial": "wolfFang",
        }}
        evidence = validate(
            expected_material="wolfFang", selected_recipe="starterSpear", recipe_pressed=True,
            selected_material="wolfFang", material_pressed=True, item=item,
            before_materials={"wolfFang": 1}, after_materials={"wolfFang": 0},
        )
        self.assertEqual(evidence["materialDelta"], -1)
        self.assertTrue(evidence["recipeAriaPressed"] and evidence["materialAriaPressed"])
        world_loot = [{"type": "loot.material", "message": "獲得狼牙 ×1。"},
                      {"type": "craft.completed", "message": "打造完成。"},
                      {"type": "loot.material", "message": "獲得月石 ×2。"}]
        self.assertEqual(browser_driver.material_loot_gains(world_loot, "wolfFang"), 1)
        adjusted = validate(
            expected_material="wolfFang", selected_recipe="starterSpear", recipe_pressed=True,
            selected_material="wolfFang", material_pressed=True, item=item,
            before_materials={"wolfFang": 1}, after_materials={"wolfFang": 1},
            material_gains_during_craft=1,
        )
        self.assertEqual(adjusted["verifiedCraftDebit"], 1)
        self.assertEqual(adjusted["legitimateMaterialLootGainsDuringCraft"], 1)
        for material_id, expected_name in browser_driver.MATERIAL_EVENT_NAMES.items():
            match = re.search(rf"{material_id}: \{{ id: '{material_id}', name: '([^']+)'", REWARDS_SOURCE)
            self.assertIsNotNone(match)
            self.assertEqual(match.group(1), expected_name)

        with self.subTest(failure="neutral final selection"):
            with self.assertRaisesRegex(AssertionError, "final native material"):
                validate(
                    expected_material="wolfFang", selected_recipe="starterSpear", recipe_pressed=True,
                    selected_material="none", material_pressed=True, item=item,
                    before_materials={"wolfFang": 1}, after_materials={"wolfFang": 0},
                )
        with self.subTest(failure="neutral provenance"):
            neutral_item = {**item, "material": None, "craftProvenance": {
                "recipeId": "starterSpear", "influenceMaterial": None,
            }}
            with self.assertRaisesRegex(AssertionError, "provenance does not record"):
                validate(
                    expected_material="wolfFang", selected_recipe="starterSpear", recipe_pressed=True,
                    selected_material="wolfFang", material_pressed=True, item=neutral_item,
                    before_materials={"wolfFang": 1}, after_materials={"wolfFang": 0},
                )
        with self.subTest(failure="missing debit"):
            with self.assertRaisesRegex(AssertionError, "exactly one"):
                validate(
                    expected_material="wolfFang", selected_recipe="starterSpear", recipe_pressed=True,
                    selected_material="wolfFang", material_pressed=True, item=item,
                    before_materials={"wolfFang": 1}, after_materials={"wolfFang": 1},
                )

    def test_actual_source_contract_connects_craft_result_to_selected_equip_and_native_reload(self) -> None:
        self.assertIn("data-craft-result", PLACE_SOURCE)
        self.assertIn("檢視裝備", PLACE_SOURCE)
        self.assertIn("function inspectCraftedGear(instanceId", APP_SOURCE)
        self.assertIn(":focus-instance-id=\"craftedGearFocus\"", APP_SOURCE)
        self.assertIn(":data-instance-id=\"item.instanceId\"", INVENTORY_SOURCE)
        self.assertIn(":aria-pressed=\"gear.instanceId === item.instanceId\"", INVENTORY_SOURCE)
        self.assertIn("gear-detail", INVENTORY_SOURCE)
        self.assertIn("data-gear-comparison", INVENTORY_SOURCE)
        self.assertIn("穿戴獵獲裝備", INVENTORY_SOURCE)
        self.assertIn("inspect_and_equip_crafted_instance", DRIVER_SOURCE)
        self.assertIn(".save-button", DRIVER_SOURCE)
        self.assertIn("page.reload", DRIVER_SOURCE)
        self.assertIn("combat_victory_observed", DRIVER_SOURCE)
        self.assertNotIn("localStorage.setItem", DRIVER_SOURCE)
        self.assertNotRegex(DRIVER_SOURCE, r"\.click\([^)]*force\s*=\s*True")


if __name__ == "__main__":
    unittest.main()

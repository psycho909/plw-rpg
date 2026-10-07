"""Phase 5 normal-UI browser stress, Life Agent, and Hybrid driver.

Preparation artifact only: run through phase05_browser_launcher.py after Root
records a current browser-release.json and passes --go. Every game mutation is
a visible Playwright action in a disposable Chromium context.
"""
from __future__ import annotations

import argparse
from collections import deque
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Any

from playwright.sync_api import Locator, Page, expect, sync_playwright

from phase05_browser_support import (
    SAVE_KEY, append_jsonl, attach_early_error_capture, now_utc, provenance,
    publish_recorded, validate_build,
)


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir():
            return candidate
    raise RuntimeError(f"Cannot find project root above {script}")


ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261007-life-craftsmanship/phase-05"
RUNS = PHASE / "browser-runs"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "build-status.json"))
LAUNCHER = PHASE / "phase05_browser_launcher.py"
SUPPORT = PHASE / "phase05_browser_support.py"
DRIVER = Path(__file__).resolve()
CHECKPOINT_SECONDS = 60
MINIMUMS = {"stress": (1200, 1800), "life": (1800, 3600), "hybrid-short": (0, 3600)}
BUILDING_TARGETS = frozenset({"house", "farm", "store", "inn", "tavern", "blacksmith"})
MATERIAL_EVENT_NAMES = {"wolfFang": "狼牙", "wolfHide": "狼皮", "moonStone": "月石"}
PLACE_REST_LABELS = {
    "house": "休息 · 1 小時",
    "inn": "住宿 · 8 金／8 小時",
    "tavern": "喝一杯、歇歇腳 · 3 金／1 小時",
}


def active_character(state: dict[str, Any]) -> dict[str, Any]:
    return next(character for character in state["characters"]
                if character["id"] == state["activeCharacterId"])


def state_summary(state: dict[str, Any]) -> dict[str, Any]:
    actor = active_character(state)
    journal = state.get("playJournal", {})
    return {
        "worldTime": state.get("worldTime"), "rngState": state.get("rngState"),
        "eventSequence": state.get("eventSequence"), "eventCount": len(state.get("events", [])),
        "historyCount": len(state.get("history", [])),
        "journalPending": len(journal.get("pending", [])),
        "character": {key: actor.get(key) for key in ("isAlive", "hp", "maxHp", "stamina", "maxStamina", "gold", "level", "position")},
        "skills": actor.get("skills", {}), "inventory": actor.get("inventory", {}),
        "instanceCount": len(state.get("reward", {}).get("instances", [])),
        "equipped": state.get("reward", {}).get("equipped", {}).get(state["activeCharacterId"], {}),
        "npcCount": len(state.get("npcs", [])),
        "livingNpcCount": sum(bool(npc.get("isAlive")) for npc in state.get("npcs", [])),
        "threat": state.get("threat", {}), "boss": {
            "alive": state.get("threat", {}).get("bossAlive"),
            "progress": state.get("threat", {}).get("bossProgress"),
            "wolfBossForm": state.get("reward", {}).get("wolfBossForm"),
        },
        "combat": state.get("combat"), "dungeon": state.get("dungeon", {}),
        "ownership": state.get("life", {}).get("properties", []),
    }


def mark_completed_if_in_progress(result: dict[str, Any]) -> None:
    """Mark a normally returned mode routine successful unless it reported a blocker."""
    if result.get("status") == "IN_PROGRESS":
        result["status"] = "PASS"


def required_smithing_level(planner_text: str) -> int | None:
    """Read the visible workbench's `鍛造熟練度 / 需求 Lv.N` projection."""
    normalized = re.sub(r"\s+", " ", planner_text)
    match = re.search(r"鍛造熟練度\s*(?:需求\s*)?Lv\.?\s*(\d+)", normalized)
    return int(match.group(1)) if match else None


def recipe_skill_locked(required_level: int | None, current_level: int) -> bool:
    return required_level is not None and required_level > current_level


def choose_material_choice(
    options: list[tuple[str, int]], *, focus: str, required_material: str | None = None,
) -> str | None:
    """Apply normal material conservation, with an explicit H objective taking priority."""
    if required_material is not None:
        if not any(material_id == required_material and owned >= 1 for material_id, owned in options):
            raise AssertionError(f"Required hybrid material {required_material} is not visibly owned")
        return required_material

    threshold = 0 if focus == "material_value" else 1
    candidates = [(owned, material_id) for material_id, owned in options
                  if material_id != "none" and owned > threshold]
    if candidates:
        return max(candidates, key=lambda item: item[0])[1]
    if any(material_id == "none" for material_id, _owned in options):
        return "none"
    return options[0][0] if options else None


def material_loot_gains(events: list[dict[str, Any]], material_id: str) -> int:
    """Count only legitimate material-loot events for the targeted material."""
    name = MATERIAL_EVENT_NAMES.get(material_id)
    if name is None:
        raise AssertionError(f"No current rendered label is known for material {material_id}")
    pattern = re.compile(rf"{re.escape(name)}\s*×\s*(\d+)")
    total = 0
    for event in events:
        if event.get("type") != "loot.material":
            continue
        match = pattern.search(str(event.get("message", "")))
        if match:
            total += int(match.group(1))
    return total


def validate_required_material_craft(
    *, expected_material: str, selected_recipe: str | None, recipe_pressed: bool,
    selected_material: str | None, material_pressed: bool, item: dict[str, Any],
    before_materials: dict[str, Any], after_materials: dict[str, Any],
    material_gains_during_craft: int = 0,
) -> dict[str, Any]:
    """Validate a targeted craft against the last native selection and actual save state."""
    if not selected_recipe or not recipe_pressed:
        raise AssertionError("The final native recipe control was not aria-pressed immediately before craft")
    if selected_material != expected_material or not material_pressed:
        raise AssertionError(
            f"The final native material control was not aria-pressed for {expected_material} immediately before craft"
        )
    provenance = item.get("craftProvenance")
    if not isinstance(provenance, dict) or provenance.get("recipeId") != selected_recipe:
        raise AssertionError("The actual crafted item provenance does not match the final native recipe selection")
    if provenance.get("influenceMaterial") != expected_material or item.get("material") != expected_material:
        raise AssertionError(f"The actual crafted item provenance does not record {expected_material}")
    before = before_materials.get(expected_material, 0)
    after = after_materials.get(expected_material, 0)
    if (type(before) is not int or type(after) is not int or before < 1 or after < 0
            or type(material_gains_during_craft) is not int or material_gains_during_craft < 0
            or after - before != material_gains_during_craft - 1):
        raise AssertionError(
            f"Expected exactly one {expected_material} debit adjusted for {material_gains_during_craft} legitimate loot gains; "
            f"observed {before!r} -> {after!r}"
        )
    return {
        "instanceId": item.get("instanceId"), "recipeId": selected_recipe,
        "materialId": expected_material, "recipeAriaPressed": recipe_pressed,
        "materialAriaPressed": material_pressed, "materialCountBefore": before,
        "materialCountAfter": after, "materialDelta": after - before,
        "legitimateMaterialLootGainsDuringCraft": material_gains_during_craft,
        "verifiedCraftDebit": 1,
    }


def combat_victory_observed(start: dict[str, Any], end: dict[str, Any]) -> bool:
    """Require a completed normal combat and its visible-save victory event."""
    if not start.get("combat") or end.get("combat") is not None:
        return False
    start_sequence = start.get("eventSequence", -1)
    return any(event.get("type") == "combat.won" and event.get("id", -1) > start_sequence
               for event in end.get("events", []))


def resource_action_pattern(label: str) -> re.Pattern[str]:
    """Match only the anchored icon-prefixed name for one resource action."""
    return re.compile(rf"^\s*\S+\s+{re.escape(label)}\s*$")


def region_label_from_map_tile(aria_label: str | None, x: int, y: int) -> str:
    """Read the current region's rendered name from the accessible world-map tile."""
    prefix = f"{x}, {y}："
    if not aria_label or not aria_label.startswith(prefix):
        raise RuntimeError(f"World-map tile {x},{y} did not expose its current accessible label: {aria_label!r}")
    label = aria_label[len(prefix):].split("，", 1)[0].strip()
    if not label or label == "未知區域":
        raise RuntimeError(f"World-map tile {x},{y} does not expose a discovered region name")
    return label


def visible_label_match(text: str, label: str) -> bool:
    normalized = re.sub(r"\s+", " ", text).strip()
    return re.search(rf"(?:^|\s){re.escape(label)}(?:$|\s)", normalized) is not None


class BrowserDriver:
    def __init__(self, page: Page, run_dir: Path, result: dict[str, Any], cdp: Any):
        self.page = page
        self.run_dir = run_dir
        self.result = result
        self.cdp = cdp
        self.started = time.monotonic()
        self.next_checkpoint = self.started + CHECKPOINT_SECONDS
        self.raw = run_dir / "operations.jsonl"
        self.checkpoint_path = run_dir / "checkpoints.jsonl"
        self.recent: list[dict[str, Any]] = []
        self.recent_actions: list[str] = []
        self.last_life_note = self.started
        self.last_recipe_choice: dict[str, Any] | None = None
        self.action_count = 0
        self.dialog_cycles = 0
        self.reloads = 0
        self.last_checkpoint: dict[str, Any] | None = None

    def state(self) -> dict[str, Any]:
        raw = self.page.evaluate("localStorage.getItem('oakvale-v1')")
        if raw is None:
            raise AssertionError("Native oakvale-v1 save is missing")
        return json.loads(raw)

    def log(self, kind: str, **fields: Any) -> None:
        append_jsonl(self.raw, {"atUTC": now_utc(), "elapsedSeconds": round(time.monotonic() - self.started, 2),
                                "kind": kind, **fields})

    def profile_command(self, command: str) -> dict[str, Any] | None:
        """Collect optional CDP profile data without turning unsupported metrics into QA failures."""
        if self.cdp is None:
            return None
        try:
            value = self.cdp.send(command)
            self.result.setdefault("profilingCapabilities", {})[command] = True
            return value
        except Exception as exc:
            self.result.setdefault("profilingCapabilities", {})[command] = False
            limitation = {"command": command, "error": f"{type(exc).__name__}: {exc}"}
            limitations = self.result.setdefault("profilingLimitations", [])
            if limitation not in limitations:
                limitations.append(limitation)
            return None

    def initialize_profiling(self) -> None:
        if self.cdp is None:
            self.result.setdefault("profilingLimitations", []).append({"reason": "CDP profiling session unavailable"})
            return
        # Chromium 151 does not expose Memory.enable. These independent commands
        # are feature-detected and any missing profile metric remains a limitation.
        self.profile_command("Performance.enable")
        self.profile_command("Memory.getDOMCounters")
        self.profile_command("Runtime.getHeapUsage")
        self.profile_command("Performance.getMetrics")

    def checkpoint(self, reason: str, force: bool = False) -> None:
        if not force and time.monotonic() < self.next_checkpoint:
            return
        state = self.state()
        telemetry = self.page.evaluate("""async () => {
          const estimate = await navigator.storage.estimate();
          const save = localStorage.getItem('oakvale-v1') || '';
          const dbs = indexedDB.databases ? await indexedDB.databases() : [];
          const indexedDBDetails = await Promise.all(dbs.filter(db => db.name).map(info => new Promise(resolve => {
            const request = indexedDB.open(info.name);
            request.onerror = () => resolve({name:info.name, error:String(request.error || 'open failed')});
            request.onsuccess = async () => {
              const db = request.result;
              try {
                const stores = Array.from(db.objectStoreNames);
                const counts = await Promise.all(stores.map(name => new Promise(done => {
                  try {
                    const req = db.transaction(name, 'readonly').objectStore(name).count();
                    req.onsuccess = () => done({store:name, count:req.result});
                    req.onerror = () => done({store:name, error:String(req.error || 'count failed')});
                  } catch (error) { done({store:name, error:String(error)}); }
                })));
                resolve({name:info.name, stores:counts});
              } catch (error) { resolve({name:info.name, error:String(error)}); }
              finally { db.close(); }
            };
          })));
          return {saveBytes:new TextEncoder().encode(save).length,
            localStorageBytes:new TextEncoder().encode(save).length,
            originStorage:{usage:estimate.usage ?? null, quota:estimate.quota ?? null},
            indexedDBNames:dbs.map(db => db.name).filter(Boolean),
            indexedDBDetails,
            saveLatencyMs:(window.__qaSaveLatency || []).slice(-30),
            storageErrors:(window.__qaStorageErrors || []).slice(),
            domNodes:document.getElementsByTagName('*').length,
            dialogsOpen:document.querySelectorAll('dialog[open]').length,
            heap:performance.memory ? {used:performance.memory.usedJSHeapSize,
              total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit} : null,
            resourceCount:performance.getEntriesByType('resource').length};
        }""")
        counters = self.profile_command("Memory.getDOMCounters") or {}
        heap = self.profile_command("Runtime.getHeapUsage") or {}
        performance = self.profile_command("Performance.getMetrics") or {}
        performance_metrics = {entry.get("name"): entry.get("value")
                              for entry in performance.get("metrics", []) if isinstance(entry, dict)}
        if not heap:
            heap = {key: performance_metrics[key] for key in ("JSHeapUsedSize", "JSHeapTotalSize")
                    if key in performance_metrics}
        value = {"atUTC": now_utc(), "elapsedSeconds": round(time.monotonic() - self.started, 2),
                 "reason": reason, "state": state_summary(state), "telemetry": telemetry,
                 "domCounters": counters, "heapUsage": heap, "performanceMetrics": performance_metrics,
                 "uiLatencyMsTail": self.result["uiLatencyMs"][-40:],
                 "errorCounts": {"page": len(self.result["pageErrors"]), "console": len(self.result["consoleErrors"]),
                                 "rejections": len(self.result["rejections"]), "storage": len(self.result["storageErrors"])}}
        self.last_checkpoint = value
        append_jsonl(self.checkpoint_path, value)
        self.result["checkpointCount"] += 1
        self.next_checkpoint = time.monotonic() + CHECKPOINT_SECONDS

    def act(self, locator: Locator, label: str, *, timeout: int = 5000) -> None:
        expect(locator).to_be_visible(timeout=timeout)
        if locator.is_disabled():
            raise AssertionError(f"Visible UI control is disabled: {label}")
        before = self.state()
        started = time.monotonic()
        locator.click(timeout=timeout)
        latency = round((time.monotonic() - started) * 1000, 1)
        self.action_count += 1
        self.result["operations"] = self.action_count
        self.result["uiLatencyMs"].append({"action": label, "milliseconds": latency})
        if len(self.result["uiLatencyMs"]) > 500:
            del self.result["uiLatencyMs"][:-500]
        after = self.state()
        self.recent_actions.append(label)
        self.recent_actions = self.recent_actions[-30:]
        self.log("visible-ui-action", label=label, latencyMs=latency,
                 before=state_summary(before), after=state_summary(after))
        self.checkpoint("scheduled")

    @staticmethod
    def unique_button(scope: Locator, label: str, *, exact: bool = True) -> Locator:
        locator = scope.get_by_role("button", name=label, exact=exact)
        matches = locator.count()
        if matches != 1:
            raise RuntimeError(f"Expected one {'exact ' if exact else ''}button {label!r} in its UI scope; got {matches}")
        return locator

    @staticmethod
    def row_action_button(row: Locator) -> Locator:
        button = row.locator("button")
        if button.count() != 1:
            raise RuntimeError(f"Expected one actionable button in the selected UI row; got {button.count()}")
        return button

    @staticmethod
    def dialog_title(dialog: Locator) -> str:
        headings = dialog.locator(".window-heading h2")
        if headings.count() != 1:
            raise RuntimeError("The open native dialog did not expose one title heading")
        return re.sub(r"[┤├]", "", headings.inner_text()).strip()

    def visible_dialog(self, expected_title: str | None = None, *, required: bool = True) -> Locator | None:
        dialogs = self.page.locator("dialog.pixel-window[open]")
        count = dialogs.count()
        if count == 0 and not required:
            return None
        if count != 1:
            raise RuntimeError(f"Expected one visible native dialog; got {count}")
        if not dialogs.is_visible():
            raise RuntimeError("The open native dialog is not visible")
        if expected_title is not None:
            title = self.dialog_title(dialogs)
            if title != expected_title:
                raise RuntimeError(f"Expected native dialog {expected_title!r}; found {title!r}")
        return dialogs

    def map_button(self, label: str) -> Locator:
        return self.unique_button(self.page.locator(".direction-pad"), label)

    def clock_button(self, label: str) -> Locator:
        scope = self.page.locator('.speed-controls[aria-label="世界時間速度"]')
        return self.unique_button(scope, label)

    def place_button(self, target: str, label: str) -> Locator:
        expected_title = self.live_interaction_label(target)
        dialog = self.visible_dialog(expected_title)
        assert dialog is not None
        return self.unique_button(dialog.locator(".window-body"), label)

    def rest_button(self, target: str) -> Locator:
        label = PLACE_REST_LABELS.get(target)
        if label is None:
            raise ValueError(f"No ordinary rest action is defined for {target!r}")
        return self.place_button(target, label)

    def resource_button(self, target: str, label: str) -> Locator:
        expected_title = self.live_interaction_label(target)
        dialog = self.visible_dialog(expected_title)
        assert dialog is not None
        actions = dialog.locator(".window-body .action-buttons")
        locator = actions.get_by_role("button", name=resource_action_pattern(label))
        matches = locator.count()
        if matches != 1:
            raise RuntimeError(f"Expected one anchored {label!r} resource action in {target!r}; got {matches}")
        return locator

    def place_action_button(self, target: str, label: str) -> Locator:
        expected_title = self.live_interaction_label(target)
        dialog = self.visible_dialog(expected_title)
        assert dialog is not None
        actions = dialog.locator(".window-body .action-buttons")
        locator = actions.get_by_role("button", name=label, exact=True)
        matches = locator.count()
        if matches != 1:
            raise RuntimeError(f"Expected one exact {label!r} place action in {target!r}; got {matches}")
        return locator

    def battle_button(self, label: str) -> Locator:
        dialog = self.visible_dialog("戰鬥")
        assert dialog is not None
        return self.unique_button(dialog.locator(".window-body .battle-commands"), label)

    def workbench_section(self) -> Locator:
        dialog = self.visible_dialog()
        assert dialog is not None
        section = dialog.locator(".window-body .crafting-workbench")
        count = section.count()
        if count != 1 or not section.is_visible():
            raise RuntimeError(f"Expected one visible workbench section in the active place dialog; got {count}")
        return section

    def pause_clock(self) -> None:
        # The speed controls sit behind native dialogs. Close them through their
        # ordinary Escape/X affordance before clicking the underlying clock.
        while self.close_dialog():
            pass
        candidate = self.clock_button("暫停")
        if candidate.is_visible() and candidate.get_attribute("aria-pressed") != "true":
            self.act(candidate, "pause world clock through its visible speed control")

    def close_dialog(self) -> bool:
        dialog = self.visible_dialog(required=False)
        if dialog is None:
            return False
        # Use the real Escape path; if this dialog does not dismiss on Escape,
        # reacquire and use its visible X. Never retain a locator across close.
        self.page.keyboard.press("Escape")
        try:
            expect(dialog).to_be_hidden(timeout=1500)
        except AssertionError:
            button = self.unique_button(dialog, "關閉視窗")
            self.act(button, "close native dialog with its visible X")
            expect(self.page.locator("dialog.pixel-window[open]")).to_have_count(0, timeout=3000)
        self.dialog_cycles += 1
        self.result["dialogCycles"] = self.dialog_cycles
        self.log("dialog-closed", method="visible Escape or X")
        return True

    def save_reload(self) -> None:
        self.pause_clock()
        before = self.state()
        while self.close_dialog():
            pass
        # The save control is reacquired only after all native dialogs are closed.
        save = self.unique_button(self.page.locator(".time-hud"), "存檔")
        self.act(save, "explicit native save after closing all dialogs")
        expect(self.page.locator("dialog.pixel-window[open]")).to_have_count(0, timeout=3000)
        self.page.reload(wait_until="domcontentloaded")
        self.page.wait_for_selector(".world-map", timeout=20000)
        after = self.state()
        for key in ("worldTime", "rngState", "eventSequence"):
            if after.get(key) != before.get(key):
                raise AssertionError(f"Native reload changed {key}: {before.get(key)} -> {after.get(key)}")
        before_actor, after_actor = active_character(before), active_character(after)
        for key in ("gold", "stamina", "hp", "skills", "inventory"):
            if before_actor.get(key) != after_actor.get(key):
                raise AssertionError(f"Native reload changed active character {key}")
        if before.get("reward") != after.get("reward"):
            raise AssertionError("Native reload changed reward items, provenance, or equipped slots")
        self.reloads += 1
        self.result["reloads"] = self.reloads
        self.log("native-save-reload", invariants=state_summary(after))
        self.checkpoint("after-native-reload", force=True)

    def route_to(self, target: str) -> None:
        state = self.state()
        tiles = {(tile["x"], tile["y"]): tile for tile in state.get("tiles", []) if tile.get("walkable")}
        if target in BUILDING_TARGETS:
            candidates = [pos for pos, tile in tiles.items() if tile.get("building") == target]
            if not candidates and target == "farm":
                candidates = [pos for pos, tile in tiles.items() if tile.get("regionId") == "farmland"]
        else:
            candidates = [pos for pos, tile in tiles.items() if tile.get("regionId") == target]
        if not candidates:
            raise RuntimeError(f"Current ordinary world map has no walkable target for {target}")
        actor = active_character(state)
        start = (actor["position"]["x"], actor["position"]["y"])
        target_set = set(candidates)
        queue = deque([start])
        previous: dict[tuple[int, int], tuple[int, int] | None] = {start: None}
        found = start if start in target_set else None
        directions = ((0, -1, "往上"), (1, 0, "往右"), (0, 1, "往下"), (-1, 0, "往左"))
        while queue and found is None:
            current = queue.popleft()
            for dx, dy, _ in directions:
                nxt = (current[0] + dx, current[1] + dy)
                if nxt in tiles and nxt not in previous:
                    previous[nxt] = current
                    if nxt in target_set:
                        found = nxt
                        break
                    queue.append(nxt)
        if found is None:
            raise RuntimeError(f"No legal walkable route to {target}")
        path = [found]
        while previous[path[-1]] is not None:
            path.append(previous[path[-1]])  # type: ignore[arg-type]
        path.reverse()
        for a, b in zip(path, path[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            label = next(name for ddx, ddy, name in directions if (ddx, ddy) == (dx, dy))
            self.act(self.map_button(label), f"move one legal map step toward {target}")

    def _map_tile(self, x: int, y: int) -> Locator:
        return self.page.locator(f'.world-map .tile[data-position="{x},{y}"]')

    def live_interaction_label(self, target: str) -> str:
        """Resolve a region/building key to its current name from rendered map UI."""
        state = self.state()
        if target in BUILDING_TARGETS:
            buildings = [tile for tile in state.get("tiles", []) if tile.get("building") == target]
            if len(buildings) != 1 or target not in state.get("settlement", {}).get("buildings", []):
                raise RuntimeError(f"Current world has no single built interaction target for {target}")
            tile = buildings[0]
            cell = self._map_tile(tile["x"], tile["y"])
            if cell.count() != 1:
                raise RuntimeError(f"World map did not render the current {target} building tile")
            label = cell.locator(".building-name")
            if label.count() != 1 or not label.is_visible():
                raise RuntimeError(f"World map did not expose the visible name for built {target}")
            visible_name = re.sub(r"\s+", " ", label.inner_text()).strip()
            if not visible_name:
                raise RuntimeError(f"World map exposed an empty name for built {target}")
            return visible_name

        actor = active_character(state)
        position = actor.get("position", {})
        x, y = position.get("x"), position.get("y")
        tile = next((item for item in state.get("tiles", [])
                     if item.get("x") == x and item.get("y") == y), None)
        if tile is None or tile.get("regionId") != target or actor.get("currentRegion") != target:
            raise RuntimeError(f"Player is not in the requested current region {target}")
        cell = self._map_tile(x, y)
        if cell.count() != 1:
            raise RuntimeError(f"World map did not render the current {target} tile")
        return region_label_from_map_tile(cell.get_attribute("aria-label"), x, y)

    def nearby(self, target: str) -> None:
        visible_name = self.live_interaction_label(target)
        trigger = self.page.locator(".world-frame .nearby-trigger")
        if trigger.count() and trigger.is_visible():
            self.act(trigger, "open nearby interactions")
            dialog = self.visible_dialog("附近的生活")
            assert dialog is not None
            interaction_list = dialog.locator(".window-body .interaction-list")
            buttons = interaction_list.locator("button")
            rendered_labels = buttons.evaluate_all("buttons => buttons.map(button => button.innerText)")
            matches = [text for text in rendered_labels if visible_label_match(text, visible_name)]
            if len(matches) != 1:
                raise RuntimeError(f"Expected one visible interaction for {visible_name}; got {len(matches)}")
            target_name = re.compile(rf"^\s*\S+\s+{re.escape(visible_name)}\s*$")
            action = interaction_list.get_by_role("button", name=target_name)
            count = action.count()
            if count != 1 or not action.is_visible():
                raise RuntimeError(
                    f"Expected one nearby target {visible_name!r} after live-list refresh; "
                    f"got {count} (target may have disappeared or become ambiguous)"
                )
            self.act(action, f"open nearby {target} ({visible_name})", timeout=5000)
        else:
            action = self.page.locator(".world-frame .context-action")
            text = re.sub(r"\s+", " ", action.inner_text()).strip()
            if not visible_label_match(text, visible_name):
                raise RuntimeError(f"Primary visible interaction is not {visible_name}: {text}")
            self.act(action, f"open {target} ({visible_name})")

    def navigate_place(self, target: str) -> None:
        self.close_dialog()
        state = self.state()
        here = active_character(state)["position"]
        tiles = state.get("tiles", [])
        if target in BUILDING_TARGETS:
            tile = next((t for t in tiles if t.get("building") == target), None)
            if tile is None and target == "farm":
                self.route_to("farmland")
                self.nearby("farmland")
                return
            if tile is None:
                raise RuntimeError(f"Map has no current {target} building")
            goals = [(tile["x"] + dx, tile["y"] + dy) for dx, dy in ((0,0),(0,1),(1,0),(0,-1),(-1,0))]
            valid = { (t["x"],t["y"]) for t in tiles if t.get("walkable") }
            start=(here["x"],here["y"])
            candidates=[p for p in goals if p in valid]
            target_set=set(candidates)
            # Route helper targets a region. For a building, run a small BFS to its adjacent tile.
            self._route_positions(start, target_set, target)
        else:
            self.route_to(target)
        self.nearby(target)

    def navigate_optional_place(self, target: str) -> bool:
        """Visit an optional building only when the current world has built it."""
        if target not in BUILDING_TARGETS:
            raise ValueError(f"Optional place must be a building, got {target!r}")
        state = self.state()
        built = target in state.get("settlement", {}).get("buildings", [])
        present = any(tile.get("building") == target for tile in state.get("tiles", []))
        if not built or not present:
            observation = {"target": target, "available": False,
                           "reason": "building is not present in the current ordinary world"}
            self.result.setdefault("optionalSurfaceAvailability", []).append(observation)
            self.log("optional-surface-unavailable", **observation)
            return False
        self.navigate_place(target)
        self.result.setdefault("optionalSurfaceAvailability", []).append(
            {"target": target, "available": True})
        return True

    def _route_positions(self, start: tuple[int,int], targets: set[tuple[int,int]], label: str) -> None:
        state=self.state()
        tiles={(t["x"],t["y"]):t for t in state.get("tiles",[]) if t.get("walkable")}
        queue=deque([start]); previous={start:None}; found=start if start in targets else None
        while queue and found is None:
            x,y=queue.popleft()
            for dx,dy in ((0,-1),(1,0),(0,1),(-1,0)):
                nxt=(x+dx,y+dy)
                if nxt in tiles and nxt not in previous:
                    previous[nxt]=(x,y)
                    if nxt in targets: found=nxt; break
                    queue.append(nxt)
        if found is None: raise RuntimeError(f"No legal visible map path to {label}")
        path=[found]
        while previous[path[-1]] is not None: path.append(previous[path[-1]])
        path.reverse()
        labels={(0,-1):"往上",(1,0):"往右",(0,1):"往下",(-1,0):"往左"}
        for a,b in zip(path,path[1:]):
            self.act(self.map_button(labels[(b[0]-a[0],b[1]-a[1])]), f"move one legal map step toward {label}")

    def inventory_cycle(self) -> None:
        self.close_dialog()
        shortcuts = self.page.locator(".desktop-shortcuts")
        opener = self.unique_button(shortcuts, "物品 I")
        if opener.count() and opener.is_visible():
            self.act(opener, "open inventory from its desktop accessible name")
        else:
            # Keyboard shortcut is a normal UI input; the window is observed afterward.
            self.page.keyboard.press("i")
        dialog = self.visible_dialog("物品")
        assert dialog is not None
        text = dialog.inner_text()
        self.log("inventory-observation", visibleText=text[:1600])
        self.close_dialog()

    def advance_until_station_open(self, reason: str) -> None:
        """Use ordinary rest controls until the visible planner reports an open station."""
        self.log("station-closed-rest", reason=reason)
        for _ in range(18):
            self.close_dialog()
            house_available = self.navigate_optional_place("house")
            rest = self.rest_button("house") if house_available else None
            if rest is None or not rest.is_visible() or rest.is_disabled():
                self.close_dialog()
                inn_available = self.navigate_optional_place("inn")
                rest = self.rest_button("inn") if inn_available else None
            if rest is None or not rest.is_visible() or rest.is_disabled():
                raise RuntimeError("Station is closed and no legal exact visible house or inn rest action is available")
            self.act(rest, "advance world time through an ordinary visible rest action")
            self.close_dialog()
            self.navigate_place("store")
            observation = self.workbench_observation()
            if observation.get("available") and not any("工作台目前未營業" in text
                                                          for text in observation.get("disabledReason", [])):
                return
        raise RuntimeError("Visible station planner stayed closed after bounded normal rest actions")

    def explore_secondary_surfaces(self, mode: str) -> None:
        """Read released menu/NPC/shop/companion surfaces without inventing absent features."""
        if mode == "stress" and not self.result.get("secondarySurfacesExplored"):
            menu = self.page.locator(".time-hud .menu-trigger")
            self.act(menu, "open the ordinary game menu")
            menu_dialog = self.visible_dialog("選單")
            assert menu_dialog is not None
            labels = menu_dialog.locator(".window-body .pixel-menu button[aria-label]").evaluate_all(
                "nodes => nodes.map(node => node.getAttribute('aria-label')).filter(Boolean)")
            observations = []
            for label in labels:
                self.close_dialog()
                self.act(self.page.locator(".time-hud .menu-trigger"), "reopen the ordinary menu for the next visible window")
                dialog = self.visible_dialog("選單")
                assert dialog is not None
                menu = dialog.locator(".window-body .pixel-menu")
                button = self.unique_button(menu, label)
                if button.is_disabled():
                    observations.append({"label": label, "available": False})
                    continue
                self.act(button, f"open currently released window {label}")
                window = self.visible_dialog()
                assert window is not None
                observations.append({"label": label, "available": True,
                                    "windowTitle": self.dialog_title(window),
                                    "visibleText": re.sub(r"\s+", " ", window.inner_text()).strip()[:1600]})
                self.close_dialog()
            self.result["releasedWindowObservations"] = observations
            self.log("released-window-observations", windows=observations)

            # Observe an NPC only when the current legal nearby-interaction list exposes one.
            self.close_dialog()
            trigger = self.page.locator(".world-frame .nearby-trigger")
            npc_observation = {"available": False}
            if trigger.count() and trigger.is_visible():
                self.act(trigger, "open the currently available nearby-interaction list")
                dialog = self.visible_dialog("附近的生活")
                assert dialog is not None
                rows = dialog.locator(".window-body .interaction-list button")
                known_names = [npc.get("name", "") for npc in self.state().get("npcs", []) if npc.get("name")]
                for index in range(rows.count()):
                    row = rows.nth(index)
                    text = row.inner_text().strip()
                    name = next((candidate for candidate in known_names if candidate in text), None)
                    if name:
                        self.act(row, "open a currently nearby living NPC from the visible interaction list")
                        dialog = self.visible_dialog()
                        assert dialog is not None
                        npc_observation = {"available": True, "name": name,
                                           "visibleText": re.sub(r"\s+", " ", dialog.inner_text()).strip()[:1200]}
                        self.close_dialog()
                        break
                else:
                    self.close_dialog()
            self.result["nearbyNpcObservation"] = npc_observation

            state = self.state()
            tavern_visible = any(tile.get("building") == "tavern" for tile in state.get("tiles", []))
            tavern_built = "tavern" in state.get("settlement", {}).get("buildings", [])
            self.result["companionAvailability"] = {"partyCount": len(state.get("party", [])),
                "tavernVisible": tavern_visible and tavern_built,
                "tavernTileVisible": tavern_visible,
                "note": "Availability observation only; no companion hire or wage commitment is made by this one-time surface probe."}
            if self.result["companionAvailability"]["tavernVisible"]:
                self.navigate_optional_place("tavern")
                dialog = self.visible_dialog(self.live_interaction_label("tavern"))
                assert dialog is not None
                self.result["companionAvailability"]["visibleTavernText"] = re.sub(
                    r"\s+", " ", dialog.inner_text()).strip()[:1400]
                self.close_dialog()
            else:
                self.navigate_optional_place("tavern")
            state = self.state()
            dungeon = state.get("dungeon", {})
            self.result["dungeonAvailability"] = {"discovered": dungeon.get("discovered"),
                "inDungeon": dungeon.get("inDungeon"), "stateObservation": dungeon,
                "note": "No dungeon entry unless its ordinary entrance route is explicitly selected later."}
            self.log("companion-and-dungeon-availability", companion=self.result["companionAvailability"],
                     dungeon=self.result["dungeonAvailability"])

            # Exercise one normal shop purchase only when the rendered price leaves
            # the current planner fee plus a 10G reserve intact.
            self.navigate_place("store")
            state = self.state()
            gold = active_character(state).get("gold", 0)
            planner_text = self.workbench_observation().get("text", "")
            fee_match = re.search(r"費用\s*(\d+)\s*金", planner_text)
            reserve = (int(fee_match.group(1)) if fee_match else 0) + 10
            shop_purchase = None
            store_title = self.live_interaction_label("store")
            store_dialog = self.visible_dialog(store_title)
            assert store_dialog is not None
            shop_list = store_dialog.locator(".window-body .shop-list")
            shop_rows = shop_list.locator(".shop-item")
            for index in range(shop_rows.count()):
                row = shop_rows.nth(index)
                buy = row.get_by_role("button", name=re.compile(r"^買\s+\d+\s+金$"))
                if buy.count() != 1 or buy.is_disabled():
                    continue
                cost_match = re.search(r"買\s+(\d+)\s+金", buy.inner_text())
                if cost_match and gold - int(cost_match.group(1)) >= reserve:
                    product = row.locator("div")
                    if product.count() != 1:
                        raise RuntimeError(f"Store row must expose one product description; got {product.count()}")
                    name = re.sub(r"\s+", " ", product.inner_text()).strip()
                    self.act(buy, "make one normal visible shop purchase while preserving the current craft reserve")
                    shop_purchase = {"row": name, "goldBefore": gold, "reserveGold": reserve,
                                     "goldAfter": active_character(self.state())["gold"]}
                    break
            self.result["shopPurchaseObservation"] = shop_purchase or {"available": False,
                "reason": "No enabled normal store purchase fit the visible gold reserve."}
            self.log("shop-observation", purchase=self.result["shopPurchaseObservation"])
            self.close_dialog()
            self.result["secondarySurfacesExplored"] = True

    def visible_recipe_controls(self) -> tuple[Locator, Locator | None]:
        # The workbench section owns the recipe and material button groups.
        section = self.workbench_section()
        recipes = section.locator("button[data-craft-recipe]")
        selected_recipes = [recipes.nth(i) for i in range(recipes.count())
                            if recipes.nth(i).is_visible()
                            and recipes.nth(i).get_attribute("aria-pressed") == "true"]
        if len(selected_recipes) != 1:
            raise RuntimeError(f"Expected one visible aria-pressed recipe button; got {len(selected_recipes)}")
        selected = selected_recipes[0]
        materials = section.locator("[data-crafting-material]")
        material = None
        if materials.count():
            selected_material = [materials.nth(i) for i in range(materials.count())
                                 if materials.nth(i).is_visible() and materials.nth(i).get_attribute("aria-pressed") == "true"]
            if len(selected_material) != 1:
                raise RuntimeError(f"Expected one visible aria-pressed material button; got {len(selected_material)}")
            material = selected_material[0]
        return selected, material

    def workbench_observation(self) -> dict[str, Any]:
        dialog = self.visible_dialog(required=False)
        if dialog is None:
            return {"available": False}
        section = dialog.locator(".window-body .crafting-workbench")
        if section.count() == 0:
            return {"available": False}
        if section.count() != 1 or not section.is_visible():
            raise RuntimeError(f"Expected one visible workbench in the active place dialog; got {section.count()}")
        recipe, material = self.visible_recipe_controls()
        recipe_label = section.locator("[data-craft-recipe]")
        return {"available": True, "text": re.sub(r"\s+", " ", section.inner_text()).strip(),
                "inputRows": [re.sub(r"\s+", " ", text).strip() for text in section.locator(".crafting-preview li").all_inner_texts()],
                "recipeControls": recipe.count() if recipe is not None else 0,
                "materialControls": section.locator("[data-crafting-material]").count(),
                "selectedRecipe": recipe.get_attribute("data-craft-recipe") if recipe is not None else
                    recipe_label.get_attribute("data-craft-recipe") if recipe_label.count() else None,
                "selectedMaterial": material.get_attribute("data-crafting-material") if material is not None else None,
                "recipeLabel": (recipe.inner_text().strip() if recipe is not None else recipe_label.inner_text().strip()
                                if recipe_label.count() else None),
                "disabledReason": section.locator("[role=status]").all_inner_texts()}

    def inspect_and_equip_crafted_instance(self, item: dict[str, Any]) -> dict[str, Any]:
        """Follow the normal result bridge and equip the exact newly-created instance."""
        instance_id = item.get("instanceId")
        if not isinstance(instance_id, str) or not instance_id:
            raise AssertionError("Craft result has no concrete instance ID")
        result_dialog = self.visible_dialog()
        assert result_dialog is not None
        result = result_dialog.locator(".window-body [data-craft-result]")
        expect(result).to_be_visible(timeout=5000)
        inspect = self.unique_button(result, "檢視裝備")
        self.act(inspect, "open the crafted item through its visible result bridge")

        inventory_dialog = self.visible_dialog("物品")
        assert inventory_dialog is not None
        inventory_rows = inventory_dialog.locator(".window-body .gear-layout .item-list")
        expect(inventory_rows).to_be_visible(timeout=5000)
        rows = inventory_rows.locator('button[data-instance-id]')
        matching_rows = [rows.nth(index) for index in range(rows.count())
                         if rows.nth(index).get_attribute("data-instance-id") == instance_id]
        if len(matching_rows) != 1:
            raise AssertionError(f"Inventory did not expose the exact crafted instance {instance_id}")
        selected_row = matching_rows[0]
        expect(selected_row).to_be_visible(timeout=5000)
        if selected_row.get_attribute("aria-pressed") != "true":
            self.act(selected_row, f"select the exact crafted inventory instance {instance_id}")
        expect(selected_row).to_have_attribute("aria-pressed", "true", timeout=5000)

        detail = inventory_dialog.locator(".window-body .gear-detail[data-gear-comparison]")
        if detail.count() != 1:
            raise AssertionError(f"Inventory did not expose one gear comparison for {instance_id}")
        expect(detail).to_be_visible(timeout=5000)
        state = self.state()
        owner_id = state["activeCharacterId"]
        equipped = state.get("reward", {}).get("equipped", {}).get(owner_id, {})
        equipped_slots = [slot for slot, value in equipped.items() if value == instance_id]
        if not equipped_slots:
            equip = self.unique_button(detail, "穿戴獵獲裝備")
            self.act(equip, f"equip the exact crafted instance {instance_id} through inventory comparison")
            state = self.state()
            equipped = state.get("reward", {}).get("equipped", {}).get(owner_id, {})
            equipped_slots = [slot for slot, value in equipped.items() if value == instance_id]
        if not equipped_slots:
            raise AssertionError(f"Crafted instance {instance_id} did not become equipped through visible inventory UI")
        self.log("crafted-instance-selected-and-equipped", instanceId=instance_id, slots=equipped_slots,
                 selectedRowLabel=selected_row.inner_text())
        return {"instanceId": instance_id, "selected": True, "equippedSlots": equipped_slots}

    def craft_if_ready(self, *, allow_craft: bool = True, required_material: str | None = None) -> bool:
        info = self.workbench_observation()
        if not info["available"]:
            return False
        observed = self.result.setdefault("craftingObservations", [])
        observed.append(info)
        if len(observed) > 40:
            del observed[:-40]
        section = self.workbench_section()
        recipe, _material = self.visible_recipe_controls()
        if recipe is not None and recipe.count() and recipe.get_attribute("aria-pressed") != "true":
            self.act(recipe, "select a currently visible recipe by its released semantic control")
        # Exercise the live neutral/fang/moonstone options as planner previews. Denied
        # previews are observations only; no engine API or state writes are used.
        options = section.locator("[data-crafting-material]")
        recipe_id = info.get("selectedRecipe") or "unidentified"
        previewed = self.result.setdefault("materialPreviewOptionsByRecipe", {})
        if options.count() and not previewed.get(recipe_id):
            choices = []
            neutral = None
            for index in range(options.count()):
                option = options.nth(index)
                if not option.is_visible():
                    continue
                option_id = option.get_attribute("data-crafting-material")
                if option_id == "none": neutral = option
                if option.get_attribute("aria-pressed") != "true":
                    self.act(option, f"select visible material influence option {option_id} for planner inspection")
                submit_check = section.locator("button[data-craft-submit]")
                if submit_check.count() != 1:
                    raise RuntimeError(f"Expected one native workbench submit button; got {submit_check.count()}")
                choices.append({"id": option_id, "label": option.inner_text().strip(),
                                "influenceCopy": section.locator("[data-crafting-influence-copy]").all_inner_texts(),
                                "plannerDenied": not (submit_check.is_visible() and not submit_check.is_disabled()),
                                "denial": section.locator("[role=status]").all_inner_texts()})
            previewed[recipe_id] = True
            self.result.setdefault("materialPreviewChoices", []).extend(choices)
            self.log("material-planner-previews", choices=choices)
            if neutral is not None and neutral.get_attribute("aria-pressed") != "true":
                self.act(neutral, "restore the neutral material option after read-only plan comparisons")
            info = self.workbench_observation()
            recipe, _material = self.visible_recipe_controls()
        if not allow_craft:
            self.log("planner-preview-only", observation=self.workbench_observation())
            return False
        # Agent policy can spend one held influence item when explicitly focused on
        # its value; otherwise rare materials are saved unless there is a surplus.
        # H's explicit wolfFang objective overrides that conservation policy.
        if options.count():
            focus = self.control().get("focus", "balanced")
            material_options: list[tuple[str, int]] = []
            for index in range(options.count()):
                option = options.nth(index)
                if not option.is_visible():
                    continue
                option_id = option.get_attribute("data-crafting-material")
                owned_match = re.search(r"持有\s*(\d+)", option.inner_text())
                owned = int(owned_match.group(1)) if owned_match else 0
                if option_id is not None:
                    material_options.append((option_id, owned))
            choice_id = choose_material_choice(material_options, focus=focus, required_material=required_material)
            if choice_id is not None:
                chosen = section.locator(f'[data-crafting-material="{choice_id}"]')
                if chosen.count() != 1 or not chosen.is_visible() or chosen.is_disabled():
                    raise AssertionError(f"Chosen material option {choice_id} is not a visible enabled native control")
                if chosen.get_attribute("aria-pressed") != "true":
                    self.act(chosen, f"choose visible influence material {choice_id} under focus={focus}")
        elif required_material is not None:
            raise AssertionError(f"Required hybrid material {required_material} has no visible native option")
        submit = section.locator("button[data-craft-submit]")
        if submit.count() != 1:
            raise RuntimeError(f"Expected one native workbench submit button; got {submit.count()}")
        if not submit.is_visible() or submit.is_disabled():
            self.log("planner-blocked", observation=self.workbench_observation())
            return False
        before = self.state()
        before_ids = {item.get("instanceId") for item in before.get("reward", {}).get("instances", [])}
        pressed_recipes = section.locator('button[data-craft-recipe][aria-pressed="true"]')
        pressed_materials = section.locator('[data-crafting-material][aria-pressed="true"]')
        if pressed_recipes.count() != 1 or not pressed_recipes.is_visible():
            raise AssertionError("Expected one visible aria-pressed recipe control immediately before craft")
        if pressed_materials.count() != 1 or not pressed_materials.is_visible():
            raise AssertionError("Expected one visible aria-pressed material control immediately before craft")
        final_recipe_id = pressed_recipes.get_attribute("data-craft-recipe")
        final_material_id = pressed_materials.get_attribute("data-crafting-material")
        final_selection = {"recipeId": final_recipe_id, "recipeAriaPressed": True,
                           "materialId": final_material_id, "materialAriaPressed": True}
        if required_material is not None and final_material_id != required_material:
            raise AssertionError(
                f"The final native material selection changed before craft: expected {required_material}, got {final_material_id}"
            )
        before_owner = before["activeCharacterId"]
        before_materials = before.get("reward", {}).get("materials", {}).get(before_owner, {})
        self.log("craft-submit-selection", selection=final_selection, requiredMaterial=required_material)
        self.act(submit, "submit the enabled normal workbench recipe")
        result_dialog = self.visible_dialog()
        assert result_dialog is not None
        result = result_dialog.locator(".window-body [data-craft-result]")
        expect(result).to_be_visible(timeout=5000)
        after = self.state()
        generated = [item for item in after.get("reward", {}).get("instances", [])
                     if item.get("instanceId") not in before_ids]
        if len(generated) != 1:
            raise AssertionError(f"One UI craft should yield one new instance; got {len(generated)}")
        item = generated[0]
        self.log("craft-result", visibleText=result.inner_text(), item={key: item.get(key) for key in
                 ("instanceId", "recipeId", "baseId", "rarity", "craftProvenance")})
        craft_record = {"item": item, "workbench": {**info, "finalSelection": final_selection}}
        self.result.setdefault("crafts", []).append(craft_record)
        if required_material is not None:
            after_owner = after["activeCharacterId"]
            if after_owner != before_owner:
                raise AssertionError("Active owner changed during the targeted craft transaction")
            after_materials = after.get("reward", {}).get("materials", {}).get(after_owner, {})
            craft_events = [event for event in after.get("events", [])
                            if event.get("id", -1) > before.get("eventSequence", -1)]
            legitimate_material_gains = material_loot_gains(craft_events, required_material)
            evidence = validate_required_material_craft(
                expected_material=required_material,
                selected_recipe=final_recipe_id,
                recipe_pressed=pressed_recipes.get_attribute("aria-pressed") == "true",
                selected_material=final_material_id,
                material_pressed=pressed_materials.get_attribute("aria-pressed") == "true",
                item=item,
                before_materials=before_materials,
                after_materials=after_materials,
                material_gains_during_craft=legitimate_material_gains,
            )
            craft_record["requiredMaterialEvidence"] = evidence
            self.result["hybridCraftEvidence"] = evidence
            self.log("hybrid-craft-contract", **evidence)
        craft_record["selectionAndEquipment"] = self.inspect_and_equip_crafted_instance(item)
        self.result.setdefault("equippedInstances", []).append(item["instanceId"])
        return True

    def select_policy_recipe(self) -> dict[str, Any] | None:
        """Inspect the live recipe registry, then select the most actionable current goal."""
        section = self.workbench_section()
        registry = section.locator("button[data-craft-recipe]")
        if registry.count() < 2:
            self.last_recipe_choice = None
            return None
        state = self.state()
        skill = active_character(state).get("skills", {}).get("smithing", {}).get("level", 1)
        observations: list[dict[str, Any]] = []
        for index in range(registry.count()):
            button = registry.nth(index)
            recipe_id = button.get_attribute("data-craft-recipe")
            if not button.is_visible() or button.is_disabled():
                observations.append({"recipeId": recipe_id, "selectable": False, "reason": "not visible or disabled"})
                continue
            if button.get_attribute("aria-pressed") != "true":
                self.act(button, f"inspect live recipe registry option {recipe_id}")
            neutral = section.locator('[data-crafting-material="none"]')
            if neutral.count() and neutral.get_attribute("aria-pressed") != "true":
                self.act(neutral, "use neutral material for comparable recipe planner preview")
            observation = self.workbench_observation()
            submit = section.locator("button[data-craft-submit]")
            if submit.count() != 1:
                raise RuntimeError(f"Expected one native workbench submit button; got {submit.count()}")
            enabled = submit.is_visible() and not submit.is_disabled()
            required_level = required_smithing_level(observation.get("text", ""))
            shortage = self.missing_base_input(observation, active_character(self.state()).get("inventory", {}))
            observations.append({"recipeId": recipe_id, "selectable": True, "recipeLabel": button.inner_text().strip(),
                                 "craftEnabled": enabled, "requiredSkill": required_level, "currentSkill": skill,
                                 "shortage": shortage, "denial": observation.get("disabledReason"),
                                 "inputRows": observation.get("inputRows", [])})
        crafted_counts: dict[str, int] = {}
        for craft in self.result.get("crafts", []):
            recipe_id = (craft.get("item", {}).get("craftProvenance") or {}).get("recipeId")
            if recipe_id: crafted_counts[recipe_id] = crafted_counts.get(recipe_id, 0) + 1
        selectable = [item for item in observations if item.get("selectable")]
        def score(item: dict[str, Any]) -> tuple[Any, ...]:
            skill_locked = recipe_skill_locked(item.get("requiredSkill"), skill)
            return (not item.get("craftEnabled", False), skill_locked,
                    crafted_counts.get(item["recipeId"], 0),
                    item.get("requiredSkill") if item.get("requiredSkill") is not None else 999,
                    observations.index(item))
        chosen = min(selectable, key=score) if selectable else None
        if chosen:
            button = section.locator(f'button[data-craft-recipe="{chosen["recipeId"]}"]')
            if button.count() != 1:
                raise RuntimeError(f"Expected one native recipe button for {chosen['recipeId']}; got {button.count()}")
            if button.get_attribute("aria-pressed") != "true":
                self.act(button, f"select adaptive Life Agent recipe goal {chosen['recipeId']}")
            neutral = section.locator('[data-crafting-material="none"]')
            if neutral.count() and neutral.get_attribute("aria-pressed") != "true":
                self.act(neutral, "reset selected material to neutral while evaluating recipe goals")
        self.result["recipeRegistryObservations"] = observations[-40:]
        self.log("recipe-policy-choice", focus=self.control().get("focus", "balanced"), candidates=observations,
                 chosen=chosen, score=score(chosen) if chosen else None)
        self.last_recipe_choice = chosen
        return chosen

    def missing_base_input(self, observation: dict[str, Any], inventory: dict[str, Any]) -> tuple[str, str, str] | None:
        sources = {"木材": ("wood", "forest", "伐木"),
                   "石材": ("stone", "mine", "採石"),
                   "鐵礦": ("iron", "mine", "採鐵礦")}
        for row in observation.get("inputRows", []):
            for visible_name, target in sources.items():
                if visible_name not in row:
                    continue
                required, held = re.search(r"×\s*(\d+)", row), re.search(r"持有\s*(\d+)", row)
                if required and held and int(held.group(1)) < int(required.group(1)):
                    return target
                if not held and inventory.get(target[0], 0) == 0:
                    return target
        # Influence materials are stored in a dedicated owner ledger, not base inventory.
        selected = observation.get("selectedMaterial")
        if selected and selected != "none":
            owner = self.state()["activeCharacterId"]
            current = self.state().get("reward", {}).get("materials", {}).get(owner, {}).get(selected, 0)
            if current < 1:
                return None
        return None

    def control(self) -> dict[str, Any]:
        path = self.run_dir / "control.json"
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {"stop": False, "focus": "balanced"}

    def timed_note(self, mode: str) -> None:
        elapsed = time.monotonic() - self.started
        if mode != "life" or elapsed - (self.last_life_note - self.started) < 600:
            return
        state = self.state()
        summary = state_summary(state)
        prior = self.result.get("lastLifeNoteState")
        prior_actor = active_character(prior) if prior else None
        current_actor = active_character(state)
        before_inventory = prior_actor.get("inventory", {}) if prior_actor else {}
        inventory_delta = {key: current_actor.get("inventory", {}).get(key, 0) - before_inventory.get(key, 0)
                           for key in set(current_actor.get("inventory", {})) | set(before_inventory)
                           if current_actor.get("inventory", {}).get(key, 0) != before_inventory.get(key, 0)}
        owner = state["activeCharacterId"]
        old_materials = (prior or {}).get("reward", {}).get("materials", {}).get(owner, {})
        new_materials = state.get("reward", {}).get("materials", {}).get(owner, {})
        material_delta = {key: new_materials.get(key, 0) - old_materials.get(key, 0)
                          for key in set(old_materials) | set(new_materials)
                          if new_materials.get(key, 0) != old_materials.get(key, 0)}
        old_ids = {item.get("instanceId") for item in (prior or {}).get("reward", {}).get("instances", [])}
        new_items = [item for item in state.get("reward", {}).get("instances", [])
                     if item.get("instanceId") not in old_ids]
        history = state.get("events", [])[-8:] + state.get("history", [])[-8:]
        visible_goals = self.page.locator("dialog.pixel-window[open] [data-life-goal], dialog.pixel-window[open] [data-adventure-goal]").all_inner_texts()
        current_recipe = self.last_recipe_choice
        if current_recipe:
            long_goal = (f"Work toward the currently selected recipe {current_recipe.get('recipeId')} "
                         f"({current_recipe.get('recipeLabel')}); required Smithing {current_recipe.get('requiredSkill')}, "
                         f"current Smithing {current_recipe.get('currentSkill')}, live shortages {current_recipe.get('shortage')}.")
        elif visible_goals:
            long_goal = "Continue from the currently visible goal: " + " | ".join(visible_goals)
        else:
            long_goal = "Find a currently released recipe and material path that fits the character's observed skill and inventory."
        recent = self.recent_actions[-30:]
        counts: dict[str, int] = {}
        for action in recent: counts[action] = counts.get(action, 0) + 1
        most = max(counts.values(), default=0)
        workbench = self.workbench_observation()
        note = {
            "atUTC": now_utc(), "elapsedMinutes": round(elapsed / 60, 1),
            "shortReward": {"inventoryDelta": inventory_delta, "ownedMaterialDelta": material_delta,
                            "newInstances": [{"instanceId": item.get("instanceId"), "recipeId": item.get("recipeId"),
                                              "baseId": item.get("baseId"), "rarity": item.get("rarity")}
                                             for item in new_items],
                            "smithing": current_actor.get("skills", {}).get("smithing"),
                            "worldTimeDelta": state.get("worldTime", 0) - (prior or {}).get("worldTime", state.get("worldTime", 0))},
            "midGoal": workbench if workbench["available"] else "Use the current visible planner denial and legal gathering route to clear the next requirement.",
            "longGoal": long_goal,
            "unexpected": history, "meaningfulChoice": {"recentActionCounts": counts, "focusControl": self.control().get("focus", "balanced"),
                                                          "visibleMaterialOption": workbench.get("selectedMaterial")},
            "information": {"currentGoals": visible_goals,
                             "visibleRecipe": workbench},
            "progress": summary,
            "drought": "repeated-action-pattern" if most >= 8 else None,
            "repetition": {"highestSameActionInRecent30": most, "actionWindow": recent},
            "agentAssessment": "runner-derived progress and friction notes; not human fun evidence",
        }
        self.result["lifeNotes"].append(note)
        self.result["lastLifeNoteState"] = state
        append_jsonl(self.run_dir / "life-notes.jsonl", note)
        self.log("life-note", elapsedMinutes=note["elapsedMinutes"], repetition=note["repetition"], drought=note["drought"])
        self.last_life_note = time.monotonic()

    def exercise(self, mode: str, end_at: float) -> None:
        self.page.wait_for_selector(".world-map", timeout=15000)
        self.pause_clock()
        self.result["openingState"] = state_summary(self.state())
        if mode == "stress":
            self.explore_secondary_surfaces(mode)
        last_periodic_reload = time.monotonic()
        last_recipe_token: str | None = None
        next_surface = 0
        while time.monotonic() < end_at:
            control = self.control()
            if control.get("stop") is True:
                self.log("requested-stop", via="run control file")
                break
            state = self.state()
            actor = active_character(state)
            if not actor.get("isAlive", True):
                raise RuntimeError("Character died; retain run evidence and do not auto-succession")
            # Resolve active combat only through its rendered controls.
            if state.get("combat"):
                dialog = self.visible_dialog(required=False)
                if dialog is None:
                    context = self.page.locator(".context-action")
                    if context.count() == 1 and context.is_visible():
                        self.act(context, "open the currently active normal combat window")
                attack = self.battle_button("攻擊")
                if attack.count() and attack.is_visible() and not attack.is_disabled():
                    self.act(attack, "take one visible combat turn")
                    continue
                raise RuntimeError("Combat state exists but normal attack control is unavailable")
            if actor.get("stamina", 0) < 10:
                self.close_dialog()
                if self.navigate_optional_place("inn"):
                    rest = self.rest_button("inn")
                    if rest.is_visible() and not rest.is_disabled():
                        self.act(rest, "rest at the visible inn when stamina is low")
                        continue
                self.close_dialog()
                # Home rest is free, uses the ordinary place action, and does
                # not depend on an inn having been built or becoming available.
                if self.navigate_optional_place("house"):
                    rest = self.rest_button("house")
                    if rest.is_visible() and not rest.is_disabled():
                        self.act(rest, "restore stamina through ordinary exact home-rest action")
                        continue
                raise RuntimeError("Low stamina but no normal visible rest route is currently available")
            # The policy starts with a normal station visit and uses its live planner to choose goals.
            self.navigate_place("store")
            current = self.state()
            actor = active_character(current)
            recipe_token = json.dumps({
                "skill": actor.get("skills", {}).get("smithing"),
                "inventory": actor.get("inventory", {}),
                "materials": current.get("reward", {}).get("materials", {}).get(current["activeCharacterId"], {}),
                "gold": actor.get("gold"), "stamina": actor.get("stamina"),
                "hour": current.get("worldTime", 0) // 60,
            }, ensure_ascii=False, sort_keys=True)
            if recipe_token != last_recipe_token and self.workbench_observation()["available"]:
                self.select_policy_recipe()
                last_recipe_token = recipe_token
            observation = self.workbench_observation()
            if observation["available"]:
                if self.craft_if_ready():
                    self.save_reload()
                else:
                    observation = self.workbench_observation()
                    shortage = self.missing_base_input(observation, actor.get("inventory", {}))
                    self.log("planner-observation", observation=observation, selectedShortage=shortage)
                    self.close_dialog()
                    if shortage:
                        item, region, action_label = shortage
                        self.navigate_place(region)
                        action = self.resource_button(region, action_label)
                        if action.is_visible() and not action.is_disabled():
                            self.act(action, f"gather planner-requested {item} through normal visible UI")
                        else:
                            self.log("blocked-action", action=f"gather {item}", reason="visible action absent or disabled")
                    elif any("工作台目前未營業" in text for text in observation.get("disabledReason", [])):
                        self.advance_until_station_open("visible planner reports station_closed")
                    elif any("體力不足" in text for text in observation.get("disabledReason", [])):
                        required_match = re.search(r"體力\s*(\d+).*?目前\s*(\d+)", observation.get("text", ""))
                        required = int(required_match.group(1)) if required_match else 10
                        for _ in range(20):
                            current_stamina = active_character(self.state()).get("stamina", 0)
                            if current_stamina >= required: break
                            self.close_dialog()
                            self.navigate_place("house")
                            rest = self.rest_button("house")
                            if not rest.is_visible() or rest.is_disabled():
                                raise RuntimeError("Planner requires stamina but no legal exact home-rest control is available")
                            self.act(rest, "restore stamina with ordinary visible home rest")
                        self.close_dialog()
                    elif mode == "life" and next_surface % 3 != 0:
                        # Exploration is driven by live goal/reward cues and remains ordinary UI play.
                        self.navigate_place("forest")
                        encounter = self.place_action_button("forest", "尋找怪物 · 體力 8")
                        if encounter.is_visible() and not encounter.is_disabled():
                            self.act(encounter, "pursue the currently visible normal adventure action")
                        else:
                            self.inventory_cycle()
                        next_surface += 1
                    elif mode == "stress" and next_surface % 4 == 2:
                        self.navigate_place("forest")
                        encounter = self.place_action_button("forest", "尋找怪物 · 體力 8")
                        if encounter.is_visible() and not encounter.is_disabled():
                            self.act(encounter, "start a normal visible encounter during integrated stress")
                        else:
                            self.log("combat-unavailable", visibleButton=encounter.all_inner_texts())
                        next_surface += 1
                    else:
                        self.inventory_cycle()
                        if next_surface % 2 == 0:
                            self.navigate_place("farm")
                            self.close_dialog()
                        next_surface += 1
            else:
                dialog = self.visible_dialog(required=False)
                self.log("workbench-unavailable", visiblePlaceText=dialog.inner_text()[:800] if dialog is not None else "")
                self.close_dialog()
                self.inventory_cycle()
                if next_surface % 2 == 0:
                    self.navigate_place("farm")
                    self.close_dialog()
                next_surface += 1
            self.timed_note(mode)
            self.checkpoint("scheduled")
            reload_interval = 300 if mode == "stress" else 600
            if time.monotonic() - last_periodic_reload >= reload_interval:
                self.save_reload()
                last_periodic_reload = time.monotonic()

    def hybrid(self, end_at: float) -> None:
        """Run one legal guaranteed-wolf-material → craft/equip → next-combat pilot."""
        self.page.wait_for_selector(".world-map", timeout=15000)
        self.pause_clock()
        self.navigate_place("forest")
        forest_dialog = self.visible_dialog(self.live_interaction_label("forest"))
        assert forest_dialog is not None
        rows = forest_dialog.locator(".window-body .wolf-track-row[data-wolf-track]")
        eligible = [rows.nth(i) for i in range(rows.count())
                    if rows.nth(i).is_visible() and not rows.nth(i).locator("button").is_disabled()
                    and "保底" in rows.nth(i).locator("[data-wolf-reward-expectation]").inner_text()]
        baseline_targets = [row for row in eligible if row.get_attribute("data-wolf-track") == "grayWolf"]
        if len(baseline_targets) != 1:
            self.result["status"] = "BLOCKED_HYBRID_ROUTE_UNAVAILABLE"
            self.result["blocker"] = "The ordinary fresh route did not expose exactly one eligible guaranteed-material grayWolf control."
            return
        self.result["hybridAvailableTargets"] = [row.get_attribute("data-wolf-track") for row in eligible]
        baseline_target = baseline_targets[0]
        baseline_id = baseline_target.get_attribute("data-wolf-track")
        reward_expectation = baseline_target.locator("[data-wolf-reward-expectation]").inner_text()
        before_fight = self.state()
        encounter_button = baseline_target.locator("button")
        if encounter_button.count() != 1:
            raise RuntimeError(f"Expected one actionable button in grayWolf row; got {encounter_button.count()}")
        self.act(encounter_button, "begin the currently eligible guaranteed-material wolf encounter")
        combat_start = self.state()
        self.result["hybridBaselineEncounter"] = {"target": baseline_id, "combatStart": state_summary(combat_start),
                                                    "rewardExpectation": reward_expectation}
        while time.monotonic() < end_at and self.state().get("combat"):
            self.act(self.battle_button("攻擊"), "resolve the normal visible wolf combat turn")
        after = self.state()
        events = after.get("events", [])[len(before_fight.get("events", [])):]
        owner_id = after["activeCharacterId"]
        before_materials = before_fight.get("reward", {}).get("materials", {}).get(owner_id, {})
        after_materials = after.get("reward", {}).get("materials", {}).get(owner_id, {})
        material_delta = {material: after_materials.get(material, 0) - before_materials.get(material, 0)
                          for material in set(before_materials) | set(after_materials)
                          if after_materials.get(material, 0) > before_materials.get(material, 0)}
        actual_materials = sorted(material_delta)
        self.result["hybridBaselineOutcome"] = {"events": events, "actualMaterialIDs": actual_materials,
                                                 "actualMaterialDelta": material_delta,
                                                 "postCombat": state_summary(after)}
        if material_delta.get("wolfFang", 0) < 1:
            self.result["status"] = "BLOCKED_NO_MATERIAL_OBTAINED"
            self.result["blocker"] = "The legal encounter did not persist the expected guaranteed wolfFang increase for this character."
            return
        self.inventory_cycle()
        self.navigate_place("store")
        # Populate dynamic preview evidence without spending materials, then select the
        # actual newly earned material by its canonical ID from the visible registry.
        self.craft_if_ready(allow_craft=False)
        section = self.workbench_section()
        available = section.locator("[data-crafting-material]")
        matching = [available.nth(i) for i in range(available.count()) if available.nth(i).is_visible()
                    and available.nth(i).get_attribute("data-crafting-material") == "wolfFang"]
        if len(matching) != 1:
            self.result["status"] = "BLOCKED_NO_TARGETED_CRAFT_OPTION"
            self.result["blocker"] = "The live workbench did not expose exactly one wolfFang option for the actual reward ID."
            return
        # Obtain only missing inputs identified by the actual rendered planner. The
        # fang remains owned throughout these ordinary gather trips.
        for attempt in range(12):
            option = section.locator('[data-crafting-material="wolfFang"]')
            if option.count() != 1 or not option.is_visible() or option.is_disabled():
                raise RuntimeError(f"Expected one visible enabled wolfFang material button; got {option.count()}")
            if option.get_attribute("aria-pressed") != "true":
                self.act(option, "select the actual legally earned wolfFang option")
            planner = self.workbench_observation()
            submit = section.locator("button[data-craft-submit]")
            if submit.count() != 1:
                raise RuntimeError(f"Expected one native workbench submit button; got {submit.count()}")
            can_craft = submit.is_visible() and not submit.is_disabled()
            if can_craft:
                break
            shortage = self.missing_base_input(planner, active_character(self.state()).get("inventory", {}))
            if not shortage:
                self.result["status"] = "BLOCKED_TARGETED_CRAFT_PLANNER"
                self.result["blocker"] = {"planner": planner, "note": "Fang selected; current public plan has no actionable known inventory input shortage."}
                return
            item, region, action_label = shortage
            self.log("hybrid-input-shortage", materialID="wolfFang", shortage=item, planner=planner)
            self.close_dialog()
            self.navigate_place(region)
            action = self.resource_button(region, action_label)
            action_visible = action.is_visible()
            if not action_visible or action.is_disabled():
                self.result["status"] = "BLOCKED_HYBRID_INPUT_GATHER"
                self.result["blocker"] = {"item": item, "region": region, "actionVisible": action_visible}
                return
            self.act(action, f"legally gather the live planner's missing {item} input")
            self.navigate_place("store")
        else:
            self.result["status"] = "BLOCKED_HYBRID_INPUT_LIMIT"
            self.result["blocker"] = "Planner inputs did not become craftable within bounded legal gathering." 
            return
        if not self.craft_if_ready(required_material="wolfFang"):
            self.result["status"] = "BLOCKED_TARGETED_CRAFT_PLANNER"
            self.result["blocker"] = self.workbench_observation()
            return
        crafted = self.result.get("crafts", [])[-1]["item"]
        self.save_reload()
        # Return to a normal eligible wolf encounter and preserve any enemy/progression
        # differences as explicit comparison confounds for the later paired combat matrix.
        state = self.state()
        if crafted.get("instanceId") not in state.get("reward", {}).get("equipped", {}).get(state["activeCharacterId"], {}).values():
            self.result["status"] = "BLOCKED_TARGET_NOT_EQUIPPED"
            self.result["blocker"] = "Crafted targeted instance did not persist as an equipped item."
            return
        self.navigate_place("forest")
        forest_dialog = self.visible_dialog(self.live_interaction_label("forest"))
        assert forest_dialog is not None
        current_rows = forest_dialog.locator(".window-body .wolf-track-row[data-wolf-track]")
        post_targets = [current_rows.nth(i) for i in range(current_rows.count())
                        if current_rows.nth(i).is_visible() and not current_rows.nth(i).locator("button").is_disabled()]
        normal_targets = [row for row in post_targets if row.get_attribute("data-rank") == "normal"]
        if not normal_targets:
            self.result["status"] = "BLOCKED_RETURN_COMBAT_UNAVAILABLE"
            self.result["blocker"] = "No eligible normal wolf encounter remains after crafting/equipping."
            return
        post_target = min(normal_targets, key=lambda row: row.get_attribute("data-wolf-track") or "")
        post_target_id = post_target.get_attribute("data-wolf-track")
        post_button = post_target.locator("button")
        if post_button.count() != 1:
            raise RuntimeError(f"Expected one actionable button for {post_target_id}; got {post_button.count()}")
        self.act(post_button, "return to a currently eligible visible wolf encounter after equipping")
        repeat_start = self.state()
        while time.monotonic() < end_at and self.state().get("combat"):
            self.act(self.battle_button("攻擊"), "resolve post-equipment normal visible combat turn")
        repeat_end = self.state()
        if not combat_victory_observed(repeat_start, repeat_end):
            self.result["status"] = "BLOCKED_RETURN_COMBAT_UNRESOLVED"
            self.result["blocker"] = {
                "startingCombat": state_summary(repeat_start),
                "postCombat": state_summary(repeat_end),
                "reason": "The run ended before a terminal combat.won event was observed after equipping.",
            }
            return
        self.result["hybridEquippedOutcome"] = {"target": post_target_id,
            "startingCombat": state_summary(repeat_start), "events": repeat_end.get("events", [])[-12:],
            "postCombat": state_summary(repeat_end)}
        self.result["hybridComparison"] = {"sameVisibleTarget": post_target_id == baseline_id,
                                             "differentTargetConfound": post_target_id != baseline_id,
                                             "exactCausalComparisonDeferredToCombatMatrix": True,
                                             "preEquip": self.result["hybridBaselineOutcome"],
                                             "postEquip": self.result["hybridEquippedOutcome"],
                                             "outcomeDifference": state_summary(after) != state_summary(repeat_end)}
        self.save_reload()


def wire_error_capture(page: Page, result: dict[str, Any]) -> None:
    page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
    page.on("console", lambda message: result["consoleErrors"].append(message.text)
            if message.type == "error" else None)
    page.on("requestfailed", lambda request: result["requestFailures"].append(
        {"url": request.url, "error": request.failure}))
    page.on("response", lambda response: result["httpFailures"].append(
        {"url": response.url, "status": response.status}) if response.status >= 400 else None)


def validate_execution_gate(mode: str) -> dict[str, Any]:
    release_path = PHASE / "browser-release.json"
    if not release_path.is_file():
        raise RuntimeError("Root browser release marker is missing; no production browser QA may start")
    release = json.loads(release_path.read_text(encoding="utf-8"))
    build = validate_build(ROOT, BUILD_PATH)
    current = provenance(ROOT, BUILD_PATH, [LAUNCHER, DRIVER, SUPPORT])
    if release.get("authorized") is not True:
        raise RuntimeError("browser-release.json does not authorize execution")
    if mode not in release.get("authorizedModes", []):
        raise RuntimeError(f"browser-release.json does not authorize mode {mode}")
    if release.get("sourceFingerprint") != current["sourceFingerprint"]:
        raise RuntimeError("Root release source fingerprint differs from current recursive source")
    if release.get("buildStatusSha256") != current["buildStatusSha256"]:
        raise RuntimeError("Root release build-status hash differs from current successful build evidence")
    if release.get("distFingerprint") != current["distFingerprint"]:
        raise RuntimeError("Root release dist fingerprint differs from current production assets")
    if release.get("qaFilesSha256") != current["ownedHarnessAndHelperSha256"]:
        raise RuntimeError("Root release QA script/helper fingerprints differ from the current drivers")
    return {"release": release, "build": build, "provenance": current}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="execute only after Root's explicit release marker exists")
    parser.add_argument("--mode", choices=tuple(MINIMUMS), required=False)
    parser.add_argument("--seconds", type=int)
    parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", choices=("low", "medium", "max"), default="low")
    parser.add_argument("--run-id", required=False, help="launcher-generated unique id")
    parser.add_argument("--url", default=os.environ.get("PLW_V2_URL", ""))
    parser.add_argument("--run-dir", type=Path)
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: no browser starts without --go and a matching Root browser-release.json")
        return 0
    if not args.mode:
        parser.error("--mode is required with --go")
    minimum, maximum = MINIMUMS[args.mode]
    duration = args.seconds if args.seconds is not None else (maximum if args.mode == "hybrid-short" else minimum)
    if duration < minimum or duration > maximum:
        parser.error(f"{args.mode} requires {minimum}..{maximum} real seconds")
    if not args.run_dir or not args.run_id or not args.url:
        parser.error("launcher must supply --run-dir, --run-id, and --url")
    release_evidence = validate_execution_gate(args.mode)
    run_dir = args.run_dir.resolve()
    driver_artifacts = ("operations.jsonl", "checkpoints.jsonl", "life-notes.jsonl", "control.json",
                        "failure-save.json", f"{args.mode}-result.json")
    if not run_dir.is_dir() or any((run_dir / name).exists() for name in driver_artifacts):
        raise RuntimeError("Launcher must provide a unique run directory without preexisting driver artifacts")
    (run_dir / "control.json").write_text(json.dumps({"stop": False, "focus": "balanced"}, indent=2) + "\n", encoding="utf-8")
    own_files = [LAUNCHER, DRIVER, SUPPORT]
    result: dict[str, Any] = {
        "status": "IN_PROGRESS", "phase": {"stress": "20–30m integrated browser stress", "life": "30–60m Life Agent playtest", "hybrid-short": "H short Adventure → Life → Adventure pilot"}[args.mode],
        "runId": args.run_id, "mode": args.mode, "durationMinimumSeconds": minimum,
        "durationTargetSeconds": duration, "producer": f"phase5-{args.mode}-browser-qa",
        "harnessAuthor": {"requestedAgent": "g6_luna_med_phase5_browser_qa_engineer", "requestedModel": "GPT-6 Luna",
                          "requestedEffort": "medium", "backendRuntimeVerified": False},
        "runnerExecution": {"requestedModel": args.execution_model, "requestedEffort": args.execution_effort,
                            "backendRuntimeVerified": False, "providedBy": "explicit launcher arguments"},
        "policyExecution": {"controller": "deterministic runner-driven policy", "modelInference": "none",
                            "adaptationInputs": "visible UI plan and read-only current-state telemetry"},
        "sourceBefore": release_evidence["provenance"], "releaseMarker": release_evidence["release"],
        "buildStatusPath": str(BUILD_PATH), "url": args.url,
        "normalFreshSave": {"isolatedContext": True, "stateInjected": False, "debugTimeOrStateInjection": False},
        "controlledFixture": False, "humanValidation": {"status": "DEFERRED / NOT APPLICABLE AT THIS STAGE"},
        "startUTC": now_utc(), "pageErrors": [], "consoleErrors": [], "requestFailures": [], "httpFailures": [],
        "rejections": [], "storageErrors": [], "uiLatencyMs": [], "operations": 0,
        "reloads": 0, "dialogCycles": 0, "checkpointCount": 0, "lifeNotes": [],
        "limitations": ["Runner-driven browser QA is not human product validation.",
                        "Source/build release correlation is required before every run.",
                        "Life Agent notes are observations, not fun or retention proof."],
    }
    error: BaseException | None = None
    playwright = browser = context = page = cdp = None
    try:
        evidence = release_evidence["provenance"]
        from phase05_browser_support import verify_http_dist
        status = release_evidence["build"]
        result["servedAssets"] = verify_http_dist(ROOT, args.url, status)
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        page = context.new_page()
        attach_early_error_capture(page)
        wire_error_capture(page, result)
        page.goto(args.url, wait_until="domcontentloaded")
        guard = page.evaluate("window.__qaPreAppSaveObservation || null")
        if not guard or guard.get("error") or guard.get("readyState") != "loading" or guard.get("present") is not False:
            raise RuntimeError(f"Isolated storage guard did not run before app startup: {guard}")
        result["preAppGuard"] = guard
        opening = page.locator("dialog.pixel-window[open]")
        if opening.count() != 1:
            raise RuntimeError(f"Expected one native opening dialog before starting; got {opening.count()}")
        if BrowserDriver.dialog_title(opening) != "在陌生的天空下":
            raise RuntimeError("The currently open native dialog is not the normal opening screen")
        start = BrowserDriver.unique_button(opening.locator(".window-body .life-opening"), "起身")
        expect(start).to_be_enabled(timeout=15000)
        start.click()
        page.wait_for_selector(".world-map", timeout=15000)
        cdp = context.new_cdp_session(page)
        driver = BrowserDriver(page, run_dir, result, cdp)
        driver.initialize_profiling()
        driver.action_count = 1
        result["operations"] = 1
        driver.log("visible-ui-action", label="begin a normal fresh life from the opening screen",
                   after=state_summary(driver.state()))
        driver.pause_clock()
        opening_state = driver.state()
        if opening_state.get("life", {}).get("openingSeen") is not True:
            raise AssertionError("Normal opening-screen action did not create the expected openingSeen save")
        if opening_state.get("combat") is not None or opening_state.get("dungeon", {}).get("inDungeon") is not False:
            raise AssertionError("Normal fresh opening save began inside combat or a dungeon")
        if opening_state.get("reward", {}).get("instances") != []:
            raise AssertionError("Fresh normal opening save unexpectedly contains a reward instance")
        result["nativeOpeningState"] = state_summary(opening_state)
        result["nativeOpeningSave"] = {"createdByNormalOpeningAction": True,
                                       "openingSeen": opening_state["life"]["openingSeen"],
                                       "activeCharacterId": opening_state["activeCharacterId"],
                                       "characterCount": len(opening_state.get("characters", [])),
                                       "worldTime": opening_state.get("worldTime"),
                                       "eventSequence": opening_state.get("eventSequence"),
                                       "freshRewardInstances": len(opening_state["reward"]["instances"])}
        deadline = time.monotonic() + duration
        if args.mode == "hybrid-short":
            driver.hybrid(deadline)
        else:
            driver.exercise(args.mode, deadline)
        # A completed mode routine that did not set a blocker/failure is a pass.
        # This applies equally to the short Hybrid journey and the timed modes.
        mark_completed_if_in_progress(result)
        result["finalState"] = state_summary(driver.state())
        driver.checkpoint("final", force=True)
        result["finalTelemetryCheckpoint"] = driver.last_checkpoint
        errors = page.evaluate("({rejections:window.__qaRejections || [], storageErrors:window.__qaStorageErrors || []})")
        result["rejections"] = errors["rejections"]
        result["storageErrors"] = errors["storageErrors"]
        if (result["pageErrors"] or result["consoleErrors"] or result["requestFailures"] or result["httpFailures"]
                or result["rejections"] or result["storageErrors"]):
            result["status"] = "FAILED_BROWSER_ERRORS"
        if result["status"] == "PASS" and driver.action_count < 1:
            result["status"] = "FAILED_NO_VISIBLE_ACTIONS"
        if args.mode in ("stress", "life") and time.monotonic() - driver.started < minimum:
            result["status"] = "STOPPED_BEFORE_MINIMUM"
    except BaseException as exc:
        error = exc
        if result["status"] == "IN_PROGRESS": result["status"] = "FAILED"
        result["error"] = f"{type(exc).__name__}: {exc}"
        result["failureUTC"] = now_utc()
        try:
            if page is not None:
                save = page.evaluate("localStorage.getItem('oakvale-v1')")
                if save:
                    (run_dir / "failure-save.json").write_text(save + "\n", encoding="utf-8")
        except BaseException as capture_error:
            result["failureCaptureError"] = f"{type(capture_error).__name__}: {capture_error}"
    finally:
        cleanup_errors = []
        if cdp is not None:
            try: cdp.detach()
            except BaseException as exc: cleanup_errors.append(f"CDP: {type(exc).__name__}: {exc}")
        for resource in (context, browser):
            if resource is not None:
                try: resource.close()
                except BaseException as exc: cleanup_errors.append(f"Browser: {type(exc).__name__}: {exc}")
        if playwright is not None:
            try: playwright.stop()
            except BaseException as exc: cleanup_errors.append(f"Playwright.stop: {type(exc).__name__}: {exc}")
        result["browserCleanupErrors"] = cleanup_errors
        if cleanup_errors: result["status"] = "FAILED_CLEANUP"
        try:
            result["sourceAfter"] = provenance(ROOT, BUILD_PATH, own_files)
            result["sourceStableDuringRun"] = result["sourceBefore"] == result["sourceAfter"]
            if not result["sourceStableDuringRun"]: result["status"] = "FAILED_PROVENANCE_CHANGED"
        except BaseException as exc:
            result["sourceAfterError"] = f"{type(exc).__name__}: {exc}"
            result["status"] = "FAILED_PROVENANCE_CHECK"
        result["endUTC"] = now_utc()
        result["durationSeconds"] = round((datetime.now(timezone.utc) - datetime.fromisoformat(result["startUTC"])).total_seconds(), 2)
        # One compact published projection per run; raw operations and checkpoints remain append-only JSONL.
        try: publish_recorded(ROOT, run_dir / f"{args.mode}-result.json", result, result["producer"])
        except BaseException as publish_error:
            result["reportPublishError"] = f"{type(publish_error).__name__}: {publish_error}"
        print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    return 0 if result["status"] == "PASS" and result.get("sourceStableDuringRun") else 1


if __name__ == "__main__":
    raise SystemExit(main())

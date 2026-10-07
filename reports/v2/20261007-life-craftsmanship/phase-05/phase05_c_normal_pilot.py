"""Phase 5-C normal fresh-save browser pilot; inert unless explicitly run with --go.

This is a preparation artifact. It requires the released C UI, a production build
status matching the current recursive source manifest, and Root's separate go
for browser execution. All world mutations are visible UI actions.
"""
from __future__ import annotations

import argparse
from collections import deque
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
from typing import Any
from urllib.request import urlopen

from playwright.sync_api import Page, expect, sync_playwright


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir():
            return candidate
    raise RuntimeError(f"Could not locate plw-rpg above {script}")


ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261007-life-craftsmanship/phase-05"
RUNS = PHASE / "browser-runs"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "build-status.json"))
SAVE_KEY = "oakvale-v1"
PRODUCER = "phase5-c-normal-fresh-save-pilot"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def production_source_map() -> dict[str, str]:
    """Hash every production source file, including untracked files under src/."""
    candidates = {path for path in (ROOT / "src").rglob("*") if path.is_file()}
    return {
        path.relative_to(ROOT).as_posix(): sha(path)
        for path in sorted(candidates, key=lambda item: item.relative_to(ROOT).as_posix())
    }


def source_fingerprint(values: dict[str, str]) -> str:
    body = json.dumps(values, ensure_ascii=False, separators=(",", ":")).encode()
    return hashlib.sha256(body).hexdigest()


def provenance() -> dict[str, Any]:
    helper = Path(__file__).resolve()
    source = production_source_map()
    dist = ({path.relative_to(ROOT).as_posix(): sha(path)
             for path in sorted((ROOT / "dist").rglob("*")) if path.is_file()}
            if (ROOT / "dist").is_dir() else {})
    return {
        "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "branch": subprocess.check_output(["git", "branch", "--show-current"], cwd=ROOT, text=True).strip(),
        "sourceSha256": source,
        "sourceFingerprint": source_fingerprint(source),
        "distSha256": dist,
        "harnessSha256": sha(helper),
        "recordedReportsSha256": sha(ROOT / "scripts/recorded_reports.py"),
        "buildStatusSha256": sha(BUILD_PATH),
    }


def parse_build_status() -> dict[str, Any]:
    if not BUILD_PATH.is_file():
        raise RuntimeError(f"Missing current production build status: {BUILD_PATH}")
    status = json.loads(BUILD_PATH.read_text(encoding="utf-8"))
    source = production_source_map()
    if status.get("exitCode") != 0 or status.get("sourceStableDuringRun") is not True:
        raise RuntimeError("Build status does not report a successful stable build")
    if status.get("sourceSha256") != source:
        raise RuntimeError("Build source map differs from current recursive production source map")
    return status


def record(path: Path, payload: dict[str, Any]) -> None:
    sys.path.insert(0, str(ROOT))
    from scripts.recorded_reports import write_recorded
    write_recorded(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n", producer=PRODUCER)


def record_text(path: Path, body: str) -> None:
    sys.path.insert(0, str(ROOT))
    from scripts.recorded_reports import write_recorded
    write_recorded(path, body, producer=PRODUCER)


def close_playwright_resources(context: Any, browser: Any, playwright: Any,
                               result: dict[str, Any],
                               primary_error: BaseException | None = None) -> BaseException | None:
    """Close browser resources, then stop the Playwright object returned by start()."""
    errors = []
    for resource in (context, browser):
        if resource is None:
            continue
        try:
            resource.close()
        except BaseException as error:
            errors.append(f"{type(error).__name__}: {error}")
    if playwright is not None:
        try:
            playwright.stop()
        except BaseException as error:
            errors.append(f"{type(error).__name__}: {error}")
    if errors:
        result.setdefault("browserCleanupErrors", []).extend(errors)
        if primary_error is None:
            return RuntimeError("Browser cleanup failed: " + "; ".join(errors))
    return None


def close_owned_server(server: subprocess.Popen | None, server_log: Any,
                       result: dict[str, Any],
                       primary_error: BaseException | None = None) -> BaseException | None:
    """Stop only the loopback server owned by this run and retain cleanup failures."""
    errors = []
    if server is not None:
        try:
            if server.poll() is None:
                server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()
        except BaseException as error:
            errors.append(f"{type(error).__name__}: {error}")
    if server_log is not None:
        try:
            server_log.close()
        except BaseException as error:
            errors.append(f"{type(error).__name__}: {error}")
    if errors:
        result.setdefault("runnerCleanupErrors", []).extend(errors)
        if primary_error is None:
            return RuntimeError("Runner cleanup failed: " + "; ".join(errors))
    return None


def finalize_result(result: dict[str, Any], run_dir: Path) -> int:
    """Attach final source evidence and publish the result, including failed runs."""
    try:
        result["sourceAfter"] = provenance()
        result["sourceStableDuringRun"] = result["sourceBefore"] == result["sourceAfter"]
        if not result["sourceStableDuringRun"]:
            result["status"] = "FAILED_PROVENANCE_CHANGED"
    except BaseException as error:
        result["sourceAfterError"] = f"{type(error).__name__}: {error}"
        result["status"] = "FAILED_PROVENANCE_CHECK"
    result["endUTC"] = datetime.now(timezone.utc).isoformat()
    result["durationSeconds"] = round(
        (datetime.now(timezone.utc) - datetime.fromisoformat(result["startUTC"])).total_seconds(), 2)
    record(run_dir / "pilot-result.json", result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "PASS" and result.get("sourceStableDuringRun") else 1


class Pilot:
    def __init__(self, page: Page, run_dir: Path, result: dict[str, Any]):
        self.page = page
        self.run_dir = run_dir
        self.result = result
        self.raw_path = run_dir / "actions.jsonl"
        self.started = time.monotonic()

    def log(self, kind: str, **detail: Any) -> None:
        entry = {"atUTC": datetime.now(timezone.utc).isoformat(), "elapsedSeconds": round(time.monotonic() - self.started, 3),
                 "kind": kind, **detail}
        with self.raw_path.open("a", encoding="utf-8") as output:
            output.write(json.dumps(entry, ensure_ascii=False) + "\n")
            output.flush()
            os.fsync(output.fileno())

    def state(self) -> dict[str, Any]:
        value = self.page.evaluate("localStorage.getItem('oakvale-v1')")
        if value is None:
            raise AssertionError("Native fresh-save key oakvale-v1 is missing")
        return json.loads(value)

    @staticmethod
    def actor(state: dict[str, Any]) -> dict[str, Any]:
        return next(item for item in state["characters"] if item["id"] == state["activeCharacterId"])

    def action(self, locator, label: str) -> None:
        expect(locator).to_be_visible(timeout=5000)
        if locator.is_disabled():
            raise AssertionError(f"Visible UI action is disabled: {label}")
        before = self.state()
        started = time.monotonic()
        locator.click(timeout=5000)
        duration_ms = round((time.monotonic() - started) * 1000, 1)
        self.log("ui-action", label=label, latencyMs=duration_ms,
                 beforeWorldTime=before.get("worldTime"), beforeEventSequence=before.get("eventSequence"))
        self.result["uiLatencyMs"].append(duration_ms)

    def checkpoint(self, reason: str) -> dict[str, Any]:
        state = self.state()
        actor = self.actor(state)
        telemetry = self.page.evaluate("""async () => {
          const estimate = await navigator.storage.estimate();
          const save = localStorage.getItem('oakvale-v1') || '';
          return {saveBytes:new TextEncoder().encode(save).length,
            storage:{usage:estimate.usage ?? null, quota:estimate.quota ?? null},
            storageErrors:window.__qaStorageErrors || [],
            dom:{nodes:document.getElementsByTagName('*').length,
              dialogs:document.querySelectorAll('dialog[open]').length},
            heap:performance.memory ? {used:performance.memory.usedJSHeapSize,
              total:performance.memory.totalJSHeapSize, limit:performance.memory.jsHeapSizeLimit} : null};
        }""")
        snapshot = {"atUTC": datetime.now(timezone.utc).isoformat(), "elapsedSeconds": round(time.monotonic() - self.started, 2),
                    "reason": reason, "worldTime": state["worldTime"], "rngState": state["rngState"],
                    "eventSequence": state["eventSequence"], "npcCount": len(state["npcs"]),
                    "gold": actor["gold"], "stamina": actor["stamina"], "inventory": actor["inventory"],
                    "smithing": actor["skills"]["smithing"], "instances": len(state["reward"]["instances"]), **telemetry}
        self.result["checkpoints"].append(snapshot)
        self.log("checkpoint", **snapshot)
        return state

    def nearby_place(self, label: str) -> None:
        page = self.page
        trigger = page.locator(".nearby-trigger")
        if trigger.count() and trigger.is_visible():
            self.action(trigger, "open nearby interactions")
            rows = page.locator(".interaction-list button")
            matches = [rows.nth(i) for i in range(rows.count()) if label in re.sub(r"\s+", " ", rows.nth(i).inner_text()).strip()]
            if len(matches) != 1:
                raise AssertionError(f"Expected one visible interaction for {label}; got {len(matches)}")
            self.action(matches[0], f"open {label}")
        else:
            action = page.locator(".context-action")
            if label not in action.inner_text():
                raise AssertionError(f"Current primary interaction is not {label}: {action.inner_text()}")
            self.action(action, f"open {label}")

    def route_to_near_store(self) -> None:
        """Walk by visible direction controls to a tile adjacent to the store."""
        state = self.state()
        tiles = {(tile["x"], tile["y"]): tile for tile in state["tiles"] if tile.get("walkable")}
        store_tile = next((tile for tile in state["tiles"] if tile.get("building") == "store"), None)
        if store_tile is None:
            raise AssertionError("Current save map does not expose the existing store building")
        target_building = {"x": store_tile["x"], "y": store_tile["y"]}
        targets = [position for position in tiles if abs(position[0] - target_building["x"]) + abs(position[1] - target_building["y"]) <= 1]
        if not targets:
            raise AssertionError("No walkable tile adjacent to the visible store exists in the save map")
        start = self.actor(state)["position"]
        path = shortest_path(tiles, (start["x"], start["y"]), targets)
        direction_names = {(0, -1): "往上", (0, 1): "往下", (-1, 0): "往左", (1, 0): "往右"}
        for current, target in zip(path, path[1:]):
            delta = (target[0] - current[0], target[1] - current[1])
            self.action(self.page.get_by_role("button", name=direction_names[delta], exact=True),
                        f"walk one legal map step {delta}")
        final = self.actor(self.state())["position"]
        if abs(final["x"] - target_building["x"]) + abs(final["y"] - target_building["y"]) > 1:
            raise AssertionError(f"Normal UI navigation did not reach the store: {final}")
        self.log("navigation", target="store", position=final, visibleMovementSteps=max(0, len(path) - 1))


def shortest_path(tiles: dict[tuple[int, int], dict[str, Any]], start: tuple[int, int], targets: list[tuple[int, int]]) -> list[tuple[int, int]]:
    queue = deque([start])
    previous: dict[tuple[int, int], tuple[int, int] | None] = {start: None}
    target_set = set(targets)
    found = start if start in target_set else None
    while queue and found is None:
        current = queue.popleft()
        for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
            candidate = (current[0] + dx, current[1] + dy)
            if candidate in tiles and candidate not in previous:
                previous[candidate] = current
                if candidate in target_set:
                    found = candidate
                    break
                queue.append(candidate)
    if found is None:
        raise AssertionError(f"No legal walkable route from {start} to store-adjacent tiles")
    path = [found]
    while previous[path[-1]] is not None:
        path.append(previous[path[-1]])  # type: ignore[arg-type]
    return list(reversed(path))


def validate_native_opening_baseline(state: dict[str, Any], opening_seen: bool) -> dict[str, Any]:
    """Validate the real app-created opening save without supplying or changing state."""
    actor = Pilot.actor(state)
    inventory = actor["inventory"]
    checks = {
        "worldTime": state.get("worldTime") == 480,
        "eventSequence": state.get("eventSequence") == 1,
        "openingSeen": state.get("life", {}).get("openingSeen") is opening_seen,
        "gold": actor.get("gold") == 45,
        "stamina": actor.get("stamina") == 84,
        "level": actor.get("level") == 1,
        "wood": inventory.get("wood") == 0,
        "stone": inventory.get("stone") == 0,
        "instances": state.get("reward", {}).get("instances") == [],
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise AssertionError(f"Native opening save differs from the expected fresh baseline at {failed}")
    return {
        "openingSeen": opening_seen,
        "worldTime": state["worldTime"],
        "eventSequence": state["eventSequence"],
        "gold": actor["gold"],
        "stamina": actor["stamina"],
        "wood": inventory["wood"],
        "stone": inventory["stone"],
        "instanceCount": len(state["reward"]["instances"]),
    }


def visible_shop_item(page: Page, item_name: str):
    rows = page.locator(".shop-item")
    matches = []
    for index in range(rows.count()):
        row = rows.nth(index)
        visible_name = re.sub(r"\s+", " ", row.locator("div").first.inner_text()).strip()
        exact_item = re.search(rf"(?:^|\s){re.escape(item_name)}(?=\s|$)", visible_name)
        if exact_item and "持有" in visible_name:
            matches.append(row)
    if len(matches) != 1:
        raise AssertionError(f"Expected one shop row for {item_name}; got {len(matches)}")
    return matches[0]


def buy_normal_materials(pilot: Pilot) -> None:
    page = pilot.page
    pilot.nearby_place("雜貨店")
    expect(page.locator(".shop-list")).to_be_visible()
    before = pilot.state()
    before_actor = pilot.actor(before)
    if before_actor["gold"] != 45 or before_actor["inventory"]["wood"] or before_actor["inventory"]["stone"]:
        raise AssertionError("Pilot must begin from an unmodified fresh character with 45 gold and no craft inputs")
    for name, wanted, label in (("木材", 3, "wood"), ("石材", 2, "stone")):
        for i in range(wanted):
            row = visible_shop_item(page, name)
            buy = row.get_by_role("button", name=re.compile(r"^買\s+\d+\s+金$"))
            pilot.action(buy, f"legally buy {label} {i + 1}/{wanted} at the visible store")
        pilot.log("material-acquisition", method="normal-store-buy", item=label,
                  quantity=wanted, visibleRowText=row.inner_text())
    after = pilot.state()
    actor = pilot.actor(after)
    assert actor["inventory"]["wood"] == 3, actor["inventory"]
    assert actor["inventory"]["stone"] == 2, actor["inventory"]
    assert actor["gold"] == 9, f"Expected 36G material spend from fresh 45G; got {actor['gold']}G"
    pilot.result["materialAcquisition"] = {"method": "normal-store-buy", "wood": 3, "stone": 2,
                                             "goldBefore": 45, "goldAfter": actor["gold"]}
    pilot.checkpoint("materials-acquired-through-store-ui")


def collect_page_errors(page: Page, result: dict[str, Any]) -> None:
    values = page.evaluate("({rejections:window.__qaRejections || [], storageErrors:window.__qaStorageErrors || []})")
    result["rejections"].extend(values["rejections"])
    result["storageErrors"].extend(values["storageErrors"])


def craft_starter(pilot: Pilot) -> str:
    page = pilot.page
    heading = page.get_by_role("heading", name="工作台", exact=True)
    expect(heading).to_be_visible()
    workbench_text = page.locator(".crafting-workbench").inner_text()
    if "服務時間 08:00–18:00" not in workbench_text:
        raise AssertionError(f"Workbench's own service window is unclear or changed: {workbench_text}")
    recipe = page.get_by_role("button", name="木石長矛", exact=True)
    pilot.action(recipe, "select starter spear recipe")
    expect(recipe).to_have_attribute("aria-pressed", "true")
    preview = page.locator(".crafting-workbench").first
    preview_text = preview.inner_text() if preview.count() else heading.locator("xpath=..").inner_text()
    for expected in ("木材", "3", "石材", "2", "4", "10", "45", "Lv.1"):
        if expected not in preview_text:
            raise AssertionError(f"Starter recipe preview lacks {expected!r}: {preview_text}")
    before = pilot.state()
    before_actor = pilot.actor(before)
    before_ids = {item["instanceId"] for item in before["reward"]["instances"]}
    craft_button = page.get_by_role("button", name="製作木石長矛", exact=True)
    pilot.action(craft_button, "craft starter spear from the public workbench UI")
    expect(page.get_by_role("button", name="檢視裝備", exact=True)).to_be_visible()
    result_status = page.locator("[data-craft-result]")
    expect(result_status).to_be_visible()
    if "已製作：獵矛" not in result_status.inner_text():
        raise AssertionError(f"Craft result UI did not identify the actual spear base: {result_status.inner_text()}")
    after = pilot.state()
    after_actor = pilot.actor(after)
    new_items = [item for item in after["reward"]["instances"] if item["instanceId"] not in before_ids]
    if len(new_items) != 1:
        raise AssertionError(f"Expected one newly generated reward instance; found {len(new_items)}")
    item = new_items[0]
    if item.get("craftProvenance") is None:
        raise AssertionError("Crafted item has no persisted craft provenance")
    provenance = item["craftProvenance"]
    if provenance.get("createdBy") != after["activeCharacterId"]:
        raise AssertionError(f"Craft creator does not match active crafter: {provenance}")
    if provenance.get("recipeId") != "starterSpear":
        raise AssertionError(f"Unexpected starter recipe provenance: {provenance}")
    if provenance.get("createdAt") != before["worldTime"]:
        raise AssertionError("Craft provenance creation time should capture the pre-advance game time")
    if after["worldTime"] - before["worldTime"] != 45:
        raise AssertionError("Craft should advance exactly 45 in-game minutes")
    if before_actor["gold"] - after_actor["gold"] != 4:
        raise AssertionError("Craft should charge exactly 4 gold")
    if before_actor["stamina"] - after_actor["stamina"] != 10:
        raise AssertionError("Craft should charge exactly 10 stamina")
    if after_actor["inventory"]["wood"] != 0 or after_actor["inventory"]["stone"] != 0:
        raise AssertionError("Craft should consume the acquired wood and stone inputs")
    if after_actor["skills"]["smithing"]["exp"] - before_actor["skills"]["smithing"]["exp"] != 10:
        raise AssertionError("Starter craft should award exactly 10 Smithing experience through the existing skill path")
    if after_actor["skills"]["smithing"]["level"] != before_actor["skills"]["smithing"]["level"]:
        raise AssertionError("The starter craft must not unexpectedly grant a higher Smithing level")
    if after_actor["gold"] != 5:
        raise AssertionError(f"Expected 5 gold after purchase and craft fees; got {after_actor['gold']}")
    if item["baseId"] != "spear":
        raise AssertionError(f"Starter spear recipe resolved to unexpected base {item['baseId']!r}")
    pilot.result["craftedInstance"] = {"instanceId": item["instanceId"], "recipeId": item["craftProvenance"]["recipeId"],
                                       "baseId": item["baseId"], "rarity": item["rarity"],
                                       "provenance": provenance, "rolledStats": item["rolledStats"]}
    pilot.result["previewText"] = re.sub(r"\s+", " ", preview_text).strip()
    pilot.result["workbenchText"] = re.sub(r"\s+", " ", workbench_text).strip()
    pilot.checkpoint("starter-craft-complete")
    pilot.action(page.get_by_role("button", name="檢視裝備", exact=True), "open the created instance in the existing inventory detail")
    detail = page.locator(".gear-detail[data-gear-comparison]")
    expect(detail).to_be_visible()
    detail_text = re.sub(r"\s+", " ", detail.inner_text()).strip()
    pilot.result["initialGearDetail"] = detail_text
    if "穿戴獵獲裝備" not in detail_text:
        raise AssertionError("Existing inventory gear detail does not expose the normal equip action")
    pilot.action(detail.get_by_role("button", name="穿戴獵獲裝備", exact=True), "equip crafted spear from the existing inventory compare UI")
    equipped = pilot.state()
    character_id = equipped["activeCharacterId"]
    base_slot = "weapon" if item["baseId"] else None
    equipped_id = equipped["reward"]["equipped"][character_id].get(base_slot) if base_slot else None
    if equipped_id != item["instanceId"]:
        raise AssertionError(f"Crafted instance did not become the equipped weapon: {equipped_id}")
    pilot.result["equippedInstanceId"] = equipped_id
    pilot.checkpoint("crafted-instance-equipped-through-existing-compare-ui")
    return item["instanceId"]


def save_reload(pilot: Pilot, instance_id: str) -> None:
    page = pilot.page
    before = pilot.state()
    actor_before = pilot.actor(before)
    inventory_dialog = page.locator("dialog.pixel-window")
    expect(inventory_dialog).to_be_visible()
    close_button = inventory_dialog.get_by_role("button", name="關閉視窗", exact=True)
    pilot.action(close_button, "close the existing inventory window through its visible close control")
    expect(inventory_dialog).to_be_hidden()
    save_button = page.locator(".save-button")
    expect(save_button).to_be_visible()
    pilot.action(save_button, "explicit native save through the visible game control after closing inventory")
    wait_deadline = time.monotonic() + 10
    while time.monotonic() < wait_deadline and pilot.state().get("worldTime") != before["worldTime"]:
        time.sleep(.1)
    if pilot.state().get("worldTime") != before["worldTime"]:
        raise AssertionError("Visible native save did not preserve the expected world time")
    collect_page_errors(page, pilot.result)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".world-map", timeout=15000)
    after = pilot.state()
    actor_after = pilot.actor(after)
    assert after["worldTime"] == before["worldTime"], "Native reload advanced time"
    assert after["rngState"] == before["rngState"], "Native reload changed RNG state"
    assert after["eventSequence"] == before["eventSequence"], "Native reload changed event sequence"
    assert actor_after["gold"] == actor_before["gold"] and actor_after["stamina"] == actor_before["stamina"]
    assert actor_after["skills"]["smithing"] == actor_before["skills"]["smithing"]
    assert any(item["instanceId"] == instance_id for item in after["reward"]["instances"]), "Crafted item missing after reload"
    assert after["reward"]["equipped"][after["activeCharacterId"]]["weapon"] == instance_id
    pilot.result["reloadInvariant"] = {"worldTime": after["worldTime"], "rngState": after["rngState"],
                                       "eventSequence": after["eventSequence"], "gold": actor_after["gold"],
                                       "stamina": actor_after["stamina"], "craftedInstancePersisted": True,
                                       "equippedInstancePersisted": True, "smithing": actor_after["skills"]["smithing"]}
    pilot.result["reloads"] = 1
    pilot.checkpoint("native-save-reload-confirmed")
    pilot.action(page.get_by_role("button", name="物品 I", exact=True), "reopen inventory after native reload")
    pilot.action(page.get_by_role("button", name="獵獲裝備", exact=True), "reopen generated gear category after native reload")
    focused = page.locator(f'[data-instance-id="{instance_id}"]')
    if focused.count() != 1:
        raise AssertionError(f"Cannot identify persisted instance {instance_id} in the visible gear list")
    pilot.action(focused, "select persisted instance by its released instance-id UI hook")
    expect(page.locator(".gear-detail[data-gear-comparison]")).to_be_visible()
    detail = re.sub(r"\s+", " ", page.locator(".gear-detail[data-gear-comparison]").inner_text()).strip()
    if "已穿戴" not in detail:
        raise AssertionError("Reloaded crafted item detail does not show its equipped state")
    pilot.result["reloadedGearDetail"] = detail
    pilot.log("assertion", name="reloaded crafted instance visible in existing inventory compare UI", detail=detail)
    collect_page_errors(page, pilot.result)


def attach_error_capture(page: Page) -> None:
    page.add_init_script("""(() => {
      window.__qaStorageErrors = [];
      window.__qaRejections = [];
      try {
        const openingSave = localStorage.getItem('oakvale-v1');
        window.__qaPreAppSaveObservation = {
          documentReadyState: document.readyState,
          savePresent: openingSave !== null,
          readError: null
        };
      } catch (error) {
        window.__qaPreAppSaveObservation = {
          documentReadyState: document.readyState,
          savePresent: null,
          readError: String(error)
        };
      }
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        try { return original.call(this, key, value); }
        catch (error) { if (key === 'oakvale-v1') window.__qaStorageErrors.push(String(error)); throw error; }
      };
      window.addEventListener('unhandledrejection', event => window.__qaRejections.push(String(event.reason)));
    })();""")


def new_server(port: int, run_dir: Path,
               directory: Path | None = None) -> tuple[subprocess.Popen, Any]:
    log = (run_dir / "server.log").open("wb")
    server_code = r"""import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

class PilotHandler(SimpleHTTPRequestHandler):
    def _serve_favicon(self):
        if urlsplit(self.path).path != "/favicon.ico":
            return False
        self.send_response(204)
        self.end_headers()
        return True

    def do_GET(self):
        if not self._serve_favicon():
            super().do_GET()

    def do_HEAD(self):
        if not self._serve_favicon():
            super().do_HEAD()

server = ThreadingHTTPServer(
    ("127.0.0.1", int(sys.argv[1])),
    partial(PilotHandler, directory=sys.argv[2]),
)
server.daemon_threads = True
server.serve_forever()
"""
    try:
        process = subprocess.Popen(
            [sys.executable, "-c", server_code, str(port), str((directory or ROOT / "dist").resolve())],
            cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
    except BaseException:
        log.close()
        raise
    return process, log


def allocate_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def verify_http_assets(url: str) -> dict[str, Any]:
    with urlopen(url + "/", timeout=5) as response:
        index = response.read()
    disk_index = (ROOT / "dist/index.html").read_bytes()
    if index != disk_index:
        raise RuntimeError("Loopback-served index does not match the production dist/index.html bytes")
    assets = re.findall(rb'(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"', index)
    if not assets:
        raise RuntimeError("Production index has no referenced JS/CSS bundle")
    verified = []
    for item in assets:
        relative = item.decode().split("?", 1)[0].lstrip("/")
        disk_path = (ROOT / "dist" / relative).resolve()
        if ROOT.joinpath("dist").resolve() not in disk_path.parents or not disk_path.is_file():
            raise RuntimeError(f"Invalid or missing production asset {relative}")
        with urlopen(url + "/" + relative, timeout=5) as response:
            body = response.read()
        disk = disk_path.read_bytes()
        if body != disk:
            raise RuntimeError(f"Served asset does not match production dist bytes: {relative}")
        verified.append({"path": relative, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()})
    with urlopen(url + "/favicon.ico", timeout=5) as response:
        favicon_body = response.read()
        favicon_status = response.status
    if favicon_status != 204 or favicon_body:
        raise RuntimeError(f"Owned test server favicon response must be empty HTTP 204; got {favicon_status}")
    return {"indexBytes": len(index), "indexSha256": hashlib.sha256(index).hexdigest(),
            "assets": verified, "favicon": {"path": "/favicon.ico", "status": favicon_status, "bytes": 0}}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true", help="run one normal fresh-save C browser pilot")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: pass --go after source freeze, matching production build, and Root release.")
        return 0

    parse_build_status()
    if not (ROOT / "dist/index.html").is_file():
        raise RuntimeError("Production dist/index.html is missing")
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-pid{os.getpid()}"
    run_dir = RUNS / f"c-normal-{run_id}"
    run_dir.mkdir(parents=True, exist_ok=False)
    start = provenance()
    result: dict[str, Any] = {
        "status": "IN_PROGRESS", "producer": PRODUCER, "runId": run_id,
        "requestedAgentName": "g6_luna_med_phase5_qa_engineer",
        "harnessAuthor": {"requestedModel": "GPT-6 Luna", "requestedEffort": "medium", "runtimeVerified": False},
        "runnerRequestedModel": "GPT-6 Luna", "runnerRequestedEffort": "low", "runnerRuntimeVerified": False,
        "phase": "C normal fresh-save pilot", "controlledFixture": False,
        "normalFreshSave": {"isolatedBrowserContext": True, "stateInjected": False, "debugSkipUsed": False},
        "humanValidation": {"status": "DEFERRED / NOT APPLICABLE AT THIS STAGE"},
        "startUTC": datetime.now(timezone.utc).isoformat(), "sourceBefore": start,
        "buildStatusPath": str(BUILD_PATH), "actionsJsonl": str(run_dir / "actions.jsonl"),
        "checkpoints": [], "uiLatencyMs": [], "consoleErrors": [], "pageErrors": [],
        "storageErrors": [], "rejections": [], "reloads": 0,
    }
    port = allocate_port()
    url = f"http://127.0.0.1:{port}"
    server = None
    server_log = None
    browser = None
    context = None
    playwright = None
    operation_error = None
    try:
        server, server_log = new_server(port, run_dir)
        deadline = time.monotonic() + 30
        assets = None
        last_error = None
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise RuntimeError(f"Owned loopback server exited with {server.returncode}")
            try:
                assets = verify_http_assets(url)
                break
            except Exception as error:
                last_error = error
                time.sleep(.25)
        if assets is None:
            raise RuntimeError(f"Production asset readiness failed: {last_error}")
        result["servedProductionAssets"] = assets
        result["url"] = url

        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        page = context.new_page()
        attach_error_capture(page)
        page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
        page.on("console", lambda message: result["consoleErrors"].append(message.text) if message.type == "error" else None)
        pilot = Pilot(page, run_dir, result)
        page.goto(url, wait_until="domcontentloaded")
        guard = page.evaluate("window.__qaPreAppSaveObservation || null")
        if guard is None:
            raise AssertionError("Pre-app isolated-context save observation did not run")
        if guard.get("readError"):
            raise RuntimeError(f"Cannot observe localStorage before app startup: {guard['readError']}")
        if guard.get("documentReadyState") != "loading":
            raise AssertionError(f"Fresh-context guard ran after document scripts: {guard}")
        if guard.get("savePresent") is not False:
            raise AssertionError(f"New isolated context already had a save before app startup: {guard}")
        result["freshContextGuard"] = {"documentReadyState": guard["documentReadyState"],
                                        "savePresentBeforeApp": guard["savePresent"]}

        start_button = page.get_by_role("button", name="起身", exact=True)
        expect(start_button).to_be_enabled(timeout=15000)
        opening_state = pilot.state()
        result["nativeOpeningSaveAfterAppStartup"] = validate_native_opening_baseline(
            opening_state, opening_seen=False)
        pilot.action(start_button, "start a normal fresh life from the opening screen")
        page.wait_for_selector(".world-map", timeout=15000)
        pause = page.get_by_role("button", name="暫停", exact=True)
        if pause.get_attribute("aria-pressed") != "true":
            pilot.action(pause, "pause world time through its visible control")
        initial = pilot.state()
        baseline = validate_native_opening_baseline(initial, opening_seen=True)
        actor = pilot.actor(initial)
        if actor["skills"]["smithing"]["level"] != 1:
            raise AssertionError("Fresh baseline differs from the released normal starting character")
        pilot.result["initialBaseline"] = {"gold": actor["gold"], "level": actor["level"],
                                            "smithing": actor["skills"]["smithing"],
                                            "worldTime": initial["worldTime"], "rngState": initial["rngState"],
                                            "position": actor["position"], **baseline}
        pilot.checkpoint("normal-fresh-save-baseline")
        pilot.route_to_near_store()
        buy_normal_materials(pilot)
        crafted_id = craft_starter(pilot)
        save_reload(pilot, crafted_id)
        if result["pageErrors"] or result["consoleErrors"]:
            raise AssertionError("Page or console errors block a clean browser pilot")
        result["rejections"] = page.evaluate("window.__qaRejections || []")
        result["storageErrors"] = page.evaluate("window.__qaStorageErrors || []")
        if result["rejections"] or result["storageErrors"]:
            raise AssertionError("Unhandled rejection or native storage write error blocks a clean pilot")
        result["status"] = "PASS"
    except BaseException as error:
        operation_error = error
        result["status"] = "FAILED"
        result["error"] = f"{type(error).__name__}: {error}"
        result["pageErrors"] = result.get("pageErrors", [])
        result["consoleErrors"] = result.get("consoleErrors", [])
        result["failureUTC"] = datetime.now(timezone.utc).isoformat()
        try:
            if browser is not None and browser.contexts:
                page = browser.contexts[0].pages[0]
                value = page.evaluate("localStorage.getItem('oakvale-v1')")
                if value:
                    record_text(run_dir / "failure-save.json", value + "\n")
        except Exception as capture_error:
            result["failureCaptureError"] = f"{type(capture_error).__name__}: {capture_error}"
    finally:
        # Stop the browser resources, then the Playwright object returned by start().
        cleanup_error = close_playwright_resources(context, browser, playwright, result, operation_error)
        if cleanup_error is not None:
            result["status"] = "FAILED"
            result["error"] = f"{type(cleanup_error).__name__}: {cleanup_error}"
            result["failureUTC"] = datetime.now(timezone.utc).isoformat()
        server_cleanup_error = close_owned_server(server, server_log, result, operation_error)
        if server_cleanup_error is not None:
            result["status"] = "FAILED"
            result["error"] = f"{type(server_cleanup_error).__name__}: {server_cleanup_error}"
            result["failureUTC"] = datetime.now(timezone.utc).isoformat()
        return_code = finalize_result(result, run_dir)
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())

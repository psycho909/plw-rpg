#!/usr/bin/env python3
"""Short supplemental real-Chromium UI coverage; production source/harness untouched."""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
QA = OUT.parent
MANIFEST_PATH = QA / "build-manifest.json"
MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
SOURCE = "441e3c2b435f199a50cb78ee5b19521bcc084593"
URL = "http://127.0.0.1:5197/"
CORE_FIELDS = [
    "saveVersion", "worldSeed", "rngState", "worldTime", "activeCharacterId",
    "characters", "npcs", "tiles", "settlement", "regions", "threat", "dungeon",
    "life", "history", "party", "crops", "eventSequence",
]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded  # noqa: E402

RESULT = {
    "sourceCommit": SOURCE,
    "manifestPath": str(MANIFEST_PATH),
    "url": URL,
    "startedAtUtc": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
    "status": "running",
    "method": "Fresh isolated Chromium user-data profiles; rendered UI only for normal-world tests; canonical createGame(seed)->serialize fixtures are used only for the separate controlled reload check. No clock/state/resource injection or direct engine calls.",
    "checks": [],
    "failures": [],
    "browserPageErrors": [],
    "consoleErrors": [],
}
RESULT_PATH = OUT / "supplemental-ui.json"


def publish() -> None:
    write_recorded(RESULT_PATH, json.dumps(RESULT, ensure_ascii=False, indent=2), producer="supplemental-ui")


def check(name: str, **details) -> None:
    RESULT["checks"].append({"name": name, "status": "PASS", **details})
    publish()
    print("PASS", name, flush=True)


def failure(stage: str, error: BaseException) -> None:
    RESULT["failures"].append({"stage": stage, "error": f"{type(error).__name__}: {error}"})
    publish()
    print("FAIL", stage, str(error), flush=True)


def verify_frozen_source_and_assets() -> None:
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    if head != SOURCE or MANIFEST.get("sourceCommit") != SOURCE:
        raise RuntimeError(f"frozen source mismatch: HEAD={head}; manifest={MANIFEST.get('sourceCommit')}")
    source_expected = MANIFEST.get("sourceSha256", {})
    source_mismatches = []
    for relative, expected in source_expected.items():
        actual = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
        if actual != expected:
            source_mismatches.append(relative)
    assets_expected = MANIFEST.get("assetsSha256", {})
    served = {}
    local = {}
    dist = Path(MANIFEST["immutableDist"])
    for name, expected in assets_expected.items():
        local_path = dist / ("index.html" if name == "index.html" else name)
        local_hash = hashlib.sha256(local_path.read_bytes()).hexdigest()
        local[name] = local_hash
        if name == "index.html":
            request_url = URL
        else:
            request_url = URL.rstrip("/") + "/" + name.lstrip("/")
        with urlopen(request_url, timeout=5) as response:
            served[name] = hashlib.sha256(response.read()).hexdigest()
        if local_hash != expected or served[name] != expected:
            raise RuntimeError(f"asset hash mismatch: {name}")
    if source_mismatches:
        raise RuntimeError(f"source hash mismatch: {source_mismatches}")
    RESULT["sourceFingerprint"] = {"head": head, "filesCompared": len(source_expected), "allMatch": True}
    RESULT["assetFingerprint"] = {"local": local, "served": served, "allMatch": True}
    check("frozen source and served build match manifest", sourceFiles=len(source_expected), assets=len(assets_expected))


def raw_save(page):
    value = page.evaluate("() => { const raw = localStorage.getItem('oakvale-v1'); return raw ? JSON.parse(raw) : null; }")
    if not isinstance(value, dict):
        raise RuntimeError("oakvale-v1 checkpoint unavailable")
    return value


def actor(save):
    return next(c for c in save["characters"] if c["id"] == save["activeCharacterId"])


def speed_label(page):
    return page.locator(".speed-controls button[aria-pressed='true']").inner_text().strip()


def set_speed_20(page):
    if speed_label(page) != "×20":
        page.locator(".speed-controls").get_by_role("button", name="×20", exact=True).click(timeout=2500)
    if speed_label(page) != "×20":
        raise AssertionError("×20 was not selected through the visible speed control")


def open_menu_item(page, label: str) -> None:
    page.locator(".menu-trigger").click(timeout=2500)
    page.locator(".pixel-menu").get_by_role("button", name=label, exact=True).click(timeout=2500)
    page.locator("dialog[open] h2#window-title").wait_for(state="visible", timeout=3000)


def footer_button(page, label: str):
    return page.locator("dialog[open] .window-world-status").get_by_role("button", name=label, exact=True)


def active_idle_measure(page, name: str) -> dict:
    title = page.locator("dialog[open] h2#window-title").inner_text().strip()
    if speed_label(page) != "×20":
        raise AssertionError(f"expected ×20 during {name}; selected={speed_label(page)}")
    before = raw_save(page)
    t0 = time.monotonic()
    page.wait_for_timeout(1100)
    footer_button(page, "暫停時間").click(timeout=2500)
    page.wait_for_timeout(120)
    after_active = raw_save(page)
    active_wait = time.monotonic() - t0
    active_delta = after_active["worldTime"] - before["worldTime"]
    if active_delta <= 0:
        raise AssertionError(f"{name} did not advance at ×20: {before['worldTime']} -> {after_active['worldTime']}")
    frozen_at = after_active["worldTime"]
    page.wait_for_timeout(350)
    after_pause = raw_save(page)
    if after_pause["worldTime"] != frozen_at:
        raise AssertionError(f"{name} advanced while paused: {frozen_at} -> {after_pause['worldTime']}")
    footer_button(page, "繼續時間").click(timeout=2500)
    page.wait_for_timeout(600)
    footer_button(page, "暫停時間").click(timeout=2500)
    page.wait_for_timeout(120)
    after_resume = raw_save(page)
    resumed_delta = after_resume["worldTime"] - after_pause["worldTime"]
    if resumed_delta <= 0:
        raise AssertionError(f"{name} did not resume through its footer control")
    return {
        "windowTitle": title,
        "selectedSpeed": "×20",
        "realActiveWaitSeconds": round(active_wait, 3),
        "worldTimeBefore": before["worldTime"],
        "worldTimeAfterActive": after_active["worldTime"],
        "activeGameMinutes": active_delta,
        "worldTimeAfterPausedWait": after_pause["worldTime"],
        "pausedWorldTimeStable": after_pause["worldTime"] == frozen_at,
        "resumeGameMinutes": resumed_delta,
        "pausedAtEnd": speed_label(page) == "暫停",
    }


def close_dialog(page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.locator("dialog[open]").wait_for(state="detached", timeout=2500)


def normal_ui_session(playwright) -> None:
    profile = Path(tempfile.mkdtemp(prefix="oakvale-v2-supplemental-ui-normal-"))
    RESULT["normalProfile"] = str(profile)
    context = playwright.chromium.launch_persistent_context(
        str(profile), headless=True, executable_path="/usr/bin/chromium",
        args=["--no-sandbox", "--disable-dev-shm-usage"], viewport={"width": 1440, "height": 1000},
    )
    try:
        page = context.pages[0] if context.pages else context.new_page()
        page.on("pageerror", lambda error: RESULT["browserPageErrors"].append(str(error)))
        page.on("console", lambda message: RESULT["consoleErrors"].append(message.text) if message.type == "error" else None)
        page.goto(URL, wait_until="domcontentloaded", timeout=10000)
        page.locator(".life-opening button").wait_for(state="visible", timeout=5000)
        page.wait_for_function("() => { const b=document.querySelector('.life-opening button'); return !!b && !b.disabled; }", timeout=5000)
        initial = raw_save(page)
        c = actor(initial)
        normal_defaults = {
            "worldSeed": initial.get("worldSeed"), "worldTime": initial.get("worldTime"),
            "age": c.get("age"), "gold": c.get("gold"), "food": c.get("inventory", {}).get("food"),
            "potions": c.get("inventory", {}).get("potion"), "properties": len(initial.get("life", {}).get("properties", [])),
            "openingSeen": initial.get("life", {}).get("openingSeen"),
        }
        expected = {"worldSeed": 909, "worldTime": 480, "age": 16, "gold": 45, "food": 3, "potions": 2, "properties": 0, "openingSeen": False}
        if normal_defaults != expected:
            raise AssertionError(f"fresh normal UI defaults differ: {normal_defaults}")
        check("fresh UI-created world has canonical seed-909 defaults", defaults=normal_defaults)
        page.get_by_role("button", name="起身", exact=True).click(timeout=2500)
        page.wait_for_function("() => JSON.parse(localStorage.getItem('oakvale-v1')).life.openingSeen === true", timeout=4000)
        page.locator(".speed-controls").get_by_role("button", name="暫停", exact=True).click(timeout=2500)
        check("life starts and is paused using visible UI", seed=raw_save(page)["worldSeed"], openingSeen=raw_save(page)["life"]["openingSeen"])

        set_speed_20(page)
        open_menu_item(page, "地方消息與委託")
        detail = active_idle_measure(page, "地方消息與委託")
        check("Active Idle / Pause / Resume in Life News window", **detail)
        close_dialog(page)

        set_speed_20(page)
        context_action = page.locator(".context-action")
        if "家" not in context_action.inner_text():
            raise AssertionError(f"fresh player is not at the home interaction: {context_action.inner_text()}")
        context_action.click(timeout=2500)
        page.locator("dialog[open] h2#window-title").filter(has_text="家").wait_for(state="visible", timeout=3000)
        detail = active_idle_measure(page, "PlaceWindow: 家")
        check("Active Idle / Pause / Resume in Place window", **detail)
        close_dialog(page)

        # Reach the forest only with the rendered World UI's normal destination control.
        open_menu_item(page, "地圖與世界")
        page.get_by_role("button", name="前往森林", exact=True).click(timeout=4000)
        page.locator("dialog[open]").wait_for(state="detached", timeout=4000)
        forest_state = raw_save(page)
        forest_actor = actor(forest_state)
        if forest_actor.get("currentRegion") != "forest":
            raise AssertionError(f"normal UI map travel did not reach forest: {forest_actor.get('currentRegion')}")
        check("reached forest by normal rendered map travel", position=forest_actor.get("position"), worldTime=forest_state.get("worldTime"))

        set_speed_20(page)
        prompt = page.locator(".context-action").inner_text()
        if "北方森林" in prompt:
            page.locator(".context-action").click(timeout=2500)
        else:
            near = page.locator(".nearby-trigger")
            if not near.count():
                raise AssertionError(f"no visible forest interaction: {prompt}")
            near.click(timeout=2500)
            page.locator(".interaction-list").get_by_role("button", name=re.compile("北方森林")).click(timeout=2500)
        page.locator("dialog[open] h2#window-title").filter(has_text="北方森林").wait_for(state="visible", timeout=3000)
        place_before = raw_save(page)
        place_actor = actor(place_before)
        if place_actor.get("stamina", 0) < 8 or place_before.get("threat", {}).get("monsterPopulation", 0) < 1:
            raise AssertionError("normal forest encounter preconditions were unavailable")
        page.get_by_role("button", name=re.compile("尋找怪物")).click(timeout=2500)
        page.locator("dialog[open] .battle-scene").wait_for(state="visible", timeout=3000)
        combat_before = raw_save(page)
        battle = combat_before.get("combat")
        if not battle:
            raise AssertionError("visible forest search did not open normal combat")
        check("forest search triggers combat through visible PlaceWindow UI", monsterId=battle.get("monsterId"), staminaBefore=place_actor.get("stamina"), staminaAfter=actor(combat_before).get("stamina"), worldTime=combat_before.get("worldTime"))
        detail = active_idle_measure(page, "AdventureWindow: 戰鬥")
        combat_after = raw_save(page)
        detail["combatStateUnchangedWhileIdling"] = combat_after.get("combat") == battle
        if not detail["combatStateUnchangedWhileIdling"]:
            raise AssertionError("combat turn/state changed without a combat UI action")
        check("Active Idle / Pause / Resume in Combat window", **detail)
        page.get_by_role("button", name="逃跑", exact=True).click(timeout=2500)
        page.locator("dialog[open]").wait_for(state="detached", timeout=3000)
        check("combat exited with visible Escape action", combatCleared=raw_save(page).get("combat") is None)
    finally:
        context.close()


def stable_hash(value) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def field_hashes(save: dict) -> dict:
    return {key: stable_hash({"present": key in save, "value": save.get(key)}) for key in CORE_FIELDS}


def core_values(save: dict) -> dict:
    return {key: save.get(key) for key in CORE_FIELDS}


def rendered_npc_names(page) -> list[str]:
    labels = page.locator(".world-map .tile.has-npc").evaluate_all("nodes => nodes.map(node => node.getAttribute('aria-label') || '')")
    return labels


def controlled_opening_reload(playwright, seed: int) -> None:
    fixture_path = QA / "seeds" / f"seed-{seed}.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    if fixture.get("worldSeed") != seed or fixture.get("saveVersion") != 2 or fixture.get("life", {}).get("openingSeen") is not False:
        raise RuntimeError(f"fixture is not canonical openingSeen=false V2 seed {seed}")
    profile = Path(tempfile.mkdtemp(prefix=f"oakvale-v2-controlled-seed-{seed}-"))
    RESULT.setdefault("controlledProfiles", []).append({"seed": seed, "profile": str(profile), "fixture": str(fixture_path)})
    context = playwright.chromium.launch_persistent_context(
        str(profile), headless=True, executable_path="/usr/bin/chromium",
        args=["--no-sandbox", "--disable-dev-shm-usage"], viewport={"width": 1440, "height": 1000},
    )
    try:
        page = context.pages[0] if context.pages else context.new_page()
        page.on("pageerror", lambda error: RESULT["browserPageErrors"].append(str(error)))
        injection = "if (!localStorage.getItem('oakvale-v1')) localStorage.setItem('oakvale-v1', " + json.dumps(json.dumps(fixture, ensure_ascii=False, separators=(",", ":"))) + ");"
        page.add_init_script(injection)
        page.goto(URL, wait_until="domcontentloaded", timeout=10000)
        page.locator(".life-opening button").wait_for(state="visible", timeout=5000)
        page.wait_for_function("() => { const b=document.querySelector('.life-opening button'); const s=JSON.parse(localStorage.getItem('oakvale-v1')||'null'); return !!b && !b.disabled && s?.playJournal?.version===1; }", timeout=6000)
        startup = raw_save(page)
        initial_diffs = [field for field in CORE_FIELDS if fixture.get(field) != startup.get(field)]
        if initial_diffs:
            raise AssertionError(f"seed {seed} app startup/save differs from canonical 17 fields: {initial_diffs}")
        if startup.get("life", {}).get("openingSeen") is not False or startup.get("worldTime") != fixture.get("worldTime"):
            raise AssertionError("opening UI advanced or changed openingSeen before start")
        selected_speed = speed_label(page)
        if selected_speed != "暫停":
            raise AssertionError(f"natural opening should remain paused; selected={selected_speed}")
        expected_names = [n["name"] for n in fixture["npcs"] if n.get("isAlive")][:5]
        labels_before = rendered_npc_names(page)
        names_rendered_before = [name for name in expected_names if any(name in label for label in labels_before)]
        if len(names_rendered_before) < min(5, len(expected_names)):
            raise AssertionError(f"seed NPCs not rendered on actual app map: {names_rendered_before}")
        startup_hashes = field_hashes(startup)
        startup_saved_at = startup.get("lastSavedAt")
        page.reload(wait_until="domcontentloaded", timeout=10000)
        page.locator(".life-opening button").wait_for(state="visible", timeout=5000)
        page.wait_for_function("() => { const b=document.querySelector('.life-opening button'); const s=JSON.parse(localStorage.getItem('oakvale-v1')||'null'); return !!b && !b.disabled && s?.playJournal?.version===1; }", timeout=6000)
        reloaded = raw_save(page)
        reload_diffs = [field for field in CORE_FIELDS if startup.get(field) != reloaded.get(field)]
        if reload_diffs:
            raise AssertionError(f"seed {seed} app load/reload differs across 17 fields: {reload_diffs}")
        if reloaded.get("life", {}).get("openingSeen") is not False or reloaded.get("worldTime") != fixture.get("worldTime"):
            raise AssertionError("opening UI advanced or changed openingSeen across reload")
        if speed_label(page) != "暫停":
            raise AssertionError("opening world did not remain paused after reload")
        labels_after = rendered_npc_names(page)
        names_rendered_after = [name for name in expected_names if any(name in label for label in labels_after)]
        if len(names_rendered_after) < min(5, len(expected_names)):
            raise AssertionError(f"seed NPCs not rendered after reload: {names_rendered_after}")
        check(
            f"controlled opening seed {seed}: app startup-save and actual app reload checkpoint match 17 fields",
            fixture=fixture_path.name,
            fixtureProvenance="canonical public createGame(seed)->serialize V2 fixture; no field edited",
            coreFieldsCompared=CORE_FIELDS,
            startupDiffs=initial_diffs,
            reloadDiffs=reload_diffs,
            startupFieldSha256=startup_hashes,
            reloadedFieldSha256=field_hashes(reloaded),
            startupLastSavedAt=startup_saved_at,
            reloadedLastSavedAt=reloaded.get("lastSavedAt"),
            openingSeenBeforeAndAfter=False,
            worldTimeBeforeAndAfter=fixture.get("worldTime"),
            speedBeforeAndAfter="暫停",
            actualRenderedSeedNpcNamesBefore=names_rendered_before,
            actualRenderedSeedNpcNamesAfter=names_rendered_after,
            actualMapNpcTileCountBefore=len(labels_before),
            actualMapNpcTileCountAfter=len(labels_after),
        )
    finally:
        context.close()


def main() -> int:
    publish()
    try:
        verify_frozen_source_and_assets()
    except Exception as error:
        failure("manifest", error)
        RESULT["status"] = "blocked"
        publish()
        return 1
    with sync_playwright() as playwright:
        try:
            normal_ui_session(playwright)
        except Exception as error:
            failure("normal-ui-session", error)
        for seed in (17, 2026):
            try:
                controlled_opening_reload(playwright, seed)
            except Exception as error:
                failure(f"controlled-opening-reload-seed-{seed}", error)
    RESULT["endedAtUtc"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    RESULT["status"] = "passed" if not RESULT["failures"] and len(RESULT["checks"]) >= 9 else "partial-failure"
    publish()
    print("STATUS", RESULT["status"], "checks", len(RESULT["checks"]), "failures", len(RESULT["failures"]), flush=True)
    return 0 if RESULT["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())

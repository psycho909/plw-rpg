#!/usr/bin/env python3
"""Normal UI adventure playtest against the fixed 694c6d7 browser build."""
from __future__ import annotations
import json, re, sys, time
from datetime import datetime, timezone
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from scripts.recorded_reports import write_recorded

from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ui_helpers

OUT = Path(__file__).resolve().parent
RESULTS_PATH = OUT / "results.json"
STARTED = datetime.now(timezone.utc)
PAGE_ERRORS: list[str] = []
CONSOLE_ERRORS: list[str] = []
OBSERVATIONS: list[dict] = []
ACTIONS: list[dict] = []
BATTLE_SUMMARIES: list[dict] = []
RUN_HISTORY: list[dict] = []
if RESULTS_PATH.exists():
    try:
        previous = json.loads(RESULTS_PATH.read_text())
        RUN_HISTORY.extend(previous.get("priorHarnessRuns", []))
        if previous.get("status") == "failed":
            RUN_HISTORY.append({
                "startedAtUtc": previous.get("startedAtUtc"),
                "endedAtUtc": previous.get("updatedAtUtc"),
                "status": "stopped by harness selector error; gameplay findings before stop retained in prior checkpoint output",
                "lastCheckpoint": previous.get("observations", [{}])[-1].get("checkpoint") if previous.get("observations") else None,
                "error": previous.get("pageErrors", [])[-1] if previous.get("pageErrors") else None,
                "elapsedSeconds": previous.get("elapsedSeconds"),
            })
    except (OSError, json.JSONDecodeError, TypeError):
        pass
PAGE = None
BROWSER = None
CONTEXT = None
INITIAL_WORLD_TIME = None


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_results(status: str = "running") -> None:
    payload = {
        "route": "adventure",
        "startedAtUtc": STARTED.isoformat(),
        "updatedAtUtc": stamp(),
        "elapsedSeconds": round((datetime.now(timezone.utc) - STARTED).total_seconds(), 3),
        "environment": {
            "url": ui_helpers.URL,
            "baselineBuild": "694c6d76df67e3d3dd4da5aa98feba8581ecc2ba",
            "browser": "Chromium via Playwright",
            "chromiumExecutable": "/usr/bin/chromium",
            "headless": True,
            "isolatedFreshContext": True,
            "stateMutation": "None; all gameplay actions use rendered UI. State reads follow the UI Save button.",
        },
        "status": status,
        "priorHarnessRuns": RUN_HISTORY,
        "observations": OBSERVATIONS,
        "actions": ACTIONS,
        "battles": BATTLE_SUMMARIES,
        "pageErrors": PAGE_ERRORS,
        "consoleErrors": CONSOLE_ERRORS,
    }
    write_recorded(RESULTS_PATH, json.dumps(payload, ensure_ascii=False, indent=2) + "\n", producer="adventure")


def on_page_error(error) -> None:
    PAGE_ERRORS.append(str(error))
    write_results()


def on_console(message) -> None:
    if message.type == "error":
        CONSOLE_ERRORS.append(message.text)
        write_results()


def close_dialog() -> None:
    if PAGE.locator("dialog[open]").count():
        PAGE.keyboard.press("Escape")
        PAGE.wait_for_timeout(30)


def raw_save() -> dict:
    raw = PAGE.evaluate('(key) => localStorage.getItem(key)', "oakvale-v1")
    if not raw:
        raise AssertionError("Save button did not produce oakvale-v1 localStorage")
    return json.loads(raw)


def save_state() -> dict:
    close_dialog()
    PAGE.locator(".save-button").click()
    PAGE.wait_for_timeout(75)
    return raw_save()


def active_character(saved: dict) -> dict:
    return next(c for c in saved["characters"] if c["id"] == saved["activeCharacterId"])


def checkpoint(name: str, note: str, *, screenshot: bool = False, preserve_dialog_screenshot: bool = False) -> dict:
    if screenshot and preserve_dialog_screenshot:
        PAGE.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
    saved = save_state()
    character = active_character(saved)
    party_ids = set()
    for member in saved.get("party", []):
        if isinstance(member, str):
            party_ids.add(member)
        elif isinstance(member, dict):
            party_ids.add(member.get("npcId", member.get("id")))
    roster = []
    for npc in saved.get("npcs", []):
        if npc.get("id") in party_ids:
            roster.append({key: npc.get(key) for key in ["id", "name", "age", "level", "archetype", "role", "job", "hp", "maxHp", "stats", "dailyWage", "contractEnd", "currentActivity"] if key in npc})
    row = {
        "checkpoint": name,
        "note": note,
        "observedAtUtc": stamp(),
        "elapsedSeconds": round((datetime.now(timezone.utc) - STARTED).total_seconds(), 3),
        "uiClock": PAGE.locator(".world-clock").inner_text() if PAGE.locator(".world-clock").count() else None,
        "uiWorldCaption": PAGE.locator(".world-caption").inner_text() if PAGE.locator(".world-caption").count() else None,
        "worldTime": saved.get("worldTime"),
        "deltaGameMinutesFromStart": saved.get("worldTime") - INITIAL_WORLD_TIME if INITIAL_WORLD_TIME is not None else None,
        "worldSeed": saved.get("worldSeed"),
        "activeCharacter": {
            "id": character.get("id"),
            "name": character.get("name"),
            "alive": character.get("isAlive"),
            "age": character.get("age"),
            "level": character.get("level"),
            "exp": character.get("exp"),
            "hp": character.get("hp"),
            "maxHp": character.get("maxHp"),
            "stamina": character.get("stamina"),
            "maxStamina": character.get("maxStamina"),
            "gold": character.get("gold"),
            "position": character.get("position"),
            "currentRegion": character.get("currentRegion"),
            "stats": character.get("stats"),
            "skills": character.get("skills"),
            "equipment": character.get("equipment"),
            "inventory": character.get("inventory"),
        },
        "settlement": saved.get("settlement"),
        "party": saved.get("party"),
        "mercenaryRoster": roster,
        "threat": saved.get("threat"),
        "dungeon": saved.get("dungeon"),
        "combat": saved.get("combat"),
        "regions": saved.get("regions"),
        "recentEvents": [e.get("message") for e in saved.get("events", [])[-10:]],
        "recentHistory": [e.get("message") for e in saved.get("history", [])[-10:]],
        "threatHistory": [e.get("message") for e in saved.get("history", []) if any(token in e.get("message", "") for token in ["哥布林", "森林威脅", "威脅升", "首領", "商隊", "北方道路"])],
    }
    OBSERVATIONS.append(row)
    write_results()
    if screenshot and not preserve_dialog_screenshot:
        PAGE.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
    print(json.dumps({"checkpoint": row["checkpoint"], "uiClock": row["uiClock"], "worldTime": row["worldTime"], "player": {k: row["activeCharacter"].get(k) for k in ["level", "hp", "maxHp", "stamina", "gold", "skills", "equipment", "inventory"]}, "settlementStage": row["settlement"].get("stage"), "party": row["party"], "mercenaries": row["mercenaryRoster"], "threat": row["threat"], "dungeon": row["dungeon"], "combat": row["combat"], "events": row["recentEvents"][-4:]}, ensure_ascii=False))
    return row


def travel(label: str | None = None, position: str | None = None) -> None:
    close_dialog()
    PAGE.keyboard.press("m")
    if label is not None:
        PAGE.get_by_role("button", name="前往" + label, exact=True).click()
    elif position is not None:
        PAGE.locator(f'.overview-map button[data-position="{position}"]').click()
    else:
        raise ValueError("travel needs label or position")
    PAGE.wait_for_timeout(80)
    if PAGE.locator("dialog[open]").count():
        raise AssertionError("map dialog stayed open after selecting a destination")
    ACTIONS.append({"atUtc": stamp(), "action": "map travel", "destination": label or position})
    write_results()


def interact() -> None:
    PAGE.locator(".context-action").click()
    PAGE.wait_for_timeout(30)


def button(pattern: str, *, exact: bool = False, root=None):
    root = root or PAGE
    if exact:
        return root.get_by_role("button", name=pattern, exact=True)
    return root.get_by_role("button", name=re.compile(pattern))


def start_forest_encounter() -> None:
    interact()
    button("尋找怪物").click()
    if PAGE.locator(".battle-scene").count() != 1:
        raise AssertionError("Forest encounter did not open the battle scene")


def save_reload_active_battle(name: str) -> dict:
    if PAGE.locator(".battle-scene").count() != 1:
        raise AssertionError("Cannot save/reload without an active battle scene")
    PAGE.screenshot(path=str(OUT / f"{name}-before-save.png"), full_page=True)
    PAGE.keyboard.press("Escape")
    PAGE.locator(".save-button").click()
    PAGE.wait_for_timeout(75)
    saved = raw_save()
    if not saved.get("combat"):
        raise AssertionError("UI save omitted active combat state")
    old_hp = active_character(saved).get("hp")
    old_combat = saved["combat"].copy()
    PAGE.reload(wait_until="networkidle")
    PAGE.wait_for_timeout(120)
    if PAGE.locator(".battle-scene").count() != 1:
        raise AssertionError("Saved active battle did not return after browser reload")
    dialog = PAGE.locator("dialog[open]")
    if dialog.count() and button("暫停時間", exact=True).count():
        button("暫停時間", exact=True).click()
    elif button("暫停", exact=True).count():
        button("暫停", exact=True).click()
    PAGE.screenshot(path=str(OUT / f"{name}-after-reload.png"), full_page=True)
    now = raw_save()
    outcome = {
        "checkpoint": name,
        "atUtc": stamp(),
        "savedCombat": old_combat,
        "savedPlayerHp": old_hp,
        "reloadedCombat": now.get("combat"),
        "reloadedPlayerHp": active_character(now).get("hp"),
        "combatSceneRestored": PAGE.locator(".battle-scene").count() == 1,
        "screenshots": [f"{name}-before-save.png", f"{name}-after-reload.png"],
    }
    ACTIONS.append({"atUtc": stamp(), "action": "Save UI then browser reload during active battle", **outcome})
    write_results()
    return outcome


def battle_values() -> dict:
    text = PAGE.locator("dialog[open]").inner_text()
    found = re.search(r"主角生命\s*(\d+)\s*/\s*\d+", text)
    enemy = re.search(r"怪物生命\s*(\d+)\s*/\s*\d+", text)
    return {
        "playerHp": int(found.group(1)) if found else None,
        "monsterHp": int(enemy.group(1)) if enemy else None,
    }


def player_hp_from_battle() -> int | None:
    return battle_values()["playerHp"]


def finish_battle(label: str, *, defend: bool = False, potion: bool = False, save_reload: bool = False) -> dict:
    if PAGE.locator(".battle-scene").count() != 1:
        raise AssertionError(f"{label}: no battle scene")
    enemy_text = PAGE.locator("dialog[open]").inner_text()
    enemy_match = re.search(r"\n([^\n]+) · Lv\.\d+\n怪物生命", enemy_text)
    enemy = enemy_match.group(1).strip() if enemy_match else "unknown"
    actions_used: list[str] = []
    turn_trace: list[dict] = []
    def click_turn(command: str, control) -> None:
        before = battle_values()
        control.click()
        PAGE.wait_for_timeout(15)
        after = battle_values() if PAGE.locator(".battle-scene").count() == 1 else None
        turn_trace.append({"command": command, "before": before, "after": after})
    if defend:
        click_turn("defend", button("防禦", exact=True))
        actions_used.append("defend")
        if save_reload:
            save_reload_active_battle(label + "-mid-combat")
    if potion:
        use = button("使用藥水", exact=True)
        if use.count() and not use.is_disabled():
            click_turn("potion", use)
            actions_used.append("potion")
        else:
            actions_used.append("potion-unavailable")
    attack_count = 0
    potion_count = actions_used.count("potion")
    for _ in range(80):
        if PAGE.locator(".battle-scene").count() != 1:
            break
        hp = player_hp_from_battle()
        use = button("使用藥水", exact=True)
        if hp is not None and hp <= 48 and use.count() and not use.is_disabled():
            click_turn("potion", use)
            potion_count += 1
            actions_used.append("potion")
        else:
            click_turn("attack", button("攻擊", exact=True))
            attack_count += 1
            actions_used.append("attack")
        PAGE.wait_for_timeout(15)
    if PAGE.locator(".battle-scene").count() == 1:
        raise AssertionError(f"{label}: battle still active after 80 player actions")
    PAGE.wait_for_timeout(30)
    ui_result = PAGE.locator("dialog[open]").inner_text() if PAGE.locator("dialog[open]").count() else PAGE.locator("body").inner_text()[-900:]
    if PAGE.locator("dialog[open]").count():
        close_dialog()
    saved = save_state()
    summary = {
        "label": label,
        "enemy": enemy,
        "resultUiExcerpt": ui_result[-500:],
        "playerActions": actions_used,
        "turnTrace": turn_trace,
        "attackCount": attack_count,
        "potionCount": potion_count,
        "playerHpAfter": active_character(saved).get("hp"),
        "combatPersistedAfter": saved.get("combat"),
        "worldTimeAfter": saved.get("worldTime"),
        "party": saved.get("party"),
        "events": [e.get("message") for e in saved.get("events", [])[-5:]],
    }
    BATTLE_SUMMARIES.append(summary)
    write_results()
    print(json.dumps({"battle": {k: summary[k] for k in ["label", "enemy", "playerActions", "attackCount", "potionCount", "playerHpAfter", "party", "events"]}}, ensure_ascii=False))
    return summary


def work_forest(count: int) -> int:
    interact()
    work_button = button("伐木")
    completed = 0
    for _ in range(count):
        if work_button.count() == 0 or work_button.is_disabled():
            break
        work_button.click()
        completed += 1
        PAGE.wait_for_timeout(15)
    close_dialog()
    row = checkpoint(f"forest-work-{len([x for x in OBSERVATIONS if x['checkpoint'].startswith('forest-work-')]) + 1}", f"Normal UI forest woodcutting; {completed}/{count} operations.")
    ACTIONS.append({"atUtc": stamp(), "action": "forest woodcutting", "requested": count, "completed": completed, "gold": row["activeCharacter"]["gold"], "stamina": row["activeCharacter"]["stamina"], "wood": row["activeCharacter"]["inventory"].get("wood")})
    write_results()
    return completed


def rest_at_home(hours: int = 3) -> None:
    travel(position="7,9")
    interact()
    rest = button("休息 · 1 小時", exact=True)
    for _ in range(hours):
        if rest.count() == 0 or rest.is_disabled():
            break
        rest.click()
        PAGE.wait_for_timeout(15)
    close_dialog()
    row = checkpoint(f"home-rest-{len([x for x in OBSERVATIONS if x['checkpoint'].startswith('home-rest-')]) + 1}", f"Rested through the normal home interaction, up to {hours} in-game hours.")
    ACTIONS.append({"atUtc": stamp(), "action": "home rest", "hoursRequested": hours, "hp": row["activeCharacter"]["hp"], "stamina": row["activeCharacter"]["stamina"]})
    write_results()


def clock_minutes() -> int:
    text = PAGE.locator(".world-clock").inner_text()
    match = re.search(r"(\d{1,2}):(\d{2})", text)
    if not match:
        raise AssertionError(f"Could not read UI clock: {text!r}")
    return int(match.group(1)) * 60 + int(match.group(2))


def advance_running_clock_to(hour: int, minute: int = 0) -> None:
    close_dialog()
    current = clock_minutes()
    target = hour * 60 + minute
    delta = (target - current) % (24 * 60)
    if delta == 0:
        return
    speed = button("×20", exact=True)
    if speed.get_attribute("aria-pressed") != "true":
        speed.click()
    PAGE.wait_for_timeout(int(delta / 40 * 1000) + 250)
    pause = button("暫停", exact=True)
    if pause.get_attribute("aria-pressed") != "true":
        pause.click()
    ACTIONS.append({"atUtc": stamp(), "action": "world speed control", "fromMinuteOfDay": current, "toMinuteOfDay": clock_minutes(), "requestedTarget": target, "speed": "×20"})
    write_results()


def open_shop_at(position: str = "10,8") -> None:
    travel(position=position)
    interact()
    if PAGE.locator("dialog[open] .shop-item").count() == 0:
        raise AssertionError("The normal UI shop did not open at the store tile")


def sell_shop_row(label: str, button_label: str) -> int:
    row = PAGE.locator("dialog[open] .shop-item").filter(has_text=label)
    sell = row.get_by_role("button", name=button_label, exact=True)
    sold = 0
    for _ in range(200):
        if sell.count() == 0 or sell.is_disabled():
            break
        sell.click()
        sold += 1
    return sold


def buy_shop_row(label: str, button_label: str, count: int = 1) -> int:
    row = PAGE.locator("dialog[open] .shop-item").filter(has_text=label)
    buy = row.get_by_role("button", name=button_label, exact=True)
    bought = 0
    for _ in range(count):
        if buy.count() == 0 or buy.is_disabled():
            break
        buy.click()
        bought += 1
    return bought


def advance_by_journal(action_name: str, checkpoint_name: str) -> dict:
    close_dialog()
    PAGE.get_by_role("button", name="旅人筆記", exact=True).click()
    PAGE.get_by_role("button", name=action_name, exact=True).click()
    PAGE.wait_for_timeout(75)
    row = checkpoint(checkpoint_name, f"Advanced time through the ordinary Traveler Notes UI action {action_name!r}.")
    ACTIONS.append({"atUtc": stamp(), "action": "Traveler Notes time advance", "control": action_name, "worldTime": row["worldTime"], "settlementStage": row["settlement"].get("stage")})
    write_results()
    return row


def building_position(terms: list[str]) -> tuple[str, str]:
    close_dialog()
    PAGE.keyboard.press("m")
    buildings = PAGE.locator(".overview-map button.is-building").evaluate_all(
        '(els) => els.map(e => ({position: e.getAttribute("data-position"), label: e.getAttribute("aria-label") || e.innerText}))'
    )
    choice = next((b for b in buildings if any(term in b["label"] for term in terms)), None)
    PAGE.keyboard.press("Escape")
    if choice is None:
        ACTIONS.append({"atUtc": stamp(), "action": "building lookup", "terms": terms, "availableBuildings": buildings})
        write_results()
        raise AssertionError(f"Could not find map building matching {terms}: {buildings}")
    return choice["position"], choice["label"]


def travel_to_building(terms: list[str]) -> str:
    position, label = building_position(terms)
    travel(position=position)
    interact()
    ACTIONS.append({"atUtc": stamp(), "action": "interact with map building", "position": position, "label": label})
    write_results()
    return label


def equip_from_inventory(label: str) -> bool:
    close_dialog()
    PAGE.keyboard.press("i")
    PAGE.wait_for_timeout(30)
    dialog = PAGE.locator("dialog[open]")
    item = dialog.locator(".item-list button").filter(has_text=label)
    if item.count() == 0:
        return False
    item.first.click()
    equip = dialog.locator(".item-detail").get_by_role("button", name="裝備", exact=True)
    if equip.count() == 0 or equip.is_disabled():
        return False
    equip.click()
    PAGE.wait_for_timeout(25)
    return True


def buy_gear_item(label: str) -> dict:
    row = PAGE.locator("dialog[open] .shop-item").filter(has_text=label)
    buy = row.get_by_role("button", name=re.compile(r"買 \d+ 金"))
    if row.count() == 0 or buy.count() == 0:
        return {"item": label, "available": False, "purchased": False}
    price_text = buy.inner_text()
    enabled = not buy.is_disabled()
    if enabled:
        buy.click()
    return {"item": label, "available": True, "purchased": enabled, "price": price_text, "rowText": row.inner_text()}


def visible_mercenaries() -> list[dict]:
    cards = PAGE.locator("dialog[open] .mercenary")
    rows = []
    for i in range(cards.count()):
        card = cards.nth(i)
        controls = card.get_by_role("button")
        rows.append({
            "text": card.inner_text(),
            "buttons": controls.all_text_contents(),
            "disabled": [controls.nth(j).is_disabled() for j in range(controls.count())],
        })
    return rows


def candidate_role(text: str) -> str | None:
    lower = text.lower()
    if any(token in lower for token in ["治療", "治癒", "醫者", "牧師", "healer", "cleric", "support"]):
        return "healer"
    if any(token in lower for token in ["戰士", "鬥士", "騎士", "fighter", "warrior", "frontline"]):
        return "fighter"
    return None


def roster_roles(saved: dict) -> list[dict]:
    member_ids = set()
    for member in saved.get("party", []):
        if isinstance(member, str):
            member_ids.add(member)
        elif isinstance(member, dict):
            member_ids.add(member.get("npcId", member.get("id")))
    roster = []
    for npc in saved.get("npcs", []):
        if npc.get("id") in member_ids:
            roster.append({key: npc.get(key) for key in ["id", "name", "archetype", "role", "job", "hp", "maxHp", "stats", "dailyWage", "contractEnd"] if key in npc})
    return roster


def hire_role(role: str, fallback_any: bool = False) -> dict:
    dialog = PAGE.locator("dialog[open]")
    cards = dialog.locator(".mercenary")
    chosen = None
    for i in range(cards.count()):
        card = cards.nth(i)
        if candidate_role(card.inner_text()) == role:
            hire = card.get_by_role("button")
            if hire.count() and not hire.first.is_disabled():
                chosen = (card, hire.first)
                break
    if chosen is None and fallback_any:
        for i in range(cards.count()):
            card = cards.nth(i)
            hire = card.get_by_role("button")
            if hire.count() and not hire.first.is_disabled():
                chosen = (card, hire.first)
                break
    if chosen is None:
        return {"roleWanted": role, "clicked": False, "candidates": visible_mercenaries()}
    card, hire = chosen
    text = card.inner_text()
    button_text = hire.inner_text()
    hire.click()
    PAGE.wait_for_timeout(50)
    result = {"roleWanted": role, "candidateRoleFromUi": candidate_role(text), "candidateText": text, "button": button_text, "clicked": True}
    ACTIONS.append({"atUtc": stamp(), "action": "tavern mercenary hire", **result})
    write_results()
    return result


def interact_tavern() -> None:
    travel_to_building(["酒館", "酒馆", "tavern"])
    if clock_minutes() < 18 * 60 or clock_minutes() >= 23 * 60:
        close_dialog()
        advance_running_clock_to(18, 0)
        interact()


def open_mine() -> None:
    close_dialog()
    interact()
    enter = button("進入.*廢棄礦坑|重返.*廢棄礦坑|進入.*礦坑|繼續.*礦坑")
    if enter.count() == 0:
        raise AssertionError(f"Dungeon entrance action missing: {PAGE.locator('dialog[open]').inner_text()}")
    enter.first.click()
    PAGE.wait_for_timeout(40)


def explore_floor(name: str, *, save_reload: bool = False) -> dict:
    close_dialog()
    interact()
    explore = button("探索下一段|探索下一層|探索第.*層|挑戰.*層")
    if explore.count() == 0:
        raise AssertionError(f"Dungeon exploration action missing: {PAGE.locator('dialog[open]').inner_text()}")
    explore.first.click()
    PAGE.wait_for_timeout(30)
    if PAGE.locator(".battle-scene").count() != 1:
        raise AssertionError(f"Dungeon floor {name} did not begin a battle")
    return finish_battle("dungeon-" + name, defend=save_reload, save_reload=save_reload)


def leave_mine() -> dict:
    close_dialog()
    interact()
    leave = button("離開礦坑|離開地下城|離開")
    if leave.count() == 0:
        raise AssertionError(f"Dungeon leave action missing: {PAGE.locator('dialog[open]').inner_text()}")
    leave.first.click()
    PAGE.wait_for_timeout(60)
    close_dialog()
    return checkpoint("dungeon-left", "Used the rendered leave action; save state records the player outside the dungeon with progress retained.", screenshot=True)


def main() -> int:
    global PAGE, BROWSER, CONTEXT, INITIAL_WORLD_TIME
    OUT.mkdir(parents=True, exist_ok=True)
    write_results()
    with sync_playwright() as p:
        BROWSER = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        CONTEXT, PAGE = ui_helpers.new_page(BROWSER, viewport=(1440, 1000))
        PAGE.set_default_timeout(4500)
        PAGE.on("pageerror", on_page_error)
        PAGE.on("console", on_console)
        started = checkpoint("start", "Fresh isolated browser context; seed was selected by the normal new-world UI; paused with the speed control.", screenshot=True)
        INITIAL_WORLD_TIME = started["worldTime"]
        if started["worldSeed"] != 909:
            raise AssertionError(f"Expected seed 909, saw {started['worldSeed']}")

        travel("森林")
        start_forest_encounter()
        battle1 = finish_battle("forest-first-win", defend=True, potion=True, save_reload=True)
        checkpoint("forest-first-win", "Won the first naturally generated forest encounter after defending, using a healing potion, and saving/reloading during combat.", screenshot=True)

        start_forest_encounter()
        battle2 = finish_battle("forest-second-win")
        checkpoint("forest-second-win", "Won a second forest encounter through ordinary Attack commands.", screenshot=True)

        start_forest_encounter()
        PAGE.screenshot(path=str(OUT / "forest-run-before.png"), full_page=True)
        button("逃跑", exact=True).click()
        PAGE.wait_for_timeout(35)
        close_dialog()
        flee = checkpoint("forest-run", "Started a third forest encounter and used the rendered Run command; no combat state was injected.", screenshot=True)
        ACTIONS.append({"atUtc": stamp(), "action": "forest battle run", "combatRemaining": flee["combat"], "events": flee["recentEvents"]})
        write_results()

        worked1 = work_forest(6)
        if worked1 < 4:
            raise AssertionError(f"Expected multiple normal woodcutting actions, completed {worked1}")
        rest_at_home(3)
        travel("森林")
        worked2 = work_forest(8)
        rest_at_home(3)
        travel("森林")
        worked3 = work_forest(4)
        checkpoint("economy-work-end", f"Completed {worked1 + worked2 + worked3} normal woodcutting actions across natural home-rest intervals; no balances were edited.", screenshot=True)

        advance_running_clock_to(8, 0)
        open_shop_at()
        wood_sold = sell_shop_row("木材", "賣 4 金")
        material_sold = sell_shop_row("怪物素材", "賣 10 金")
        potions_bought = buy_shop_row("治療藥水", "買 20 金", 4)
        if wood_sold != 48 or material_sold != 2 or potions_bought != 4:
            raise AssertionError(f"Shop transaction counts unexpected: wood={wood_sold}, material={material_sold}, potion={potions_bought}")
        close_dialog()
        sale_row = checkpoint("economy-sold-and-potions", "Sold UI-gathered wood and monster drops, then bought four healing potions at the normal general store; no balances were edited.", screenshot=True)
        ACTIONS.append({"atUtc": stamp(), "action": "general store transactions", "woodSold": wood_sold, "materialSold": material_sold, "potionsBought": potions_bought, "goldAfter": sale_row["activeCharacter"]["gold"], "potionsAfter": sale_row["activeCharacter"]["inventory"]["potion"]})
        write_results()

        for i in range(1, 6):
            time_row = advance_by_journal("度過一季", f"season-advance-{i}")
            if time_row["settlement"].get("stage") != "hamlet":
                break
        if OBSERVATIONS[-1]["settlement"].get("stage") != "hamlet":
            checkpoint("village-unlocked", "Settlement transitioned naturally after Traveler Notes season advances.", screenshot=True)
        else:
            checkpoint("village-still-locked", "Five ordinary season advances did not unlock the village in this seed; record as an unmet route prerequisite.", screenshot=True)

        smith_label = travel_to_building(["鐵匠鋪", "鐵匠", "smith"])
        smith_panel = PAGE.locator("dialog[open]").inner_text()
        PAGE.screenshot(path=str(OUT / "blacksmith-before-purchase.png"), full_page=True)
        sword_purchase = buy_gear_item("鐵劍")
        armor_purchase = buy_gear_item("皮甲")
        close_dialog()
        purchase_row = checkpoint("gear-purchased", "Bought a sword and leather armor from the unlocked blacksmith with earned gold through the visible shop UI.", screenshot=True)
        ACTIONS.append({"atUtc": stamp(), "action": "blacksmith purchases", "building": smith_label, "panel": smith_panel, "sword": sword_purchase, "armor": armor_purchase, "goldAfter": purchase_row["activeCharacter"]["gold"]})
        write_results()

        sword_equipped = equip_from_inventory("鐵劍")
        armor_equipped = equip_from_inventory("皮甲")
        close_dialog()
        equipped_row = checkpoint("gear-equipped", "Used the inventory window's Equip buttons for both purchases.", screenshot=True)
        ACTIONS.append({"atUtc": stamp(), "action": "equip purchases", "swordEquipped": sword_equipped, "armorEquipped": armor_equipped, "equipment": equipped_row["activeCharacter"]["equipment"]})
        write_results()

        advance_running_clock_to(18, 0)
        interact_tavern()
        tavern_panel = PAGE.locator("dialog[open]").inner_text()
        tavern_rows = visible_mercenaries()
        PAGE.screenshot(path=str(OUT / "tavern-candidates.png"), full_page=True)
        ACTIONS.append({"atUtc": stamp(), "action": "tavern candidate inspection", "panel": tavern_panel, "candidates": tavern_rows})
        write_results()

        fighter_hire = hire_role("fighter", fallback_any=True)
        close_dialog()
        party_one = checkpoint("party-one-hired", "Used the tavern Hire button for the first listed mercenary candidate.", screenshot=True)
        interact()
        healer_hire = hire_role("healer", fallback_any=True)
        close_dialog()
        party_two = checkpoint("party-two-hired", "Used the tavern Hire button for a second mercenary, aiming to include fighter and healer roles.", screenshot=True)
        actions_for_third = []
        interact()
        third_rows = visible_mercenaries()
        cards = PAGE.locator("dialog[open] .mercenary")
        for index in range(cards.count()):
            card = cards.nth(index)
            hire = card.get_by_role("button")
            if hire.count():
                actions_for_third.append({"candidate": card.inner_text(), "button": hire.first.inner_text(), "disabled": hire.first.is_disabled()})
        if actions_for_third and not actions_for_third[0]["disabled"]:
            card = PAGE.locator("dialog[open] .mercenary").first
            card.get_by_role("button").first.click()
            PAGE.wait_for_timeout(40)
        close_dialog()
        party_after_third = checkpoint("party-third-attempt", "Attempted the tavern's remaining third Hire option after reaching two companions; recorded the refusal or any party-cap defect.", screenshot=True)
        ACTIONS.append({"atUtc": stamp(), "action": "third mercenary attempt", "candidateRows": third_rows, "attempts": actions_for_third, "partyAfter": party_after_third["party"]})
        write_results()

        # Recover by the ordinary home interaction before the dungeon route.
        rest_at_home(3)
        travel("探索迷霧")
        mist = checkpoint("mist-revealed", "Walked through the world map's ordinary Explore the Mist destination; no save data was injected.", screenshot=True)
        ACTIONS.append({"atUtc": stamp(), "action": "mist exploration", "regions": mist["regions"], "dungeon": mist["dungeon"]})
        write_results()

        open_mine()
        entry = checkpoint("dungeon-entry", "Entered the Abandoned Mine using the visible world interaction.", screenshot=True)
        floor1 = explore_floor("floor-1")
        floor1_state = checkpoint("dungeon-floor-1-clear", "Won the first dungeon encounter through the rendered combat controls.", screenshot=True)
        left = leave_mine()

        open_mine()
        reentry = checkpoint("dungeon-reentry", "Re-entered using the visible mine action; the saved stage reset to zero for a new run.", screenshot=True)
        full_floor1 = explore_floor("full-run-floor-1")
        full_floor1_state = checkpoint("dungeon-full-run-floor-1-clear", "Won the first stage of the consecutive full dungeon run.", screenshot=False)
        full_floor2 = explore_floor("full-run-floor-2", save_reload=True)
        full_floor2_state = checkpoint("dungeon-full-run-floor-2-clear", "Won the elite second stage after an in-combat UI save and browser reload.", screenshot=False)
        full_floor3 = explore_floor("full-run-floor-3-guardian")
        full_floor3_state = checkpoint("dungeon-full-run-clear", "Won the dungeon guardian as the third consecutive encounter; recorded the clear reward and final normal-stat state.", screenshot=True)
        assert full_floor3_state["dungeon"]["runs"] == 1 and not full_floor3_state["dungeon"]["inDungeon"], full_floor3_state["dungeon"]
        assert full_floor3_state["activeCharacter"]["alive"], "Dungeon clear requires surviving protagonist"

        after_contract_days = []
        for day in range(1, 5):
            day_row = advance_by_journal("等待 1 日", f"mercenary-contract-day-{day}")
            after_contract_days.append({"day": day, "gold": day_row["activeCharacter"]["gold"], "party": day_row["party"], "roster": day_row["mercenaryRoster"], "events": day_row["recentEvents"][-5:]})
            if len(day_row["party"] or []) == 0:
                break
        ACTIONS.append({"atUtc": stamp(), "action": "daily wages and contract expiry", "days": after_contract_days})
        write_results()

        # Keep advancing through the ordinary journal control until the naturally
        # progressing forest threat reaches its warnings and spawns the world boss.
        boss_progression = []
        for season in range(1, 5):
            threat_row = advance_by_journal("度過一季", f"boss-threat-season-{season}")
            boss_progression.append({"season": season, "clock": threat_row["uiClock"], "threat": threat_row["threat"], "bossHistory": threat_row["threatHistory"], "history": threat_row["recentHistory"]})
            if threat_row["threat"].get("bossAlive"):
                break
        ACTIONS.append({"atUtc": stamp(), "action": "normal-time forest threat progression", "checkpoints": boss_progression})
        write_results()

        boss_status = OBSERVATIONS[-1]
        if not boss_status["threat"].get("bossAlive"):
            raise AssertionError(f"Forest Goblin Chief did not spawn after four normal season advances; last threat={boss_status['threat']}")
        rest_at_home(3)
        interact_tavern()
        boss_fighter = hire_role("fighter", fallback_any=True)
        close_dialog()
        interact()
        boss_healer = hire_role("healer", fallback_any=True)
        close_dialog()
        boss_party = checkpoint("forest-boss-party", "Re-hired up to two available companions through the tavern UI before the natural forest boss challenge.", screenshot=True)
        ACTIONS.append({"atUtc": stamp(), "action": "boss fight party", "fighterHire": boss_fighter, "healerHire": boss_healer, "party": boss_party["party"], "gold": boss_party["activeCharacter"]["gold"]})
        write_results()

        travel("森林")
        interact()
        PAGE.screenshot(path=str(OUT / "forest-chief-challenge.png"), full_page=True)
        challenge = button("挑戰哥布林酋長")
        if challenge.count() != 1 or challenge.is_disabled():
            raise AssertionError(f"Natural forest chief challenge action is unavailable: {PAGE.locator('dialog[open]').inner_text()}")
        challenge.click()
        PAGE.wait_for_timeout(30)
        forest_chief = finish_battle("forest-goblin-chief", defend=False, potion=False)
        boss_defeat = checkpoint("forest-chief-defeated", "Defeated the naturally spawned forest Goblin Chief using its rendered challenge action; verified bossAlive=false and boss.defeated history.", screenshot=True)
        assert not boss_defeat["threat"]["bossAlive"], "Forest Boss remains alive"
        assert any(e["type"] == "boss.defeated" for e in raw_save()["history"]), boss_defeat["threatHistory"]
        assert boss_defeat["activeCharacter"]["alive"], "Boss victory requires surviving protagonist"
        ACTIONS.append({"atUtc": stamp(), "action": "natural forest boss challenge and victory", "battle": forest_chief, "after": {"clock": boss_defeat["uiClock"], "threat": boss_defeat["threat"], "threatHistory": boss_defeat["threatHistory"], "recentHistory": boss_defeat["recentHistory"]}})
        write_results()

        continued = advance_by_journal("等待 1 日", "world-continues-after-boss")
        assert continued["worldTime"] > boss_defeat["worldTime"]
        assert (continued["worldTime"] - INITIAL_WORLD_TIME) >= 30 * 1440
        write_recorded(OUT / "after-boss-save.json", json.dumps(raw_save(), ensure_ascii=False, indent=2) + "\n", producer="adventure")
        write_results("normal-growth-dungeon-forest-boss-complete")
        CONTEXT.close()
        BROWSER.close()
    write_results("normal-growth-dungeon-forest-boss-complete")
    return 0


if __name__ == "__main__":
    try:
        code = main()
        raise SystemExit(code)
    except Exception as exc:
        PAGE_ERRORS.append(f"HARNESS: {type(exc).__name__}: {exc}")
        write_results("failed")
        raise

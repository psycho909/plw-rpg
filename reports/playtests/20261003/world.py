#!/usr/bin/env python3
"""UI-only long-term world playtest. Starts a fresh, nonpersistent context."""
from pathlib import Path
import json
import re
import time
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent
URL = "http://127.0.0.1:5173/"
YEARS = 64


def storage(page):
    return page.evaluate("() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))")


def decode(entries):
    for key, raw in entries.items():
        try:
            value = json.loads(raw)
        except Exception:
            continue
        if isinstance(value, dict):
            return key, value
    return None, {}


def find_named(root, pattern):
    found = {}
    if isinstance(root, dict):
        for key, value in root.items():
            if re.search(pattern, str(key), re.I):
                found[str(key)] = value
            found.update(find_named(value, pattern))
    elif isinstance(root, list):
        for value in root:
            found.update(find_named(value, pattern))
    return found


def summary(page, elapsed):
    entries = storage(page)
    key, payload = decode(entries)
    state = payload
    assert "worldTime" in state and "characters" in state, f"unexpected saved-state schema: {list(state)}"
    characters = state.get("characters", [])
    active_id = state.get("activeCharacterId")
    character = next((c for c in characters if c.get("id") == active_id), {})
    settlement = state.get("settlement", {})
    threat = state.get("threat", {})
    dungeon = state.get("dungeon", {})
    npcs = state.get("npcs", [])
    alive_npcs = [n for n in npcs if n.get("isAlive")]
    alive_characters = [c for c in characters if c.get("isAlive")]
    jobs = {}
    activities = {}
    schedule = []
    for npc in alive_npcs:
        jobs[npc.get("job", "unknown")] = jobs.get(npc.get("job", "unknown"), 0) + 1
        activities[npc.get("currentActivity", "unknown")] = activities.get(npc.get("currentActivity", "unknown"), 0) + 1
        if len(schedule) < 12:
            schedule.append({k: npc.get(k) for k in ("id", "name", "age", "job", "currentActivity", "position")})
    world_time = state.get("worldTime")
    history = state.get("history", [])
    milestones = [e for e in history if re.search(r"出生|搬進|離世|自然|聚落|村莊|城鎮|酋長|哥布林|威脅|警告", str(e.get("message", "")))]
    result = {
        "elapsed_year_clicks": elapsed,
        "storage_key": key,
        "world_seed": payload.get("worldSeed"),
        "stored_world_time": world_time,
        "active_character_id": active_id,
        "character": {k: character.get(k) for k in ("id", "name", "age", "lifeStage", "isAlive", "birthYear", "deathYear", "deathCause")},
        "alive_population": len(alive_npcs) + len(alive_characters),
        "alive_npc_count": len(alive_npcs),
        "npc_count": len(npcs),
        "npc_jobs": jobs,
        "npc_activities": activities,
        "npc_schedule_sample": schedule,
        "settlement": {k: settlement.get(k) for k in ("name", "stage", "capacity", "food", "prosperity", "safety", "growth", "buildings")},
        "threat": {k: threat.get(k) for k in ("threatLevel", "campLevel", "monsterPopulation", "bossProgress", "bossAlive")},
        "dungeon": {k: dungeon.get(k) for k in ("threat", "discovered", "stage")},
        "seed_candidates": find_named(payload, r"seed"),
        "storage_keys": list(entries),
        "storage_root_keys": list(payload),
        "ui_time_and_status": page.locator("body").inner_text()[:5000],
        "recent_events": state.get("events", [])[-25:] if isinstance(state.get("events"), list) else [],
        "history": history[-25:] if isinstance(history, list) else [],
        "milestones": milestones[-40:],
    }
    return result


def save_via_ui(page):
    page.get_by_role("button", name=re.compile("儲存世界")).click()
    page.wait_for_timeout(100)


def handle_successor(page, decisions):
    page.wait_for_timeout(100)
    dialog = page.locator("dialog[open]")
    if dialog.count() == 0:
        return False
    text = dialog.inner_text()
    eligible = dialog.locator(".successor-list button")
    attempts = 0
    while eligible.count() == 1 and "等待新居民抵達" in eligible.nth(0).inner_text() and attempts < 20:
        decisions.append({"action": "wait_for_successor", "dialog": text, "button": eligible.nth(0).inner_text()})
        eligible.nth(0).click()
        page.wait_for_timeout(200)
        dialog = page.locator("dialog[open]")
        if dialog.count() == 0:
            return True
        text = dialog.inner_text()
        eligible = dialog.locator(".successor-list button")
        attempts += 1
    if eligible.count() == 0:
        decisions.append({"action": "successor_dialog_without_choices", "dialog": text})
        return True
    names = [eligible.nth(i).inner_text() for i in range(eligible.count())]
    decisions.append({"action": "choose_successor", "dialog": text, "candidates": names, "chosen": names[0]})
    eligible.nth(0).click()
    page.wait_for_timeout(200)
    return True


def main():
    snapshots = []
    decisions = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 1100})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.goto(URL, wait_until="networkidle")
        page.get_by_role("button", name="暫停").click()
        save_via_ui(page)
        initial = summary(page, 0)
        assert initial["world_seed"] is not None, "UI save did not expose worldSeed in localStorage"
        assert initial["character"]["age"] == 16, f"unexpected actual start age: {initial['character']}"
        assert initial["character"]["isAlive"] is True
        assert initial["alive_population"] == 30, f"UI/storage population mismatch at start: {initial['alive_population']}"
        (OUT / "world-000.json").write_text(json.dumps(initial, ensure_ascii=False, indent=2), encoding="utf-8")
        page.screenshot(path=str(OUT / "world-000.png"), full_page=True)
        print("INITIAL", json.dumps({k: initial[k] for k in ("stored_world_time", "character", "alive_population", "settlement", "threat", "seed_candidates")}, ensure_ascii=False), flush=True)

        page.get_by_role("button", name="旅人筆記").click()
        year_button = page.get_by_role("button", name="度過一年")
        for elapsed in range(1, YEARS + 1):
            t0 = time.monotonic()
            year_button.click(timeout=120000)
            page.wait_for_timeout(100)
            if handle_successor(page, decisions):
                save_via_ui(page)
            save_via_ui(page)
            if elapsed % 5 == 0 or elapsed == YEARS:
                snap = summary(page, elapsed)
                expected_time = initial["stored_world_time"] + elapsed * 120 * 1440
                assert snap["stored_world_time"] == expected_time, f"year action time mismatch at {elapsed}: {snap['stored_world_time']} != {expected_time}"
                assert f"第 {elapsed + 1} 年" in page.locator(".world-clock").inner_text(), f"UI calendar did not reach year {elapsed + 1}"
                if elapsed <= 60:
                    assert snap["character"]["age"] == 16 + elapsed, f"player age mismatch at {elapsed}: {snap['character']}"
                if elapsed == 5:
                    assert snap["settlement"]["stage"] == "town"
                    assert snap["threat"]["bossAlive"] is True
                snapshots.append(snap)
                outpath = OUT / f"world-y{elapsed:03d}.json"
                outpath.write_text(json.dumps(snap, ensure_ascii=False, indent=2), encoding="utf-8")
                page.screenshot(path=str(OUT / f"world-y{elapsed:03d}.png"), full_page=True)
                print("SNAPSHOT", json.dumps({k: snap[k] for k in ("elapsed_year_clicks", "stored_world_time", "character", "alive_population", "settlement", "threat", "dungeon")}, ensure_ascii=False), "seconds=", round(time.monotonic()-t0, 2), flush=True)
            if elapsed % 1 == 0 and page.locator("dialog[open]").count() > 0:
                print("DIALOG", page.locator("dialog[open]").inner_text(), flush=True)
        # Final journal and history-visible evidence after 64 UI year actions.
        page.get_by_role("button", name="世界歷史").click()
        final_text = page.locator("body").inner_text()
        final = {
            "requested_year_actions": YEARS,
            "actual_ui_time": final_text[:12000],
            "snapshots": [{k: s[k] for k in ("elapsed_year_clicks", "stored_world_time", "character", "alive_population", "settlement", "threat", "dungeon")} for s in snapshots],
            "successor_decisions": decisions,
            "page_errors": errors,
        }
        final_saved = summary(page, YEARS)
        final["post_successor_snapshot"] = {k: final_saved[k] for k in ("world_seed", "stored_world_time", "active_character_id", "character", "alive_population", "settlement", "threat", "dungeon")}
        assert final_saved["stored_world_time"] == initial["stored_world_time"] + YEARS * 120 * 1440, "world time reset or skipped during succession"
        assert any(d.get("action") == "choose_successor" for d in decisions), "player death/successor flow was not observed"
        assert final_saved["active_character_id"] != initial["active_character_id"], "successor did not become active"
        assert not errors, f"browser page errors: {errors}"
        assert final_saved["settlement"]["stage"] == "town"
        final["assertions"] = {
            "initial_age_16": True,
            "population_count_includes_player": True,
            "year_click_world_time_exact": True,
            "player_age_increments_until_death": True,
            "settlement_reached_town_by_year_5": True,
            "boss_alive_by_year_5": True,
            "death_and_successor_dialog_observed": True,
            "successor_active_without_world_reset": True,
            "settlement_remained_town": True,
            "page_errors_zero": True,
        }
        (OUT / "world-final.json").write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
        page.screenshot(path=str(OUT / "world-final.png"), full_page=True)
        browser.close()


if __name__ == "__main__":
    main()

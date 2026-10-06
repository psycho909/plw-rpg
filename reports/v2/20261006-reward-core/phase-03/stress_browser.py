"""Phase 3 production Chromium stress. All game actions use the visible UI."""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import Locator, Page, expect, sync_playwright

ROOT = Path(__file__).resolve().parents[4] if str(Path(__file__).resolve()).startswith("/workspace/plw-rpg/") else Path("/workspace/plw-rpg")
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

OUT = ROOT / "reports/v2/20261006-reward-core/phase-03"
URL = os.environ.get("PLW_V2_URL", "http://127.0.0.1:5202")
DURATION = float(os.environ.get("PLW_STRESS_SECONDS", "1200"))
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", str(OUT / "build-status.json")))
PROFILE_EVERY = 30
REST_CAP_HOURS = 120
IDS = ["grayWolf", "scarredWolf", "alphaWolf", "packLeader", "wolfKing"]
LABELS = ["灰狼", "傷痕灰狼", "精英頭狼", "狼群領袖", "北林狼王"]
SAVE_KEY = "oakvale-v1"

if DURATION < 1200:
    raise AssertionError("Phase 3 stress must run for at least 1200 real seconds")


def source_sha() -> dict[str, str]:
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((ROOT / "src").rglob("*")) if p.is_file()}


SOURCE = source_sha()
if not BUILD_PATH.exists():
    raise FileNotFoundError(f"Root must generate production build status first: {BUILD_PATH}")
BUILD = json.loads(BUILD_PATH.read_text(encoding="utf-8"))
assert BUILD.get("exitCode") == 0 and BUILD.get("sourceStableDuringRun") is True
assert BUILD.get("sourceSha256") == SOURCE, "build-status sourceSha256 does not equal current ALLsrcSHA"

RUN_ID = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
result: dict = {
    "producer": "v2x-phase3-stress-browser",
    "requestedAgentName": "gpt6luna_max_browser_harness",
    "harnessAuthor": {"requestedModel": "GPT-6 Luna", "requestedEffort": "max",
                      "modelRuntimeVerified": False},
    "runnerRequestedModel": "GPT-6 Luna",
    "runnerRequestedEffort": "low",
    "runnerRuntimeVerified": False,
    "humanValidation": {"status": "DEFERRED / NOT APPLICABLE AT THIS STAGE",
                        "funGate": "deferred", "feedback": "deferred", "retentionSurvey": "deferred"},
    "runId": RUN_ID,
    "url": URL,
    "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "sourceSha256": SOURCE,
    "buildStatus": str(BUILD_PATH),
    "buildSourceSha256": BUILD.get("sourceSha256"),
    "startUTC": datetime.now(timezone.utc).isoformat(),
    "checks": [], "checkpoints": [], "rankWins": [], "bossFlow": {},
    "pageErrors": [], "consoleErrors": [], "rejections": [], "storageErrors": [],
    "uiResponsivenessMs": [], "reloads": 0, "operations": 0, "gearModalCycles": 0,
    "potionPurchases": 0, "screenshots": [], "deathDetected": False,
    "limitations": [
        "Runner-driven Chromium QA; Human Fun Gate, feedback and retention surveys are deferred/not applicable at this development stage.",
        "A 20-minute run does not clear older V2 two-hour soak findings or C01/C02/C03 follow-ups.",
        "No native Safari or physical-device validation.",
        "The settlement schema has no treasury field; player gold and the complete settlement state are recorded.",
    ],
}
profile: dict = {"page": None, "cdp": None, "started": None, "next": None}


def publish() -> None:
    write_recorded(OUT / "stress-browser.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                   producer="v2x-phase3-stress-browser")


def check(name: str, **detail) -> None:
    result["checks"].append({"name": name, **detail})
    publish()
    print("PASS", name, flush=True)


def raw(page: Page) -> dict:
    value = page.evaluate("localStorage.getItem('oakvale-v1')")
    if value is None:
        raise AssertionError("oakvale-v1 production save is missing")
    return json.loads(value)


def actor(state: dict) -> dict:
    return next(c for c in state["characters"] if c["id"] == state["activeCharacterId"])


def checkpoint(page: Page, reason: str) -> None:
    state = raw(page)
    character = actor(state)
    dom = profile["cdp"].send("Memory.getDOMCounters")
    heap = profile["cdp"].send("Runtime.getHeapUsage")
    telemetry = page.evaluate("""async () => {
      const s = await navigator.storage.estimate();
      return {saveLatencyMs: window.__qaSaveLatency.slice(-100),
        saveBytes: new TextEncoder().encode(localStorage.getItem('oakvale-v1') || '').length,
        storageErrors: window.__qaStorageErrors.slice(),
        resourceEntryCount: performance.getEntriesByType('resource').length,
        originStorageEstimate: {usage: s.usage ?? null, quota: s.quota ?? null},
        firstNativeSave: window.__qaFirstNativeSave};
    }""")
    first = telemetry.pop("firstNativeSave")
    if first is not None and "firstNativeStorageWrite" not in result:
        data = first.encode("utf-8")
        try:
            saved = json.loads(first)
            first_summary = {"worldTime": saved.get("worldTime"), "rngState": saved.get("rngState")}
        except (TypeError, json.JSONDecodeError):
            first_summary = {"parseable": False}
        result["firstNativeStorageWrite"] = {
            "forwardedOriginalArgumentsAndReceiver": True,
            "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), **first_summary,
        }
    result["checkpoints"].append({
        "reason": reason, "elapsedSeconds": time.monotonic() - profile["started"],
        "atUTC": datetime.now(timezone.utc).isoformat(), "worldTime": state["worldTime"],
        "livingPopulation": sum(bool(c["isAlive"]) for c in state["characters"] + state["npcs"]),
        "livingNPC": sum(bool(n["isAlive"]) for n in state["npcs"]),
        "deadNPC": sum(not n["isAlive"] for n in state["npcs"]),
        "player": {"isAlive": character["isAlive"], "hp": character["hp"], "maxHp": character["maxHp"],
                   "stamina": character["stamina"], "gold": character["gold"], "level": character["level"]},
        "settlement": state["settlement"], "settlementGold": state["settlement"].get("gold"),
        "threat": state["threat"], "bossState": {
            "wolfBossForm": state["reward"].get("wolfBossForm"),
            "wolfBossDefeatedAt": state["reward"].get("wolfBossDefeatedAt"),
            "goblinBossAlive": state["threat"].get("bossAlive"),
            "goblinBossProgress": state["threat"].get("bossProgress"),
            "goblinWarningLevel": state["threat"].get("warningLevel")},
        "events": len(state["events"]), "lastEvents": state["events"][-6:],
        "history": len(state["history"]), "lastHistory": state["history"][-4:],
        "journalPending": len(state.get("playJournal", {}).get("pending", [])),
        "saveBytes": telemetry["saveBytes"], "saveLatencyMs": telemetry["saveLatencyMs"],
        "originStorageEstimate": telemetry["originStorageEstimate"],
        "domCounters": dom, "heapUsage": heap,
        "jsEventListeners": dom.get("jsEventListeners"),
        "resourceEntryCount": telemetry["resourceEntryCount"],
        "uiResponsivenessMs": result["uiResponsivenessMs"][-60:],
        "pageErrors": len(result["pageErrors"]), "consoleErrors": len(result["consoleErrors"]),
        "unhandledRejections": len(result["rejections"]),
        "storageErrors": len(result["storageErrors"]) + len(telemetry["storageErrors"]),
    })
    publish()


def maybe_profile(page: Page | None = None, force: bool = False) -> None:
    active = page or profile["page"]
    if active is not None and profile["cdp"] is not None and (force or time.monotonic() >= profile["next"]):
        checkpoint(active, "lifecycle-preparation-combat-or-stress")
        profile["next"] = time.monotonic() + PROFILE_EVERY


def ui_click(locator: Locator, action: str) -> None:
    start = time.monotonic()
    locator.click()
    ms = (time.monotonic() - start) * 1000
    result["uiResponsivenessMs"].append({"action": action, "wallMilliseconds": ms})
    if len(result["uiResponsivenessMs"]) > 3000:
        del result["uiResponsivenessMs"][:-3000]
    result["operations"] += 1
    maybe_profile()


def key(page: Page, value: str, action: str = "keyboard") -> None:
    start = time.monotonic()
    page.keyboard.press(value)
    result["uiResponsivenessMs"].append({"action": action, "wallMilliseconds": (time.monotonic() - start) * 1000})
    result["operations"] += 1
    maybe_profile(page)


def alive(page: Page, where: str) -> dict:
    state = raw(page)
    character = actor(state)
    if not character["isAlive"] or character["hp"] <= 0:
        result["deathDetected"] = True
        result["deathContext"] = where
        result["deathState"] = state
        publish()
        raise RuntimeError(f"Player death during {where}; evidence retained, no automatic succession")
    return state


def close(page: Page) -> None:
    if page.locator("dialog[open]").count():
        key(page, "Escape", "dismiss modal")


def walk(page: Page, x: int, y: int) -> None:
    close(page)
    for _ in range(100):
        state = alive(page, "world movement")
        pos = actor(state)["position"]
        if pos == {"x": x, "y": y}:
            return
        direction = "ArrowRight" if pos["x"] < x else "ArrowLeft" if pos["x"] > x else "ArrowDown" if pos["y"] < y else "ArrowUp"
        key(page, direction, "real world movement")
    raise AssertionError(f"UI walk did not reach {(x, y)}")


def place(page: Page, x: int, y: int, label: str) -> None:
    close(page)
    walk(page, x, y)
    action = page.locator(".context-action")
    if action.count() and label in action.inner_text():
        ui_click(action, f"open {label}")
    else:
        nearby = page.locator(".nearby-trigger")
        expect(nearby).to_be_visible()
        ui_click(nearby, "open nearby interactions")
        choice = page.locator("dialog[open]").get_by_role("button", name=re.compile(re.escape(label)))
        expect(choice).to_have_count(1)
        ui_click(choice, f"choose {label}")
    expect(page.locator("dialog[open]")).to_have_count(1)


def home(page: Page) -> None:
    place(page, 7, 9, "家")


def forest(page: Page) -> None:
    place(page, 7, 6, "北方森林")
    expect(page.locator(".wolf-track-list .wolf-track-row")).to_have_count(5)


def minute_of_day(state: dict) -> int:
    return int(state["worldTime"]) % 1440


def rest_until(page: Page, predicate, reason: str, cap: int = REST_CAP_HOURS) -> dict:
    if cap > REST_CAP_HOURS or cap < 1:
        raise AssertionError(f"Rest cap must be 1..{REST_CAP_HOURS} game-hours")
    close(page)
    walk(page, 7, 9)
    home(page)
    before = raw(page)["worldTime"]
    for hour in range(cap + 1):
        state = alive(page, f"legal rest: {reason}")
        # Predicate receives only serialized state: it cannot open UI or shift the modal.
        if predicate(state):
            result.setdefault("restRoutes", []).append({"reason": reason, "hours": hour,
                "startWorldTime": before, "endWorldTime": state["worldTime"],
                "hp": actor(state)["hp"], "stamina": actor(state)["stamina"],
                "monsterPopulation": state["threat"]["monsterPopulation"]})
            maybe_profile(page)
            return state
        if hour == cap:
            break
        if not page.locator("dialog[open]").count():
            home(page)
        rest = page.get_by_role("button", name="休息 · 1 小時", exact=True)
        expect(rest).to_be_enabled()
        ui_click(rest, "legal one-hour village rest")
        alive(page, f"after rest hour {hour + 1}: {reason}")
    raise AssertionError({"reason": f"rest condition not met in {cap} game-hours: {reason}", "state": raw(page)})


def ready(page: Page, reason: str, hp_ratio: float = .86, stamina: int = 48) -> dict:
    state = alive(page, f"prepare {reason}")
    character = actor(state)
    if character["hp"] >= character["maxHp"] * hp_ratio and character["stamina"] >= stamina and state["threat"]["monsterPopulation"] >= 1:
        return state
    return rest_until(page, lambda s: actor(s)["isAlive"]
        and actor(s)["hp"] >= actor(s)["maxHp"] * hp_ratio
        and actor(s)["stamina"] >= stamina and s["threat"]["monsterPopulation"] >= 1, reason)


def buy_potions(page: Page, amount: int, require_purchase: bool = False) -> int:
    state = raw(page)
    hour = minute_of_day(state) // 60
    if not 9 <= hour <= 16:
        rest_until(page, lambda s: 9 <= minute_of_day(s) // 60 <= 16,
                   "legally wait for store hours", cap=REST_CAP_HOURS)
    place(page, 10, 8, "雜貨店")
    row = page.locator(".shop-item").filter(has_text="治療藥水")
    expect(row).to_have_count(1)
    button = row.get_by_role("button", name=re.compile(r"^買 \d+ 金$"))
    bought = 0
    for _ in range(amount):
        if not button.is_enabled():
            break
        old = raw(page)
        old_gold = actor(old)["gold"]
        old_count = actor(old)["inventory"]["potion"]
        ui_click(button, "buy treatment potion with native shop button")
        new = raw(page)
        assert actor(new)["inventory"]["potion"] == old_count + 1 and actor(new)["gold"] < old_gold
        bought += 1
        result["potionPurchases"] += 1
    close(page)
    if require_purchase and not bought:
        raise AssertionError("The fresh 45-gold save should afford a UI potion purchase")
    return bought


BASE = {"shortSword": ("weapon", 4), "axe": ("weapon", 6), "spear": ("weapon", 5),
        "hideArmor": ("armor", 2), "chainArmor": ("armor", 4)}


def score(item: dict) -> float:
    slot = BASE[item["baseId"]][0]
    stats = item["rolledStats"]
    return (stats["attack"] + stats["penetration"] + stats["bleed"] + stats["critical"] * .03
            if slot == "weapon" else stats["defense"] + stats["reduction"] * .08 + stats["block"] * .025)


def equip_upgrade(page: Page) -> dict | None:
    state = raw(page)
    owner = state["activeCharacterId"]
    character = actor(state)
    items = [i for i in state["reward"]["instances"] if i["ownerId"] == owner]
    refs = state["reward"].get("equipped", {}).get(owner, {})
    candidates = []
    for slot in ("weapon", "armor"):
        current = next((i for i in items if i["instanceId"] == refs.get(slot)), None)
        if current:
            current_score = score(current)
        else:
            current_score = 7 if slot == "weapon" and character["equipment"].get("weapon") == "sword" else 0
            current_score = 5 if slot == "armor" and character["equipment"].get("armor") == "armor" else current_score
        owned = [i for i in items if BASE[i["baseId"]][0] == slot]
        if owned:
            best = max(owned, key=score)
            if score(best) > current_score:
                candidates.append((score(best) - current_score, best, slot, current_score))
    if not candidates:
        return None
    _, best, slot, previous_score = max(candidates, key=lambda entry: entry[0])
    close(page)
    key(page, "i", "open real gear inventory")
    expect(page.locator("dialog[open]")).to_have_count(1)
    ui_click(page.get_by_role("button", name="獵獲裝備", exact=True), "open gear category")
    owned = [i for i in raw(page)["reward"]["instances"] if i["ownerId"] == owner]
    index = next(n for n, i in enumerate(owned) if i["instanceId"] == best["instanceId"])
    rows = page.locator(".gear-layout .item-list button")
    ui_click(rows.nth(index), "select stronger owned gear")
    detail = page.locator(".gear-detail")
    expect(detail).to_be_visible()
    visible_comparison = detail.inner_text()
    equip = page.get_by_role("button", name="穿戴獵獲裝備", exact=True)
    expect(equip).to_be_enabled()
    ui_click(equip, "equip stronger owned gear through UI")
    assert raw(page)["reward"]["equipped"][owner][slot] == best["instanceId"]
    evidence = {"instanceId": best["instanceId"], "baseId": best["baseId"], "slot": slot,
                "previousScore": previous_score, "newScore": score(best), "visibleComparison": visible_comparison}
    result.setdefault("equippedUpgrades", []).append(evidence)
    close(page)
    return evidence


def options(page: Page) -> list[dict]:
    rows = page.locator(".wolf-track-list .wolf-track-row")
    expect(rows).to_have_count(5)
    before = raw(page)
    values = []
    for index in range(5):
        row = rows.nth(index)
        button = row.get_by_role("button")
        values.append({"index": index, "label": button.inner_text().strip(),
                       "enabled": button.is_enabled(), "reason": row.inner_text().strip()})
    after = raw(page)
    assert before["worldTime"] == after["worldTime"] and before["rngState"] == after["rngState"]
    assert [v["label"] for v in values] == LABELS
    return values


def track(page: Page, definition: str) -> Locator:
    return page.locator(".wolf-track-list .wolf-track-row").nth(IDS.index(definition)).get_by_role("button")


def fight_action(page: Page, command: str | None = None) -> dict:
    state = alive(page, "before combat action")
    character = actor(state)
    threat_before = dict(state["threat"])
    cue_node = page.locator(".wolf-turn-cue")
    cue = cue_node.inner_text().strip() if cue_node.count() else ""
    reason = "forced test action" if command else "ordinary attack"
    if command is None:
        if character["hp"] <= max(48, character["maxHp"] * .55) and character["inventory"]["potion"]:
            command, reason = "使用藥水", "low HP potion takes priority"
        elif any(word in cue for word in ("急襲", "月襲", "重擊", "戰吼")):
            command, reason = "防禦", "defend from cue read in rendered UI"
        elif character["hp"] <= max(24, character["maxHp"] * .24):
            command, reason = "逃跑", "legal low-health retreat without potion"
        else:
            command = "攻擊"
    ui_click(page.get_by_role("button", name=command, exact=True), f"real combat command {command}")
    action_state = raw(page)
    action = {"command": command, "reason": reason, "cue": cue,
              "cueFromRenderedUI": cue, "threatBefore": threat_before,
              "threatAfter": dict(action_state["threat"]),
              "worldTimeBefore": state["worldTime"], "worldTimeAfter": action_state["worldTime"],
              "playerBefore": {k: character[k] for k in ("hp", "gold", "level", "stamina")},
              "playerAfter": {k: actor(action_state)[k] for k in ("hp", "gold", "level", "stamina")},
              "state": action_state}
    result.setdefault("fightActions", []).append({k: v for k, v in action.items() if k != "state"})
    alive(page, f"after combat command {command}")
    return action


def fight(page: Page, cap: int = 160, starting_event_sequence: int | None = None) -> dict:
    cues, actions = [], []
    # Scope payout detection to this encounter; earlier wins remain in the bounded
    # world event history and must never turn a later flee into a false victory.
    # eventSequence stays monotonic even after the 150-event ring buffer rolls over.
    if starting_event_sequence is None:
        starting_event_sequence = raw(page)["eventSequence"]
    for _ in range(cap):
        state = alive(page, "active combat")
        if state["combat"] is None:
            win_events = [e for e in state["events"]
                          if e.get("id", 0) > starting_event_sequence and e.get("type") == "combat.won"]
            return {"state": state, "won": bool(win_events), "winEvent": win_events[-1] if win_events else None,
                    "cues": cues, "actions": actions}
        action = fight_action(page)
        if action["cue"] and action["cue"] not in cues:
            cues.append(action["cue"])
        actions.append({k: action[k] for k in ("command", "reason", "cue", "threatBefore", "threatAfter",
                                                       "worldTimeBefore", "worldTimeAfter", "playerBefore", "playerAfter")})
        if action["command"] == "逃跑":
            return {"state": action["state"], "won": False, "cues": cues, "actions": actions}
        maybe_profile(page)
    raise AssertionError({"reason": "fight turn cap exceeded", "state": raw(page), "actions": actions})


def save_reload(page: Page, label: str) -> tuple[dict, dict]:
    close(page)
    paused = page.get_by_role("button", name="暫停", exact=True)
    if paused.get_attribute("aria-pressed") != "true":
        ui_click(paused, "pause with real speed control")
    ui_click(page.locator(".save-button"), "explicit native UI save")
    before = raw(page)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".world-map")
    page.wait_for_function("window.__qaFirstCheckpoint !== null")
    loaded = page.evaluate("window.__qaFirstCheckpoint")
    assert loaded is not None, f"{label}: first native storage checkpoint was not captured"
    for field in ("worldTime", "rngState", "reward", "combat"):
        assert loaded[field] == before[field], f"{label} reload changed {field}; offline progress or save mismatch"
    for field in ("hp", "gold", "level"):
        assert actor(loaded)[field] == actor(before)[field]
    result["reloads"] += 1
    # Capture the exact native load write first. Then pause the real clock before
    # running read-only options assertions, which otherwise race normal world ticks.
    result.setdefault("firstNativeCheckpointWorldTime", loaded["worldTime"])
    result.setdefault("nativeCheckpointReloads", []).append({
        "label": label, "savedWorldTime": loaded["worldTime"],
        "rngState": loaded["rngState"], "combat": loaded["combat"],
    })
    close(page)
    paused = page.get_by_role("button", name="暫停", exact=True)
    if paused.get_attribute("aria-pressed") != "true":
        ui_click(paused, "pause real clock after exact native checkpoint capture")
    if loaded.get("combat") is not None:
        ui_click(page.locator(".context-action"), "return to persisted combat through the visible context action")
        expect(page.locator(".battle-scene")).to_be_visible()
    maybe_profile(page)
    return before, loaded


def static_form(form: dict) -> dict:
    return {k: v for k, v in form.items() if k not in ("turn", "howlActive")}


def shoot(page: Page, name: str) -> str:
    path = OUT / f"{RUN_ID}-{name}.png"
    page.screenshot(path=str(path), full_page=True)
    result["screenshots"].append(str(path.relative_to(ROOT)))
    return str(path.relative_to(ROOT))


def ui_regressions(page: Page) -> dict:
    forest(page)
    presented = options(page)
    assert presented[0]["enabled"] and all(not item["enabled"] and item["reason"] for item in presented[1:])
    desktop = shoot(page, "wolf-track-desktop")
    page.set_viewport_size({"width": 390, "height": 844})
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
    assert page.locator("dialog[open]").evaluate("e => e.getBoundingClientRect().width") <= 390
    narrow = shoot(page, "wolf-track-390-reduced-motion")
    key(page, "Tab", "Tab focus new tracking dialog")
    assert page.evaluate("!!document.activeElement.closest('dialog[open]')")
    key(page, "Escape", "Escape dismiss new tracking dialog")
    expect(page.locator("dialog[open]")).to_have_count(0)
    page.set_viewport_size({"width": 1440, "height": 1000})
    check("new wolf tracking UI: five ordered options, true eligibility blockers, 390px fit and Tab/Escape", options=presented, desktop=desktop, narrow=narrow)
    return {"options": presented, "desktop": desktop, "narrow": narrow}


def first_gray_with_cue_screens(page: Page) -> dict:
    forest(page)
    before = raw(page)
    ui_click(track(page, "grayWolf"), "first real gray wolf track")
    formed = raw(page)["combat"]["familyEncounter"]
    assert formed["definitionId"] == "grayWolf"
    encounter_event_sequence = raw(page)["eventSequence"]
    fight_action(page, "攻擊")
    cue_node = page.locator(".wolf-turn-cue")
    expect(cue_node).to_be_visible()
    cue = cue_node.inner_text().strip()
    assert "急襲" in cue, cue
    desktop = shoot(page, "gray-rush-cue-desktop")
    page.set_viewport_size({"width": 390, "height": 844})
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
    narrow = shoot(page, "gray-rush-cue-390-reduced-motion")
    defensive = fight_action(page)
    assert defensive["command"] == "防禦" and defensive["reason"] == "defend from cue read in rendered UI"
    rest = fight(page, starting_event_sequence=encounter_event_sequence)
    if rest["won"]:
        assert "grayWolf" in rest["state"]["reward"]["collection"]["defeated"]
        result["rankWins"].append({"definitionId": "grayWolf", "won": True, "formation": formed,
                                    "cues": [cue], "actions": [{"command": "攻擊"}, {"command": "防禦", "cue": cue}]})
        check("real fight cue selects defense; desktop/narrow combat UI fit", cue=cue, desktop=desktop, narrow=narrow, outcome="won")
        equip_upgrade(page)
    else:
        check("real fight cue selects defense; low-health retreat is recorded for recovery", cue=cue, desktop=desktop, narrow=narrow, outcome="retreated")
    page.set_viewport_size({"width": 1440, "height": 1000})
    return {"outcome": rest["won"], "initialGold": actor(before)["gold"], "initialLevel": actor(before)["level"]}


def verify_win(state: dict, definition: str, old_gold: int, old_level: int, win_event: dict | None) -> dict:
    c = actor(state)
    assert definition in state["reward"]["collection"]["defeated"]
    assert win_event and win_event.get("type") == "combat.won"
    assert c["gold"] >= old_gold and c["level"] >= old_level
    return {"goldBefore": old_gold, "goldAfter": c["gold"], "levelBefore": old_level,
            "levelAfter": c["level"], "winEvent": win_event}


def win_rank(page: Page, definition: str, max_attempts: int = 4) -> dict:
    label = LABELS[IDS.index(definition)]
    attempts = []
    for attempt in range(1, max_attempts + 1):
        ready(page, f"heal/rest/population preparation for {label}")
        state = raw(page)
        if state["threat"]["monsterPopulation"] < 1:
            rest_until(page, lambda s: s["threat"]["monsterPopulation"] >= 1, f"legally restore monster population for {label}")
        forest(page)
        all_options = options(page)
        target = track(page, definition)
        expect(target).to_be_enabled()
        old_gold, old_level = actor(raw(page))["gold"], actor(raw(page))["level"]
        ui_click(target, f"track {label} through real UI")
        formed = raw(page)["combat"]["familyEncounter"]
        assert formed["definitionId"] == definition
        expect(page.locator(".wolf-fight-details")).to_be_visible()
        outcome = fight(page)
        attempts.append({"attempt": attempt, "options": all_options, "formation": formed,
                         "won": outcome["won"], "cues": outcome["cues"], "actions": outcome["actions"]})
        if outcome["won"]:
            payout = verify_win(outcome["state"], definition, old_gold, old_level, outcome["winEvent"])
            row = {"definitionId": definition, "won": True, "formation": formed,
                   "cues": outcome["cues"], "payout": payout, "attempts": attempts}
            result["rankWins"].append(row)
            equip_upgrade(page)
            check(f"wolf family {label}: actual formation, fight victory and reward flow", formation=formed, payout=payout, cues=outcome["cues"])
            if actor(raw(page))["inventory"]["potion"] < 3:
                buy_potions(page, 3 - actor(raw(page))["inventory"]["potion"])
            return row
        result.setdefault("retreats", []).append({"definitionId": definition, "attempt": attempt, "cues": outcome["cues"], "actions": outcome["actions"]})
        ready(page, f"legal recovery after retreat from {label}", hp_ratio=.92, stamina=64)
    raise AssertionError({"reason": f"failed to win {definition} after legal retries", "attempts": attempts})


def boss_flow(page: Page) -> dict:
    state = raw(page)
    assert all(item in state["reward"]["collection"]["defeated"] for item in IDS[:4])
    ready(page, "full legal recovery before first boss form", hp_ratio=.98, stamina=64)
    if actor(raw(page))["inventory"]["potion"] < 3:
        buy_potions(page, 3 - actor(raw(page))["inventory"]["potion"])
    ready(page, "boss readiness after real shop purchase", hp_ratio=.98, stamina=64)
    forest(page)
    before = raw(page)
    all_options = options(page)
    old_gold, old_level = actor(before)["gold"], actor(before)["level"]
    goblin_at_first_formation = {k: before["threat"].get(k) for k in ("bossAlive", "bossProgress", "warningLevel")}
    expect(track(page, "wolfKing")).to_be_enabled()
    ui_click(track(page, "wolfKing"), "first wolf king formation through UI")
    first = raw(page)
    formation = first["combat"]["familyEncounter"]
    assert formation["definitionId"] == "wolfKing"
    assert static_form(formation) == static_form(first["reward"]["wolfBossForm"])
    assert first["rngState"] != before["rngState"], "production boss formation should consume its real RNG sample"
    # Let this real boss fight advance, save/reload mid-fight, then flee from the persisted formation.
    action_a = fight_action(page, "攻擊")
    action_b = fight_action(page, "攻擊")
    before_reload, loaded = save_reload(page, "first-boss-midfight")
    assert loaded["combat"]["familyEncounter"] == before_reload["combat"]["familyEncounter"]
    assert static_form(loaded["combat"]["familyEncounter"]) == static_form(formation)
    check("first boss form saves and reloads mid-fight with exact turn/howl/RNG and no offline progress", formation=formation, turn=loaded["combat"]["familyEncounter"]["turn"])
    ui_click(page.get_by_role("button", name="逃跑", exact=True), "normal UI flee after boss mid-fight reload")
    fled = raw(page)
    assert fled["combat"] is None and static_form(fled["reward"]["wolfBossForm"]) == static_form(formation)
    result["bossFlow"]["firstFlee"] = {"formation": fled["reward"]["wolfBossForm"], "rngState": fled["rngState"],
                                       "worldTime": fled["worldTime"], "hp": actor(fled)["hp"],
                                       "gold": actor(fled)["gold"], "level": actor(fled)["level"]}
    rest_until(page, lambda s: actor(s)["hp"] >= actor(s)["maxHp"] * .98 and actor(s)["stamina"] >= 64
               and s["threat"]["monsterPopulation"] >= 1, "legal village healing after boss flee")
    if actor(raw(page))["inventory"]["potion"] < 3:
        buy_potions(page, 3 - actor(raw(page))["inventory"]["potion"])
    forest(page)
    retrack_options = options(page)
    boss = track(page, "wolfKing")
    expect(boss).to_be_enabled()
    retrack_rng_before = raw(page)["rngState"]
    old_gold, old_level = actor(raw(page))["gold"], actor(raw(page))["level"]
    ui_click(boss, "retrack saved wolf king after legal rest")
    tracked = raw(page)
    assert static_form(tracked["combat"]["familyEncounter"]) == static_form(formation)
    assert tracked["reward"]["wolfBossForm"] == fled["reward"]["wolfBossForm"]
    assert tracked["rngState"] == retrack_rng_before, "re-tracking the saved boss form unexpectedly consumed RNG"
    result["bossFlow"]["retrack"] = {"formation": tracked["combat"]["familyEncounter"], "options": retrack_options,
                                    "rngState": tracked["rngState"]}
    check("legal post-flee rest and boss re-track preserve exact static form without RNG reroll", formation=tracked["combat"]["familyEncounter"])

    retry_outcomes = []
    for retry in range(3):
        outcome = fight(page)
        if outcome["won"]:
            final = outcome["state"]
            break
        retry_outcomes.append({"retry": retry, "cues": outcome["cues"], "actions": outcome["actions"]})
        ready(page, "legal full recovery after boss retreat", hp_ratio=.98, stamina=64)
        if actor(raw(page))["inventory"]["potion"] < 3:
            buy_potions(page, 3 - actor(raw(page))["inventory"]["potion"])
        forest(page)
        button = track(page, "wolfKing")
        expect(button).to_be_enabled()
        ui_click(button, "legal wolf king retry after rest")
        retracked = raw(page)
        assert static_form(retracked["combat"]["familyEncounter"]) == static_form(formation)
    else:
        raise AssertionError({"reason": "wolf king not won after three legitimate attempts", "attempts": retry_outcomes})

    payout = verify_win(final, "wolfKing", old_gold, old_level, outcome["winEvent"])
    event_types = [e.get("type") for e in final["events"]]
    assert "wolf.boss.defeated" in event_types and "wolfKing" in final["reward"]["collection"]["bosses"]
    owner = final["activeCharacterId"]
    moon_before = before["reward"]["materials"][owner]["moonStone"]
    moon_after = final["reward"]["materials"][owner]["moonStone"]
    assert moon_after > moon_before, {"before": moon_before, "after": moon_after}
    winning_action = outcome["actions"][-1]
    goblin_before_win = {k: winning_action["threatBefore"].get(k) for k in ("bossAlive", "bossProgress", "warningLevel")}
    goblin_after = {k: winning_action["threatAfter"].get(k) for k in ("bossAlive", "bossProgress", "warningLevel")}
    winning_world_minutes = winning_action["worldTimeAfter"] - winning_action["worldTimeBefore"]
    crossed_midnight = winning_action["worldTimeAfter"] // 1440 != winning_action["worldTimeBefore"] // 1440
    if not crossed_midnight:
        assert goblin_after["bossAlive"] == goblin_before_win["bossAlive"]
        assert goblin_after["warningLevel"] == goblin_before_win["warningLevel"]
        assert goblin_after["bossProgress"] == max(0, goblin_before_win["bossProgress"] - 10)
    assert "boss.defeated" not in event_types
    defeated_at = final["reward"]["wolfBossDefeatedAt"]
    assert defeated_at is not None and final["reward"]["wolfBossForm"] is None
    forest(page)
    row = page.locator(".wolf-track-list .wolf-track-row").nth(4)
    expect(row.get_by_role("button")).to_be_disabled()
    blocked_state = raw(page)
    initial_cooldown_block = {
        "uiRowText": row.inner_text().strip(), "buttonDisabled": not row.get_by_role("button").is_enabled(),
        "worldTime": blocked_state["worldTime"], "monsterPopulation": blocked_state["threat"]["monsterPopulation"],
        "wolfBossDefeatedAt": blocked_state["reward"]["wolfBossDefeatedAt"],
        "wolfBossForm": blocked_state["reward"]["wolfBossForm"],
        "defeated": blocked_state["reward"]["collection"]["defeated"],
    }
    cooldown_rest = blocked_state
    if blocked_state["threat"]["monsterPopulation"] < 1:
        assert "附近暫時沒有怪物。" in initial_cooldown_block["uiRowText"]
        cooldown_rest = rest_until(page, lambda s: s["threat"]["monsterPopulation"] >= 1,
                                  "legally restore monster population to observe wolf king cooldown",
                                  cap=REST_CAP_HOURS)
    assert cooldown_rest["reward"]["wolfBossDefeatedAt"] == defeated_at
    assert cooldown_rest["reward"]["wolfBossForm"] is None
    forest(page)
    row = page.locator(".wolf-track-list .wolf-track-row").nth(4)
    cooldown_state = raw(page)
    assert cooldown_state["reward"]["wolfBossDefeatedAt"] == defeated_at
    assert cooldown_state["reward"]["wolfBossForm"] is None
    cooldown_text = row.inner_text().strip()
    cooldown_button = row.get_by_role("button")
    cooldown_elapsed = cooldown_state["worldTime"] - defeated_at
    cooldown_remaining = 7 * 1440 - cooldown_elapsed
    if cooldown_elapsed < 7 * 1440:
        expect(cooldown_button).to_be_disabled()
        assert "狼王再次現身前還需等待" in cooldown_text, cooldown_text
        wait_match = re.search(r"等待 (\d+) 日", cooldown_text)
        assert wait_match, cooldown_text
        displayed_days = int(wait_match.group(1))
        expected_days = (cooldown_remaining + 1439) // 1440
        assert displayed_days == expected_days and 1 <= displayed_days <= 7, {
            "displayedDays": displayed_days, "expectedDays": expected_days, "row": cooldown_text,
        }
        cooldown_outcome = "confirmed-after-legal-population-recovery"
    else:
        cooldown_outcome = "design-finding-cooldown-window-elapsed-during-legal-population-recovery"
        result.setdefault("designFindings", []).append({
            "finding": "Population recovered only after the wolf king's seven-day cooldown had elapsed; cooldown UI could not be observed within its window.",
            "status": cooldown_outcome, "initialBlocker": initial_cooldown_block,
            "afterLegalRecovery": {"worldTime": cooldown_state["worldTime"],
                "monsterPopulation": cooldown_state["threat"]["monsterPopulation"],
                "wolfBossDefeatedAt": cooldown_state["reward"]["wolfBossDefeatedAt"],
                "wolfBossForm": cooldown_state["reward"]["wolfBossForm"],
                "uiRowText": cooldown_text, "buttonDisabled": not cooldown_button.is_enabled()},
        })
    cooldown = cooldown_text
    result["bossFlow"].update({"firstFormation": formation, "midFightTurn": loaded["combat"]["familyEncounter"]["turn"],
        "flee": result["bossFlow"]["firstFlee"], "retrack": result["bossFlow"]["retrack"],
        "retryOutcomes": retry_outcomes, "payout": payout, "moonStoneBefore": moon_before,
        "moonStoneAfter": moon_after, "goblinAtFirstFormation": goblin_at_first_formation,
        "goblinImmediatelyBeforeAndAfterWinningCommand": {
            "before": goblin_before_win, "after": goblin_after,
            "worldMinutesAdvanced": winning_world_minutes, "crossedMidnight": crossed_midnight},
        "retrackRngBefore": retrack_rng_before, "retrackRngAfter": tracked["rngState"],
        "cooldown": cooldown, "cooldownOutcome": cooldown_outcome,
        "initialCooldownBlock": initial_cooldown_block,
        "cooldownAfterPopulationRecovery": {"worldTime": cooldown_state["worldTime"],
            "monsterPopulation": cooldown_state["threat"]["monsterPopulation"],
            "elapsedSinceDefeatMinutes": cooldown_elapsed, "remainingCooldownMinutes": max(0, cooldown_remaining),
            "wolfBossDefeatedAt": cooldown_state["reward"]["wolfBossDefeatedAt"],
            "wolfBossForm": cooldown_state["reward"]["wolfBossForm"],
            "uiRowText": cooldown_text, "buttonDisabled": not cooldown_button.is_enabled()},
        "trackOptionsBeforeBoss": all_options,
        "forcedInitialActions": [action_a["command"], action_b["command"]]})
    result["rankWins"].append({"definitionId": "wolfKing", "won": True, "formation": tracked["combat"]["familyEncounter"],
                               "payout": payout, "moonStoneAfter": moon_after, "cooldown": cooldown,
                               "cooldownOutcome": cooldown_outcome})
    if cooldown_outcome == "confirmed-after-legal-population-recovery":
        check("wolf king normal victory payout, MoonStone, cooldown after legal population recovery and goblin flags",
              payout=payout, moonStone=moon_after, cooldown=cooldown,
              goblinBeforeWinningCommand=goblin_before_win, goblinAfterWinningCommand=goblin_after,
              winningCommandWorldMinutes=winning_world_minutes, crossedMidnight=crossed_midnight)
    else:
        result["bossFlow"]["cooldownOutcome"] = cooldown_outcome
        publish()
        print("DESIGN FINDING", cooldown_outcome, flush=True)
    equip_upgrade(page)
    return result["bossFlow"]


def cycle_modals(page: Page) -> None:
    alive(page, "gear/modal cycle")
    close(page)
    key(page, "i", "open inventory modal")
    expect(page.locator("dialog[open]")).to_have_count(1)
    ui_click(page.get_by_role("button", name="獵獲裝備", exact=True), "open gear panel")
    state = raw(page)
    owner = state["activeCharacterId"]
    gear = [i for i in state["reward"]["instances"] if i["ownerId"] == owner]
    rows = page.locator(".gear-layout .item-list button")
    if gear and rows.count():
        ui_click(rows.nth(0), "inspect owned gear")
        button = page.get_by_role("button", name=re.compile(r"^(穿戴|卸下)獵獲裝備$"))
        if button.count() and button.is_enabled():
            ui_click(button, "toggle owned gear via real UI")
    ui_click(page.get_by_role("button", name="全部", exact=True), "all gear slots filter")
    ui_click(page.get_by_role("button", name="武器", exact=True), "weapon gear filter")
    ui_click(page.get_by_role("button", name="防具", exact=True), "armor gear filter")
    ui_click(page.get_by_role("button", name="全部品質", exact=True), "all gear rarity filter")
    ui_click(page.get_by_role("button", name="狼族素材", exact=True), "materials modal cycle")
    expect(page.locator(".reward-material")).to_have_count(3)
    ui_click(page.get_by_role("button", name="見聞收藏", exact=True), "discovery modal cycle")
    expect(page.locator(".reward-discovery")).to_be_visible()
    ui_click(page.get_by_role("button", name="日常物品", exact=True), "supplies modal cycle")
    assert len([i for i in raw(page)["reward"]["instances"] if i["ownerId"] == owner]) == len(gear)
    close(page)
    result["gearModalCycles"] += 1
    maybe_profile(page)


def failure_evidence(page: Page, exc: BaseException) -> None:
    result["status"] = "FAIL"
    result["failure"] = repr(exc)
    try:
        result["failureState"] = raw(page)
        value = page.evaluate("localStorage.getItem('oakvale-v1')")
        if value is not None:
            write_recorded(OUT / "failure-raw-save.json", value + "\n", producer="v2x-phase3-stress-browser-failure-state")
        path = OUT / f"{RUN_ID}-failure-screen.png"
        page.screenshot(path=str(path), full_page=True)
        result["failureScreenshot"] = str(path.relative_to(ROOT))
    except Exception as evidence_error:
        result["evidenceError"] = repr(evidence_error)
    publish()


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        page = context.new_page()
        result["browser"] = browser.version
        page.on("pageerror", lambda e: result["pageErrors"].append(str(e)))
        page.on("console", lambda m: result["consoleErrors"].append({"text": m.text, "location": m.location}) if m.type == "error" else None)
        page.expose_function("__qaRejected", lambda message: result["rejections"].append(message))
        page.expose_function("__qaStorageError", lambda message: result["storageErrors"].append(message))
        page.add_init_script("""(() => {
          window.__qaSaveLatency=[]; window.__qaStorageErrors=[]; window.__qaFirstNativeSave=null;
          window.__qaFirstCheckpoint=null;
          window.__qaRejections=[];
          const native=Storage.prototype.setItem;
          Storage.prototype.setItem=function(){
            const key=arguments[0], value=arguments[1], started=performance.now();
            try {
              // Observe only: exact receiver and arguments are forwarded to the native implementation.
              const returned=native.apply(this, arguments);
              if(key==='oakvale-v1'){
                window.__qaSaveLatency.push(performance.now()-started);
                if(window.__qaSaveLatency.length>2000)window.__qaSaveLatency.shift();
                if(window.__qaFirstNativeSave===null){
                  window.__qaFirstNativeSave=String(value);
                  try{window.__qaFirstCheckpoint=JSON.parse(String(value));}catch{}
                }
              }
              return returned;
            } catch(error) {
              if(key==='oakvale-v1'){
                const message=String(error); window.__qaStorageErrors.push(message);
                void window.__qaStorageError(message);
              }
              throw error;
            }
          };
          window.addEventListener('unhandledrejection',event=>{
            const message=String(event.reason); window.__qaRejections.push(message); void window.__qaRejected(message);
          });
        })();""")
        started = time.monotonic()
        result["actualStartUTC"] = datetime.now(timezone.utc).isoformat()
        profile.update({"page": page, "cdp": None, "started": started, "next": started + PROFILE_EVERY})
        try:
            publish()
            page.goto(URL, wait_until="domcontentloaded")
            ui_click(page.get_by_role("button", name="起身", exact=True), "begin fresh production save")
            page.wait_for_selector(".world-map")
            profile["cdp"] = context.new_cdp_session(page)
            pause = page.get_by_role("button", name="暫停", exact=True)
            if pause.get_attribute("aria-pressed") != "true":
                ui_click(pause, "pause through UI for lifecycle checks")
            result["initial"] = raw(page)
            assert actor(result["initial"])["gold"] == 45 and actor(result["initial"])["level"] == 1
            checkpoint(page, "fresh-save-baseline")
            maybe_profile(page, force=True)
            bought = buy_potions(page, 2, require_purchase=True)
            check("real .shop-item 治療藥水 filter and native buy button", purchases=bought,
                  potionCount=actor(raw(page))["inventory"]["potion"])

            ui_regressions(page)
            opener = first_gray_with_cue_screens(page)
            if not opener["outcome"]:
                win_rank(page, "grayWolf")
            ready(page, "legal healing and stamina recovery after gray-wolf training")
            equip_upgrade(page)
            check("player preparation used real loot/equipment and retained natural state",
                  hp=actor(raw(page))["hp"], level=actor(raw(page))["level"], gold=actor(raw(page))["gold"],
                  potionCount=actor(raw(page))["inventory"]["potion"], gearUpgrades=result.get("equippedUpgrades", []))

            for definition in IDS[1:4]:
                prior = raw(page)["reward"]["collection"]["defeated"]
                assert all(item in prior for item in IDS[:IDS.index(definition)])
                ready(page, f"heal/rest and train through play before {definition}")
                if actor(raw(page))["inventory"]["potion"] < 3:
                    buy_potions(page, 3 - actor(raw(page))["inventory"]["potion"])
                win_rank(page, definition)
            assert all(item in raw(page)["reward"]["collection"]["defeated"] for item in IDS[:4])
            check("gray, scarred, alpha and pack leader all reached by ordered victories",
                  defeats=raw(page)["reward"]["collection"]["defeated"])

            boss_flow(page)
            collection = raw(page)["reward"]["collection"]
            assert all(item in collection["defeated"] for item in IDS)
            assert len({r["definitionId"] for r in result["rankWins"] if r.get("won")}) == 5
            open_inventory = page.get_by_role("button", name="見聞收藏", exact=True)
            close(page)
            key(page, "i", "open inventory for boss reward verification")
            ui_click(open_inventory, "verify boss discovery in UI")
            expect(page.locator(".reward-discovery")).to_contain_text("北林狼王")
            ui_click(page.get_by_role("button", name="狼族素材", exact=True), "open wolf materials")
            expect(page.locator(".reward-material").filter(has_text="月石")).to_contain_text("持有")
            check("all five definitions have real wins; discovery and MoonStone are visible", collection=collection)
            close(page)

            speed = page.get_by_role("button", name="×1", exact=True)
            ui_click(speed, "normal ×1 world speed")
            assert speed.get_attribute("aria-pressed") == "true"
            next_reload = time.monotonic() + 180
            next_world_action = time.monotonic() + 20
            while time.monotonic() - started < DURATION or result["gearModalCycles"] < 100:
                cycle_modals(page)
                if time.monotonic() >= next_world_action:
                    state = alive(page, "sustained active gameplay")
                    character = actor(state)
                    if character["currentRegion"] == "forest" and character["stamina"] >= 10:
                        forest(page)
                        gather = page.get_by_role("button", name=re.compile("伐木"))
                        if gather.count() and gather.is_enabled():
                            ui_click(gather, "real forest gathering")
                        close(page)
                    else:
                        ready(page, "legal rest while world runs at normal speed", hp_ratio=.65, stamina=10)
                        if actor(raw(page))["currentRegion"] != "forest":
                            forest(page)
                            close(page)
                    next_world_action = time.monotonic() + 20
                if time.monotonic() >= next_reload:
                    _, loaded = save_reload(page, f"periodic-{result['reloads'] + 1}")
                    check("periodic explicit exact reload confirms no offline time and intact rewards/combat",
                          worldTime=loaded["worldTime"], rngState=loaded["rngState"], combat=loaded["combat"])
                    ui_click(page.get_by_role("button", name="×1", exact=True), "resume ×1 after reload")
                    next_reload = time.monotonic() + 180
                    next_world_action = time.monotonic() + 20
                maybe_profile(page)
                page.wait_for_timeout(350)

            final = raw(page)
            result.update({"final": final, "durationSeconds": time.monotonic() - started,
                           "endUTC": datetime.now(timezone.utc).isoformat(), "cycles": result["gearModalCycles"]})
            assert result["durationSeconds"] >= 1200 and result["gearModalCycles"] >= 100
            assert result["reloads"] >= 3 and final["worldTime"] > result["initial"]["worldTime"]
            assert all(item in final["reward"]["collection"]["defeated"] for item in IDS)
            assert not result["deathDetected"] and not result["pageErrors"] and not result["rejections"] and not result["storageErrors"]
            console_errors = [e for e in result["consoleErrors"] if "favicon.ico" not in e.get("location", {}).get("url", "")]
            assert not console_errors, console_errors
            assert SOURCE == source_sha(), "source fingerprint changed during Chromium run"
            result["status"] = "PASS"
            check("1200+ second production Chromium stress passed: five wolf victories, boss save/flee/retrack, 100+ gear/modal cycles",
                  durationSeconds=result["durationSeconds"], cycles=result["gearModalCycles"], reloads=result["reloads"], worldTime=final["worldTime"])
        except BaseException as exc:
            failure_evidence(page, exc)
            raise
        finally:
            result["durationSeconds"] = time.monotonic() - started
            result["endUTC"] = datetime.now(timezone.utc).isoformat()
            publish()
            context.close()
            browser.close()


if __name__ == "__main__":
    main()

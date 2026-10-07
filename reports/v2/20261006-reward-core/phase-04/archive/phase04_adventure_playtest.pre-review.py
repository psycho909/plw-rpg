"""Adaptive 30–60 minute agent playtest through production UI; not a human-play claim."""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import Locator, Page, expect, sync_playwright

ROOT = Path(__file__).resolve().parents[6]
OUT = Path(__file__).resolve().parent
URL = os.environ.get("PLW_V2_URL", "http://127.0.0.1:5202")
DURATION = int(os.environ.get("PLW_ADVENTURE_SECONDS", "1800"))
CONTROL_FILE = Path(os.environ.get("PLW_ADVENTURE_CONTROL_FILE", str(OUT / "adventure-controls.json")))
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", str(ROOT / "reports/v2/20261006-reward-core/phase-04/build-status.json")))
if not 1800 <= DURATION <= 3600:
    raise ValueError("Adventure playtest duration must be 1800–3600 real seconds")
if urlsplit(URL).hostname not in {"127.0.0.1", "localhost"}:
    raise ValueError("Adventure playtest only accepts the local production server")


def source_hashes() -> dict[str, str]:
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((ROOT / "src").rglob("*")) if p.is_file()}


SOURCE = source_hashes()
HARNESS_SHA = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
BUILD = json.loads(BUILD_PATH.read_text(encoding="utf-8"))
if BUILD.get("exitCode") != 0 or BUILD.get("sourceStableDuringRun") is not True or BUILD.get("sourceSha256") != SOURCE:
    raise AssertionError("Adventure runner requires a successful matching frozen production build")

RUN_ID = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
result: dict = {
    "producer": "v2x-phase4-adventure-agent-playtest", "status": "IN_PROGRESS",
    "runId": RUN_ID, "requestedRunnerEffort": "low", "runnerRuntimeVerified": False,
    "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "sourceSha256": SOURCE, "buildStatus": str(BUILD_PATH), "buildFreezeCheck": True,
    "harnessPath": str(Path(__file__).resolve()), "harnessSha256": HARNESS_SHA,
    "controlledFixture": False, "normalFreshSave": {"expectedLevel": 1, "expectedGold": 45, "saveInjected": False},
    "pageErrors": [], "consoleErrors": [], "rejections": [], "storageErrors": [],
    "decisionLog": [], "checkpoints": [], "lootDroughts": [], "progressLog": [],
    "reloads": 0, "operations": 0, "startUTC": datetime.now(timezone.utc).isoformat(),
    "actualStartUTC": None, "endUTC": None,
}
runtime: dict = {"page": None, "started": None, "cdp": None, "nextCheckpoint": None,
                "lastControlText": None, "lastGearIds": set(), "encountersSinceLoot": 0,
                "previousWorld": None}


def publish() -> None:
    from scripts.recorded_reports import write_recorded
    write_recorded(OUT / "adventure-agent-playtest.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                   producer=result["producer"])


def raw(page: Page) -> dict:
    value = page.evaluate("localStorage.getItem('oakvale-v1')")
    if value is None:
        raise AssertionError("Native world save missing")
    return json.loads(value)


def hero(state: dict) -> dict:
    return next(item for item in state["characters"] if item["id"] == state["activeCharacterId"])


def log_decision(wanted: str, why: str, decision: str, **evidence) -> None:
    result["decisionLog"].append({"atUTC": datetime.now(timezone.utc).isoformat(),
        "elapsedSeconds": time.monotonic() - runtime["started"], "wanted": wanted,
        "why": why, "decision": decision, **evidence})
    publish()


def visible_goals(page: Page) -> list[str]:
    selectors = [".exploration-hint", ".context-prompt", ".world-caption", ".wolf-track-list",
                 ".dungeon-route", ".reward-discovery", ".goal", "[data-adventure-goal]"]
    out = []
    for selector in selectors:
        node = page.locator(selector).first
        if node.count() and node.is_visible():
            text = re.sub(r"\s+", " ", node.inner_text()).strip()
            if text and text not in out:
                out.append(text)
    return out


def current_plan() -> dict:
    if not CONTROL_FILE.exists():
        return {"focus": "follow-readable-world-goals", "stop": False, "revision": "default"}
    data = json.loads(CONTROL_FILE.read_text(encoding="utf-8"))
    return {"focus": str(data.get("focus", "follow-readable-world-goals")),
            "stop": bool(data.get("stop", False)),
            "revision": str(data.get("revision", hashlib.sha256(CONTROL_FILE.read_bytes()).hexdigest()[:12]))}


def action(locator: Locator, label: str) -> float:
    start = time.monotonic()
    locator.click()
    elapsed = (time.monotonic() - start) * 1000
    result["operations"] += 1
    if runtime["page"] and time.monotonic() >= runtime["nextCheckpoint"]:
        checkpoint(runtime["page"], "scheduled checkpoint")
    return elapsed


def close_modal(page: Page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")


def move_to(page: Page, x: int, y: int) -> None:
    close_modal(page)
    for _ in range(100):
        pos = hero(raw(page))["position"]
        if pos == {"x": x, "y": y}:
            return
        label = "往右" if pos["x"] < x else "往左" if pos["x"] > x else "往下" if pos["y"] < y else "往上"
        action(page.get_by_role("button", name=label, exact=True), f"move {label}")
    raise AssertionError(f"Visible movement did not reach {(x, y)}")


def interact(page: Page, name: str) -> None:
    close_modal(page)
    prompt = page.locator(".context-action")
    if prompt.count() and name in prompt.inner_text():
        action(prompt, f"interact {name}")
        return
    nearby = page.locator(".nearby-trigger")
    expect(nearby).to_be_visible()
    action(nearby, "open nearby interactions")
    action(page.locator(".interaction-list button").filter(has_text=name).first, f"choose {name}")


def enter_forest(page: Page) -> None:
    move_to(page, 7, 6)
    interact(page, "北方森林")
    expect(page.locator(".wolf-track-list .wolf-track-row")).to_have_count(5)


BASE_SCORE = {"shortSword": 4, "axe": 6, "spear": 5, "hideArmor": 2, "chainArmor": 4}


def item_score(item: dict) -> float:
    stats = item["rolledStats"]
    if item["baseId"] in {"shortSword", "axe", "spear"}:
        return stats["attack"] + stats["penetration"] + stats["bleed"] + stats["critical"] * .03
    return stats["defense"] + stats["reduction"] * .08 + stats["block"] * .025


def inspect_decide_gear(page: Page, plan: dict) -> bool:
    state = raw(page)
    owner = state["activeCharacterId"]
    items = [i for i in state["reward"]["instances"] if i["ownerId"] == owner]
    fresh = [i for i in items if i["instanceId"] not in runtime["lastGearIds"]]
    if fresh:
        runtime["encountersSinceLoot"] = 0
        runtime["lastGearIds"].update(i["instanceId"] for i in fresh)
        result["progressLog"].append({"atUTC": datetime.now(timezone.utc).isoformat(),
            "kind": "new-loot", "instanceIds": [i["instanceId"] for i in fresh],
            "rarities": [i["rarity"] for i in fresh], "affixes": [i["affixes"] for i in fresh],
            "traits": [i["specialTrait"] for i in fresh]})
    if not items:
        return False
    close_modal(page)
    page.keyboard.press("i")
    expect(page.locator("dialog[open]")).to_have_count(1)
    action(page.get_by_role("button", name="獵獲裝備", exact=True), "open owned gear")
    rows = page.locator(".gear-layout .item-list button")
    candidates = []
    equipped = state["reward"].get("equipped", {}).get(owner, {})
    by_id = {i["instanceId"]: i for i in items}
    for index in range(rows.count()):
        row = rows.nth(index)
        action(row, "inspect owned gear")
        detail = page.locator(".gear-detail")
        expect(detail).to_be_visible()
        visible = detail.inner_text()
        item = items[index] if index < len(items) else None
        if not item:
            continue
        slot = "weapon" if item["baseId"] in {"shortSword", "axe", "spear"} else "armor"
        current = by_id.get(equipped.get(slot))
        current_value = item_score(current) if current else BASE_SCORE.get(
            "shortSword" if slot == "weapon" else "hideArmor", 0)
        delta = item_score(item) - current_value
        # A useful affix/trait may matter to the readable immediate goal; keep the rubric explicit in evidence.
        focus_text = (plan["focus"] + " " + " ".join(visible_goals(page))).lower()
        has_synergy = (("狼" in focus_text and item.get("specialTrait") == "moonHunter") or
                       ("暴擊" in focus_text and any(a["id"] == "keen" for a in item["affixes"])) or
                       ("裂傷" in focus_text and any(a["id"] == "bleeding" for a in item["affixes"])))
        candidates.append({"index": index, "item": item, "slot": slot, "delta": delta,
                           "visibleCompare": visible, "hasGoalSynergy": has_synergy})
    if not candidates:
        close_modal(page)
        return False
    best = max(candidates, key=lambda c: (c["delta"] > 0, c["hasGoalSynergy"], c["delta"]))
    item = best["item"]
    if best["delta"] > 0 or best["hasGoalSynergy"]:
        action(rows.nth(best["index"]), "select chosen candidate after actual compare")
        button = page.get_by_role("button", name="穿戴獵獲裝備", exact=True)
        expect(button).to_be_enabled()
        action(button, "equip chosen owned gear through UI")
        decision = "EQUIP"
        why = "same-slot comparison has a positive delta" if best["delta"] > 0 else "visible current goal has matching owned affix/trait utility"
        assert raw(page)["reward"]["equipped"][owner][best["slot"]] == item["instanceId"]
    else:
        decision, why = "KEEP_CURRENT_AND_IGNORE_CANDIDATE", "same-slot delta is not positive and no owned affix/trait matches the current readable goal"
    log_decision("find a useful build improvement for the current readable goal", why, decision,
        instanceId=item["instanceId"], rarity=item["rarity"], baseId=item["baseId"],
        affixes=item["affixes"], specialTrait=item["specialTrait"], slot=best["slot"],
        computedDelta=best["delta"], visibleComparison=best["visibleCompare"],
        currentGoal=visible_goals(page), planRevision=plan["revision"])
    close_modal(page)
    return True


def encounter_action(page: Page, plan: dict) -> None:
    state = raw(page)
    player = hero(state)
    cue_node = page.locator(".wolf-turn-cue")
    cue = cue_node.inner_text().strip() if cue_node.count() else ""
    hp_fraction = player["hp"] / max(player["maxHp"], 1)
    if hp_fraction < .24:
        command = "逃跑" if not player["inventory"].get("potion") else "使用藥水"
        why = "low health changes the immediate survival goal"
    elif any(term in cue for term in ("急襲", "月襲", "重擊", "戰吼")):
        command, why = "防禦", "visible enemy cue signals a high-impact next action"
    else:
        command, why = "攻擊", "continue the current encounter after reading the visible cue"
    action(page.get_by_role("button", name=command, exact=True), f"combat action {command}")
    log_decision("finish the active encounter while preserving the character", why, command,
        cue=cue, hp=player["hp"], maxHp=player["maxHp"], planRevision=plan["revision"])
    after = raw(page)
    if after.get("combat") is None:
        runtime["encountersSinceLoot"] += 1
        result["progressLog"].append({"atUTC": datetime.now(timezone.utc).isoformat(),
            "kind": "encounter-ended", "worldTime": after["worldTime"],
            "collection": after["reward"]["collection"], "gearCount": len(after["reward"]["instances"]),
            "encountersSinceNewGear": runtime["encountersSinceLoot"]})
        if runtime["encountersSinceLoot"] in (3, 6, 10):
            result["lootDroughts"].append({"atUTC": datetime.now(timezone.utc).isoformat(),
                "encountersWithoutGear": runtime["encountersSinceLoot"],
                "whatWasWanted": "a build-relevant gear choice for the visible next goal",
                "currentCollection": after["reward"]["collection"]})


def choose_next_goal(page: Page, plan: dict) -> None:
    state = raw(page)
    player = hero(state)
    if state.get("combat"):
        encounter_action(page, plan)
        return
    if player["hp"] < player["maxHp"] * .68 or player["stamina"] < 28:
        move_to(page, 7, 9)
        interact(page, "家")
        rest = page.get_by_role("button", name="休息 · 1 小時", exact=True)
        if rest.count() and rest.is_enabled():
            action(rest, "legal home rest for health and stamina")
            log_decision("recover before taking a harder target", "current HP/stamina is below the runner's survival threshold",
                         "REST_AT_HOME", hp=player["hp"], stamina=player["stamina"], planRevision=plan["revision"])
        close_modal(page)
        return

    # Loot inspection is conditional on actual owned items and comes before selecting more content.
    inspect_decide_gear(page, plan)
    goals = visible_goals(page)
    enter_forest(page)
    rows = page.locator(".wolf-track-list .wolf-track-row")
    choices = []
    for index in range(rows.count()):
        row = rows.nth(index)
        button = row.get_by_role("button")
        choices.append({"index": index, "label": button.inner_text().strip(),
                        "eligible": button.is_enabled(), "reason": row.inner_text().strip()})
    eligible = [choice for choice in choices if choice["eligible"]]
    if not eligible:
        result.setdefault("blockedGoals", []).append({"atUTC": datetime.now(timezone.utc).isoformat(),
            "goals": goals, "options": choices, "why": "no currently eligible forest target"})
        close_modal(page)
        page.wait_for_timeout(1000)
        return
    focus = plan["focus"].lower()
    preferred = next((c for c in eligible if any(token in focus for token in (c["label"].lower(),))), None)
    choice = preferred or eligible[-1]
    action(rows.nth(choice["index"]).get_by_role("button"), f"track currently eligible target {choice['label']}")
    formed = raw(page).get("combat", {}).get("familyEncounter")
    traits = page.locator(".wolf-fight-details").inner_text() if page.locator(".wolf-fight-details").count() else ""
    log_decision(f"learn what the next eligible target drops and how it pressures the current build",
        "target chosen from the currently enabled UI options; no drop or outcome preselected",
        "TRACK", target=choice["label"], blockerText=choice["reason"], currentGoals=goals,
        formation=formed, readableTraits=traits, currentGear=state["reward"].get("equipped"),
        ownedAffixes=[a for item in state["reward"]["instances"] for a in item["affixes"]],
        planRevision=plan["revision"])


def checkpoint(page: Page, reason: str) -> None:
    state = raw(page)
    telemetry = page.evaluate("""async () => { const s=await navigator.storage.estimate();
      return {latency:(window.__qaStorageLatency||[]).slice(-100), errors:(window.__qaStorageErrors||[]).slice(),
        bytes:new TextEncoder().encode(localStorage.getItem('oakvale-v1')||'').length,
        journal:JSON.parse(localStorage.getItem('oakvale-v1')||'{}').playJournal?.pending?.length??null,
        storage:{usage:s.usage??null,quota:s.quota??null}}; }""")
    plan = current_plan()
    checkpoint_entry = {"atUTC": datetime.now(timezone.utc).isoformat(),
        "elapsedSeconds": time.monotonic() - runtime["started"], "reason": reason,
        "worldTime": state["worldTime"], "player": {k: hero(state).get(k) for k in ("hp", "maxHp", "stamina", "gold", "level")},
        "currentRegion": hero(state)["currentRegion"], "position": hero(state)["position"],
        "combat": state.get("combat"), "dungeon": state.get("dungeon"),
        "settlement": state.get("settlement"), "collection": state["reward"]["collection"],
        "equipped": state["reward"].get("equipped"), "gearCount": len(state["reward"]["instances"]),
        "goalText": visible_goals(page), "plan": plan,
        "journalPending": telemetry["journal"], "saveBytes": telemetry["bytes"],
        "storage": telemetry["storage"], "saveLatencyMs": telemetry["latency"],
        "domCounters": runtime["cdp"].send("Memory.getDOMCounters"),
        "heapUsage": runtime["cdp"].send("Runtime.getHeapUsage"),
        "pageErrors": len(result["pageErrors"]), "consoleErrors": len(result["consoleErrors"]),
        "rejections": len(result["rejections"]), "storageErrors": len(result["storageErrors"])+len(telemetry["errors"])}
    result["checkpoints"].append(checkpoint_entry)
    if plan["revision"] != runtime["lastControlText"]:
        runtime["lastControlText"] = plan["revision"]
        log_decision("follow the current plan at a human review checkpoint", "control file is polled at each 60-second checkpoint",
                     "PLAN_UPDATED", plan=plan)
    runtime["nextCheckpoint"] = time.monotonic() + 60
    publish()


def setup_observation(page: Page) -> None:
    page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
    page.on("console", lambda message: result["consoleErrors"].append({"text": message.text, "location": message.location})
            if message.type == "error" else None)
    page.expose_function("__qaRejected", lambda message: result["rejections"].append(message))
    page.expose_function("__qaStorageError", lambda message: result["storageErrors"].append(message))
    page.add_init_script("""(() => { window.__qaStorageLatency=[]; window.__qaStorageErrors=[];
      const native=Storage.prototype.setItem; Storage.prototype.setItem=function(){
        const key=arguments[0], t=performance.now(); try { const out=native.apply(this,arguments);
          if(key==='oakvale-v1')window.__qaStorageLatency.push(performance.now()-t); return out;
        } catch(e) { if(key==='oakvale-v1'){const m=String(e);window.__qaStorageErrors.push(m);void window.__qaStorageError(m);} throw e; }
      }; addEventListener('unhandledrejection',e=>void window.__qaRejected(String(e.reason))); })();""")


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
                                             args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        page = context.new_page()
        runtime["page"] = page
        result["browserVersion"] = browser.version
        setup_observation(page)
        try:
            page.goto(URL, wait_until="domcontentloaded")
            expect(page.get_by_role("button", name="起身", exact=True)).to_be_visible()
            result["actualStartUTC"] = datetime.now(timezone.utc).isoformat()
            runtime["started"] = time.monotonic()
            action(page.get_by_role("button", name="起身", exact=True), "begin normal fresh life")
            page.wait_for_selector(".world-map")
            initial = raw(page)
            if hero(initial)["level"] != 1 or hero(initial)["gold"] != 45 or initial["reward"]["instances"]:
                raise AssertionError("Adventure Agent Playtest must start from a real fresh Lv1/gold45, unequipped save")
            runtime["cdp"] = context.new_cdp_session(page)
            runtime["lastGearIds"] = {i["instanceId"] for i in initial["reward"]["instances"]}
            runtime["previousWorld"] = initial["worldTime"]
            runtime["nextCheckpoint"] = time.monotonic() + 60
            checkpoint(page, "normal fresh-save baseline")
            while time.monotonic() - runtime["started"] < DURATION:
                plan = current_plan()
                if plan["stop"]:
                    result["status"] = "STOPPED_BY_CONTROL_FILE"
                    break
                choose_next_goal(page, plan)
                if time.monotonic() >= runtime["nextCheckpoint"]:
                    checkpoint(page, "scheduled 60-second checkpoint")
                page.wait_for_timeout(400)
            if result["status"] == "IN_PROGRESS":
                result["status"] = "PASS"
            result["actualDurationSeconds"] = time.monotonic() - runtime["started"]
            result["finalState"] = raw(page)
            if result["status"] == "PASS" and result["actualDurationSeconds"] < 1800:
                raise AssertionError("Adventure Agent Playtest completed before 30 real minutes")
            if SOURCE != source_hashes():
                raise AssertionError("Source fingerprints changed during Agent Playtest")
            if result["pageErrors"] or result["rejections"] or result["storageErrors"]:
                raise AssertionError("Browser reported errors during Agent Playtest")
        except BaseException as error:
            result["status"] = "FAIL"
            result["failure"] = repr(error)
            try:
                result["failureState"] = raw(page)
                result["failureScreenshot"] = f"{RUN_ID}-adventure-failure.png"
                page.screenshot(path=str(OUT / result["failureScreenshot"]), full_page=True)
            except BaseException as capture_error:
                result["evidenceError"] = repr(capture_error)
            raise
        finally:
            result["endUTC"] = datetime.now(timezone.utc).isoformat()
            result["actualDurationSeconds"] = time.monotonic() - runtime["started"] if runtime["started"] else None
            publish()
            context.close()
            browser.close()


if __name__ == "__main__":
    main()

"""Adaptive 30–60 minute agent playtest through production UI; not a human-play claim."""
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
from urllib.parse import urlsplit

from playwright.sync_api import Locator, Page, expect, sync_playwright
from runner_paths import assert_project_root, resolve_project_root
from adventure_policy import (choose_gear_candidate, current_baseline, item_score,
                              duration_evidence, page_items, parse_visible_expectation, select_target,
                              slot_from_visible_detail)

ROOT = assert_project_root(resolve_project_root(__file__))
sys.path.insert(0, str(ROOT))
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
if not SOURCE:
    raise AssertionError(f"No source files found under validated project root: {ROOT / 'src'}")
HARNESS_SHA = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
HELPER_PATHS = {
    "runner_paths.py": Path(__file__).resolve().with_name("runner_paths.py"),
    "adventure_policy.py": Path(__file__).resolve().with_name("adventure_policy.py"),
    "scripts.recorded_reports.py": ROOT / "scripts/recorded_reports.py",
}
HELPER_SHA = {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in HELPER_PATHS.items()}
BUILD = json.loads(BUILD_PATH.read_text(encoding="utf-8"))
BUILD_STATUS_SHA = hashlib.sha256(BUILD_PATH.read_bytes()).hexdigest()
if BUILD.get("exitCode") != 0 or BUILD.get("sourceStableDuringRun") is not True or BUILD.get("sourceSha256") != SOURCE:
    raise AssertionError("Adventure runner requires a successful matching frozen production build")

RUN_ID = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
result: dict = {
    "producer": "v2x-phase4-adventure-agent-playtest", "status": "IN_PROGRESS",
    "requestedAgentName": "g6_luna_med_phase4_browser_engineer",
    "harnessAuthor": {"requestedModel": "GPT-6 Luna", "requestedEffort": "medium",
                      "modelRuntimeVerified": False},
    "runnerRequestedModel": "GPT-6 Luna", "runnerRequestedEffort": "low",
    "runnerRuntimeVerified": False, "runnerRuntimeTelemetryAvailable": False,
    "runId": RUN_ID, "requestedRunnerEffort": "low", "runnerRuntimeVerified": False,
    "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "sourceSha256": SOURCE, "buildStatus": str(BUILD_PATH), "buildStatusSha256": BUILD_STATUS_SHA,
    "buildFreezeCheck": True,
    "harnessPath": str(Path(__file__).resolve()), "harnessSha256": HARNESS_SHA,
    "helperSha256": HELPER_SHA,
    "controlledFixture": False, "normalFreshSave": {"expectedLevel": 1, "expectedGold": 45, "saveInjected": False},
    "pageErrors": [], "consoleErrors": [], "rejections": [], "storageErrors": [],
    "decisionLog": [], "checkpoints": [], "lootDroughts": [], "progressLog": [],
    "reloads": 0, "operations": 0, "startUTC": datetime.now(timezone.utc).isoformat(),
    "actualStartUTC": None, "endUTC": None,
}
runtime: dict = {"page": None, "started": None, "cdp": None, "nextCheckpoint": None,
                "lastControlText": None, "lastGearIds": set(), "encountersSinceLoot": 0,
                "previousWorld": None, "blockedTurns": 0}


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
    # Eligibility rows are choices, not goals. Exclude the full row list so its first label
    # cannot accidentally masquerade as an explicit target hint.
    selectors = [".exploration-hint", ".context-prompt", ".world-caption", ".dungeon-route",
                 "[data-adventure-goal]"]
    out = []
    for selector in selectors:
        node = page.locator(selector).first
        if node.count() and node.is_visible():
            text = re.sub(r"\s+", " ", node.inner_text()).strip()
            if text and text not in out:
                out.append(text)
    return out


def explicit_adventure_goal(page: Page) -> str:
    node = page.locator("[data-adventure-goal]").first
    if node.count() and node.is_visible():
        return re.sub(r"\s+", " ", node.inner_text()).strip()
    return ""


def visible_reward_expectation(row: Locator) -> tuple[dict | None, str]:
    """Read the canonical rendered reward-expectation child, not row/hidden state."""
    expectation_node = row.locator("[data-wolf-reward-expectation]")
    if expectation_node.count() != 1 or not expectation_node.is_visible():
        return None, ""
    text = re.sub(r"\s+", " ", expectation_node.inner_text()).strip()
    return parse_visible_expectation(text), text


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
    if runtime["page"] and runtime["nextCheckpoint"] is not None and time.monotonic() >= runtime["nextCheckpoint"]:
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
    expect(page.locator("[data-adventure-goal]")).to_have_count(1)
    expect(page.locator(".wolf-track-row[data-wolf-track][data-rank]")).to_have_count(5)


def inspect_decide_gear(page: Page, plan: dict) -> bool:
    state = raw(page)
    owner = state["activeCharacterId"]
    items = [i for i in state["reward"]["instances"] if i["ownerId"] == owner]
    fresh = [i for i in items if i["instanceId"] not in runtime["lastGearIds"]]
    if fresh:
        runtime["encountersSinceLoot"] = 0
        runtime["lastGearIds"].update(i["instanceId"] for i in fresh)
    if not items:
        return False
    close_modal(page)
    page.keyboard.press("i")
    expect(page.locator("dialog[open]")).to_have_count(1)
    action(page.get_by_role("button", name="獵獲裝備", exact=True), "open owned gear")
    if fresh:
        feedback = page.locator("[data-loot-feedback]")
        if feedback.count() and feedback.is_visible():
            feedback_text = re.sub(r"\s+", " ", feedback.inner_text()).strip()
            feedback_kind = feedback.get_attribute("data-loot-feedback") or ""
            result["progressLog"].append({"atUTC": datetime.now(timezone.utc).isoformat(),
                "kind": "visible-loot-event", "visibleLabel": feedback.locator("strong").inner_text().strip(),
                "visibleMessage": feedback_text, "visibleEventKind": feedback_kind,
                "firstBaseDiscoveryShownByUI": "新發現" in feedback_text,
                "ownedInstanceIds": [i["instanceId"] for i in fresh],
                "rarities": [i["rarity"] for i in fresh], "affixes": [i["affixes"] for i in fresh],
                "traits": [i["specialTrait"] for i in fresh]})
        else:
            result["progressLog"].append({"atUTC": datetime.now(timezone.utc).isoformat(),
                "kind": "owned-item-observed-without-visible-loot-event",
                "ownedInstanceIds": [i["instanceId"] for i in fresh],
                "firstBaseDiscoveryShownByUI": False})
    candidates = []
    equipped = state["reward"].get("equipped", {}).get(owner, {})
    equipped_ids = {instance_id for instance_id in equipped.values() if instance_id}
    pagination = page.locator(".gear-pagination")
    page_index = 0
    page_total = 1
    while True:
        rows = page.locator(".gear-layout .item-list button")
        indexed_items = page_items(items, page_index)
        if rows.count() != len(indexed_items):
            raise AssertionError({"reason": "visible gear page does not match save projection page",
                                  "pageIndex": page_index, "visibleRows": rows.count(),
                                  "saveRows": len(indexed_items)})
        for row_index, (save_index, item) in enumerate(indexed_items):
            row = rows.nth(row_index)
            action(row, "inspect owned gear on current page")
            detail = page.locator(".gear-detail")
            expect(detail).to_be_visible()
            visible = detail.inner_text()
            visible_comparison = detail.evaluate("""node => {
              const labels = [...node.querySelectorAll('.gear-comparison dt')].map(e => e.innerText.trim());
              const values = [...node.querySelectorAll('.gear-comparison dd')];
              return values.slice(1).map((dd, i) => ({stat: labels[i + 1],
                candidateAndCurrent: dd.innerText.trim(), delta: dd.querySelector('.gear-delta')?.innerText.trim() ?? ''}));
            }""")
            visible_affix_comparison = detail.locator(".gear-affix-compare").inner_text()
            positive_visible_stats = [entry["stat"] for entry in visible_comparison
                                      if (re.search(r"\+\s*(\d+(?:\.\d+)?)", entry["delta"])
                                          and float(re.search(r"\+\s*(\d+(?:\.\d+)?)", entry["delta"]).group(1)) > 0)]
            slot = slot_from_visible_detail(item, visible)
            baseline = current_baseline(state, owner, slot)
            delta = item_score(item, slot) - baseline["score"]
            # Only unequipped items can be candidates; an equipped item must never reach the equip button.
            if item["instanceId"] in equipped_ids:
                continue
            focus_text = (plan["focus"] + " " + explicit_adventure_goal(page)).lower()
            has_synergy = (("狼" in focus_text and item.get("specialTrait") == "moonHunter") or
                           ("暴擊" in focus_text and any(a["id"] == "keen" for a in item["affixes"])) or
                           ("裂傷" in focus_text and any(a["id"] == "bleeding" for a in item["affixes"])))
            candidates.append({"pageIndex": page_index, "rowIndex": row_index, "saveIndex": save_index,
                "item": item, "slot": slot, "delta": delta, "baseline": baseline,
                "visibleCompare": visible, "visibleStatComparison": visible_comparison,
                "visibleAffixComparison": visible_affix_comparison,
                "visibleStatImprovements": positive_visible_stats,
                "hasVisibleStatImprovement": bool(positive_visible_stats), "hasGoalSynergy": has_synergy})
        page_text = pagination.inner_text() if pagination.count() else ""
        match = re.search(r"第\s*(\d+)／(\d+)\s*頁", page_text)
        if match:
            page_total = int(match.group(2))
        if page_index + 1 >= page_total:
            break
        action(pagination.get_by_role("button", name="下一頁", exact=True), "inspect next owned-gear page")
        page_index += 1
    best, keep_candidate = choose_gear_candidate(candidates, equipped_ids)
    if not best:
        log_decision("decide whether any owned unequipped gear improves the active build",
            "all visible and paged owned gear was compared; no unequipped candidate has positive delta or a goal-matched affix/trait",
            "KEEP_CURRENT_AND_IGNORE_CANDIDATES" if keep_candidate else "NO_UNEQUIPPED_CANDIDATE",
            inspections=[{"instanceId": c["item"]["instanceId"], "slot": c["slot"],
                          "rarity": c["item"]["rarity"], "affixes": c["item"]["affixes"],
                          "delta": c["delta"], "baseline": c["baseline"],
                          "visibleComparison": c["visibleCompare"],
                          "visibleStatComparison": c["visibleStatComparison"],
                          "visibleAffixComparison": c["visibleAffixComparison"]} for c in candidates],
            planRevision=plan["revision"])
        close_modal(page)
        return bool(keep_candidate)

    # Return to the selected real page after scanning all pages, then select the mapped row.
    while page_index > 0:
        action(pagination.get_by_role("button", name="上一頁", exact=True), "return to chosen loot page")
        page_index -= 1
    for _ in range(best["pageIndex"]):
        action(pagination.get_by_role("button", name="下一頁", exact=True), "navigate to chosen loot page")
    rows = page.locator(".gear-layout .item-list button")
    item = best["item"]
    if best["hasVisibleStatImprovement"] or best["hasGoalSynergy"]:
        action(rows.nth(best["rowIndex"]), "select chosen unequipped candidate after actual compare")
        button = page.get_by_role("button", name="穿戴獵獲裝備", exact=True)
        expect(button).to_be_enabled()
        action(button, "equip chosen owned gear through UI")
        why = ("rendered same-slot stat comparison shows improvement in " + ", ".join(best["visibleStatImprovements"])
               if best["hasVisibleStatImprovement"] else "visible current goal has matching owned affix/trait utility")
        assert raw(page)["reward"]["equipped"][owner][best["slot"]] == item["instanceId"]
        decision = "EQUIP"
    else:
        raise AssertionError("Candidate selection policy returned a candidate without a positive delta or matching synergy")
    log_decision("find a useful build improvement for the current readable goal", why, decision,
        instanceId=item["instanceId"], rarity=item["rarity"], baseId=item["baseId"],
        affixes=item["affixes"], specialTrait=item["specialTrait"], slot=best["slot"],
        computedDelta=best["delta"], baseline=best["baseline"], visibleComparison=best["visibleCompare"],
        visibleStatComparison=best["visibleStatComparison"], currentGoal=explicit_adventure_goal(page),
        visibleAffixComparison=best["visibleAffixComparison"],
        planRevision=plan["revision"])
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
    elif "硬皮" in cue and "穿透" in cue:
        command, why = "攻擊", "visible armored-phase cue says penetration doubles; test the currently equipped weapon's penetration/bleed against this active defense phase"
    elif any(term in cue for term in ("急襲", "月襲", "重擊", "戰吼")):
        command, why = "防禦", "visible enemy cue signals a high-impact next action"
    else:
        command, why = "攻擊", "continue the current encounter after reading the visible cue"
    action(page.get_by_role("button", name=command, exact=True), f"combat action {command}")
    owner = state["activeCharacterId"]
    equipped = state["reward"].get("equipped", {}).get(owner, {})
    equipped_items = {slot: next((i for i in state["reward"]["instances"]
                                  if i["instanceId"] == instance_id), None)
                      for slot, instance_id in equipped.items() if instance_id}
    weapon = equipped_items.get("weapon")
    weapon_stats = weapon.get("rolledStats", {}) if weapon else {}
    log_decision("finish the active encounter while preserving the character", why, command,
        cue=cue, hp=player["hp"], maxHp=player["maxHp"],
        equippedWeapon=equipped.get("weapon"), weaponPenetration=weapon_stats.get("penetration", 0),
        weaponBleed=weapon_stats.get("bleed", 0), weaponTrait=weapon.get("specialTrait") if weapon else None,
        planRevision=plan["revision"])
    after = raw(page)
    if state.get("combat") and after.get("combat"):
        log_decision("observe the effect of the chosen combat action", "compare actual enemy HP from consecutive saved states",
            "COMBAT_DELTA", enemyHpBefore=state["combat"]["hp"], enemyHpAfter=after["combat"]["hp"],
            damageObserved=state["combat"]["hp"] - after["combat"]["hp"], cue=cue,
            weaponPenetration=weapon_stats.get("penetration", 0),
            armoredPhaseCue="硬皮" in cue, planRevision=plan["revision"])
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
    rows = page.locator(".wolf-track-row[data-wolf-track][data-rank]")
    choices = []
    for index in range(rows.count()):
        row = rows.nth(index)
        button = row.get_by_role("button")
        expectation, expectation_text = visible_reward_expectation(row)
        choices.append({"index": index, "label": button.inner_text().strip(),
                        "definitionId": row.get_attribute("data-wolf-track"),
                        "rank": row.get_attribute("data-rank"),
                        "eligible": button.is_enabled(), "reason": row.inner_text().strip(),
                        "rewardExpectation": expectation, "rewardExpectationText": expectation_text})
    eligible = [choice for choice in choices if choice["eligible"]]
    if not eligible:
        handle_blocked_goal(page, state, plan, goals, choices)
        return
    collection = state["reward"]["collection"]
    reward_expectations = {choice["definitionId"]: choice["rewardExpectation"] for choice in choices
                           if choice["rewardExpectation"] is not None}
    goal_text = explicit_adventure_goal(page)
    choice, reason = select_target(eligible, collection.get("seen", []), collection.get("defeated", []),
                                   goal_text, reward_expectations)
    if choice is None:
        handle_blocked_goal(page, state, plan, goals, choices, blocker_reason=reason)
        return
    action(rows.nth(choice["index"]).get_by_role("button"), f"track currently eligible target {choice['label']}")
    formed = raw(page).get("combat", {}).get("familyEncounter")
    traits = page.locator(".wolf-fight-details").inner_text() if page.locator(".wolf-fight-details").count() else ""
    forecast_node = page.locator("[data-wolf-reward-forecast]")
    forecast_text = forecast_node.inner_text().strip() if forecast_node.count() and forecast_node.is_visible() else ""
    forecast = parse_visible_expectation(forecast_text)
    log_decision(f"learn whether {choice['label']} advances the current readable Adventure goal",
        reason,
        "TRACK", target=choice["label"], blockerText=choice["reason"], currentGoals=goals,
        formation=formed, readableTraits=traits, currentGear=state["reward"].get("equipped"),
        ownedAffixes=[a for item in state["reward"]["instances"] for a in item["affixes"]],
        hp=player["hp"], maxHp=player["maxHp"], stamina=player["stamina"],
        population=state["threat"].get("monsterPopulation"), collectionProgress=collection,
        rewardExpectation=choice["rewardExpectation"], rewardExpectationText=choice["rewardExpectationText"],
        activeCombatRewardForecast=forecast, activeCombatRewardForecastText=forecast_text,
        planRevision=plan["revision"])


def handle_blocked_goal(page: Page, state: dict, plan: dict, goals: list[str], choices: list[dict],
                        blocker_reason: str | None = None) -> None:
    """Turn ineligible targets into an observable legal recovery loop, not idle polling."""
    runtime["blockedTurns"] += 1
    entry = {"atUTC": datetime.now(timezone.utc).isoformat(), "turn": runtime["blockedTurns"],
        "elapsedSeconds": time.monotonic() - runtime["started"],
        "goals": goals, "options": choices, "population": state["threat"].get("monsterPopulation"),
        "currentRegion": hero(state)["currentRegion"], "position": hero(state)["position"],
        "why": blocker_reason or "no currently enabled forest target; follow a legal recovery/life observation route",
        "planRevision": plan["revision"]}
    result.setdefault("blockedGoals", []).append(entry)
    move_to(page, 7, 9)
    interact(page, "家")
    rest = page.get_by_role("button", name="休息 · 1 小時", exact=True)
    if rest.count() and rest.is_enabled():
        before = raw(page)
        action(rest, "legal village rest while target eligibility recovers")
        after = raw(page)
        entry["legalRest"] = {"startWorldTime": before["worldTime"], "endWorldTime": after["worldTime"],
            "populationBefore": before["threat"].get("monsterPopulation"),
            "populationAfter": after["threat"].get("monsterPopulation"),
            "hpAfter": hero(after)["hp"], "staminaAfter": hero(after)["stamina"]}
        log_decision("restore a legal route to a useful Adventure target", entry["why"], "LEGAL_HOME_REST",
                     blocker=entry, planRevision=plan["revision"])
    close_modal(page)
    # Every fourth blocked cycle inspects actual life/news UI so an external controller has evidence to redirect.
    if runtime["blockedTurns"] % 4 == 0:
        menu = page.locator(".menu-trigger")
        if menu.count():
            action(menu, "open menu for blocked-goal life observation")
            news = page.get_by_role("button", name="地方消息與委託", exact=True)
            if news.count():
                action(news, "inspect visible local news and available life goals")
                entry["lifeObservation"] = page.locator("dialog[open]").inner_text()
                log_decision("find an available life/world goal while no fresh Adventure target is useful",
                    entry["why"] + "; inspected the visible local news UI",
                    "OBSERVE_LOCAL_NEWS", text=entry["lifeObservation"], planRevision=plan["revision"])
            close_modal(page)


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
                    log_decision("end playtest at Root's control checkpoint", "control file requested stop",
                                 "STOPPED_BY_CONTROL_FILE", planRevision=plan["revision"])
                    break
                choose_next_goal(page, plan)
                if time.monotonic() >= runtime["nextCheckpoint"]:
                    checkpoint(page, "scheduled 60-second checkpoint")
                page.wait_for_timeout(400)
            if result["status"] == "IN_PROGRESS":
                result["status"] = "PASS"
            result["actualDurationSeconds"] = time.monotonic() - runtime["started"]
            result["finalState"] = raw(page)
            duration = duration_evidence(result["status"], result["actualDurationSeconds"])
            result["completedThirtyMinutePlaytest"] = duration["completed"]
            result["durationClaim"] = duration["claim"]
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
            end_source = source_hashes()
            end_harness = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
            end_helpers = {name: hashlib.sha256(path.read_bytes()).hexdigest()
                           for name, path in HELPER_PATHS.items()}
            end_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
            end_build_status = hashlib.sha256(BUILD_PATH.read_bytes()).hexdigest()
            result["endSourceSha256"] = end_source
            result["endHarnessSha256"] = end_harness
            result["endHelperSha256"] = end_helpers
            result["endSourceCommit"] = end_commit
            result["endBuildStatusSha256"] = end_build_status
            result["sourceStableDuringRun"] = end_source == SOURCE
            result["harnessStableDuringRun"] = end_harness == HARNESS_SHA
            result["helpersStableDuringRun"] = end_helpers == HELPER_SHA
            result["sourceCommitStableDuringRun"] = end_commit == result["sourceCommit"]
            stable = all((result["sourceStableDuringRun"], result["harnessStableDuringRun"],
                          result["helpersStableDuringRun"], result["sourceCommitStableDuringRun"]))
            stable = stable and end_build_status == BUILD_STATUS_SHA
            if result.get("status") == "PASS" and not stable:
                result["status"] = "FAIL_SOURCE_MUTATION"
                result["failure"] = "source, source commit, harness, or helper changed during run"
            if result["actualDurationSeconds"] is not None and result["status"] != "PASS":
                duration = duration_evidence(result["status"], result["actualDurationSeconds"])
                result["completedThirtyMinutePlaytest"] = duration["completed"]
                result["durationClaim"] = duration["claim"]
            publish()
            context.close()
            browser.close()


if __name__ == "__main__":
    main()

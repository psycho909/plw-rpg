#!/usr/bin/env python3
"""Oakvale save/offline UI playtest. Uses disposable Playwright contexts only."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = "http://127.0.0.1:5173/"
KEY = "oakvale-v1"
OUT = Path(__file__).resolve().parent


def dump(name: str, value: object) -> None:
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_raw(page):
    raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    if raw is None:
        raise AssertionError("expected UI-generated localStorage save")
    return raw


def summary(raw: str) -> dict:
    value = json.loads(raw)
    c = next(x for x in value["characters"] if x["id"] == value["activeCharacterId"])
    return {
        "saveVersion": value["saveVersion"], "worldSeed": value["worldSeed"],
        "worldTime": value["worldTime"], "lastSavedAt": value["lastSavedAt"],
        "character": c["name"], "position": c["position"], "region": c["currentRegion"],
        "food": c["inventory"]["food"], "preparedPlots": value["preparedPlots"],
        "crops": value["crops"], "population": len([n for n in value["npcs"] if n["isAlive"]]) + 1,
        "threat": value["threat"]["threatLevel"], "settlement": value["settlement"]["stage"],
    }


def add_seeded_context(browser, raw: str | None = None):
    options = {"viewport": {"width": 1440, "height": 1000}, "locale": "zh-TW", "timezone_id": "UTC"}
    if raw is not None:
        options["storage_state"] = {"cookies": [], "origins": [{"origin": "http://127.0.0.1:5173", "localStorage": [{"name": KEY, "value": raw}]}]}
    context = browser.new_context(**options)
    page = context.new_page()
    page.set_default_timeout(10000)
    page.goto(BASE, wait_until="networkidle")
    return context, page


def main() -> None:
    evidence: dict = {
        "startedAtUtc": datetime.now(timezone.utc).isoformat(),
        "environment": {"url": BASE, "browser": "/usr/bin/chromium", "context": "new non-persistent Playwright context"},
        "normal": [], "injections": [],
    }
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        context, page = add_seeded_context(browser)
        page.get_by_role("button", name="暫停", exact=True).click()
        initial = page.evaluate("({clock: document.querySelector('.world-clock').innerText, save: localStorage.getItem('oakvale-v1')})")
        evidence["normal"].append({"step": "new world and pause", "worldClock": initial["clock"], "saveBeforeFirstManualSave": initial["save"]})
        page.screenshot(path=str(OUT / "persistence-start.png"), full_page=True)

        page.locator(".travel-row").get_by_role("button", name="農田").click()
        coords = page.locator(".map-coordinates").inner_text()
        clock_after_travel = page.locator(".world-clock").inner_text()
        page.get_by_role("button", name="整地 · 20 分", exact=True).click()
        page.get_by_role("button", name="播種 · 10 分", exact=True).click()
        planted = page.locator(".plot-row").inner_text()
        page.get_by_role("button", name="等待 1 日", exact=True).click()
        page.get_by_role("button", name="等待 1 日", exact=True).click()
        mature = page.locator(".plot-row").inner_text()
        page.get_by_role("button", name="收割", exact=True).click()
        page.screenshot(path=str(OUT / "persistence-farm-harvest.png"), full_page=True)
        page.get_by_role("button", name="儲存世界").click()
        page.get_by_role("status").get_by_text("世界已儲存", exact=False).wait_for()
        saved_raw = load_raw(page)
        saved = summary(saved_raw)
        dump("persistence-ui-save.json", json.loads(saved_raw))
        evidence["normal"].append({
            "step": "move, prepare, plant, wait two days, harvest, manual save",
            "mapCoordinatesAfterTravel": coords, "worldClockAfterTravel": clock_after_travel,
            "plotsAfterPlant": planted, "plotsAfterTwoDays": mature,
            "uiStatus": page.get_by_role("status").inner_text(), "savedState": saved,
        })
        assert saved["food"] >= 5 and saved["worldTime"] >= 2880 and saved["region"] == "farmland", saved

        # Autosave must write the latest UI state in this paused session.
        page.get_by_role("button", name="等待 1 日", exact=True).click()
        expected_time = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).worldTime + 1440")
        deadline = time.monotonic() + 12
        auto_saved = None
        while time.monotonic() < deadline:
            raw = load_raw(page)
            auto_saved = json.loads(raw)
            if auto_saved["worldTime"] == expected_time:
                break
            page.wait_for_timeout(250)
        assert auto_saved and auto_saved["worldTime"] == expected_time, {"expected": expected_time, "actual": auto_saved and auto_saved["worldTime"]}
        evidence["normal"].append({"step": "automatic save after UI wait", "worldTime": auto_saved["worldTime"], "lastSavedAt": auto_saved["lastSavedAt"], "result": "latest state persisted"})
        page.screenshot(path=str(OUT / "persistence-autosave.png"), full_page=True)

        # Close the actual tab while paused, wait past the 2-real-minute summary threshold, and reopen.
        page.close()
        closed_at = datetime.now(timezone.utc).isoformat()
        print("closed-tab offline wait: 35s", flush=True)
        time.sleep(35)
        reopened = context.new_page()
        reopened.goto(BASE, wait_until="networkidle")
        banner = reopened.locator(".away-banner")
        banner.wait_for(state="visible", timeout=5000)
        offline_text = banner.inner_text()
        assert "經過 0 日 1 小時" in offline_text, offline_text
        reopened.get_by_role("button", name="儲存世界").click()
        post_offline_raw = load_raw(reopened)
        post_offline = summary(post_offline_raw)
        evidence["normal"].append({
            "step": "tab closed while paused for 35 seconds, then reopened in same disposable context",
            "closedAtUtc": closed_at,
            "offlineBanner": offline_text, "afterOffline": post_offline,
            "pausedBeforeClose": True, "worldTimeDeltaAfterOfflineAndManualSave": post_offline["worldTime"] - auto_saved["worldTime"],
            "result": "offline simulation and summary appeared while previously paused; world time then manually saved",
        })
        page = reopened
        page.screenshot(path=str(OUT / "persistence-offline-reopen.png"), full_page=True)
        position_before_continue = page.locator(".map-coordinates").inner_text()
        page.get_by_role("button", name="往左", exact=True).click()
        continued_position = page.locator(".map-coordinates").inner_text()
        assert continued_position != position_before_continue, {"before": position_before_continue, "after": continued_position}
        page.get_by_role("button", name="儲存世界").click()
        post_continue_raw = load_raw(page)
        post_continue = summary(post_continue_raw)
        evidence["normal"].append({
            "step": "continue playing after reopen: move one tile and manually save",
            "positionBefore": position_before_continue, "positionAfter": continued_position,
            "worldClockAfterMove": page.locator(".world-clock").inner_text(), "savedState": post_continue,
            "result": "normal movement succeeded and was saved after offline recovery",
        })
        page.screenshot(path=str(OUT / "persistence-continue-after-reopen.png"), full_page=True)

        # Copy this UI-generated save into isolated contexts. These cases are controlled injections.
        baseline = json.loads(post_continue_raw)
        scenarios = []
        long_away = dict(baseline)
        long_away["lastSavedAt"] = int(time.time() * 1000) - int(8.5 * 3600 * 1000)
        scenarios.append(("8h-cap", json.dumps(long_away, ensure_ascii=False), "time-cap"))
        scenarios.append(("invalid-json", "{broken", "corrupt"))
        version = dict(baseline); version["saveVersion"] = 99
        scenarios.append(("unsupported-version", json.dumps(version, ensure_ascii=False), "corrupt"))
        incomplete = dict(baseline); del incomplete["npcs"]
        scenarios.append(("incomplete-structure", json.dumps(incomplete, ensure_ascii=False), "corrupt"))

        for name, injected_raw, kind in scenarios:
            injected_context, test_page = add_seeded_context(browser, injected_raw)
            initial_raw = test_page.evaluate("localStorage.getItem('oakvale-v1')")
            case = {"name": name, "kind": kind, "injectedBytes": len(injected_raw), "injectedRaw": injected_raw}
            if kind == "time-cap":
                text = test_page.locator(".away-banner").inner_text()
                assert "經過 40 日" in text, text
                case["offlineBanner"] = text
                case["result"] = "8.5 real hours was capped to 40 game days"
                test_page.screenshot(path=str(OUT / "persistence-injection-8h-cap.png"), full_page=True)
            else:
                case["initialUiMessage"] = test_page.locator(".notice").inner_text()
                test_page.screenshot(path=str(OUT / f"persistence-injection-{name}.png"), full_page=True)
                # Wait through one autosave interval, request a manual save, then cancel rebuild.
                test_page.wait_for_timeout(10200)
                after_auto = test_page.evaluate("localStorage.getItem('oakvale-v1')")
                test_page.get_by_role("button", name="儲存世界", exact=True).click()
                notice = test_page.get_by_role("status").inner_text()
                after_manual = test_page.evaluate("localStorage.getItem('oakvale-v1')")
                dialogs = []
                test_page.once("dialog", lambda dialog: (dialogs.append({"type": dialog.type, "message": dialog.message}), dialog.dismiss()))
                test_page.get_by_role("button", name="重建世界", exact=True).click()
                after_cancel = test_page.evaluate("localStorage.getItem('oakvale-v1')")
                assert after_auto == initial_raw == after_manual == after_cancel, name
                case.update({"afterAutoSaveRawUnchanged": after_auto == initial_raw, "manualNotice": notice, "afterManualRawUnchanged": after_manual == initial_raw, "cancelDialog": dialogs, "afterCancelRawUnchanged": after_cancel == initial_raw})
                if name == "invalid-json":
                    test_page.screenshot(path=str(OUT / "persistence-injection-invalid-json.png"), full_page=True)
                    dialogs = []
                    test_page.once("dialog", lambda dialog: (dialogs.append({"type": dialog.type, "message": dialog.message}), dialog.accept()))
                    test_page.get_by_role("button", name="重建世界", exact=True).click()
                    rebuilt_raw = load_raw(test_page)
                    rebuilt = summary(rebuilt_raw)
                    assert rebuilt["saveVersion"] == 1 and rebuilt["worldSeed"] == 909 and rebuilt["worldTime"] >= 480
                    case["confirmDialog"] = dialogs
                    case["afterConfirmRebuild"] = rebuilt
                    case["confirmedRebuildReplacedCorruptRaw"] = rebuilt_raw != initial_raw
                    test_page.screenshot(path=str(OUT / "persistence-injection-rebuild-confirmed.png"), full_page=True)
                case["result"] = "corrupt raw preserved through load, autosave, manual save and canceled rebuild"
            evidence["injections"].append(case)
            dump(f"persistence-injection-{name}.json", case)
            injected_context.close()

        dump("persistence-results.json", evidence)
        browser.close()
    print(json.dumps({"result": "completed", "normalSteps": len(evidence["normal"]), "injections": [x["name"] for x in evidence["injections"]]}, ensure_ascii=False))


if __name__ == "__main__":
    main()

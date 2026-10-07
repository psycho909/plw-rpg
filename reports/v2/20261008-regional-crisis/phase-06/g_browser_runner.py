"""Focused G browser QA. Inert without --go and Root's matching release marker."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Any

from playwright.sync_api import expect, sync_playwright

from g_browser_support import append_jsonl, now_utc, provenance, publish, validate_build, verify_http_dist


def project_root(script: Path) -> Path:
    for candidate in script.resolve().parents:
        if (candidate / "package.json").is_file() and (candidate / "src").is_dir(): return candidate
    raise RuntimeError(f"Cannot find project root above {script}")


ROOT = project_root(Path(__file__))
PHASE = ROOT / "reports/v2/20261008-regional-crisis/phase-06"
DRIVER = Path(__file__).resolve()
SUPPORT = PHASE / "g_browser_support.py"
FIXTURE_GENERATOR = PHASE / "g_browser_fixture_generator.py"
RUNS = PHASE / "g-browser-runs"
BUILD_PATH = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "g-build-status.json"))
PRODUCER = "g6-luna-low-phase6-g-browser-qa"


def release_gate(mode: str) -> tuple[dict[str, Any], dict[str, Any]]:
    marker_path = PHASE / "g-browser-release.json"
    if not marker_path.is_file(): raise RuntimeError("Root g-browser-release.json is missing; no browser run started")
    marker = json.loads(marker_path.read_text(encoding="utf-8"))
    build = validate_build(ROOT, BUILD_PATH)
    current = provenance(ROOT, BUILD_PATH, [PHASE / "g_browser_launcher.py", DRIVER, SUPPORT, FIXTURE_GENERATOR])
    if marker.get("authorized") is not True or mode not in marker.get("authorizedModes", []):
        raise RuntimeError(f"Root marker does not authorize mode {mode}")
    for key in ("head", "sourceFingerprint", "buildStatusSha256", "distFingerprint", "qaFilesSha256"):
        if marker.get(key) != current.get(key): raise RuntimeError(f"Root release {key} does not match current frozen evidence")
    for key in ("ticketSha256", "specSha256", "releaseInputSha256"):
        if not marker.get(key): raise RuntimeError(f"Root release marker lacks required {key}")
    return marker, {"build": build, "provenance": current}


def publish_status(run_dir: Path, status: dict[str, Any]) -> None:
    publish(ROOT, run_dir / "g-browser-result.json", status, PRODUCER)


def wire_errors(page, status):
    page.on("pageerror", lambda error: status["pageErrors"].append(str(error)))
    page.on("console", lambda message: status["consoleErrors"].append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: status["requestFailures"].append({"url": request.url, "error": request.failure}))
    page.on("response", lambda response: status["httpFailures"].append({"url": response.url, "status": response.status}) if response.status >= 400 else None)


def action(log, lane, label, page, **extra):
    row = {"atUTC": now_utc(), "lane": lane, "label": label, "url": page.url, **extra}
    append_jsonl(log, row)
    return row


def snapshot(page, run_dir, name, status):
    path = run_dir / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    status.setdefault("screenshots", []).append({"path": path.name, "sha256": __import__("hashlib").sha256(path.read_bytes()).hexdigest()})


def normal_lane(page, context, log, status, deadline):
    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto(status["url"], wait_until="domcontentloaded")
    opening = page.locator("dialog.pixel-window[open]")
    expect(opening).to_have_count(1, timeout=15000)
    expect(opening).to_contain_text("在陌生的天空下")
    start = opening.get_by_role("button", name="起身")
    expect(start).to_be_enabled(timeout=15000)
    start.click()
    page.locator(".world-map").wait_for(timeout=15000)
    action(log, "NORMAL_FRESH", "click visible opening action 起身", page)
    status["lanes"]["NORMAL_FRESH"] = {"status": "IN_PROGRESS", "stateInjected": False, "debugTimeOrStateInjection": False}
    page.get_by_role("button", name="暫停").click()
    # Allow actual simulation and observe actual warning. If it does not naturally occur
    # within the focused limit, record UNREACHED and continue controlled UI cases separately.
    started = time.monotonic(); start_game_days = page.locator(".world-clock").inner_text()
    while time.monotonic() < deadline:
        if page.locator(".crisis-warning-event").count():
            warning = page.locator(".crisis-warning-event")
            expect(warning).to_contain_text("危機警訊")
            snapshot(page, RUNS / status["runId"], "normal-warning-world", status)
            action(log, "NORMAL_FRESH", "observe actual warning on world event surface", page)
            warning.click()
            dialog = page.locator("dialog.pixel-window[open]")
            expect(dialog).to_contain_text("哥布林危機")
            expect(dialog).to_contain_text("危機警訊")
            expect(dialog.locator(".crisis-needs")).to_be_visible()
            expect(dialog).not_to_contain_text("power score")
            snapshot(page, RUNS / status["runId"], "normal-warning-news", status)
            action(log, "NORMAL_FRESH", "inspect warning and needs in Life News", page)
            status["lanes"]["NORMAL_FRESH"].update({"status": "WARNING_OBSERVED", "elapsedRealSeconds": round(time.monotonic()-started, 2), "startClockText": start_game_days, "warningClockText": page.locator(".window-world-status").inner_text()})
            return
        # Keep time on through the ordinary speed control; inspect one canonical day at a time.
        page.get_by_role("button", name="×20").click()
        previous = page.locator(".world-clock").inner_text()
        page.wait_for_function("previous => document.querySelector('.world-clock')?.innerText !== previous", arg=previous, timeout=max(500, min(3000, int((deadline-time.monotonic())*1000))))
        page.get_by_role("button", name="暫停").click()
        action(log, "NORMAL_FRESH", "visible speed ×20 until canonical time checkpoint", page, previousClock=previous, currentClock=page.locator(".world-clock").inner_text())
        status["normalCheckpoints"] = status.get("normalCheckpoints", 0) + 1
        if not status.get("modalSaveReload"):
            # Open the Life News window through the visible menu and verify canonical time keeps moving.
            page.get_by_role("button", name="選單").click()
            menu = page.locator("dialog.pixel-window[open]")
            menu.get_by_role("button", name="地方消息與委託").click()
            news = page.locator("dialog.pixel-window[open]")
            before_modal = page.locator(".window-world-status").inner_text()
            page.locator(".window-world-status").get_by_role("button", name="繼續時間").click()
            page.wait_for_timeout(1200)
            after_modal = page.locator(".window-world-status").inner_text()
            action(log, "NORMAL_FRESH", "visible modal clock control continued time while Life News was open", page, before=before_modal, after=after_modal)
            if before_modal == after_modal: raise AssertionError("World clock did not advance while Life News was open")
            page.locator(".window-world-status").get_by_role("button", name="暫停時間").click()
            expect(news).to_be_visible()
            page.keyboard.press("Escape")
            expect(page.locator("dialog.pixel-window[open]")).to_have_count(0)
            status["modalClockContinuation"] = {"before": before_modal, "after": after_modal, "verified": True}
            # Save through the visible menu, reload, and require the visible world clock to persist.
            page.get_by_role("button", name="選單").click()
            save_menu = page.locator("dialog.pixel-window[open]")
            save_menu.get_by_role("button", name="儲存世界").click()
            expect(save_menu).to_contain_text("世界已儲存")
            page.keyboard.press("Escape")
            saved_clock = page.locator(".world-clock").inner_text()
            page.reload(wait_until="domcontentloaded")
            page.wait_for_selector(".world-map", timeout=15000)
            restored_clock = page.locator(".world-clock").inner_text()
            if saved_clock != restored_clock: raise AssertionError(f"Visible save/reload clock differs: {saved_clock!r} vs {restored_clock!r}")
            action(log, "NORMAL_FRESH", "visible save and full page reload preserved world clock", page, saved=saved_clock, restored=restored_clock)
            page.set_viewport_size({"width": 390, "height": 844})
            page.get_by_role("button", name="選單").click()
            narrow = page.locator("dialog.pixel-window[open]")
            narrow.get_by_role("button", name="地方消息與委託").click()
            news = page.locator("dialog.pixel-window[open]")
            if page.evaluate("document.documentElement.scrollWidth > window.innerWidth"):
                raise AssertionError("Narrow viewport has page-level horizontal overflow")
            snapshot(page, RUNS / status["runId"], "normal-narrow-life-news", status)
            action(log, "NORMAL_FRESH", "narrow viewport Life News content visible without page horizontal overflow", page, viewport={"width":390,"height":844})
            page.keyboard.press("Escape")
            page.set_viewport_size({"width":1280,"height":900})
            page.wait_for_timeout(100)
            status["modalSaveReload"] = True
        # Keep normal progression bounded by the real-time budget; reopen warning probe next iteration.
    status["lanes"]["NORMAL_FRESH"].update({"status": "UNREACHED", "elapsedRealSeconds": round(time.monotonic()-started, 2), "warningObserved": False,
        "limitation": "No natural warning reached within the focused browser budget; no controlled fixture substituted for this claim."})


def controlled_lane(page, log, status, fixture: dict[str, Any]):
    status["lanes"][fixture["lane"]] = {"status": "FIXTURE_REQUIRED", "fixtureLabel": fixture["lane"], "source": fixture.get("path"),
        "fixtureSha256": fixture.get("sha256"), "method": fixture.get("method"), "normalFreshEquivalent": False}
    storage = fixture.get("storageState")
    if not storage:
        return
    if not Path(storage).is_file(): raise RuntimeError(f"Missing released fixture storage state: {storage}")
    if __import__("hashlib").sha256(Path(storage).read_bytes()).hexdigest() != fixture.get("storageStateSha256"):
        raise RuntimeError(f"Fixture storage-state hash mismatch: {storage}")
    raise RuntimeError("Fixture execution requires separate browser context orchestration; storage state was not loaded into NORMAL_FRESH context")


def load_controlled_save(context, path: Path):
    state = json.loads(path.read_text(encoding="utf-8"))
    packed = {**state, "playJournal": {"version": 1, "worldId": "g-controlled-fixture", "pending": []}}
    # This isolated context starts empty. Guarding makes injection one-shot: Playwright
    # init scripts also run on reload, where re-injecting would erase real UI actions.
    context.add_init_script("if (!localStorage.getItem('oakvale-v1')) localStorage.setItem('oakvale-v1', " + json.dumps(json.dumps(packed, ensure_ascii=False)) + ");")
    return state


def saved_game(page):
    raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    if not raw: raise AssertionError("Expected app save in isolated browser storage")
    return json.loads(raw)


def controlled_cases(browser, run_dir, log, status, fixture_manifest):
    fixtures = fixture_manifest["fixtures"]
    base = PHASE
    # Controlled warning profile is separate from both the normal opening and the later
    # preparation/contribution profile. Verify the world event affordance and Life News.
    warning_spec=fixtures["CONTROLLED_WARNING_UI_FIXTURE"]; warning_path=base/warning_spec["path"]
    if __import__("hashlib").sha256(warning_path.read_bytes()).hexdigest()!=warning_spec["sha256"]: raise AssertionError("Controlled warning fixture hash differs from its manifest")
    warning_context=browser.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce"); load_controlled_save(warning_context,warning_path)
    warning_page=warning_context.new_page(); wire_errors(warning_page,status); warning_page.goto(status["url"],wait_until="domcontentloaded"); warning_page.locator(".world-map").wait_for(timeout=15000)
    warning=warning_page.locator(".crisis-warning-event"); expect(warning).to_be_visible(); expect(warning).to_contain_text("危機警訊"); snapshot(warning_page,run_dir,"controlled-warning-world",status)
    warning.click(); expect(warning_page.locator("dialog.pixel-window[open]")).to_contain_text("北方哥布林活動升高")
    warning_page.keyboard.press("Escape"); expect(warning_page.locator("dialog.pixel-window[open]")).to_have_count(0)
    warning_page.get_by_role("button",name="選單").click(); warning_page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
    warning_report=warning_page.locator("[data-crisis-report]"); expect(warning_report).to_be_visible(); expect(warning_report.locator("[data-need]")).to_have_count(4)
    warning_page.set_viewport_size({"width":390,"height":844})
    if warning_page.evaluate("document.documentElement.scrollWidth > window.innerWidth"): raise AssertionError("Controlled warning Life News overflows narrow viewport")
    snapshot(warning_page,run_dir,"controlled-warning-life-news-narrow",status)
    action(log,"CONTROLLED_WARNING_UI_FIXTURE","visible warning event and four needs inspected in Life News at narrow viewport",warning_page,fixturePath=warning_spec["path"])
    status["lanes"]["CONTROLLED_WARNING_UI_FIXTURE"]={"status":"PASS_WARNING_AND_NEEDS","fixturePath":warning_spec["path"],"fixtureSha256":warning_spec["sha256"],"normalFreshEquivalent":False,"keyboardEscapeVerified":True,"narrowViewportNoHorizontalOverflow":True}
    warning_context.close()
    # Preparation fixture: all actions are visible Life News controls and use a separate profile.
    spec = fixtures["CONTROLLED_UI_FIXTURE"]
    path = base / spec["path"]
    if __import__("hashlib").sha256(path.read_bytes()).hexdigest() != spec["sha256"]:
        raise AssertionError("Controlled preparation fixture hash differs from its manifest")
    context = browser.new_context(viewport={"width":1280,"height":900}, reduced_motion="reduce")
    initial = load_controlled_save(context, path)
    page = context.new_page(); wire_errors(page, status)
    page.goto(status["url"], wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
    status["lanes"]["CONTROLLED_UI_FIXTURE"] = {"status":"IN_PROGRESS", "fixturePath":spec["path"], "fixtureSha256":spec["sha256"], "normalFreshEquivalent":False}
    page.get_by_role("button", name="選單").click()
    menu=page.locator("dialog.pixel-window[open]"); menu.get_by_role("button",name="地方消息與委託").click()
    dialog=page.locator("dialog.pixel-window[open]"); report=dialog.locator("[data-crisis-report]")
    expect(report).to_be_visible(); expect(report).to_contain_text("備戰期間"); expect(report.locator("[data-need]")).to_have_count(4)
    snapshot(page,run_dir,"controlled-preparation-before",status)
    before=saved_game(page); crisis_id=before["regionalCrisis"]["id"]
    food=report.get_by_role("button",name=re.compile("支援食物")); gold=report.get_by_role("button",name=re.compile("支援後勤"))
    food_visible=bool(food.count()); gold_visible=bool(gold.count()); gear_visible=bool(report.locator(".crisis-gear-row").count())
    if food.count():
        food.click(); after_food=saved_game(page)
        if after_food["regionalCrisis"]["contributions"]["food"]["supplied"] <= before["regionalCrisis"]["contributions"]["food"]["supplied"]: raise AssertionError("Visible food contribution did not update current crisis ledger")
        action(log,"CONTROLLED_UI_FIXTURE","visible food support updated preparation ledger",page,crisisId=crisis_id)
        before=after_food
    else: status["foodContribution"]="UNAVAILABLE_IN_FIXTURE"
    if gold.count():
        gold.click(); after_gold=saved_game(page)
        if after_gold["regionalCrisis"]["contributions"]["gold"]["spent"] <= before["regionalCrisis"]["contributions"]["gold"]["spent"]: raise AssertionError("Visible logistics contribution did not update current crisis ledger")
        action(log,"CONTROLLED_UI_FIXTURE","visible logistics support updated preparation ledger",page,crisisId=crisis_id)
        before=after_gold
    else: status["goldContribution"]="UNAVAILABLE_IN_FIXTURE"
    gear_rows=report.locator(".crisis-gear-row")
    if gear_rows.count():
        gear_rows.first.get_by_role("button",name="選擇交付").click()
        confirm=report.get_by_role("group",name="確認交付裝備")
        expect(confirm).to_be_visible(); snapshot(page,run_dir,"controlled-gear-confirm",status)
        confirm.get_by_role("button",name="確認交付").click()
        after_gear=saved_game(page)
        if len(after_gear["regionalCrisis"]["contributions"]["equipment"]) != len(before["regionalCrisis"]["contributions"]["equipment"])+1: raise AssertionError("Visible gear confirmation did not create exactly one allocation")
        initial_gear_ids={item["instanceId"] for item in initial["reward"]["instances"]}
        if any(item["instanceId"] in initial_gear_ids for item in after_gear["reward"]["instances"]):
            raise AssertionError("Delivered gear remains in player inventory")
        snapshot(page,run_dir,"controlled-gear-delivered",status)
        action(log,"CONTROLLED_UI_FIXTURE","confirmed visible gear delivery updated allocation and removed item",page,crisisId=crisis_id)
    else: status["gearDelivery"]="UNAVAILABLE_IN_FIXTURE"
    # Current crisis save is automatically persisted; reload and re-check its phase/ledger.
    persisted=saved_game(page); pre_reload_raw=page.evaluate("localStorage.getItem('oakvale-v1')")
    pre_reload_sha=__import__("hashlib").sha256(pre_reload_raw.encode()).hexdigest()
    page.reload(wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
    page.get_by_role("button",name="選單").click(); page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
    reloaded=saved_game(page); post_reload_raw=page.evaluate("localStorage.getItem('oakvale-v1')")
    post_reload_sha=__import__("hashlib").sha256(post_reload_raw.encode()).hexdigest()
    ledger_matches = reloaded["regionalCrisis"]["id"] == persisted["regionalCrisis"]["id"] and reloaded["regionalCrisis"]["contributions"] == persisted["regionalCrisis"]["contributions"]
    if not ledger_matches:
        status["controlledReloadMismatch"] = {"fixturePath":spec["path"], "crisisId":crisis_id,
            "expectedPersisted":persisted["regionalCrisis"]["contributions"], "actualAfterReload":reloaded["regionalCrisis"]["contributions"],
            "expectedId":persisted["regionalCrisis"]["id"], "actualId":reloaded["regionalCrisis"]["id"],
            "storageBytes":len(post_reload_raw or ""), "preReloadSaveSha256":pre_reload_sha,
            "postReloadSaveSha256":post_reload_sha, "fixtureSha256":spec["sha256"]}
        status["lanes"]["CONTROLLED_UI_FIXTURE"]={"status":"FAIL_RELOAD_LEDGER_MISMATCH", "normalFreshEquivalent":False}
        action(log,"CONTROLLED_UI_FIXTURE","reload ledger mismatch captured; continuing independent fixtures",page,crisisId=crisis_id)
    else:
        action(log,"CONTROLLED_UI_FIXTURE","reload preserved phase and contribution ledger",page,crisisId=crisis_id,preReloadSaveSha256=pre_reload_sha,postReloadSaveSha256=post_reload_sha)
        status["lanes"]["CONTROLLED_UI_FIXTURE"].update({"status":"PASS_UI_ACTIONS", "foodVisible":food_visible,"goldVisible":gold_visible,"gearVisible":gear_visible,"reloadPreservedLedger":True})
    context.close()

    # Separate explicitly controlled forest contexts prove both visible actions and their
    # actual combat effect; these are UI-entry checks, not normal-opening progression.
    forest_spec=fixtures["CONTROLLED_FOREST_CAMP_CHIEF"]; forest_path=base/forest_spec["path"]
    if __import__("hashlib").sha256(forest_path.read_bytes()).hexdigest()!=forest_spec["sha256"]: raise AssertionError("Controlled forest fixture hash differs from its manifest")
    for action_name, button_selector, label in (("campRaid","[data-camp-raid]","CONTROLLED_FOREST_CAMP_RAID"),("chief","button","CONTROLLED_FOREST_CHIEF")):
        context=browser.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce"); load_controlled_save(context,forest_path)
        page=context.new_page(); wire_errors(page,status); page.goto(status["url"],wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
        page.locator(".world-map").press("Enter")
        if action_name=="campRaid":
            target=page.locator(button_selector); expect(target).to_be_visible(); expect(target).to_be_enabled(); target.click()
        else:
            target=page.get_by_role("button",name=re.compile("挑戰哥布林酋長")); expect(target).to_be_visible(); expect(target).to_be_enabled(); target.click()
        current=saved_game(page)
        if not current.get("combat"): raise AssertionError(f"Visible {action_name} action did not enter combat")
        action(log,label,f"visible {action_name} action opened actual combat",page,crisisPhase=current["regionalCrisis"]["phase"],combat=current["combat"])
        snapshot(page,run_dir,label.lower(),status); status["lanes"][label]={"status":"PASS_VISIBLE_ACTION_COMBAT","fixturePath":forest_spec["path"],"normalFreshEquivalent":False}
        context.close()

    for label, lane, expected in (("CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH","CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH",None),("LEGACY_UNKNOWN_FIXTURE","LEGACY_UNKNOWN_FIXTURE","較早的危機紀錄沒有結算摘要，結果未知。")):
        spec=fixtures[label]; path=base/spec["path"]
        if __import__("hashlib").sha256(path.read_bytes()).hexdigest()!=spec["sha256"]: raise AssertionError(f"Fixture hash mismatch: {label}")
        state=json.loads(path.read_text(encoding="utf-8")); context=browser.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce")
        load_controlled_save(context,path); page=context.new_page(); wire_errors(page,status)
        page.goto(status["url"],wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
        page.get_by_role("button",name="選單").click(); page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
        report=page.locator("[data-crisis-report]"); expect(report).to_be_visible()
        if expected: expect(report).to_contain_text(expected)
        else:
            actual = {"outcome":state["regionalCrisis"]["outcome"],"summary":state["regionalCrisis"]["resolutionSummary"]}
            outcome_labels={"decisive_success":"守住了橡谷","costly_success":"橡谷守住了，但付出代價","setback":"北方局勢惡化","local_defeat":"北方防線失守"}
            expect(report).to_contain_text(outcome_labels[actual["outcome"]]); expect(report).to_contain_text("目前不需要額外救援" if actual["summary"]["recovery"]["status"]=="not_required" else "救援居民")
        snapshot(page,run_dir,lane.lower()+"-before-reload",status); page.reload(wait_until="domcontentloaded"); page.locator(".world-map").wait_for(timeout=15000)
        page.get_by_role("button",name="選單").click(); page.locator("dialog.pixel-window[open]").get_by_role("button",name="地方消息與委託").click()
        report=page.locator("[data-crisis-report]")
        if expected: expect(report).to_contain_text(expected)
        else: expect(report).to_contain_text(outcome_labels[actual["outcome"]])
        action(log,lane,"visible aftermath result persisted after reload",page)
        status["lanes"][lane]={"status":"PASS_RESULT_RELOAD","fixturePath":spec["path"],"fixtureSha256":spec["sha256"],"normalFreshEquivalent":False,"legacyUnknown":bool(expected)}
        context.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--go", action="store_true")
    parser.add_argument("--mode", choices=("focused",), default="focused")
    parser.add_argument("--seconds", type=int, default=300)
    parser.add_argument("--run-id", required=False)
    parser.add_argument("--url", default=os.environ.get("PLW_V2_URL", ""))
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--execution-model", default="GPT-6 Luna")
    parser.add_argument("--execution-effort", default="low")
    args = parser.parse_args()
    if not args.go:
        print("PREPARED ONLY: require --go, Root release marker, current build, and separate controlled fixture contexts")
        return 0
    if not args.url or not args.run_id or not args.run_dir: parser.error("use the launcher-provided run id, URL, and run directory")
    if args.seconds < 30 or args.seconds > 900: parser.error("focused G mode must be 30..900 seconds")
    release, evidence = release_gate(args.mode)
    run_dir = args.run_dir.resolve()
    if not run_dir.is_dir() or any((run_dir / name).exists() for name in ("operations.jsonl", "g-browser-result.json")):
        raise RuntimeError("Launcher must provide an empty run directory")
    status: dict[str, Any] = {"status": "IN_PROGRESS", "runId": args.run_id, "mode": args.mode,
        "producer": PRODUCER, "runnerExecution": {"requestedModel": args.execution_model, "requestedEffort": args.execution_effort, "backendRuntimeVerified": False},
        "policyExecution": {"controller": "deterministic focused visible-UI runner", "modelInference": "none"},
        "releaseMarker": release, "sourceBefore": evidence["provenance"], "buildStatus": evidence["build"], "buildStatusPath": str(BUILD_PATH),
        "url": args.url, "startUTC": now_utc(), "lanes": {}, "pageErrors": [], "consoleErrors": [], "requestFailures": [], "httpFailures": [],
        "screenshots": [], "humanValidation": {"status": "DEFERRED / NOT APPLICABLE AT THIS STAGE"},
        "limitations": ["Runner-driven browser QA is not human product validation.", "Controlled UI fixtures are not normal fresh-save play.", "H–J and long browser QA are outside this focused G run."]}
    log = run_dir / "operations.jsonl"; page = context = browser = playwright = None; error = None
    try:
        status["servedAssets"] = verify_http_dist(ROOT, args.url, evidence["build"])
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        page = context.new_page(); wire_errors(page, status)
        normal_lane(page, context, log, status, time.monotonic() + args.seconds)
        status["status"] = "PASS_FOCUSED_NORMAL" if status["lanes"]["NORMAL_FRESH"]["status"] == "WARNING_OBSERVED" else "PARTIAL_NORMAL_WARNING_UNREACHED"
        fixture_manifest_path = PHASE / "g-fixture-manifest.json"
        fixture_manifest = json.loads(fixture_manifest_path.read_text(encoding="utf-8"))
        if fixture_manifest.get("status") != "PASS" or fixture_manifest.get("head") != status["sourceBefore"]["head"]:
            raise RuntimeError("Current-source controlled fixture manifest is missing or does not match the frozen HEAD")
        status["fixtureManifest"] = {"path":str(fixture_manifest_path.relative_to(ROOT)),"sha256":__import__("hashlib").sha256(fixture_manifest_path.read_bytes()).hexdigest(),"sourceFingerprint":fixture_manifest.get("sourceFingerprint")}
        controlled_cases(browser, run_dir, log, status, fixture_manifest)
        status["controlledFixturesExecuted"] = list(status["lanes"].keys())
        required_lanes=("CONTROLLED_WARNING_UI_FIXTURE","CONTROLLED_UI_FIXTURE","CONTROLLED_FOREST_CAMP_RAID","CONTROLLED_FOREST_CHIEF","CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH","LEGACY_UNKNOWN_FIXTURE")
        if all(status["lanes"].get(lane,{}).get("status","").startswith("PASS") for lane in required_lanes) and status["lanes"]["NORMAL_FRESH"].get("status")=="UNREACHED":
            status["status"]="PASS_FOCUSED_G_WITH_NATURAL_WARNING_UNREACHED"
    except BaseException as exc:
        error = exc; status["status"] = "FAILED"; status["error"] = f"{type(exc).__name__}: {exc}"; status["failureUTC"] = now_utc()
        if page is not None:
            try: snapshot(page, run_dir, "failure", status)
            except BaseException as shot_error: status["screenshotError"] = f"{type(shot_error).__name__}: {shot_error}"
    finally:
        for resource in (context, browser):
            if resource is not None:
                try: resource.close()
                except BaseException as exc: status.setdefault("cleanupErrors", []).append(str(exc))
        if playwright is not None:
            try: playwright.stop()
            except BaseException as exc: status.setdefault("cleanupErrors", []).append(str(exc))
        try:
            status["sourceAfter"] = provenance(ROOT, BUILD_PATH, [PHASE / "g_browser_launcher.py", DRIVER, SUPPORT, FIXTURE_GENERATOR])
            status["sourceStableDuringRun"] = status["sourceBefore"] == status["sourceAfter"]
            if not status["sourceStableDuringRun"]: status["status"] = "FAILED_PROVENANCE_CHANGED"
        except BaseException as exc: status["sourceAfterError"] = str(exc); status["status"] = "FAILED_PROVENANCE_CHECK"
        status["endUTC"] = now_utc(); status["durationSeconds"] = round((datetime.now(timezone.utc) - datetime.fromisoformat(status["startUTC"])).total_seconds(), 2)
        status["browserErrors"] = bool(status["pageErrors"] or status["consoleErrors"] or status["requestFailures"] or status["httpFailures"])
        if status["browserErrors"] and status["status"].startswith("PASS"): status["status"] = "FAILED_BROWSER_ERRORS"
        try: publish_status(run_dir, status)
        except BaseException as exc: status["reportPublishError"] = str(exc)
        print(json.dumps(status, ensure_ascii=False, indent=2), flush=True)
    return 0 if status["status"].startswith("PASS") and status.get("sourceStableDuringRun") else 1


if __name__ == "__main__": raise SystemExit(main())

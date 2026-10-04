#!/usr/bin/env python3
"""Cross-state QA for the immutable 738bc001 production build at localhost:5191."""
from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
sys.path.insert(0, str(REPO / "scripts"))
from recorded_reports import write_recorded  # noqa: E402

# Reuse the accepted UI navigation/save helpers from the 20261003 comprehensive run.
URL = os.environ.get("CROSS_STATE_URL", "http://127.0.0.1:5191/")
ORIGIN = URL.rstrip("/")
OUT = Path(os.environ.get("CROSS_STATE_OUTPUT", str(HERE))).resolve()
OUT.mkdir(parents=True, exist_ok=True)
os.environ["PLW_UI_URL"] = URL
sys.path.insert(0, str(REPO / "reports/playtests/20261003-comprehensive"))
import ui_helpers  # noqa: E402

SAVE_KEY = "oakvale-v1"
BASELINE_COMMIT = os.environ.get("CROSS_STATE_MANIFEST_COMMIT", "738bc0010c549fa3fb2420437d171f5aa2a043a0")
SOURCE_LABEL = os.environ.get("CROSS_STATE_SOURCE_LABEL", "738bc0010 baseline")
MANIFEST_PATH = Path(os.environ.get("CROSS_STATE_MANIFEST", str(REPO / "reports/playtests/20261004-deep-qa/baseline/manifest.json"))).resolve()
RESULT_PATH = OUT / "results.json"
ARTIFACTS = OUT / "artifacts"
RAW_DIR = OUT / "raw"
PAUSE_ON_BOOT_UI = """(() => {
  const pause = () => {
    const dialog = document.querySelector('dialog[open]');
    const button = dialog?.querySelector('.window-world-status button')
      ?? [...document.querySelectorAll('button')].find(el => el.innerText.trim() === '暫停');
    if (button && button.getAttribute('aria-pressed') !== 'true') {
      button.click(); window.__qaPauseOnBoot = { at: performance.now(), via: dialog ? 'modal-footer' : 'speed-control' }; observer.disconnect();
    }
  };
  const observer = new MutationObserver(pause);
  observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-pressed'] });
  pause();
})();"""

RUN: dict = {
    "suite": "20261004-deep-qa-cross-state",
    "baselineCommit": BASELINE_COMMIT,
    "sourceLabel": SOURCE_LABEL,
    "url": URL,
    "startedAtUtc": datetime.now(timezone.utc).isoformat(),
    "method": {
        "runtime": "fixed production assets on localhost; no HMR or source imports",
        "browser": "Playwright Chromium /usr/bin/chromium, headless, isolated disposable contexts",
        "clock": "The ×20 cases use the application's real 100 ms interval and real wall-clock waits. Exact calendar boundaries are explicit valid-save fixtures only; no Date/performance/timer fake clock is installed.",
        "normalRoute": "The dungeon party is established by Traveler Notes, movement, gathering, tavern hiring, and the rendered dungeon/combat/save controls.",
        "fixtures": [],
    },
    "cases": [],
    "checkpoints": [],
    "pageErrors": [],
    "consoleErrors": [],
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def publish() -> None:
    RUN["updatedAtUtc"] = utc_now()
    write_recorded(RESULT_PATH, json.dumps(RUN, ensure_ascii=False, indent=2) + "\n", producer="cross-state")


def checkpoint(name: str, evidence: dict, status: str = "passed") -> None:
    row = {"name": name, "status": status, "recordedAtUtc": utc_now(), "evidence": evidence}
    RUN["checkpoints"].append(row)
    publish()


def add_case(name: str, status: str, evidence: dict | None = None, error: str | None = None) -> None:
    row = {"name": name, "status": status, "finishedAtUtc": utc_now()}
    if evidence is not None:
        row["evidence"] = evidence
    if error is not None:
        row["error"] = error
    RUN["cases"].append(row)
    publish()


def raw_storage(page: Page) -> str:
    raw = page.evaluate("key => localStorage.getItem(key)", SAVE_KEY)
    if not raw:
        raise AssertionError("oakvale-v1 localStorage value is absent")
    return raw


def save_state(page: Page) -> tuple[str, dict]:
    raw = raw_storage(page)
    return raw, json.loads(raw)


def store_raw(name: str, raw: str) -> dict:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_DIR / f"{name}.raw.json"
    data = raw.encode("utf-8")
    path.write_bytes(data)
    return {"file": str(path.relative_to(OUT)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def active(state: dict) -> dict:
    return next(c for c in state["characters"] if c["id"] == state["activeCharacterId"])


def ids_and_pending(page: Page) -> tuple[list[dict], list[dict]]:
    return page.evaluate("""async () => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('oakvale-play-journal', 1);
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('records', 'readonly');
      const req = tx.objectStore('records').getAll();
      const rows = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
        tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error);
      });
      db.close();
      const raw = localStorage.getItem('oakvale-v1');
      const save = raw ? JSON.parse(raw) : null;
      return [rows, save?.playJournal?.pending ?? []];
    }""")


def archived_rows(page: Page) -> list[dict]:
    return ids_and_pending(page)[0]


def wait_pending_empty(page: Page, timeout_ms: int = 12000) -> None:
    page.wait_for_function("""key => {
      const raw = localStorage.getItem(key); if (!raw) return false;
      try { return (JSON.parse(raw).playJournal?.pending ?? []).length === 0; } catch { return false; }
    }""", arg=SAVE_KEY, timeout=timeout_ms)


def make_context_page(browser: Browser, raw: str | None = None, init_script: str | None = None) -> tuple[BrowserContext, Page]:
    options: dict = {"viewport": {"width": 1440, "height": 1000}}
    if raw is not None:
        options["storage_state"] = {"cookies": [], "origins": [{"origin": ORIGIN, "localStorage": [{"name": SAVE_KEY, "value": raw}]}]}
    context = browser.new_context(**options)
    # Use a synthetic click on the actual speed control as soon as it is rendered.
    # This prevents a fixture from crossing its target boundary before automation can
    # take control; all game-loop timers remain native and real.
    context.add_init_script(PAUSE_ON_BOOT_UI)
    if init_script:
        context.add_init_script(init_script)
    page = context.new_page()
    page.on("pageerror", lambda error: RUN["pageErrors"].append({"atUtc": utc_now(), "message": str(error), "url": page.url}))
    page.on("console", lambda message: RUN["consoleErrors"].append({"atUtc": utc_now(), "message": message.text, "url": page.url}) if message.type == "error" else None)
    page.goto(URL, wait_until="networkidle")
    page.set_default_timeout(6000)
    pause_clock(page)
    page.wait_for_timeout(120)
    return context, page


def pause_clock(page: Page) -> None:
    if page.locator("dialog[open]").count():
        pause = page.locator("dialog[open] .window-world-status button")
        if pause.count() and pause.get_attribute("aria-pressed") != "true":
            pause.click()
    else:
        pause = page.get_by_role("button", name="暫停", exact=True)
        if pause.count() and pause.get_attribute("aria-pressed") != "true":
            pause.click()


def open_menu(page: Page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(40)
    page.locator(".menu-trigger").click()
    page.locator("dialog[open]").wait_for()


def open_notes(page: Page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(30)
    page.keyboard.press("Escape")
    page.locator("dialog[open] .pixel-menu").get_by_role("button", name="旅人筆記", exact=True).click()
    page.locator("dialog[open]").wait_for()


def click_speed(page: Page, speed: int) -> None:
    if page.locator("dialog[open]").count():
        if speed == 0:
            button = page.locator("dialog[open] .window-world-status button")
            if button.count() and button.get_attribute("aria-pressed") != "true":
                button.click()
            return
        selected = page.get_by_role("button", name=f"×{speed}", exact=True)
        if selected.count() and selected.get_attribute("aria-pressed") == "true":
            return
        raise RuntimeError(f"Close the modal before selecting ×{speed}; the header speed control is behind the dialog")
    button = page.get_by_role("button", name=("暫停" if speed == 0 else f"×{speed}"), exact=True)
    if button.get_attribute("aria-pressed") != "true":
        button.click()


def wait_notes(page: Page, label: str) -> dict:
    open_notes(page)
    button = page.locator("dialog[open]").get_by_role("button", name=label, exact=True)
    if button.is_disabled():
        raise AssertionError(f"Traveler Notes action unexpectedly disabled: {label}")
    before = json.loads(raw_storage(page))
    started = time.monotonic()
    button.click()
    page.wait_for_timeout(80)
    after = json.loads(raw_storage(page))
    if after["worldTime"] <= before["worldTime"]:
        raise AssertionError(f"Traveler Notes action did not advance time: {label}")
    checkpoint(f"ui-time-{label}", {"control": label, "from": before["worldTime"], "to": after["worldTime"], "elapsedSeconds": round(time.monotonic() - started, 3), "partyCount": len(after.get("party", [])), "gold": active(after)["gold"]})
    return after


def take_screenshot(page: Page, name: str) -> str:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    path = ARTIFACTS / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    return str(path.relative_to(OUT))


def idb_instrumentation(delay_ms: int) -> str:
    return f"""(() => {{
      const trace = window.__qaIdbTrace = [];
      const wrap = (name, delay) => {{
        const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, name);
        Object.defineProperty(IDBTransaction.prototype, name, {{
          configurable: true, enumerable: descriptor.enumerable,
          get() {{ return descriptor.get.call(this); }},
          set(handler) {{
            if (typeof handler !== 'function') {{ descriptor.set.call(this, handler); return; }}
            const tx = this;
            descriptor.set.call(this, function(event) {{
              const row = {{ event: name, mode: tx.mode, objectStore: Array.from(tx.objectStoreNames),
                nativeHandlerAt: new Date().toISOString(), delayMs: delay, errorName: tx.error?.name ?? null,
                errorMessage: tx.error?.message ?? null }};
              trace.push(row);
              if (delay) setTimeout(() => {{ row.applicationHandlerAt = new Date().toISOString(); handler.call(tx, event); }}, delay);
              else {{ row.applicationHandlerAt = row.nativeHandlerAt; handler.call(tx, event); }}
            }});
          }}
        }});
      }};
      wrap('oncomplete', {delay_ms});
      wrap('onabort', 0);
    }})();"""


def raw_from_state(state: dict, last_saved_at: int | None = None) -> str:
    result = copy.deepcopy(state)
    result["lastSavedAt"] = int(time.time() * 1000) + 60_000 if last_saved_at is None else int(last_saved_at)
    return json.dumps(result, ensure_ascii=False, separators=(",", ":"))


def source_hash_report(manifest: dict) -> dict:
    files: dict = {}
    for relative, expected in manifest["sourceHashes"].items():
        path = REPO / relative
        actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        files[relative] = {"manifestSha256": expected, "checkoutSha256": actual, "match": actual == expected}
    return files


def verify_fixed_build(page: Page, manifest: dict) -> dict:
    response = page.request.get(URL)
    if response.status != 200:
        raise AssertionError(f"Fixed production server returned HTTP {response.status}")
    html = response.body().decode("utf-8")
    expected = manifest["buildHashes"]
    fetched: dict = {"index.html": {"sha256": hashlib.sha256(response.body()).hexdigest(), "status": response.status}}
    for name in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html):
        item = page.request.get(ORIGIN + name)
        body = item.body()
        relative = name.lstrip("/")
        fetched[relative] = {"sha256": hashlib.sha256(body).hexdigest(), "status": item.status}
        if item.status != 200:
            raise AssertionError(f"Fixed asset returned HTTP {item.status}: {name}")
    mismatches = {name: {"expected": expected.get(name), "actual": row["sha256"]}
                  for name, row in fetched.items() if expected.get(name) != row["sha256"]}
    if mismatches:
        raise AssertionError({"fixed_build_asset_mismatch": mismatches})
    return {"sourceCommit": manifest["sourceCommit"], "manifestSha256": hashlib.sha256(MANIFEST_PATH.read_bytes()).hexdigest(),
            "httpStatus": response.status, "assets": fetched, "checkoutSourceHashes": source_hash_report(manifest)}


def case_01_baseline(browser: Browser, manifest: dict) -> tuple[str, dict]:
    context, page = make_context_page(browser)
    try:
        build = verify_fixed_build(page, manifest)
        page.locator(".save-button").click()
        wait_pending_empty(page)
        raw, state = save_state(page)
        rows, pending = ids_and_pending(page)
        if pending:
            raise AssertionError({"initial_pending_records": len(pending)})
        ids = [row["id"] for row in rows]
        if len(ids) != len(set(ids)):
            raise AssertionError("Initial IndexedDB archive has duplicate IDs")
        screenshot = take_screenshot(page, "normal-ui-start")
        raw_file = store_raw("normal-ui-start", raw)
        evidence = {"sourceLabel": SOURCE_LABEL, "baseline": build, "browser": {"name": "Chromium", "executable": "/usr/bin/chromium", "version": page.context.browser.version if page.context.browser else None,
                     "headless": True}, "initialWorld": {"worldTime": state["worldTime"], "activeCharacter": active(state)["id"], "settlementStage": state["settlement"]["stage"], "party": state["party"],
                     "pendingCount": len(state["playJournal"]["pending"]), "archiveRecordCount": len(rows), "archiveIds": ids},
                   "raw": raw_file, "screenshot": screenshot}
        checkpoint("fixed-production-baseline-and-normal-ui-seed", evidence)
        return raw, evidence
    finally:
        context.close()


def case_02_x20_modal(browser: Browser, seed_raw: str) -> None:
    context, page = make_context_page(browser, seed_raw)
    try:
        click_speed(page, 20)
        page.locator(".menu-trigger").click()
        page.locator("dialog[open]").wait_for()
        dialog = page.locator("dialog[open]")
        before = json.loads(raw_storage(page))
        start_mono = time.monotonic()
        page.wait_for_timeout(2200)
        elapsed = time.monotonic() - start_mono
        after = json.loads(raw_storage(page))
        focus: list[dict] = []
        for _ in range(16):
            page.keyboard.press("Tab")
            focus.append(page.evaluate("""() => ({insideDialog: !!document.activeElement?.closest('dialog[open]'),
              tag: document.activeElement?.tagName ?? null, label: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.innerText?.trim()?.slice(0,80) ?? null,
              disabled: !!document.activeElement?.disabled})"""))
        delta = after["worldTime"] - before["worldTime"]
        expected = elapsed * 2 * 20
        if delta < 50 or delta > 120 or abs(delta - expected) > 30:
            raise AssertionError({"worldTimeDelta": delta, "elapsedSeconds": elapsed, "expectedApproxGameMinutes": expected})
        if page.locator("dialog[open]").count() != 1 or not all(row["insideDialog"] and not row["disabled"] for row in focus):
            raise AssertionError({"dialogCount": page.locator("dialog[open]").count(), "focus": focus})
        screenshot = take_screenshot(page, "x20-modal-background-time")
        click_speed(page, 0)
        raw_before = store_raw("x20-modal-before", raw_from_state(before, int(before["lastSavedAt"])))
        raw_after = store_raw("x20-modal-after", raw_storage(page))
        checkpoint("x20-real-timer-modal-background-and-focus", {"fixture": "normal save; no clock fixture", "speed": 20, "elapsedRealSeconds": round(elapsed, 3),
            "worldTimeBefore": before["worldTime"], "worldTimeAfter": after["worldTime"], "worldMinutesDelta": delta, "expectedFromElapsed": round(expected, 1),
            "modalStayedOpen": True, "focusStayedInsideEnabledDialogControls": True, "focusSamples": focus, "rawBefore": raw_before, "rawAfter": raw_after, "screenshot": screenshot})
    finally:
        context.close()


def boundary_fixture(seed_state: dict, world_time: int) -> tuple[str, dict]:
    state = copy.deepcopy(seed_state)
    state["worldTime"] = world_time
    fixture = {"kind": "valid-save-exact-calendar-boundary", "changedFields": ["worldTime", "lastSavedAt"], "worldTime": world_time,
               "lastSavedAt": "future timestamp to prevent offline-progress on load", "source": "generated normal UI save from this harness"}
    return raw_from_state(state), fixture


def run_boundary_case(browser: Browser, seed_state: dict, name: str, world_time: int, cross_year: bool) -> None:
    raw, fixture = boundary_fixture(seed_state, world_time)
    RUN["method"]["fixtures"].append(fixture)
    context, page = make_context_page(browser, raw)
    try:
        if page.locator(".save-warning").count():
            raise AssertionError(page.locator(".save-warning").inner_text())
        accepted_raw = raw_storage(page)
        accepted = json.loads(accepted_raw)
        if accepted["worldTime"] != world_time:
            raise AssertionError({"fixtureWorldTime": world_time, "loadedWorldTime": accepted["worldTime"]})
        click_speed(page, 20)
        started = time.monotonic()
        page.wait_for_timeout(1300)
        elapsed = time.monotonic() - started
        click_speed(page, 0)
        page.locator(".save-button").click()
        wait_pending_empty(page)
        after_raw = raw_storage(page)
        after = json.loads(after_raw)
        rows, pending = ids_and_pending(page)
        before_calendar = {"year": (world_time // 1440) // 120 + 1, "dayIndex": world_time // 1440}
        after_year = after["worldTime"] // 1440 // 120 + 1
        delta = after["worldTime"] - world_time
        if delta < 25 or delta > 100:
            raise AssertionError({"realElapsedSeconds": elapsed, "worldTimeDelta": delta})
        day_crossed = after["worldTime"] // 1440 > world_time // 1440
        if not day_crossed:
            raise AssertionError("x20 live timer failed to cross the seeded day boundary")
        if after_year != before_calendar["year"] + (1 if cross_year else 0):
            raise AssertionError({"yearBefore": before_calendar["year"], "yearAfter": after_year, "crossYear": cross_year})
        new_year_events = [e for e in after["history"] if e["type"] == "world.newYear" and e["at"] >= world_time]
        if cross_year and (not new_year_events or active(after)["age"] != active(accepted)["age"] + 1):
            raise AssertionError({"newYearEvents": new_year_events, "playerAgeBefore": active(accepted)["age"], "playerAgeAfter": active(after)["age"]})
        ui_clock = page.locator(".world-clock").inner_text()
        screenshot = take_screenshot(page, f"{name}-boundary")
        before_file = store_raw(f"{name}-before", accepted_raw)
        after_file = store_raw(f"{name}-after", after_raw)
        if pending:
            raise AssertionError({"pendingAfterSave": len(pending)})
        checkpoint(f"x20-real-timer-{name}", {"fixture": fixture, "loadedWithoutWarning": True, "speed": 20, "elapsedRealSeconds": round(elapsed, 3),
            "worldTimeBefore": world_time, "worldTimeAfter": after["worldTime"], "worldMinutesDelta": delta, "crossedDay": day_crossed, "yearBefore": before_calendar["year"],
            "yearAfter": after_year, "newYearHistoryEvents": new_year_events, "activeAgeBefore": active(accepted)["age"], "activeAgeAfter": active(after)["age"],
            "uiClockAfter": ui_clock, "journalPendingAfterAck": len(pending), "archiveRecordCount": len(rows), "rawBefore": before_file, "rawAfter": after_file, "screenshot": screenshot})
    finally:
        context.close()


def case_03_day_boundary(browser: Browser, seed_state: dict) -> None:
    run_boundary_case(browser, seed_state, "day", 8 * 1440 + 1438, False)


def case_04_year_boundary(browser: Browser, seed_state: dict) -> None:
    run_boundary_case(browser, seed_state, "year", 120 * 1440 - 2, True)


def case_05_ack_race(browser: Browser) -> None:
    delay = 1800
    context, page = make_context_page(browser, init_script=idb_instrumentation(delay))
    try:
        wait_pending_empty(page, 15000)
        before, before_state = save_state(page)
        original_rows, _ = ids_and_pending(page)
        id_before = {row["id"] for row in original_rows}
        click_speed(page, 0)
        actions: list[dict] = []
        for key in ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]:
            before_action, state_before = save_state(page)
            page.keyboard.press(key)
            page.wait_for_timeout(55)
            after_action, state_after = save_state(page)
            pending = state_after["playJournal"]["pending"]
            if not pending:
                raise AssertionError({"action": key, "pendingRecords": 0})
            actions.append({"key": key, "worldTimeBefore": state_before["worldTime"], "worldTimeAfter": state_after["worldTime"],
                            "pendingIds": [record["id"] for record in pending], "rawBefore": store_raw(f"ack-action-{len(actions)+1}-before", before_action),
                            "rawAfter": store_raw(f"ack-action-{len(actions)+1}-after", after_action)})
            if len({r["id"] for r in pending}) != len(pending):
                raise AssertionError({"duplicatePendingIds": pending})
        expected_ids = set().union(*(set(row["pendingIds"]) for row in actions))
        page.wait_for_timeout(delay * 2 + 300)
        wait_pending_empty(page, 12000)
        final_raw, final_state = save_state(page)
        final_rows, final_pending = ids_and_pending(page)
        final_ids = [row["id"] for row in final_rows]
        trace = page.evaluate("window.__qaIdbTrace ?? []")
        added_ids = set(final_ids) - id_before
        if final_pending or expected_ids - set(final_ids) or len(final_ids) != len(set(final_ids)):
            evidence = {"expectedPendingIds": sorted(expected_ids), "archiveIds": final_ids, "pending": final_pending,
                        "addedIds": sorted(added_ids), "trace": trace}
            checkpoint("ack-race-loss-or-duplicate-evidence", {**evidence, "initialRaw": store_raw("ack-race-before", before), "finalRaw": store_raw("ack-race-after", final_raw)}, "failed")
            raise AssertionError(evidence)
        if any(row.get("delayMs") != delay for row in trace if row.get("event") == "oncomplete" and row.get("mode") == "readwrite"):
            raise AssertionError({"unexpectedOncompleteTrace": trace})
        if not any(row.get("event") == "oncomplete" and row.get("mode") == "readwrite" and row.get("delayMs") == delay
                   and row.get("applicationHandlerAt") for row in trace):
            raise AssertionError({"delayedAckNotObserved": trace})
        checkpoint("indexeddb-delayed-ack-queue-race", {"controlled": "Only IDBTransaction.oncomplete application callback delivery was delayed; native transaction operations and onabort were not suppressed.",
            "ackDelayMs": delay, "actionsWhileAckInFlight": actions, "expectedRecordIds": sorted(expected_ids), "archivedAddedIds": sorted(added_ids),
            "pendingAfterAllAcks": len(final_pending), "archiveRecordCountBefore": len(original_rows), "archiveRecordCountAfter": len(final_rows),
            "archiveIdsUnique": len(final_ids) == len(set(final_ids)), "transactionTrace": trace,
            "rawBefore": store_raw("ack-race-before", before), "rawAfter": store_raw("ack-race-after", final_raw)})
    finally:
        context.close()


def fixture_conflicting_archive(page: Page, record: dict) -> dict:
    return page.evaluate("""async row => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('oakvale-play-journal', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('records', 'readwrite');
      tx.objectStore('records').add(row);
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
      db.close(); return true;
    }""", record)


def case_06_abort_rollback(browser: Browser, seed_raw: str) -> None:
    base_state = json.loads(seed_raw)
    original = {"id": "qa-controlled-rollback-1", "worldId": base_state["playJournal"]["worldId"], "at": 1000, "kind": "action", "from": 480, "to": 485,
                "characterId": base_state["activeCharacterId"], "message": "existing archived value", "events": []}
    pending_record = {**original, "message": "different pending value"}
    fixture = copy.deepcopy(base_state)
    fixture["playJournal"]["pending"] = [pending_record]
    raw_fixture = raw_from_state(fixture)
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    context.add_init_script(PAUSE_ON_BOOT_UI)
    context.add_init_script(idb_instrumentation(0))
    page = context.new_page()
    page.on("pageerror", lambda error: RUN["pageErrors"].append({"atUtc": utc_now(), "message": str(error), "url": page.url}))
    try:
        # Seed IndexedDB while serving an inert same-origin document. This avoids the
        # app's pagehide save replacing the pending fixture during a reload.
        def inert_document(route) -> None:
            route.fulfill(status=200, content_type="text/html", body="<!doctype html><html><body></body></html>")
        page.route(URL, inert_document)
        page.goto(URL, wait_until="load")
        page.evaluate("""async ([key, raw, row]) => {
          const req = indexedDB.open('oakvale-play-journal', 1);
          req.onupgradeneeded = () => {
            const store = req.result.createObjectStore('records', { keyPath: 'ordinal', autoIncrement: true });
            store.createIndex('id', 'id', { unique: true });
          };
          const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
          const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').add(row);
          await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
          localStorage.setItem(key, raw); db.close();
        }""", [SAVE_KEY, raw_fixture, original])
        page.unroute(URL, inert_document)
        page.goto(URL, wait_until="networkidle")
        page.set_default_timeout(6000)
        pause_clock(page)
        before_raw = raw_storage(page)
        before_rows = archived_rows(page)
        page.wait_for_function("() => !!document.querySelector('[role=alert]')?.innerText.includes('待補寫')", timeout=8000)
        after_raw = raw_storage(page)
        after_rows, pending = ids_and_pending(page)
        page.locator(".save-button").click()
        page.wait_for_timeout(150)
        retry_raw = raw_storage(page)
        retry_rows, retry_pending = ids_and_pending(page)
        trace = page.evaluate("window.__qaIdbTrace ?? []")
        aborts = [row for row in trace if row.get("event") == "onabort" and row.get("mode") == "readwrite"]
        content_fields = ["id", "worldId", "at", "kind", "from", "to", "characterId", "message", "events"]
        before_summary = [{key: row.get(key) for key in content_fields} for row in before_rows]
        after_summary = [{key: row.get(key) for key in content_fields} for row in retry_rows]
        if not pending or not retry_pending or retry_pending[0]["message"] != pending_record["message"] or not aborts or before_summary != after_summary:
            evidence = {"pendingAfterRetry": retry_pending, "abortEvents": aborts, "archiveBefore": before_summary, "archiveAfter": after_summary,
                        "rawBefore": store_raw("rollback-before", before_raw), "rawAfterAbort": store_raw("rollback-after-abort", after_raw),
                        "rawAfterRetry": store_raw("rollback-after-retry", retry_raw)}
            checkpoint("indexeddb-abort-rollback-integrity", evidence, "failed")
            raise AssertionError(evidence)
        checkpoint("indexeddb-abort-rollback-integrity", {"fixture": "one existing unique-ID record conflicts with a pending record's content; this is an intentional failure case",
            "transactionAbortObserved": True, "abortCount": len(aborts), "pendingPreservedAfterAbortAndRetry": len(retry_pending) == 1,
            "pendingCountImmediatelyAfterAbort": len(pending), "archiveBefore": before_summary, "archiveAfter": after_summary,
            "archiveContentUnchanged": before_summary == after_summary, "rawFixture": store_raw("rollback-conflict-fixture", raw_fixture),
            "rawBefore": store_raw("rollback-before", before_raw), "rawAfterAbort": store_raw("rollback-after-abort", after_raw),
            "rawAfterRetry": store_raw("rollback-after-retry", retry_raw), "journalErrorVisible": page.locator("[role=alert]").count() > 0,
            "transactionTrace": trace})
    finally:
        context.close()


def dead_fixture(seed_state: dict) -> tuple[str, dict]:
    state = copy.deepcopy(seed_state)
    character = active(state)
    character.update({"isAlive": False, "hp": 0, "status": "dead", "deathYear": (state["worldTime"] // 1440) // 120 + 1,
                     "deathCause": "controlled QA successor-modal fixture"})
    state["combat"] = None
    state["dungeon"]["inDungeon"] = False
    state["party"] = []
    return raw_from_state(state), {"kind": "valid-save-controlled-death", "changedFields": ["activeCharacter.isAlive", "hp", "status", "deathYear", "deathCause", "combat", "dungeon.inDungeon", "party"],
                                  "purpose": "death/successor modal and disabled movement focus only"}


def combat_fixture(seed_state: dict) -> tuple[str, dict]:
    state = copy.deepcopy(seed_state)
    character = active(state)
    character.update({"status": "combat"})
    character["inventory"]["potion"] = 0
    state["combat"] = {"monsterId": "slime", "hp": 18, "maxHp": 18, "attack": 5, "defense": 0, "exp": 15, "gold": 8, "elite": False, "dungeon": False}
    state["dungeon"]["inDungeon"] = False
    return raw_from_state(state), {"kind": "valid-save-controlled-combat", "changedFields": ["activeCharacter.status", "activeCharacter.inventory.potion", "combat"],
                                   "purpose": "dialog focus, disabled actions and movement lock only; battle mechanics exercised separately through public combat controls"}


def tab_focus_samples(page: Page, count: int = 16) -> list[dict]:
    rows: list[dict] = []
    for _ in range(count):
        page.keyboard.press("Tab")
        rows.append(page.evaluate("""() => ({insideDialog: !!document.activeElement?.closest('dialog[open]'),
          disabled: !!document.activeElement?.disabled, tag: document.activeElement?.tagName ?? null,
          label: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.innerText?.trim()?.slice(0,80) ?? null})"""))
    return rows


def case_07_modal_target_and_death(browser: Browser, seed_state: dict) -> None:
    raw, fixture = combat_fixture(seed_state)
    RUN["method"]["fixtures"].append(fixture)
    context, page = make_context_page(browser, raw)
    try:
        if page.locator(".save-warning").count():
            raise AssertionError(page.locator(".save-warning").inner_text())
        dialog = page.locator("dialog[open]")
        dialog.get_by_role("heading", name=re.compile("史萊姆")).wait_for()
        potion = dialog.get_by_role("button", name="使用藥水", exact=True)
        if not potion.is_disabled():
            raise AssertionError("No-potion combat fixture did not disable Potion")
        map_disabled = page.locator(".world-map:not(.overview-map) button.tile:not([disabled])").count() == 0
        move_buttons_disabled = all(page.get_by_role("button", name=name, exact=True).is_disabled() for name in ["往上", "往下", "往左", "往右"])
        focus = tab_focus_samples(page)
        if not map_disabled or not move_buttons_disabled or not all(row["insideDialog"] and not row["disabled"] for row in focus):
            raise AssertionError({"mapDisabled": map_disabled, "directionDisabled": move_buttons_disabled, "focus": focus})
        page.keyboard.press("Escape")
        page.wait_for_timeout(35)
        click_speed(page, 20)
        page.locator(".context-action").click()
        page.locator("dialog[open] .battle-scene").wait_for()
        before = json.loads(raw_storage(page))
        started = time.monotonic()
        page.wait_for_timeout(1100)
        after = json.loads(raw_storage(page))
        elapsed = time.monotonic() - started
        combat_unchanged = before["combat"] == after["combat"]
        if after["worldTime"] - before["worldTime"] < 30 or not combat_unchanged:
            raise AssertionError({"worldTimeDelta": after["worldTime"] - before["worldTime"], "combatUnchanged": combat_unchanged})
        screenshot = take_screenshot(page, "combat-modal-x20-disabled-focus")
        click_speed(page, 0)
        checkpoint("combat-modal-disabled-target-focus-and-x20", {"fixture": fixture, "battleDialog": True, "potionDisabled": True, "mapActionsDisabled": map_disabled,
            "directionActionsDisabled": move_buttons_disabled, "focusTrapSkippedDisabledControls": True, "focusSamples": focus, "speed": 20,
            "elapsedRealSeconds": round(elapsed, 3), "worldTimeDelta": after["worldTime"] - before["worldTime"], "combatStateUnchanged": combat_unchanged,
            "screenshot": screenshot})
    finally:
        context.close()

    raw, fixture = dead_fixture(seed_state)
    RUN["method"]["fixtures"].append(fixture)
    context, page = make_context_page(browser, raw)
    try:
        page.get_by_role("heading", name="旅程結束，世界繼續").wait_for()
        before = json.loads(raw_storage(page))
        live_successors = [n for n in before["npcs"] if n["isAlive"] and n["age"] >= 15]
        buttons = page.locator("dialog[open] .successor-list button")
        if buttons.count() != len(live_successors) or page.locator("dialog[open] .window-close").count():
            raise AssertionError({"successorButtons": buttons.count(), "eligibleSuccessors": len(live_successors), "dismissButton": page.locator("dialog[open] .window-close").count()})
        map_disabled = page.locator(".world-map:not(.overview-map) button.tile:not([disabled])").count() == 0
        # The successor modal intentionally cannot be dismissed; exercise its actual
        # resumed ×1 loop via the modal footer instead of bypassing the native dialog.
        resume = page.locator("dialog[open] .window-world-status button")
        if resume.get_attribute("aria-pressed") != "false":
            resume.click()
        started = time.monotonic()
        page.wait_for_timeout(1400)
        after = json.loads(raw_storage(page))
        elapsed = time.monotonic() - started
        if after["worldTime"] - before["worldTime"] < 1 or page.locator("dialog[open] .successor-list").count() != 1 or not map_disabled:
            raise AssertionError({"worldTimeDelta": after["worldTime"] - before["worldTime"], "successorDialogStillOpen": page.locator("dialog[open] .successor-list").count(), "mapDisabled": map_disabled})
        resume = page.locator("dialog[open] .window-world-status button")
        if resume.get_attribute("aria-pressed") != "true":
            resume.click()
        screenshot = take_screenshot(page, "dead-successor-modal-background-time")
        checkpoint("dead-character-successor-modal-and-world-continues", {"fixture": fixture, "successorCount": len(live_successors), "nonDismissible": True,
            "movementTargetsDisabled": map_disabled, "speed": 1, "elapsedRealSeconds": round(elapsed, 3), "worldTimeDelta": after["worldTime"]-before["worldTime"],
            "successorModalStayedOpen": True, "screenshot": screenshot})
    finally:
        context.close()


def click_travel(page: Page, label: str | None = None, position: str | None = None) -> None:
    ui_helpers.travel(page, label=label, position=position)
    page.wait_for_timeout(40)


def interact(page: Page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(25)
    page.locator(".context-action").click()
    page.locator("dialog[open]").wait_for()


def public_gather(page: Page, count: int) -> dict:
    click_travel(page, label="森林")
    interact(page)
    actions = page.locator("dialog[open]").get_by_role("button", name=re.compile("伐木"))
    if actions.count() != 1 or actions.is_disabled():
        raise AssertionError({"woodcutButtonCount": actions.count(), "disabled": actions.first.is_disabled() if actions.count() else None})
    completed = 0
    for _ in range(count):
        if actions.is_disabled():
            break
        actions.click()
        completed += 1
        page.wait_for_timeout(15)
    page.keyboard.press("Escape")
    page.wait_for_timeout(30)
    raw, state = save_state(page)
    result = {"requested": count, "completed": completed, "gold": active(state)["gold"], "stamina": active(state)["stamina"],
              "wood": active(state)["inventory"]["wood"], "worldTime": state["worldTime"], "raw": store_raw("public-gather", raw)}
    checkpoint("public-ui-forest-gathering", result)
    if completed != count:
        raise AssertionError(result)
    return result


def rest_normal(page: Page, count: int) -> dict:
    click_travel(page, position="7,9")
    interact(page)
    button = page.locator("dialog[open]").get_by_role("button", name="休息 · 1 小時", exact=True)
    done = 0
    for _ in range(count):
        if button.is_disabled():
            break
        button.click()
        done += 1
        page.wait_for_timeout(20)
    page.keyboard.press("Escape")
    raw, state = save_state(page)
    evidence = {"requestedHours": count, "completedHours": done, "stamina": active(state)["stamina"], "hp": active(state)["hp"], "worldTime": state["worldTime"],
                "raw": store_raw("public-rest", raw)}
    checkpoint("public-ui-rest-before-adventure", evidence)
    return evidence


def speed20_to_hour(page: Page, hour: int) -> dict:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(30)
    text = page.locator(".world-clock").inner_text()
    match = re.search(r"(\d{1,2}):(\d{2})", text)
    if not match:
        raise AssertionError({"clock": text})
    current = int(match.group(1)) * 60 + int(match.group(2))
    target = hour * 60
    delta = (target - current) % 1440
    if delta:
        click_speed(page, 20)
        start = time.monotonic()
        page.wait_for_timeout(max(200, int(delta / 40 * 1000) + 240))
        click_speed(page, 0)
        result = {"fromMinuteOfDay": current, "requestedMinuteOfDay": target, "uiClockAfter": page.locator(".world-clock").inner_text(),
                  "realElapsedSeconds": round(time.monotonic() - start, 3), "gameMinutesRequested": delta, "speed": 20}
    else:
        result = {"fromMinuteOfDay": current, "requestedMinuteOfDay": target, "uiClockAfter": text, "realElapsedSeconds": 0, "gameMinutesRequested": 0, "speed": 20}
    checkpoint(f"party-route-real-clock-to-{hour:02d}00", result)
    return result


def hire_two(page: Page) -> dict:
    # Use the rendered overview map's actual tavern position, then the regular interaction.
    click_travel(page, position="11,11")
    interact(page)
    candidates = page.locator("dialog[open] .mercenary")
    if candidates.count() < 2:
        raise AssertionError({"mercenaryCandidates": candidates.count(), "panel": page.locator("dialog[open]").inner_text()})
    hired: list[str] = []
    for _ in range(2):
        enabled = page.locator("dialog[open] .mercenary button:not([disabled])")
        if enabled.count() < 1:
            raise AssertionError({"hired": hired, "panel": page.locator("dialog[open]").inner_text()})
        before_gold = json.loads(raw_storage(page))["characters"][0]["gold"]
        enabled.first.click()
        page.wait_for_timeout(40)
        after = json.loads(raw_storage(page))
        hired.append(after["party"][-1]["npcId"])
        if after["characters"][0]["gold"] >= before_gold:
            raise AssertionError({"goldBefore": before_gold, "goldAfter": after["characters"][0]["gold"]})
    page.keyboard.press("Escape")
    raw, state = save_state(page)
    party = state["party"]
    roles = {row["archetype"] for row in party}
    if len(party) != 2 or roles != {"fighter", "healer"} or any(row["dailyWage"] != 4 for row in party):
        raise AssertionError({"party": party, "roles": roles})
    evidence = {"hiredNpcIds": hired, "party": party, "roles": sorted(roles), "gold": active(state)["gold"], "worldTime": state["worldTime"],
                "contractEnd": [p["contractEnd"] for p in party], "raw": store_raw("party-public-ui-hired", raw), "uiRoster": page.locator(".party-strip").inner_text()}
    checkpoint("public-ui-hired-fighter-and-healer", evidence)
    return {"raw": raw, "state": state, "evidence": evidence}


def reload_page_and_compare(page: Page, before_state: dict, label: str) -> dict:
    before_raw = raw_storage(page)
    before_archive = archived_rows(page)
    page.reload(wait_until="networkidle")
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(25)
    pause_clock(page)
    page.wait_for_timeout(60)
    wait_pending_empty(page)
    after_raw, after_state = save_state(page)
    after_archive, pending = ids_and_pending(page)
    selected = ["party", "dungeon", "combat"]
    equal = {key: before_state.get(key) == after_state.get(key) for key in selected}
    if before_state.get("combat"):
        equal["combat"] = before_state["combat"] == after_state["combat"]
    if not all(equal.values()):
        raise AssertionError({"roundtrip": equal, "beforeTime": before_state["worldTime"], "afterTime": after_state["worldTime"]})
    before_ids = [row["id"] for row in before_archive]
    after_ids = [row["id"] for row in after_archive]
    if len(after_ids) != len(set(after_ids)) or not set(before_ids).issubset(set(after_ids)):
        raise AssertionError({"archiveIdsBefore": before_ids, "archiveIdsAfter": after_ids})
    evidence = {"case": label, "samePartyDungeonCombat": equal, "worldTimeBefore": before_state["worldTime"], "worldTimeAfterReload": after_state["worldTime"],
                "archiveIdsBefore": before_ids, "archiveIdsAfter": after_ids, "archiveIdsUnique": len(after_ids) == len(set(after_ids)), "pendingAfterReload": len(pending),
                "rawBefore": store_raw(f"{label}-before-reload", before_raw), "rawAfter": store_raw(f"{label}-after-reload", after_raw)}
    checkpoint(f"save-reload-{label}", evidence)
    return after_state


def run_battle(page: Page, stage_name: str, save_reload: bool = False) -> dict:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(25)
    page.locator(".context-action").click()
    page.locator("dialog[open] .dungeon-scene").wait_for()
    explore = page.locator("dialog[open]").get_by_role("button", name=re.compile("探索下一段"))
    if explore.is_disabled():
        raise AssertionError({"stage": stage_name, "buttonDisabled": True, "body": page.locator("dialog[open]").inner_text()})
    explore.click()
    page.locator("dialog[open] .battle-scene").wait_for()
    start_raw, start_state = save_state(page)
    start_file = store_raw(f"{stage_name}-battle-start", start_raw)
    screenshot_start = take_screenshot(page, f"{stage_name}-battle-start")
    if save_reload:
        page.get_by_role("button", name="防禦", exact=True).click()
        before_defend = json.loads(raw_storage(page))
        page.keyboard.press("Escape")
        page.locator(".save-button").click()
        save_raw, save_state_obj = save_state(page)
        if not save_state_obj.get("combat"):
            raise AssertionError("UI Save omitted active combat state")
        screenshot_saved = take_screenshot(page, f"{stage_name}-combat-saved")
        loaded = reload_page_and_compare(page, save_state_obj, f"{stage_name}-combat")
        if loaded["combat"] != save_state_obj["combat"] or loaded["dungeon"]["stage"] != save_state_obj["dungeon"]["stage"]:
            raise AssertionError({"savedCombat": save_state_obj["combat"], "loadedCombat": loaded["combat"], "savedStage": save_state_obj["dungeon"]["stage"], "loadedStage": loaded["dungeon"]["stage"]})
        if page.locator("dialog[open] .battle-scene").count() == 0:
            page.locator(".context-action").click()
            page.locator("dialog[open] .battle-scene").wait_for()
        save_evidence = {"preReloadRaw": store_raw(f"{stage_name}-combat-before-reload", save_raw), "afterDefendWorldTime": before_defend["worldTime"],
                         "combat": save_state_obj["combat"], "stage": save_state_obj["dungeon"]["stage"], "screenshot": screenshot_saved}
    else:
        save_evidence = None
    turns: list[dict] = []
    current = json.loads(raw_storage(page))
    cap = 28
    while current.get("combat") and len(turns) < cap:
        character = active(current)
        if character["hp"] < character["maxHp"] * 0.30 and character["inventory"]["potion"]:
            command = "使用藥水"
        elif character["hp"] < character["maxHp"] * 0.30:
            command = "防禦"
        else:
            command = "攻擊"
        button = page.get_by_role("button", name=command, exact=True)
        if button.is_disabled():
            raise AssertionError({"stage": stage_name, "disabledCommand": command, "state": current})
        enemy_before = current["combat"]["hp"]
        hp_before = character["hp"]
        button.click()
        page.wait_for_timeout(35)
        current = json.loads(raw_storage(page))
        turns.append({"turn": len(turns) + 1, "command": command, "enemyHpBefore": enemy_before, "enemyHpAfter": current.get("combat").get("hp") if current.get("combat") else None,
                      "playerHpBefore": hp_before, "playerHpAfter": active(current)["hp"], "worldTime": current["worldTime"]})
    if current.get("combat"):
        raise AssertionError({"stage": stage_name, "turnCap": cap, "combat": current["combat"], "hp": active(current)["hp"], "turns": turns})
    result = {"stageName": stage_name, "enemy": start_state.get("combat", {}).get("monsterId"), "turnCount": len(turns), "turns": turns,
              "combatSaveReload": save_evidence, "battleStartRaw": start_file, "battleStartScreenshot": screenshot_start,
              "worldTimeAfter": current["worldTime"], "playerHpAfter": active(current)["hp"], "partyAfter": current["party"], "dungeonAfter": current["dungeon"],
              "recentEvents": [event["type"] for event in current["events"][-8:]]}
    checkpoint(f"dungeon-{stage_name}-battle-resolved", result)
    return result


def open_mine(page: Page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
    page.locator(".context-action").click()
    page.locator("dialog[open]").wait_for()
    enter = page.locator("dialog[open]").get_by_role("button", name=re.compile("進入.*礦坑"))
    if enter.count() == 0 or enter.first.is_disabled():
        raise AssertionError({"mineEntrance": page.locator("dialog[open]").inner_text(), "count": enter.count(), "disabled": enter.first.is_disabled() if enter.count() else None})
    enter.first.click()


def leave_mine(page: Page, label: str) -> dict:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
    page.locator(".context-action").click()
    page.locator("dialog[open] .dungeon-scene").wait_for()
    before = json.loads(raw_storage(page))
    button = page.locator("dialog[open]").get_by_role("button", name="離開礦坑", exact=True)
    if button.is_disabled():
        raise AssertionError("Leave Mine was disabled outside active combat")
    button.click()
    page.wait_for_timeout(50)
    after = json.loads(raw_storage(page))
    result = {"label": label, "dungeonBefore": before["dungeon"], "dungeonAfter": after["dungeon"], "worldTime": after["worldTime"],
              "rawBefore": store_raw(f"{label}-before", raw_from_state(before, before.get("lastSavedAt"))), "rawAfter": store_raw(f"{label}-after", raw_storage(page))}
    checkpoint(f"dungeon-{label}", result)
    return after


def establish_party_and_dungeon(browser: Browser, seed_raw: str) -> tuple[dict, str]:
    context, page = make_context_page(browser, seed_raw)
    try:
        click_speed(page, 0)
        after_year = wait_notes(page, "度過一年")
        if after_year["settlement"]["stage"] == "hamlet" or "tavern" not in after_year["settlement"]["buildings"]:
            raise AssertionError({"stageAfterYear": after_year["settlement"]["stage"], "buildings": after_year["settlement"]["buildings"], "growth": after_year["settlement"]["growth"]})
        checkpoint("normal-ui-one-year-town-growth", {"fromWorldTime": after_year["worldTime"] - 120 * 1440, "toWorldTime": after_year["worldTime"],
            "stage": after_year["settlement"]["stage"], "buildings": after_year["settlement"]["buildings"], "growth": after_year["settlement"]["growth"],
            "party": after_year["party"], "method": "visible Traveler Notes wait one year action; simulation accelerated by game control, no fake timers"})
        # Gather six times with the regular forest UI; then restore stamina at home.
        public_gather(page, 6)
        rest_normal(page, 2)
        speed20_to_hour(page, 17)
        hired = hire_two(page)
        if active(hired["state"])["gold"] < 0:
            raise AssertionError("Hiring created a negative player balance")
        page.wait_for_timeout(200)
        wait_pending_empty(page)
        base_party_raw, party_state = save_state(page)
        party_snapshot = store_raw("party-public-ui-final", base_party_raw)
        checkpoint("party-public-ui-save-before-dungeon", {"snapshot": party_snapshot, "party": party_state["party"], "dailyWages": [p["dailyWage"] for p in party_state["party"]],
            "contractEnds": [p["contractEnd"] for p in party_state["party"]], "gold": active(party_state)["gold"], "archiveIds": [r["id"] for r in archived_rows(page)]})

        # Exercise injury eligibility as a separate controlled, valid save fixture.
        injured_state = copy.deepcopy(party_state)
        injured_party = injured_state["party"][0]
        injured_npc = next(n for n in injured_state["npcs"] if n["id"] == injured_party["npcId"])
        injured_npc["injuredUntil"] = injured_state["worldTime"] + 1439
        injured_npc["currentActivity"] = "leisure"
        injured_npc["position"] = copy.deepcopy(injured_npc["home"])
        injured_raw = raw_from_state(injured_state)
        injured_fixture = {"kind": "valid-save-party-injury-boundary", "changedFields": [f"npcs.{injured_npc['id']}.injuredUntil", "currentActivity", "position"],
                           "purpose": "verify an injured companion remains contracted but does not follow the party until the expiry minute"}
        RUN["method"]["fixtures"].append(injured_fixture)
        injured_context, injured_page = make_context_page(browser, injured_raw)
        try:
            injured_before = json.loads(raw_storage(injured_page))
            before_npc = next(n for n in injured_before["npcs"] if n["id"] == injured_npc["id"])
            if not any(p["npcId"] == injured_npc["id"] for p in injured_before["party"]):
                raise AssertionError("Injured companion left party before expiry")
            injured_after = wait_notes(injured_page, "等待 1 日")
            after_npc = next(n for n in injured_after["npcs"] if n["id"] == injured_npc["id"])
            injury_evidence = {"fixture": injured_fixture, "injuredUntil": injured_before["worldTime"] + 1439, "worldTimeBefore": injured_before["worldTime"],
                "worldTimeAfterOneDay": injured_after["worldTime"], "partyBefore": injured_before["party"], "partyAfter": injured_after["party"],
                "npcBefore": {k: before_npc[k] for k in ["injuredUntil", "position", "home", "currentActivity"]},
                "npcAfter": {k: after_npc[k] for k in ["injuredUntil", "position", "home", "currentActivity"]}}
            if len(injured_after["party"]) != 2 or after_npc["injuredUntil"] > injured_after["worldTime"] or after_npc["position"] != active(injured_after)["position"]:
                raise AssertionError(injury_evidence)
            checkpoint("party-injury-expiry-and-follow-state", injury_evidence)
        finally:
            injured_context.close()

        # The main path remains normal UI actions: enter the newly discovered valley,
        # then walk to and use the visible mine interaction.
        click_travel(page, label="探索迷霧")
        exposed, exposed_state = save_state(page)
        if not exposed_state["dungeon"]["discovered"]:
            raise AssertionError({"regions": exposed_state["regions"], "dungeon": exposed_state["dungeon"]})
        checkpoint("normal-ui-discover-mine", {"worldTime": exposed_state["worldTime"], "position": active(exposed_state)["position"],
            "regions": exposed_state["regions"], "dungeon": exposed_state["dungeon"], "raw": store_raw("mine-discovered", exposed)})
        open_mine(page)
        entered_raw, entered = save_state(page)
        if not entered["dungeon"]["inDungeon"] or entered["dungeon"]["stage"] != 0:
            raise AssertionError({"dungeonAfterEntry": entered["dungeon"]})
        checkpoint("normal-ui-dungeon-entry-stage-zero", {"dungeon": entered["dungeon"], "party": entered["party"], "raw": store_raw("dungeon-entry", entered_raw),
            "screenshot": take_screenshot(page, "dungeon-entry-stage-zero")})
        entered = reload_page_and_compare(page, entered, "dungeon-entry")
        # First expedition: retreat in stage 0, re-enter resets to 0, clear first stage,
        # leave between stages, then re-enter again and confirm a clean run starts at 0.
        page.locator(".context-action").click()
        page.locator("dialog[open] .dungeon-scene").wait_for()
        page.get_by_role("button", name=re.compile("探索下一段")).click()
        page.locator("dialog[open] .battle-scene").wait_for()
        retreat_before = json.loads(raw_storage(page))
        page.get_by_role("button", name="逃跑", exact=True).click()
        page.wait_for_timeout(60)
        retreat_after = json.loads(raw_storage(page))
        retreat = {"dungeonBefore": retreat_before["dungeon"], "dungeonAfter": retreat_after["dungeon"], "combatBefore": retreat_before["combat"],
                   "combatAfter": retreat_after["combat"], "runs": retreat_after["dungeon"]["runs"], "party": retreat_after["party"],
                   "rawBefore": store_raw("dungeon-retreat-before", raw_from_state(retreat_before, retreat_before.get("lastSavedAt"))), "rawAfter": store_raw("dungeon-retreat-after", raw_storage(page))}
        if retreat_after["dungeon"]["inDungeon"] or retreat_after["combat"] is not None or retreat_after["dungeon"]["runs"] != retreat_before["dungeon"]["runs"]:
            raise AssertionError(retreat)
        checkpoint("dungeon-battle-retreat-exits-without-clear", retreat)
        open_mine(page)
        reentry1_raw, reentry1 = save_state(page)
        if reentry1["dungeon"]["stage"] != 0 or not reentry1["dungeon"]["inDungeon"]:
            raise AssertionError({"reentryAfterRetreat": reentry1["dungeon"]})
        checkpoint("dungeon-reentry-after-retreat-resets-to-stage-zero", {"dungeon": reentry1["dungeon"], "raw": store_raw("reentry-after-retreat", reentry1_raw)})
        first = run_battle(page, "abandoned-mine-reentry-floor-1")
        after_first = json.loads(raw_storage(page))
        if after_first["dungeon"]["stage"] != 1 or not after_first["dungeon"]["inDungeon"]:
            raise AssertionError({"afterFirstDungeonWin": after_first["dungeon"]})
        left = leave_mine(page, "leave-between-floor-one-and-two")
        if left["dungeon"]["stage"] != 1 or left["dungeon"]["runs"] != 0 or left["dungeon"]["inDungeon"]:
            raise AssertionError({"leftBetweenStages": left["dungeon"]})
        open_mine(page)
        reentry2 = json.loads(raw_storage(page))
        if reentry2["dungeon"]["stage"] != 0 or not reentry2["dungeon"]["inDungeon"]:
            raise AssertionError({"reentryReset": reentry2["dungeon"]})
        checkpoint("dungeon-leave-and-reentry-reset-design", {"stageAfterFirstClear": after_first["dungeon"]["stage"], "afterLeave": left["dungeon"], "afterReentry": reentry2["dungeon"],
            "interpretation": "leave retains the cleared-stage number outside; the next enter action resets the next expedition to stage 0"})
        floor1 = run_battle(page, "full-run-floor-1")
        after_floor1 = json.loads(raw_storage(page))
        if after_floor1["dungeon"]["stage"] != 1:
            raise AssertionError({"afterFloor1": after_floor1["dungeon"]})
        floor2 = run_battle(page, "full-run-floor-2", save_reload=True)
        after_floor2 = json.loads(raw_storage(page))
        if after_floor2["dungeon"]["stage"] != 2:
            raise AssertionError({"afterFloor2": after_floor2["dungeon"]})
        floor3 = run_battle(page, "full-run-floor-3", save_reload=True)
        cleared = json.loads(raw_storage(page))
        if cleared["dungeon"]["inDungeon"] or cleared["dungeon"]["stage"] != 3 or cleared["dungeon"]["runs"] != 1:
            raise AssertionError({"fullRunResult": cleared["dungeon"]})
        checkpoint("dungeon-three-stages-complete-with-two-companion-archetypes", {"firstStage": floor1, "secondStage": floor2, "thirdStage": floor3,
            "dungeon": cleared["dungeon"], "party": cleared["party"], "partyArchetypes": [p["archetype"] for p in cleared["party"]],
            "player": {"hp": active(cleared)["hp"], "maxHp": active(cleared)["maxHp"], "gold": active(cleared)["gold"], "inventory": active(cleared)["inventory"]},
            "recentEvents": [e["type"] for e in cleared["events"][-10:]], "raw": store_raw("dungeon-three-stage-clear", raw_storage(page)),
            "screenshot": take_screenshot(page, "dungeon-three-stage-clear")})
        wait_pending_empty(page)
        final_rows = archived_rows(page)
        archive_ids = [row["id"] for row in final_rows]
        checkpoint("dungeon-route-final-journal-archive", {"archiveRecordCount": len(final_rows), "archiveIds": archive_ids,
            "uniqueIds": len(archive_ids) == len(set(archive_ids)), "pending": ids_and_pending(page)[1], "party": cleared["party"], "dungeon": cleared["dungeon"]})
        return party_state, base_party_raw
    finally:
        context.close()


def case_08_party_wages_expiry(browser: Browser, party_raw: str) -> None:
    context, page = make_context_page(browser, party_raw)
    try:
        before = json.loads(raw_storage(page))
        start_gold = active(before)["gold"]
        before_raw = raw_storage(page)
        start_party = copy.deepcopy(before["party"])
        if len(start_party) != 2:
            raise AssertionError({"partyBefore": start_party})
        days: list[dict] = []
        for day in range(1, 4):
            after = wait_notes(page, "等待 1 日")
            days.append({"day": day, "worldTime": after["worldTime"], "gold": active(after)["gold"], "party": after["party"],
                         "expiredEvents": [e["type"] for e in after["events"] if e["type"] == "party.expired"]})
        after = json.loads(raw_storage(page))
        after_raw = raw_storage(page)
        gold_loss = start_gold - active(after)["gold"]
        if after["party"] or gold_loss != 16 or len([e for e in after["events"] if e["type"] == "party.expired"]) < 2:
            raise AssertionError({"startGold": start_gold, "endGold": active(after)["gold"], "goldLoss": gold_loss, "days": days, "party": after["party"]})
        checkpoint("party-two-daily-wages-and-three-day-contract-expiry", {"partyBefore": start_party, "days": days, "startGold": start_gold,
            "endGold": active(after)["gold"], "expectedWagesForTwoPaidDays": 16, "observedGoldLoss": gold_loss, "expiredCount": len(start_party) - len(after["party"]),
            "partyAfter": after["party"], "rawBefore": store_raw("party-wages-before", before_raw), "rawAfter": store_raw("party-wages-expired-after", after_raw)})
    finally:
        context.close()


def party_year_fixture(party_state: dict, mode: str) -> tuple[str, dict, int]:
    state = copy.deepcopy(party_state)
    # Party setup naturally reaches year 2; use the next year edge so events from the
    # public route remain earlier than this legal boundary fixture.
    year_start = 2 * 120 * 1440
    state["worldTime"] = year_start - 2
    active(state)["gold"] = max(active(state)["gold"], 1000)
    for contract in state["party"]:
        contract["contractEnd"] = year_start + 1440
    changed = ["worldTime", "activeCharacter.gold", "party.contractEnd", "lastSavedAt"]
    affected = None
    if mode == "death" and state["party"]:
        affected = state["party"][0]["npcId"]
        npc = next(n for n in state["npcs"] if n["id"] == affected)
        new_year = year_start // (120 * 1440) + 1
        npc.update({"age": npc["lifespan"] - 1, "birthYear": new_year - npc["lifespan"], "lifeStage": "elder", "maxStamina": 68, "stamina": min(npc["stamina"], 68),
                    "position": copy.deepcopy(npc["home"]), "currentActivity": "leisure"})
        changed += [f"npcs.{affected}.age", "birthYear", "lifeStage", "maxStamina", "stamina", "position", "currentActivity"]
    fixture = {"kind": "valid-save-party-newyear-boundary" if mode != "death" else "valid-save-contracting-companion-natural-age-death-boundary",
               "changedFields": changed, "purpose": "cross contract day boundary at new year using visible wait-one-day UI, with the exact boundary as a separate legal save fixture",
               "yearBoundaryWorldTime": year_start, "contractEndWorldTime": year_start + 1440, "affectedNpc": affected}
    return raw_from_state(state), fixture, year_start


def case_09_cross_year_contracts_and_death(browser: Browser, party_state: dict) -> None:
    raw, fixture, year_start = party_year_fixture(party_state, "expiry")
    RUN["method"]["fixtures"].append(fixture)
    context, page = make_context_page(browser, raw)
    try:
        before = json.loads(raw_storage(page))
        start_gold = active(before)["gold"]
        steps: list[dict] = []
        for day in range(1, 3):
            after = wait_notes(page, "等待 1 日")
            steps.append({"day": day, "worldTime": after["worldTime"], "calendarYear": after["worldTime"] // 1440 // 120 + 1,
                          "gold": active(after)["gold"], "party": after["party"], "expiredCount": len([e for e in after["events"] if e["type"] == "party.expired"])})
        after = json.loads(raw_storage(page))
        expected_year = year_start // (120 * 1440) + 1
        if after["worldTime"] < year_start + 2 * 1440 - 2 or after["worldTime"] // 1440 // 120 + 1 != expected_year or after["party"]:
            raise AssertionError({"steps": steps, "after": {"worldTime": after["worldTime"], "party": after["party"]}})
        if start_gold - active(after)["gold"] != 8:
            raise AssertionError({"goldBefore": start_gold, "goldAfter": active(after)["gold"], "expectedOneDayWages": 8})
        checkpoint("party-contract-expiry-crosses-midnight-and-new-year", {"fixture": fixture, "steps": steps, "startGold": start_gold,
            "goldAfter": active(after)["gold"], "paidWagesBeforeExpiry": 8, "expiredPartyCount": len(before["party"]) - len(after["party"]),
            "contractEvents": [e["type"] for e in after["events"] if e["type"].startswith("party.")], "partyAfter": after["party"],
            "rawBefore": store_raw("cross-year-contract-before", raw), "rawAfter": store_raw("cross-year-contract-after", raw_storage(page))})
    finally:
        context.close()

    raw, fixture, year_start = party_year_fixture(party_state, "death")
    RUN["method"]["fixtures"].append(fixture)
    context, page = make_context_page(browser, raw)
    try:
        before = json.loads(raw_storage(page))
        affected = fixture["affectedNpc"]
        before_npc = next(n for n in before["npcs"] if n["id"] == affected)
        first = wait_notes(page, "等待 1 日")
        affected_name = before_npc["name"]
        dead_events = [e for e in first["events"] if e["type"] == "npc.died" and affected_name in e["message"]]
        first_party = first["party"]
        if first["worldTime"] < year_start or any(p["npcId"] == affected for p in first_party) or not dead_events:
            raise AssertionError({"affected": affected, "beforeNpc": before_npc, "worldTime": first["worldTime"], "party": first_party, "deathEvents": dead_events})
        second = wait_notes(page, "等待 1 日")
        second_party = second["party"]
        if second_party:
            raise AssertionError({"partySurvivorDidNotExpire": second_party, "events": [e["type"] for e in second["events"][-8:]]})
        checkpoint("party-member-natural-death-removes-contract-at-new-year", {"fixture": fixture, "affectedNpc": affected,
            "ageBefore": before_npc["age"], "lifespan": before_npc["lifespan"], "ageOnBoundary": next((n["age"] for n in first["npcs"] if n["id"] == affected), None),
            "deadEvent": dead_events, "partyBefore": before["party"], "partyAfterNewYearDeath": first_party,
            "survivorAfterExpiryDay": second_party, "remainingContractEvents": [e["type"] for e in second["events"] if e["type"].startswith("party.")],
            "rawBefore": store_raw("party-member-death-before", raw), "rawAfterDeath": store_raw("party-member-death-after", raw_storage(page)),
            "rawAfterSurvivorExpiry": store_raw("party-member-death-expiry-after", raw_storage(page))})
    finally:
        context.close()


def run_safe_case(name: str, function, *args) -> None:
    try:
        evidence = function(*args)
        if evidence is not None:
            add_case(name, "passed", evidence)
        else:
            add_case(name, "passed")
    except Exception as error:  # Keep independent QA cases running; preserve the exact failure.
        add_case(name, "failed", error="".join(traceback.format_exception(type(error), error, error.__traceback__)))


def main() -> int:
    HERE.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    if not MANIFEST_PATH.is_file():
        add_case("preflight", "blocked", error=f"Baseline manifest missing: {MANIFEST_PATH}")
        return 2
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("sourceCommit") != BASELINE_COMMIT:
        add_case("preflight", "blocked", error={"expected": BASELINE_COMMIT, "manifest": manifest.get("sourceCommit")})
        return 2
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        seed_raw: str | None = None
        seed_state: dict | None = None
        party_raw: str | None = None
        party_state: dict | None = None
        try:
            try:
                seed_raw, baseline_evidence = case_01_baseline(browser, manifest)
                seed_state = json.loads(seed_raw)
                add_case("fixed-production-baseline-and-normal-ui-seed", "passed", baseline_evidence)
            except Exception as error:
                add_case("fixed-production-baseline-and-normal-ui-seed", "failed", error="".join(traceback.format_exception(type(error), error, error.__traceback__)))
                return 1
            run_safe_case("x20-real-timer-modal-background-and-focus", case_02_x20_modal, browser, seed_raw)
            run_safe_case("x20-real-timer-day-boundary", case_03_day_boundary, browser, seed_state)
            run_safe_case("x20-real-timer-new-year-boundary", case_04_year_boundary, browser, seed_state)
            run_safe_case("indexeddb-delayed-ack-queue-race", case_05_ack_race, browser)
            run_safe_case("indexeddb-transaction-abort-rollback", case_06_abort_rollback, browser, seed_raw)
            run_safe_case("combat-and-death-modal-focus-targets", case_07_modal_target_and_death, browser, seed_state)
            try:
                party_state, party_raw = establish_party_and_dungeon(browser, seed_raw)
                add_case("public-ui-party-dungeon-save-reload-matrix", "passed", {"party": party_state["party"], "worldTime": party_state["worldTime"], "stage": party_state["settlement"]["stage"], "partyRaw": store_raw("party-public-ui-final", party_raw)})
            except Exception as error:
                add_case("public-ui-party-dungeon-save-reload-matrix", "failed", error="".join(traceback.format_exception(type(error), error, error.__traceback__)))
            if party_raw and party_state:
                run_safe_case("party-daily-wages-and-expiry", case_08_party_wages_expiry, browser, party_raw)
                run_safe_case("party-cross-year-expiry-and-member-death", case_09_cross_year_contracts_and_death, browser, party_state)
        finally:
            browser.close()
    RUN["finishedAtUtc"] = utc_now()
    RUN["summary"] = {"caseCount": len(RUN["cases"]), "failedCases": [row["name"] for row in RUN["cases"] if row["status"] != "passed"],
                      "checkpointCount": len(RUN["checkpoints"]), "pageErrorCount": len(RUN["pageErrors"]), "consoleErrorCount": len(RUN["consoleErrors"])}
    publish()
    return 1 if RUN["summary"]["failedCases"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

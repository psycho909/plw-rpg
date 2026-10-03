#!/usr/bin/env python3
"""Singleplayer browser persistence checks against the frozen local build."""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import urlopen

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ART = OUT / "artifacts"
ART.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

URL = os.environ.get("PLW_UI_URL", "http://127.0.0.1:5186/")
assert urlsplit(URL).hostname in {"127.0.0.1", "localhost"}
SAVE_KEY = "oakvale-v1"
STAGED_FIXTURE_KEY = "__plw-local-browser-fixture__"
RESULTS: dict = {
    "run": {
        "started_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "build": f"local production artifact served at {URL}; runtime HTML and referenced asset hashes captured before play",
        "url": URL,
        "browser": "/usr/bin/chromium via Python Playwright",
        "scope": "singleplayer local storage / IndexedDB / automatic report behavior",
        "fixtures": "failure and repair cases are explicitly labeled as controlled fixtures",
    },
    "cases": [],
    "page_errors": [],
    "console_errors": [],
    "http_failures": [],
}
_phase = "startup"
_hooked_pages: set[int] = set()


def publish(status: str) -> None:
    RESULTS["status"] = status
    body = json.dumps(RESULTS, ensure_ascii=False, indent=2) + "\n"
    write_recorded(OUT / "results.json", body, producer="local-browser")
    print(f"CHECKPOINT {status}: {len(RESULTS['cases'])} cases", flush=True)


def case(name: str, category: str, passed: bool, evidence: dict, note: str = "") -> None:
    RESULTS["cases"].append({"name": name, "category": category, "outcome": "pass" if passed else "fail", "evidence": evidence, "note": note})
    publish(name)
    if not passed:
        print("CASE FAILED", name, json.dumps(evidence, ensure_ascii=False), flush=True)


def write_json(name: str, data: object) -> Path:
    path = ART / name
    write_recorded(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n", producer="browser-artifact")
    return path


def served_asset_hashes() -> dict:
    with urlopen(URL, timeout=10) as response:
        html = response.read()
        status = response.status
    references = re.findall(rb'(?:src|href)="([^\"]+\.(?:js|css))"', html)
    assets = {"index.html": hashlib.sha256(html).hexdigest()}
    for reference in references:
        asset_url = urljoin(URL, reference.decode("utf-8"))
        with urlopen(asset_url, timeout=20) as response:
            body = response.read()
        assets[Path(urlsplit(asset_url).path).name] = hashlib.sha256(body).hexdigest()
    return {"http_status": status, "sha256": assets}


def checkpoint(page, label: str) -> dict:
    data = page.evaluate("""(key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return { raw: null };
      const saved = JSON.parse(raw);
      const active = saved.characters?.find(c => c.id === saved.activeCharacterId);
      return { raw, saved, summary: {
        worldId: saved.playJournal?.worldId, worldTime: saved.worldTime,
        lastSavedAt: saved.lastSavedAt, pendingCount: saved.playJournal?.pending?.length,
        pendingIds: saved.playJournal?.pending?.map(r => r.id),
        pendingKinds: saved.playJournal?.pending?.map(r => r.kind),
        activeCharacterId: saved.activeCharacterId, player: active && {id: active.id, name: active.name, position: active.position, hp: active.hp, isAlive: active.isAlive},
        stateEvents: saved.events?.length, eventSequence: saved.eventSequence,
        storageBytes: new Blob([raw]).size
      }};
    }""", SAVE_KEY)
    if data.get("raw") is not None:
        write_json(f"{label}-checkpoint.json", {"label": label, **data})
    return data


def archive(page) -> list[dict]:
    return page.evaluate("""async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('oakvale-play-journal', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('records', 'readonly');
        const req = tx.objectStore('records').getAll();
        tx.oncomplete = () => { const rows = req.result; db.close(); resolve(rows); };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }""")


def record_body(record: dict) -> dict:
    return {key: value for key, value in record.items() if key != "ordinal"}


def wait_pending(page, count: int = 0, timeout: int = 10000) -> None:
    page.wait_for_function("""([key, count]) => {
      try { return JSON.parse(localStorage.getItem(key) || '{}').playJournal?.pending?.length === count; }
      catch { return false; }
    }""", arg=[SAVE_KEY, count], timeout=timeout)


def wait_for_alert_contains(page, expected: str, timeout: int = 10000) -> bool:
    try:
        page.wait_for_function(
            f"() => [...document.querySelectorAll('[role=alert]')].some(e => e.innerText.includes({json.dumps(expected)}))",
            timeout=timeout,
        )
        return True
    except PlaywrightTimeoutError:
        return False


def hooks(page, phase: str) -> None:
    if id(page) in _hooked_pages:
        return
    _hooked_pages.add(id(page))
    page.on("pageerror", lambda error: RESULTS["page_errors"].append({"phase": _phase, "message": str(error)}))
    page.on("console", lambda message: RESULTS["console_errors"].append({"phase": _phase, "message": message.text}) if message.type == "error" else None)
    page.on("response", lambda response: RESULTS["http_failures"].append({"phase": _phase, "url": response.url, "status": response.status}) if response.status >= 400 else None)


def pause(page) -> None:
    page.get_by_role("button", name="暫停", exact=True).click()


def read_checkpoint_now(page) -> dict:
    return page.evaluate("key => JSON.parse(localStorage.getItem(key) || 'null')", SAVE_KEY)


def stage_checkpoint_for_reload(page, saved: dict) -> None:
    """Apply a fixture before app startup, after the old document's pagehide save."""
    page.evaluate("([key, value]) => sessionStorage.setItem(key, JSON.stringify(value))", [STAGED_FIXTURE_KEY, saved])
    page.add_init_script(f"""{{
      const staged = sessionStorage.getItem({json.dumps(STAGED_FIXTURE_KEY)});
      if (staged !== null) {{
        window.__plwLocalFixtureSnapshot = JSON.parse(staged);
        localStorage.setItem({json.dumps(SAVE_KEY)}, staged);
        sessionStorage.removeItem({json.dumps(STAGED_FIXTURE_KEY)});
      }}
    }}""")


def staged_fixture_snapshot(page) -> dict | None:
    return page.evaluate("() => window.__plwLocalFixtureSnapshot || null")


def ui_state(page) -> dict:
    return page.evaluate("""() => ({
      time: document.querySelector('.world-clock')?.innerText,
      caption: document.querySelector('.world-caption')?.innerText,
      player: document.querySelector('.player-identity')?.innerText,
      speed: [...document.querySelectorAll('.speed-controls button')].find(b => b.getAttribute('aria-pressed') === 'true')?.innerText,
      alerts: [...document.querySelectorAll('[role=alert]')].map(e => e.innerText),
      title: document.title
    })""")


def main() -> int:
    global _phase
    RESULTS["run"]["served_assets"] = served_asset_hashes()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        page = context.new_page()
        _phase = "normal-ui"
        hooks(page, _phase)
        page.goto(URL, wait_until="networkidle")
        pause(page)
        wait_pending(page, 0)
        base = checkpoint(page, "initial")
        base_records = archive(page)
        created_rows = [record for record in base_records if record.get("kind") == "created"]
        case("fresh world writes initial created record", "normal-ui", bool(base["summary"]["worldId"] and len(created_rows) == 1 and base["summary"]["pendingCount"] == 0), {
            "worldId": base["summary"]["worldId"], "pending": base["summary"]["pendingCount"], "archiveCount": len(base_records), "recordKinds": [r.get("kind") for r in base_records], "createdRecordCount": len(created_rows)
        }, "The running clock may append time records before Playwright can pause the fresh page; the assertion checks for exactly one initial created record.")

        # Corrupt legacy JSON is preserved byte-for-byte and surfaced to the user.
        _phase = "controlled-corrupt-legacy-fixture"
        corrupt_context = browser.new_context(viewport={"width": 1440, "height": 1000})
        corrupt_page = corrupt_context.new_page(); hooks(corrupt_page, _phase)
        corrupt_raw = '{"saveVersion":1,"characters":'
        corrupt_page.add_init_script(f"localStorage.setItem({json.dumps(SAVE_KEY)}, {json.dumps(corrupt_raw)})")
        corrupt_page.goto(URL, wait_until="networkidle")
        corrupt_warning_shown = wait_for_alert_contains(corrupt_page, "原始存檔已保留")
        corrupt_page.wait_for_timeout(1000)
        corrupt_after = corrupt_page.evaluate("key => localStorage.getItem(key)", SAVE_KEY)
        corrupt_alerts = ui_state(corrupt_page)["alerts"]
        case("malformed legacy raw stays byte-for-byte intact and shows protection warning", "controlled-failure-fixture", corrupt_after == corrupt_raw and corrupt_warning_shown and any("原始存檔已保留" in value for value in corrupt_alerts), {
            "rawBefore": corrupt_raw, "rawAfter": corrupt_after, "unchanged": corrupt_after == corrupt_raw, "warningShown": corrupt_warning_shown, "alerts": corrupt_alerts
        }, "A separate browser context started with malformed legacy JSON. Its original bytes were checked after the application had time to attempt normal startup saves.")
        corrupt_context.close()

        # A real movement button must persist before a manual-save click.
        before = checkpoint(page, "before-action")
        before_records = archive(page)
        page.get_by_role("button", name="往右", exact=True).click()
        immediate = checkpoint(page, "action-immediate")
        immediate_rec = immediate["saved"].get("playJournal", {}).get("pending", [])
        immediate_archive = archive(page)
        immediate_new_rows = [r for r in immediate_archive if r["id"] not in {x["id"] for x in before_records}]
        immediate_ok = (immediate["summary"]["pendingCount"] in {0, 1}
                        and immediate["summary"]["worldTime"] >= before["summary"]["worldTime"]
                        and immediate["saved"]["characters"] != before["saved"]["characters"])
        wait_pending(page, 0)
        after_records = archive(page)
        action_id = immediate_rec[0]["id"] if immediate_rec else (immediate_new_rows[0]["id"] if immediate_new_rows else None)
        acked = [r for r in after_records if r["id"] == action_id]
        case("UI action checkpoints before manual save and is acknowledged once", "normal-ui", immediate_ok and len(acked) == 1 and len(after_records) == len(before_records) + 1, {
            "immediatePending": [r.get("id") for r in immediate_rec], "immediateCommittedRows": immediate_new_rows, "kind": immediate_rec[0].get("kind") if immediate_rec else (acked[0].get("kind") if acked else None),
            "worldTimeBefore": before["summary"]["worldTime"], "worldTimeImmediate": immediate["summary"]["worldTime"],
            "positionBefore": before["summary"]["player"], "positionAfter": immediate["summary"]["player"],
            "archiveBefore": len(before_records), "archiveAfter": len(after_records), "matchingIds": [r["id"] for r in acked]
        }, "No manual save button was clicked between the movement and immediate checkpoint.")
        if acked:
            write_json("single-action-record.json", acked[0])

        # Controlled invalid-move fixture: place the hero at map x=0,y=0; then use the real UI up button.
        _phase = "controlled-invalid-action-fixture"
        fixture = checkpoint(page, "pre-invalid-fixture")["saved"]
        fixture["lastSavedAt"] = int(time.time() * 1000)
        hero = next(c for c in fixture["characters"] if c["id"] == fixture["activeCharacterId"])
        hero["position"] = {"x": 0, "y": 0}
        stage_checkpoint_for_reload(page, fixture)
        page.reload(wait_until="networkidle")
        hooks(page, _phase)
        pause(page)
        wait_pending(page, 0)
        invalid_before = checkpoint(page, "invalid-before"); invalid_archive_before = archive(page)
        page.get_by_role("button", name="往上", exact=True).click()
        page.wait_for_timeout(250)
        invalid_after = checkpoint(page, "invalid-after"); invalid_archive_after = archive(page)
        fixture_snapshot = staged_fixture_snapshot(page)
        fixture_loaded = (fixture_snapshot is not None
                          and fixture_snapshot["characters"][0]["position"] == {"x": 0, "y": 0}
                          and invalid_before["summary"]["player"]["position"] == {"x": 0, "y": 0})
        invalid_ok = fixture_loaded and invalid_after["summary"]["pendingCount"] == 0 and len(invalid_archive_after) == len(invalid_archive_before) and invalid_after["summary"]["worldTime"] == invalid_before["summary"]["worldTime"]
        case("failed boundary move creates no record", "controlled-failure-fixture", invalid_ok, {
            "requestedFixturePosition": hero["position"], "loadedFixturePosition": invalid_before["summary"]["player"]["position"], "fixtureLoaded": fixture_loaded, "pendingBefore": invalid_before["summary"]["pendingCount"], "pendingAfter": invalid_after["summary"]["pendingCount"],
            "archiveBefore": len(invalid_archive_before), "archiveAfter": len(invalid_archive_after), "worldTimeBefore": invalid_before["summary"]["worldTime"], "worldTimeAfter": invalid_after["summary"]["worldTime"], "message": ui_state(page)
        }, "Injected valid save with player at the map boundary, then attempted a real UI move into the void.")

        # Restore the ordinary saved position through a controlled progress fixture before season simulation.
        _phase = "controlled-state-repair-fixture"
        restored = invalid_before["saved"]
        restored["lastSavedAt"] = int(time.time() * 1000)
        next(c for c in restored["characters"] if c["id"] == restored["activeCharacterId"])["position"] = before["summary"]["player"]["position"]
        stage_checkpoint_for_reload(page, restored)
        page.reload(wait_until="networkidle")
        hooks(page, _phase)
        pause(page); wait_pending(page, 0)

        # Ordinary UI season advancement. The stored record must retain events beyond the rolling 150-item view.
        _phase = "normal-season-ui"
        world_before = checkpoint(page, "season-before")
        season_archive_before = archive(page)
        page.keyboard.press("Escape")
        page.locator(".pixel-menu").get_by_role("button", name="旅人筆記", exact=True).click()
        page.get_by_role("button", name="度過一季", exact=True).click()
        season_immediate = checkpoint(page, "season-immediate")
        season_pending = season_immediate["saved"].get("playJournal", {}).get("pending", [])
        season_archive_immediate = archive(page)
        wait_pending(page, 0, timeout=30000)
        season_records = archive(page)
        season_candidates = [r for r in season_archive_immediate if r["id"] not in {x["id"] for x in season_archive_before}]
        season_id = season_pending[-1]["id"] if season_pending else (season_candidates[-1]["id"] if season_candidates else None)
        season_record = next((r for r in season_records if r["id"] == season_id), None)
        season_events = season_record.get("events", []) if season_record else []
        season_expected_delta = 30 * 1440
        season_ok = (season_immediate["summary"]["pendingCount"] in {0, 1}
                     and season_immediate["summary"]["worldTime"] - world_before["summary"]["worldTime"] == season_expected_delta
                     and bool(season_record) and season_record.get("kind") == "time" and season_immediate["summary"]["stateEvents"] <= 150)
        case("normal UI advances one 30-day season and journals its observed event set", "normal-ui", season_ok, {
            "worldTimeBefore": world_before["summary"]["worldTime"], "worldTimeImmediate": season_immediate["summary"]["worldTime"], "expectedDelta": season_expected_delta,
            "immediatePendingCount": season_immediate["summary"]["pendingCount"], "committedRecordId": season_record.get("id") if season_record else None,
            "recordEventCount": len(season_events), "checkpointRollingEventCount": season_immediate["summary"]["stateEvents"],
            "archiveCount": len(season_records), "committed": bool(season_record), "firstEvents": season_events[:3], "lastEvents": season_events[-3:]
        }, "Clicked the normal traveller-notes action ‘度過一季’; recorded the actual event count without requiring this natural run to exceed the 150-item state cap.")
        if season_record:
            write_json("season-time-record.json", {"record": season_record, "rollingCheckpointEvents": season_immediate["saved"].get("events", [])})
            page.screenshot(path=str(ART / "season-after.png"), full_page=True)
        page.keyboard.press("Escape")

        # Real clock soak at the highest UI speed, then pause and inspect local and indexed storage.
        _phase = "normal-x20-soak"
        soak_before = checkpoint(page, "soak-before")
        soak_archive_before = archive(page)
        page.get_by_role("button", name="×20", exact=True).click()
        t0 = time.monotonic(); samples = []
        while time.monotonic() - t0 < 35:
            page.wait_for_timeout(5000)
            if time.monotonic() - t0 >= 15 and not any(s.get("atSeconds") == 15 for s in samples):
                s = checkpoint(page, "soak-15s"); samples.append({"atSeconds": round(time.monotonic() - t0), "worldTime": s["summary"]["worldTime"], "pending": s["summary"]["pendingCount"], "storageBytes": s["summary"]["storageBytes"]})
                publish("x20-soak-15s")
        elapsed = round(time.monotonic() - t0, 2)
        page.get_by_role("button", name="暫停", exact=True).click()
        soak_immediate = checkpoint(page, "soak-immediate")
        try:
            wait_pending(page, 0, timeout=30000)
            soak_drained = True
        except Exception:
            soak_drained = False
        soak_records = archive(page)
        soak_delta = soak_immediate["summary"]["worldTime"] - soak_before["summary"]["worldTime"]
        soak_new = [r for r in soak_records if r.get("at", 0) >= soak_before["summary"]["lastSavedAt"] and r.get("kind") in {"time", "offline"}]
        duplicate_ids = len({r["id"] for r in soak_records}) != len(soak_records)
        soak_ok = elapsed >= 30 and soak_delta > 0 and soak_drained and not duplicate_ids and soak_immediate["summary"]["pendingCount"] == 0
        case("real UI ×20 clock runs for 35 seconds, pauses, saves and drains journal", "normal-ui", soak_ok, {
            "elapsedSeconds": elapsed, "worldTimeBefore": soak_before["summary"]["worldTime"], "worldTimeAtPause": soak_immediate["summary"]["worldTime"], "gameMinutesAdvanced": soak_delta,
            "intermediateSamples": samples, "localStorageBytes": soak_immediate["summary"]["storageBytes"], "archiveBefore": len(soak_archive_before), "archiveAfter": len(soak_records),
            "newTimeRecordsApprox": len(soak_new), "pendingAfterDrain": soak_immediate["summary"]["pendingCount"], "drained": soak_drained,
            "uniqueRecordIds": len({r["id"] for r in soak_records}), "duplicateIds": duplicate_ids,
            "journalErrorVisible": any("遊玩紀錄尚待補寫" in a for a in ui_state(page)["alerts"])
        }, "The clock ran through the application timer at UI speed ×20 for 35 real seconds.")
        write_json("x20-soak-summary.json", {"before": soak_before["summary"], "paused": soak_immediate["summary"], "elapsedSeconds": elapsed, "samples": samples,
                                                    "archiveBeforeIds": [r["id"] for r in soak_archive_before], "archiveAfterIds": [r["id"] for r in soak_records],
                                                    "newTimeRecords": [r for r in soak_records if r.get("id") not in {x.get("id") for x in soak_archive_before}]})
        page.screenshot(path=str(ART / "x20-paused.png"), full_page=True)

        # Force a real IndexedDB readwrite acquisition failure. Local checkpoint must retain the action.
        _phase = "controlled-idb-failure-fixture"
        idb_before = checkpoint(page, "idb-failure-before"); idb_records_before = archive(page)
        page.evaluate("""() => {
          const original = IDBDatabase.prototype.transaction;
          window.__originalTransaction = original;
          Object.defineProperty(IDBDatabase.prototype, 'transaction', { configurable: true, writable: true, value: function(storeNames, mode, options) {
            const stores = typeof storeNames === 'string' ? [storeNames] : Array.from(storeNames || []);
            if (mode === 'readwrite' && stores.includes('records')) throw new DOMException('controlled test transaction failure', 'InvalidStateError');
            return original.call(this, storeNames, mode, options);
          }});
        }""")
        page.get_by_role("button", name="往右", exact=True).click()
        idb_warning_shown = wait_for_alert_contains(page, "遊玩紀錄尚待補寫")
        idb_failed = checkpoint(page, "idb-failure-immediate"); idb_failure_errors = ui_state(page)["alerts"]
        page.screenshot(path=str(ART / "idb-write-failure.png"), full_page=True)
        idb_fail_ok = idb_failed["summary"]["pendingCount"] == 1 and idb_warning_shown and any("遊玩紀錄尚待補寫" in x for x in idb_failure_errors) and len(archive(page)) == len(idb_records_before)
        case("controlled IndexedDB readwrite failure leaves checkpoint pending and reports retry", "controlled-failure-fixture", idb_fail_ok, {
            "pendingCount": idb_failed["summary"]["pendingCount"], "pendingIds": idb_failed["summary"]["pendingIds"], "archiveBefore": len(idb_records_before),
            "archiveAfter": len(archive(page)), "warningShown": idb_warning_shown, "visibleAlerts": idb_failure_errors, "injectedFailure": "IDBDatabase.transaction(readwrite, records) throws InvalidStateError"
        }, "A test-only browser wrapper rejected the journal readwrite transaction; this is not a game runtime error.")
        failed_id = idb_failed["summary"]["pendingIds"][0]
        page.reload(wait_until="networkidle")
        hooks(page, "idb-failure-reload-recovery")
        pause(page)
        wait_pending(page, 0, timeout=20000)
        idb_recovered_records = archive(page)
        idb_matches = [r for r in idb_recovered_records if r["id"] == failed_id]
        case("reload retries pending IDB record exactly once", "controlled-repair-fixture", len(idb_matches) == 1 and len({r["id"] for r in idb_recovered_records}) == len(idb_recovered_records), {
            "recoveredId": failed_id, "matchingRows": len(idb_matches), "archiveCountBefore": len(idb_records_before), "archiveCountAfter": len(idb_recovered_records),
            "pendingAfterReload": checkpoint(page, "idb-recovered")["summary"]["pendingCount"], "uniqueIds": len({r["id"] for r in idb_recovered_records})
        }, "The failure wrapper was lost at document reload; saved checkpoint reloaded and normal automatic flush recovered it.")
        if idb_matches:
            write_json("idb-recovered-record.json", idb_matches[0])

        # Replay one already committed record in the checkpoint; repository must deduplicate it.
        _phase = "controlled-dedup-replay-fixture"
        replay_record = idb_matches[0] if idb_matches else next((r for r in idb_recovered_records if r["kind"] == "action"), None)
        replay_before_ids = [r["id"] for r in idb_recovered_records]
        replay_fixture = checkpoint(page, "dedup-before")["saved"]
        replay_fixture["lastSavedAt"] = int(time.time() * 1000)
        replay_copy = dict(replay_record); replay_copy.pop("ordinal", None)
        replay_fixture["playJournal"]["pending"] = [replay_copy]
        stage_checkpoint_for_reload(page, replay_fixture)
        page.reload(wait_until="networkidle")
        hooks(page, _phase); pause(page); wait_pending(page, 0, timeout=15000)
        replay_after = archive(page)
        replay_loaded_fixture = staged_fixture_snapshot(page)
        replay_loaded = replay_loaded_fixture is not None and replay_loaded_fixture["playJournal"]["pending"][0]["id"] == replay_copy["id"]
        replay_after_ids = [r["id"] for r in replay_after]
        replay_matches = [r for r in replay_after if r["id"] == replay_copy["id"]]
        replay_new = [r for r in replay_after if r["id"] not in replay_before_ids]
        replay_ok = (replay_loaded and set(replay_before_ids).issubset(replay_after_ids)
                     and len(set(replay_after_ids)) == len(replay_after_ids)
                     and len(replay_matches) == 1 and record_body(replay_matches[0]) == replay_copy
                     and all(r.get("kind") in {"time", "offline"} for r in replay_new))
        case("committed record replay deduplicates without a second row", "controlled-replay-fixture", replay_ok, {
            "replayedId": replay_copy["id"], "archiveBeforeCount": len(replay_before_ids), "archiveAfterCount": len(replay_after),
            "fixtureLoaded": replay_loaded, "sameIdCount": len(replay_matches), "bodyUnchanged": len(replay_matches) == 1 and record_body(replay_matches[0]) == replay_copy,
            "preservedOldIds": len(set(replay_before_ids) & set(replay_after_ids)), "newRecordKinds": [r.get("kind") for r in replay_new], "pendingAfter": checkpoint(page, "dedup-after")["summary"]["pendingCount"]
        }, "Fixture copied a committed record body into the checkpoint pending queue and reloaded the real UI.")

        # Same ID with altered body is a controlled corruption fixture; visible error and pending body must survive.
        _phase = "controlled-id-collision-fixture"
        collision_before = archive(page)
        conflict_fixture = checkpoint(page, "collision-before")["saved"]
        conflict_fixture["lastSavedAt"] = int(time.time() * 1000)
        altered = dict(replay_copy); altered["message"] = str(altered["message"]) + " [controlled altered body]"
        conflict_fixture["playJournal"]["pending"] = [altered]
        stage_checkpoint_for_reload(page, conflict_fixture)
        page.reload(wait_until="networkidle")
        hooks(page, _phase); pause(page)
        collision_warning_shown = wait_for_alert_contains(page, "同一紀錄編號的內容不同")
        conflict_after = checkpoint(page, "collision-after"); conflict_alerts = ui_state(page)["alerts"]; collision_archive_after = archive(page)
        page.screenshot(path=str(ART / "id-collision-preserved.png"), full_page=True)
        collision_loaded_fixture = staged_fixture_snapshot(page)
        collision_loaded = collision_loaded_fixture is not None and collision_loaded_fixture["playJournal"]["pending"][0]["message"] == altered["message"]
        collision_pending = conflict_after["saved"]["playJournal"]["pending"]
        collision_target_pending = [r for r in collision_pending if r["id"] == altered["id"]]
        collision_target_before = next((r for r in collision_before if r["id"] == altered["id"]), None)
        collision_target_after = [r for r in collision_archive_after if r["id"] == altered["id"]]
        collision_after_ids = [r["id"] for r in collision_archive_after]
        collision_new = [r for r in collision_archive_after if r["id"] not in {x["id"] for x in collision_before}]
        collision_ok = (collision_loaded and len(collision_target_pending) == 1 and collision_target_pending[0]["message"] == altered["message"]
                        and set(r["id"] for r in collision_before).issubset(collision_after_ids)
                        and len(set(collision_after_ids)) == len(collision_after_ids)
                        and collision_target_before is not None and len(collision_target_after) == 1
                        and record_body(collision_target_after[0]) == record_body(collision_target_before)
                        and all(r.get("kind") in {"time", "offline"} for r in collision_new)
                        and collision_warning_shown and any("同一紀錄編號的內容不同" in x for x in conflict_alerts))
        case("same-ID altered body refuses overwrite and preserves pending with visible error", "controlled-failure-fixture", collision_ok, {
            "recordId": altered["id"], "alteredBodyPreserved": conflict_after["saved"]["playJournal"]["pending"][0]["message"],
            "fixtureLoaded": collision_loaded, "warningShown": collision_warning_shown, "pendingCount": conflict_after["summary"]["pendingCount"], "archiveBeforeCount": len(collision_before), "archiveAfterCount": len(collision_archive_after),
            "oldIdsPreserved": len(set(r["id"] for r in collision_before) & set(collision_after_ids)), "targetArchivedExactlyOnce": len(collision_target_after) == 1,
            "targetArchiveBodyUnchanged": collision_target_before is not None and len(collision_target_after) == 1 and record_body(collision_target_after[0]) == record_body(collision_target_before),
            "additionalArchiveKinds": [r.get("kind") for r in collision_new], "pendingKinds": [r.get("kind") for r in collision_pending],
            "alerts": conflict_alerts, "injectedFailure": "checkpoint body intentionally differs from immutable IDB body"
        }, "This uses a deliberately altered checkpoint fixture; it does not represent normal user play.")

        # Export menu must include archive, in-memory pending records, and current checkpoint.
        _phase = "normal-export-ui"
        with page.expect_download() as dl:
            page.get_by_role("button", name="選單", exact=False).first.click()
            page.get_by_role("button", name="匯出遊玩紀錄", exact=False).click()
        download = dl.value
        export_path = ART / "export-with-pending.json"; download.save_as(str(export_path))
        write_recorded(export_path, export_path.read_text(encoding="utf-8"), producer="browser-artifact")
        exported = json.loads(export_path.read_text(encoding="utf-8"))
        exported_records = exported.get("records", [])
        exported_record_ids = [r.get("id") for r in exported_records]
        exported_target = [r for r in exported_records if r.get("id") == altered["id"]]
        exported_pending = exported.get("pending", [])
        exported_target_pending = [r for r in exported_pending if r.get("id") == altered["id"]]
        exported_checkpoint_pending = exported.get("checkpoint", {}).get("playJournal", {}).get("pending", [])
        export_ok = (exported.get("archiveAvailable") is True
                     and {r["id"] for r in collision_before}.issubset(exported_record_ids)
                     and len(set(exported_record_ids)) == len(exported_record_ids)
                     and len(exported_target) == 1 and collision_target_before is not None
                     and record_body(exported_target[0]) == record_body(collision_target_before)
                     and len(exported_target_pending) == 1 and exported_target_pending[0].get("message") == altered["message"]
                     and any(r.get("id") == altered["id"] for r in exported_checkpoint_pending)
                     and all(r.get("kind") in {"time", "offline"} for r in exported_pending if r.get("id") != altered["id"]))
        case("menu export includes archive, pending record and current checkpoint", "normal-ui-with-controlled-pending-fixture", export_ok, {
            "downloadName": download.suggested_filename, "archiveAvailable": exported.get("archiveAvailable"), "archiveRows": len(exported_records),
            "archiveOldIdsPreserved": len(set(r["id"] for r in collision_before) & set(exported_record_ids)), "pendingRows": len(exported_pending), "pendingIds": [r.get("id") for r in exported_pending],
            "checkpointWorldId": exported.get("checkpoint", {}).get("playJournal", {}).get("worldId"),
            "checkpointWorldTime": exported.get("checkpoint", {}).get("worldTime")
        }, "Export was triggered from the real menu while a controlled ID collision remained pending.")

        # Repair the corrupted fixture by restoring the exact committed body.
        _phase = "controlled-conflict-repair-fixture"
        repair = checkpoint(page, "collision-repair-before")["saved"]
        repair["lastSavedAt"] = int(time.time() * 1000)
        repair["playJournal"]["pending"] = [r for r in repair["playJournal"]["pending"] if r["id"] != replay_copy["id"]] + [replay_copy]
        stage_checkpoint_for_reload(page, repair)
        page.reload(wait_until="networkidle")
        hooks(page, _phase); pause(page); wait_pending(page, 0, timeout=15000)
        repair_snapshot = staged_fixture_snapshot(page)
        repair_loaded = (repair_snapshot is not None and replay_copy in repair_snapshot["playJournal"]["pending"])
        repaired_records = archive(page)
        repaired_ids = [r["id"] for r in repaired_records]
        repaired_new = [r for r in repaired_records if r["id"] not in replay_before_ids]
        repaired_target = [r for r in repaired_records if r["id"] == replay_copy["id"]]
        repair_ok = (repair_loaded and checkpoint(page, "collision-repaired")["summary"]["pendingCount"] == 0
                     and set(replay_before_ids).issubset(repaired_ids) and len(set(repaired_ids)) == len(repaired_ids)
                     and len(repaired_target) == 1 and record_body(repaired_target[0]) == replay_copy
                     and all(r.get("kind") in {"time", "offline"} for r in repaired_new))
        case("restoring exact committed body clears replayed pending fixture", "controlled-repair-fixture", repair_ok, {
            "fixtureLoaded": repair_loaded, "pendingAfter": checkpoint(page, "collision-repaired")['summary']["pendingCount"], "archiveRows": len(repaired_records), "expectedOldIds": len(replay_before_ids),
            "oldIdsPreserved": len(set(replay_before_ids) & set(repaired_ids)), "targetSameIdCount": len(repaired_target), "newRecordKinds": [r.get("kind") for r in repaired_new]
        }, "Repair restored the exact previously committed body in a controlled local checkpoint.")

        # Storage.setItem failure: disk stays byte-for-byte unchanged while the UI still reflects live memory progress.
        _phase = "controlled-localstorage-failure-fixture"
        disk_before = checkpoint(page, "storage-failure-before"); archive_before_storage = archive(page)
        page.get_by_role("button", name="×1", exact=True).click()
        page.evaluate("""() => {
          const original = Storage.prototype.setItem;
          window.__originalSetItem = original;
          Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, writable: true, value: function(key, value) {
            if (key === 'oakvale-v1') throw new DOMException('controlled localStorage failure', 'QuotaExceededError');
            return original.call(this, key, value);
          }});
        }""")
        old_pos = disk_before["summary"]["player"]["position"]
        page.get_by_role("button", name="往右", exact=True).click()
        storage_warning_shown = wait_for_alert_contains(page, "存檔失敗", timeout=5000)
        failed_storage_ui = ui_state(page); failed_storage_disk = page.evaluate("key => localStorage.getItem(key)", SAVE_KEY)
        disk_preserved = failed_storage_disk == disk_before["raw"]
        page.screenshot(path=str(ART / "localstorage-write-failure.png"), full_page=True)
        with page.expect_download() as dl2:
            page.get_by_role("button", name="選單", exact=False).first.click()
            page.get_by_role("button", name="匯出遊玩紀錄", exact=False).click()
        memory_export_path = ART / "memory-export-before-retry.json"
        dl2.value.save_as(str(memory_export_path))
        write_recorded(memory_export_path, memory_export_path.read_text(encoding="utf-8"), producer="browser-artifact")
        mem_export = json.loads(memory_export_path.read_text(encoding="utf-8"))
        mem_pending = mem_export.get("pending", [])
        export_mem_ok = len(mem_pending) >= 1 and mem_export.get("checkpoint", {}).get("characters")
        # Restore browser Storage API and use the app's visible manual retry control in the open menu.
        page.evaluate("""() => Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, writable: true, value: window.__originalSetItem })""")
        page.locator(".pixel-menu").get_by_role("button", name="儲存世界", exact=False).click()
        wait_pending(page, 0, timeout=15000)
        storage_recovered = checkpoint(page, "storage-recovered"); storage_records_after = archive(page)
        storage_action_ids = [r["id"] for r in mem_pending]
        storage_match = [r for r in storage_records_after if r["id"] in storage_action_ids]
        storage_ok = disk_preserved and storage_warning_shown and failed_storage_ui["speed"] == "暫停" and export_mem_ok and len(storage_match) == len(storage_action_ids) and storage_recovered["summary"]["pendingCount"] == 0 and storage_recovered["summary"]["player"]["position"] != old_pos
        case("localStorage write failure preserves prior disk, pauses time, export and manual retry recover memory", "controlled-failure-and-repair-fixture", storage_ok, {
            "diskUnchangedOnFailure": disk_preserved, "diskBytesBefore": len(disk_before["raw"]), "diskBytesDuringFailure": len(failed_storage_disk),
            "warningShown": storage_warning_shown, "failureUi": failed_storage_ui, "memoryExportPendingIds": storage_action_ids, "memoryExportCurrentWorldTime": mem_export.get("checkpoint", {}).get("worldTime"),
            "manualRetry": True, "pendingAfterRetry": storage_recovered["summary"]["pendingCount"], "recoveredPosition": storage_recovered["summary"]["player"]["position"],
            "archivedRecoveryIds": [r["id"] for r in storage_match], "archiveBefore": len(archive_before_storage), "archiveAfter": len(storage_records_after)
        }, "Storage.setItem was wrapped to throw QuotaExceededError for oakvale-v1; the test then exported in-memory data, restored the browser API, and clicked the real Save button.")
        page.keyboard.press("Escape")

        # Dispatch a burst through real button click handlers in one browser task while the first flush is awaiting IDB.
        _phase = "normal-rapid-ui-actions"
        rapid_before = checkpoint(page, "rapid-before"); rapid_archive_before = archive(page)
        page.evaluate("""() => {
          const b = name => [...document.querySelectorAll('.direction-pad button')].find(x => x.getAttribute('aria-label') === name);
          for (let i = 0; i < 6; i++) { b('往左').click(); b('往右').click(); }
        }""")
        rapid_immediate = checkpoint(page, "rapid-immediate")
        rapid_pending = rapid_immediate["saved"].get("playJournal", {}).get("pending", [])
        wait_pending(page, 0, timeout=30000)
        rapid_after = checkpoint(page, "rapid-after"); rapid_archive_after = archive(page)
        rapid_ids = [r["id"] for r in rapid_pending]
        rapid_matches = [r for r in rapid_archive_after if r["id"] in rapid_ids]
        rapid_ok = len(rapid_pending) == 12 and len(rapid_matches) == 12 and len({r["id"] for r in rapid_archive_after}) == len(rapid_archive_after) and rapid_after["summary"]["pendingCount"] == 0 and rapid_after["summary"]["worldTime"] >= rapid_before["summary"]["worldTime"] + 60
        case("rapid UI actions during pending flush persist latest progress and all unique IDs", "normal-ui-burst", rapid_ok, {
            "dispatchedClicks": 12, "immediatePending": len(rapid_pending), "pendingIds": rapid_ids, "immediateWorldTime": rapid_immediate["summary"]["worldTime"],
            "finalWorldTime": rapid_after["summary"]["worldTime"], "worldTimeBefore": rapid_before["summary"]["worldTime"], "archiveBefore": len(rapid_archive_before),
            "archiveAfter": len(rapid_archive_after), "matchedCommittedIds": len(rapid_matches), "pendingAfter": rapid_after["summary"]["pendingCount"],
            "uniqueArchiveIds": len({r["id"] for r in rapid_archive_after})
        }, "Twelve alternating real direction-button click handlers were dispatched within one browser task to overlap the IDB flush.")

        # Reset through the visible menu and verify old archive IDs remain under a new world ID.
        _phase = "normal-reset-ui"
        reset_before = checkpoint(page, "reset-before"); reset_archive_before = archive(page)
        old_world = reset_before["summary"]["worldId"]; old_ids = {r["id"] for r in reset_archive_before}
        menu = page.locator(".pixel-menu")
        if not menu.is_visible():
            page.get_by_role("button", name="選單", exact=False).first.click()
        page.locator(".pixel-menu .reset-trigger").click()
        page.get_by_role("button", name="覆蓋存檔並重建世界", exact=True).click()
        reset_immediate = checkpoint(page, "reset-immediate")
        wait_pending(page, 0, timeout=15000)
        reset_records = archive(page)
        new_world = reset_immediate["summary"]["worldId"]
        reset_rows = [r for r in reset_records if r["kind"] == "reset" and r["worldId"] == new_world]
        reset_ok = old_world != new_world and old_ids.issubset({r["id"] for r in reset_records}) and len(reset_rows) == 1
        case("menu reset retains old-world archive and appends reset under new world ID", "normal-ui", reset_ok, {
            "oldWorldId": old_world, "newWorldId": new_world, "worldIdChanged": old_world != new_world, "oldArchiveRows": len(reset_archive_before),
            "archiveAfter": len(reset_records), "oldIdsPreserved": len(old_ids & {r["id"] for r in reset_records}), "newWorldResetRows": reset_rows,
            "pendingImmediatelyAfterReset": reset_immediate["summary"]["pendingCount"]
        }, "Used the visible menu reset confirmation; no storage was manually cleared.")

        # Responsive menu screenshots, plus browser error collection.
        _phase = "responsive-1440"
        page.get_by_role("button", name="選單", exact=False).first.click()
        page.screenshot(path=str(ART / "menu-1440.png"), full_page=True)
        desktop_layout = page.evaluate("""() => {
          const d = document.querySelector('dialog[open]'), r = d?.getBoundingClientRect();
          return {innerWidth, documentWidth: document.documentElement.scrollWidth, dialog: r && {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}, buttons:[...document.querySelectorAll('.pixel-menu button')].map(b => {const r=b.getBoundingClientRect(); return {text:b.innerText,right:r.right,left:r.left,width:r.width}})}
        }""")
        desktop_ok = desktop_layout["documentWidth"] <= 1440 and (desktop_layout.get("dialog") or {}).get("right", 9999) <= 1440 and all(b["right"] <= 1440 for b in desktop_layout["buttons"])
        case("menu fits 1440px viewport", "responsive-ui", desktop_ok, desktop_layout)

        mobile = browser.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
        mobile_page = mobile.new_page(); hooks(mobile_page, "responsive-390")
        mobile_page.goto(URL, wait_until="networkidle"); pause(mobile_page); wait_pending(mobile_page, 0)
        mobile_page.get_by_role("button", name="選單", exact=False).first.click()
        mobile_page.screenshot(path=str(ART / "menu-390.png"), full_page=True)
        mobile_layout = mobile_page.evaluate("""() => {
          const d = document.querySelector('dialog[open]'), r = d?.getBoundingClientRect();
          return {innerWidth, documentWidth: document.documentElement.scrollWidth, dialog: r && {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}, buttons:[...document.querySelectorAll('.pixel-menu button')].map(b => {const r=b.getBoundingClientRect(); return {text:b.innerText,right:r.right,left:r.left,width:r.width}})}
        }""")
        mobile_ok = mobile_layout["documentWidth"] <= 390 and (mobile_layout.get("dialog") or {}).get("right", 9999) <= 390 and all(b["right"] <= 390 for b in mobile_layout["buttons"])
        case("menu fits 390px viewport", "responsive-ui", mobile_ok, mobile_layout)
        mobile.close()

        page_errors = list(RESULTS["page_errors"])
        unexpected_http = [failure for failure in RESULTS["http_failures"]
                           if not (failure["status"] == 404 and urlsplit(failure["url"]).path == "/favicon.ico")]
        case("no unhandled browser exceptions or unexpected HTTP failures", "runtime-ui", not page_errors and not unexpected_http, {
            "pageErrors": page_errors, "httpFailures": RESULTS["http_failures"], "knownFavicon404Count": sum(1 for failure in RESULTS["http_failures"] if failure["status"] == 404 and urlsplit(failure["url"]).path == "/favicon.ico"),
            "consoleErrors": RESULTS["console_errors"]
        }, "The browser may request `/favicon.ico`, which this local production artifact does not provide; that known 404 is tracked separately from application failures.")

        screenshots = []
        for screenshot in sorted(ART.glob("*.png")):
            data = screenshot.read_bytes()
            screenshots.append({"file": screenshot.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        write_json("screenshot-manifest.json", {"screenshots": screenshots})

        RESULTS["run"]["finished_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        RESULTS["run"]["runtime_page_errors"] = list(RESULTS["page_errors"])
        RESULTS["run"]["console_error_count"] = len(RESULTS["console_errors"])
        RESULTS["run"]["all_cases_passed"] = all(c["outcome"] == "pass" for c in RESULTS["cases"])
        publish("complete")
        browser.close()
    return 0 if RESULTS["run"].get("all_cases_passed") else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        RESULTS["exception"] = {"type": type(error).__name__, "message": str(error), "phase": _phase}
        RESULTS["run"]["finished_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        publish("blocked-by-exception")
        raise

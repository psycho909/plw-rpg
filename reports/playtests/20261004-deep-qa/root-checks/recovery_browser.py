"""Real-browser regression of quota recovery gates on the final pinned build."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

URL = os.environ.get("PLW_QA_URL", "http://127.0.0.1:5192/")
MANIFEST = Path(os.environ.get("PLW_QA_MANIFEST", str(OUT.parent / "baseline/final-manifest.json")))
RESULT = {"status": "running", "url": URL, "startedAt": datetime.now(timezone.utc).isoformat(),
          "method": "Controlled browser storage failures, normal UI handlers and real timers; no game-state injection.",
          "cases": [], "pageErrors": []}


def record_exception(kind, error, trace):
    RESULT.update(status="failed", failure=f"{kind.__name__}: {error}", finishedAt=datetime.now(timezone.utc).isoformat())
    write_recorded(OUT / "recovery-browser.json", json.dumps(RESULT, ensure_ascii=False, indent=2) + "\n", producer="root-recovery-browser")
    sys.__excepthook__(kind, error, trace)


sys.excepthook = record_exception


def record(name, evidence):
    RESULT["cases"].append({"name": name, "at": datetime.now(timezone.utc).isoformat(), **evidence})
    write_recorded(OUT / "recovery-browser.json", json.dumps(RESULT, ensure_ascii=False, indent=2) + "\n", producer="root-recovery-browser")


def raw(page):
    return page.evaluate("localStorage.getItem('oakvale-v1')")


def export(page):
    if page.locator("dialog").count():
        page.keyboard.press("Escape")
    page.locator(".menu-trigger").click()
    with page.expect_download() as download:
        page.locator(".pixel-menu").get_by_role("button", name="匯出遊玩紀錄").click()
    data = json.loads(Path(download.value.path()).read_text())
    page.keyboard.press("Escape")
    return data


def quota(page, enabled):
    if enabled:
        page.evaluate("""() => {
          window.originalQuotaSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function(key, ...args) {
            if (key === 'oakvale-v1') throw new DOMException('controlled persistent quota', 'QuotaExceededError');
            return window.originalQuotaSetItem.call(this, key, ...args);
          };
        }""")
    else:
        page.evaluate("() => { Storage.prototype.setItem = window.originalQuotaSetItem; }")


def journal_failure(page, enabled):
    if enabled:
        page.evaluate("""() => {
          window.originalJournalTransaction = IDBDatabase.prototype.transaction;
          IDBDatabase.prototype.transaction = function(stores, mode, ...args) {
            if (mode === 'readwrite') throw new Error('controlled journal write unavailable');
            return window.originalJournalTransaction.call(this, stores, mode, ...args);
          };
        }""")
    else:
        page.evaluate("() => { IDBDatabase.prototype.transaction = window.originalJournalTransaction; }")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context(accept_downloads=True, viewport={"width": 390, "height": 844})
    page = context.new_page()
    page.on("pageerror", lambda error: RESULT["pageErrors"].append(str(error)))
    page.goto(URL, wait_until="networkidle")
    page.get_by_role("group", name="世界時間速度").get_by_role("button", name="暫停", exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    manifest = json.loads(MANIFEST.read_text())
    actual_hashes = {name: hashlib.sha256(urlopen(URL + name).read()).hexdigest() for name in manifest["buildHashes"]}
    assert actual_hashes == manifest["buildHashes"]
    RESULT.update(sourceCommit=manifest["sourceCommit"], sourceLabel=manifest["sourceLabel"], sourceStatus=manifest["sourceStatus"],
                  sourceHashes=manifest["sourceHashes"], actualBuildHashes=actual_hashes, browser=browser.version)
    baseline = raw(page)
    quota(page, True)
    page.get_by_role("button", name="往右", exact=True).click()
    first = export(page)
    first_time = first["checkpoint"]["worldTime"]
    first_player = next(c for c in first["checkpoint"]["characters"] if c["id"] == first["checkpoint"]["activeCharacterId"])
    assert first_time == json.loads(baseline)["worldTime"] + 5 and raw(page) == baseline
    assert len(first["pending"]) == 1
    record("first failure retains memory and old disk", {"status": "pass", "worldTime": first_time, "pending": 1, "diskUnchanged": True})
    page.get_by_role("button", name="往左", exact=True).click()
    blocked_move = export(page)
    assert blocked_move["checkpoint"]["worldTime"] == first_time
    assert next(c for c in blocked_move["checkpoint"]["characters"] if c["id"] == first_player["id"])["position"] == first_player["position"]
    assert blocked_move["pending"] == first["pending"] and raw(page) == baseline
    record("movement blocked during persistent quota", {"status": "pass", "worldTime": first_time, "samePositionAndPending": True})
    page.get_by_role("button", name="×20", exact=True).click()
    page.wait_for_timeout(700)
    assert page.get_by_role("button", name="暫停", exact=True).get_attribute("aria-pressed") == "true"
    resumed = export(page)
    assert resumed["checkpoint"]["worldTime"] == first_time and resumed["pending"] == first["pending"]
    record("x20 cannot bypass failed checkpoint", {"status": "pass", "worldTime": first_time, "paused": True})
    page.locator(".menu-trigger").click()
    page.get_by_role("button", name="繼續時間", exact=True).click()
    page.wait_for_timeout(700)
    assert page.get_by_role("button", name="繼續時間", exact=True).is_visible()
    modal_resumed = export(page)
    assert modal_resumed["checkpoint"]["worldTime"] == first_time and modal_resumed["pending"] == first["pending"]
    record("modal resume cannot bypass failed checkpoint", {"status": "pass", "worldTime": first_time, "pendingUnchanged": True})
    page.locator(".menu-trigger").click()
    page.locator(".pixel-menu").get_by_role("button", name="旅人筆記", exact=True).click()
    page.get_by_role("button", name="度過一季", exact=True).click()
    assert "時間繼續前進。聚落" not in page.locator("dialog").inner_text()
    waited = export(page)
    assert waited["checkpoint"]["worldTime"] == first_time and waited["pending"] == first["pending"]
    record("season wait blocked without false success", {"status": "pass", "worldTime": first_time, "pendingUnchanged": True})
    quota(page, False)
    page.get_by_role("button", name="往左", exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    recovered = export(page)
    assert recovered["checkpoint"]["worldTime"] == first_time + 5
    assert all(sum(row["id"] == pending["id"] for row in recovered["records"]) == 1 for pending in first["pending"])
    assert not page.locator("[role=alert]").count()
    record("next action recovers before proceeding", {"status": "pass", "worldTime": first_time + 5, "priorPendingCommittedOnce": True, "warningCleared": True})
    journal_failure(page, True)
    page.get_by_role("button", name="往右", exact=True).click()
    page.wait_for_function("document.querySelector('[role=alert]')?.textContent.includes('controlled journal write unavailable')")
    journal_pending = json.loads(raw(page))["playJournal"]["pending"]
    journal_time = json.loads(raw(page))["worldTime"]
    page.get_by_role("button", name="×20", exact=True).click()
    page.wait_for_timeout(700)
    page.get_by_role("button", name="暫停", exact=True).click()
    advanced = json.loads(raw(page))
    assert advanced["worldTime"] > journal_time
    assert all(row in advanced["playJournal"]["pending"] for row in journal_pending)
    record("journal-only failure permits saved progress", {"status": "pass", "before": journal_time, "after": advanced["worldTime"], "durablePendingRetained": True})
    quota(page, True)
    old_raw = raw(page)
    page.get_by_role("button", name="往左", exact=True).click()
    both = export(page)
    warning = page.locator("[role=alert]").inner_text()
    assert "存檔失敗" in warning and "controlled journal write unavailable" in warning and raw(page) == old_raw
    assert page.get_by_role("button", name="暫停", exact=True).get_attribute("aria-pressed") == "true"
    both_ids = [row["id"] for row in both["pending"]]
    quota(page, False)
    journal_failure(page, False)
    page.locator(".save-button").click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    restored = export(page)
    assert all(sum(row["id"] == identifier for row in restored["records"]) == 1 for identifier in both_ids)
    assert restored["checkpoint"]["worldTime"] == both["checkpoint"]["worldTime"]
    assert not page.locator("[role=alert]").count()
    assert not RESULT["pageErrors"]
    record("dual failure export and recovery", {"status": "pass", "pendingIdsCommittedOnce": both_ids, "warningCleared": True, "worldTime": restored["checkpoint"]["worldTime"]})
    RESULT.update(status="pass", finishedAt=datetime.now(timezone.utc).isoformat(), passCount=len(RESULT["cases"]))
    write_recorded(OUT / "recovery-browser.json", json.dumps(RESULT, ensure_ascii=False, indent=2) + "\n", producer="root-recovery-browser")
    context.close()
    browser.close()

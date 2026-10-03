"""Real browser reset keeps both old committed records and unsent outbox entries."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(OUT.parents[2]))
from scripts.recorded_reports import write_recorded

result = {"url": "http://127.0.0.1:5186/", "fixture": "Readwrite transaction throws until restored; reset uses normal UI", "steps": [], "pageErrors": [],
          "harnessCorrection": "Prior probe returned a native function from page.evaluate assignment; Playwright invoked it without its receiver. Restore now uses a block returning undefined."}


def record(step, data):
    result["steps"].append({"step": step, **data})
    write_recorded(OUT / "root-reset-pending.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="root-reset-pending")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context()
    page = context.new_page()
    page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
    page.goto(result["url"], wait_until="networkidle")
    page.get_by_role("button", name="暫停", exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")

    def saved():
        return page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")

    def archive():
        return page.evaluate("""() => new Promise((resolve, reject) => {
          const request = indexedDB.open('oakvale-play-journal', 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result, transaction = db.transaction('records', 'readonly');
            const rows = transaction.objectStore('records').getAll();
            transaction.oncomplete = () => { db.close(); resolve(rows.result); };
            transaction.onabort = () => reject(transaction.error);
          };
        })""")

    initial = saved()
    old_world = initial["playJournal"]["worldId"]
    old_ids = {row["id"] for row in archive()}
    page.evaluate("""() => {
      window.originalTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(stores, mode, ...args) {
        if (mode === 'readwrite') throw new Error('controlled pending reset');
        return window.originalTransaction.call(this, stores, mode, ...args);
      };
    }""")
    page.get_by_role("button", name="往右", exact=True).click()
    page.wait_for_function("document.querySelector('[role=alert]')?.textContent.includes('controlled pending reset')")
    pending_before = saved()["playJournal"]["pending"]
    pending_ids = {row["id"] for row in pending_before}
    assert pending_ids
    record("old world has durable pending", {"worldId": old_world, "pendingIds": list(pending_ids)})
    page.locator(".menu-trigger").click()
    page.locator(".pixel-menu .reset-trigger").click()
    page.get_by_role("button", name="覆蓋存檔並重建世界", exact=True).click()
    page.get_by_role("button", name="暫停", exact=True).click()
    after = saved()
    new_world = after["playJournal"]["worldId"]
    queued = after["playJournal"]["pending"]
    assert new_world != old_world
    assert all(row in queued for row in pending_before)
    reset_ids = {row["id"] for row in queued if row["kind"] == "reset" and row["worldId"] == new_world}
    assert len(reset_ids) == 1
    record("reset preserves old pending", {"newWorldId": new_world, "oldPendingUnchanged": True, "resetIds": list(reset_ids), "queuedIds": [row["id"] for row in queued]})
    page.evaluate("() => { IDBDatabase.prototype.transaction = window.originalTransaction; }")
    page.locator(".save-button").click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    rows = archive()
    assert old_ids.issubset({row["id"] for row in rows})
    assert all(sum(row["id"] == identifier for row in rows) == 1 for identifier in pending_ids | reset_ids)
    assert saved()["playJournal"]["worldId"] == new_world
    assert not result["pageErrors"]
    result["status"] = "pass"
    record("restored journal drains both worlds once", {"pending": 0, "oldArchiveIdsRetained": True, "oldPendingAndResetIdsCommittedOnce": True, "worldId": new_world})
    context.close()
    browser.close()

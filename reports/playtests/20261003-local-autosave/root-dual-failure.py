"""Real Chromium: two injected storage failures, visible at 390px, then recovery."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

result = {"url": "http://127.0.0.1:5186/", "runner": "root", "fixture": "Browser API write failures; no game-state edits", "steps": [], "pageErrors": []}


def record(step, evidence):
    result["steps"].append({"step": step, **evidence})
    write_recorded(OUT / "root-dual-failure.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="root-dual-failure")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    page = context.new_page()
    page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
    page.goto(result["url"], wait_until="networkidle")
    page.get_by_role("group", name="世界時間速度").get_by_role("button", name="暫停", exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    page.evaluate("""() => {
      window.originalJournalTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(stores, mode, ...args) {
        if (mode === 'readwrite') throw new Error('測試紀錄庫寫入失敗');
        return window.originalJournalTransaction.call(this, stores, mode, ...args);
      };
    }""")
    page.get_by_role("button", name="往右", exact=True).click()
    page.wait_for_function("document.querySelector('[role=alert]')?.textContent.includes('測試紀錄庫寫入失敗')")
    persisted = page.evaluate("localStorage.getItem('oakvale-v1')")
    record("journal failure", {"pending": len(json.loads(persisted)["playJournal"]["pending"]), "warning": page.locator("[role=alert]").inner_text()})
    page.evaluate("""() => {
      window.originalProgressSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, ...args) {
        if (key === 'oakvale-v1') throw new DOMException('test quota', 'QuotaExceededError');
        return window.originalProgressSetItem.call(this, key, ...args);
      };
    }""")
    page.get_by_role("button", name="往左", exact=True).click()
    warning = page.locator("[role=alert]").inner_text()
    assert "存檔失敗" in warning and "測試紀錄庫寫入失敗" in warning
    assert page.evaluate("localStorage.getItem('oakvale-v1')") == persisted
    assert page.get_by_role("button", name="暫停", exact=True).get_attribute("aria-pressed") == "true"
    layout = page.evaluate("""() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      warningRight: document.querySelector('[role=alert]').getBoundingClientRect().right})""")
    assert layout["scrollWidth"] <= 390 and layout["warningRight"] <= 390
    page.screenshot(path=str(OUT / "root-dual-failure.png"), full_page=True)
    record("both failures visible and paused", {"warning": warning, "diskUnchanged": True, "layout": layout})
    page.keyboard.press("Escape")
    with page.expect_download() as download:
        page.locator(".pixel-menu").get_by_role("button", name="匯出遊玩紀錄").click()
    exported = json.loads(Path(download.value.path()).read_text())
    pending_ids = [entry["id"] for entry in exported["pending"]]
    assert exported["archiveAvailable"] and len(pending_ids) == 2
    record("memory export", {"pendingIds": pending_ids, "worldTime": exported["checkpoint"]["worldTime"], "archiveAvailable": exported["archiveAvailable"]})
    page.evaluate("""() => {
      IDBDatabase.prototype.transaction = window.originalJournalTransaction;
      Storage.prototype.setItem = window.originalProgressSetItem;
    }""")
    page.locator(".pixel-menu").get_by_role("button", name="儲存世界").click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    with page.expect_download() as download:
        page.locator(".pixel-menu").get_by_role("button", name="匯出遊玩紀錄").click()
    recovered = json.loads(Path(download.value.path()).read_text())
    saved = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
    assert saved["worldTime"] == exported["checkpoint"]["worldTime"]
    assert all(sum(row["id"] == identifier for row in recovered["records"]) == 1 for identifier in pending_ids)
    assert not page.locator("[role=alert]").count()
    assert not result["pageErrors"]
    record("recovery", {"worldTime": saved["worldTime"], "pending": 0, "idsCommittedOnce": pending_ids, "errorsCleared": True})
    result["status"] = "pass"
    write_recorded(OUT / "root-dual-failure.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="root-dual-failure")
    context.close()
    browser.close()
